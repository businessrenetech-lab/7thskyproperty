import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, CheckCircle2, Circle, ChevronRight, ChevronDown, Paperclip, FileText, Trash2, ExternalLink, Upload } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Button, DataTable, StatusBadge, Badge, Drawer, Field, Input, Select, Textarea, SearchInput, KV, Spinner } from '../ui/kit';
import { Combo } from '../ui/pickers';
import RegistersPanel from './RegistersPanel';

const clientLabel = (c) => c.Contact?.full_name || c.client_code;
const propLabel = (p) => `${p.title} (${p.property_code || ''})`;

export default function Projects() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const verticalFilter = searchParams.get('vertical_key');

  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [verticals, setVerticals] = useState([]);
  const [drawer, setDrawer] = useState(null);
  const [form, setForm] = useState({});
  const [sel, setSel] = useState(null); const [detail, setDetail] = useState(null);
  const [ptab, setPtab] = useState('stages');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: 50 });
      if (search) p.set('search', search);
      if (verticalFilter) p.set('vertical_key', verticalFilter);
      const { data } = await api.get(`/projects?${p}`);
      setRows(data.data || []);
    }
    catch { toast.error('Failed to load projects'); } finally { setLoading(false); }
  }, [search, verticalFilter, toast]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get('/services/verticals').then(({ data }) => setVerticals(data.data || [])).catch(() => {}); }, []);

  const openCreate = () => {
    const defaultVertical = verticalFilter ? (verticalFilter.includes(',') ? verticalFilter.split(',')[0] : verticalFilter) : 'leasing';
    setForm({ title: '', vertical_key: defaultVertical, client_id: null, property_id: null, priority: 'medium' });
    setDrawer('create');
  };
  const create = async () => {
    if (!form.title) return toast.error('Title is required');
    setSaving(true);
    try { await api.post('/projects', form); toast.success('Project created with workflow'); setDrawer(null); load(); }
    catch (e) { toast.error(e.response?.data?.error || 'Create failed'); } finally { setSaving(false); }
  };
  const [expandedItem, setExpandedItem] = useState(null); // "${stageId}-${itemIndex}"

  const openView = async (r) => { setSel(r); setDrawer('view'); setDetail(null); try { const { data } = await api.get(`/projects/${r.id}`); setDetail(data.data); } catch { toast.error('Load failed'); } };

  const patchStage = async (stage, body) => {
    try { const { data } = await api.patch(`/projects/${sel.id}/stages/${stage.id}`, body); setDetail(data.data); load(); }
    catch { toast.error('Update failed'); }
  };
  const toggleCheck = (stage, idx) => {
    const checklist = stage.checklist.map((c, i) => i === idx ? { ...c, done: !c.done } : c);
    patchStage(stage, { checklist });
  };

  const handleEvidenceUpload = async (e, stage, idx) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      toast.info('Uploading evidence file...');
      const { data } = await api.post('/projects/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const checklist = stage.checklist.map((c, i) => i === idx ? { ...c, evidence_url: data.file_url, evidence_name: data.file_name } : c);
      await patchStage(stage, { checklist });
      toast.success('Evidence uploaded successfully');
    } catch {
      toast.error('Upload failed');
    }
  };

  const removeEvidence = async (stage, idx) => {
    const checklist = stage.checklist.map((c, i) => i === idx ? { ...c, evidence_url: '', evidence_name: '' } : c);
    await patchStage(stage, { checklist });
    toast.success('Evidence removed');
  };

  const updateRemarks = async (stage, idx, val) => {
    const checklist = stage.checklist.map((c, i) => i === idx ? { ...c, remarks: val } : c);
    await patchStage(stage, { checklist });
  };

  const columns = [
    { key: 'project_code', header: 'Project', render: (r) => <span className="code-chip">{r.project_code}</span> },
    { key: 'title', header: 'Title', render: (r) => <div className="cell-strong">{r.title}</div> },
    { key: 'vertical', header: 'Vertical', render: (r) => r.vertical_key ? <Badge tone="blue">{r.vertical_key}</Badge> : '—' },
    { key: 'client', header: 'Client', render: (r) => r.client?.Contact?.full_name || '—' },
    { key: 'stage', header: 'Current stage', render: (r) => r.current_stage_key ? <span className="cell-sub">{r.current_stage_key.replace(/_/g, ' ')}</span> : '—' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <>
      <PageHead title="Projects" desc="Service projects run on the workbook stage-gate workflows."
        actions={<Button icon={Plus} onClick={openCreate}>New Project</Button>} />
      <div className="card" style={{ marginBottom: 16 }}><div className="card-pad"><SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or code…" /></div></div>
      <div className="card"><DataTable columns={columns} rows={rows} loading={loading} onRowClick={openView} /></div>

      {drawer === 'create' && (
        <Drawer title="New Project" onClose={() => setDrawer(null)} footer={<><Button variant="ghost" onClick={() => setDrawer(null)}>Cancel</Button><Button onClick={create} disabled={saving}>{saving ? <Spinner /> : 'Create'}</Button></>}>
          <Field label="Title" required full><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Vertical (loads its workflow)"><Select value={form.vertical_key} onChange={(e) => setForm({ ...form, vertical_key: e.target.value })}>{verticals.map((v) => <option key={v.vertical_key} value={v.vertical_key}>{v.name}</option>)}</Select></Field>
          <Field label="Client"><Combo endpoint="/clients" labelFn={clientLabel} value={form.client_id} onChange={(v) => setForm({ ...form, client_id: v })} placeholder="Search client…" /></Field>
          <Field label="Property"><Combo endpoint="/properties" labelFn={propLabel} value={form.property_id} onChange={(v) => setForm({ ...form, property_id: v })} placeholder="Search property…" /></Field>
          <Field label="Priority"><Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{['low', 'medium', 'high', 'critical'].map((p) => <option key={p}>{p}</option>)}</Select></Field>
        </Drawer>
      )}

      {drawer === 'view' && (
        <Drawer title={sel?.title || 'Project'} onClose={() => setDrawer(null)} width={640}>
          {!detail ? <Spinner /> : (
            <>
              <div className="wrap-gap" style={{ marginBottom: 14 }}><span className="code-chip">{detail.project_code}</span><StatusBadge status={detail.status} />{detail.vertical_key && <Badge tone="blue">{detail.vertical_key}</Badge>}</div>
              <KV k="Client" v={detail.client?.Contact?.full_name} />
              <KV k="Property" v={detail.property?.title} />

              <div className="tabs" style={{ marginTop: 16 }}>
                <div className={`tab ${ptab === 'stages' ? 'active' : ''}`} onClick={() => setPtab('stages')}>Workflow stage-gate</div>
                <div className={`tab ${ptab === 'registers' ? 'active' : ''}`} onClick={() => setPtab('registers')}>Registers</div>
              </div>

              {ptab === 'registers' ? <RegistersPanel project={detail} /> : (<>
              <div className="form-section-title">Workflow stage-gate</div>
              {(detail.stages || []).map((s) => {
                const total = (s.checklist || []).length; const done = (s.checklist || []).filter((c) => c.done).length;
                const active = s.status === 'in_progress';
                return (
                  <div key={s.id} className="card" style={{ marginBottom: 8, borderLeft: `3px solid ${s.status === 'done' ? 'var(--success)' : active ? 'var(--primary)' : 'var(--border)'}` }}>
                    <div className="card-pad" style={{ padding: 12 }}>
                      <div className="between">
                        <div className="row" style={{ cursor: 'pointer' }} onClick={() => setExpandedItem(expandedItem?.startsWith(`${s.id}-`) ? null : `${s.id}-0`)}>
                          {s.status === 'done' ? <CheckCircle2 size={16} color="var(--success)" /> : <ChevronRight size={16} color="var(--muted)" />}
                          <b style={{ fontSize: 13.5 }}>{s.sort_order}. {s.stage_name}</b>
                        </div>
                        <StatusBadge status={s.status} />
                      </div>
                      {(active || s.status === 'pending') && total > 0 && (
                        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {s.checklist.map((c, i) => {
                            const isExpanded = expandedItem === `${s.id}-${i}`;
                            return (
                              <div key={i} className="card" style={{ border: '1px solid var(--border)', background: 'var(--surface)', margin: 0, padding: 8, borderRadius: 6 }}>
                                <div className="between" style={{ cursor: 'pointer' }} onClick={() => setExpandedItem(isExpanded ? null : `${s.id}-${i}`)}>
                                  <div className="row" style={{ gap: 8 }} onClick={(e) => { e.stopPropagation(); active && toggleCheck(s, i); }}>
                                    {c.done ? <CheckCircle2 size={16} color="var(--success)" /> : <Circle size={16} color="var(--muted-2)" />}
                                    <span style={{ textDecoration: c.done ? 'line-through' : 'none', color: c.done ? 'var(--muted)' : 'var(--text)', fontWeight: 600, fontSize: 13 }}>
                                      {c.label}{c.required && <span style={{ color: 'var(--danger)' }}> *</span>}
                                    </span>
                                  </div>
                                  <ChevronDown size={14} style={{ color: 'var(--muted)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                </div>
                                
                                {isExpanded && (
                                  <div style={{ marginTop: 8, padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 4, fontSize: 12, borderLeft: '2px solid var(--primary)' }}>
                                    {c.detailed_task && (
                                      <div style={{ marginBottom: 6 }}>
                                        <strong style={{ color: 'var(--muted)' }}>Detailed Task:</strong> {c.detailed_task}
                                      </div>
                                    )}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                                      {c.responsible && (
                                        <div>
                                          <strong style={{ color: 'var(--muted)' }}>Responsible:</strong> {c.responsible}
                                        </div>
                                      )}
                                      {c.output && (
                                        <div>
                                          <strong style={{ color: 'var(--muted)' }}>Output/KPI:</strong> {c.output}
                                        </div>
                                      )}
                                    </div>
                                    {c.evidence_required && (
                                      <div style={{ marginBottom: 6 }}>
                                        <strong style={{ color: 'var(--muted)' }}>Required Evidence:</strong> {c.evidence_required}
                                      </div>
                                    )}
                                    
                                    {/* Upload Evidence */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                                      {c.evidence_url ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--success-bg)', padding: '2px 8px', borderRadius: 4, color: 'var(--success)', fontSize: 11 }}>
                                          <Paperclip size={12} />
                                          <a href={c.evidence_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: 'inherit', fontWeight: 600 }}>
                                            {c.evidence_name || 'View Evidence'}
                                          </a>
                                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', padding: '0 4px', fontSize: 11, minHeight: 'auto', height: 'auto' }} onClick={(e) => { e.stopPropagation(); removeEvidence(s, i); }}>
                                            Remove
                                          </button>
                                        </div>
                                      ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                          <span style={{ color: 'var(--muted)', fontSize: 11 }}>No evidence uploaded</span>
                                          <input type="file" id={`file-${s.id}-${i}`} style={{ display: 'none' }} onChange={(e) => handleEvidenceUpload(e, s, i)} />
                                          <Button size="xs" variant="ghost" icon={Upload} onClick={() => document.getElementById(`file-${s.id}-${i}`).click()}>
                                            Upload Proof
                                          </Button>
                                        </div>
                                      )}
                                    </div>

                                    {/* Remarks */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      <label style={{ fontWeight: 600, fontSize: 11 }}>Remarks / Comments:</label>
                                      <input type="text" className="input" placeholder="Type comments and press Enter or click away..." defaultValue={c.remarks || ''} onBlur={(e) => updateRemarks(s, i, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') updateRemarks(s, i, e.target.value); }} style={{ padding: '4px 8px', fontSize: 12, height: 26 }} />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {active && <Button size="sm" icon={CheckCircle2} onClick={() => patchStage(s, { status: 'done' })} disabled={done < total} style={{ marginTop: 8 }}>{done < total ? `Complete ${total - done} item(s) to advance` : 'Complete stage'}</Button>}
                        </div>
                      )}
                      {total > 0 && <div className="cell-sub" style={{ marginTop: 6 }}>{done}/{total} checklist items</div>}
                    </div>
                  </div>
                );
              })}
              {!(detail.stages || []).length && <p className="cell-sub">No workflow stages (this vertical has no template).</p>}
              </>)}
            </>
          )}
        </Drawer>
      )}
    </>
  );
}
