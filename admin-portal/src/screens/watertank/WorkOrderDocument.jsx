import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Save, Send, Download, Check, Eye, RefreshCw, Loader2,
  FileSignature, Copy, Ban, Plus, Trash2, Search, AlertTriangle, Lock, ShieldCheck,
} from 'lucide-react';
import api from '../../services/api';
import { WtHead, Loading, EmptyState, Pill, DatePicker, bdt, dateFmt, toast, errText, parseJson } from './common';

/*
 * Project Work Order — SSPC-WTCM-PWO-01 v0.2.
 *
 * The ten sections of the source document, captured step by step and then issued
 * for two-party signature: the provider signs first (accepting the job), Seventh
 * Sky countersigns. On completion the provider is onboarded to the project, the
 * client is emailed the provider's details, and the provider receives the branded
 * work order and the execution certificate as PDFs.
 *
 * Section 8 is seeded from the source quotation but stays editable — the agreed
 * price may legitimately differ from the quoted price (Pricing Note 2).
 */

const STEPS = [
  { label: 'Project', hint: 'Sections 1–2 · project and client' },
  { label: 'Services', hint: 'Section 3 · requested services' },
  { label: 'Site', hint: 'Sections 4–5 · tanks and scope' },
  { label: 'Resources', hint: 'Sections 6–7 · materials and timeline' },
  { label: 'Pricing', hint: 'Section 8 · schedules A–E' },
  { label: 'Terms', hint: 'Sections 9–10 · warranty and checklist' },
  { label: 'Issue', hint: 'Review and sign' },
];

const num = (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? 0 : Number(v));
const arr = (v) => (Array.isArray(v) ? v : parseJson(v, []) || []);
const obj = (v) => { const o = typeof v === 'object' && v && !Array.isArray(v) ? v : parseJson(v, {}); return o && typeof o === 'object' ? o : {}; };

/* ── small field primitives, matching the wt-scope form language ── */

function Field({ label, children, wide }) {
  return <div className="wt-field" style={wide ? { gridColumn: '1 / -1' } : undefined}><label>{label}</label>{children}</div>;
}
const Input = ({ label, value, onChange, type = 'text', wide, placeholder }) => (
  <Field label={label} wide={wide}>
    <input className="wt-input" type={type} value={value ?? ''} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)} />
  </Field>
);
const Area = ({ label, value, onChange, rows = 4 }) => (
  <Field label={label} wide><textarea className="wt-input" rows={rows} value={value ?? ''} onChange={(e) => onChange(e.target.value)} /></Field>
);
const DateField = ({ label, value, onChange }) => (
  <Field label={label}><DatePicker value={value || ''} onChange={onChange} /></Field>
);

/** Checkbox grid used for property type, requested services, checklist, payment method. */
function CheckGrid({ options, selected, onToggle, columns = 3 }) {
  const set = new Set((selected || []).map((v) => String(v)));
  return (
    <div className="wt-checkgrid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}>
      {options.map((o) => (
        <button type="button" key={o} className={`wt-checkitem${set.has(o) ? ' on' : ''}`} onClick={() => onToggle(o)}>
          <span className="box">{set.has(o) && <Check size={12} />}</span>{o}
        </button>
      ))}
    </div>
  );
}

/** Editable line table — services, materials, labour, item/qty lists and the payment schedule. */
function LineTable({ columns, rows, onChange, onRemove, onAdd, addLabel, empty }) {
  return (
    <div className="wt-linetable">
      <table className="wt-tbl compact">
        <thead><tr>{columns.map((c) => <th key={c.key} style={{ width: c.width, textAlign: c.right ? 'right' : undefined }}>{c.label}</th>)}<th style={{ width: 34 }} /></tr></thead>
        <tbody>
          {rows.length ? rows.map((row, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.key} style={{ textAlign: c.right ? 'right' : undefined }}>
                  {c.computed
                    ? <strong>{bdt(c.computed(row))}</strong>
                    : <input className="wt-input sm" type={c.type || 'text'} value={row[c.key] ?? ''} readOnly={c.readOnly}
                        style={c.right ? { textAlign: 'right' } : undefined}
                        onChange={(e) => onChange(i, c.key, e.target.value)} />}
                </td>
              ))}
              <td><button className="wt-iconbtn danger" onClick={() => onRemove(i)} title="Remove line"><Trash2 size={13} /></button></td>
            </tr>
          )) : <tr><td colSpan={columns.length + 1} className="muted" style={{ padding: 14 }}>{empty}</td></tr>}
        </tbody>
      </table>
      {onAdd && <button className="wt-btn sm" onClick={onAdd}><Plus size={13} /> {addLabel}</button>}
    </div>
  );
}

export default function WorkOrderDocument() {
  const { code } = useParams();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState(null);
  const [ref, setRef] = useState(null);
  const [f, setF] = useState({});
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [blocking, setBlocking] = useState([]);
  const [preview, setPreview] = useState('');
  const [links, setLinks] = useState(null);
  const [catQ, setCatQ] = useState('');

  const hydrate = (wo) => setF({
    quotation_no: wo.quotation_no || '', agreement_reference: wo.agreement_reference || '',
    date_issued: wo.date_issued || '', project_manager: wo.project_manager || '',
    client_company: wo.client_company || '', client_contact_person: wo.client_contact_person || '',
    client_phone: wo.client_phone || '', client_email: wo.client_email || '',
    site_address: wo.site_address || '', property_type: wo.property_type || '',
    service_selections: obj(wo.service_selections), tank_details: obj(wo.tank_details),
    scope: wo.scope || '', deliverables: wo.deliverables || '',
    materials_required: arr(wo.materials_required), chemicals_required: arr(wo.chemicals_required),
    equipment_required: arr(wo.equipment_required), timeline_dates: obj(wo.timeline_dates),
    lines: arr(wo.lines), material_lines: arr(wo.material_lines), labour_lines: arr(wo.labour_lines),
    cost_summary: obj(wo.cost_summary), payment_schedule: arr(wo.payment_schedule),
    payment_method: wo.payment_method || '', pricing_notes: wo.pricing_notes || '',
    warranty_terms: obj(wo.warranty_terms), project_checklist: obj(wo.project_checklist),
  });

  const load = useCallback(() => {
    setLoading(true); setError('');
    Promise.all([api.get(`/wt-work-orders/${code}/document`), api.get('/wt-work-orders/document/reference')])
      .then(([d, r]) => { setData(d.data); setRef(r.data); hydrate(d.data.work_order); setPreview(d.data.draft_html || d.data.html); setDirty(false); })
      .catch((e) => setError(errText(e, 'Could not load this work order document')))
      .finally(() => setLoading(false));
  }, [code]);
  useEffect(load, [load]);

  const set = (k, v) => { setF((s) => ({ ...s, [k]: v })); setDirty(true); };
  const setIn = (parent, key, v) => { setF((s) => ({ ...s, [parent]: { ...(s[parent] || {}), [key]: v } })); setDirty(true); };
  const toggleIn = (parent, group, option) => setF((s) => {
    const current = arr((s[parent] || {})[group]);
    const next = current.includes(option) ? current.filter((x) => x !== option) : [...current, option];
    setDirty(true);
    return { ...s, [parent]: { ...(s[parent] || {}), [group]: next } };
  });

  const editLines = (key) => ({
    onChange: (i, field, value) => setF((s) => {
      const rows = [...(s[key] || [])]; rows[i] = { ...rows[i], [field]: value }; setDirty(true); return { ...s, [key]: rows };
    }),
    onRemove: (i) => setF((s) => { const rows = [...(s[key] || [])]; rows.splice(i, 1); setDirty(true); return { ...s, [key]: rows }; }),
  });
  const addLine = (key, row) => setF((s) => { setDirty(true); return { ...s, [key]: [...(s[key] || []), row] }; });

  /* live Section 8 totals — mirrors computeTotals() on the server exactly */
  const totals = useMemo(() => {
    const services = (f.lines || []).reduce((s, l) => s + num(l.qty == null || l.qty === '' ? 1 : l.qty) * num(l.agreed_price !== '' && l.agreed_price != null ? l.agreed_price : l.standard_price), 0);
    const materials = (f.material_lines || []).reduce((s, l) => s + num(l.qty) * num(l.unit_price), 0);
    const labour = (f.labour_lines || []).reduce((s, l) => s + num(l.hours) * num(l.rate), 0);
    const c = f.cost_summary || {};
    const total = services + materials + labour + num(c.transportation) + num(c.equipment_hire)
      + num(c.lab_fees) + num(c.government_fees) - num(c.discount) + num(c.vat);
    return { service_charges: services, materials, labour_charges: labour, total };
  }, [f]);

  const schedule = useMemo(() => {
    const base = (f.payment_schedule || []).length ? f.payment_schedule : (ref?.default_payment_schedule || []);
    return base.map((r) => ({ ...r, amount: r.amount != null && r.amount !== '' ? num(r.amount) : Math.round(totals.total * (num(r.percentage) / 100) * 100) / 100 }));
  }, [f.payment_schedule, ref, totals.total]);

  const locked = !!data?.locked;
  const signed = !!data?.work_order?.wo_signed_at;

  const save = async (advance) => {
    if (locked) { if (advance) setStep((s) => Math.min(STEPS.length - 1, s + 1)); return true; }
    setBusy('save'); setError('');
    try {
      const { data: out } = await api.patch(`/wt-work-orders/${code}/document`, { ...f, payment_schedule: schedule });
      setPreview(out.html); setDirty(false);
      setData((d) => ({ ...d, work_order: { ...d.work_order, ...out.work_order }, summary: out.summary }));
      if (advance) setStep((s) => Math.min(STEPS.length - 1, s + 1));
      else toast.ok('Work order saved');
      return true;
    } catch (e) { setError(errText(e, 'Could not save the work order')); return false; }
    finally { setBusy(''); }
  };

  const syncQuotation = async (force) => {
    setBusy('sync'); setError('');
    try {
      const { data: out } = await api.post(`/wt-work-orders/${code}/document/sync-quotation`, { force: !!force });
      hydrate(out.work_order); setDirty(false);
      toast.ok(out.applied?.length ? `Pulled ${out.applied.length} field(s) from the quotation` : out.message || 'Already in step with the quotation');
      load();
    } catch (e) { setError(errText(e, 'Could not sync from the quotation')); }
    finally { setBusy(''); }
  };

  const issue = async () => {
    if (dirty && !(await save(false))) return;
    setBusy('send'); setError(''); setBlocking([]);
    try {
      const { data: out } = await api.post(`/wt-work-orders/${code}/document/send`, {});
      setLinks(out.links || []);
      toast.ok('Work order issued — the provider signs first');
      load();
    } catch (e) {
      setError(errText(e, 'Could not issue the work order'));
      setBlocking(e?.response?.data?.blocking || []);
    } finally { setBusy(''); }
  };

  const voidDoc = async () => {
    const reason = window.prompt('Reason for withdrawing this work order from signature:');
    if (!reason) return;
    setBusy('void');
    try { await api.post(`/wt-work-orders/${code}/document/void`, { reason }); toast.ok('Withdrawn'); load(); }
    catch (e) { setError(errText(e, 'Could not withdraw the work order')); }
    finally { setBusy(''); }
  };

  const downloadPdf = async () => {
    setBusy('pdf');
    try {
      const res = await api.get(`/wt-work-orders/${code}/document/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `${code}-project-work-order.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setError(errText(e, 'Could not build the PDF')); }
    finally { setBusy(''); }
  };

  if (loading) return <Loading />;
  if (error && !data) return <div className="wt-card"><EmptyState eyebrow="Work order" title="Could not open this document" hint={error}
    action={<button className="wt-btn primary" onClick={load}><RefreshCw size={14} /> Retry</button>} /></div>;

  const wo = data.work_order;
  const env = data.envelope;
  const catalog = (ref?.catalog || []).filter((c) => !catQ
    || [c.code, c.name].some((v) => String(v || '').toLowerCase().includes(catQ.toLowerCase())));

  return (
    <>
      <WtHead
        crumb={<div className="wt-crumb">
          <span className="lnk" onClick={() => nav('/water-tank/work-orders')}>Work Orders</span> ›{' '}
          <span className="lnk" onClick={() => nav(`/water-tank/work-orders/${code}`)}>{code}</span> › <span>Project Work Order</span>
        </div>}
        title={`Project Work Order — ${code}`}
        subtitle={`SSPC-WTCM-PWO-01 · v0.2 · ${wo.client_name || 'client not set'}${wo.provider_name ? ` · ${wo.provider_name}` : ''}`}
      >
        <button className="wt-btn" onClick={() => nav(`/water-tank/work-orders/${code}`)}>Close</button>
        <button className="wt-btn" disabled={busy === 'pdf'} onClick={downloadPdf}>
          {busy === 'pdf' ? <Loader2 size={14} className="wt-spin" /> : <Download size={14} />} PDF
        </button>
        {!locked && <button className="wt-btn primary" disabled={busy === 'save'} onClick={() => save(false)}>
          {busy === 'save' ? <Loader2 size={14} className="wt-spin" /> : <Save size={14} />} Save
        </button>}
      </WtHead>

      {/* ── execution state ── */}
      <div className="wt-statusstrip">
        <Pill value={signed ? 'Signed' : wo.wo_doc_status || 'Not Started'} />
        {wo.wo_doc_code && <span className="wt-pill slate">{wo.wo_doc_code}</span>}
        <span><strong>{bdt(totals.total)}</strong> total project value</span>
        <span>{(f.lines || []).length} service line(s)</span>
        {wo.provider_onboarded_at && <span style={{ color: 'var(--wt-green)' }}><ShieldCheck size={13} style={{ verticalAlign: -2 }} /> provider onboarded {dateFmt(wo.provider_onboarded_at)}</span>}
        {wo.client_notified_at && <span>client notified {dateFmt(wo.client_notified_at)}</span>}
      </div>

      {locked && (
        <div className="wt-note" style={{ borderLeft: '3px solid var(--wt-amber)' }}>
          <Lock size={13} style={{ verticalAlign: -2 }} />{' '}
          {signed
            ? 'This work order has been executed by both parties. The stored copy is the legal record and can no longer be edited.'
            : 'This work order is out for signature and is locked. Withdraw it to make changes.'}
        </div>
      )}

      {error && <div className="wt-formerr">{error}{blocking.length > 0 && <ul style={{ margin: '6px 0 0 16px' }}>{blocking.map((b, i) => <li key={i}>{b}</li>)}</ul>}</div>}

      {/* ── stepper ── */}
      <div className="wt-stepper">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.label}>
            <button className={`wt-step${i < step ? ' done' : i === step ? ' current' : ''}`} onClick={() => setStep(i)} title={s.hint}>
              <span className="dot">{i < step ? <Check size={11} /> : i + 1}</span>
              <span className="lbl">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && <span className="wt-step-sep" />}
          </React.Fragment>
        ))}
      </div>

      <div className="wt-card" style={{ padding: 24 }}>
        {/* ── 1. Sections 1–2 ── */}
        {step === 0 && (
          <>
            <div className="wt-wizpane-h"><h2>Sections 1 &amp; 2 — Project and client</h2>
              <p>Identifiers are carried from the quotation and the master agreement. The client details here are what the confirmation email will use.</p></div>
            <div className="wt-grid3">
              <Input label="Work Order No." value={wo.code} onChange={() => {}} />
              <Input label="Quotation No." value={f.quotation_no} onChange={(v) => set('quotation_no', v)} />
              <Input label="Project No." value={wo.project_id || ''} onChange={() => {}} />
              <Input label="Agreement Reference" value={f.agreement_reference} onChange={(v) => set('agreement_reference', v)} />
              <DateField label="Date Issued" value={f.date_issued} onChange={(v) => set('date_issued', v)} />
              <Input label="Project Manager" value={f.project_manager} onChange={(v) => set('project_manager', v)} />
              <Input label="Assigned Service Provider" value={wo.provider_name || 'Not yet assigned'} onChange={() => {}} />
            </div>
            <h3 className="wt-section-title" style={{ marginTop: 18 }}>Client details</h3>
            <div className="wt-grid3">
              <Input label="Client Name" value={wo.client_name || ''} onChange={() => {}} />
              <Input label="Company (if applicable)" value={f.client_company} onChange={(v) => set('client_company', v)} />
              <Input label="Contact Person" value={f.client_contact_person} onChange={(v) => set('client_contact_person', v)} />
              <Input label="Phone" value={f.client_phone} onChange={(v) => set('client_phone', v)} />
              <Input label="Email" type="email" value={f.client_email} onChange={(v) => set('client_email', v)} />
            </div>
            <Area label="Service Address" rows={2} value={f.site_address} onChange={(v) => set('site_address', v)} />
            <h3 className="wt-section-title" style={{ marginTop: 14 }}>Property type</h3>
            <CheckGrid options={ref?.property_types || []} selected={f.property_type ? [f.property_type] : []}
              onToggle={(o) => set('property_type', f.property_type === o ? '' : o)} columns={4} />
          </>
        )}

        {/* ── 2. Section 3 ── */}
        {step === 1 && (
          <>
            <div className="wt-wizpane-h"><h2>Section 3 — Services requested</h2>
              <p>Tick everything the client has asked for. This is the descriptive scope; the priced lines live in Section 8.</p></div>
            {Object.entries(ref?.service_groups || {}).map(([group, options]) => (
              <div key={group} style={{ marginBottom: 14 }}>
                <h3 className="wt-section-title">{group}</h3>
                <CheckGrid options={options} selected={arr((f.service_selections || {})[group])}
                  onToggle={(o) => toggleIn('service_selections', group, o)} />
              </div>
            ))}
          </>
        )}

        {/* ── 3. Sections 4–5 ── */}
        {step === 2 && (
          <>
            <div className="wt-wizpane-h"><h2>Sections 4 &amp; 5 — Tank details and scope</h2>
              <p>What the provider will find on site, and precisely what they are contracted to deliver.</p></div>
            <div className="wt-grid3">
              {(ref?.tank_fields || []).map(([key, label]) => (
                <Input key={key} label={label} value={(f.tank_details || {})[key]} onChange={(v) => setIn('tank_details', key, v)} />
              ))}
            </div>
            <Area label="Scope of Work — Description" value={f.scope} onChange={(v) => set('scope', v)} rows={5} />
            <Area label="Expected Deliverables" value={f.deliverables} onChange={(v) => set('deliverables', v)} rows={4} />
          </>
        )}

        {/* ── 4. Sections 6–7 ── */}
        {step === 3 && (
          <>
            <div className="wt-wizpane-h"><h2>Sections 6 &amp; 7 — Materials, equipment and timeline</h2>
              <p>What must be on the van, and the dates both parties are committing to.</p></div>
            {[['materials_required', 'Materials Required'], ['chemicals_required', 'Chemicals Required'], ['equipment_required', 'Equipment Required']].map(([key, label]) => (
              <div key={key} style={{ marginBottom: 16 }}>
                <h3 className="wt-section-title">{label}</h3>
                <LineTable
                  columns={[{ key: 'item', label: 'Item' }, { key: 'qty', label: 'Qty', width: 110 }]}
                  rows={f[key] || []} {...editLines(key)}
                  onAdd={() => addLine(key, { item: '', qty: '' })} addLabel={`Add ${label.toLowerCase()}`}
                  empty="Nothing recorded." />
              </div>
            ))}
            <h3 className="wt-section-title" style={{ marginTop: 6 }}>Project timeline</h3>
            <div className="wt-grid2">
              {(ref?.timeline_fields || []).map(([key, label]) => (
                <DateField key={key} label={label} value={(f.timeline_dates || {})[key]} onChange={(v) => setIn('timeline_dates', key, v)} />
              ))}
            </div>
            <h3 className="wt-section-title" style={{ marginTop: 10 }}>For Annual Maintenance Contracts</h3>
            <div className="wt-grid2">
              {(ref?.amc_fields || []).map(([key, label]) => (
                <DateField key={key} label={label} value={(f.timeline_dates || {})[key]} onChange={(v) => setIn('timeline_dates', key, v)} />
              ))}
            </div>
          </>
        )}

        {/* ── 5. Section 8 ── */}
        {step === 4 && (
          <>
            <div className="wt-wizpane-h"><h2>Section 8 — Pricing summary</h2>
              <p>Seeded from the quotation and fully editable. The agreed price may differ from the standard price after negotiation (Pricing Note 2); every total below is recalculated from the lines.</p></div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button className="wt-btn sm" disabled={busy === 'sync'} onClick={() => syncQuotation(false)}>
                {busy === 'sync' ? <Loader2 size={13} className="wt-spin" /> : <RefreshCw size={13} />} Pull from quotation
              </button>
              <button className="wt-btn sm" disabled={busy === 'sync'} onClick={() => syncQuotation(true)} title="Discard the current lines and re-seed from the quotation">
                Re-seed from quotation
              </button>
            </div>

            <h3 className="wt-section-title">A. Selected services</h3>
            <LineTable
              columns={[
                { key: 'code', label: 'Code', width: 100 }, { key: 'name', label: 'Service description' },
                { key: 'qty', label: 'Qty', width: 70, type: 'number' }, { key: 'unit', label: 'Unit', width: 90 },
                { key: 'standard_price', label: 'Standard', width: 110, type: 'number', right: true },
                { key: 'agreed_price', label: 'Agreed', width: 110, type: 'number', right: true },
                { key: 'total', label: 'Total', width: 110, right: true,
                  computed: (r) => num(r.qty == null || r.qty === '' ? 1 : r.qty) * num(r.agreed_price !== '' && r.agreed_price != null ? r.agreed_price : r.standard_price) },
              ]}
              rows={f.lines || []} {...editLines('lines')}
              empty="No services priced yet — pull from the quotation or add one below." />
            <div className="wt-catalogpick">
              <label className="wt-search sm"><Search /><input value={catQ} onChange={(e) => setCatQ(e.target.value)} placeholder="Search the service catalogue…" /></label>
              {catQ && (
                <div className="wt-lookup" style={{ maxHeight: 190 }}>
                  {catalog.slice(0, 25).map((c) => (
                    <button key={c.code} className="wt-lookup-item" onClick={() => {
                      addLine('lines', { code: c.code, name: c.name, qty: 1, unit: c.unit, standard_price: c.standard_price, agreed_price: c.standard_price });
                      setCatQ('');
                    }}>
                      <span className="av">{c.code.slice(-3)}</span>
                      <span style={{ flex: 1 }}><span className="nm">{c.name}</span><span className="mt">{c.code} · {c.unit || 'service'}</span></span>
                      <span>{bdt(c.standard_price)}</span>
                    </button>
                  ))}
                  {!catalog.length && <div className="muted" style={{ padding: 10, fontSize: 12.5 }}>Nothing matches that search.</div>}
                </div>
              )}
            </div>

            <h3 className="wt-section-title" style={{ marginTop: 18 }}>B. Materials &amp; consumables</h3>
            <LineTable
              columns={[{ key: 'code', label: 'Code', width: 100 }, { key: 'name', label: 'Item' },
                { key: 'qty', label: 'Qty', width: 80, type: 'number' },
                { key: 'unit_price', label: 'Unit price', width: 120, type: 'number', right: true },
                { key: 'total', label: 'Total', width: 110, right: true, computed: (r) => num(r.qty) * num(r.unit_price) }]}
              rows={f.material_lines || []} {...editLines('material_lines')}
              onAdd={() => addLine('material_lines', { code: '', name: '', qty: '', unit_price: '' })}
              addLabel="Add material" empty="No materials charged." />

            <h3 className="wt-section-title" style={{ marginTop: 18 }}>C. Labour charges</h3>
            <LineTable
              columns={[{ key: 'code', label: 'Code', width: 100 }, { key: 'name', label: 'Description' },
                { key: 'hours', label: 'Hours', width: 80, type: 'number' },
                { key: 'rate', label: 'Rate', width: 120, type: 'number', right: true },
                { key: 'total', label: 'Total', width: 110, right: true, computed: (r) => num(r.hours) * num(r.rate) }]}
              rows={f.labour_lines || []} {...editLines('labour_lines')}
              onAdd={() => addLine('labour_lines', { code: '', name: '', hours: '', rate: '' })}
              addLabel="Add labour line" empty="No labour charged separately." />

            <h3 className="wt-section-title" style={{ marginTop: 18 }}>D. Project cost summary</h3>
            <div className="wt-costgrid">
              {(ref?.cost_rows || []).map(([key, label]) => {
                const derived = { service_charges: totals.service_charges, labour_charges: totals.labour_charges, materials: totals.materials };
                if (key in derived) return (
                  <div className="wt-costrow derived" key={key}><span>{label}</span><strong>{bdt(derived[key])}</strong><em>from the lines above</em></div>
                );
                return (
                  <div className="wt-costrow" key={key}>
                    <span>{label}</span>
                    <input className="wt-input sm" type="number" style={{ textAlign: 'right' }}
                      value={(f.cost_summary || {})[key] ?? ''} onChange={(e) => setIn('cost_summary', key, e.target.value)} />
                  </div>
                );
              })}
              <div className="wt-costrow total"><span>TOTAL PROJECT VALUE</span><strong>{bdt(totals.total)}</strong></div>
            </div>

            <h3 className="wt-section-title" style={{ marginTop: 18 }}>E. Payment schedule</h3>
            <LineTable
              columns={[{ key: 'stage', label: 'Stage' }, { key: 'percentage', label: '%', width: 90, type: 'number' },
                { key: 'amount', label: 'Amount', width: 130, right: true, computed: (r) => (r.amount != null && r.amount !== '' ? num(r.amount) : Math.round(totals.total * (num(r.percentage) / 100) * 100) / 100) },
                { key: 'due_date', label: 'Due date', width: 150 }]}
              rows={schedule} onChange={(i, key, value) => setF((s) => {
                const rows = [...schedule]; rows[i] = { ...rows[i], [key]: value }; setDirty(true); return { ...s, payment_schedule: rows };
              })}
              onRemove={(i) => setF((s) => { const rows = [...schedule]; rows.splice(i, 1); setDirty(true); return { ...s, payment_schedule: rows }; })}
              onAdd={() => setF((s) => { setDirty(true); return { ...s, payment_schedule: [...schedule, { stage: '', percentage: '', due_date: '' }] }; })}
              addLabel="Add stage" empty="No payment stages." />
            <h3 className="wt-section-title" style={{ marginTop: 12 }}>Payment method</h3>
            <CheckGrid options={ref?.payment_methods || []} selected={f.payment_method ? [f.payment_method] : []}
              onToggle={(o) => set('payment_method', f.payment_method === o ? '' : o)} columns={5} />
            <Area label="Project-specific pricing notes" value={f.pricing_notes} onChange={(v) => set('pricing_notes', v)} rows={3} />
          </>
        )}

        {/* ── 6. Sections 9–10 ── */}
        {step === 5 && (
          <>
            <div className="wt-wizpane-h"><h2>Sections 9 &amp; 10 — Warranty and project checklist</h2>
              <p>The warranty periods the provider is bound to, and the checklist the job will be verified against.</p></div>
            <h3 className="wt-section-title">Warranty periods</h3>
            <div className="wt-grid3">
              {(ref?.warranty_rows || []).map(([key, label]) => (
                <Input key={key} label={label} placeholder="e.g. 6 months"
                  value={(f.warranty_terms || {})[key]} onChange={(v) => setIn('warranty_terms', key, v)} />
              ))}
            </div>
            {Object.entries(ref?.checklist_groups || {}).map(([group, options]) => (
              <div key={group} style={{ marginTop: 14 }}>
                <h3 className="wt-section-title">{group}</h3>
                <CheckGrid options={options} selected={arr((f.project_checklist || {})[group])}
                  onToggle={(o) => toggleIn('project_checklist', group, o)} columns={2} />
              </div>
            ))}
          </>
        )}

        {/* ── 7. Issue ── */}
        {step === 6 && (
          <>
            <div className="wt-wizpane-h"><h2>Review and issue for signature</h2>
              <p>The provider signs first — that is their acceptance of the job. Seventh Sky countersigns. On completion the provider is onboarded to the project, the client is emailed their details, and the provider receives the branded work order and the execution certificate.</p></div>

            {env && (
              <div className="wt-card" style={{ padding: 16, marginBottom: 14 }}>
                <h3 className="wt-section-title">Signature progress — {env.envelope_code}</h3>
                {env.signers.map((s) => (
                  <div className="wt-signer" key={s.id}>
                    <span className={s.status === 'signed' ? 'ok' : ''}>{s.status === 'signed' ? <Check size={12} /> : s.order}</span>
                    <div><strong>{s.name}</strong><small>{String(s.role).replace(/_/g, ' ')} · {s.status}{s.signed_at ? ` · ${dateFmt(s.signed_at)}` : ''}</small></div>
                    {/* The token is issued on request and audited, never shipped
                        with the page — see the agreement hub's signing-link route. */}
                    {s.has_live_link && (
                      <button className="wt-btn sm" onClick={async () => {
                        try {
                          const { data } = await api.post(`/wt-agreement-hub/${env.id}/signing-link/${s.id}`);
                          await navigator.clipboard.writeText(`${window.location.origin}${data.signing_path}`);
                          toast.ok('Signing link copied — treat it as their signature');
                        } catch (e) { toast.err(errText(e, 'Could not issue the signing link')); }
                      }}>
                        <Copy size={12} /> Link
                      </button>
                    )}
                  </div>
                ))}
                {!signed && <button className="wt-btn danger-ghost sm" style={{ marginTop: 10 }} disabled={busy === 'void'} onClick={voidDoc}><Ban size={13} /> Withdraw from signature</button>}
              </div>
            )}

            {links && (
              <div className="wt-note" style={{ borderLeft: '3px solid var(--wt-green)' }}>
                Issued. {links.map((l) => (
                  <div key={l.order} style={{ marginTop: 4 }}>
                    <strong>{l.order}. {l.name}</strong> ({String(l.role).replace(/_/g, ' ')}) —{' '}
                    <button className="wt-link" onClick={() => navigator.clipboard.writeText(`${window.location.origin}${l.signing_path}`).then(() => toast.ok('Link copied'))}>copy signing link</button>
                  </div>
                ))}
              </div>
            )}

            <div className="wt-reviewgrid">
              <div><span>Total project value</span><strong>{bdt(totals.total)}</strong></div>
              <div><span>Service lines</span><strong>{(f.lines || []).length}</strong></div>
              <div><span>Provider</span><strong>{wo.provider_name || '— not assigned —'}</strong></div>
              <div><span>Client email</span><strong>{f.client_email || '— none —'}</strong></div>
              <div><span>Commencement</span><strong>{(f.timeline_dates || {}).commencement ? dateFmt(f.timeline_dates.commencement) : '—'}</strong></div>
              <div><span>Provider payout</span><strong>{wo.provider_net_payable ? bdt(wo.provider_net_payable) : '—'}</strong></div>
            </div>

            {!f.client_email && (
              <div className="wt-note" style={{ borderLeft: '3px solid var(--wt-amber)' }}>
                <AlertTriangle size={13} style={{ verticalAlign: -2 }} /> No client email address — the automatic confirmation naming the provider cannot be sent. Add one in Section 2.
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              <button className="wt-btn" onClick={() => setPreview(preview ? '' : data.draft_html)}><Eye size={14} /> {preview ? 'Hide' : 'Show'} document</button>
              <button className="wt-btn" disabled={busy === 'pdf'} onClick={downloadPdf}><Download size={14} /> Download branded PDF</button>
              {!locked && (
                <button className="wt-btn primary" disabled={busy === 'send' || !wo.provider_id} onClick={issue}>
                  {busy === 'send' ? <Loader2 size={14} className="wt-spin" /> : <Send size={14} />} Issue for two-party signature
                </button>
              )}
              {signed && <span className="wt-pill green"><FileSignature size={12} /> Executed {dateFmt(wo.wo_signed_at)}</span>}
            </div>

            {preview && <div className="wt-agreement-preview" style={{ marginTop: 16 }} dangerouslySetInnerHTML={{ __html: preview }} />}
          </>
        )}
      </div>

      <div className="wt-wizfoot">
        <button className="wt-btn" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft size={14} /> Back</button>
        <span style={{ marginLeft: 'auto' }}>Step {step + 1} of {STEPS.length} · {STEPS[step].hint}</span>
        {step < STEPS.length - 1 && (
          <button className="wt-btn primary" disabled={busy === 'save'} onClick={() => save(true)}>
            {busy === 'save' ? <Loader2 size={14} className="wt-spin" /> : <>Save &amp; continue <ArrowRight size={14} /></>}
          </button>
        )}
      </div>
    </>
  );
}
