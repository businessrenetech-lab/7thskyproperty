import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, ArrowLeft, ArrowRight, Send, Copy, Eye, Lock, FolderOpen } from 'lucide-react';
import api from './../services/api';
import { Spinner } from '../ui/kit';
import { Combo } from '../ui/pickers';
import { useToast } from '../context/ToastContext';

/* Water Tank — Customer Service Agreement (SS-WTCM-CSA-01). Signed with the CLIENT.
   Mirrors the RPRM/PM builder: 6-step wizard (Parties→Services→Project→Pricing→Warranty→Review). */

const bdt = (v) => '৳' + Number(v || 0).toLocaleString('en-BD');
const sel = { border: '1px solid var(--line)', borderRadius: 10, padding: '9px 12px', background: 'var(--surface)', font: 'inherit', color: 'var(--ink)', width: '100%' };
const lbl = { fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 };
const STEPS = ['Parties', 'Services', 'Project', 'Pricing', 'Warranty', 'Review & send'];

/**
 * Advance / deposit payable on acceptance.
 *
 * There is no house percentage — 20, 30, 40 and 50 are all normal depending on
 * the job — so this is set per agreement and must stay editable right up to the
 * moment it is sent. Set the percentage or the amount; the other follows the
 * contract total, and Schedule B, Schedule C and the payment schedule all quote
 * whatever lands here.
 */
const ADVANCE_PRESETS = [20, 25, 30, 40, 50];

function AdvanceEditor({ d, setD, preview, onApply, compact }) {
  const pi = d.pricing_input;
  const s = preview?.pricing?.summary;
  const total = Number(s?.total_contract_value || 0);
  // What the document will actually say, once the server has recalculated.
  const shownPct = s?.advance_percent ?? null;

  const setPct = (v) => setD((p) => ({ ...p, pricing_input: { ...p.pricing_input, advance_percent: v, advance_amount: '' } }));
  const setAmt = (v) => setD((p) => ({ ...p, pricing_input: { ...p.pricing_input, advance_percent: '', advance_amount: v } }));

  return (
    <div style={{ marginTop: compact ? 0 : 14, padding: 14, border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface-2, #f8fafc)' }}>
      <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--navy)', marginBottom: 4 }}>
        Advance / deposit payable on acceptance
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 10 }}>
        Set the share of the contract price the customer pays up front. This is what the
        agreement will state — change it before sending.
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {ADVANCE_PRESETS.map((v) => {
          const on = String(pi.advance_percent) === String(v);
          return (
            <button
              key={v}
              className={`pm-btn${on ? ' primary' : ''}`}
              style={{ padding: '5px 14px', fontSize: 12.5 }}
              onClick={() => { setPct(v); setTimeout(onApply, 0); }}
            >
              {v}%
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: 12, alignItems: 'end' }}>
        <div>
          <label style={lbl}>Advance (%)</label>
          <input type="number" min="0" max="100" style={sel} value={pi.advance_percent}
            placeholder="e.g. 30" onChange={(e) => setPct(e.target.value)} />
        </div>
        <div style={{ textAlign: 'center', paddingBottom: 10, fontSize: 12, color: 'var(--muted)' }}>or</div>
        <div>
          <label style={lbl}>Advance (৳)</label>
          <input type="number" min="0" style={sel} value={pi.advance_amount}
            placeholder="fixed amount" onChange={(e) => setAmt(e.target.value)} />
        </div>
        <div><button className="pm-btn primary" onClick={onApply}>Apply</button></div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
        {s?.advance_amount != null ? (
          <>
            The agreement will read: <strong>Advance payable on acceptance
            {shownPct != null ? ` (${shownPct}% of contract price)` : ''} — {bdt(s.advance_amount)}</strong>,
            balance on completion <strong>{bdt(s.balance_due)}</strong>
            {total ? ` of ${bdt(total)}` : ''}.
          </>
        ) : (
          <>Nothing set — the agreement falls back to the standard 40 / 30 / 30 schedule. Pick a percentage above to change it.</>
        )}
      </div>
      {(pi.advance_percent !== '' || pi.advance_amount !== '') && (
        <button className="pm-btn" style={{ marginTop: 10, padding: '4px 12px', fontSize: 12 }}
          onClick={() => { setD((p) => ({ ...p, pricing_input: { ...p.pricing_input, advance_percent: '', advance_amount: '' } })); setTimeout(onApply, 0); }}>
          Clear — use standard 40 / 30 / 30
        </button>
      )}
    </div>
  );
}

/** A system-generated reference. Read-only by design — it belongs to the record it names. */
function RefField({ label, value, hint }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      <input
        readOnly
        value={value || ''}
        placeholder="Not yet issued"
        style={{ ...sel, background: 'var(--surface-2, #f1f5f9)', color: value ? 'var(--ink)' : 'var(--muted)', fontWeight: value ? 700 : 400, cursor: 'default' }}
      />
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{hint}</div>
    </div>
  );
}

const EMPTY = {
  effective_date: new Date().toISOString().slice(0, 10),
  org: { name: 'Seventh Sky Property Care', address: '', phone: '', email: '', represented_by: '', position: '' },
  contact_id: '', related_id: '',
  client_type: 'Residential',
  client: {
    full_name: '', nid: '', company: '', address: '', phone: '', email: '', service_address: '',
    // business clients only — see the Parties step
    business_type: '', trade_licence_no: '', registration_no: '', tin: '', bin: '',
    representative_name: '', representative_position: '',
    accounts_contact: '', accounts_email: '', alt_contact: '',
  },
  property_type: '',
  services: [], checklist: [], witnesses: [{ name: '', nid: '', email: '' }, { name: '', nid: '', email: '' }],
  schedule_b: {
    project_no: '', work_order_no: '', quotation_no: '',
    property_address: '', property_type: '',
    tank_type: '', tank_capacity: '', tanks_count: '', water_source: '',
    scope: '', materials: '', provider_name: '',
    site_contact_name: '', site_contact_phone: '', access_notes: '',
    start_date: '', completion_date: '',
    under_amc: false,
    amc_code: '', amc_package: '', amc_frequency: '',
    amc_payment_frequency: '', amc_start: '', amc_expiry: '',
    warranty_period: '', special_conditions: '',
  },
  pricing_input: {
    discount: 0, vat_percent: 0, transport: 0, govt_fees: 0, selected: [],
    advance_amount: '', advance_percent: '',
  },
};

export default function WtCustomerAgreements() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  // Arriving from a project file: /agreements/water-tank-customer?project=WTCM-P0001
  const projectCode = params.get('project');
  const [mode, setMode] = useState(projectCode ? 'build' : 'list');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (projectCode) setMode('build'); }, [projectCode]);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/wt-agreements/customer/agreements'); setList(Array.isArray(r.data) ? r.data : []); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (mode === 'build') {
    return (
      <Builder
        projectCode={projectCode}
        onDone={() => { setMode('list'); setParams({}, { replace: true }); load(); }}
        onCancel={() => { setMode('list'); setParams({}, { replace: true }); }}
      />
    );
  }
  const chip = (s) => ({ completed: 'good', active: 'good', sent: 'warn', viewed: 'info', partially_signed: 'warn', declined: 'bad', voided: 'grey', draft: 'grey' }[s] || 'grey');

  return (
    <div className="pm-scope">
      <div className="pm-head">
        <div><div className="pm-eyebrow">Agreements</div><h1>Water Tank — Customer Agreements</h1><div className="pm-meta">Water Tank Cleaning &amp; Maintenance Customer Service Agreements — build, price and send to customers for e-signature.</div></div>
        <div className="pm-head-actions"><button className="pm-btn primary" onClick={() => setMode('build')}><Plus size={15} /> New agreement</button></div>
      </div>
      {loading ? <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div> : (
        <div className="pm-card"><div className="pm-card-body" style={{ padding: 0 }}>
          <table className="pm-tbl">
            <thead><tr><th>Reference</th><th>Customer</th><th>Contract value</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td><strong style={{ color: 'var(--navy)' }}>{a.envelope_code}</strong></td>
                  <td>{a.signer?.name || '—'}<div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{a.signer?.email || ''}</div></td>
                  <td>{a.total_contract_value != null ? bdt(a.total_contract_value) : '—'}</td>
                  <td><span className={`pm-chip ${chip(a.status)}`}><span className="d" />{a.status}</span></td>
                  <td style={{ textAlign: 'right' }}>{a.signer?.status !== 'signed' && <button className="pm-btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => copyLink(a, toast)}><Copy size={13} /> Copy link</button>}</td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>No agreements yet. Click “New agreement”.</td></tr>}
            </tbody>
          </table>
        </div></div>
      )}
    </div>
  );
}

async function copyLink(a, toast) {
  try {
    const r = await api.get(`/signing/envelopes/${a.id}`);
    const s = (r.data?.data?.signers || []).find((x) => ['sent', 'viewed', 'pending'].includes(x.status)) || (r.data?.data?.signers || [])[0];
    if (!s?.access_token) return toast.error('No active signing link');
    const url = `${window.location.origin}/admin/sign/${s.access_token}`;
    try { await navigator.clipboard.writeText(url); toast.success('Signing link copied'); } catch { window.prompt('Signing link:', url); }
  } catch { toast.error('Could not fetch link'); }
}

function Builder({ onDone, onCancel, projectCode }) {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [d, setD] = useState(EMPTY);
  const [meta, setMeta] = useState({ service_groups: {}, checklist_groups: {} });
  const [catalog, setCatalog] = useState([]);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null);

  const [source, setSource] = useState(null);
  const [hydrating, setHydrating] = useState(!!projectCode);

  useEffect(() => {
    api.get('/wt-agreements/customer/meta').then((r) => setMeta(r.data || {})).catch(() => {});
    api.get('/wt-agreements/customer/catalog').then((r) => setCatalog(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  /*
   * Hydrate from the project. Everything captured while the project was created —
   * client, site, tanks, scope, priced services, dates, provider, AMC, deposit —
   * is carried across so nothing is retyped and the two documents cannot state
   * different facts about the same job.
   */
  useEffect(() => {
    if (!projectCode) return;
    let cancelled = false;
    setHydrating(true);
    api.get(`/wt-projects/${projectCode}/agreement-draft`)
      .then(({ data }) => {
        if (cancelled) return;
        setSource(data.source || null);
        setD((prev) => ({
          ...prev,
          related_id: data.related_id ?? prev.related_id,
          project_code: data.project_code,
          effective_date: data.effective_date || prev.effective_date,
          client: { ...prev.client, ...data.client },
          property_type: data.property_type || prev.property_type,
          schedule_b: { ...prev.schedule_b, ...data.schedule_b },
          services: data.services?.length ? data.services : prev.services,
          pricing_input: { ...prev.pricing_input, ...data.pricing_input },
        }));
      })
      .catch((e) => toast.error(e.response?.data?.error || `Could not load project ${projectCode}`))
      .finally(() => { if (!cancelled) setHydrating(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectCode]);

  const set = (path, value) => setD((prev) => { const n = structuredClone(prev); let o = n; const ks = path.split('.'); for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = value; return n; });
  const toggleArr = (path, item) => setD((prev) => { const n = structuredClone(prev); let o = n; const ks = path.split('.'); for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; const arr = o[ks[ks.length - 1]]; const i = arr.indexOf(item); if (i >= 0) arr.splice(i, 1); else arr.push(item); return n; });

  // Commercial / industrial / institutional clients are entities signing through
  // a representative, so the agreement asks for the business identity as well.
  const isBusiness = ['commercial', 'industrial', 'institutional']
    .includes(String(d.client_type || '').toLowerCase());

  const selCodes = useMemo(() => new Set(d.pricing_input.selected.map((s) => s.code)), [d.pricing_input.selected]);
  const toggleLine = (code) => setD((prev) => { const n = structuredClone(prev); const arr = n.pricing_input.selected; const i = arr.findIndex((s) => s.code === code); if (i >= 0) arr.splice(i, 1); else arr.push({ code, qty: 1, agreed_price: '' }); return n; });
  const setField = (code, field, v) => setD((prev) => { const n = structuredClone(prev); const row = n.pricing_input.selected.find((s) => s.code === code); if (row) row[field] = v; return n; });

  const refreshPreview = useCallback(async () => { const r = await api.post('/wt-agreements/customer/preview', d).catch(() => null); if (r) setPreview(r.data); }, [d]);
  useEffect(() => { if (step === 3 || step === 5) refreshPreview(); /* eslint-disable-next-line */ }, [step]);

  const send = async () => {
    if (!d.client.full_name) return toast.error('Enter the customer name (Step 1)');
    if (!d.client.email) return toast.error('Enter the customer email (Step 1)');
    setBusy(true);
    try {
      const r = await api.post('/wt-agreements/customer/agreements', d);
      setSent(r.data);
      // Write the reference back onto the project so the chain is traceable both
      // ways and the project file shows the agreement as sent.
      if (projectCode) {
        await api.post(`/wt-projects/${projectCode}/link-agreement`, {
          envelope_id: r.data.id, envelope_code: r.data.envelope_code, status: 'Sent',
        }).catch(() => { /* the agreement is sent either way; the link is a convenience */ });
      }
      toast.success('Agreement sent to customer for signature');
    } catch (err) { toast.error(err.response?.data?.error || 'Could not send'); } finally { setBusy(false); }
  };

  const onClient = (id, row) => { set('contact_id', id); if (row) setD((p) => ({ ...p, client: { ...p.client, full_name: row.full_name || '', phone: row.primary_phone || '', email: row.email || '', nid: row.national_id || row.passport_no || '' } })); };

  const grouped = useMemo(() => { const g = { service: [], material: [], labour: [] }; catalog.forEach((c) => (g[c.group] || g.service).push(c)); return g; }, [catalog]);

  if (sent) {
    const url = `${window.location.origin}${sent.signing_path}`;
    return (
      <div className="pm-scope"><div className="pm-head"><div><div className="pm-eyebrow">Agreements</div><h1>Agreement sent</h1></div></div>
        <div className="pm-card" style={{ maxWidth: 640 }}><div className="pm-card-body" style={{ padding: 24 }}>
          <div className="pm-chip good" style={{ marginBottom: 12 }}><span className="d" />{sent.envelope_code} · sent for signature</div>
          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>The customer can review the full agreement (with Table of Contents and Schedule C pricing) and sign at:</p>
          <div style={{ display: 'flex', gap: 8, margin: '10px 0' }}>
            <input readOnly value={url} style={{ ...sel, fontSize: 12.5 }} />
            <button className="pm-btn" onClick={() => { navigator.clipboard.writeText(url).then(() => toast.success('Copied')); }}><Copy size={14} /></button>
            <a className="pm-btn primary" href={url} target="_blank" rel="noopener" style={{ textDecoration: 'none' }}><Eye size={14} /> Open</a>
          </div>
          <button className="pm-btn" style={{ marginTop: 12 }} onClick={onDone}>Back to agreements</button>
        </div></div>
      </div>
    );
  }

  return (
    <div className="pm-scope">
      <div className="pm-head">
        <div><div className="pm-eyebrow">Agreements</div><h1>New Customer Service Agreement</h1><div className="pm-meta">Step {step + 1} of {STEPS.length} · {STEPS[step]}</div></div>
        <div className="pm-head-actions"><button className="pm-btn" onClick={onCancel}>Cancel</button></div>
      </div>
      <div className="pm-segment" style={{ marginBottom: 18, flexWrap: 'wrap' }}>{STEPS.map((s, i) => <button key={s} className={i === step ? 'on' : ''} onClick={() => setStep(i)}>{i + 1}. {s}</button>)}</div>

      {hydrating && (
        <div className="pm-card" style={{ marginBottom: 14 }}><div className="pm-card-body" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Spinner /> <span style={{ fontSize: 13 }}>Loading {projectCode}…</span>
        </div></div>
      )}
      {source && (
        <div className="pm-card" style={{ marginBottom: 14 }}><div className="pm-card-body" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <FolderOpen size={16} style={{ color: 'var(--navy)' }} />
          <span style={{ fontSize: 13 }}>
            Built from <strong>{source.project.code}</strong> — {source.project.name}
          </span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            {source.service_count} service line(s) · {bdt(source.contract_value)}
            {source.quotation ? ` · quotation ${source.quotation.code}` : ''}
            {source.work_order ? ` · work order ${source.work_order.code}` : ''}
            {source.deposit_required ? ' · deposit required' : ''}
          </span>
        </div></div>
      )}

      <div className="pm-card"><div className="pm-card-body" style={{ padding: 20 }}>
        {step === 0 && (
          <div style={{ display: 'grid', gap: 14 }}>
            <div><label style={lbl}>Customer — pick contact</label><Combo endpoint="/contacts" labelFn={(c) => `${c.full_name || 'Contact'} · ${c.primary_phone || c.email || ''}`} value={d.contact_id ? Number(d.contact_id) : ''} onChange={onClient} placeholder="Search a contact…" /></div>
            {/* Client type decides what the agreement must ask for: a residential
                customer signs personally, a business signs through a named
                representative and has to be identified as an entity. */}
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Client type</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(meta.client_types || ['Residential', 'Commercial', 'Industrial', 'Institutional']).map((t) => (
                  <button key={t} className={`pm-btn${(d.client_type || 'Residential') === t ? ' primary' : ''}`}
                    style={{ padding: '5px 14px', fontSize: 12.5 }}
                    onClick={() => set('client_type', t)}>{t}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div><label style={lbl}>{isBusiness ? 'Business / organisation name *' : 'Client name *'}</label><input style={sel} value={d.client.full_name} onChange={(e) => set('client.full_name', e.target.value)} /></div>
              <div><label style={lbl}>Email *</label><input style={sel} value={d.client.email} onChange={(e) => set('client.email', e.target.value)} /></div>
              <div><label style={lbl}>Property type</label><input style={sel} value={d.property_type} onChange={(e) => set('property_type', e.target.value)} /></div>
              <div><label style={lbl}>Effective date</label><input type="date" style={sel} value={d.effective_date} onChange={(e) => set('effective_date', e.target.value)} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Service address</label><input style={sel} value={d.client.service_address} onChange={(e) => set('client.service_address', e.target.value)} /></div>
            </div>

            {isBusiness ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                  <div><label style={lbl}>Registered / legal name</label><input style={sel} value={d.client.company} onChange={(e) => set('client.company', e.target.value)} placeholder="If different from the trading name" /></div>
                  <div><label style={lbl}>Business type</label><input style={sel} value={d.client.business_type || ''} onChange={(e) => set('client.business_type', e.target.value)} placeholder="Private Ltd, partnership…" /></div>
                  <div><label style={lbl}>Trade licence no.</label><input style={sel} value={d.client.trade_licence_no || ''} onChange={(e) => set('client.trade_licence_no', e.target.value)} /></div>
                  <div><label style={lbl}>Company registration no.</label><input style={sel} value={d.client.registration_no || ''} onChange={(e) => set('client.registration_no', e.target.value)} /></div>
                  <div><label style={lbl}>TIN</label><input style={sel} value={d.client.tin || ''} onChange={(e) => set('client.tin', e.target.value)} /></div>
                  <div><label style={lbl}>BIN / VAT reg. no.</label><input style={sel} value={d.client.bin || ''} onChange={(e) => set('client.bin', e.target.value)} /></div>
                  <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Registered address</label><input style={sel} value={d.client.address} onChange={(e) => set('client.address', e.target.value)} /></div>
                </div>
                <div style={{ borderTop: '1px solid var(--line)', marginTop: 14, paddingTop: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--navy)', marginBottom: 4 }}>Authorised representative</div>
                  <div className="pm-meta" style={{ fontSize: 12, marginBottom: 10 }}>
                    The person signing on behalf of the organisation — they appear in the parties block and sign the agreement.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div><label style={lbl}>Representative name</label><input style={sel} value={d.client.representative_name || ''} onChange={(e) => set('client.representative_name', e.target.value)} /></div>
                    <div><label style={lbl}>Position / designation</label><input style={sel} value={d.client.representative_position || ''} onChange={(e) => set('client.representative_position', e.target.value)} placeholder="Managing Director…" /></div>
                    <div><label style={lbl}>Representative phone</label><input style={sel} value={d.client.phone} onChange={(e) => set('client.phone', e.target.value)} /></div>
                    <div><label style={lbl}>Representative NID / passport</label><input style={sel} value={d.client.nid} onChange={(e) => set('client.nid', e.target.value)} /></div>
                    <div><label style={lbl}>Accounts contact</label><input style={sel} value={d.client.accounts_contact || ''} onChange={(e) => set('client.accounts_contact', e.target.value)} placeholder="Who invoices go to" /></div>
                    <div><label style={lbl}>Accounts email</label><input style={sel} value={d.client.accounts_email || ''} onChange={(e) => set('client.accounts_email', e.target.value)} /></div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                <div><label style={lbl}>Phone</label><input style={sel} value={d.client.phone} onChange={(e) => set('client.phone', e.target.value)} /></div>
                <div><label style={lbl}>NID / Passport</label><input style={sel} value={d.client.nid} onChange={(e) => set('client.nid', e.target.value)} /></div>
                <div><label style={lbl}>Address</label><input style={sel} value={d.client.address} onChange={(e) => set('client.address', e.target.value)} /></div>
                <div><label style={lbl}>Alternate contact</label><input style={sel} value={d.client.alt_contact || ''} onChange={(e) => set('client.alt_contact', e.target.value)} placeholder="Second name and number" /></div>
              </div>
            )}

            {/* Seventh Sky's side of the execution block. Without the email there
                is no countersigner, so that signature block would stay blank. */}
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--navy)', marginBottom: 8 }}>Seventh Sky signatory</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div><label style={lbl}>Represented by</label><input style={sel} value={d.org.represented_by} onChange={(e) => set('org.represented_by', e.target.value)} /></div>
                <div><label style={lbl}>Position</label><input style={sel} value={d.org.position} onChange={(e) => set('org.position', e.target.value)} /></div>
                <div><label style={lbl}>Countersigner email</label><input style={sel} type="email" value={d.org.email} onChange={(e) => set('org.email', e.target.value)} placeholder="Blank = no countersignature" /></div>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 0 }}>
              Schedule A — the services that form part of this agreement. Clause 3 limits the Agreement
              to what is ticked here, so anything priced in Schedule C is ticked automatically on the
              signed document. Tick anything additional the Agreement should cover.
            </p>
            {Object.entries(meta.service_groups).map(([g, items]) => (
              <div key={g} style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--ink)', margin: '8px 0 6px' }}>{g}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px' }}>{items.map((it) => <label key={it} style={{ fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><input type="checkbox" checked={d.services.includes(it)} onChange={() => toggleArr('services', it)} /> {it}</label>)}</div>
              </div>
            ))}
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'grid', gap: 16 }}>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>
              Schedule B — the project record. Clause 4 requires every item below, and the Work Order
              prevails over this Agreement for the project it covers, so these details must be right.
            </p>

            {/* System-generated references. Never typed — they come from the records
                themselves, so the Agreement can always be traced back to them. */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--navy)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Lock size={13} /> Reference numbers — system generated
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                <RefField label="Project No." value={d.schedule_b.project_no} hint="From the project file" />
                <RefField label="Work Order No." value={d.schedule_b.work_order_no} hint="Set when the work order is issued" />
                <RefField label="Quotation No." value={d.schedule_b.quotation_no} hint="Set when the quotation is raised" />
              </div>
              {!projectCode && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
                  Build the agreement from a project file to fill these automatically —
                  open the project and use <strong>Raise customer agreement</strong>.
                </div>
              )}
            </div>

            <div>
              <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--navy)', marginBottom: 8 }}>Site &amp; tanks</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Property address</label><input style={sel} value={d.schedule_b.property_address} onChange={(e) => set('schedule_b.property_address', e.target.value)} /></div>
                <div><label style={lbl}>Property type</label><input style={sel} value={d.schedule_b.property_type} onChange={(e) => set('schedule_b.property_type', e.target.value)} /></div>
                <div><label style={lbl}>Tank type</label><input style={sel} value={d.schedule_b.tank_type} onChange={(e) => set('schedule_b.tank_type', e.target.value)} /></div>
                <div><label style={lbl}>Tank capacity</label><input style={sel} value={d.schedule_b.tank_capacity} onChange={(e) => set('schedule_b.tank_capacity', e.target.value)} /></div>
                <div><label style={lbl}>Number of tanks</label><input type="number" style={sel} value={d.schedule_b.tanks_count} onChange={(e) => set('schedule_b.tanks_count', e.target.value)} /></div>
                <div><label style={lbl}>Water source</label><input style={sel} value={d.schedule_b.water_source} onChange={(e) => set('schedule_b.water_source', e.target.value)} /></div>
                <div><label style={lbl}>Service provider</label><input style={sel} value={d.schedule_b.provider_name} onChange={(e) => set('schedule_b.provider_name', e.target.value)} /></div>
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--navy)', marginBottom: 8 }}>Scope, access &amp; timeline</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Scope of work</label><textarea rows={2} style={{ ...sel, resize: 'vertical' }} value={d.schedule_b.scope} onChange={(e) => set('schedule_b.scope', e.target.value)} /></div>
                <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Materials &amp; consumables</label><input style={sel} value={d.schedule_b.materials} onChange={(e) => set('schedule_b.materials', e.target.value)} /></div>
                <div><label style={lbl}>Site contact name</label><input style={sel} value={d.schedule_b.site_contact_name} onChange={(e) => set('schedule_b.site_contact_name', e.target.value)} /></div>
                <div><label style={lbl}>Site contact phone</label><input style={sel} value={d.schedule_b.site_contact_phone} onChange={(e) => set('schedule_b.site_contact_phone', e.target.value)} /></div>
                <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Site access requirements</label><textarea rows={2} style={{ ...sel, resize: 'vertical' }} value={d.schedule_b.access_notes} onChange={(e) => set('schedule_b.access_notes', e.target.value)} /></div>
                <div><label style={lbl}>Estimated start date</label><input type="date" style={sel} value={d.schedule_b.start_date} onChange={(e) => set('schedule_b.start_date', e.target.value)} /></div>
                <div><label style={lbl}>Estimated completion date</label><input type="date" style={sel} value={d.schedule_b.completion_date} onChange={(e) => set('schedule_b.completion_date', e.target.value)} /></div>
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--navy)', marginBottom: 8 }}>AMC, warranty &amp; conditions</div>

              {/* AMC is a yes/no question first — the package, cycle and dates
                  only appear once the answer is yes. */}
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>Is this project under an Annual Maintenance Contract?</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['No', 'Yes'].map((opt) => {
                    const on = (opt === 'Yes') === !!d.schedule_b.under_amc;
                    return (
                      <button key={opt} className={`pm-btn${on ? ' primary' : ''}`} style={{ padding: '5px 16px', fontSize: 12.5 }}
                        onClick={() => setD((p) => {
                          const n = structuredClone(p);
                          n.schedule_b.under_amc = opt === 'Yes';
                          // clearing on "No" stops a stale package reaching the signed document
                          if (opt === 'No') Object.assign(n.schedule_b, { amc_code: '', amc_package: '', amc_frequency: '', amc_payment_frequency: '', amc_start: '', amc_expiry: '' });
                          return n;
                        })}>{opt}</button>
                    );
                  })}
                </div>
              </div>

              {d.schedule_b.under_amc && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 12 }}>
                  <div><label style={lbl}>Existing AMC contract</label>
                    <select style={sel} value={d.schedule_b.amc_code}
                      onChange={(e) => {
                        const a = (meta.amc_contracts || []).find((x) => x.code === e.target.value);
                        setD((p) => {
                          const n = structuredClone(p);
                          n.schedule_b.amc_code = e.target.value;
                          if (a) {
                            n.schedule_b.amc_package = a.package || n.schedule_b.amc_package;
                            n.schedule_b.amc_frequency = a.frequency || n.schedule_b.amc_frequency;
                            n.schedule_b.amc_payment_frequency = a.payment_frequency || n.schedule_b.amc_payment_frequency;
                          }
                          return n;
                        });
                      }}>
                      <option value="">Not linked to an existing contract</option>
                      {(meta.amc_contracts || []).map((a) => <option key={a.code} value={a.code}>{a.code} — {a.client_name}</option>)}
                    </select></div>
                  <div><label style={lbl}>AMC package</label>
                    <select style={sel} value={d.schedule_b.amc_package} onChange={(e) => set('schedule_b.amc_package', e.target.value)}>
                      <option value="">Select a package…</option>
                      {(meta.amc_packages || []).map((p) => <option key={p.key} value={p.label}>{p.label} — {p.visits_per_year} visits/yr</option>)}
                    </select></div>
                  <div><label style={lbl}>Visit frequency</label>
                    <select style={sel} value={d.schedule_b.amc_frequency} onChange={(e) => set('schedule_b.amc_frequency', e.target.value)}>
                      <option value="">Select…</option>
                      {(meta.amc_visit_frequencies || []).map((x) => <option key={x}>{x}</option>)}
                    </select></div>
                  <div><label style={lbl}>Billing cycle (Clause 9)</label>
                    <select style={sel} value={d.schedule_b.amc_payment_frequency} onChange={(e) => set('schedule_b.amc_payment_frequency', e.target.value)}>
                      <option value="">Select…</option>
                      {(meta.amc_frequencies || []).map((x) => <option key={x}>{x}</option>)}
                    </select></div>
                  <div><label style={lbl}>AMC start date</label><input type="date" style={sel} value={d.schedule_b.amc_start || ''} onChange={(e) => set('schedule_b.amc_start', e.target.value)} /></div>
                  <div><label style={lbl}>AMC expiry date</label><input type="date" style={sel} value={d.schedule_b.amc_expiry || ''} onChange={(e) => set('schedule_b.amc_expiry', e.target.value)} /></div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div><label style={lbl}>Warranty period</label><input style={sel} value={d.schedule_b.warranty_period} onChange={(e) => set('schedule_b.warranty_period', e.target.value)} /></div>
                <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Special conditions</label><textarea rows={2} style={{ ...sel, resize: 'vertical' }} value={d.schedule_b.special_conditions} onChange={(e) => set('schedule_b.special_conditions', e.target.value)} /></div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 0 }}>Schedule C — tick items to price, set quantity; enter an Agreed unit price to override the standard.</p>
            {['service', 'material', 'labour'].map((grp) => (
              <div key={grp} style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--navy)', margin: '6px 0' }}>{grp === 'service' ? 'Standard Service Pricing' : grp === 'material' ? 'Materials & Consumables' : 'Labour Charges'}</div>
                <table className="pm-tbl">
                  <thead><tr><th></th><th>Code</th><th>Item</th><th>Unit</th><th style={{ textAlign: 'right' }}>Standard</th><th style={{ textAlign: 'center' }}>Qty</th><th style={{ textAlign: 'right' }}>Agreed (৳)</th></tr></thead>
                  <tbody>
                    {(grouped[grp] || []).map((l) => {
                      const on = selCodes.has(l.code); const row = d.pricing_input.selected.find((s) => s.code === l.code);
                      return (
                        <tr key={l.code} style={{ opacity: on ? 1 : 0.6 }}>
                          <td><input type="checkbox" checked={on} onChange={() => toggleLine(l.code)} /></td>
                          <td style={{ fontSize: 12 }}>{l.code}</td><td style={{ fontSize: 12.5 }}>{l.name}</td><td style={{ fontSize: 12 }}>{l.unit}</td>
                          <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--muted)' }}>{bdt(l.standard_price)}</td>
                          <td style={{ textAlign: 'center' }}>{on ? <input type="number" min={1} style={{ ...sel, width: 60, padding: '5px 6px', textAlign: 'center' }} value={row?.qty ?? 1} onChange={(e) => setField(l.code, 'qty', Number(e.target.value))} /> : '—'}</td>
                          <td style={{ textAlign: 'right' }}>{on ? <input type="number" style={{ ...sel, width: 110, padding: '5px 8px', textAlign: 'right' }} placeholder={String(l.standard_price)} value={row?.agreed_price ?? ''} onChange={(e) => setField(l.code, 'agreed_price', e.target.value)} /> : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginTop: 6 }}>
              <div><label style={lbl}>Transport (৳)</label><input type="number" style={sel} value={d.pricing_input.transport} onChange={(e) => set('pricing_input.transport', Number(e.target.value))} /></div>
              <div><label style={lbl}>Govt fees (৳)</label><input type="number" style={sel} value={d.pricing_input.govt_fees} onChange={(e) => set('pricing_input.govt_fees', Number(e.target.value))} /></div>
              <div><label style={lbl}>Discount (৳)</label><input type="number" style={sel} value={d.pricing_input.discount} onChange={(e) => set('pricing_input.discount', Number(e.target.value))} /></div>
              <div><label style={lbl}>VAT (%)</label><input type="number" style={sel} value={d.pricing_input.vat_percent} onChange={(e) => set('pricing_input.vat_percent', Number(e.target.value))} /></div>
              <div style={{ alignSelf: 'end' }}><button className="pm-btn" onClick={refreshPreview}>Recalculate</button></div>
            </div>

            <AdvanceEditor d={d} setD={setD} preview={preview} onApply={refreshPreview} />
            {preview?.pricing && (
              <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="pm-card"><div className="pm-card-body" style={{ padding: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 8 }}>Cost summary</div>
                  {[['Service charges', preview.pricing.summary.service_charges], ['Labour', preview.pricing.summary.labour], ['Materials', preview.pricing.summary.materials], ['Transport', preview.pricing.summary.transport], ['Govt fees', preview.pricing.summary.govt_fees], ['Discount', -preview.pricing.summary.discount], ['VAT', preview.pricing.summary.vat]].map(([k, v]) => <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '3px 0' }}><span style={{ color: 'var(--muted)' }}>{k}</span><span>{bdt(v)}</span></div>)}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, borderTop: '1px solid var(--line)', marginTop: 6, paddingTop: 6 }}><span>Total contract price</span><span>{bdt(preview.pricing.summary.total_contract_value)}</span></div>
                </div></div>
                <div className="pm-card"><div className="pm-card-body" style={{ padding: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 8 }}>Payment schedule</div>
                  {preview.pricing.payment_schedule.map((p, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '3px 0' }}><span style={{ color: 'var(--muted)' }}>{p.stage}</span><span>{bdt(p.amount)}</span></div>)}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, borderTop: '1px solid var(--line)', marginTop: 6, paddingTop: 6, fontSize: 12.5 }}>
                    <span>Scheduled</span>
                    <span>{bdt(preview.pricing.payment_schedule.reduce((s, p) => s + Number(p.amount || 0), 0))}</span>
                  </div>
                </div></div>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 0 }}>Schedule D — warranty summary &amp; project requirements.</p>
            {Object.entries(meta.checklist_groups).map(([g, items]) => (
              <div key={g} style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 12.5, margin: '8px 0 6px' }}>{g}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px' }}>{items.map((it) => <label key={it} style={{ fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><input type="checkbox" checked={d.checklist.includes(it)} onChange={() => toggleArr('checklist', it)} /> {it}</label>)}</div>
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 10 }}>
              {d.witnesses.map((w, i) => (
                <div key={i} style={{ display: 'grid', gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>Witness {i + 1}</div>
                  <input style={sel} placeholder="Name" value={w.name} onChange={(e) => setD((p) => { const n = structuredClone(p); n.witnesses[i].name = e.target.value; return n; })} />
                  <input style={sel} placeholder="NID / Passport" value={w.nid} onChange={(e) => setD((p) => { const n = structuredClone(p); n.witnesses[i].nid = e.target.value; return n; })} />
                  {/* Without an email a witness gets a signature block on the
                      document but no way to reach it, so it would stay blank. */}
                  <input style={sel} type="email" placeholder="Email (to send for signature)" value={w.email || ''} onChange={(e) => setD((p) => { const n = structuredClone(p); n.witnesses[i].email = e.target.value; return n; })} />
                </div>
              ))}
            </div>
            <div className="pm-meta" style={{ marginTop: 10, fontSize: 12 }}>
              Each party with an email gets their own signature and date block and their own signing
              link — client first, then Seventh Sky countersigns, then the witnesses attest.
              Set the Seventh Sky countersigner email on the Pricing step&rsquo;s commercial section.
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 0 }}>Review the full agreement exactly as the customer will see it, then send.</p>

            {/* The advance is the figure most often adjusted at the last moment,
                so it stays editable here — the preview below re-renders with it. */}
            <AdvanceEditor d={d} setD={setD} preview={preview} onApply={refreshPreview} compact />

            <div style={{ margin: '14px 0 6px', fontWeight: 700, fontSize: 12.5, color: 'var(--navy)' }}>Document preview</div>
            {preview?.html ? <div style={{ border: '1px solid var(--line)', borderRadius: 10, maxHeight: 460, overflow: 'auto', padding: 16, background: '#fff' }} dangerouslySetInnerHTML={{ __html: preview.html }} /> : <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>}
            <button className="pm-btn primary" disabled={busy} style={{ marginTop: 14 }} onClick={send}><Send size={15} /> {busy ? 'Sending…' : 'Send to customer for signature'}</button>
          </div>
        )}
      </div></div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
        <button className="pm-btn" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}><ArrowLeft size={15} /> Back</button>
        {step < STEPS.length - 1 && <button className="pm-btn primary" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Next <ArrowRight size={15} /></button>}
      </div>
    </div>
  );
}
