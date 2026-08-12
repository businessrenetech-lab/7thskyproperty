import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Plus, FileSignature, Search, ChevronRight, RefreshCw, Send, Save, Eye,
  ArrowLeft, ArrowRight, Copy, Bell, Ban, Check, ShieldCheck, CalendarClock,
} from 'lucide-react';
import api from '../services/api';
import { WtHead, Loading, EmptyState, Pill, DatePicker, bdt, dateFmt, toast, errText } from './watertank/common';

const STEPS = ['Provider', 'Commercial terms', 'Agreed rates', 'Legal inputs', 'Review & send'];
const blank = {
  provider_id: '', effective_date: new Date().toISOString().slice(0, 10), term_months: 12,
  notice_days: 30, commission_pct: 10, payment_model: 'Project Based',
  payout_trigger: 'Completion Verified', payment_due_days: 7, payment_terms: '', fee_notes: '',
  services: [], checklist: [], pricing_input: { selected: [] }, template_values: {},
  witnesses: [{ name: '', nid: '', email: '' }, { name: '', nid: '', email: '' }],
  org: { name: 'Seventh Sky Property Care', represented_by: '', position: '', phone: '', email: '' },
};
const parseObject = (value, fallback = {}) => { if (!value) return fallback; if (typeof value === 'object') return value; try { return JSON.parse(value); } catch { return fallback; } };
const parseArray = (value) => { if (Array.isArray(value)) return value; if (!value) return []; try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; } };

export default function WtProviderAgreements() {
  const { id } = useParams();
  const location = useLocation();
  const building = location.pathname.endsWith('/new') || location.pathname.endsWith('/edit');
  if (building) return <AgreementBuilder id={id} />;
  if (id) return <AgreementDetail id={id} />;
  return <AgreementRegister />;
}

function AgreementRegister() {
  const nav = useNavigate(); const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [q, setQ] = useState('');
  const load = () => { setLoading(true); api.get('/wt-agreements/provider/agreements').then((r) => setRows(Array.isArray(r.data) ? r.data : [])).catch((e) => toast.err(errText(e))).finally(() => setLoading(false)); };
  useEffect(load, []);
  const shown = rows.filter((row) => !q || [row.code, row.provider?.business_name, row.status].some((value) => String(value || '').toLowerCase().includes(q.toLowerCase())));
  const completed = rows.filter((row) => row.status === 'Completed'); const sent = rows.filter((row) => row.status === 'Sent');
  const expiring = completed.filter((row) => row.expiry_date && (new Date(row.expiry_date) - Date.now()) / 864e5 <= 60 && new Date(row.expiry_date) >= new Date());
  return <>
    <WtHead title="Provider Master Agreements" subtitle="Canonical 63-clause agreement · approved rates · ordered two-party e-signature" search={q} onSearch={setQ}>
      <button className="wt-btn" onClick={load}><RefreshCw size={14} /> Refresh</button>
      <button className="wt-btn primary" onClick={() => nav('/agreements/water-tank-provider/new')}><Plus size={14} /> New agreement</button>
    </WtHead>
    <div className="wt-kpis">
      <Metric icon={FileSignature} label="All agreements" value={rows.length} sub={`${rows.filter((r) => r.status === 'Draft').length} drafts`} />
      <Metric icon={ShieldCheck} label="Completed & active" value={completed.length} sub="Both parties signed" tone="var(--wt-green)" />
      <Metric icon={Send} label="Awaiting signatures" value={sent.length} sub={`${sent.reduce((sum, row) => sum + (row.signers || []).filter((s) => s.status !== 'signed').length, 0)} signatures outstanding`} tone="var(--wt-amber)" />
      <Metric icon={CalendarClock} label="Expiring in 60 days" value={expiring.length} sub="Renew before assignment blocks" tone={expiring.length ? 'var(--wt-red)' : undefined} />
    </div>
    <div className="wt-card wt-tblcard">{loading ? <Loading /> : shown.length ? <table className="wt-tbl"><thead><tr><th>Agreement</th><th>Provider</th><th>Version</th><th>Effective term</th><th>Rates</th><th>Signatures</th><th>Status</th><th /></tr></thead><tbody>{shown.map((row) => <tr className="click" key={row.id} onClick={() => nav(`/agreements/water-tank-provider/${row.code}`)}><td className="id">{row.code}</td><td><strong>{row.provider?.business_name || 'Provider unavailable'}</strong><div className="cell-sub">{row.provider?.code}</div></td><td>v{row.version_no}</td><td>{dateFmt(row.effective_date)}<div className="cell-sub">to {dateFmt(row.expiry_date)}</div></td><td>{Array.isArray(row.authorised_services) ? row.authorised_services.length : '—'} services</td><td>{(row.signers || []).filter((s) => s.status === 'signed').length}/{(row.signers || []).length || 2}</td><td><Pill value={row.status} sm /></td><td><ChevronRight size={15} /></td></tr>)}</tbody></table> : <EmptyState eyebrow="Provider agreements" title="No agreements found" hint="Start from a provider file or create a provider-prefilled agreement here." action={<button className="wt-btn primary" onClick={() => nav('/agreements/water-tank-provider/new')}><Plus size={14} /> New agreement</button>} />}</div>
  </>;
}

function AgreementBuilder({ id }) {
  const nav = useNavigate(); const query = new URLSearchParams(useLocation().search); const providerCode = query.get('provider'); const supersedesId = query.get('supersedes');
  const [step, setStep] = useState(0); const [form, setForm] = useState(blank); const [providers, setProviders] = useState([]);
  const [provider, setProvider] = useState(null); const [meta, setMeta] = useState({ template_fields: [], payment_models: [], payout_triggers: [] });
  const [catalog, setCatalog] = useState([]); const [preview, setPreview] = useState(''); const [agreement, setAgreement] = useState(null);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([api.get('/wt-providers/directory'), api.get('/wt-agreements/provider/meta'), api.get('/wt-agreements/provider/catalog'), ...(id ? [api.get(`/wt-agreements/provider/agreements/${id}`)] : [])])
      .then(([directory, metadata, cat, detail]) => {
        const list = directory.data?.providers || []; setProviders(list); setMeta(metadata.data || {}); setCatalog(Array.isArray(cat.data) ? cat.data : []);
        if (detail?.data) {
          const snapshot = parseObject(detail.data.agreement?.terms_snapshot, {}); setAgreement(detail.data.agreement); setProvider(detail.data.provider); setForm({ ...blank, ...snapshot, provider_id: detail.data.provider?.id || snapshot.provider_id, bank_details: snapshot.bank_details || detail.data.provider?.bank_details || {}, pricing_input: snapshot.pricing_input || { selected: [] }, template_values: snapshot.template_values || {} }); setPreview(detail.data.html || '');
        } else if (providerCode) {
          const selected = list.find((item) => item.code === providerCode || String(item.id) === providerCode); if (selected) selectProvider(selected, cat.data);
        }
      }).catch((e) => setError(errText(e, 'Could not load agreement builder'))).finally(() => setLoading(false));
  }, [id, providerCode]);

  const selectProvider = (row, catalogOverride = catalog) => {
    const proposed = parseArray(row.proposed_rates);
    const selected = proposed.map((rate) => ({ code: rate.code, agreed_price: rate.proposed_rate ?? rate.standard_price })).filter((rate) => (catalogOverride || []).some((item) => item.code === rate.code));
    setProvider(row); setForm((current) => ({ ...current, provider_id: row.id, services: parseArray(row.service_categories), bank_details: parseObject(row.bank_details, {}), cumilla_exclusive: !!row.cumilla_exclusive, pricing_input: { selected } }));
  };
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const setNested = (parent, key, value) => setForm((current) => ({ ...current, [parent]: { ...(current[parent] || {}), [key]: value } }));
  /* Witnesses are a fixed pair of slots, so edit them positionally. */
  const setWitness = (i, key, value) => setForm((current) => {
    const list = [0, 1].map((n) => ({ ...(current.witnesses?.[n] || {}) }));
    list[i][key] = value;
    return { ...current, witnesses: list };
  });
  const rateMap = useMemo(() => new Map((form.pricing_input?.selected || []).map((rate) => [rate.code, rate])), [form.pricing_input]);
  const toggleRate = (item) => setForm((current) => { const rows = [...(current.pricing_input?.selected || [])]; const index = rows.findIndex((rate) => rate.code === item.code); if (index >= 0) rows.splice(index, 1); else rows.push({ code: item.code, agreed_price: item.standard_price }); return { ...current, pricing_input: { selected: rows } }; });
  const setRate = (code, value) => setForm((current) => ({ ...current, pricing_input: { selected: current.pricing_input.selected.map((rate) => rate.code === code ? { ...rate, agreed_price: value } : rate) } }));

  // A renewal must name the agreement it replaces, otherwise the old one is never superseded on completion.
  const payload = () => ({ ...form, provider_id: provider?.id || form.provider_id, agreement_id: agreement?.id, supersedes_id: form.supersedes_id || (supersedesId ? Number(supersedesId) : null) });
  const refreshPreview = async () => { if (!provider) return; setBusy(true); setError(''); try { const { data } = await api.post('/wt-agreements/provider/preview', payload()); setPreview(data.html || ''); } catch (e) { setError(errText(e, 'Could not build the agreement preview')); } finally { setBusy(false); } };
  useEffect(() => { if (step === 4 && provider) refreshPreview(); }, [step]);
  const save = async () => {
    if (!provider) { setError('Select a Water Tank provider first.'); return null; }
    setBusy(true); setError('');
    try { const { data } = agreement ? await api.patch(`/wt-agreements/provider/agreements/${agreement.code}`, payload()) : await api.post('/wt-agreements/provider/agreements', payload()); const row = data.agreement; setAgreement(row); toast.ok(`Draft ${row.code} saved`); if (!agreement) nav(`/agreements/water-tank-provider/${row.code}/edit`, { replace: true }); return row; }
    catch (e) { setError(errText(e, 'Could not save the agreement draft')); return null; } finally { setBusy(false); }
  };
  const send = async () => { const row = agreement || await save(); if (!row) return; setBusy(true); try { await api.post(`/wt-agreements/provider/agreements/${row.code}/send`); toast.ok('Agreement sent to the provider for the first signature'); nav(`/agreements/water-tank-provider/${row.code}`); } catch (e) { setError(errText(e, 'Could not send the agreement')); setBusy(false); } };

  if (loading) return <Loading />;
  const filteredProviders = providers.filter((item) => !search || [item.code, item.business_name, item.contact_email].some((value) => String(value || '').toLowerCase().includes(search.toLowerCase())));
  return <>
    <WtHead crumb={<div className="wt-crumb"><span className="lnk" onClick={() => nav('/agreements/water-tank-provider')}>Provider Agreements</span> › <span>{agreement?.code || 'New draft'}</span></div>} title={agreement ? `Edit ${agreement.code}` : 'Draft Provider Master Agreement'} subtitle={`Canonical 63 clauses · Step ${step + 1} of ${STEPS.length} · ${STEPS[step]}`}>
      <button className="wt-btn" onClick={() => nav('/agreements/water-tank-provider')}>Cancel</button><button className="wt-btn" disabled={busy || !provider} onClick={save}><Save size={14} /> Save draft</button>
    </WtHead>
    <div className="wt-stepper">{STEPS.map((label, index) => <React.Fragment key={label}><button className={`wt-step${index < step ? ' done' : index === step ? ' current' : ''}`} onClick={() => setStep(index)}><span className="dot">{index < step ? <Check size={11} /> : index + 1}</span><span className="lbl">{label}</span></button>{index < STEPS.length - 1 && <span className="wt-step-sep" />}</React.Fragment>)}</div>
    {error && <div className="wt-formerr">{error}</div>}
    {(form.supersedes_id || supersedesId) && !agreement && <div className="wt-note">This draft renews an existing agreement. The one it replaces is marked <strong>Superseded</strong> automatically when both parties have signed — rates switch over at the same moment.</div>}
    <div className="wt-card" style={{ padding: 24 }}>
      {step === 0 && <><Heading title="Select the Water Tank provider" text="The agreement must remain linked to one branch-scoped provider record." /><label className="wt-search" style={{ maxWidth: 460 }}><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Provider name, code or email…" /></label><div className="wt-lookup" style={{ marginTop: 12 }}>{filteredProviders.map((row) => <button key={row.id} className={`wt-lookup-item${provider?.id === row.id ? ' on' : ''}`} onClick={() => selectProvider(row)}><span className="av">{row.business_name.slice(0, 2).toUpperCase()}</span><span style={{ flex: 1 }}><span className="nm">{row.business_name}</span><span className="mt">{[row.code, row.contact_person, row.contact_email].filter(Boolean).join(' · ')}</span></span><Pill value={row.onboarding_submission_status || row.status} sm />{provider?.id === row.id && <Check size={15} />}</button>)}</div></>}
      {step === 1 && <><Heading title="Commercial and execution terms" text="These structured values drive agreement expiry, fee calculation and payout eligibility." /><div className="wt-grid3"><div className="wt-field"><label>Effective date</label><DatePicker value={form.effective_date} onChange={(value) => set('effective_date', value)} /></div><Input label="Term (months)" type="number" value={form.term_months} onChange={(v) => set('term_months', v)} /><Input label="Notice period (days)" type="number" value={form.notice_days} onChange={(v) => set('notice_days', v)} /><Input label="Commission on provider gross (%)" type="number" value={form.commission_pct} onChange={(v) => set('commission_pct', v)} /><Select label="Payment model" value={form.payment_model} options={meta.payment_models || []} onChange={(v) => set('payment_model', v)} /><Select label="Payout trigger" value={form.payout_trigger} options={meta.payout_triggers || []} onChange={(v) => set('payout_trigger', v)} /><Input label="Due after trigger (days)" type="number" value={form.payment_due_days} onChange={(v) => set('payment_due_days', v)} /><Input label="Seventh Sky representative" value={form.org?.represented_by} onChange={(v) => setNested('org', 'represented_by', v)} /><Input label="Countersigner email" type="email" value={form.org?.email} onChange={(v) => setNested('org', 'email', v)} /></div><Text label="Payment terms" value={form.payment_terms} onChange={(v) => set('payment_terms', v)} /><Text label="Fee notes and special commercial conditions" value={form.fee_notes} onChange={(v) => set('fee_notes', v)} /><div className="wt-note"><strong>Calculation:</strong> matched agreed rates × quantity = provider gross; commission is deducted; the remainder becomes the provider net payout.</div>

{/* Clause 22 fills from a legal-template field. It lived only in step 4, so it
    was easy to miss and the clause printed "__________ Business Days". */}
<div className="wt-grid3" style={{ marginTop: 4 }}>
  <Input label="Defect rectification response (Business Days) — Clause 22" type="number"
    value={form.template_values?.defect_rectification_days ?? ''}
    onChange={(v) => setNested('template_values', 'defect_rectification_days', v)} />
</div>

{/* Witnesses. Each one with an email gets their own signature and date block on
    the document plus their own signing link; without an email they would get a
    block nobody can reach, so they are skipped. */}
<div style={{ marginTop: 8 }}>
  <div className="wt-sec-title" style={{ marginBottom: 8 }}>Witnesses (optional)</div>
  {[0, 1].map((i) => (
    <div className="wt-grid3" key={i} style={{ marginBottom: 8 }}>
      <Input label={`Witness ${i + 1} — name`} value={form.witnesses?.[i]?.name || ''}
        onChange={(v) => setWitness(i, 'name', v)} />
      <Input label={`Witness ${i + 1} — NID / Passport`} value={form.witnesses?.[i]?.nid || ''}
        onChange={(v) => setWitness(i, 'nid', v)} />
      <Input label={`Witness ${i + 1} — email (to send for signature)`} type="email"
        value={form.witnesses?.[i]?.email || ''} onChange={(v) => setWitness(i, 'email', v)} />
    </div>
  ))}
  <div className="wt-note">
    Signing order: the Service Provider signs, Seventh Sky countersigns, then the witnesses attest.
  </div>
</div></>}
      {step === 2 && <><Heading title="Agreed provider rate schedule" text="Only selected lines appear in Schedule F and can automatically price a work order." /><div className="wt-rate-list">{catalog.map((item) => { const rate = rateMap.get(item.code); return <div className={`wt-rate-row${rate ? ' on' : ''}`} key={item.code}><input type="checkbox" checked={!!rate} onChange={() => toggleRate(item)} /><span className="code">{item.code}</span><span className="name">{item.name}<small>{item.unit}</small></span><span className="standard">Std {bdt(item.standard_price)}</span>{rate ? <input className="wt-input" type="number" value={rate.agreed_price} onChange={(e) => setRate(item.code, e.target.value)} /> : <span />}</div>; })}</div></>}
      {step === 3 && <><Heading title="All legal template inputs" text="The fields below come directly from the seeded 63-clause Provider Master Agreement." /><div className="wt-legal-groups">{Object.entries((meta.template_fields || []).reduce((groups, field) => { (groups[field.group || 'General'] ||= []).push(field); return groups; }, {})).map(([group, fields]) => <div className="wt-legal-group" key={group}><h3>{group}</h3><div className="wt-grid2">{fields.map((field) => <TemplateField key={field.key} field={field} value={form.template_values?.[field.key]} onChange={(value) => setNested('template_values', field.key, value)} />)}</div></div>)}</div></>}
      {step === 4 && <><Heading title="Review the complete agreement" text="The provider sees this exact document. Sending locks the draft and starts ordered signing." />{busy && !preview ? <Loading /> : preview ? <div className="wt-agreement-preview" dangerouslySetInnerHTML={{ __html: preview }} /> : <EmptyState eyebrow="Preview" title="Select a provider and refresh the preview" action={<button className="wt-btn" onClick={refreshPreview}><Eye size={14} /> Build preview</button>} />}<div className="wt-note" style={{ marginTop: 14 }}>Provider signs first. The selected Seventh Sky representative countersigns second. Rates activate only when both signatures are complete.</div><button className="wt-btn primary" disabled={busy || !agreement} onClick={send}><Send size={14} /> Send for two-party signature</button>{!agreement && <span className="cell-sub" style={{ marginLeft: 8 }}>Save the draft before sending.</span>}</>}
    </div>
    <div className="wt-wizfoot"><button className="wt-btn" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft size={14} /> Back</button><button className="wt-btn primary" disabled={step === STEPS.length - 1 || (step === 0 && !provider)} onClick={() => setStep(step + 1)}>Continue <ArrowRight size={14} /></button></div>
  </>;
}

function AgreementDetail({ id }) {
  const nav = useNavigate(); const [data, setData] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = () => { setLoading(true); api.get(`/wt-agreements/provider/agreements/${id}`).then((r) => setData(r.data)).catch((e) => setError(errText(e))).finally(() => setLoading(false)); };
  useEffect(load, [id]);
  const remind = async () => { try { await api.post(`/signing/envelopes/${data.agreement.envelope_id}/remind`); toast.ok('Outstanding signer reminded'); load(); } catch (e) { toast.err(errText(e)); } };
  const voidAgreement = async () => { const reason = window.prompt('Reason for voiding this agreement:'); if (!reason) return; try { await api.post(`/signing/envelopes/${data.agreement.envelope_id}/void`, { reason }); toast.ok('Agreement voided'); load(); } catch (e) { toast.err(errText(e)); } };
  if (loading) return <Loading />; if (error || !data) return <EmptyState eyebrow="Agreement" title="Could not load agreement" hint={error} />;
  const { agreement, provider, rates, envelope } = data;
  return <><WtHead crumb={<div className="wt-crumb"><span className="lnk" onClick={() => nav('/agreements/water-tank-provider')}>Provider Agreements</span> › <span>{agreement.code}</span></div>} title={agreement.code} subtitle={`${provider?.business_name || ''} · version ${agreement.version_no}`}>
    {agreement.status === 'Draft' && <button className="wt-btn primary" onClick={() => nav(`/agreements/water-tank-provider/${agreement.code}/edit`)}><FileSignature size={14} /> Edit draft</button>}
    {['sent', 'viewed', 'partially_signed'].includes(String(envelope?.status || '').toLowerCase()) && <><button className="wt-btn" onClick={remind}><Bell size={14} /> Remind</button><button className="wt-btn danger-ghost" onClick={voidAgreement}><Ban size={14} /> Void & reissue</button></>}
    {agreement.status === 'Completed' && <button className="wt-btn primary" onClick={() => nav(`/agreements/water-tank-provider/new?provider=${provider.code}&supersedes=${agreement.id}`)}><RefreshCw size={14} /> Amend or renew</button>}
  </WtHead>
  <div className="wt-statusstrip"><Pill value={agreement.status} /><span className="wt-pill slate">v{agreement.version_no}</span><span>{dateFmt(agreement.effective_date)} → {dateFmt(agreement.expiry_date)}</span><span>{Number(agreement.commission_pct || 0)}% commission</span><span>{rates.length} agreed rates</span></div>
  <div className="wt-detail-grid"><aside><div className="wt-card" style={{ padding: 18 }}><h3 className="wt-section-title">Commercial terms</h3><Profile rows={[["Provider", provider?.business_name], ["Term", `${agreement.term_months} months`], ["Notice", `${agreement.notice_days} days`], ["Payment model", agreement.payment_model], ["Payout trigger", agreement.payout_trigger], ["Payment due", `${agreement.payment_due_days} days`]]} /></div><div className="wt-card" style={{ padding: 18, marginTop: 12 }}><h3 className="wt-section-title">Signature progress</h3>{(envelope?.signers || []).sort((a, b) => a.signer_order - b.signer_order).map((signer) => <div className="wt-signer" key={signer.id}><span className={signer.status === 'signed' ? 'ok' : ''}>{signer.status === 'signed' ? <Check size={12} /> : signer.signer_order}</span><div><strong>{signer.name}</strong><small>{signer.role.replace(/_/g, ' ')} · {signer.status}</small></div>{signer.access_token && signer.status !== 'signed' && <button className="wt-btn sm" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/admin/sign/${signer.access_token}`).then(() => toast.ok('Signing link copied'))}><Copy size={12} /></button>}</div>)}</div></aside><main><div className="wt-card" style={{ padding: 18 }}><h3 className="wt-section-title">Executed document</h3><div className="wt-agreement-preview" dangerouslySetInnerHTML={{ __html: data.html }} /></div></main></div>
  </>;
}

function Metric({ icon: Icon, label, value, sub, tone }) { return <div className="wt-card wt-kpi"><span className="wt-kpi-ic"><Icon /></span><div><div className="wt-kpi-label">{label}</div><div className="wt-kpi-value" style={{ color: tone }}>{value}</div><div className="wt-kpi-sub">{sub}</div></div></div>; }
function Heading({ title, text }) { return <div className="wt-wizpane-h" style={{ marginBottom: 18 }}><h2>{title}</h2><p>{text}</p></div>; }
function Input({ label, value, onChange, type = 'text' }) { return <div className="wt-field"><label>{label}</label><input className="wt-input" type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} /></div>; }
function Text({ label, value, onChange }) { return <div className="wt-field"><label>{label}</label><textarea className="wt-input" rows={3} value={value || ''} onChange={(e) => onChange(e.target.value)} /></div>; }
function Select({ label, value, onChange, options }) { return <div className="wt-field"><label>{label}</label><select className="wt-select" value={value || ''} onChange={(e) => onChange(e.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></div>; }
function TemplateField({ field, value, onChange }) { if (field.type === 'checkbox_group') { const selected = Array.isArray(value) ? value : []; return <div className="wt-field" style={{ gridColumn: '1 / -1' }}><label>{field.label}</label><div className="wt-checkgrid">{(field.options || []).map((option) => <button type="button" key={option} className={`wt-checkitem${selected.includes(option) ? ' on' : ''}`} onClick={() => onChange(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option])}><span className="box">{selected.includes(option) && <Check size={12} />}</span>{option}</button>)}</div></div>; } if (field.type === 'textarea') return <Text label={field.label} value={value ?? field.default ?? ''} onChange={onChange} />; if (field.type === 'select') return <Select label={field.label} value={value ?? field.default ?? ''} options={field.options || []} onChange={onChange} />; return <Input label={field.label} type={['date', 'number', 'email'].includes(field.type) ? field.type : 'text'} value={value ?? field.default ?? ''} onChange={onChange} />; }
function Profile({ rows }) { return <div className="wt-profile">{rows.map(([key, value]) => <div className="f" key={key}><div className="k">{key}</div><div className="v">{value || '—'}</div></div>)}</div>; }
