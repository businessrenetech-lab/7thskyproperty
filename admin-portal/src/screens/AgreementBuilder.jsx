import React, { useEffect, useMemo, useState } from 'react';
import { X, Check, Circle, Eye, FileSignature, Copy, CheckCircle2, ChevronRight, ShieldCheck, Sparkles, Search } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Spinner, Button, Field, Input, Select, Textarea } from '../ui/kit';

// Which operational records can prefill each template category.
const PREFILL_SOURCES = {
  tenancy: [
    { type: 'tenancy', label: 'Tenancy', endpoint: '/tenancies', display: (r) => `${r.tenancy_code || 'Tenancy #' + r.id} — ${r.property?.title || r.property?.address || ''}` },
    { type: 'tenant_application', label: 'Tenant application', endpoint: '/tenant-applications', display: (r) => `${r.application_code || 'App #' + r.id} — ${r.applicant_name || ''}` },
    { type: 'property', label: 'Property', endpoint: '/properties', display: (r) => `${r.title || r.property_code || 'Property #' + r.id} — ${r.address || ''}` },
  ],
  provider_master: [
    { type: 'service_provider', label: 'Service provider', endpoint: '/providers', display: (r) => r.company_name || 'Provider #' + r.id },
  ],
  customer_service: [
    { type: 'contact', label: 'Customer / contact', endpoint: '/contacts', display: (r) => r.full_name || r.company_name || 'Contact #' + r.id },
  ],
};

/* PropertyMe-style Agreement Builder.
   Staff fill every section; the left rail shows completion. The finished,
   prefilled, read-only agreement is then sent to the parties who just
   review, upload KYC and sign. Reuses agreement_templates fields/merge/prepare. */

const CATEGORY_KYC_ROLE = { tenancy: 'tenant', provider_master: 'provider', customer_service: 'none' };
const KYC_ROLES = [
  { value: 'none', label: 'No KYC (customer / simple sign)' },
  { value: 'tenant', label: 'Tenant' }, { value: 'landlord', label: 'Landlord' },
  { value: 'buyer', label: 'Buyer' }, { value: 'vendor', label: 'Vendor / Seller' },
  { value: 'provider', label: 'Service provider' },
];
const RELATED_TYPE = { provider: 'service_provider', tenant: 'party_role', landlord: 'party_role', vendor: 'party_role', buyer: 'party_role' };

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Render a checkbox group: ALL options show, selected are ticked (☑ / ☐).
function renderCheckboxHtml(options, selected) {
  const sel = new Set(selected || []);
  if (!options.length) return '<span style="color:#94a3b8">—</span>';
  return '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:2px 16px;margin:4px 0 8px">' +
    options.map((o) => `<div>${sel.has(o) ? '☑' : '☐'} ${esc(o)}</div>`).join('') + '</div>';
}

// Build the final values map sent to preview/prepare:
//  · checkbox_group → rendered ticked HTML (all options shown)
//  · boolean        → derived narrative clause ({key}_clause)
//  · textarea       → newlines to <br>
function buildValues(fields, values, groupOptions) {
  const out = { ...values };
  for (const f of fields) {
    if (f.type === 'checkbox_group') {
      out[f.key] = renderCheckboxHtml(groupOptions[f.key] || f.options || [], values[f.key] || []);
    } else if (f.type === 'boolean' && (f.clause_yes != null || f.clause_no != null)) {
      out[`${f.key}_clause`] = values[f.key] === 'Yes' ? (f.clause_yes || '') : values[f.key] === 'No' ? (f.clause_no || '') : '';
    } else if (f.type === 'textarea' && typeof values[f.key] === 'string') {
      out[f.key] = values[f.key].replace(/\n/g, '<br/>');
    }
  }
  return out;
}

// Prefill picker — search an existing record and auto-fill the builder from it.
function PrefillModal({ template, onClose, onApply }) {
  const sources = PREFILL_SOURCES[template.category] || Object.values(PREFILL_SOURCES).flat();
  const [src, setSrc] = useState(sources[0]);
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [applyingId, setApplyingId] = useState(null);

  const search = async (source = src, term = q) => {
    setLoading(true);
    try { const { data } = await api.get(source.endpoint, { params: { search: term, limit: 8 } }); setRows(data.data || data.rows || []); }
    catch { setRows([]); } finally { setLoading(false); }
  };
  useEffect(() => { search(src, ''); setQ(''); /* reset on source change */ }, [src]);

  const pick = async (r) => {
    setApplyingId(r.id);
    try { const { data } = await api.get(`/agreement-templates/${template.id}/prefill`, { params: { source_type: src.type, source_id: r.id } }); onApply(data.data.values || {}); }
    catch (e) { alert(e.response?.data?.error || 'Prefill failed'); } finally { setApplyingId(null); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 85, display: 'grid', placeItems: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#fff', width: 'min(560px,96vw)', maxHeight: '84vh', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #e5e7eb' }}>
          <b><Sparkles size={15} style={{ verticalAlign: -2 }} /> Prefill from an existing record</b>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ padding: 16 }}>
          {sources.length > 1 && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
              {sources.map((s) => (
                <button key={s.type} onClick={() => setSrc(s)} style={{ padding: '6px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: '1px solid ' + (src.type === s.type ? '#0f766e' : '#e5e7eb'), background: src.type === s.type ? '#ecfdf5' : '#fff', color: src.type === s.type ? '#0f766e' : '#475569' }}>{s.label}</button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') search(); }} placeholder={`Search ${src.label.toLowerCase()}…`} />
            <Button variant="ghost" icon={Search} onClick={() => search()}>Search</Button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
          {loading ? <div style={{ padding: 24, textAlign: 'center' }}><Spinner /></div>
            : !rows.length ? <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No records found.</div>
              : rows.map((r) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid #eef2f7', borderRadius: 10, marginBottom: 8 }}>
                  <div style={{ flex: 1, fontSize: 13.5 }}>{src.display(r)}</div>
                  <Button size="sm" onClick={() => pick(r)} disabled={applyingId === r.id}>{applyingId === r.id ? <Spinner /> : 'Use this'}</Button>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}

// Small editor for a checkbox group: tick options, remove ✕, add new option.
function CheckboxGroupEditor({ field, selected, options, onToggle, onAdd, onRemove }) {
  const [text, setText] = useState('');
  const add = () => { const t = text.trim(); if (t) { onAdd(t); setText(''); } };
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: '4px 14px' }}>
        {options.map((o) => (
          <div key={o} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5 }}>
            <input type="checkbox" checked={(selected || []).includes(o)} onChange={() => onToggle(o)} />
            <span style={{ flex: 1 }}>{o}</span>
            <button title="Remove option" onClick={() => onRemove(o)} style={{ border: 'none', background: 'none', color: '#cbd5e1', cursor: 'pointer', padding: 0 }}>✕</button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} placeholder="Add an option…" style={{ maxWidth: 260 }} />
        <Button size="sm" variant="ghost" onClick={add}>Add</Button>
      </div>
    </div>
  );
}

export default function AgreementBuilder({ template, onClose }) {
  const toast = useToast();
  const fields = template.fields || [];
  const sections = useMemo(() => [...new Set(fields.map((f) => f.group || 'General'))], [fields]);
  const [values, setValues] = useState(() => { const v = {}; for (const f of fields) if (f.default != null) v[f.key] = f.default; return v; });
  const [groupOptions, setGroupOptions] = useState(() => { const g = {}; for (const f of fields) if (f.type === 'checkbox_group') g[f.key] = [...(f.options || [])]; return g; });
  const [active, setActive] = useState(sections[0]);
  const [preview, setPreview] = useState(null);
  const [sending, setSending] = useState(false);
  const [links, setLinks] = useState(null);
  const [showPrefill, setShowPrefill] = useState(false);

  // Signing config
  const [kycRole, setKycRole] = useState(CATEGORY_KYC_ROLE[template.category] || 'none');
  const [kycPolicy, setKycPolicy] = useState('flexible');
  const [relatedId, setRelatedId] = useState('');
  const [signers, setSigners] = useState((template.signers || []).map((s) => ({ ...s, name: s.label, email: '' })));

  const setVal = (k, v) => setValues((s) => ({ ...s, [k]: v }));
  const fieldsIn = (g) => fields.filter((f) => (f.group || 'General') === g);

  // Merge prefilled values (checkbox arrays included) into the form.
  const applyPrefill = (vals) => {
    const keys = Object.keys(vals);
    if (!keys.length) { toast.error('No matching data found on that record.'); return; }
    setValues((prev) => ({ ...prev, ...vals }));
    setShowPrefill(false);
    toast.success(`Prefilled ${keys.length} field${keys.length > 1 ? 's' : ''}.`);
  };

  // A field counts as "filled" — checkbox groups need ≥1 selection.
  const isFilled = (f) => f.type === 'checkbox_group' ? (values[f.key] || []).length > 0 : String(values[f.key] ?? '').trim() !== '';
  // Section completion: all REQUIRED fields in the section have a value.
  const sectionState = (g) => {
    const fs = fieldsIn(g);
    const req = fs.filter((f) => f.required);
    const filled = fs.filter(isFilled);
    if (req.length && req.every(isFilled)) return 'done';
    if (filled.length) return 'progress';
    return 'todo';
  };
  const completeCount = sections.filter((s) => sectionState(s) === 'done').length;

  const doPreview = async () => {
    try { const { data } = await api.post(`/agreement-templates/${template.id}/preview`, { values: buildValues(fields, values, groupOptions) }); setPreview(data.data?.html || data.html); }
    catch { toast.error('Preview failed'); }
  };

  const send = async () => {
    const active = signers.filter((s) => s.email);
    if (!active.length) return toast.error('Add at least one signer email.');
    setSending(true);
    try {
      const body = { values: buildValues(fields, values, groupOptions), signers: active, title: template.name };
      if (kycRole && kycRole !== 'none') {
        body.kyc_role = kycRole; body.kyc_policy = kycPolicy;
        if (relatedId && RELATED_TYPE[kycRole]) { body.related_type = RELATED_TYPE[kycRole]; body.related_id = Number(relatedId); }
      }
      const { data } = await api.post(`/agreement-templates/${template.id}/prepare`, body);
      setLinks(data.links || []); toast.success(data.message);
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to send'); } finally { setSending(false); }
  };

  const inputFor = (f) => {
    if (f.type === 'checkbox_group') {
      const opts = groupOptions[f.key] || [];
      const sel = values[f.key] || [];
      return (
        <CheckboxGroupEditor field={f} options={opts} selected={sel}
          onToggle={(o) => setVal(f.key, sel.includes(o) ? sel.filter((x) => x !== o) : [...sel, o])}
          onAdd={(o) => { if (!opts.includes(o)) setGroupOptions((s) => ({ ...s, [f.key]: [...opts, o] })); }}
          onRemove={(o) => { setGroupOptions((s) => ({ ...s, [f.key]: opts.filter((x) => x !== o) })); setVal(f.key, sel.filter((x) => x !== o)); }} />
      );
    }
    if (f.type === 'boolean') return (
      <div style={{ display: 'flex', gap: 18 }}>
        {['Yes', 'No'].map((opt) => (
          <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
            <input type="radio" name={f.key} checked={values[f.key] === opt} onChange={() => setVal(f.key, opt)} /> {opt}
          </label>
        ))}
      </div>
    );
    if (f.type === 'select') return <Select value={values[f.key] || ''} onChange={(e) => setVal(f.key, e.target.value)}><option value="">Select…</option>{(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}</Select>;
    if (f.type === 'textarea') return <Textarea rows={3} value={values[f.key] || ''} onChange={(e) => setVal(f.key, e.target.value)} />;
    const t = ['date', 'number', 'email'].includes(f.type) ? f.type : 'text';
    return <Input type={t} value={values[f.key] || ''} onChange={(e) => setVal(f.key, e.target.value)} placeholder={f.type === 'currency' ? '৳ amount' : ''} />;
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, background: '#f6f8fb', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 22 }}>{template.name}</h2>
            <span style={{ background: '#fef3c7', color: '#b45309', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 6, letterSpacing: .5 }}>DRAFT</span>
          </div>
          <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 3 }}>{completeCount}/{sections.length} sections complete{values.property_address ? ` · ${values.property_address}` : ''}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <Button variant="ghost" icon={Sparkles} onClick={() => setShowPrefill(true)}>Prefill from record</Button>
          <Button variant="ghost" icon={Eye} onClick={doPreview}>Preview</Button>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '260px 1fr', overflow: 'hidden' }}>
        {/* Left completion rail */}
        <div style={{ borderRight: '1px solid #e5e7eb', background: '#fff', overflowY: 'auto', padding: '12px 8px' }}>
          {sections.map((s) => {
            const st = sectionState(s);
            return (
              <div key={s} onClick={() => setActive(s)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, cursor: 'pointer', background: active === s ? '#eff6ff' : 'transparent' }}>
                {st === 'done' ? <Check size={16} color="#16a34a" /> : st === 'progress' ? <Circle size={10} fill="#2563eb" color="#2563eb" /> : <Circle size={10} color="#cbd5e1" />}
                <span style={{ fontSize: 13.5, fontWeight: active === s ? 700 : 500, color: st === 'todo' ? '#94a3b8' : '#0f172a' }}>{s}</span>
                {active === s && <ChevronRight size={14} style={{ marginLeft: 'auto', color: '#2563eb' }} />}
              </div>
            );
          })}
          <div style={{ margintop: 8, padding: '9px 12px', marginTop: 6, borderTop: '1px solid #f1f5f9' }}>
            <div onClick={() => setActive('__send')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, cursor: 'pointer', background: active === '__send' ? '#ecfdf5' : '#f8fafc' }}>
              <FileSignature size={16} color="#0f766e" /><span style={{ fontSize: 13.5, fontWeight: 700, color: '#0f766e' }}>Send for signature</span>
            </div>
          </div>
        </div>

        {/* Center: active section */}
        <div style={{ overflowY: 'auto', padding: '22px 28px' }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            {active !== '__send' ? (
              <div className="card" style={{ padding: 22 }}>
                <h3 style={{ marginTop: 0, marginBottom: 4 }}>{active}</h3>
                <p style={{ color: '#64748b', fontSize: 13, marginTop: 0 }}>Fill the fields below. Required fields are marked *.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 18px' }}>
                  {fieldsIn(active).map((f) => (
                    <div key={f.key} style={{ gridColumn: ['textarea', 'boolean', 'checkbox_group'].includes(f.type) ? '1 / -1' : 'auto' }}>
                      <Field label={f.label + (f.required ? ' *' : '')}>{inputFor(f)}</Field>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
                  <Button variant="ghost" disabled={sections.indexOf(active) === 0} onClick={() => setActive(sections[Math.max(0, sections.indexOf(active) - 1)])}>Back</Button>
                  {sections.indexOf(active) < sections.length - 1
                    ? <Button onClick={() => setActive(sections[sections.indexOf(active) + 1])}>Next section</Button>
                    : <Button icon={FileSignature} onClick={() => setActive('__send')}>Review &amp; send</Button>}
                </div>
              </div>
            ) : links ? (
              <div className="card" style={{ padding: 24 }}>
                <CheckCircle2 size={40} color="#16a34a" />
                <h3 style={{ marginTop: 10 }}>Sent for signature</h3>
                <p style={{ color: '#64748b' }}>Each party gets a secure link to review the prefilled agreement, upload documents and sign.</p>
                {links.map((l, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 13 }}>{l.name} <span style={{ color: '#94a3b8', fontWeight: 500 }}>· signer {l.order}</span></div><div style={{ fontSize: 12, color: '#64748b', wordBreak: 'break-all' }}>{l.link}</div></div>
                    <Button size="sm" variant="ghost" icon={Copy} onClick={() => { navigator.clipboard.writeText(l.link); toast.success('Copied'); }} />
                  </div>
                ))}
                <div style={{ marginTop: 16 }}><Button onClick={onClose}>Done</Button></div>
              </div>
            ) : (
              <div className="card" style={{ padding: 22 }}>
                <h3 style={{ marginTop: 0 }}><ShieldCheck size={17} style={{ verticalAlign: -3 }} /> Send for signature</h3>
                <p style={{ color: '#64748b', fontSize: 13 }}>{completeCount}/{sections.length} sections complete. Configure KYC and signer emails, then send.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Field label="Collect KYC as"><Select value={kycRole} onChange={(e) => setKycRole(e.target.value)}>{KYC_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</Select></Field>
                  {kycRole !== 'none' && <Field label="KYC policy"><Select value={kycPolicy} onChange={(e) => setKycPolicy(e.target.value)}><option value="flexible">Flexible — sign now, verify after</option><option value="strict">Strict — upload before signing</option></Select></Field>}
                </div>
                {kycRole !== 'none' && <Field label={`Link to ${RELATED_TYPE[kycRole] === 'service_provider' ? 'provider' : 'role profile'} ID (optional — enables auto-activation)`}><Input value={relatedId} onChange={(e) => setRelatedId(e.target.value)} placeholder="e.g. 12" /></Field>}
                <div style={{ fontWeight: 700, fontSize: 13, margin: '10px 0 6px' }}>Signers</div>
                {signers.map((s, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 6 }}>
                    <Field label={`${s.label} — name`}><Input value={s.name} onChange={(e) => setSigners((a) => a.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))} /></Field>
                    <Field label={`${s.label} — email`}><Input value={s.email} onChange={(e) => setSigners((a) => a.map((x, idx) => idx === i ? { ...x, email: e.target.value } : x))} placeholder="required to sign" /></Field>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                  <Button variant="ghost" icon={Eye} onClick={doPreview}>Preview agreement</Button>
                  <Button icon={FileSignature} onClick={send} disabled={sending}>{sending ? <Spinner /> : 'Send for signature'}</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showPrefill && <PrefillModal template={template} onClose={() => setShowPrefill(false)} onApply={applyPrefill} />}

      {preview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 80, display: 'grid', placeItems: 'center', padding: 20 }} onClick={() => setPreview(null)}>
          <div style={{ background: '#fff', width: 'min(840px,96vw)', height: '90vh', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid #e5e7eb' }}><b>Agreement preview (read-only)</b><button className="btn btn-ghost btn-icon" onClick={() => setPreview(null)}><X size={16} /></button></div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 28 }} dangerouslySetInnerHTML={{ __html: preview }} />
          </div>
        </div>
      )}
    </div>
  );
}
