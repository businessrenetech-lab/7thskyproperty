import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus, Check, Target, FileSignature, Trash2, Star } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button, Badge, Drawer, Field, Input, Textarea, Select, KV, Spinner, EmptyState } from '../../ui/kit';
import { MANDATE_STAGES, MANDATE_STAGE_LABEL } from './BusinessMandates';

const ACCENT = '#7c3aed';
const money = (n) => (n == null || n === '' ? '—' : `৳${Number(n).toLocaleString()}`);
const TARGET_STATUS = ['identified', 'shortlisted', 'contacted', 'inspected', 'offer_made', 'under_negotiation', 'rejected', 'acquired'];
const TARGET_TONE = { identified: 'grey', shortlisted: 'blue', contacted: 'blue', inspected: 'amber', offer_made: 'amber', under_negotiation: 'amber', rejected: 'red', acquired: 'green' };
const EMPTY_TARGET = { business_name: '', business_type: '', industry: '', location: '', source: '', asking_price: '', fit_score: 3, status: 'identified', contact_info: '', notes: '' };
const EDIT_FIELDS = ['buyer_name', 'buyer_company', 'preferred_business_type', 'preferred_industry', 'preferred_location', 'budget_min', 'budget_max', 'purchase_purpose', 'financing_status', 'requirements', 'timeline', 'status', 'notes'];

export default function BusinessMandateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [m, setM] = useState(null);
  const [targets, setTargets] = useState([]);
  const [tForm, setTForm] = useState(null);
  const [edit, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadM = useCallback(async () => { try { const { data } = await api.get(`/business-mandates/${id}`); setM(data.data); } catch { toast.error('Failed to load'); navigate('/business/mandates'); } }, [id, navigate, toast]);
  const loadT = useCallback(() => api.get('/business-targets', { params: { mandate_id: id } }).then((r) => setTargets(r.data.data || [])).catch(() => {}), [id]);
  useEffect(() => { loadM(); loadT(); }, [loadM, loadT]);

  const setStage = async (stage) => { try { const { data } = await api.patch(`/business-mandates/${id}/move`, { stage }); setM(data.data); toast.success(`Moved to ${MANDATE_STAGE_LABEL[stage]}`); } catch { toast.error('Failed'); } };
  const saveEdit = async () => { setSaving(true); try { const { data } = await api.put(`/business-mandates/${id}`, edit); setM(data.data); setEdit(null); toast.success('Mandate updated'); } catch (e) { toast.error(e.response?.data?.error || 'Save failed'); } finally { setSaving(false); } };
  const saveTarget = async () => {
    if (!tForm.business_name.trim()) { toast.error('Business name required'); return; }
    setSaving(true);
    try { if (tForm.id) await api.put(`/business-targets/${tForm.id}`, tForm); else await api.post('/business-targets', { ...tForm, mandate_id: id }); toast.success('Target saved'); setTForm(null); loadT(); }
    catch (e) { toast.error(e.response?.data?.error || 'Save failed'); } finally { setSaving(false); }
  };
  const setTargetStatus = async (t, status) => { try { await api.put(`/business-targets/${t.id}`, { status }); loadT(); } catch { toast.error('Failed'); } };
  const delTarget = async (t) => { try { await api.delete(`/business-targets/${t.id}`); loadT(); } catch { toast.error('Failed'); } };

  if (!m) return <div className="pm-scope" style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>;
  const curIdx = MANDATE_STAGES.findIndex(([v]) => v === m.stage);

  return (
    <div className="pm-scope">
      <button onClick={() => navigate('/business/mandates')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: ACCENT, cursor: 'pointer', padding: '4px 0', fontSize: 13 }}><ArrowLeft size={15} /> Back to mandates</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1b1440' }}>{m.buyer_name}</h1>
            <Badge tone="violet">{MANDATE_STAGE_LABEL[m.stage] || m.stage}</Badge>
            <Badge tone={m.status === 'completed' ? 'green' : m.status === 'active' ? 'blue' : 'grey'}>{m.status}</Badge>
          </div>
          <div style={{ color: '#6b7280', fontSize: 13, marginTop: 3 }}>
            <span style={{ fontFamily: 'monospace' }}>{m.mandate_code}</span> · Looking for {[m.preferred_business_type, m.preferred_industry].filter((x) => x && x !== 'any').join(' / ') || 'any business'} · {money(m.budget_min)}–{money(m.budget_max)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" icon={FileSignature} onClick={() => navigate('/business/purchase/agreements')}>Purchase Agreement</Button>
          <Button variant="ghost" icon={Pencil} onClick={() => setEdit(Object.fromEntries(EDIT_FIELDS.map((k) => [k, m[k] ?? ''])))}>Edit</Button>
        </div>
      </div>

      {/* Pipeline stepper */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', margin: '18px 0 20px', paddingBottom: 4 }}>
        {MANDATE_STAGES.map(([v, label], i) => {
          const done = i < curIdx; const current = i === curIdx;
          return (
            <button key={v} onClick={() => setStage(v)} title={label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap',
              background: current ? ACCENT : done ? 'rgba(124,58,237,.10)' : '#fff', color: current ? '#fff' : ACCENT, border: `1px solid ${current ? ACCENT : '#e7e3f3'}`, fontSize: 12.5, fontWeight: current ? 700 : 600 }}>
              {done ? <Check size={13} /> : <span>{i + 1}</span>} {label}
            </button>
          );
        })}
      </div>

      {/* Targets shortlist */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontWeight: 700, color: '#1b1440' }}>Target shortlist <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: 13 }}>({targets.length})</span></div>
        <Button icon={Plus} onClick={() => setTForm({ ...EMPTY_TARGET })}>Add Target</Button>
      </div>
      {targets.length === 0 ? <EmptyState icon={Target} title="No targets yet" sub="Shortlist candidate businesses for this buyer (Business Search & Shortlisting)." /> : (
        <div style={{ display: 'grid', gap: 8 }}>
          {targets.map((t) => (
            <div key={t.id} style={{ background: '#fff', border: '1px solid #e7e3f3', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button onClick={() => setTForm({ ...t })} style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0 }}>
                    <div style={{ fontWeight: 700 }}>{t.business_name}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{[t.business_type, t.industry, t.location].filter(Boolean).join(' · ')}</div>
                  </button>
                  <span style={{ display: 'inline-flex', gap: 1 }}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={13} fill={n <= (t.fit_score || 0) ? ACCENT : 'none'} color={ACCENT} />)}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{money(t.asking_price)}</span>
                  <Select value={t.status} onChange={(e) => setTargetStatus(t, e.target.value)} style={{ maxWidth: 160, fontSize: 12 }}>{TARGET_STATUS.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}</Select>
                  <Badge tone={TARGET_TONE[t.status] || 'grey'}>{t.status.replace(/_/g, ' ')}</Badge>
                  <button onClick={() => delTarget(t)} style={{ background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer' }}><Trash2 size={15} /></button>
                </div>
              </div>
              {t.notes && <div style={{ fontSize: 12.5, color: '#374151', marginTop: 6 }}>{t.notes}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Requirements */}
      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 8 }}>
        <KV k="Purpose" v={m.purchase_purpose} />
        <KV k="Financing" v={m.financing_status} />
        <KV k="Timeline" v={m.timeline} />
        <KV k="Requirements" v={m.requirements} />
      </div>

      {tForm && (
        <Drawer open title={tForm.id ? 'Edit Target' : 'Add Target'} width={520} onClose={() => setTForm(null)}
          footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><Button variant="ghost" onClick={() => setTForm(null)}>Cancel</Button><Button onClick={saveTarget} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button></div>}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Business name" required full><Input value={tForm.business_name} onChange={(e) => setTForm({ ...tForm, business_name: e.target.value })} /></Field>
            <Field label="Type"><Input value={tForm.business_type} onChange={(e) => setTForm({ ...tForm, business_type: e.target.value })} /></Field>
            <Field label="Industry"><Input value={tForm.industry} onChange={(e) => setTForm({ ...tForm, industry: e.target.value })} /></Field>
            <Field label="Location"><Input value={tForm.location} onChange={(e) => setTForm({ ...tForm, location: e.target.value })} /></Field>
            <Field label="Source"><Input value={tForm.source} onChange={(e) => setTForm({ ...tForm, source: e.target.value })} /></Field>
            <Field label="Asking price (৳)"><Input type="number" value={tForm.asking_price} onChange={(e) => setTForm({ ...tForm, asking_price: e.target.value })} /></Field>
            <Field label="Fit score"><Select value={tForm.fit_score} onChange={(e) => setTForm({ ...tForm, fit_score: Number(e.target.value) })}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</Select></Field>
            <Field label="Status"><Select value={tForm.status} onChange={(e) => setTForm({ ...tForm, status: e.target.value })}>{TARGET_STATUS.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}</Select></Field>
            <Field label="Contact info" full><Input value={tForm.contact_info} onChange={(e) => setTForm({ ...tForm, contact_info: e.target.value })} /></Field>
            <Field label="Notes" full><Textarea rows={2} value={tForm.notes} onChange={(e) => setTForm({ ...tForm, notes: e.target.value })} /></Field>
          </div>
        </Drawer>
      )}

      {edit && (
        <Drawer open title={`Edit — ${m.buyer_name}`} width={560} onClose={() => setEdit(null)}
          footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button></div>}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Buyer name" full><Input value={edit.buyer_name} onChange={(e) => setEdit({ ...edit, buyer_name: e.target.value })} /></Field>
            <Field label="Company"><Input value={edit.buyer_company} onChange={(e) => setEdit({ ...edit, buyer_company: e.target.value })} /></Field>
            <Field label="Preferred industry"><Input value={edit.preferred_industry} onChange={(e) => setEdit({ ...edit, preferred_industry: e.target.value })} /></Field>
            <Field label="Budget min (৳)"><Input type="number" value={edit.budget_min} onChange={(e) => setEdit({ ...edit, budget_min: e.target.value })} /></Field>
            <Field label="Budget max (৳)"><Input type="number" value={edit.budget_max} onChange={(e) => setEdit({ ...edit, budget_max: e.target.value })} /></Field>
            <Field label="Financing"><Select value={edit.financing_status} onChange={(e) => setEdit({ ...edit, financing_status: e.target.value })}><option value="cash">Cash</option><option value="needs_finance">Needs finance</option><option value="pre_approved">Pre-approved</option></Select></Field>
            <Field label="Status"><Select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}><option value="active">Active</option><option value="on_hold">On hold</option><option value="completed">Completed</option><option value="withdrawn">Withdrawn</option></Select></Field>
            <Field label="Timeline"><Input value={edit.timeline} onChange={(e) => setEdit({ ...edit, timeline: e.target.value })} /></Field>
            <Field label="Requirements" full><Textarea rows={3} value={edit.requirements} onChange={(e) => setEdit({ ...edit, requirements: e.target.value })} /></Field>
          </div>
        </Drawer>
      )}
    </div>
  );
}
