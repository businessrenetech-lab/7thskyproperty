import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus, Check, ClipboardCheck, FileText, ShieldCheck, Coins, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button, Badge, Drawer, Field, Input, Textarea, Select, KV, Spinner, EmptyState } from '../../ui/kit';
import UploadButton from '../../ui/UploadButton';
import { fileSrc } from '../../ui/FileUpload';
import BusinessListingForm, { BUSINESS_STAGES, STAGE_LABEL, EMPTY_LISTING } from './BusinessListingForm';

const money = (n) => (n == null || n === '' ? '—' : `৳${Number(n).toLocaleString()}`);
const ACCENT = '#7c3aed';
const RATING = ['operational_condition', 'market_attractiveness', 'business_readiness', 'commercial_viability', 'growth_potential', 'transaction_feasibility'];
const RATING_LABEL = { operational_condition: 'Operational condition', market_attractiveness: 'Market attractiveness', business_readiness: 'Business readiness', commercial_viability: 'Commercial viability', growth_potential: 'Growth potential', transaction_feasibility: 'Transaction feasibility' };
const DOC_STATUS_TONE = { verified: 'green', collected: 'blue', required: 'grey', rejected: 'red', na: 'grey' };

export default function BusinessListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [listing, setListing] = useState(null);
  const [tab, setTab] = useState('workflow');
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadListing = useCallback(async () => {
    try { const { data } = await api.get(`/business-listings/${id}`); setListing(data.data); }
    catch { toast.error('Failed to load business'); navigate('/business/listings'); }
  }, [id, navigate, toast]);
  useEffect(() => { loadListing(); }, [loadListing]);

  const saveStage = async (stage) => {
    const ws = { ...(listing.workflow_state || {}), [stage]: { status: 'done', at: new Date().toISOString().slice(0, 10) } };
    try { const { data } = await api.put(`/business-listings/${id}`, { stage, workflow_state: ws }); setListing(data.data); toast.success(`Moved to ${STAGE_LABEL[stage]}`); }
    catch { toast.error('Could not update stage'); }
  };

  const saveEdit = async () => {
    if (!editForm.business_name.trim()) { toast.error('Business name is required'); return; }
    setSaving(true);
    try { const { data } = await api.put(`/business-listings/${id}`, editForm); setListing(data.data); setEditForm(null); toast.success('Listing updated'); }
    catch (e) { toast.error(e.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  if (!listing) return <div className="pm-scope" style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>;
  const curIdx = BUSINESS_STAGES.findIndex(([v]) => v === listing.stage);

  return (
    <div className="pm-scope">
      <button onClick={() => navigate('/business/listings')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: ACCENT, cursor: 'pointer', padding: '4px 0', fontSize: 13 }}>
        <ArrowLeft size={15} /> Back to listings
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1b1440' }}>{listing.business_name}</h1>
            <Badge tone="violet">{STAGE_LABEL[listing.stage] || listing.stage}</Badge>
            <Badge tone={listing.status === 'sold' ? 'green' : listing.status === 'active' ? 'blue' : 'grey'}>{listing.status}</Badge>
          </div>
          <div style={{ color: '#6b7280', fontSize: 13, marginTop: 3 }}>
            <span style={{ fontFamily: 'monospace' }}>{listing.business_code}</span> · {[listing.business_type, listing.industry, listing.city].filter(Boolean).join(' · ')} · {money(listing.indicative_price)}
          </div>
        </div>
        <Button variant="ghost" icon={Pencil} onClick={() => setEditForm({ ...EMPTY_LISTING, ...Object.fromEntries(Object.entries(listing).filter(([, v]) => v != null)) })}>Edit profile</Button>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #eee', margin: '16px 0 18px' }}>
        {[['workflow', 'SOP Workflow', ClipboardCheck], ['assessment', 'Assessment', ShieldCheck], ['documents', 'Documents & Due Diligence', FileText], ['overview', 'Overview', Coins]].map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'none', border: 'none', borderBottom: tab === k ? `2px solid ${ACCENT}` : '2px solid transparent', color: tab === k ? ACCENT : '#6b7280', fontWeight: tab === k ? 700 : 500, cursor: 'pointer', fontSize: 13.5 }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'workflow' && <WorkflowTab listing={listing} curIdx={curIdx} onSetStage={saveStage} />}
      {tab === 'assessment' && <AssessmentTab listingId={id} />}
      {tab === 'documents' && <DocumentsTab listingId={id} />}
      {tab === 'overview' && <OverviewTab listing={listing} />}

      {editForm && (
        <Drawer open title={`Edit — ${listing.business_name}`} width={620} onClose={() => setEditForm(null)}
          footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setEditForm(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
          </div>}>
          <BusinessListingForm form={editForm} set={(k, v) => setEditForm((f) => ({ ...f, [k]: v }))} />
        </Drawer>
      )}
    </div>
  );
}

// ── SOP Workflow stepper (the 14 stages) ─────────────────────────────────────
function WorkflowTab({ listing, curIdx, onSetStage }) {
  const ws = listing.workflow_state || {};
  return (
    <div>
      <p style={{ color: '#6b7280', fontSize: 13, marginTop: 0 }}>The Business Sale SOP pipeline — click a stage to set it as the current stage (records completion).</p>
      <div style={{ display: 'grid', gap: 8 }}>
        {BUSINESS_STAGES.map(([v, label], i) => {
          const done = i < curIdx || ws[v]?.status === 'done';
          const current = i === curIdx;
          return (
            <button key={v} onClick={() => onSetStage(v)} style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
              background: current ? 'rgba(124,58,237,.08)' : '#fff', border: `1px solid ${current ? ACCENT : '#e7e3f3'}` }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: '50%', flex: '0 0 auto',
                background: done ? ACCENT : current ? '#fff' : '#f3f0fb', color: done ? '#fff' : ACCENT, border: current ? `2px solid ${ACCENT}` : 'none', fontSize: 12, fontWeight: 700 }}>
                {done ? <Check size={15} /> : i + 1}
              </span>
              <span style={{ flex: 1, fontWeight: current ? 700 : 600, color: current ? ACCENT : '#1b1440' }}>{label}</span>
              {ws[v]?.at && <span style={{ fontSize: 12, color: '#9ca3af' }}>{ws[v].at}</span>}
              {current && <Badge tone="violet">Current</Badge>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Assessment tab ───────────────────────────────────────────────────────────
const EMPTY_ASSESS = { assessment_type: 'preliminary', assessment_date: new Date().toISOString().slice(0, 10), operational_condition: 3, market_attractiveness: 3, business_readiness: 3, commercial_viability: 3, growth_potential: 3, transaction_feasibility: 3, presentation_score: 3, overall_rating: 3, recommendation: 'proceed', risks: [], summary: '', next_steps: '', status: 'completed' };
function AssessmentTab({ listingId }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [risk, setRisk] = useState({ type: '', severity: 'medium', note: '' });
  const load = useCallback(() => api.get('/business-assessments', { params: { business_listing_id: listingId } }).then((r) => setRows(r.data.data || [])).catch(() => {}), [listingId]);
  useEffect(() => { load(); }, [load]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const save = async () => {
    setSaving(true);
    try { await api.post('/business-assessments', { ...form, business_listing_id: listingId }); toast.success('Assessment saved'); setForm(null); load(); }
    catch (e) { toast.error(e.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Business verification & viability assessment (SOP Steps 2, 3 & 6).</p>
        <Button icon={Plus} onClick={() => setForm({ ...EMPTY_ASSESS, risks: [] })}>New Assessment</Button>
      </div>
      {rows.length === 0 ? <EmptyState icon={ShieldCheck} title="No assessments yet" sub="Score the business's condition, viability, risks and readiness." />
        : rows.map((a) => (
          <div key={a.id} style={{ background: '#fff', border: '1px solid #e7e3f3', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{a.assessment_type} assessment <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: 12 }}>{a.assessment_date || ''}</span></div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Badge tone={a.recommendation === 'proceed' ? 'green' : a.recommendation === 'decline' ? 'red' : 'amber'}>{a.recommendation}</Badge>
                <span style={{ fontSize: 13 }}>Overall <b>{a.overall_rating}/5</b></span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 6, marginTop: 10 }}>
              {RATING.map((k) => <div key={k} style={{ fontSize: 12.5 }}><span style={{ color: '#6b7280' }}>{RATING_LABEL[k]}:</span> <b>{a[k] ?? '—'}/5</b></div>)}
            </div>
            {Array.isArray(a.risks) && a.risks.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12.5 }}><b>Risks:</b> {a.risks.map((r, i) => <span key={i}>{r.type} ({r.severity}){i < a.risks.length - 1 ? ', ' : ''}</span>)}</div>
            )}
            {a.summary && <div style={{ marginTop: 8, fontSize: 13, color: '#374151' }}>{a.summary}</div>}
          </div>
        ))}

      {form && (
        <Drawer open title="New Business Assessment" width={560} onClose={() => setForm(null)}
          footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save assessment'}</Button></div>}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Type"><Select value={form.assessment_type} onChange={(e) => set('assessment_type', e.target.value)}><option value="preliminary">Preliminary (Step 2)</option><option value="presentation">Presentation (Step 6)</option><option value="risk">Risk (Step 3)</option><option value="due_diligence">Due Diligence</option></Select></Field>
            <Field label="Date"><Input type="date" value={form.assessment_date || ''} onChange={(e) => set('assessment_date', e.target.value)} /></Field>
            {RATING.map((k) => (
              <Field key={k} label={RATING_LABEL[k]}><Select value={form[k]} onChange={(e) => set(k, Number(e.target.value))}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</Select></Field>
            ))}
            <Field label="Presentation score"><Select value={form.presentation_score} onChange={(e) => set('presentation_score', Number(e.target.value))}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</Select></Field>
            <Field label="Overall rating"><Select value={form.overall_rating} onChange={(e) => set('overall_rating', Number(e.target.value))}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</Select></Field>
            <Field label="Recommendation"><Select value={form.recommendation} onChange={(e) => set('recommendation', e.target.value)}><option value="proceed">Proceed</option><option value="hold">Hold</option><option value="decline">Decline</option></Select></Field>
            <Field label="Risks (Step 3)" full>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <Input placeholder="Risk type (e.g. lease, tax)" value={risk.type} onChange={(e) => setRisk({ ...risk, type: e.target.value })} />
                <Select value={risk.severity} onChange={(e) => setRisk({ ...risk, severity: e.target.value })} style={{ maxWidth: 120 }}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></Select>
                <Button variant="ghost" onClick={() => { if (risk.type.trim()) { set('risks', [...(form.risks || []), risk]); setRisk({ type: '', severity: 'medium', note: '' }); } }}>Add</Button>
              </div>
              {(form.risks || []).map((r, i) => <Badge key={i} tone="amber">{r.type} · {r.severity}</Badge>)}
            </Field>
            <Field label="Summary" full><Textarea rows={3} value={form.summary} onChange={(e) => set('summary', e.target.value)} /></Field>
            <Field label="Next steps" full><Textarea rows={2} value={form.next_steps} onChange={(e) => set('next_steps', e.target.value)} /></Field>
          </div>
        </Drawer>
      )}
    </div>
  );
}

// ── Documents / Due-Diligence register ───────────────────────────────────────
function DocumentsTab({ listingId }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); try { const r = await api.get('/business-documents', { params: { business_listing_id: listingId } }); setRows(r.data.data || []); } finally { setLoading(false); } }, [listingId]);
  useEffect(() => { load(); }, [load]);
  const seed = async () => { try { const r = await api.post('/business-documents/seed-checklist', { business_listing_id: listingId }); setRows(r.data.data || []); toast.success(r.data.message); } catch { toast.error('Could not create checklist'); } };
  const patchFile = async (doc, url) => { try { await api.put(`/business-documents/${doc.id}`, { file_url: url, status: url ? 'collected' : 'required' }); load(); } catch { toast.error('Upload save failed'); } };
  const verify = async (doc, status) => { try { await api.patch(`/business-documents/${doc.id}/verify`, { status }); load(); } catch { toast.error('Action failed'); } };
  const del = async (doc) => { try { await api.delete(`/business-documents/${doc.id}`); load(); } catch { toast.error('Delete failed'); } };

  if (loading) return <div style={{ padding: 30, textAlign: 'center' }}><Spinner /></div>;
  if (rows.length === 0) return <EmptyState icon={FileText} title="No document register yet" sub="Create the Schedule D checklist to start collecting & verifying business documents." action={<Button icon={ClipboardCheck} onClick={seed}>Create Schedule D checklist</Button>} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>SOP Step 7 collection + Step 19 due diligence. Files are stored privately (JWT-gated).</p>
        <Button variant="ghost" icon={ClipboardCheck} onClick={seed}>Add missing checklist items</Button>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {rows.map((d) => (
          <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid #e7e3f3', borderRadius: 10, padding: '10px 14px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{d.name}</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>{d.doc_type}</div>
            </div>
            <Badge tone={DOC_STATUS_TONE[d.status] || 'grey'}>{d.status}</Badge>
            <UploadButton value={d.file_url || ''} onChange={(url) => patchFile(d, url)} folder="documents" label="Attach" />
            {d.file_url && <a href={fileSrc(d.file_url)} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: ACCENT }}>View</a>}
            {d.status !== 'verified' && <Button size="sm" variant="ghost" icon={CheckCircle2} onClick={() => verify(d, 'verified')}>Verify</Button>}
            {d.status !== 'rejected' && <Button size="sm" variant="ghost" icon={XCircle} onClick={() => verify(d, 'rejected')}>Reject</Button>}
            <button onClick={() => del(d)} title="Remove" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0392b' }}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Overview (read-only profile) ─────────────────────────────────────────────
function OverviewTab({ listing }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 8 }}>
      <KV k="Business type" v={listing.business_type} />
      <KV k="Industry" v={listing.industry} />
      <KV k="Ownership" v={listing.ownership_structure} />
      <KV k="Trade licence" v={listing.trade_licence_no} />
      <KV k="Company reg." v={listing.company_registration_no} />
      <KV k="TIN / BIN" v={listing.tin_bin} />
      <KV k="Year established" v={listing.year_established} />
      <KV k="Staff count" v={listing.staff_count} />
      <KV k="Lease status" v={listing.lease_status} />
      <KV k="Indicative price" v={money(listing.indicative_price)} />
      <KV k="Annual turnover" v={money(listing.annual_turnover)} />
      <KV k="Annual profit" v={money(listing.annual_profit)} />
      <KV k="Address" v={[listing.area, listing.city].filter(Boolean).join(', ')} />
      <KV k="Reason for sale" v={listing.reason_for_sale} />
    </div>
  );
}
