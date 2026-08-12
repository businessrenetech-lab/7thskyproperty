import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Building2, Wrench, MapPin, ShieldCheck, Landmark, BadgeDollarSign,
  Check, ChevronLeft, ChevronRight, Upload, Trash2, AlertTriangle, Loader2,
} from 'lucide-react';
import api from '../services/api';
import '../styles/wt-scope.css';

const STEPS = [
  ['Business', Building2], ['Capability', Wrench], ['Coverage', MapPin],
  ['Documents', ShieldCheck], ['Payment & rates', Landmark], ['Review', BadgeDollarSign],
];

export default function WaterTankProviderOnboard() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true });
  const [form, setForm] = useState({ bank_details: {}, service_categories: [], coverage_areas: [], proposed_rates: [] });
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const load = async () => {
    const { data } = await api.get(`/public/water-tank-provider/${token}`);
    setState({ loading: false, ...data });
    setForm((current) => ({
      ...current, ...data.provider,
      service_categories: Array.isArray(data.provider.service_categories) ? data.provider.service_categories : [],
      coverage_areas: Array.isArray(data.provider.coverage_areas) ? data.provider.coverage_areas : [],
      bank_details: data.provider.bank_details && typeof data.provider.bank_details === 'object' ? data.provider.bank_details : {},
      proposed_rates: Array.isArray(data.provider.proposed_rates) ? data.provider.proposed_rates : [],
    }));
    setStep(Math.min(Number(data.provider.onboarding_last_step || 0), STEPS.length - 1));
  };
  useEffect(() => { load().catch((e) => setState({ loading: false, error: e.response?.data?.error || 'This onboarding link is unavailable.' })); }, [token]);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const setBank = (key, value) => setForm((current) => ({ ...current, bank_details: { ...current.bank_details, [key]: value } }));
  const toggle = (key, item) => setForm((current) => ({ ...current, [key]: current[key].includes(item) ? current[key].filter((value) => value !== item) : [...current[key], item] }));
  const rates = useMemo(() => new Map(form.proposed_rates.map((rate) => [rate.code, rate])), [form.proposed_rates]);
  const toggleRate = (item) => setForm((current) => {
    const rows = [...current.proposed_rates]; const index = rows.findIndex((rate) => rate.code === item.code);
    if (index >= 0) rows.splice(index, 1); else rows.push({ code: item.code, name: item.name, unit: item.unit, standard_price: item.standard_price, proposed_rate: item.standard_price });
    return { ...current, proposed_rates: rows };
  });
  const setRate = (code, value) => setForm((current) => ({ ...current, proposed_rates: current.proposed_rates.map((rate) => rate.code === code ? { ...rate, proposed_rate: value } : rate) }));

  const save = async (nextStep = true) => {
    setBusy(true); setError('');
    try {
      const target = nextStep ? Math.min(STEPS.length - 1, step + 1) : step;
      await api.patch(`/public/water-tank-provider/${token}`, { ...form, onboarding_last_step: target });
      if (nextStep) setStep(target);
    } catch (e) { setError(e.response?.data?.error || 'Could not save your progress.'); }
    finally { setBusy(false); }
  };
  const submit = async () => {
    setBusy(true); setError('');
    try { await save(false); await api.post(`/public/water-tank-provider/${token}/submit`); setDone(true); }
    catch (e) { setError(e.response?.data?.error || 'Could not submit your onboarding details.'); setBusy(false); }
  };

  if (state.loading) return <PublicShell><div className="wt-public-card center"><Loader2 className="spin" /></div></PublicShell>;
  if (state.error) return <PublicShell><div className="wt-public-card center"><AlertTriangle size={38} color="#be123c" /><h2>Link unavailable</h2><p>{state.error}</p></div></PublicShell>;
  if (done || form.onboarding_submission_status === 'Submitted') return <PublicShell><div className="wt-public-card center"><span className="wt-public-success"><Check /></span><h2>Onboarding submitted</h2><p>Seventh Sky will verify your documents and proposed rates, then send the master agreement for your signature.</p></div></PublicShell>;

  const ref = state.reference || {};
  return <PublicShell>
    <div className="wt-public-title"><div><span>Water Tank Service Provider</span><h1>{form.business_name}</h1><p>Complete and submit your secure Seventh Sky onboarding profile.</p></div><strong>{form.code}</strong></div>
    <div className="wt-public-layout">
      <aside className="wt-public-rail">{STEPS.map(([label, Icon], index) => <button key={label} className={step === index ? 'on' : index < step ? 'done' : ''} onClick={() => index <= step && setStep(index)}><span>{index < step ? <Check size={13} /> : <Icon size={14} />}</span><div><strong>{label}</strong><small>Step {index + 1}</small></div></button>)}</aside>
      <main className="wt-public-card">
        {error && <div className="wt-public-error">{error}</div>}
        {step === 0 && <Section title="Confirm your business details" text="Check that the legal identity and authorised representative are accurate."><Grid><Input label="Trading name" value={form.business_name} disabled /><Input label="Registered legal name" value={form.legal_name} onChange={(v) => set('legal_name', v)} /><Input label="Registration number" value={form.registration_no} onChange={(v) => set('registration_no', v)} /><Input label="Representative" value={form.contact_person} onChange={(v) => set('contact_person', v)} /><Input label="Email" type="email" value={form.contact_email} onChange={(v) => set('contact_email', v)} /><Input label="Mobile" value={form.contact_phone} onChange={(v) => set('contact_phone', v)} /></Grid><Input label="Business address" value={form.address} onChange={(v) => set('address', v)} /></Section>}
        {step === 1 && <Section title="Capabilities and resources" text="Select every service category you are qualified and equipped to deliver."><Choices values={ref.service_categories || []} selected={form.service_categories} toggle={(item) => toggle('service_categories', item)} /><Grid><Input label="Years of experience" type="number" value={form.years_experience} onChange={(v) => set('years_experience', v)} /><Input label="Team size" type="number" value={form.team_size} onChange={(v) => set('team_size', v)} /><Input label="Jobs per week" type="number" value={form.capacity_per_week} onChange={(v) => set('capacity_per_week', v)} /></Grid><Text label="Equipment and specialist resources" value={form.equipment_summary} onChange={(v) => set('equipment_summary', v)} /></Section>}
        {step === 2 && <Section title="Coverage and availability" text="Select your operating areas. Cumilla opportunities must be handled through Seventh Sky."><Choices values={ref.districts || []} selected={form.coverage_areas} toggle={(item) => toggle('coverage_areas', item)} protectedValue="Cumilla" /><label className="wt-public-toggle"><input type="checkbox" checked={!!form.cumilla_exclusive} onChange={(e) => set('cumilla_exclusive', e.target.checked)} /> I acknowledge the Cumilla exclusive-territory requirements</label><Text label="Availability or operating constraints" value={form.availability_notes} onChange={(v) => set('availability_notes', v)} /></Section>}
        {step === 3 && <Section title="Compliance and insurance" text="Upload current evidence. Replacing a document reopens it for Seventh Sky verification."><DocumentList token={token} documents={state.documents || []} reference={ref} onChange={load} /></Section>}
        {step === 4 && <Section title="Settlement details and proposed rates" text="Settlement details are private. Proposed rates are reviewed before they enter the agreement."><Grid><Input label="Account holder" value={form.bank_details.account_name} onChange={(v) => setBank('account_name', v)} /><Input label="Bank name" value={form.bank_details.bank_name} onChange={(v) => setBank('bank_name', v)} /><Input label="Branch" value={form.bank_details.branch} onChange={(v) => setBank('branch', v)} /><Input label="Account number" value={form.bank_details.account_number} onChange={(v) => setBank('account_number', v)} /><Input label="Routing number" value={form.bank_details.routing_number} onChange={(v) => setBank('routing_number', v)} /><Input label="bKash / Nagad" value={form.bank_details.mobile_banking} onChange={(v) => setBank('mobile_banking', v)} /></Grid><div className="wt-public-rates">{(state.catalog || []).map((item) => { const rate = rates.get(item.code); return <div key={item.code} className={rate ? 'on' : ''}><input type="checkbox" checked={!!rate} onChange={() => toggleRate(item)} /><code>{item.code}</code><span>{item.name}<small>{item.unit}</small></span><em>Std ৳{Number(item.standard_price || 0).toLocaleString()}</em>{rate && <input type="number" value={rate.proposed_rate} onChange={(e) => setRate(item.code, e.target.value)} />}</div>; })}</div></Section>}
        {step === 5 && <Section title="Review and submit" text="Seventh Sky will verify the evidence, approve commercial terms and send the agreement for two-party electronic signature."><div className="wt-public-summary"><Summary label="Services" value={`${form.service_categories.length} categories`} /><Summary label="Coverage" value={`${form.coverage_areas.length} areas`} /><Summary label="Documents" value={`${(state.documents || []).length} uploaded`} /><Summary label="Proposed rates" value={`${form.proposed_rates.length} selected`} /></div><div className="wt-public-notice">Submitting does not approve or activate your provider account. Client work can only be assigned after compliance verification, payment verification, territory briefing and completion of the Provider Master Agreement.</div></Section>}
        <footer><button disabled={step === 0 || busy} onClick={() => setStep(step - 1)}><ChevronLeft size={14} /> Back</button><span>Step {step + 1} of {STEPS.length}</span>{step < STEPS.length - 1 ? <button className="primary" disabled={busy} onClick={() => save(true)}>{busy ? <Loader2 size={14} className="spin" /> : <>Save & continue <ChevronRight size={14} /></>}</button> : <button className="primary" disabled={busy} onClick={submit}>{busy ? 'Submitting…' : 'Submit onboarding'}</button>}</footer>
      </main>
    </div>
  </PublicShell>;
}

function DocumentList({ token, documents, reference, onChange }) {
  const specs = [...(reference.compliance_docs || []).map((name) => ({ name, category: 'compliance' })), ...(reference.insurance_docs || []).map((name) => ({ name, category: 'insurance' }))];
  return <div className="wt-public-docs">{specs.map((spec) => <DocumentRow key={`${spec.category}-${spec.name}`} token={token} spec={spec} document={documents.find((d) => d.category === spec.category && d.doc_type === spec.name)} onChange={onChange} />)}</div>;
}
function DocumentRow({ token, spec, document, onChange }) {
  const input = useRef(); const [busy, setBusy] = useState(false);
  const upload = async (file) => { if (!file) return; setBusy(true); const body = new FormData(); body.append('file', file); body.append('category', spec.category); body.append('doc_type', spec.name); try { await api.post(`/public/water-tank-provider/${token}/upload`, body, { headers: { 'Content-Type': 'multipart/form-data' } }); await onChange(); } finally { setBusy(false); } };
  const remove = async () => { if (!document || document.verified) return; setBusy(true); try { await api.delete(`/public/water-tank-provider/${token}/documents/${document.id}`); await onChange(); } finally { setBusy(false); } };
  return <div><span className={document?.verified ? 'ok' : document ? 'pending' : ''}>{document?.verified ? <Check size={13} /> : <Upload size={13} />}</span><div><strong>{spec.name}</strong><small>{spec.category} · {document?.status || 'not uploaded'}</small></div><input ref={input} hidden type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => upload(e.target.files?.[0])} /><button disabled={busy || document?.verified} onClick={() => input.current?.click()}>{busy ? 'Working…' : document ? 'Replace' : 'Upload'}</button>{document && !document.verified && <button className="icon" onClick={remove}><Trash2 size={13} /></button>}</div>;
}
function PublicShell({ children }) { return <div className="wt-public"><div className="wt-public-brand"><span>7S</span><div><strong>Seventh Sky Property Care</strong><small>Secure provider onboarding</small></div></div>{children}</div>; }
function Section({ title, text, children }) { return <section><header><h2>{title}</h2><p>{text}</p></header>{children}</section>; }
function Grid({ children }) { return <div className="wt-public-grid">{children}</div>; }
function Input({ label, value = '', onChange, type = 'text', disabled }) { return <label><span>{label}</span><input type={type} value={value || ''} disabled={disabled} onChange={(e) => onChange?.(e.target.value)} /></label>; }
function Text({ label, value, onChange }) { return <label><span>{label}</span><textarea rows={3} value={value || ''} onChange={(e) => onChange(e.target.value)} /></label>; }
function Choices({ values, selected, toggle, protectedValue }) { return <div className="wt-public-choices">{values.map((item) => <button type="button" key={item} className={selected.includes(item) ? 'on' : ''} onClick={() => toggle(item)}><span>{selected.includes(item) && <Check size={12} />}</span>{item}{item === protectedValue && <small>Protected</small>}</button>)}</div>; }
function Summary({ label, value }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
