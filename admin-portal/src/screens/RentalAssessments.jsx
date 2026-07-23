import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, ClipboardCheck, Wrench, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight, Camera, Trash2, FileDown } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, DataTable, StatusBadge, Drawer, Spinner, Badge, Button, Field, Input, Select, Textarea } from '../ui/kit';
import { Combo } from '../ui/pickers';
import { fileSrc } from '../ui/FileUpload';

const money = (v) => (v == null || v === '' ? '—' : '৳' + Number(v).toLocaleString());
const READINESS_TONE = { not_ready: 'red', action_required: 'amber', ready_for_marketing: 'green' };
const parsePhotos = (v) => { if (Array.isArray(v)) return v; try { const p = JSON.parse(v || '[]'); return Array.isArray(p) ? p : []; } catch { return []; } };

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

/** Y/N/— verdict toggle for Clean / Undamaged / Working. */
function Verdict({ label, value, onChange }) {
  const next = value === true ? false : value === false ? null : true; // cycle Y → N → —
  const bg = value === true ? '#dcfce7' : value === false ? '#fee2e2' : 'var(--surface-2,#f1f5f9)';
  const fg = value === true ? '#15803d' : value === false ? '#b91c1c' : 'var(--muted-2,#94a3b8)';
  return (
    <button type="button" onClick={() => onChange(next)} title={`${label}: click to change`}
      style={{ minWidth: 44, padding: '5px 0', borderRadius: 8, border: '1px solid var(--line,#e5e7eb)', background: bg, color: fg, fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
      {value === true ? 'Y' : value === false ? 'N' : '—'}
    </button>
  );
}

/** One checklist row: item | Clean | Undamaged | Working | comment | photos. */
function ItemRow({ it, onPatch, onRemove }) {
  const photoRef = useRef();
  const photos = parsePhotos(it.photos);
  const [uploading, setUploading] = useState(false);

  const addPhotos = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls = [...photos];
      for (const f of files) {
        const fd = new FormData(); fd.append('file', f);
        const { data } = await api.post('/uploads?folder=documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        urls.push(data.data.url);
      }
      await onPatch({ photos: urls });
    } catch { alert('Photo upload failed'); }
    finally { setUploading(false); }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(150px,1.3fr) 44px 44px 44px minmax(120px,1fr) auto', gap: 8, alignItems: 'center', padding: '8px 10px', borderTop: '1px solid var(--line-soft,#f1f5f9)' }}>
      <div style={{ fontSize: 13, fontWeight: 600 }}>
        {it.assessment_item}
        {it.is_blocking && <Badge tone="red" style={{ marginLeft: 6 }}>blocking</Badge>}
        {it.work_order_id && <Badge tone="blue">WO #{it.work_order_id}</Badge>}
      </div>
      <Verdict label="Clean" value={it.is_clean} onChange={(v) => onPatch({ is_clean: v })} />
      <Verdict label="Undamaged" value={it.is_undamaged} onChange={(v) => onPatch({ is_undamaged: v })} />
      <Verdict label="Working" value={it.is_working} onChange={(v) => onPatch({ is_working: v })} />
      <Input placeholder="Comment…" defaultValue={it.finding || ''} onBlur={(e) => e.target.value !== (it.finding || '') && onPatch({ finding: e.target.value })} style={{ fontSize: 12.5 }} />
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {photos.slice(0, 4).map((u, i) => (
          <a key={i} href={fileSrc(u)} target="_blank" rel="noreferrer">
            <img src={fileSrc(u)} alt="" style={{ width: 34, height: 28, objectFit: 'cover', borderRadius: 5, border: '1px solid var(--line,#e5e7eb)' }} />
          </a>
        ))}
        {photos.length > 4 && <span style={{ fontSize: 11, color: 'var(--muted)' }}>+{photos.length - 4}</span>}
        <button className="btn btn-ghost btn-sm btn-icon" title="Add photos" onClick={() => photoRef.current?.click()} disabled={uploading}>
          {uploading ? <Spinner /> : <Camera size={14} />}
        </button>
        <input ref={photoRef} type="file" hidden multiple accept="image/*" onChange={(e) => { addPhotos(Array.from(e.target.files || [])); e.target.value = ''; }} />
        {onRemove && <button className="btn btn-ghost btn-sm btn-icon" title="Remove item" onClick={onRemove}><Trash2 size={13} /></button>}
      </div>
    </div>
  );
}

/** Reusable assessment view — room-by-room accordion checklist. Used in global drawer + property tab. */
export function AssessmentView({ assessment, onReload }) {
  const toast = useToast();
  const [a, setA] = useState(assessment);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState({});
  useEffect(() => { setA(assessment); }, [assessment]);

  const rooms = useMemo(() => {
    const map = new Map();
    for (const it of a.items || []) {
      const room = it.section || 'General';
      if (!map.has(room)) map.set(room, []);
      map.get(room).push(it);
    }
    return [...map.entries()];
  }, [a.items]);

  const patchItem = async (itemId, patch) => {
    try {
      const { data } = await api.put(`/rental-assessments/${a.id}/items/${itemId}`, patch);
      setA((prev) => ({
        ...prev,
        readiness_score: data.readiness?.score ?? prev.readiness_score,
        readiness_status: data.readiness?.status ?? prev.readiness_status,
        items: prev.items.map((it) => (it.id === itemId ? { ...it, ...data.data } : it)),
      }));
    } catch { toast.error('Failed to update item'); }
  };

  const removeItem = async (itemId) => {
    if (!window.confirm('Remove this checklist item?')) return;
    try { await api.delete(`/rental-assessments/${a.id}/items/${itemId}`); setA((p) => ({ ...p, items: p.items.filter((i) => i.id !== itemId) })); }
    catch { toast.error('Failed to remove'); }
  };

  const addItem = async (section, name) => {
    if (!name) return;
    try { const { data } = await api.post(`/rental-assessments/${a.id}/items`, { section, assessment_item: name }); setA((p) => ({ ...p, items: [...p.items, data.data] })); }
    catch { toast.error('Failed to add item'); }
  };

  const addRoom = async () => {
    const room = window.prompt('New room / area name (e.g. Servant room, Garage):');
    if (!room) return;
    await addItem(room.trim(), 'Doors & doorway frames');
    setOpen((o) => ({ ...o, [room.trim()]: true }));
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

  // Complete: generate the branded PDF → store it → mark ready.
  const complete = async (override = false) => {
    setBusy(true);
    try {
      toast.success('Generating assessment report…');
      const { buildAssessmentReportBlob } = await import('../utils/sspcPdf');
      const blob = await buildAssessmentReportBlob({ assessment: a, property: a.property, fileSrc });
      const fd = new FormData();
      fd.append('file', new File([blob], `assessment-${a.assessment_code || a.id}.pdf`, { type: 'application/pdf' }));
      const up = await api.post('/uploads?folder=documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const report_url = up.data.data.url;
      await api.post(`/properties/${a.property_id}/documents`, {
        title: `Assessment report — ${a.assessment_code || a.id}`, file_url: report_url,
        doc_type: 'assessment_report', entity_type: 'assessment', entity_id: a.id,
      });
      await api.put(`/rental-assessments/${a.id}`, { report_url });
      const { data } = await api.post(`/rental-assessments/${a.id}/complete`, { override });
      toast.success(data.message + ' Report saved to property documents.');
      onReload?.();
    } catch (e) {
      const msg = e.response?.data?.error || e.message || 'Failed';
      if (msg.includes('not ready') && window.confirm(msg + '\n\nOverride as manager and mark ready for marketing anyway?')) return complete(true);
      toast.error(msg);
    } finally { setBusy(false); }
  };

  const roomDone = (items) => items.filter((i) => i.status === 'done' || i.status === 'na').length;

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
        <h4 className="form-section-title" style={{ margin: 0, border: 'none', padding: 0 }}>Room-by-room checklist</h4>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="sm" variant="ghost" icon={Plus} onClick={addRoom}>Add room</Button>
          <Button size="sm" variant="ghost" icon={Wrench} onClick={generateWO} disabled={busy}>Generate Work Orders</Button>
          {a.report_url && <Button size="sm" variant="ghost" icon={FileDown} onClick={() => window.open(fileSrc(a.report_url), '_blank')}>Report</Button>}
          <Button size="sm" icon={CheckCircle2} onClick={() => complete(false)} disabled={busy}>{busy ? <Spinner /> : 'Complete & generate report'}</Button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rooms.map(([room, items]) => {
          const isOpen = open[room] ?? false;
          const done = roomDone(items);
          return (
            <div key={room} className="card" style={{ border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div onClick={() => setOpen((o) => ({ ...o, [room]: !isOpen }))}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', background: 'var(--surface-2,#f8fafc)' }}>
                {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                <span style={{ fontWeight: 750, fontSize: 13.5 }}>{room}</span>
                <Badge tone={done === items.length ? 'green' : done ? 'amber' : 'grey'}>{done}/{items.length}</Badge>
              </div>
              {isOpen && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(150px,1.3fr) 44px 44px 44px minmax(120px,1fr) auto', gap: 8, padding: '6px 10px', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-2,#94a3b8)' }}>
                    <span>Area item</span><span>Clean</span><span>Undmg</span><span>Works</span><span>Comment</span><span>Photos</span>
                  </div>
                  {items.map((it) => <ItemRow key={it.id} it={it} onPatch={(p) => patchItem(it.id, p)} onRemove={() => removeItem(it.id)} />)}
                  <div style={{ padding: '8px 10px', borderTop: '1px solid var(--line-soft,#f1f5f9)' }}>
                    <AddItemInline onAdd={(name) => addItem(room, name)} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Field label="Summary"><Textarea defaultValue={a.summary || ''} onBlur={(e) => e.target.value !== (a.summary || '') && patchHeader({ summary: e.target.value })} /></Field>
    </div>
  );
}

function AddItemInline({ onAdd }) {
  const [v, setV] = useState('');
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <Input placeholder="Add area item… (e.g. Wardrobe, Geyser)" value={v} onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && v.trim()) { onAdd(v.trim()); setV(''); } }} style={{ maxWidth: 280, fontSize: 12.5 }} />
      <Button size="sm" variant="ghost" icon={Plus} onClick={() => { if (v.trim()) { onAdd(v.trim()); setV(''); } }}>Add item</Button>
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
          <p className="cell-sub" style={{ marginTop: 10 }}>A room-by-room checklist is seeded (Bedrooms, Kitchen, Living, Dining, Bathrooms, Balcony, Outdoor, Utilities &amp; safety). Each area item is verdicted Clean / Undamaged / Working with comments and photos; your team can add rooms and items.</p>
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
