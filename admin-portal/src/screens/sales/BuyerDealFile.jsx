// admin-portal/src/screens/sales/BuyerDealFile.jsx
//
// The buyer deal "file": a buy PropertyDeal with the 8-stage Residential Purchase
// SOP workflow, plus buyer/requirements/agreement/fees context. Reuses the
// progressive-SOP stage rendering from the seller property file. Buyer service is
// fee-for-coordination — no trust settlement (stage 7 is coordination only).
import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, Users, HandCoins, FileSignature, ShieldCheck, Wrench } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { PageHead, Button, Spinner, StatusBadge, Badge, Field, Input, Textarea, Select } from '../../ui/kit';
import UploadButton from '../../ui/UploadButton';

const bdt = (v) => '৳' + Number(v || 0).toLocaleString('en-BD');
const SOP_TIER = { on_track: null, due_soon: ['amber', 'Due soon'], overdue: ['red', 'Overdue'], escalated: ['red', 'Escalated'] };
const TABS = [
  { key: 'workflow', label: 'Workflow', icon: ClipboardCheck },
  { key: 'requirements', label: 'Requirements & Candidates', icon: Users },
  { key: 'agreement', label: 'Agreement & Fees', icon: FileSignature },
  { key: 'settlement', label: 'Settlement coordination', icon: HandCoins },
];

export default function BuyerDealFile() {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState('workflow');
  const [file, setFile] = useState(undefined);
  const [sop, setSop] = useState(undefined);

  const loadFile = useCallback(async () => {
    try { const { data } = await api.get(`/sales/deals/${dealId}`); setFile(data.data); }
    catch { setFile(null); toast.error('Could not load the buyer deal'); }
  }, [dealId, toast]);
  const loadSop = useCallback(async () => {
    try { const { data } = await api.get(`/sales/deals/${dealId}/sop`); setSop(data.data); }
    catch { setSop(null); }
  }, [dealId]);
  useEffect(() => { loadFile(); loadSop(); }, [loadFile, loadSop]);

  const startSop = async () => {
    try { const { data } = await api.post(`/sales/deals/${dealId}/sop`); setSop(data.data); toast.success('Purchase SOP started'); }
    catch (e) { toast.error(e.response?.data?.error || 'Could not start the SOP'); }
  };
  const patchStage = async (stage, patch) => {
    try { await api.patch(`/projects/${sop.id}/stages/${stage.id}`, patch); loadSop(); }
    catch (e) { toast.error(e.response?.data?.error || 'Could not update the stage'); }
  };

  // Stage 2 — save planning fields / toggle the approve-to-proceed gate.
  const saveMandate = async (patch) => {
    if (!file.mandate) return;
    try { await api.put(`/buyer-mandates/${file.mandate.id}`, patch); toast.success('Saved'); loadFile(); }
    catch (e) { toast.error(e.response?.data?.error || 'Could not save'); }
  };
  const toggleApprove = async () => {
    if (!file.mandate) return;
    try { await api.post(`/buyer-mandates/${file.mandate.id}/approve-to-proceed`, { approved: !file.mandate.approved_to_proceed }); loadFile(); }
    catch (e) { toast.error(e.response?.data?.error || 'Could not update approval'); }
  };
  // Stage 4 — save per-candidate viewing / inspection.
  const saveCandidate = async (cid, patch) => {
    try { await api.patch(`/buyer-mandates/candidates/${cid}`, patch); toast.success('Saved'); loadFile(); }
    catch (e) { toast.error(e.response?.data?.error || 'Could not save'); }
  };

  if (file === undefined) return <div className="card-pad" style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>;
  if (file === null) return <div className="pm-card card-pad">Buyer deal not found. <Button variant="ghost" onClick={() => navigate('/residential/buyer-service')}>Back</Button></div>;

  const deal = file.deal;
  const buyer = deal.buyer?.Contact?.full_name || '—';
  const property = deal.Property;

  return (
    <div className="pm-scope">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/residential/buyer-service')}>Back</Button>
      </div>
      <PageHead
        title={`${deal.deal_code} · ${buyer}`}
        desc={`Buyer service${property ? ` · ${property.property_code || property.title || ''}` : ' · no property linked yet'} · ${deal.status}`}
      />

      {/* Fee rollup — buyers pay our service fees (no trust settlement). */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '8px 0 16px' }}>
        {[['Fees invoiced', file.fees.total], ['Collected', file.fees.collected], ['Outstanding', file.fees.outstanding]].map(([l, v]) => (
          <div key={l} style={{ flex: '1 1 160px', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px' }}>
            <div className="cell-sub">{l}</div><strong style={{ fontSize: 16 }}>{bdt(v)}</strong>
          </div>
        ))}
      </div>

      <div className="pm-segment" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map((t) => <button key={t.key} className={`pm-seg-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>)}
      </div>

      {/* WORKFLOW — the 8-stage purchase SOP */}
      {tab === 'workflow' && (
        <div className="pm-col">
          {sop === undefined ? <div className="pm-card card-pad"><Spinner /></div>
            : sop === null ? (
              <div className="pm-card card-pad" style={{ textAlign: 'center' }}>
                <ClipboardCheck size={26} style={{ opacity: 0.5 }} />
                <p style={{ margin: '8px 0' }}>No purchase SOP workflow yet.</p>
                <Button onClick={startSop}>Start purchase SOP</Button>
              </div>
            ) : (sop.stages || []).map((stage) => {
              const locked = stage.status === 'blocked';
              const readOnly = ['done', 'blocked'].includes(stage.status);
              const tier = SOP_TIER[stage.deadline_tier];
              return (
                <div key={stage.id} className="pm-card" style={{ opacity: locked ? 0.55 : 1, marginBottom: 12 }}>
                  <div className="pm-card-body" style={{ padding: 14 }}>
                    <div className="between" style={{ marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                        <ClipboardCheck size={15} /> {stage.sort_order}. {stage.stage_name}
                        <Badge tone="blue">{stage.phase}</Badge>
                      </div>
                      {locked ? <span className="cell-sub">🔒 {stage.unlock_hint || 'locked'}</span>
                        : stage.status !== 'done' ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            {stage.status !== 'in_progress' && <Button size="sm" variant="ghost" onClick={() => patchStage(stage, { status: 'in_progress' })}>Start</Button>}
                            <Button size="sm" onClick={() => patchStage(stage, { status: 'done' })}>Mark done</Button>
                          </div>
                        ) : <StatusBadge status={stage.status} />}
                    </div>
                    {stage.due_date && !['blocked', 'done'].includes(stage.status) && (
                      <div className="cell-sub" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                        Due {stage.due_date}{tier && <Badge tone={tier[0]}>{tier[1]}{stage.days_overdue ? ` · ${stage.days_overdue}d` : ''}</Badge>}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(stage.checklist || []).map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200 }}>
                            <input type="checkbox" checked={!!item.done} disabled={readOnly}
                              onChange={(e) => patchStage(stage, { checklist: (stage.checklist || []).map((c, i) => (i === idx ? { ...c, done: e.target.checked } : c)) })} />
                            <span>{item.label}{item.required ? ' *' : ''}</span>
                          </label>
                          {!readOnly && (
                            <UploadButton value={item.evidence_url} folder="documents" label="Evidence"
                              onChange={(url) => patchStage(stage, { checklist: (stage.checklist || []).map((c, i) => (i === idx ? { ...c, evidence_url: url } : c)) })} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* REQUIREMENTS & CANDIDATES (stages 2-4) */}
      {tab === 'requirements' && (
        <div className="pm-col">
          {!file.mandate ? (
            <div className="pm-card card-pad"><p className="cell-sub">No buyer mandate linked. Create one from Buyer Mandates.</p>
              <Button size="sm" variant="ghost" style={{ marginTop: 8 }} onClick={() => navigate('/residential/mandates')}>Open buyer mandates</Button></div>
          ) : (
            <PlanningPanel mandate={file.mandate} onSave={saveMandate} onToggleApprove={toggleApprove} candidates={file.candidates} onSaveCandidate={saveCandidate} />
          )}
        </div>
      )}

      {/* AGREEMENT & FEES */}
      {tab === 'agreement' && (
        <div className="pm-card"><div className="pm-card-body" style={{ padding: 16 }}>
          <div className="between" style={{ marginBottom: 8 }}>
            <strong>Purchase agreements (RPPS)</strong>
            <Button size="sm" onClick={() => navigate(`/residential/agreements/purchase?property_id=${deal.property_id || ''}`)}>New / manage</Button>
          </div>
          {file.agreements.length === 0 ? <p className="cell-sub">No purchase agreement yet.</p> : (
            <table className="tbl"><thead><tr><th>Envelope</th><th>Status</th><th>Signed</th></tr></thead><tbody>
              {file.agreements.map((a) => <tr key={a.id}><td><strong>{a.envelope_code}</strong></td><td><StatusBadge status={a.status} /></td><td>{a.signed_count}/{a.total_signers}</td></tr>)}
            </tbody></table>
          )}
          <div className="between" style={{ margin: '16px 0 8px' }}>
            <strong>Fee invoices</strong>
            <Button size="sm" variant="ghost" onClick={() => navigate('/residential/accounting')}>Open Invoices tab</Button>
          </div>
          {file.invoices.length === 0 ? <p className="cell-sub">No fee invoices yet — they draft when the RPPS agreement is signed.</p> : (
            <table className="tbl"><thead><tr><th>Invoice</th><th>Title</th><th>Status</th><th style={{ textAlign: 'right' }}>Total</th><th style={{ textAlign: 'right' }}>Balance</th></tr></thead><tbody>
              {file.invoices.map((i) => <tr key={i.id}><td><strong>{i.invoice_code}</strong></td><td>{i.title}</td><td><StatusBadge status={i.status} /></td><td style={{ textAlign: 'right' }}>{bdt(i.total)}</td><td style={{ textAlign: 'right' }}>{bdt(i.balance)}</td></tr>)}
            </tbody></table>
          )}
        </div></div>
      )}

      {/* SETTLEMENT COORDINATION — placeholder (Phase C) */}
      {tab === 'settlement' && (
        <div className="pm-card"><div className="pm-card-body" style={{ padding: 16 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 8 }}><HandCoins size={16} /> Settlement coordination</div>
          <p className="cell-sub">Buyer service coordinates the <strong>external</strong> settlement — Seventh Sky does not hold the purchase funds, so there is no trust settlement here. Registration status, settlement date, payment tracking and handover confirmation are added in the next phase. Our service fees are collected via the fee invoices (Agreement &amp; Fees tab).</p>
        </div></div>
      )}
    </div>
  );
}

// Stage 2 (planning + approve gate) + stage 4 (per-candidate viewing/inspection).
function PlanningPanel({ mandate, onSave, onToggleApprove, candidates, onSaveCandidate }) {
  const [f, setF] = useState({
    finance_status: mandate.finance_status || 'unknown',
    investment_use: mandate.investment_use || '',
    search_strategy: mandate.search_strategy || '',
    risk_notes: mandate.risk_notes || '',
  });
  const dirty = f.finance_status !== (mandate.finance_status || 'unknown') || f.investment_use !== (mandate.investment_use || '')
    || f.search_strategy !== (mandate.search_strategy || '') || f.risk_notes !== (mandate.risk_notes || '');
  return (
    <>
      <div className="pm-card"><div className="pm-card-body" style={{ padding: 16 }}>
        <div className="between" style={{ marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <strong>Requirement assessment &amp; planning (Stage 2)</strong>
          <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            {mandate.approved_to_proceed
              ? <Badge tone="green">Approved to proceed{mandate.approved_at ? ` · ${String(mandate.approved_at).slice(0, 10)}` : ''}</Badge>
              : <Badge tone="amber">Not yet approved</Badge>}
            <Button size="sm" variant={mandate.approved_to_proceed ? 'ghost' : 'primary'} onClick={onToggleApprove}>
              {mandate.approved_to_proceed ? 'Withdraw approval' : 'Approve to proceed'}
            </Button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Finance readiness"><Select value={f.finance_status} onChange={(e) => setF((p) => ({ ...p, finance_status: e.target.value }))}>
            {['unknown', 'pre_approved', 'cash', 'pending', 'declined'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </Select></Field>
          <Field label="Intended use"><Input value={f.investment_use} onChange={(e) => setF((p) => ({ ...p, investment_use: e.target.value }))} placeholder="Owner-occupier / Investment" /></Field>
          <div style={{ gridColumn: '1 / -1' }}><Field label="Search strategy"><Textarea value={f.search_strategy} onChange={(e) => setF((p) => ({ ...p, search_strategy: e.target.value }))} /></Field></div>
          <div style={{ gridColumn: '1 / -1' }}><Field label="Risk notes"><Textarea value={f.risk_notes} onChange={(e) => setF((p) => ({ ...p, risk_notes: e.target.value }))} /></Field></div>
        </div>
        <div style={{ marginTop: 10 }}><Button size="sm" disabled={!dirty} onClick={() => onSave(f)}>Save planning</Button></div>
      </div></div>

      <div className="pm-card" style={{ marginTop: 12 }}><div className="pm-card-body" style={{ padding: 16 }}>
        <strong>Shortlisted candidates &amp; inspections (Stages 3-4) — {candidates.length}</strong>
        {candidates.length === 0 ? <p className="cell-sub" style={{ marginTop: 8 }}>No candidates shortlisted yet.</p>
          : candidates.map((c) => <CandidateRow key={c.id} c={c} onSave={onSaveCandidate} />)}
      </div></div>
    </>
  );
}

function CandidateRow({ c, onSave }) {
  const [v, setV] = useState({
    viewing_date: c.viewing_date ? String(c.viewing_date).slice(0, 10) : '',
    inspection_notes: c.inspection_notes || '',
    feedback: c.feedback || '',
  });
  const photos = Array.isArray(c.inspection_photos) ? c.inspection_photos : [];
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 12, marginTop: 10 }}>
      <div className="between" style={{ marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
        <strong>{c.property?.property_code || c.property?.title || `Property #${c.property_id}`}</strong>
        <StatusBadge status={c.status} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12, alignItems: 'end' }}>
        <Field label="Viewing date"><Input type="date" value={v.viewing_date} onChange={(e) => setV((p) => ({ ...p, viewing_date: e.target.value }))} /></Field>
        <Field label="Buyer feedback"><Input value={v.feedback} onChange={(e) => setV((p) => ({ ...p, feedback: e.target.value }))} /></Field>
        <div style={{ gridColumn: '1 / -1' }}><Field label="Inspection notes"><Textarea value={v.inspection_notes} onChange={(e) => setV((p) => ({ ...p, inspection_notes: e.target.value }))} /></Field></div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
        <UploadButton folder="documents" label="Add inspection photo" onChange={(url) => url && onSave(c.id, { inspection_photos: [...photos, url] })} />
        {photos.map((u, i) => <a key={i} className="btn btn-ghost btn-sm" href={u} target="_blank" rel="noreferrer">Photo {i + 1}</a>)}
        <div style={{ flex: 1 }} />
        <Button size="sm" onClick={() => onSave(c.id, v)}>Save</Button>
      </div>
    </div>
  );
}
