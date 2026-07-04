import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, X, Clock, Home, User, ShieldCheck, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { Spinner, Badge, Button, Textarea } from '../ui/kit';

// Public page — the owner opens /approve/:token from email/WhatsApp, no login.
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });
const money = (v) => 'BDT ' + Number(v || 0).toLocaleString();

export default function OwnerApprove() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(null);
  const [done, setDone] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/public-party/owner-approval/${token}`);
        setData(data.data);
        if (data.data.already_decided) setDone({ decision: data.data.owner_decision, message: 'A decision has already been recorded for this application.' });
      } catch (e) {
        setError(e.response?.data?.error || 'This link is invalid or has expired.');
      }
    })();
  }, [token]);

  const decide = async (decision) => {
    setBusy(decision);
    try {
      const { data } = await api.post(`/public-party/owner-approval/${token}/decide`, { decision, note });
      setDone({ decision, message: data.message });
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to record your decision.');
    } finally { setBusy(null); }
  };

  const Shell = ({ children }) => (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ width: '100%', maxWidth: 620 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ display: 'inline-grid', placeItems: 'center', width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,var(--primary),var(--accent))', color: '#fff', fontWeight: 800, fontSize: 18 }}>7S</div>
          <div style={{ fontWeight: 800, marginTop: 8 }}>Seventh Sky Property Care</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Tenant Approval Request</div>
        </div>
        {children}
      </div>
    </div>
  );

  if (error) return <Shell><div className="card" style={{ padding: 24, textAlign: 'center' }}><AlertTriangle size={28} color="var(--danger)" /><h3>Link unavailable</h3><p className="cell-sub">{error}</p></div></Shell>;
  if (!data) return <Shell><div className="card" style={{ padding: 40, textAlign: 'center' }}><Spinner /></div></Shell>;

  if (done) return (
    <Shell>
      <div className="card" style={{ padding: 28, textAlign: 'center' }}>
        {done.decision === 'approved' ? <Check size={36} color="var(--success)" /> : done.decision === 'rejected' ? <X size={36} color="var(--danger)" /> : <Clock size={36} color="var(--warning)" />}
        <h3 style={{ margin: '10px 0 6px', textTransform: 'capitalize' }}>{done.decision}</h3>
        <p className="cell-sub" style={{ margin: 0 }}>{done.message}</p>
      </div>
    </Shell>
  );

  const a = data.applicant;
  return (
    <Shell>
      <div className="card" style={{ padding: 20, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Home size={16} color="var(--primary)" />
          <strong>{data.property?.title}</strong>
          <span className="cell-sub">· {[data.property?.area, data.property?.district].filter(Boolean).join(', ')}</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          A tenant application is ready for your decision. Review the summary below and approve or reject.
        </div>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <User size={16} color="var(--primary)" /><strong style={{ fontSize: 16 }}>{a.name}</strong>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', fontSize: 13 }}>
          <div><span className="cell-sub">Occupation</span><br /><strong>{a.occupation || '—'}</strong>{a.employer ? ` at ${a.employer}` : ''}</div>
          <div><span className="cell-sub">Monthly income</span><br /><strong>{money(a.monthly_income)}</strong></div>
          <div><span className="cell-sub">Proposed rent</span><br /><strong>{money(data.proposed_rent)}</strong></div>
          <div><span className="cell-sub">Move-in target</span><br /><strong>{a.preferred_move_in || data.lease_start_target || '—'}</strong></div>
          <div><span className="cell-sub">Lease period</span><br /><strong>{a.lease_period || '—'}</strong></div>
          <div><span className="cell-sub">Occupants</span><br /><strong>{data.occupants.length ? data.occupants.map((o) => `${o.name} (${o.relationship || '—'})`).join(', ') : a.occupancy_requirement || '—'}</strong></div>
        </div>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ShieldCheck size={16} color="var(--primary)" /><strong>Verification by Seventh Sky</strong></div>
          <Badge tone={data.verification.passed === data.verification.total ? 'green' : 'amber'}>{data.verification.passed}/{data.verification.total} checks passed</Badge>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {data.verification.items.map((v, i) => (
            <span key={i} className="badge" style={{ background: 'var(--surface-2)', border: `1px solid var(--${v.status === 'passed' || v.status === 'na' ? 'success' : v.status === 'failed' ? 'danger' : 'border'})`, fontSize: 11 }}>
              {v.status === 'passed' || v.status === 'na' ? '✓' : v.status === 'failed' ? '✗' : '…'} {v.item}
            </span>
          ))}
        </div>
        {data.recommendation && data.recommendation !== 'pending' && (
          <div style={{ marginTop: 10, fontSize: 13 }}><strong>Seventh Sky recommendation:</strong> <span style={{ textTransform: 'capitalize' }}>{data.recommendation}</span></div>
        )}
        {data.screening_notes && <div className="cell-sub" style={{ marginTop: 6, fontSize: 12.5 }}>{data.screening_notes}</div>}
      </div>

      <div className="card" style={{ padding: 20 }}>
        <Textarea rows={2} placeholder="Add a note (optional)…" value={note} onChange={(e) => setNote(e.target.value)} />
        <div style={{ display: 'flex', gap: 10, marginTop: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button variant="ghost" onClick={() => decide('hold')} disabled={busy}>{busy === 'hold' ? <Spinner /> : 'Request more info'}</Button>
          <Button variant="ghost" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => decide('rejected')} disabled={busy}>{busy === 'rejected' ? <Spinner /> : <><X size={14} /> Reject</>}</Button>
          <Button onClick={() => decide('approved')} disabled={busy}>{busy === 'approved' ? <Spinner /> : <><Check size={14} /> Approve tenant</>}</Button>
        </div>
      </div>
    </Shell>
  );
}
