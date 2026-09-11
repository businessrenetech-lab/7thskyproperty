// admin-portal/src/screens/sales/SalesAgreementScreen.jsx
//
// Parametric builder for the residential sales service agreements (RPPS/RPSS).
// kind = 'purchase' | 'sale'. Drives /api/sales-agreements/:kind (catalog /
// preview / agreements) and the existing eSign flow. Adapted from
// RprmAgreements.jsx, leaner for the sales endpoints.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Copy, Eye } from 'lucide-react';
import api from '../../services/api';
import { Spinner } from '../../ui/kit';
import { Combo } from '../../ui/pickers';
import { useToast } from '../../context/ToastContext';

const bdt = (v) => '৳' + Number(v || 0).toLocaleString('en-BD');
const sel = { border: '1px solid var(--line)', borderRadius: 10, padding: '9px 12px', background: 'var(--surface)', font: 'inherit', color: 'var(--ink)', width: '100%' };
const lbl = { fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 };
const STEPS = ['Parties', 'Services & pricing', 'Engagement', 'Review & send'];

const KIND_META = {
  purchase: { party: 'Buyer', title: 'Purchase Agreements', newTitle: 'New Property Purchase Service Agreement', base: '/sales-agreements/purchase' },
  sale: { party: 'Seller', title: 'Sale Agreements', newTitle: 'New Property Sale Service Agreement', base: '/sales-agreements/sale' },
};

const emptyState = () => ({
  effective_date: new Date().toISOString().slice(0, 10),
  org: { name: 'Seventh Sky Residential Property Services', address: '', phone: '', email: '', represented_by: '', position: '' },
  client_contact_id: '', property_id: '',
  client: { full_name: '', nid: '', property_address: '', phone: '', email: '', rep: '' },
  property_type: '',
  services: [],
  schedule_b: { work_order_no: '', quotation_no: '', engagement_type: 'Non-exclusive', target_value: '', timeframe: '', commencement_date: '', special_requirements: '' },
  pricing_input: { discount: 0, vat_percent: 0, third_party_costs: 0, admin_charges: 0, selected: [] },
});

export default function SalesAgreementScreen({ kind }) {
  const km = KIND_META[kind];
  const toast = useToast();
  const location = useLocation();
  const prefill = location.state?.prefill || null;
  const [mode, setMode] = useState(prefill ? 'build' : 'list');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get(`${km.base}/agreements`); setList(Array.isArray(r.data) ? r.data : []); }
    finally { setLoading(false); }
  }, [km.base]);
  useEffect(() => { load(); }, [load]);

  if (mode === 'build') return <Builder kind={kind} prefill={prefill} onDone={() => { setMode('list'); load(); }} onCancel={() => setMode('list')} />;

  const chip = (s) => ({ completed: 'good', active: 'good', sent: 'warn', viewed: 'info', partially_signed: 'warn', declined: 'bad', voided: 'grey', draft: 'grey' }[s] || 'grey');

  return (
    <div className="pm-scope">
      <div className="pm-head">
        <div><div className="pm-eyebrow">Contracts</div><h1>{km.title}</h1><div className="pm-meta">Residential Property {km.party === 'Buyer' ? 'Purchase' : 'Sale'} Service Agreements — build, price and send to the {km.party.toLowerCase()} for e-signature.</div></div>
        <div className="pm-head-actions"><button className="pm-btn primary" onClick={() => setMode('build')}><Plus size={15} /> New agreement</button></div>
      </div>
      {loading ? <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div> : (
        <div className="pm-card"><div className="pm-card-body" style={{ padding: 0 }}>
          <table className="pm-tbl">
            <thead><tr><th>Reference</th><th>{km.party}</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
            <tbody>
              {list.map((a) => {
                const s = (a.signers || [])[0];
                return (
                  <tr key={a.id}>
                    <td><strong style={{ color: 'var(--navy)' }}>{a.envelope_code}</strong></td>
                    <td>{s?.name || '—'}<div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{s?.email || ''}</div></td>
                    <td><span className={`pm-chip ${chip(a.status)}`}><span className="d" />{a.status}</span></td>
                    <td style={{ textAlign: 'right' }}>{s?.status !== 'signed' && <button className="pm-btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => copyLink(a, toast)}><Copy size={13} /> Copy link</button>}</td>
                  </tr>
                );
              })}
              {!list.length && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>No agreements yet. Click “New agreement”.</td></tr>}
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

function Builder({ kind, prefill, onDone, onCancel }) {
  const km = KIND_META[kind];
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [d, setD] = useState(() => {
    const base = emptyState();
    if (!prefill) return base;
    return {
      ...base,
      services: prefill.services || base.services,
      schedule_b: { ...base.schedule_b, ...(prefill.schedule_b || {}), special_requirements: [(prefill.schedule_b || {}).special_requirements, prefill.supersedes ? `Variation of ${prefill.supersedes}` : ''].filter(Boolean).join(' — ') },
      pricing_input: { ...base.pricing_input, ...(prefill.pricing_input || {}), selected: (prefill.pricing_input || {}).selected || [] },
    };
  });
  const [catalog, setCatalog] = useState([]);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null);

  useEffect(() => { api.get(`${km.base}/catalog`).then((r) => setCatalog(Array.isArray(r.data) ? r.data : [])).catch(() => {}); }, [km.base]);

  const set = (path, value) => setD((prev) => {
    const next = structuredClone(prev); let o = next; const ks = path.split('.');
    for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = value; return next;
  });
  const selCodes = useMemo(() => new Set(d.pricing_input.selected.map((s) => s.code)), [d.pricing_input.selected]);
  const toggleLine = (code, name) => setD((prev) => {
    const next = structuredClone(prev); const arr = next.pricing_input.selected;
    const i = arr.findIndex((s) => s.code === code);
    if (i >= 0) { arr.splice(i, 1); next.services = next.services.filter((n) => n !== name); }
    else { arr.push({ code, agreed_price: '' }); if (name) next.services.push(name); }
    return next;
  });
  const setAgreed = (code, v) => setD((prev) => { const next = structuredClone(prev); const row = next.pricing_input.selected.find((s) => s.code === code); if (row) row.agreed_price = v; return next; });

  const refreshPreview = useCallback(async () => {
    const r = await api.post(`${km.base}/preview`, d).catch(() => null);
    if (r) setPreview(r.data);
  }, [d, km.base]);
  useEffect(() => { if (step === 1 || step === 3) refreshPreview(); /* eslint-disable-next-line */ }, [step]);

  const send = async () => {
    if (!d.client.full_name) return toast.error(`Enter the ${km.party.toLowerCase()} name (Step 1)`);
    if (!d.client.email) return toast.error(`Enter the ${km.party.toLowerCase()} email (Step 1)`);
    setBusy(true);
    try { const r = await api.post(`${km.base}/agreements`, d); setSent(r.data); toast.success(`Agreement sent to the ${km.party.toLowerCase()} for signature`); }
    catch (err) { toast.error(err.response?.data?.error || 'Could not send'); } finally { setBusy(false); }
  };

  const onClient = (id, row) => { set('client_contact_id', id); if (row) setD((p) => ({ ...p, client: { ...p.client, full_name: row.full_name || '', phone: row.primary_phone || '', email: row.email || '', nid: row.national_id || row.passport_no || '' } })); };
  const onProperty = (id, row) => { set('property_id', id); if (row) setD((p) => ({ ...p, property_type: row.property_type || p.property_type, client: { ...p.client, property_address: row.address || row.title || '' } })); };

  if (sent) {
    const url = `${window.location.origin}${sent.signing_path}`;
    return (
      <div className="pm-scope"><div className="pm-head"><div><div className="pm-eyebrow">Contracts</div><h1>Agreement sent</h1></div></div>
        <div className="pm-card" style={{ maxWidth: 640 }}><div className="pm-card-body" style={{ padding: 24 }}>
          <div className="pm-chip good" style={{ marginBottom: 12 }}><span className="d" />{sent.envelope_code} · sent for signature</div>
          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>The {km.party.toLowerCase()} can review the full agreement and sign at:</p>
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
        <div><div className="pm-eyebrow">Contracts</div><h1>{km.newTitle}</h1><div className="pm-meta">Step {step + 1} of {STEPS.length} · {STEPS[step]}</div></div>
        <div className="pm-head-actions"><button className="pm-btn" onClick={onCancel}>Cancel</button></div>
      </div>
      <div className="pm-segment" style={{ marginBottom: 18, flexWrap: 'wrap' }}>
        {STEPS.map((s, i) => <button key={s} className={`pm-seg-btn ${i === step ? 'active' : ''}`} onClick={() => setStep(i)}>{i + 1}. {s}</button>)}
      </div>

      <div className="pm-card"><div className="pm-card-body" style={{ padding: 20 }}>
        {step === 0 && (
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>
            <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Find {km.party.toLowerCase()} (contact)</label><Combo endpoint="/contacts" labelFn={(c) => `${c.full_name}${c.primary_phone ? ' · ' + c.primary_phone : ''}`} value={d.client_contact_id} onChange={onClient} placeholder="Search a contact…" /></div>
            <div><label style={lbl}>{km.party} full name *</label><input style={sel} value={d.client.full_name} onChange={(e) => set('client.full_name', e.target.value)} /></div>
            <div><label style={lbl}>{km.party} email *</label><input style={sel} value={d.client.email} onChange={(e) => set('client.email', e.target.value)} /></div>
            <div><label style={lbl}>Phone</label><input style={sel} value={d.client.phone} onChange={(e) => set('client.phone', e.target.value)} /></div>
            <div><label style={lbl}>NID / Passport</label><input style={sel} value={d.client.nid} onChange={(e) => set('client.nid', e.target.value)} /></div>
            <div><label style={lbl}>Effective date</label><input type="date" style={sel} value={d.effective_date} onChange={(e) => set('effective_date', e.target.value)} /></div>
            <div><label style={lbl}>Seventh Sky representative</label><input style={sel} value={d.org.represented_by} onChange={(e) => set('org.represented_by', e.target.value)} /></div>
          </div>
        )}

        {step === 1 && (
          <table className="pm-tbl">
            <thead><tr><th></th><th>Code</th><th>Service</th><th>Unit</th><th>Standard</th><th>Agreed (BDT)</th></tr></thead>
            <tbody>
              {catalog.map((c) => {
                const on = selCodes.has(c.code);
                return (
                  <tr key={c.code}>
                    <td><input type="checkbox" checked={on} onChange={() => toggleLine(c.code, c.name)} /></td>
                    <td>{c.code}</td><td>{c.name}</td><td>{c.unit}</td>
                    <td style={{ color: 'var(--muted)' }}>{c.price_label || (c.price_type === 'from' ? `From ${bdt(c.standard_price)}` : bdt(c.standard_price))}</td>
                    <td>{on && c.price_type !== 'included' && c.price_type !== 'percent' ? <input style={{ ...sel, padding: '5px 8px', width: 120 }} type="number" value={(d.pricing_input.selected.find((s) => s.code === c.code) || {}).agreed_price} placeholder={String(c.standard_price)} onChange={(e) => setAgreed(c.code, e.target.value)} /> : (on ? <span style={{ color: 'var(--muted)' }}>{c.price_label || 'As agreed'}</span> : '')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {step === 2 && (
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>
            <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Linked property (optional)</label><Combo endpoint="/properties?category=residential" labelFn={(p) => `${p.property_code} · ${p.title || ''}`} value={d.property_id} onChange={onProperty} placeholder="Search a property…" /></div>
            <div><label style={lbl}>Property type</label><input style={sel} value={d.property_type} onChange={(e) => set('property_type', e.target.value)} /></div>
            <div><label style={lbl}>Engagement type</label><select style={sel} value={d.schedule_b.engagement_type} onChange={(e) => set('schedule_b.engagement_type', e.target.value)}><option>Non-exclusive</option><option>Exclusive</option></select></div>
            <div><label style={lbl}>Budget / target value</label><input style={sel} value={d.schedule_b.target_value} onChange={(e) => set('schedule_b.target_value', e.target.value)} /></div>
            <div><label style={lbl}>Expected timeframe</label><input style={sel} value={d.schedule_b.timeframe} onChange={(e) => set('schedule_b.timeframe', e.target.value)} /></div>
            <div><label style={lbl}>Commencement date</label><input type="date" style={sel} value={d.schedule_b.commencement_date} onChange={(e) => set('schedule_b.commencement_date', e.target.value)} /></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Special requirements</label><textarea style={{ ...sel, minHeight: 70 }} value={d.schedule_b.special_requirements} onChange={(e) => set('schedule_b.special_requirements', e.target.value)} /></div>
          </div>
        )}

        {step === 3 && (
          <div>
            {preview ? <div style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 16, maxHeight: 460, overflow: 'auto', background: '#fff' }} dangerouslySetInnerHTML={{ __html: preview.html }} /> : <Spinner />}
          </div>
        )}
      </div></div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
        <button className="pm-btn" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</button>
        {step < STEPS.length - 1
          ? <button className="pm-btn primary" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Next</button>
          : <button className="pm-btn primary" disabled={busy} onClick={send}>{busy ? <Spinner /> : 'Send for signature'}</button>}
      </div>
    </div>
  );
}
