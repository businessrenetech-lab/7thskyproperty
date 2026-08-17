import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, ArrowLeft, ArrowRight, Send, Copy, Eye } from 'lucide-react';
import api from './../services/api';
import { Spinner } from '../ui/kit';
import { Combo } from '../ui/pickers';
import { useToast } from '../context/ToastContext';

const bdt = (v) => '৳' + Number(v || 0).toLocaleString('en-BD');
const sel = { border: '1px solid var(--line)', borderRadius: 10, padding: '9px 12px', background: 'var(--surface)', font: 'inherit', color: 'var(--ink)', width: '100%' };
const lbl = { fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 };
const STEPS = ['Parties', 'Services', 'Property', 'Pricing & fee', 'Checklist', 'Review & send'];

const EMPTY = {
  effective_date: new Date().toISOString().slice(0, 10),
  org: { name: 'Seventh Sky Property Care', address: '', phone: '', email: '', represented_by: '', position: '' },
  client_contact_id: '', property_id: '',
  client: { full_name: '', nid: '', current_address: '', phone: '', email: '', rep: '', rep_position: '' },
  property_type: '',
  services: [], checklist: [], witnesses: [{ name: '', nid: '' }, { name: '', nid: '' }],
  schedule_b: { property_address: '', max_guests: '', booking_platforms: '', management_package: '', commencement_date: '', reporting_frequency: 'Monthly', special_requirements: '', work_order_no: '', quotation_no: '' },
  pricing_input: { discount: 0, vat_percent: 0, selected: [] },
};

export default function StsAgreements() {
  const toast = useToast();
  const [mode, setMode] = useState('list');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/sts/agreements'); setList(Array.isArray(r.data) ? r.data : []); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (mode === 'build') return <Builder onDone={() => { setMode('list'); load(); }} onCancel={() => setMode('list')} />;
  const chip = (s) => ({ completed: 'good', active: 'good', sent: 'warn', viewed: 'info', partially_signed: 'warn', declined: 'bad', voided: 'grey', draft: 'grey' }[s] || 'grey');

  return (
    <div className="pm-scope">
      <div className="pm-head">
        <div><div className="pm-eyebrow">Agreements</div><h1>Short-Term Rental Agreements</h1><div className="pm-meta">Short-Term Rental Management Service Agreements — build, price and send to owners for e-signature. The agreed fee drives owner disbursements.</div></div>
        <div className="pm-head-actions"><button className="pm-btn primary" onClick={() => setMode('build')}><Plus size={15} /> New agreement</button></div>
      </div>
      {loading ? <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div> : (
        <div className="pm-card"><div className="pm-card-body" style={{ padding: 0 }}>
          <table className="pm-tbl">
            <thead><tr><th>Reference</th><th>Owner</th><th>Management fee</th><th>Setup value</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td><strong style={{ color: 'var(--navy)' }}>{a.envelope_code}</strong></td>
                  <td>{a.signer?.name || '—'}<div className="ph" style={{ fontSize: 11.5, color: 'var(--muted)' }}>{a.signer?.email || ''}</div></td>
                  <td style={{ fontSize: 12.5 }}>{a.fee?.revenue_share_percent ? `${a.fee.revenue_share_percent}% of revenue` : ''}{a.fee?.revenue_share_percent && a.fee?.fixed_monthly_fee ? ' + ' : ''}{a.fee?.fixed_monthly_fee ? `${bdt(a.fee.fixed_monthly_fee)}/mo` : ''}{!a.fee?.revenue_share_percent && !a.fee?.fixed_monthly_fee ? '—' : ''}</td>
                  <td>{a.total_contract_value != null ? bdt(a.total_contract_value) : '—'}</td>
                  <td><span className={`pm-chip ${chip(a.status)}`}><span className="d" />{a.status}</span></td>
                  <td style={{ textAlign: 'right' }}>{a.signer?.status !== 'signed' && <button className="pm-btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => copyLink(a, toast)}><Copy size={13} /> Copy link</button>}</td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>No agreements yet. Click “New agreement”.</td></tr>}
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

function Builder({ onDone, onCancel }) {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [d, setD] = useState(EMPTY);
  const [meta, setMeta] = useState({ service_groups: {}, checklist_groups: {} });
  const [catalog, setCatalog] = useState([]);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null);

  useEffect(() => {
    api.get('/sts/meta').then((r) => setMeta(r.data || {})).catch(() => {});
    api.get('/sts/catalog').then((r) => setCatalog(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const set = (path, value) => setD((prev) => {
    const next = structuredClone(prev); let o = next; const ks = path.split('.');
    for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = value; return next;
  });
  const toggleArr = (path, item) => setD((prev) => {
    const next = structuredClone(prev); let o = next; const ks = path.split('.');
    for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; const arr = o[ks[ks.length - 1]];
    const i = arr.indexOf(item); if (i >= 0) arr.splice(i, 1); else arr.push(item); return next;
  });

  const selCodes = useMemo(() => new Set(d.pricing_input.selected.map((s) => s.code)), [d.pricing_input.selected]);
  const toggleLine = (code) => setD((prev) => {
    const next = structuredClone(prev); const arr = next.pricing_input.selected;
    const i = arr.findIndex((s) => s.code === code); if (i >= 0) arr.splice(i, 1); else arr.push({ code, agreed_price: '' }); return next;
  });
  const setAgreed = (code, v) => setD((prev) => {
    const next = structuredClone(prev); const row = next.pricing_input.selected.find((s) => s.code === code); if (row) row.agreed_price = v; return next;
  });

  const refreshPreview = useCallback(async () => {
    const r = await api.post('/sts/preview', d).catch(() => null);
    if (r) setPreview(r.data);
  }, [d]);
  useEffect(() => { if (step === 3 || step === 5) refreshPreview(); /* eslint-disable-next-line */ }, [step]);

  const send = async () => {
    if (!d.client.full_name) return toast.error('Enter the owner name (Step 1)');
    if (!d.client.email) return toast.error('Enter the owner email (Step 1)');
    setBusy(true);
    try { const r = await api.post('/sts/agreements', d); setSent(r.data); toast.success('Agreement sent to owner for signature'); }
    catch (err) { toast.error(err.response?.data?.error || 'Could not send'); } finally { setBusy(false); }
  };

  const onClient = (id, row) => { set('client_contact_id', id); if (row) setD((p) => ({ ...p, client: { ...p.client, full_name: row.full_name || '', phone: row.primary_phone || '', email: row.email || '', nid: row.national_id || row.passport_no || '', current_address: row.address_line1 || p.client.current_address } })); };
  const onProperty = (id, row) => { set('property_id', id); if (row) setD((p) => ({ ...p, property_type: row.property_type || p.property_type, schedule_b: { ...p.schedule_b, property_address: row.address || row.title || p.schedule_b.property_address } })); };

  if (sent) {
    const url = `${window.location.origin}${sent.signing_path}`;
    return (
      <div className="pm-scope"><div className="pm-head"><div><div className="pm-eyebrow">Agreements</div><h1>Agreement sent</h1></div></div>
        <div className="pm-card" style={{ maxWidth: 640 }}><div className="pm-card-body" style={{ padding: 24 }}>
          <div className="pm-chip good" style={{ marginBottom: 12 }}><span className="d" />{sent.envelope_code} · sent for signature</div>
          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>The owner can review the full agreement (with Table of Contents and Schedule C pricing) and sign at:</p>
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
        <div><div className="pm-eyebrow">Agreements</div><h1>New Short-Term Rental Agreement</h1><div className="pm-meta">Step {step + 1} of {STEPS.length} · {STEPS[step]}</div></div>
        <div className="pm-head-actions"><button className="pm-btn" onClick={onCancel}>Cancel</button></div>
      </div>

      <div className="pm-segment" style={{ marginBottom: 18, flexWrap: 'wrap' }}>
        {STEPS.map((s, i) => <button key={s} className={i === step ? 'on' : ''} onClick={() => setStep(i)}>{i + 1}. {s}</button>)}
      </div>

      <div className="pm-card"><div className="pm-card-body" style={{ padding: 20 }}>
        {step === 0 && (
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div><label style={lbl}>Property Owner — pick contact</label><Combo endpoint="/contacts" labelFn={(c) => `${c.full_name || 'Contact'} · ${c.primary_phone || c.email || ''}`} value={d.client_contact_id ? Number(d.client_contact_id) : ''} onChange={onClient} placeholder="Search a contact…" /></div>
              <div><label style={lbl}>Property — pick</label><Combo endpoint="/properties" labelFn={(p) => p.title || `Property #${p.id}`} value={d.property_id ? Number(d.property_id) : ''} onChange={onProperty} placeholder="Search a property…" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div><label style={lbl}>Full name *</label><input style={sel} value={d.client.full_name} onChange={(e) => set('client.full_name', e.target.value)} /></div>
              <div><label style={lbl}>NID / Passport</label><input style={sel} value={d.client.nid} onChange={(e) => set('client.nid', e.target.value)} /></div>
              <div><label style={lbl}>Email *</label><input style={sel} value={d.client.email} onChange={(e) => set('client.email', e.target.value)} /></div>
              <div><label style={lbl}>Phone</label><input style={sel} value={d.client.phone} onChange={(e) => set('client.phone', e.target.value)} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Current address</label><input style={sel} value={d.client.current_address} onChange={(e) => set('client.current_address', e.target.value)} /></div>
              <div><label style={lbl}>Property type</label><input style={sel} value={d.property_type} onChange={(e) => set('property_type', e.target.value)} /></div>
              <div><label style={lbl}>Effective date</label><input type="date" style={sel} value={d.effective_date} onChange={(e) => set('effective_date', e.target.value)} /></div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 0 }}>Schedule A — select the STR management services that form part of this agreement.</p>
            {Object.entries(meta.service_groups).map(([g, items]) => (
              <div key={g} style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--ink)', margin: '8px 0 6px' }}>{g}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px' }}>
                  {items.map((it) => <label key={it} style={{ fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><input type="checkbox" checked={d.services.includes(it)} onChange={() => toggleArr('services', it)} /> {it}</label>)}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Property address</label><input style={sel} value={d.schedule_b.property_address} onChange={(e) => set('schedule_b.property_address', e.target.value)} /></div>
            <div><label style={lbl}>Maximum guest capacity</label><input style={sel} value={d.schedule_b.max_guests} onChange={(e) => set('schedule_b.max_guests', e.target.value)} /></div>
            <div><label style={lbl}>Booking platform(s)</label><input style={sel} value={d.schedule_b.booking_platforms} onChange={(e) => set('schedule_b.booking_platforms', e.target.value)} placeholder="Airbnb, Booking.com…" /></div>
            <div><label style={lbl}>Management package</label><input style={sel} value={d.schedule_b.management_package} onChange={(e) => set('schedule_b.management_package', e.target.value)} placeholder="Full management" /></div>
            <div><label style={lbl}>Commencement date</label><input type="date" style={sel} value={d.schedule_b.commencement_date} onChange={(e) => set('schedule_b.commencement_date', e.target.value)} /></div>
            <div><label style={lbl}>Reporting frequency</label><select style={sel} value={d.schedule_b.reporting_frequency} onChange={(e) => set('schedule_b.reporting_frequency', e.target.value)}>{['Weekly', 'Monthly', 'Quarterly'].map((f) => <option key={f}>{f}</option>)}</select></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Special requirements</label><textarea rows={2} style={{ ...sel, resize: 'vertical' }} value={d.schedule_b.special_requirements} onChange={(e) => set('schedule_b.special_requirements', e.target.value)} /></div>
          </div>
        )}

        {step === 3 && (
          <div>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 0 }}>Schedule C — tick services to price. For <b>Management Fee</b> enter the fixed monthly amount; for <b>Revenue Share</b> enter the % of gross booking revenue. This fee drives owner disbursements.</p>
            <table className="pm-tbl">
              <thead><tr><th></th><th>Code</th><th>Service</th><th>Unit</th><th style={{ textAlign: 'right' }}>Standard</th><th style={{ textAlign: 'right' }}>Agreed</th></tr></thead>
              <tbody>
                {catalog.map((l) => {
                  const on = selCodes.has(l.code);
                  const row = d.pricing_input.selected.find((s) => s.code === l.code);
                  const stdLabel = l.price_label || (l.price_type === 'from' ? `From ${bdt(l.standard_price)}` : bdt(l.standard_price));
                  const isPercent = l.price_type === 'revenue_share';
                  const isIncluded = l.price_type === 'included';
                  return (
                    <tr key={l.code} style={{ opacity: on ? 1 : 0.6 }}>
                      <td><input type="checkbox" checked={on} onChange={() => toggleLine(l.code)} /></td>
                      <td style={{ fontSize: 12 }}>{l.code}</td><td style={{ fontSize: 12.5 }}>{l.name}</td><td style={{ fontSize: 12 }}>{l.unit}</td>
                      <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--muted)' }}>{stdLabel}</td>
                      <td style={{ textAlign: 'right' }}>{on && !isIncluded
                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><input type="number" style={{ ...sel, width: 100, padding: '5px 8px', textAlign: 'right' }} placeholder={isPercent ? '%' : String(l.standard_price)} value={row?.agreed_price ?? ''} onChange={(e) => setAgreed(l.code, e.target.value)} />{isPercent ? '%' : ''}</span>
                        : <span style={{ color: 'var(--muted-2)' }}>{isIncluded ? 'Included' : '—'}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginTop: 14 }}>
              <div><label style={lbl}>Discount (৳)</label><input type="number" style={sel} value={d.pricing_input.discount} onChange={(e) => set('pricing_input.discount', Number(e.target.value))} /></div>
              <div><label style={lbl}>VAT (%)</label><input type="number" style={sel} value={d.pricing_input.vat_percent} onChange={(e) => set('pricing_input.vat_percent', Number(e.target.value))} /></div>
              <div style={{ alignSelf: 'end' }}><button className="pm-btn" onClick={refreshPreview}>Recalculate</button></div>
            </div>
            {preview?.pricing && (
              <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="pm-card"><div className="pm-card-body" style={{ padding: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 8 }}>Cost summary</div>
                  {[['Initial setup fees', bdt(preview.pricing.summary.initial_setup_fees)], ['Monthly management fee', bdt(preview.pricing.summary.monthly_management_fees)], ['Revenue share', preview.pricing.summary.revenue_share_percent ? `${preview.pricing.summary.revenue_share_percent}%` : '—'], ['Discount', bdt(-preview.pricing.summary.discount)], ['VAT', bdt(preview.pricing.summary.vat)]].map(([k, v]) => <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '3px 0' }}><span style={{ color: 'var(--muted)' }}>{k}</span><span>{v}</span></div>)}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, borderTop: '1px solid var(--line)', marginTop: 6, paddingTop: 6 }}><span>Total contract value</span><span>{bdt(preview.pricing.summary.total_contract_value)}</span></div>
                </div></div>
                <div className="pm-card"><div className="pm-card-body" style={{ padding: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 8 }}>Seventh Sky fee (drives disbursement)</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.8 }}>
                    Model: <b style={{ textTransform: 'capitalize' }}>{(preview.pricing.fee?.model || 'none').replace(/_/g, ' ')}</b><br />
                    {preview.pricing.fee?.revenue_share_percent ? <>Revenue share: <b>{preview.pricing.fee.revenue_share_percent}%</b> of gross booking revenue<br /></> : null}
                    {preview.pricing.fee?.fixed_monthly_fee ? <>Fixed fee: <b>{bdt(preview.pricing.fee.fixed_monthly_fee)}</b> / month<br /></> : null}
                    <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>Owner payout = booking revenue − this fee − expenses.</span>
                  </div>
                </div></div>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 0 }}>Schedule D — STR property setup & management checklist.</p>
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
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 0 }}>Review the full agreement exactly as the owner will see it, then send.</p>
            {preview?.html ? <div style={{ border: '1px solid var(--line)', borderRadius: 10, maxHeight: 460, overflow: 'auto', padding: 16, background: '#fff' }} dangerouslySetInnerHTML={{ __html: preview.html }} /> : <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>}
            <button className="pm-btn primary" disabled={busy} style={{ marginTop: 14 }} onClick={send}><Send size={15} /> {busy ? 'Sending…' : 'Send to owner for signature'}</button>
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
