import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, FileSearch, Sparkles, Plus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { Button, Badge, Field, Input, Select, Textarea, Drawer, Spinner } from '../../../ui/kit';
import UploadButton from '../../../ui/UploadButton';
import { fileSrc } from '../../../ui/FileUpload';

/** Property-file sections that exist only for category='business' (Business SOPs). */
export const BUSINESS_SECTIONS = [
  { key: 'biz_assessment', label: 'Business Assessment', icon: ShieldCheck },
  { key: 'due_diligence', label: 'Due Diligence', icon: FileSearch },
  { key: 'preparation', label: 'Preparation', icon: Sparkles },
];

const asList = (v) => { if (Array.isArray(v)) return v; if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } } return []; };

// ── Business Assessment & Risk (Sale SOP Steps 2, 3, 6) ─────────────────────
const SCORES = [
  ['operational_condition', 'Operational condition'], ['market_attractiveness', 'Market attractiveness'],
  ['business_readiness', 'Business readiness'], ['commercial_viability', 'Commercial viability'],
  ['growth_potential', 'Growth potential'], ['transaction_feasibility', 'Transaction feasibility'], ['presentation_score', 'Presentation'],
];
const RISK_TYPES = ['ownership conflict', 'legal dispute', 'taxation', 'regulatory', 'lease', 'employee dispute', 'licensing gap', 'operational'];
const EMPTY_ASSESS = { assessment_type: 'preliminary', assessment_date: new Date().toISOString().slice(0, 10), summary: '', recommendation: 'proceed', next_steps: '', risks: [] };

export function BusinessAssessmentSection({ propertyId }) {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState(null);
  const load = useCallback(async () => {
    try { const { data } = await api.get('/business-assessments', { params: { property_id: propertyId } }); setRows(data.data || []); }
    catch { setRows([]); toast.error('Could not load assessments'); }
  }, [propertyId, toast]);
  useEffect(() => { load(); }, [load]);
  const save = async () => {
    try { await api.post('/business-assessments', { ...form, property_id: propertyId }); toast.success('Assessment saved'); setForm(null); load(); }
    catch (e) { toast.error(e.response?.data?.error || 'Save failed'); }
  };
  if (rows === null) return <Spinner />;
  return (
    <section className="pm-card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Business assessment &amp; risk</h3>
        <Button icon={Plus} onClick={() => setForm({ ...EMPTY_ASSESS })}>New assessment</Button>
      </div>
      {rows.length === 0 && <p className="cell-sub">No assessments yet — run the preliminary assessment (SOP Step 2).</p>}
      {rows.map((a) => (
        <div key={a.id} className="pm-card" style={{ padding: 12, marginTop: 10 }}>
          <b style={{ textTransform: 'capitalize' }}>{a.assessment_type}</b> · {a.assessment_date || '—'} · <Badge tone={a.recommendation === 'decline' ? 'red' : 'green'}>{a.recommendation || '—'}</Badge>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6, fontSize: 12 }}>
            {SCORES.filter(([k]) => a[k] != null).map(([k, l]) => <span key={k}>{l}: <b>{a[k]}/5</b></span>)}
          </div>
          {asList(a.risks).map((r, i) => <div key={i} style={{ fontSize: 12, color: '#b91c1c', marginTop: 4 }}><AlertTriangle size={12} /> {r.category}: {r.description}</div>)}
          {a.summary && <p style={{ fontSize: 13, marginBottom: 0 }}>{a.summary}</p>}
        </div>
      ))}
      {form && (
        <Drawer open title="New business assessment" width={560} onClose={() => setForm(null)}
          footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button><Button onClick={save}>Save</Button></div>}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Type"><Select value={form.assessment_type} onChange={(e) => setForm({ ...form, assessment_type: e.target.value })}><option value="preliminary">Preliminary (Step 2)</option><option value="risk">Risk identification (Step 3)</option><option value="presentation">Presentation (Step 6)</option></Select></Field>
            <Field label="Date"><Input type="date" value={form.assessment_date} onChange={(e) => setForm({ ...form, assessment_date: e.target.value })} /></Field>
            {SCORES.map(([k, l]) => (
              <Field key={k} label={`${l} (1–5)`}><Input type="number" min="1" max="5" value={form[k] ?? ''} onChange={(e) => setForm({ ...form, [k]: e.target.value === '' ? null : Number(e.target.value) })} /></Field>
            ))}
            <Field label="Recommendation"><Select value={form.recommendation} onChange={(e) => setForm({ ...form, recommendation: e.target.value })}><option value="proceed">Proceed</option><option value="proceed_with_conditions">Proceed with conditions</option><option value="decline">Decline</option></Select></Field>
          </div>
          <div style={{ marginTop: 12, fontWeight: 700, fontSize: 13 }}>Risks identified</div>
          {form.risks.map((r, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 28px', gap: 6, marginTop: 6 }}>
              <Select value={r.category} onChange={(e) => setForm({ ...form, risks: form.risks.map((x, j) => (j === i ? { ...x, category: e.target.value } : x)) })}>{RISK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select>
              <Input value={r.description} onChange={(e) => setForm({ ...form, risks: form.risks.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)) })} />
              <button type="button" onClick={() => setForm({ ...form, risks: form.risks.filter((_, j) => j !== i) })} style={{ border: 'none', background: 'none', color: '#b91c1c', cursor: 'pointer' }}>×</button>
            </div>
          ))}
          <Button size="sm" variant="ghost" icon={Plus} style={{ marginTop: 6 }} onClick={() => setForm({ ...form, risks: [...form.risks, { category: RISK_TYPES[0], description: '' }] })}>Add risk</Button>
          <Field label="Summary"><Textarea rows={3} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></Field>
          <Field label="Next steps"><Textarea rows={2} value={form.next_steps} onChange={(e) => setForm({ ...form, next_steps: e.target.value })} /></Field>
        </Drawer>
      )}
    </section>
  );
}

// ── Due Diligence register (Sale Steps 7, 19–21; Purchase Steps 15–17) ─────
const DOC_TONE = { required: 'grey', received: 'blue', verified: 'green', rejected: 'red' };

export function DueDiligenceSection({ propertyId }) {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [escalate, setEscalate] = useState(null); // { doc, note }
  const load = useCallback(async () => {
    try { const { data } = await api.get('/business-documents', { params: { property_id: propertyId } }); setRows(data.data || []); }
    catch { setRows([]); toast.error('Could not load the due-diligence register'); }
  }, [propertyId, toast]);
  useEffect(() => { load(); }, [load]);
  const seed = async () => { try { await api.post('/business-documents/seed-checklist', { property_id: propertyId }); load(); } catch { toast.error('Could not create the checklist'); } };
  const setFile = async (doc, file_url) => { try { await api.put(`/business-documents/${doc.id}`, { file_url, status: file_url ? 'received' : 'required' }); load(); } catch { toast.error('Upload not saved'); } };
  const verify = async (doc) => { try { await api.patch(`/business-documents/${doc.id}/verify`, { status: 'verified' }); load(); } catch { toast.error('Could not verify'); } };
  const sendEscalation = async () => {
    try { await api.post(`/business-documents/${escalate.doc.id}/escalate`, { note: escalate.note }); toast.success('Escalated to management'); setEscalate(null); load(); }
    catch (e) { toast.error(e.response?.data?.error || 'Escalation failed'); }
  };
  if (rows === null) return <Spinner />;
  return (
    <section className="pm-card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Due diligence</h3>
        <Button variant="ghost" onClick={seed}>{rows.length ? 'Add missing items' : 'Create SOP checklist'}</Button>
      </div>
      <table className="tbl" style={{ marginTop: 10 }}>
        <thead><tr><th>Document</th><th>Status</th><th>File</th><th /></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={4} className="cell-sub">No checklist yet.</td></tr>}
          {rows.map((d) => (
            <tr key={d.id}>
              <td>{d.name}{d.notes && <div className="cell-sub" style={{ whiteSpace: 'pre-wrap' }}>{d.notes}</div>}</td>
              <td><Badge tone={DOC_TONE[d.status] || 'grey'}>{d.status === 'rejected' ? 'flagged' : d.status}</Badge></td>
              <td>{d.file_url ? <a href={fileSrc(d.file_url)} target="_blank" rel="noreferrer">View</a> : <UploadButton value={d.file_url || ''} onChange={(url) => setFile(d, url)} folder="documents" />}</td>
              <td style={{ whiteSpace: 'nowrap' }}>
                {d.status === 'received' && <Button size="sm" variant="ghost" icon={CheckCircle2} onClick={() => verify(d)}>Verify</Button>}
                {d.status !== 'rejected' && <Button size="sm" variant="ghost" icon={AlertTriangle} onClick={() => setEscalate({ doc: d, note: '' })}>Escalate</Button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {escalate && (
        <Drawer open title={`Escalate — ${escalate.doc.name}`} width={440} onClose={() => setEscalate(null)}
          footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><Button variant="ghost" onClick={() => setEscalate(null)}>Cancel</Button><Button onClick={sendEscalation}>Escalate</Button></div>}>
          <p className="cell-sub">SOP Step 20 — suspicious records, hidden liabilities, ownership inconsistency or legal disputes go to management immediately.</p>
          <Field label="What is the concern?"><Textarea rows={4} value={escalate.note} onChange={(e) => setEscalate({ ...escalate, note: e.target.value })} /></Field>
        </Drawer>
      )}
    </section>
  );
}

// ── Preparation checklist (Sale Steps 6, 8) ────────────────────────────────
const PREP_ITEMS = ['Cleaning', 'Maintenance', 'Photography', 'Videography', 'Business profile preparation', 'Signage improvement', 'Presentation improvement'];

export function PreparationSection({ propertyId }) {
  const toast = useToast();
  const [items, setItems] = useState(null);
  useEffect(() => {
    api.get(`/properties/${propertyId}/business-profile`).then(({ data }) => {
      const saved = asList(data.data?.preparation);
      setItems(PREP_ITEMS.map((label) => saved.find((s) => s.label === label) || { label, status: 'not_started', owner: '', due_date: '' }));
    }).catch(() => setItems([]));
  }, [propertyId]);
  const update = (i, patch) => setItems((cur) => cur.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const save = async () => {
    try { await api.put(`/properties/${propertyId}/business-profile`, { preparation: items }); toast.success('Preparation saved'); }
    catch (e) { toast.error(e.response?.data?.error || 'Save failed'); }
  };
  if (items === null) return <Spinner />;
  return (
    <section className="pm-card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Preparation</h3>
        <Button onClick={save}>Save</Button>
      </div>
      <table className="tbl" style={{ marginTop: 10 }}>
        <thead><tr><th>Item</th><th>Status</th><th>Owner</th><th>Due</th></tr></thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={it.label}>
              <td>{it.label}</td>
              <td><Select value={it.status} onChange={(e) => update(i, { status: e.target.value })}><option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="done">Done</option><option value="not_required">Not required</option></Select></td>
              <td><Input value={it.owner} onChange={(e) => update(i, { owner: e.target.value })} /></td>
              <td><Input type="date" value={it.due_date} onChange={(e) => update(i, { due_date: e.target.value })} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
