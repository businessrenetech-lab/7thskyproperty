import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus, Check, ClipboardCheck, FileText, ShieldCheck, Coins, Trash2, CheckCircle2, XCircle, CalendarDays, Handshake, Landmark, KeyRound, Wrench } from 'lucide-react';
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
    catch { toast.error('Failed to load business'); navigate('/business-rent/listings'); }
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
      <button onClick={() => navigate('/business-rent/listings')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: ACCENT, cursor: 'pointer', padding: '4px 0', fontSize: 13 }}>
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
        {[['workflow', 'SOP Workflow', ClipboardCheck], ['inspections', 'Inspections', CalendarDays], ['offers', 'Offers', Handshake], ['settlement', 'Settlement', Landmark], ...(listing.listing_type === 'rent' ? [['lease', 'Lease Management', KeyRound]] : []), ['assessment', 'Assessment', ShieldCheck], ['documents', 'Documents', FileText], ['overview', 'Overview', Coins]].map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'none', border: 'none', borderBottom: tab === k ? `2px solid ${ACCENT}` : '2px solid transparent', color: tab === k ? ACCENT : '#6b7280', fontWeight: tab === k ? 700 : 500, cursor: 'pointer', fontSize: 13.5 }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'workflow' && <WorkflowTab listing={listing} curIdx={curIdx} onSetStage={saveStage} />}
      {tab === 'inspections' && <InspectionsTab listingId={id} />}
      {tab === 'offers' && <OffersTab listingId={id} />}
      {tab === 'settlement' && <SettlementTab listing={listing} />}
      {tab === 'lease' && <LeaseTab listing={listing} />}
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

// ── Inspections (SOP Step 14–15) ─────────────────────────────────────────────
const EMPTY_INSP = { inspection_type: 'walkthrough', scheduled_date: '', attendees: '', outcome: 'follow_up', feedback: '', status: 'scheduled', notes: '' };
function InspectionsTab({ listingId }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => api.get('/business-inspections', { params: { business_listing_id: listingId } }).then((r) => setRows(r.data.data || [])).catch(() => {}), [listingId]);
  useEffect(() => { load(); }, [load]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const save = async () => { setSaving(true); try { await api.post('/business-inspections', { ...form, business_listing_id: listingId }); toast.success('Inspection saved'); setForm(null); load(); } catch (e) { toast.error(e.response?.data?.error || 'Save failed'); } finally { setSaving(false); } };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Buyer meetings & operational walkthroughs (SOP Steps 14–15).</p>
        <Button icon={Plus} onClick={() => setForm({ ...EMPTY_INSP })}>Schedule Inspection</Button>
      </div>
      {rows.length === 0 ? <EmptyState icon={CalendarDays} title="No inspections yet" sub="Coordinate a buyer meeting or operational walkthrough." /> : (
        <div style={{ display: 'grid', gap: 8 }}>
          {rows.map((r) => (
            <div key={r.id} style={{ background: '#fff', border: '1px solid #e7e3f3', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{r.inspection_type} <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: 12 }}>{r.scheduled_date ? new Date(r.scheduled_date).toLocaleDateString() : ''}</span></div>
                <div style={{ display: 'flex', gap: 8 }}><Badge tone={r.status === 'completed' ? 'green' : r.status === 'cancelled' ? 'red' : 'blue'}>{r.status}</Badge>{r.outcome && <Badge tone="grey">{r.outcome}</Badge>}</div>
              </div>
              {r.attendees && <div style={{ fontSize: 12.5, color: '#6b7280', marginTop: 4 }}>Attendees: {r.attendees}</div>}
              {r.feedback && <div style={{ fontSize: 13, color: '#374151', marginTop: 6 }}>{r.feedback}</div>}
            </div>
          ))}
        </div>
      )}
      {form && (
        <Drawer open title="Schedule Inspection" width={520} onClose={() => setForm(null)}
          footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button></div>}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Type"><Select value={form.inspection_type} onChange={(e) => set('inspection_type', e.target.value)}><option value="walkthrough">Operational walkthrough</option><option value="meeting">Buyer meeting</option><option value="operational">Operational clarification</option></Select></Field>
            <Field label="Date & time"><Input type="datetime-local" value={form.scheduled_date} onChange={(e) => set('scheduled_date', e.target.value)} /></Field>
            <Field label="Attendees" full><Input value={form.attendees} onChange={(e) => set('attendees', e.target.value)} placeholder="Buyer, owner, coordinator…" /></Field>
            <Field label="Status"><Select value={form.status} onChange={(e) => set('status', e.target.value)}><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></Select></Field>
            <Field label="Outcome"><Select value={form.outcome} onChange={(e) => set('outcome', e.target.value)}><option value="follow_up">Follow up</option><option value="interested">Interested</option><option value="offer_expected">Offer expected</option><option value="not_interested">Not interested</option></Select></Field>
            <Field label="Feedback / notes" full><Textarea rows={3} value={form.feedback} onChange={(e) => set('feedback', e.target.value)} /></Field>
          </div>
        </Drawer>
      )}
    </div>
  );
}

// ── Offers & negotiation (SOP Step 16–18) ────────────────────────────────────
const OFFER_TONE = { submitted: 'blue', under_review: 'amber', countered: 'amber', accepted: 'green', rejected: 'red', withdrawn: 'grey' };
const EMPTY_OFFER = { buyer_name: '', offer_amount: '', offer_date: new Date().toISOString().slice(0, 10), conditions: '', operational_transition: '', settlement_terms: '', status: 'submitted', non_circumvention_flag: false, notes: '' };
function OffersTab({ listingId }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => api.get('/business-offers', { params: { business_listing_id: listingId } }).then((r) => setRows(r.data.data || [])).catch(() => {}), [listingId]);
  useEffect(() => { load(); }, [load]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const save = async () => { if (!form.offer_amount) { toast.error('Offer amount required'); return; } setSaving(true); try { await api.post('/business-offers', { ...form, business_listing_id: listingId }); toast.success('Offer recorded'); setForm(null); load(); } catch (e) { toast.error(e.response?.data?.error || 'Save failed'); } finally { setSaving(false); } };
  const setStatus = async (o, status) => { try { await api.patch(`/business-offers/${o.id}/status`, { status }); load(); } catch { toast.error('Action failed'); } };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Offers, counteroffers & non-circumvention monitoring (SOP Steps 16–18).</p>
        <Button icon={Plus} onClick={() => setForm({ ...EMPTY_OFFER })}>Record Offer</Button>
      </div>
      {rows.length === 0 ? <EmptyState icon={Handshake} title="No offers yet" sub="Record a buyer's offer to start negotiation." /> : (
        <div style={{ display: 'grid', gap: 8 }}>
          {rows.map((o) => (
            <div key={o.id} style={{ background: '#fff', border: '1px solid #e7e3f3', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div><span style={{ fontFamily: 'monospace', fontSize: 12, color: '#9ca3af' }}>{o.offer_code}</span> <b>{o.buyer_name || 'Buyer'}</b> — {money(o.offer_amount)}{o.counter_amount ? <span style={{ color: '#6b7280' }}> · counter {money(o.counter_amount)}</span> : ''}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {o.non_circumvention_flag && <Badge tone="red">bypass risk</Badge>}
                  <Badge tone={OFFER_TONE[o.status] || 'grey'}>{o.status}</Badge>
                </div>
              </div>
              {o.conditions && <div style={{ fontSize: 12.5, color: '#374151', marginTop: 6 }}>{o.conditions}</div>}
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                {o.status !== 'accepted' && <Button size="sm" variant="ghost" onClick={() => setStatus(o, 'accepted')}>Accept</Button>}
                {o.status !== 'countered' && <Button size="sm" variant="ghost" onClick={() => setStatus(o, 'countered')}>Counter</Button>}
                {o.status !== 'rejected' && <Button size="sm" variant="ghost" onClick={() => setStatus(o, 'rejected')}>Reject</Button>}
              </div>
            </div>
          ))}
        </div>
      )}
      {form && (
        <Drawer open title="Record Offer" width={540} onClose={() => setForm(null)}
          footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button></div>}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Buyer name" full><Input value={form.buyer_name} onChange={(e) => set('buyer_name', e.target.value)} /></Field>
            <Field label="Offer amount (৳)"><Input type="number" value={form.offer_amount} onChange={(e) => set('offer_amount', e.target.value)} /></Field>
            <Field label="Offer date"><Input type="date" value={form.offer_date} onChange={(e) => set('offer_date', e.target.value)} /></Field>
            <Field label="Conditions" full><Textarea rows={2} value={form.conditions} onChange={(e) => set('conditions', e.target.value)} /></Field>
            <Field label="Operational transition" full><Textarea rows={2} value={form.operational_transition} onChange={(e) => set('operational_transition', e.target.value)} /></Field>
            <Field label="Settlement terms" full><Textarea rows={2} value={form.settlement_terms} onChange={(e) => set('settlement_terms', e.target.value)} /></Field>
            <Field label="Non-circumvention / bypass risk" full>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}><input type="checkbox" checked={!!form.non_circumvention_flag} onChange={(e) => set('non_circumvention_flag', e.target.checked)} /> Flag possible direct buyer–seller bypass (Step 18)</label>
            </Field>
          </div>
        </Drawer>
      )}
    </div>
  );
}

// ── Settlement & commission (SOP Step 22–24) ─────────────────────────────────
function SettlementTab({ listing }) {
  const toast = useToast();
  const listingId = listing.id;
  const [row, setRow] = useState(undefined); // undefined=loading, null=none
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => { try { const r = await api.get('/business-settlements', { params: { business_listing_id: listingId } }); setRow((r.data.data || [])[0] || null); } catch { setRow(null); } }, [listingId]);
  useEffect(() => { load(); }, [load]);
  const openForm = () => setForm(row ? { ...row } : { agreed_sale_price: listing.indicative_price || '', commission_mode: 'percent', commission_percent: 2, deposit_amount: '', ownership_transfer_status: 'pending', handover_status: 'pending', commission_status: 'pending', status: 'open', settlement_date: '', handover_date: '' });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const save = async () => {
    setSaving(true);
    try {
      if (row) await api.put(`/business-settlements/${row.id}`, form);
      else await api.post('/business-settlements', { ...form, business_listing_id: listingId });
      toast.success('Settlement saved'); setForm(null); load();
    } catch (e) { toast.error(e.response?.data?.error || 'Save failed'); } finally { setSaving(false); }
  };
  const collect = async () => { try { await api.patch(`/business-settlements/${row.id}/collect-commission`, {}); toast.success('Commission collected'); load(); } catch { toast.error('Failed'); } };
  const estCommission = form ? (form.commission_mode === 'percent' ? Math.round((Number(form.agreed_sale_price || 0) * Number(form.commission_percent || 0)) / 100) : Number(form.commission_amount || 0)) : 0;

  if (row === undefined) return <div style={{ padding: 20, textAlign: 'center' }}><Spinner /></div>;
  return (
    <div>
      {!row ? <EmptyState icon={Landmark} title="No settlement yet" sub="Create the settlement once an offer is accepted — commission is computed from the sale price." action={<Button icon={Plus} onClick={openForm}>Create settlement</Button>} /> : (
        <div style={{ background: '#fff', border: '1px solid #e7e3f3', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 700 }}><span style={{ fontFamily: 'monospace', fontSize: 12, color: '#9ca3af' }}>{row.settlement_code}</span> · Settlement</div>
            <Button variant="ghost" icon={Pencil} onClick={openForm}>Edit</Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
            <KV k="Agreed sale price" v={money(row.agreed_sale_price)} />
            <KV k="Commission" v={`${money(row.commission_amount)} ${row.commission_mode === 'percent' ? `(${row.commission_percent}%)` : ''}`} />
            <KV k="Deposit" v={money(row.deposit_amount)} />
            <KV k="Balance" v={money(row.balance_amount)} />
            <KV k="Ownership transfer" v={row.ownership_transfer_status} />
            <KV k="Handover" v={row.handover_status} />
            <KV k="Settlement date" v={row.settlement_date} />
            <KV k="Commission status" v={row.commission_status} />
          </div>
          {row.commission_status !== 'collected' && <div style={{ marginTop: 14 }}><Button icon={Coins} onClick={collect}>Mark commission collected (Step 24)</Button></div>}
        </div>
      )}
      {form && (
        <Drawer open title={row ? 'Edit Settlement' : 'Create Settlement'} width={520} onClose={() => setForm(null)}
          footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button></div>}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Agreed sale price (৳)"><Input type="number" value={form.agreed_sale_price} onChange={(e) => set('agreed_sale_price', e.target.value)} /></Field>
            <Field label="Commission mode"><Select value={form.commission_mode} onChange={(e) => set('commission_mode', e.target.value)}><option value="percent">% of sale price</option><option value="fixed">Fixed</option></Select></Field>
            {form.commission_mode === 'percent'
              ? <Field label="Commission %"><Input type="number" step="0.1" value={form.commission_percent} onChange={(e) => set('commission_percent', e.target.value)} /></Field>
              : <Field label="Commission amount (৳)"><Input type="number" value={form.commission_amount || ''} onChange={(e) => set('commission_amount', e.target.value)} /></Field>}
            <Field label="Est. commission"><div style={{ padding: '8px 0', fontWeight: 700, color: ACCENT }}>{money(estCommission)}</div></Field>
            <Field label="Deposit (৳)"><Input type="number" value={form.deposit_amount} onChange={(e) => set('deposit_amount', e.target.value)} /></Field>
            <Field label="Settlement date"><Input type="date" value={form.settlement_date || ''} onChange={(e) => set('settlement_date', e.target.value)} /></Field>
            <Field label="Ownership transfer"><Select value={form.ownership_transfer_status} onChange={(e) => set('ownership_transfer_status', e.target.value)}><option value="pending">Pending</option><option value="in_progress">In progress</option><option value="completed">Completed</option></Select></Field>
            <Field label="Handover"><Select value={form.handover_status} onChange={(e) => set('handover_status', e.target.value)}><option value="pending">Pending</option><option value="completed">Completed</option></Select></Field>
            <Field label="Settlement status"><Select value={form.status} onChange={(e) => set('status', e.target.value)}><option value="open">Open</option><option value="completed">Completed</option></Select></Field>
            <Field label="Notes" full><Textarea rows={2} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} /></Field>
          </div>
        </Drawer>
      )}
    </div>
  );
}

// ── Lease Management (rent only, SOP Step 16) ────────────────────────────────
const COLL_TONE = { paid: 'green', partial: 'amber', due: 'grey', overdue: 'red', waived: 'grey' };
function LeaseTab({ listing }) {
  const toast = useToast();
  const listingId = listing.id;
  const [lease, setLease] = useState(undefined); // undefined=loading, null=none
  const [colls, setColls] = useState([]);
  const [maint, setMaint] = useState([]);
  const [form, setForm] = useState(null);
  const [mForm, setMForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const l = (await api.get('/business-leases', { params: { business_listing_id: listingId } })).data.data || [];
      const lz = l[0] || null; setLease(lz);
      if (lz) setColls((await api.get('/business-rent-collections', { params: { lease_id: lz.id } })).data.data || []);
      setMaint((await api.get('/business-maintenance', { params: { business_listing_id: listingId } })).data.data || []);
    } catch { setLease(null); }
  }, [listingId]);
  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const saveLease = async () => {
    setSaving(true);
    try {
      if (lease) await api.put(`/business-leases/${lease.id}`, form);
      else await api.post('/business-leases', { ...form, business_listing_id: listingId });
      toast.success('Lease saved'); setForm(null); load();
    } catch (e) { toast.error(e.response?.data?.error || 'Save failed'); } finally { setSaving(false); }
  };
  const recordRent = async (c) => {
    const amt = prompt(`Record rent received for ${c.period_label} (due ${money(c.rent_due)}):`, c.rent_due);
    if (amt == null) return;
    try { await api.put(`/business-rent-collections/${c.id}`, { rent_received: Number(amt) }); load(); } catch { toast.error('Failed'); }
  };
  const saveMaint = async () => {
    if (!mForm.title.trim()) { toast.error('Title required'); return; }
    try { if (mForm.id) await api.put(`/business-maintenance/${mForm.id}`, mForm); else await api.post('/business-maintenance', { ...mForm, business_listing_id: listingId, lease_id: lease?.id || null }); toast.success('Saved'); setMForm(null); load(); }
    catch (e) { toast.error(e.response?.data?.error || 'Save failed'); }
  };
  const openLeaseForm = () => setForm(lease ? { ...lease } : { tenant_name: '', monthly_rent: listing.monthly_rent || '', security_deposit: listing.security_deposit || '', lease_start: '', lease_term_months: listing.lease_term_months || 12, rent_due_day: 5, commission_amount: '', status: 'active', notes: '' });

  if (lease === undefined) return <div style={{ padding: 20, textAlign: 'center' }}><Spinner /></div>;
  const collected = colls.reduce((s, c) => s + Number(c.rent_received || 0), 0);
  const dueTotal = colls.reduce((s, c) => s + Number(c.rent_due || 0), 0);

  return (
    <div>
      {!lease ? <EmptyState icon={KeyRound} title="No lease yet" sub="Execute the lease once terms are agreed — the monthly rent schedule is generated automatically." action={<Button icon={Plus} onClick={openLeaseForm}>Create lease</Button>} /> : (
        <>
          <div style={{ background: '#fff', border: '1px solid #e7e3f3', borderRadius: 12, padding: '16px 18px', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 700 }}><span style={{ fontFamily: 'monospace', fontSize: 12, color: '#9ca3af' }}>{lease.lease_code}</span> · Lease <Badge tone={lease.status === 'active' ? 'green' : 'grey'}>{lease.status}</Badge></div>
              <Button variant="ghost" icon={Pencil} onClick={openLeaseForm}>Edit</Button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10 }}>
              <KV k="Tenant" v={lease.tenant_name} />
              <KV k="Monthly rent" v={money(lease.monthly_rent)} />
              <KV k="Security deposit" v={money(lease.security_deposit)} />
              <KV k="Term" v={lease.lease_term_months ? `${lease.lease_term_months} months` : '—'} />
              <KV k="Start" v={lease.lease_start} />
              <KV k="Rent collected" v={`${money(collected)} / ${money(dueTotal)}`} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 8px' }}>
            <div style={{ fontWeight: 700 }}>Rent schedule <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: 13 }}>({colls.length} periods)</span></div>
          </div>
          <div style={{ display: 'grid', gap: 6, marginBottom: 20 }}>
            {colls.map((c) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid #e7e3f3', borderRadius: 8, padding: '8px 12px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, minWidth: 70 }}>{c.period_label}</span>
                <span style={{ fontSize: 12.5, color: '#6b7280', flex: 1 }}>due {c.due_date}</span>
                <span style={{ fontSize: 13 }}>{money(c.rent_received)} / {money(c.rent_due)}</span>
                <Badge tone={COLL_TONE[c.status] || 'grey'}>{c.status}</Badge>
                {c.status !== 'paid' && <Button size="sm" variant="ghost" icon={Coins} onClick={() => recordRent(c)}>Record</Button>}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Maintenance log */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 8px' }}>
        <div style={{ fontWeight: 700 }}>Maintenance <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: 13 }}>({maint.length})</span></div>
        <Button size="sm" icon={Plus} onClick={() => setMForm({ title: '', description: '', priority: 'medium', status: 'open', cost: '', vendor: '' })}>Log request</Button>
      </div>
      {maint.length === 0 ? <div style={{ fontSize: 13, color: '#9ca3af', padding: '6px 0' }}>No maintenance requests.</div> : (
        <div style={{ display: 'grid', gap: 6 }}>
          {maint.map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #e7e3f3', borderRadius: 8, padding: '8px 12px', flexWrap: 'wrap' }}>
              <Wrench size={14} style={{ color: ACCENT }} />
              <button onClick={() => setMForm({ ...m })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, flex: 1, textAlign: 'left' }}>{m.title}</button>
              <Badge tone={m.priority === 'high' ? 'red' : m.priority === 'low' ? 'grey' : 'amber'}>{m.priority}</Badge>
              <Badge tone={m.status === 'resolved' ? 'green' : m.status === 'in_progress' ? 'blue' : 'grey'}>{m.status.replace(/_/g, ' ')}</Badge>
              {m.status !== 'resolved' && <Button size="sm" variant="ghost" onClick={async () => { await api.put(`/business-maintenance/${m.id}`, { status: 'resolved' }); load(); }}>Resolve</Button>}
            </div>
          ))}
        </div>
      )}

      {form && (
        <Drawer open title={lease ? 'Edit Lease' : 'Create Lease'} width={520} onClose={() => setForm(null)}
          footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button><Button onClick={saveLease} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button></div>}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Tenant name" full><Input value={form.tenant_name} onChange={(e) => set('tenant_name', e.target.value)} /></Field>
            <Field label="Monthly rent (৳)"><Input type="number" value={form.monthly_rent} onChange={(e) => set('monthly_rent', e.target.value)} /></Field>
            <Field label="Security deposit (৳)"><Input type="number" value={form.security_deposit} onChange={(e) => set('security_deposit', e.target.value)} /></Field>
            <Field label="Lease start"><Input type="date" value={form.lease_start || ''} onChange={(e) => set('lease_start', e.target.value)} /></Field>
            <Field label="Term (months)"><Input type="number" value={form.lease_term_months} onChange={(e) => set('lease_term_months', e.target.value)} /></Field>
            <Field label="Rent due day"><Input type="number" value={form.rent_due_day} onChange={(e) => set('rent_due_day', e.target.value)} /></Field>
            <Field label="Leasing commission (৳)"><Input type="number" value={form.commission_amount} onChange={(e) => set('commission_amount', e.target.value)} /></Field>
            <Field label="Status"><Select value={form.status} onChange={(e) => set('status', e.target.value)}><option value="active">Active</option><option value="renewed">Renewed</option><option value="expired">Expired</option><option value="terminated">Terminated</option></Select></Field>
            <Field label="Notes" full><Textarea rows={2} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} /></Field>
          </div>
          {!lease && <div style={{ marginTop: 10, fontSize: 12.5, color: '#6b7280' }}>A monthly rent schedule will be generated automatically for the lease term.</div>}
        </Drawer>
      )}

      {mForm && (
        <Drawer open title={mForm.id ? 'Edit Maintenance' : 'Log Maintenance'} width={480} onClose={() => setMForm(null)}
          footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><Button variant="ghost" onClick={() => setMForm(null)}>Cancel</Button><Button onClick={saveMaint}>Save</Button></div>}>
          <div style={{ display: 'grid', gap: 12 }}>
            <Field label="Title"><Input value={mForm.title} onChange={(e) => setMForm({ ...mForm, title: e.target.value })} /></Field>
            <Field label="Description"><Textarea rows={3} value={mForm.description} onChange={(e) => setMForm({ ...mForm, description: e.target.value })} /></Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Priority"><Select value={mForm.priority} onChange={(e) => setMForm({ ...mForm, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></Select></Field>
              <Field label="Status"><Select value={mForm.status} onChange={(e) => setMForm({ ...mForm, status: e.target.value })}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></Select></Field>
              <Field label="Vendor"><Input value={mForm.vendor} onChange={(e) => setMForm({ ...mForm, vendor: e.target.value })} /></Field>
              <Field label="Cost (৳)"><Input type="number" value={mForm.cost} onChange={(e) => setMForm({ ...mForm, cost: e.target.value })} /></Field>
            </div>
          </div>
        </Drawer>
      )}
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
