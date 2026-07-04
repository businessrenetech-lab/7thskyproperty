import React, { useCallback, useEffect, useState } from 'react';
import { Plus, ClipboardCheck, Wrench, CheckCircle2, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, DataTable, StatusBadge, Drawer, Spinner, Badge, Button, Field, Input, Select, Textarea } from '../ui/kit';
import { Combo } from '../ui/pickers';

const money = (v) => (v == null || v === '' ? '—' : '৳' + Number(v).toLocaleString());
const READINESS_TONE = { not_ready: 'red', action_required: 'amber', ready_for_marketing: 'green' };
const ITEM_STATUS = ['pending', 'in_progress', 'done', 'na'];
const CONDITIONS = ['na', 'good', 'fair', 'poor', 'damaged'];

/** Readiness bar + status chip. */
function ReadinessHeader({ a }) {
  const score = a.readiness_score || 0;
  return (
    <div className="card" style={{ background: 'var(--surface-2)', padding: 14 }}>
      <div className="between" style={{ marginBottom: 8 }}>
        <div>
          <span className="code-chip">{a.assessment_code}</span>
          <span style={{ marginLeft: 8, fontWeight: 700 }}>{a.property?.title || ''}</span>
        </div>
        <Badge tone={READINESS_TONE[a.readiness_status] || 'grey'} dot>{(a.readiness_status || 'not_ready').replace(/_/g, ' ')}</Badge>
      </div>
      <div style={{ height: 10, background: 'var(--border)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: score >= 80 ? 'var(--success)' : score >= 40 ? 'var(--warning)' : 'var(--danger)', transition: 'width .3s' }} />
      </div>
      <div className="cell-sub" style={{ marginTop: 4 }}>Readiness score: <strong>{score}%</strong></div>
    </div>
  );
}

/** Reusable assessment view (item grid + actions). Used in global drawer + property tab. */
export function AssessmentView({ assessment, onReload }) {
  const toast = useToast();
  const [a, setA] = useState(assessment);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setA(assessment); }, [assessment]);

  const patchItem = async (itemId, patch) => {
    try {
      const { data } = await api.put(`/rental-assessments/${a.id}/items/${itemId}`, patch);
      // Update local item + readiness without full reload for snappiness
      setA((prev) => ({
        ...prev,
        readiness_score: data.readiness?.score ?? prev.readiness_score,
        readiness_status: data.readiness?.status ?? prev.readiness_status,
        items: prev.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
      }));
    } catch { toast.error('Failed to update item'); }
  };

  const patchHeader = async (patch) => {
    try { await api.put(`/rental-assessments/${a.id}`, patch); onReload?.(); }
    catch { toast.error('Failed to update assessment'); }
  };

  const generateWO = async () => {
    setBusy(true);
    try { const { data } = await api.post(`/rental-assessments/${a.id}/generate-work-orders`, {}); toast.success(data.message); onReload?.(); }
    catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setBusy(false); }
  };

  const complete = async (override = false) => {
    setBusy(true);
    try { const { data } = await api.post(`/rental-assessments/${a.id}/complete`, { override }); toast.success(data.message); onReload?.(); }
    catch (e) {
      const msg = e.response?.data?.error || 'Failed';
      if (msg.includes('not ready') && window.confirm(msg + '\n\nOverride as manager and mark ready for marketing anyway?')) return complete(true);
      toast.error(msg);
    } finally { setBusy(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <ReadinessHeader a={a} />

      <div className="form-grid">
        <Field label="Market Rent Min (৳)"><Input type="number" defaultValue={a.market_rent_min || ''} onBlur={(e) => patchHeader({ market_rent_min: e.target.value })} /></Field>
        <Field label="Market Rent Max (৳)"><Input type="number" defaultValue={a.market_rent_max || ''} onBlur={(e) => patchHeader({ market_rent_max: e.target.value })} /></Field>
        <Field label="Recommended Rent (৳)"><Input type="number" defaultValue={a.recommended_rent || ''} onBlur={(e) => patchHeader({ recommended_rent: e.target.value })} /></Field>
        <Field label="Approved Rent (৳)"><Input type="number" defaultValue={a.approved_rent || ''} onBlur={(e) => patchHeader({ approved_rent: e.target.value })} placeholder="Writes to property" /></Field>
      </div>

      <div className="between">
        <h4 className="form-section-title" style={{ margin: 0, border: 'none', padding: 0 }}>Assessment Items</h4>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="sm" variant="ghost" icon={Wrench} onClick={generateWO} disabled={busy}>Generate Work Orders</Button>
          <Button size="sm" icon={CheckCircle2} onClick={() => complete(false)} disabled={busy}>Mark Ready</Button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(a.items || []).map((it) => (
          <div key={it.id} className="card" style={{ padding: 10, border: '1px solid var(--border)' }}>
            <div className="between" style={{ marginBottom: 6 }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{it.assessment_item}</span>
                {it.section && <span className="cell-sub"> · {it.section}</span>}
                {it.is_blocking && <Badge tone="red">Blocks marketing</Badge>}
                {it.work_order_id && <Badge tone="blue">WO #{it.work_order_id}</Badge>}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Select value={it.condition_rating} onChange={(e) => patchItem(it.id, { condition_rating: e.target.value })} style={{ width: 100 }}>
                  {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
                <Select value={it.status} onChange={(e) => patchItem(it.id, { status: e.target.value })} style={{ width: 120 }}>
                  {ITEM_STATUS.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </Select>
              </div>
            </div>
            <div className="form-grid">
              <Input placeholder="Finding / decision…" defaultValue={it.finding || ''} onBlur={(e) => e.target.value !== (it.finding || '') && patchItem(it.id, { finding: e.target.value })} />
              <Input placeholder="Required action…" defaultValue={it.required_action || ''} onBlur={(e) => e.target.value !== (it.required_action || '') && patchItem(it.id, { required_action: e.target.value })} />
            </div>
          </div>
        ))}
      </div>

      <Field label="Summary"><Textarea defaultValue={a.summary || ''} onBlur={(e) => e.target.value !== (a.summary || '') && patchHeader({ summary: e.target.value })} /></Field>
    </div>
  );
}

/** Property-scoped panel for embedding in the property detail "Rental Assessment" tab. */
export function PropertyAssessmentPanel({ propertyId, ownerContactId }) {
  const toast = useToast();
  const [a, setA] = useState(undefined); // undefined=loading, null=none
  const load = useCallback(async () => {
    try { const { data } = await api.get(`/rental-assessments/property/${propertyId}`); setA(data.data); }
    catch { setA(null); }
  }, [propertyId]);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    try { const { data } = await api.post('/rental-assessments', { property_id: propertyId, owner_contact_id: ownerContactId }); toast.success(data.message); setA(data.data); }
    catch (e) { toast.error(e.response?.data?.error || 'Failed to create assessment'); }
  };

  if (a === undefined) return <div style={{ padding: 24, textAlign: 'center' }}><Spinner /></div>;
  if (a === null) return (
    <div style={{ padding: '32px 0', textAlign: 'center' }}>
      <ClipboardCheck size={24} style={{ color: 'var(--muted-2)', marginBottom: 8 }} />
      <p className="cell-sub" style={{ margin: '0 0 12px' }}>No rental assessment yet. Start one to score readiness and gate marketing.</p>
      <Button icon={Plus} onClick={create}>Start Rental Assessment</Button>
    </div>
  );
  return <AssessmentView assessment={a} onReload={load} />;
}

export default function RentalAssessments() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [propertyId, setPropertyId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/rental-assessments?limit=200'); setRows(data.data || []); }
    catch { toast.error('Failed to load assessments'); }
    finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const loadDetail = useCallback(async (id) => {
    try { const { data } = await api.get(`/rental-assessments/${id}`); setDetail(data.data); }
    catch { toast.error('Failed to load assessment'); }
  }, [toast]);
  useEffect(() => { if (selectedId) loadDetail(selectedId); else setDetail(null); }, [selectedId, loadDetail]);

  const create = async () => {
    if (!propertyId) return toast.error('Select a property');
    setSaving(true);
    try { const { data } = await api.post('/rental-assessments', { property_id: propertyId }); toast.success(data.message); setShowCreate(false); setPropertyId(null); await load(); setSelectedId(data.data.id); }
    catch (e) { toast.error(e.response?.data?.error || 'Create failed'); }
    finally { setSaving(false); }
  };

  const columns = [
    { key: 'assessment_code', header: 'Code', render: (r) => <span className="code-chip">{r.assessment_code}</span> },
    { key: 'property', header: 'Property', render: (r) => r.property ? <div><div className="cell-strong">{r.property.title}</div><div className="cell-sub">{r.property.property_code}</div></div> : '—' },
    { key: 'recommended_rent', header: 'Recommended Rent', render: (r) => money(r.recommended_rent) },
    { key: 'readiness', header: 'Readiness', render: (r) => <Badge tone={READINESS_TONE[r.readiness_status] || 'grey'} dot>{(r.readiness_status || '').replace(/_/g, ' ')} · {r.readiness_score || 0}%</Badge> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <>
      <PageHead title="Rental Assessments" desc="Property readiness assessments — score cleanliness, safety, utilities and prep actions before marketing."
        actions={<Button icon={Plus} onClick={() => setShowCreate(true)}>New Assessment</Button>} />
      <div className="card"><DataTable columns={columns} rows={rows} loading={loading} onRowClick={(r) => setSelectedId(r.id)} /></div>

      {showCreate && (
        <Drawer title="New Rental Assessment" width={480} onClose={() => setShowCreate(false)}
          footer={<><Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button><Button onClick={create} disabled={saving}>{saving ? <Spinner /> : 'Create'}</Button></>}>
          <Field label="Property" required>
            <Combo endpoint="/properties?listing_type=rent" labelFn={(p) => `${p.title} · ${p.property_code}`} value={propertyId} onChange={setPropertyId} placeholder="Select rental property…" />
          </Field>
          <p className="cell-sub" style={{ marginTop: 10 }}>A default checklist (cleanliness, safety, utilities, furnishings, repairs, painting, renovation, market rent) will be seeded.</p>
        </Drawer>
      )}

      {selectedId && (
        <Drawer title="Rental Assessment" width={720} onClose={() => setSelectedId(null)}>
          {!detail ? <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div> : <AssessmentView assessment={detail} onReload={() => { loadDetail(selectedId); load(); }} />}
        </Drawer>
      )}
    </>
  );
}
