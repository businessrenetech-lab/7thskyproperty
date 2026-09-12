// admin-portal/src/screens/sales/SalesAgreementScreen.jsx
//
// Parametric builder for the residential sales service agreements (RPPS/RPSS).
// kind = 'purchase' | 'sale'. Drives /api/sales-agreements/:kind (meta / catalog
// / preview / agreements) and the existing eSign flow. The Schedule A scope and
// Schedule D checklist taxonomies come from the server (meta) so the ticked
// boxes on the signed document match exactly.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Copy, Eye, Send, Pencil, FileText } from 'lucide-react';
import api from '../../services/api';
import { Spinner } from '../../ui/kit';
import { Combo } from '../../ui/pickers';
import { useToast } from '../../context/ToastContext';

const bdt = (v) => '৳' + Number(v || 0).toLocaleString('en-BD');
const sel = { border: '1px solid var(--line)', borderRadius: 10, padding: '9px 12px', background: 'var(--surface)', font: 'inherit', color: 'var(--ink)', width: '100%' };
const lbl = { fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 };
const STEPS = ['Parties', 'Scope (Schedule A)', 'Services & pricing', 'Engagement & witnesses', 'Review & send'];

const KIND_META = {
  purchase: { party: 'Buyer', title: 'Purchase Agreements', newTitle: 'New Property Purchase Service Agreement', base: '/sales-agreements/purchase' },
  sale: { party: 'Seller', title: 'Sale Agreements', newTitle: 'New Property Sale Service Agreement', base: '/sales-agreements/sale' },
};

const emptyState = () => ({
  effective_date: new Date().toISOString().slice(0, 10),
  org: { name: 'Seventh Sky Residential Property Services', address: '', phone: '', email: '', represented_by: '', position: '' },
  client_contact_id: '', property_id: '',
  client: { full_name: '', nid: '', property_address: '', phone: '', email: '', rep: '', rep_position: '' },
  property_type: '',
  services: [],       // Schedule A — selected service labels (checkboxes)
  checklist: [],      // Schedule D — ticked checklist items
  witnesses: [{ name: '', nid: '', email: '' }, { name: '', nid: '', email: '' }],
  schedule_b: { work_order_no: '', quotation_no: '', engagement_type: 'Non-exclusive', target_value: '', timeframe: '', commencement_date: '', special_requirements: '' },
  pricing_input: { discount: 0, vat_percent: 0, third_party_costs: 0, admin_charges: 0, selected: [], commission: { mode: 'percent', percent: '', amount: '', base_price: '' } },
});

export default function SalesAgreementScreen({ kind }) {
  const km = KIND_META[kind];
  const toast = useToast();
  const location = useLocation();
  const prefill = useMemo(() => {
    const p = location.state?.prefill || {};
    const sp = new URLSearchParams(location.search);
    const contactId = sp.get('contact_id') || sp.get('contact');
    const clientId = sp.get('client_id') || sp.get('client');
    const name = sp.get('name') || sp.get('full_name');
    const email = sp.get('email');
    const phone = sp.get('phone');
    return {
      ...p,
      ...(contactId ? { client_contact_id: Number(contactId) } : {}),
      ...(clientId ? { client_id: Number(clientId) } : {}),
      ...(name ? { full_name: name } : {}),
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
    };
  }, [location.state, location.search]);
  const hasPrefill = Boolean(location.state?.prefill || location.search);
  const [mode, setMode] = useState(hasPrefill ? 'build' : 'list');
  const [editEnvelope, setEditEnvelope] = useState(null); // { id, prefill } for editing a draft
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get(`${km.base}/agreements`); setList(Array.isArray(r.data) ? r.data : []); }
    finally { setLoading(false); }
  }, [km.base]);
  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditEnvelope(null); setMode('build'); };

  // Edit a DRAFT in place: reconstruct the builder state from the envelope terms + signers.
  const editDraft = async (a) => {
    try {
      const r = await api.get(`/signing/envelopes/${a.id}`);
      const env = r.data?.data || {};
      const t = env.terms || {};
      const client = (env.signers || []).find((s) => s.role === 'client') || {};
      const witnesses = (env.signers || []).filter((s) => s.role === 'witness').map((s) => ({ name: s.name || '', nid: '', email: s.email || '' }));
      const seventhSky = (env.signers || []).find((s) => s.role === 'staff_countersign') || {};
      const pf = {
        client: { full_name: client.name || '', email: client.email || '', phone: client.phone || '' },
        client_contact_id: client.contact_id || '',
        services: t.selected_services || [],
        checklist: t.checklist || [],
        witnesses: witnesses.length ? witnesses : undefined,
        org: { represented_by: seventhSky.name || '', email: seventhSky.email || '' },
        schedule_b: t.schedule_b || {},
        pricing_input: {
          selected: (t.agreed_lines || []).map((l) => ({ code: l.code, agreed_price: l.agreed_price })),
          commission: { mode: t.commission_mode || 'percent', percent: t.commission_percent || '', amount: t.commission_mode === 'fixed' ? t.commission : '', base_price: t.pricing_summary?.commission_base || '' },
        },
      };
      setEditEnvelope({ id: a.id, prefill: pf });
      setMode('build');
    } catch { toast.error('Could not load the draft'); }
  };

  const sendDraft = async (a) => {
    try { await api.post(`${km.base}/agreements/${a.id}/send`); toast.success('Agreement sent for signature'); load(); }
    catch (e) { toast.error(e.response?.data?.error || 'Could not send'); }
  };
  const reissue = async (a) => {
    try {
      const r = await api.post(`/sales-agreements/contracts/${a.id}/variation`);
      toast.success('Original voided — edit and reissue');
      setEditEnvelope(null);
      // reopen builder prefilled from the variation payload
      window.history.replaceState({ prefill: r.data.prefill }, '');
      setMode('build');
      setBuilderPrefill(r.data.prefill);
    } catch (e) { toast.error(e.response?.data?.error || 'Could not start reissue'); }
  };
  const [builderPrefill, setBuilderPrefill] = useState(null);

  if (mode === 'build') {
    return <Builder kind={kind} prefill={builderPrefill || editEnvelope?.prefill || prefill} editId={editEnvelope?.id || null}
      onDone={() => { setMode('list'); setEditEnvelope(null); setBuilderPrefill(null); load(); }}
      onCancel={() => { setMode('list'); setEditEnvelope(null); setBuilderPrefill(null); }} />;
  }

  const chip = (s) => ({ completed: 'good', active: 'good', sent: 'warn', viewed: 'info', partially_signed: 'warn', declined: 'bad', voided: 'grey', draft: 'grey' }[s] || 'grey');

  return (
    <div className="pm-scope">
      <div className="pm-head">
        <div><div className="pm-eyebrow">Contracts</div><h1>{km.title}</h1><div className="pm-meta">Residential Property {km.party === 'Buyer' ? 'Purchase' : 'Sale'} Service Agreements — build, price and send to the {km.party.toLowerCase()} for e-signature.</div></div>
        <div className="pm-head-actions"><button className="pm-btn primary" onClick={openNew}><Plus size={15} /> New agreement</button></div>
      </div>
      {loading ? <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div> : (
        <div className="pm-card"><div className="pm-card-body" style={{ padding: 0 }}>
          <table className="pm-tbl">
            <thead><tr><th>Reference</th><th>{km.party}</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {list.map((a) => {
                const s = (a.signers || []).find((x) => x.role === 'client') || (a.signers || [])[0];
                const done = a.status === 'completed';
                return (
                  <tr key={a.id}>
                    <td><strong style={{ color: 'var(--navy)' }}>{a.envelope_code}</strong></td>
                    <td>{s?.name || '—'}<div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{s?.email || ''}</div></td>
                    <td><span className={`pm-chip ${chip(a.status)}`}><span className="d" />{a.status}</span></td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {a.status === 'draft' && <>
                        <button className="pm-btn" style={aBtn} onClick={() => editDraft(a)}><Pencil size={13} /> Edit</button>
                        <button className="pm-btn primary" style={aBtn} onClick={() => sendDraft(a)}><Send size={13} /> Send</button>
                      </>}
                      {['sent', 'viewed', 'partially_signed'].includes(a.status) && <>
                        <button className="pm-btn" style={aBtn} onClick={() => copyLink(a, toast)}><Copy size={13} /> Copy link</button>
                        <button className="pm-btn" style={aBtn} onClick={() => reissue(a)}><Pencil size={13} /> Edit &amp; reissue</button>
                      </>}
                      {done && <button className="pm-btn" style={aBtn} onClick={() => viewSigned(a, toast)}><FileText size={13} /> Signed copy</button>}
                    </td>
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

const aBtn = { padding: '4px 10px', fontSize: 12, marginLeft: 6 };

async function copyLink(a, toast) {
  try {
    const r = await api.get(`/signing/envelopes/${a.id}`);
    const s = (r.data?.data?.signers || []).find((x) => ['sent', 'viewed', 'pending'].includes(x.status)) || (r.data?.data?.signers || [])[0];
    if (!s?.access_token) return toast.error('No active signing link');
    const url = `${window.location.origin}/admin/sign/${s.access_token}`;
    try { await navigator.clipboard.writeText(url); toast.success('Signing link copied'); } catch { window.prompt('Signing link:', url); }
  } catch { toast.error('Could not fetch link'); }
}

async function viewSigned(a, toast) {
  try {
    const r = await api.get(`/signing/envelopes/${a.id}`);
    const s = (r.data?.data?.signers || []).find((x) => x.access_token) || {};
    if (!s.access_token) return toast.error('No signed copy link available');
    window.open(`${window.location.origin}/api/sign/${s.access_token}/signed-document`, '_blank');
  } catch { toast.error('Could not open the signed copy'); }
}

function Builder({ kind, prefill, editId, onDone, onCancel }) {
  const km = KIND_META[kind];
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [meta, setMeta] = useState({ schedule_a: [], schedule_d: [], commission_label: '' });
  const [d, setD] = useState(() => {
    const base = emptyState();
    if (!prefill || Object.keys(prefill).length === 0) return base;
    return {
      ...base,
      client_contact_id: prefill.client_contact_id || prefill.contact_id || base.client_contact_id,
      property_id: prefill.property_id || base.property_id,
      property_type: prefill.property_type || base.property_type,
      org: { ...base.org, ...(prefill.org || {}) },
      client: {
        ...base.client,
        ...(prefill.client || {}),
        full_name: prefill.client?.full_name || prefill.full_name || prefill.name || base.client.full_name,
        email: prefill.client?.email || prefill.email || base.client.email,
        phone: prefill.client?.phone || prefill.phone || prefill.primary_phone || base.client.phone,
        nid: prefill.client?.nid || prefill.nid || prefill.national_id || base.client.nid,
        property_address: prefill.client?.property_address || prefill.property_address || prefill.address || base.client.property_address,
      },
      services: prefill.services || base.services,
      checklist: prefill.checklist || base.checklist,
      witnesses: prefill.witnesses || base.witnesses,
      schedule_b: { ...base.schedule_b, ...(prefill.schedule_b || {}), special_requirements: [(prefill.schedule_b || {}).special_requirements, prefill.supersedes ? `Variation of ${prefill.supersedes}` : ''].filter(Boolean).join(' — ') },
      pricing_input: { ...base.pricing_input, ...(prefill.pricing_input || {}), selected: (prefill.pricing_input || {}).selected || [], commission: { ...base.pricing_input.commission, ...((prefill.pricing_input || {}).commission || {}) } },
    };
  });

  useEffect(() => {
    if (d.client_contact_id && (!d.client.full_name || !d.client.email)) {
      api.get(`/contacts/${d.client_contact_id}`).then(({ data }) => {
        const c = data?.data || data;
        if (c) setD((p) => ({ ...p, client: { ...p.client, full_name: p.client.full_name || c.full_name || '', email: p.client.email || c.email || '', phone: p.client.phone || c.primary_phone || '', nid: p.client.nid || c.national_id || c.passport_no || '', property_address: p.client.property_address || c.address_line1 || c.area || '' } }));
      }).catch(() => {});
    }
  }, [d.client_contact_id]);

  const [catalog, setCatalog] = useState([]);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null);

  useEffect(() => { api.get(`${km.base}/catalog`).then((r) => setCatalog(Array.isArray(r.data) ? r.data : [])).catch(() => {}); }, [km.base]);
  useEffect(() => { api.get(`${km.base}/meta`).then((r) => setMeta(r.data || {})).catch(() => {}); }, [km.base]);

  const set = (path, value) => setD((prev) => {
    const next = structuredClone(prev); let o = next; const ks = path.split('.');
    for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = value; return next;
  });
  const selCodes = useMemo(() => new Set(d.pricing_input.selected.map((s) => s.code)), [d.pricing_input.selected]);
  const toggleLine = (code) => setD((prev) => {
    const next = structuredClone(prev); const arr = next.pricing_input.selected;
    const i = arr.findIndex((s) => s.code === code);
    if (i >= 0) arr.splice(i, 1); else arr.push({ code, agreed_price: '' });
    return next;
  });
  const setAgreed = (code, v) => setD((prev) => { const next = structuredClone(prev); const row = next.pricing_input.selected.find((s) => s.code === code); if (row) row.agreed_price = v; return next; });

  const svcSet = useMemo(() => new Set(d.services), [d.services]);
  const toggleService = (label) => setD((prev) => {
    const has = prev.services.includes(label);
    return { ...prev, services: has ? prev.services.filter((s) => s !== label) : [...prev.services, label] };
  });
  const chkSet = useMemo(() => new Set(d.checklist), [d.checklist]);
  const toggleCheck = (label) => setD((prev) => {
    const has = prev.checklist.includes(label);
    return { ...prev, checklist: has ? prev.checklist.filter((s) => s !== label) : [...prev.checklist, label] };
  });
  const setWitness = (i, key, v) => setD((prev) => { const next = structuredClone(prev); next.witnesses[i][key] = v; return next; });

  const refreshPreview = useCallback(async () => {
    const r = await api.post(`${km.base}/preview`, d).catch(() => null);
    if (r) setPreview(r.data);
  }, [d, km.base]);
  useEffect(() => { if (step === 2 || step === 4) refreshPreview(); /* eslint-disable-next-line */ }, [step]);

  const submit = async (asDraft) => {
    if (!d.client.full_name) { toast.error(`Enter the ${km.party.toLowerCase()} name (Step 1)`); setStep(0); return; }
    if (!asDraft && !d.client.email) { toast.error(`Enter the ${km.party.toLowerCase()} email (Step 1)`); setStep(0); return; }
    setBusy(true);
    try {
      if (editId) {
        await api.put(`${km.base}/agreements/${editId}`, d);
        if (!asDraft) await api.post(`${km.base}/agreements/${editId}/send`);
        toast.success(asDraft ? 'Draft updated' : 'Agreement sent for signature');
        onDone();
      } else {
        const r = await api.post(`${km.base}/agreements`, { ...d, save_as_draft: asDraft });
        if (asDraft) { toast.success('Draft saved'); onDone(); }
        else { setSent(r.data); toast.success(`Agreement sent to the ${km.party.toLowerCase()} for signature`); }
      }
    } catch (err) { toast.error(err.response?.data?.error || 'Could not save'); } finally { setBusy(false); }
  };

  const onClient = (id, row) => { set('client_contact_id', id); if (row) setD((p) => ({ ...p, client: { ...p.client, full_name: row.full_name || '', phone: row.primary_phone || '', email: row.email || '', nid: row.national_id || row.passport_no || '' } })); };
  const onProperty = (id, row) => { set('property_id', id); if (row) setD((p) => ({ ...p, property_type: row.property_type || p.property_type, client: { ...p.client, property_address: row.address || row.title || '' } })); };

  if (sent) {
    const url = `${window.location.origin}${sent.signing_path}`;
    return (
      <div className="pm-scope"><div className="pm-head"><div><div className="pm-eyebrow">Contracts</div><h1>Agreement sent</h1></div></div>
        <div className="pm-card" style={{ maxWidth: 640 }}><div className="pm-card-body" style={{ padding: 24 }}>
          <div className="pm-chip good" style={{ marginBottom: 12 }}><span className="d" />{sent.envelope_code} · sent for signature</div>
          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>The {km.party.toLowerCase()} signs first; Seventh Sky then countersigns and any witnesses attest. The {km.party.toLowerCase()}'s link:</p>
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
        <div><div className="pm-eyebrow">Contracts</div><h1>{editId ? 'Edit draft agreement' : km.newTitle}</h1><div className="pm-meta">Step {step + 1} of {STEPS.length} · {STEPS[step]}</div></div>
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
            <div><label style={lbl}>Authorised representative (if applicable)</label><input style={sel} value={d.client.rep} onChange={(e) => set('client.rep', e.target.value)} /></div>
            <div><label style={lbl}>Relationship / position</label><input style={sel} value={d.client.rep_position} onChange={(e) => set('client.rep_position', e.target.value)} /></div>
            <div><label style={lbl}>Effective date</label><input type="date" style={sel} value={d.effective_date} onChange={(e) => set('effective_date', e.target.value)} /></div>
            <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--line)', paddingTop: 12, fontWeight: 700, color: 'var(--navy)', fontSize: 12.5 }}>Seventh Sky (countersigns after the {km.party.toLowerCase()})</div>
            <div><label style={lbl}>Represented by</label><input style={sel} value={d.org.represented_by} onChange={(e) => set('org.represented_by', e.target.value)} /></div>
            <div><label style={lbl}>Position</label><input style={sel} value={d.org.position} onChange={(e) => set('org.position', e.target.value)} /></div>
            <div><label style={lbl}>Seventh Sky signing email *</label><input style={sel} value={d.org.email} onChange={(e) => set('org.email', e.target.value)} placeholder="countersigner@seventhsky…" /></div>
          </div>
        )}

        {step === 1 && (
          <div>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 12px' }}>Tick every service that forms part of this engagement — the ticked items appear as ☑ in Schedule A of the signed agreement.</p>
            {(meta.schedule_a || []).map(([group, items]) => (
              <div key={group} style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 12.5, margin: '0 0 6px' }}>{group}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 18px' }}>
                  {items.map((it) => (
                    <label key={it} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, cursor: 'pointer' }}>
                      <input type="checkbox" checked={svcSet.has(it)} onChange={() => toggleService(it)} /> {it}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 2 && (
          <div>
            <table className="pm-tbl">
              <thead><tr><th></th><th>Code</th><th>Service</th><th>Unit</th><th>Standard</th><th>Agreed (BDT)</th></tr></thead>
              <tbody>
                {catalog.map((c) => {
                  const on = selCodes.has(c.code);
                  return (
                    <tr key={c.code}>
                      <td><input type="checkbox" checked={on} onChange={() => toggleLine(c.code)} /></td>
                      <td>{c.code}</td><td>{c.name}</td><td>{c.unit}</td>
                      <td style={{ color: 'var(--muted)' }}>{c.price_label || (c.price_type === 'from' ? `From ${bdt(c.standard_price)}` : bdt(c.standard_price))}</td>
                      <td>{on && c.price_type !== 'included' && c.price_type !== 'percent' ? <input style={{ ...sel, padding: '5px 8px', width: 120 }} type="number" value={(d.pricing_input.selected.find((s) => s.code === c.code) || {}).agreed_price} placeholder={String(c.standard_price)} onChange={(e) => setAgreed(c.code, e.target.value)} /> : (on ? <span style={{ color: 'var(--muted)' }}>{c.price_label || 'As agreed'}</span> : '')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ borderTop: '1px solid var(--line)', marginTop: 14, paddingTop: 14 }}>
              <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 12.5, marginBottom: 8 }}>{meta.commission_label || 'Commission / Success Fee'}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: 10, alignItems: 'end' }}>
                <div><label style={lbl}>Type</label><select style={sel} value={d.pricing_input.commission.mode} onChange={(e) => set('pricing_input.commission.mode', e.target.value)}><option value="percent">Percent of price</option><option value="fixed">Fixed amount</option></select></div>
                {d.pricing_input.commission.mode === 'percent' ? <>
                  <div><label style={lbl}>Percent (%)</label><input type="number" style={sel} value={d.pricing_input.commission.percent} onChange={(e) => set('pricing_input.commission.percent', e.target.value)} /></div>
                  <div><label style={lbl}>{kind === 'sale' ? 'Sale / listing price' : 'Purchase price'} (BDT)</label><input type="number" style={sel} value={d.pricing_input.commission.base_price} onChange={(e) => set('pricing_input.commission.base_price', e.target.value)} /></div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>= {bdt(Math.round((Number(d.pricing_input.commission.base_price || 0) * Number(d.pricing_input.commission.percent || 0)) / 100))}</div>
                </> : <>
                  <div><label style={lbl}>Amount (BDT)</label><input type="number" style={sel} value={d.pricing_input.commission.amount} onChange={(e) => set('pricing_input.commission.amount', e.target.value)} /></div>
                  <div /><div />
                </>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginTop: 12 }}>
                <div><label style={lbl}>Third-party costs</label><input type="number" style={sel} value={d.pricing_input.third_party_costs} onChange={(e) => set('pricing_input.third_party_costs', e.target.value)} /></div>
                <div><label style={lbl}>Administrative charges</label><input type="number" style={sel} value={d.pricing_input.admin_charges} onChange={(e) => set('pricing_input.admin_charges', e.target.value)} /></div>
                <div><label style={lbl}>Discount</label><input type="number" style={sel} value={d.pricing_input.discount} onChange={(e) => set('pricing_input.discount', e.target.value)} /></div>
                <div><label style={lbl}>VAT (%)</label><input type="number" style={sel} value={d.pricing_input.vat_percent} onChange={(e) => set('pricing_input.vat_percent', e.target.value)} /></div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>
            <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Linked property (optional)</label><Combo endpoint="/properties?category=residential" labelFn={(p) => `${p.property_code} · ${p.title || ''}`} value={d.property_id} onChange={onProperty} placeholder="Search a property…" /></div>
            <div><label style={lbl}>Property type</label><input style={sel} value={d.property_type} onChange={(e) => set('property_type', e.target.value)} /></div>
            <div><label style={lbl}>Engagement type</label><select style={sel} value={d.schedule_b.engagement_type} onChange={(e) => set('schedule_b.engagement_type', e.target.value)}><option>Non-exclusive</option><option>Exclusive</option></select></div>
            <div><label style={lbl}>{kind === 'sale' ? 'Listing / target value' : 'Budget / target value'}</label><input style={sel} value={d.schedule_b.target_value} onChange={(e) => set('schedule_b.target_value', e.target.value)} /></div>
            <div><label style={lbl}>Expected timeframe</label><input style={sel} value={d.schedule_b.timeframe} onChange={(e) => set('schedule_b.timeframe', e.target.value)} /></div>
            <div><label style={lbl}>Commencement date</label><input type="date" style={sel} value={d.schedule_b.commencement_date} onChange={(e) => set('schedule_b.commencement_date', e.target.value)} /></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Special requirements</label><textarea style={{ ...sel, minHeight: 60 }} value={d.schedule_b.special_requirements} onChange={(e) => set('schedule_b.special_requirements', e.target.value)} /></div>

            <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--line)', paddingTop: 12, fontWeight: 700, color: 'var(--navy)', fontSize: 12.5 }}>Witnesses (attest after both parties sign)</div>
            {d.witnesses.map((w, i) => (
              <div key={i} style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div><label style={lbl}>Witness {i + 1} name</label><input style={sel} value={w.name} onChange={(e) => setWitness(i, 'name', e.target.value)} /></div>
                <div><label style={lbl}>NID / Passport</label><input style={sel} value={w.nid} onChange={(e) => setWitness(i, 'nid', e.target.value)} /></div>
                <div><label style={lbl}>Email (to send signing link)</label><input style={sel} value={w.email} onChange={(e) => setWitness(i, 'email', e.target.value)} /></div>
              </div>
            ))}

            {(meta.schedule_d || []).length > 0 && <>
              <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--line)', paddingTop: 12, fontWeight: 700, color: 'var(--navy)', fontSize: 12.5 }}>Schedule D — Checklist (tick completed items, optional)</div>
              {(meta.schedule_d || []).map(([group, items]) => (
                <div key={group} style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--muted)', margin: '4px 0' }}>{group}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 18px' }}>
                    {items.map((it) => <label key={it} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5, cursor: 'pointer' }}><input type="checkbox" checked={chkSet.has(it)} onChange={() => toggleCheck(it)} /> {it}</label>)}
                  </div>
                </div>
              ))}
            </>}
          </div>
        )}

        {step === 4 && (
          <div>{preview ? <div style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 16, maxHeight: 460, overflow: 'auto', background: '#fff' }} dangerouslySetInnerHTML={{ __html: preview.html }} /> : <Spinner />}</div>
        )}
      </div></div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
        <button className="pm-btn" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="pm-btn" disabled={busy} onClick={() => submit(true)}>{busy ? <Spinner /> : 'Save as draft'}</button>
          {step < STEPS.length - 1
            ? <button className="pm-btn primary" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Next</button>
            : <button className="pm-btn primary" disabled={busy} onClick={() => submit(false)}>{busy ? <Spinner /> : 'Send for signature'}</button>}
        </div>
      </div>
    </div>
  );
}
