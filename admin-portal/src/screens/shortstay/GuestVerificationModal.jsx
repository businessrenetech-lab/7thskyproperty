import React, { useEffect, useState, useCallback, useRef } from 'react';
import { X, Check, ShieldCheck, FileText, Upload, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import { Spinner } from '../../ui/kit';
import { useToast } from '../../context/ToastContext';
import { initials } from './common';

const DOC_CHIP = {
  verified: ['good', 'verified'], under_review: ['warn', 'under review'], submitted: ['info', 'submitted'],
  requested: ['bad', 'requested'], rejected: ['bad', 'rejected'], not_started: ['grey', '—'],
};
const STATE_LABEL = {
  not_started: 'Not started', documents_requested: 'Documents requested', submitted: 'Submitted',
  under_review: 'Under review', verified: 'Verified', more_info_required: 'More information required', rejected: 'Rejected',
};
const HDR_CHIP = {
  verified: 'good', under_review: 'warn', submitted: 'info', documents_requested: 'warn',
  more_info_required: 'warn', rejected: 'bad', not_started: 'grey',
};

// Per-member row action mirrors the mockup: View file / Review / Add file / Chase
function memberAction(m, { onView, onReview, onAdd, onChase }) {
  const btn = { padding: '4px 12px', fontSize: 12 };
  if (m.doc_status === 'verified') return <button className="pm-btn" style={btn} onClick={() => onView(m)}>View file</button>;
  if (m.doc_status === 'under_review' || m.doc_status === 'submitted') return m.doc_url
    ? <button className="pm-btn" style={btn} onClick={() => onReview(m)}>Review</button>
    : <button className="pm-btn" style={btn} onClick={() => onAdd(m)}>Add file</button>;
  if (m.doc_status === 'requested') return m.doc_url
    ? <button className="pm-btn" style={btn} onClick={() => onReview(m)}>Review</button>
    : <button className="pm-btn" style={btn} onClick={() => onChase(m)}>Chase</button>;
  return <button className="pm-btn" style={btn} onClick={() => onAdd(m)}>Add file</button>;
}

export default function GuestVerificationModal({ bookingId, onClose, onChanged }) {
  const toast = useToast();
  const fileRef = useRef();
  const pendingMember = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [risk, setRisk] = useState({ occupation: '', emergency_contact: '', risk_notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/short-stay-verification/bookings/${bookingId}`);
      setData(r.data);
      setRisk({ occupation: r.data.risk?.occupation || '', emergency_contact: r.data.risk?.emergency_contact || '', risk_notes: r.data.risk?.risk_notes || '' });
    } catch { setData(null); } finally { setLoading(false); }
  }, [bookingId]);
  useEffect(() => { load(); }, [load]);

  const refresh = (res) => { setData(res.data); onChanged?.(); };
  const errMsg = (e) => e.response?.data?.error || 'Something went wrong';

  const setState = async (state) => {
    setBusy(true);
    try { const r = await api.post(`/short-stay-verification/bookings/${bookingId}/state`, { state }); refresh(r); toast.success(STATE_LABEL[state]); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const reviewMember = async (m, status) => {
    try { const r = await api.post(`/short-stay-verification/bookings/${bookingId}/review-member`, { occupant_id: m.occupant_id, is_lead: m.is_lead, status }); refresh(r); toast.success(`Marked ${status.replace(/_/g, ' ')}`); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const chase = (m) => toast.success(`Reminder sent to ${m.name}`);
  const viewFile = (m) => { if (m.doc_url) window.open(m.doc_url, '_blank', 'noopener'); else toast.error('No file on record'); };

  const startAdd = (m) => { pendingMember.current = m; fileRef.current?.click(); };
  const onUpload = async (e) => {
    const file = e.target.files?.[0]; const m = pendingMember.current;
    if (!file || !m) return;
    setBusy(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const up = await api.post('/uploads?folder=documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = up.data?.data?.url;
      const r = await api.post(`/short-stay-verification/bookings/${bookingId}/document`, { occupant_id: m.occupant_id, is_lead: m.is_lead, doc_url: url, doc_type: m.doc_type || 'ID' });
      refresh(r); toast.success('Document attached');
    } catch (err) { toast.error(errMsg(err)); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; pendingMember.current = null; }
  };
  const saveRisk = async () => {
    try { const r = await api.post(`/short-stay-verification/bookings/${bookingId}/risk`, risk); refresh(r); toast.success('Risk notes saved'); }
    catch (e) { toast.error(errMsg(e)); }
  };

  const label = 'font-size:11px;font-weight:750;letter-spacing:.05em;text-transform:uppercase;color:var(--muted-2)';

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <aside className="drawer" style={{ width: 'min(920px, 97vw)' }}>
        <div className="drawer-head">
          <h2>Guest verification{data ? ` · ${data.booking_code}` : ''}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="drawer-body">
          {loading || !data ? <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 16, alignItems: 'start' }} className="ss-verif-grid">
              {/* LEFT: party + actions + protected docs */}
              <div>
                <div className="pm-card" style={{ marginBottom: 14 }}>
                  <div className="pm-card-h">
                    <div><h3 style={{ fontSize: 14 }}>Party &amp; identity documents</h3></div>
                    <div className="sp" />
                    <span className={`pm-chip ${HDR_CHIP[data.verification_state] || 'grey'}`}><span className="d" />{STATE_LABEL[data.verification_state]}</span>
                  </div>
                  <div className="pm-card-body" style={{ padding: 0 }}>
                    {data.party.map((m) => {
                      const [tone, dl] = DOC_CHIP[m.doc_status] || ['grey', m.doc_status];
                      return (
                        <div key={m.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr) auto', gap: 12, alignItems: 'center', padding: '11px 16px', borderBottom: '1px solid var(--line-soft)' }}>
                          <div className="pm-who">
                            <div className="pm-avatar">{initials(m.name)}</div>
                            <div>
                              <div className="nm">{m.name} <span className="pm-chip grey" style={{ marginLeft: 4 }}>{m.role_label}</span></div>
                              <div className="ph">{m.phone || m.id_number || ''}{m.sub ? ` · ${m.sub}` : ''}</div>
                            </div>
                          </div>
                          <div>
                            <div style={{ font: `inherit`, cssText: label }} className="verif-lbl">Identity document</div>
                            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{m.doc_type || '—'} <span className={`pm-chip ${tone}`} style={{ marginLeft: 4 }}><span className="d" />{dl}</span></div>
                          </div>
                          <div style={{ textAlign: 'right', display: 'inline-flex', gap: 6, justifyContent: 'flex-end' }}>
                            {memberAction(m, { onView: viewFile, onReview: (x) => reviewMember(x, 'verified'), onAdd: startAdd, onChase: chase })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Footer actions */}
                  <div style={{ display: 'flex', gap: 8, padding: '12px 16px' }}>
                    <button className="pm-btn primary" disabled={busy} onClick={() => setState('verified')}><ShieldCheck size={15} /> Mark verified</button>
                    <button className="pm-btn" disabled={busy} onClick={() => setState('more_info_required')}>Request more information</button>
                    <button className="pm-btn" disabled={busy} onClick={() => setState('rejected')} style={{ color: 'var(--bad)' }}>Reject</button>
                  </div>
                </div>

                {/* Protected documents vault */}
                <div className="pm-card">
                  <div className="pm-card-h">
                    <div><h3 style={{ fontSize: 14 }}>Protected documents</h3></div>
                    <div className="sp" />
                    <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>Watermarked · access logged</span>
                  </div>
                  <div className="pm-card-body">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                      {(data.protected_docs || []).map((d, i) => (
                        <div key={i} onClick={() => d.url && window.open(d.url, '_blank', 'noopener')} style={{ cursor: d.url ? 'pointer' : 'default', border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
                          <div style={{ aspectRatio: '1', background: 'repeating-linear-gradient(45deg,var(--surface-2),var(--surface-2) 8px,var(--surface-3,#eef2f7) 8px,var(--surface-3,#eef2f7) 16px)', display: 'grid', placeItems: 'center', color: 'var(--muted-2)', fontSize: 10 }}>protected</div>
                          <div style={{ padding: '6px 8px' }}><div style={{ fontSize: 11.5, fontWeight: 650, color: 'var(--ink)' }}>{d.label}</div><div style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'capitalize' }}>{String(d.status || '').replace(/_/g, ' ')}</div></div>
                        </div>
                      ))}
                      {!(data.protected_docs || []).length && <div style={{ gridColumn: '1/-1', color: 'var(--muted)', fontSize: 12.5, padding: '8px 0' }}>No protected documents yet. Uploaded IDs are stored in the private, access-logged vault.</div>}
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: verification state timeline + risk & notes */}
              <div>
                <div className="pm-card" style={{ marginBottom: 14 }}>
                  <div className="pm-card-h"><div><h3 style={{ fontSize: 14 }}>Verification state</h3></div></div>
                  <div className="pm-card-body" style={{ padding: '6px 16px 12px' }}>
                    {data.timeline.map((t) => (
                      <div key={t.state} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', borderBottom: '1px solid var(--line-soft)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.done ? (t.state === data.verification_state ? 'var(--cyan)' : 'var(--good)') : 'var(--line)', flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 12.5, fontWeight: t.state === data.verification_state ? 700 : 500, color: t.done ? 'var(--ink)' : 'var(--muted-2)' }}>{STATE_LABEL[t.state]}</span>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{t.at ? new Date(t.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</span>
                      </div>
                    ))}
                    <button className="pm-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} disabled={busy} onClick={() => setState('documents_requested')}><FileText size={14} /> Request documents</button>
                  </div>
                </div>

                <div className="pm-card">
                  <div className="pm-card-h"><div><h3 style={{ fontSize: 14 }}>Risk &amp; notes</h3></div></div>
                  <div className="pm-card-body">
                    <div style={{ marginBottom: 10 }}><label className="verif-lbl">Occupation / employer</label><input value={risk.occupation} onChange={(e) => setRisk({ ...risk, occupation: e.target.value })} style={inp} /></div>
                    <div style={{ marginBottom: 10 }}><label className="verif-lbl">Emergency contact</label><input value={risk.emergency_contact} onChange={(e) => setRisk({ ...risk, emergency_contact: e.target.value })} style={inp} /></div>
                    <div><label className="verif-lbl">Risk notes</label><textarea rows={4} value={risk.risk_notes} onChange={(e) => setRisk({ ...risk, risk_notes: e.target.value })} style={{ ...inp, resize: 'vertical' }} /></div>
                    <button className="pm-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} onClick={saveRisk}>Save notes</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={onUpload} style={{ display: 'none' }} />
      </aside>
      <style>{`.verif-lbl{font-size:11px;font-weight:750;letter-spacing:.05em;text-transform:uppercase;color:var(--muted-2);display:block;margin-bottom:4px}
      @media (max-width:820px){ .ss-verif-grid{ grid-template-columns:1fr!important } }`}</style>
    </>
  );
}
const inp = { width: '100%', border: '1px solid var(--line)', borderRadius: 9, padding: '8px 11px', font: 'inherit', fontSize: 12.5, color: 'var(--ink)', background: 'var(--surface)' };
