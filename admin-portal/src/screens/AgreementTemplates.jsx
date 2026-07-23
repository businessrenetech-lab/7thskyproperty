import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Upload, Plus, Trash2, FileSignature, Eye, Wand2, Copy, X, PencilRuler } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Spinner, Badge, Button, Drawer, Field, Input, Select, Textarea, EmptyState } from '../ui/kit';
import AgreementBuilder from './AgreementBuilder';

const FIELD_TYPES = ['text', 'date', 'number', 'currency', 'percentage', 'email', 'tel', 'checkbox_group', 'signature'];

export default function AgreementTemplates() {
  const toast = useToast();
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true);
  const [review, setReview] = useState(null); const [prepare, setPrepare] = useState(null); const [build, setBuild] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => { setLoading(true); try { const { data } = await api.get('/agreement-templates?limit=200'); setRows(data.data || []); } catch { } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);

  const onFile = async (e) => {
    const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const { data } = await api.post('/agreement-templates/parse', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(data.message);
      setReview({ name: file.name.replace(/\.docx?$/i, ''), category: 'other', vertical: '', ...data.data });
    } catch (e) { toast.error(e.response?.data?.error || 'Could not parse the document.'); } finally { setBusy(false); }
  };

  return (
    <div className="pm-scope">
      <PageHead title="Agreement Templates" desc="Upload a Word agreement — we detect the fillable fields. Then fill from here and send for e-signing."
        actions={<><input ref={fileRef} type="file" accept=".docx,.doc" onChange={onFile} style={{ display: 'none' }} /><Button icon={Upload} onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? <Spinner /> : 'Upload & detect fields'}</Button></>} />

      {loading ? <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div> : !rows.length ? (
        <div className="pm-card"><EmptyState icon={FileText} title="No templates yet" hint="Upload a .docx agreement to detect its fillable fields and make it reusable." /></div>
      ) : (
        <div className="pm-card" style={{ overflowX: 'auto' }}>
          <table className="pm-tbl">
            <thead><tr><th>Template</th><th>Category</th><th>Vertical</th><th>Fields</th><th>Signers</th><th>Status</th><th /></tr></thead>
            <tbody>{rows.map((t) => (
              <tr key={t.id}>
                <td className="cell-strong">{t.name}</td>
                <td style={{ textTransform: 'capitalize' }}>{(t.category || '').replace(/_/g, ' ')}</td>
                <td>{t.vertical || '—'}</td>
                <td><Badge tone="blue">{(t.fields || []).length}</Badge></td>
                <td>{(t.signers || []).length}</td>
                <td><Badge tone={t.status === 'active' ? 'green' : 'grey'} dot>{t.status}</Badge></td>
                <td style={{ textAlign: 'right' }}><div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><Button size="sm" variant="ghost" onClick={() => api.get(`/agreement-templates/${t.id}`).then(({ data }) => setReview(data.data))}>Edit</Button><Button size="sm" variant="ghost" icon={FileSignature} onClick={() => api.get(`/agreement-templates/${t.id}`).then(({ data }) => setPrepare(data.data))}>Quick send</Button><Button size="sm" icon={PencilRuler} onClick={() => api.get(`/agreement-templates/${t.id}`).then(({ data }) => setBuild(data.data))}>Build &amp; send</Button></div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {review && <ReviewDrawer tpl={review} onClose={() => setReview(null)} onSaved={() => { setReview(null); load(); }} />}
      {prepare && <PrepareDrawer tpl={prepare} onClose={() => setPrepare(null)} />}
      {build && <AgreementBuilder template={build} onClose={() => setBuild(null)} />}
    </div>
  );
}

// ─── REVIEW: confirm detected fields before saving ──────────────────────────
function ReviewDrawer({ tpl, onClose, onSaved }) {
  const toast = useToast();
  const [name, setName] = useState(tpl.name || '');
  const [category, setCategory] = useState(tpl.category || 'other');
  const [vertical, setVertical] = useState(tpl.vertical || '');
  const [fields, setFields] = useState((tpl.fields || []).map((f) => ({ ...f })));
  const [signers, setSigners] = useState(tpl.signers || []);
  const [busy, setBusy] = useState(false);

  const setField = (i, patch) => setFields((fs) => fs.map((f, idx) => idx === i ? { ...f, ...patch } : f));
  const removeField = (i) => setFields((fs) => fs.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!name) return toast.error('Template name required');
    setBusy(true);
    try {
      const body = { name, category, vertical, content_html: tpl.content_html, fields, signers, source_filename: tpl.source_filename };
      if (tpl.id) await api.put(`/agreement-templates/${tpl.id}`, body); else await api.post('/agreement-templates', body);
      toast.success('Template saved'); onSaved();
    } catch (e) { toast.error(e.response?.data?.error || 'Save failed'); } finally { setBusy(false); }
  };

  return (
    <Drawer title={tpl.id ? 'Edit template' : 'Review detected fields'} width={720} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? <Spinner /> : 'Save template'}</Button></>}>
      <div className="pm-scope">
        <div className="form-grid">
          <Field label="Template name" required><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Category"><Select value={category} onChange={(e) => setCategory(e.target.value)}><option value="customer_service">Customer service</option><option value="provider_master">Provider master</option><option value="tenancy">Tenancy</option><option value="other">Other</option></Select></Field>
        </div>
        <Field label="Vertical (optional)"><Input value={vertical} onChange={(e) => setVertical(e.target.value)} placeholder="water_tank" /></Field>

        <div className="form-section-title">Signers ({signers.length})</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {signers.map((s, i) => <Badge key={i} tone={s.is_org ? 'blue' : 'grey'}>{s.label} · order {s.order}</Badge>)}
        </div>

        <div className="form-section-title">Fields ({fields.length}) — confirm, rename, retype or remove</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '52vh', overflowY: 'auto' }}>
          {fields.map((f, i) => (
            <div key={i} className="pm-card" style={{ padding: '8px 10px', display: 'grid', gridTemplateColumns: '1fr 130px 92px 30px', gap: 8, alignItems: 'center' }}>
              <Input value={f.label} onChange={(e) => setField(i, { label: e.target.value })} placeholder="Field label" />
              <Select value={f.type} onChange={(e) => setField(i, { type: e.target.value })}>{FIELD_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}</Select>
              <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}><input type="checkbox" checked={!!f.required} onChange={(e) => setField(i, { required: e.target.checked })} />req.</label>
              <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--danger)' }} onClick={() => removeField(i)}><Trash2 size={13} /></button>
              {f.type === 'checkbox_group' && <div className="cell-sub" style={{ gridColumn: '1 / -1', fontSize: 11 }}>{(f.options || []).length} options: {(f.options || []).slice(0, 6).join(', ')}{(f.options || []).length > 6 ? '…' : ''}</div>}
            </div>
          ))}
        </div>
      </div>
    </Drawer>
  );
}

// ─── PREPARE: fill fields → preview → send for signing ──────────────────────
// Which KYC role a template category defaults to.
const CATEGORY_KYC_ROLE = { tenancy: 'tenant', provider_master: 'provider', customer_service: 'none' };
const KYC_ROLES = [
  { value: 'none', label: 'No KYC (customer / simple sign)' },
  { value: 'tenant', label: 'Tenant' }, { value: 'landlord', label: 'Landlord' },
  { value: 'buyer', label: 'Buyer' }, { value: 'vendor', label: 'Vendor / Seller' },
  { value: 'provider', label: 'Service provider' },
];

function PrepareDrawer({ tpl, onClose }) {
  const toast = useToast();
  const [values, setValues] = useState({});
  const [signerEmails, setSignerEmails] = useState((tpl.signers || []).map((s) => ({ ...s, email: '', name: s.label })));
  const [preview, setPreview] = useState(null);
  const [links, setLinks] = useState(null);
  const [busy, setBusy] = useState(false);
  const [kycRole, setKycRole] = useState(CATEGORY_KYC_ROLE[tpl.category] || 'none');
  const [kycPolicy, setKycPolicy] = useState('flexible');
  const [relatedId, setRelatedId] = useState('');
  // KYC role → the operational record the intake links to (drives auto-activation).
  const RELATED_TYPE = { provider: 'service_provider', tenant: 'party_role', landlord: 'party_role', vendor: 'party_role', buyer: 'party_role' };

  const setVal = (k, v) => setValues((s) => ({ ...s, [k]: v }));
  const toggleOpt = (k, opt) => setValues((s) => { const arr = Array.isArray(s[k]) ? s[k] : []; return { ...s, [k]: arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt] }; });
  const groups = [...new Set((tpl.fields || []).filter((f) => f.type !== 'checkbox_group').map((f) => f.group || 'General'))];

  const doPreview = async () => { try { const { data } = await api.post(`/agreement-templates/${tpl.id}/preview`, { values }); setPreview(data.html); } catch { toast.error('Preview failed'); } };
  const send = async () => {
    const signers = signerEmails.filter((s) => s.email);
    if (!signers.length) return toast.error('Add at least one signer email');
    setBusy(true);
    try {
      const body = { values, signers };
      if (kycRole && kycRole !== 'none') {
        body.kyc_role = kycRole; body.kyc_policy = kycPolicy;
        if (relatedId && RELATED_TYPE[kycRole]) { body.related_type = RELATED_TYPE[kycRole]; body.related_id = Number(relatedId); }
      }
      const { data } = await api.post(`/agreement-templates/${tpl.id}/prepare`, body);
      setLinks(data.links || []); toast.success(data.message);
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); } finally { setBusy(false); }
  };

  const inputFor = (f) => {
    if (f.type === 'checkbox_group') return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {(f.options || []).map((o) => { const on = Array.isArray(values[f.key]) && values[f.key].includes(o); return <button key={o} type="button" className={`pm-pill ${on ? 'active' : ''}`} onClick={() => toggleOpt(f.key, o)}>{on ? '✓ ' : ''}{o}</button>; })}
      </div>
    );
    const type = f.type === 'currency' || f.type === 'percentage' ? 'number' : f.type === 'tel' ? 'text' : f.type;
    return <Input type={['date', 'number', 'email'].includes(type) ? type : 'text'} value={values[f.key] || ''} onChange={(e) => setVal(f.key, e.target.value)} placeholder={f.type === 'currency' ? '৳ amount' : f.type === 'percentage' ? '%' : ''} />;
  };

  return (
    <Drawer title={`Prepare — ${tpl.name}`} width={760} onClose={onClose}
      footer={links ? <Button onClick={onClose}>Done</Button> : <><Button variant="ghost" icon={Eye} onClick={doPreview}>Preview</Button><Button icon={FileSignature} onClick={send} disabled={busy}>{busy ? <Spinner /> : 'Send for signing'}</Button></>}>
      <div className="pm-scope">
        {links ? (
          <div>
            <div className="form-section-title" style={{ marginTop: 0 }}>Sent — secure links (also emailed)</div>
            {links.map((l, i) => (
              <div key={i} className="pm-row" style={{ padding: '9px 0' }}>
                <div className="grow"><div style={{ fontWeight: 600, fontSize: 13 }}>{l.name} <span className="cell-sub">· signer {l.order}</span></div><div className="sub" style={{ wordBreak: 'break-all' }}>{l.link}</div></div>
                <Button size="sm" variant="ghost" icon={Copy} onClick={() => { navigator.clipboard.writeText(l.link); toast.success('Copied'); }} />
              </div>
            ))}
          </div>
        ) : (<>
          <div className="form-section-title" style={{ marginTop: 0 }}>KYC & signing</div>
          <div className="form-grid">
            <Field label="Collect KYC as"><Select value={kycRole} onChange={(e) => setKycRole(e.target.value)}>{KYC_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</Select></Field>
            {kycRole !== 'none' && (
              <Field label="KYC policy"><Select value={kycPolicy} onChange={(e) => setKycPolicy(e.target.value)}>
                <option value="flexible">Flexible — can sign now, verify after</option>
                <option value="strict">Strict — must upload before signing</option>
              </Select></Field>
            )}
          </div>
          {kycRole !== 'none' && (
            <Field label={`Link to ${RELATED_TYPE[kycRole] === 'service_provider' ? 'provider' : 'role profile'} ID (optional)`}>
              <Input value={relatedId} onChange={(e) => setRelatedId(e.target.value)} placeholder="e.g. 12 — enables auto-activation of that record" />
            </Field>
          )}
          {kycRole !== 'none' && <div className="cell-sub" style={{ marginBottom: 8, fontSize: 12 }}>Signers get an intake link: upload documents → review → sign. Activation stays gated until KYC is verified.</div>}

          <div className="form-section-title">Signers</div>
          {signerEmails.map((s, i) => (
            <div key={i} className="form-grid" style={{ marginBottom: 4 }}>
              <Field label={`${s.label} — name`}><Input value={s.name} onChange={(e) => setSignerEmails((arr) => arr.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))} /></Field>
              <Field label={`${s.label} — email`}><Input value={s.email} onChange={(e) => setSignerEmails((arr) => arr.map((x, idx) => idx === i ? { ...x, email: e.target.value } : x))} placeholder="required to sign" /></Field>
            </div>
          ))}

          {/* Checkbox selections */}
          {(tpl.fields || []).filter((f) => f.type === 'checkbox_group').length > 0 && <div className="form-section-title">Selections</div>}
          {(tpl.fields || []).filter((f) => f.type === 'checkbox_group').map((f) => (
            <Field key={f.key} label={f.label}>{inputFor(f)}</Field>
          ))}

          {/* Text fields grouped */}
          {groups.map((g) => (
            <div key={g}>
              <div className="form-section-title">{g}</div>
              <div className="form-grid">
                {(tpl.fields || []).filter((f) => f.type !== 'checkbox_group' && (f.group || 'General') === g).map((f) => (
                  <Field key={f.key} label={f.label + (f.required ? ' *' : '')}>{inputFor(f)}</Field>
                ))}
              </div>
            </div>
          ))}
        </>)}
      </div>
      {preview && <PreviewModal html={preview} onClose={() => setPreview(null)} />}
    </Drawer>
  );
}

function PreviewModal({ html, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 60, display: 'grid', placeItems: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#fff', width: 'min(820px,96vw)', height: '90vh', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}><b>Agreement preview</b><button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}><X size={15} /></button></div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }} dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
