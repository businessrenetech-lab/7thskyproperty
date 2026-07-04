import React, { useCallback, useEffect, useState } from 'react';
import { Check, Circle, ChevronDown, ChevronRight, Play, ListChecks } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Spinner, Badge, Button, Select } from '../ui/kit';

const arr = (v) => (Array.isArray(v) ? v : (() => { try { return JSON.parse(v || '[]'); } catch { return []; } })());
const stageProgress = (s) => {
  const cl = arr(s.checklist);
  const done = cl.filter((c) => c.done).length;
  return { done, total: cl.length };
};

/**
 * Property onboarding & workflow panel.
 * Shows the auto-generated 18-stage rental-management workflow (gated checklists)
 * plus the owner onboarding checklist, both editable inline.
 */
export default function PropertyOnboarding({ propertyId, onChanged }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [onboardItems, setOnboardItems] = useState([]);
  const [openStage, setOpenStage] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [wf, items] = await Promise.all([
        api.get(`/properties/${propertyId}/pm-workflow`),
        api.get(`/properties/${propertyId}/onboarding-items`),
      ]);
      const proj = wf.data.data;
      setProject(proj);
      setOnboardItems(items.data.data || []);
      if (proj?.stages?.length) {
        const cur = proj.stages.find((s) => s.status === 'in_progress') || proj.stages[0];
        setOpenStage(cur?.id || null);
      }
    } catch (e) { toast.error('Failed to load workflow'); }
    finally { setLoading(false); }
  }, [propertyId, toast]);

  useEffect(() => { load(); }, [load]);

  const startWorkflow = async () => {
    setBusy(true);
    try { await api.post(`/properties/${propertyId}/start-workflow`, {}); toast.success('Workflow started'); await load(); onChanged?.(); }
    catch (e) { toast.error(e.response?.data?.error || 'Failed to start workflow'); }
    finally { setBusy(false); }
  };

  const toggleChecklistItem = async (stage, idx) => {
    const checklist = arr(stage.checklist).map((c, i) => (i === idx ? { ...c, done: !c.done, completed_at: !c.done ? new Date().toISOString() : null } : c));
    try {
      await api.patch(`/projects/${project.id}/stages/${stage.id}`, { checklist });
      setProject((p) => ({ ...p, stages: p.stages.map((s) => (s.id === stage.id ? { ...s, checklist } : s)) }));
    } catch { toast.error('Failed to update checklist'); }
  };

  const completeStage = async (stage) => {
    try { const { data } = await api.patch(`/projects/${project.id}/stages/${stage.id}`, { status: 'done' }); setProject(data.data); toast.success(`${stage.stage_name} completed`); onChanged?.(); }
    catch { toast.error('Failed to complete stage'); }
  };

  const patchOnboardItem = async (itemId, patch) => {
    try { await api.patch(`/properties/${propertyId}/onboarding-items/${itemId}`, patch); setOnboardItems((rows) => rows.map((r) => (r.id === itemId ? { ...r, ...patch } : r))); }
    catch { toast.error('Failed to update item'); }
  };

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><Spinner /></div>;

  if (!project) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center' }}>
        <ListChecks size={24} style={{ color: 'var(--muted-2)', marginBottom: 8 }} />
        <p className="cell-sub" style={{ margin: '0 0 12px' }}>No rental-management workflow yet for this property.</p>
        <Button icon={Play} onClick={startWorkflow} disabled={busy}>{busy ? <Spinner /> : 'Start Rental-Management Workflow'}</Button>
      </div>
    );
  }

  const stages = project.stages || [];
  const stagesDone = stages.filter((s) => s.status === 'done').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Workflow progress */}
      <div>
        <div className="between" style={{ marginBottom: 8 }}>
          <h4 className="form-section-title" style={{ margin: 0, border: 'none', padding: 0 }}>Rental-Management Workflow</h4>
          <Badge tone="blue">{stagesDone}/{stages.length} stages</Badge>
        </div>
        <div style={{ height: 8, background: 'var(--border)', borderRadius: 5, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ width: `${stages.length ? (stagesDone / stages.length) * 100 : 0}%`, height: '100%', background: 'var(--success)' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {stages.map((s) => {
            const { done, total } = stageProgress(s);
            const open = openStage === s.id;
            const isCurrent = s.status === 'in_progress';
            return (
              <div key={s.id} className="card" style={{ border: `1px solid ${isCurrent ? 'var(--primary)' : 'var(--border)'}`, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', cursor: 'pointer', background: s.status === 'done' ? 'var(--success-bg)' : isCurrent ? 'var(--primary-50)' : 'var(--surface)' }}
                  onClick={() => setOpenStage(open ? null : s.id)}>
                  {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  <span style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>{s.sort_order}. {s.stage_name}</span>
                  <Badge tone={s.status === 'done' ? 'green' : isCurrent ? 'amber' : 'grey'}>{done}/{total}</Badge>
                  {s.status === 'done' && <Check size={15} color="var(--success)" />}
                </div>
                {open && (
                  <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
                    {arr(s.checklist).map((c, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                        <button className="btn btn-ghost btn-icon btn-sm" style={{ color: c.done ? 'var(--success)' : 'var(--muted-2)' }} onClick={() => toggleChecklistItem(s, idx)}>
                          {c.done ? <Check size={15} /> : <Circle size={15} />}
                        </button>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, textDecoration: c.done ? 'line-through' : 'none', color: c.done ? 'var(--muted)' : 'var(--text)' }}>
                            {c.label} {c.required && !c.done && <span style={{ color: 'var(--danger)' }}>*</span>}
                          </div>
                          <div className="cell-sub" style={{ fontSize: 11 }}>
                            {c.responsible && <>👤 {c.responsible} · </>}{c.evidence_required && <>📎 {c.evidence_required}</>}
                          </div>
                        </div>
                      </div>
                    ))}
                    {s.status !== 'done' && (
                      <Button size="sm" style={{ marginTop: 10 }} onClick={() => completeStage(s)}>Mark stage complete →</Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Owner onboarding checklist */}
      {onboardItems.length > 0 && (
        <div>
          <h4 className="form-section-title">Owner Onboarding Checklist</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {onboardItems.map((it) => (
              <div key={it.id} className="card" style={{ padding: 10, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{it.checklist_item} {it.required && <span style={{ color: 'var(--danger)' }}>*</span>}</div>
                  <div className="cell-sub" style={{ fontSize: 11 }}>{it.evidence_required ? `📎 ${it.evidence_required}` : ''}{it.action_required ? ` · ${it.action_required}` : ''}</div>
                </div>
                <Select value={it.status} onChange={(e) => patchOnboardItem(it.id, { status: e.target.value })} style={{ width: 130 }}>
                  {['pending', 'in_progress', 'done', 'na'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </Select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
