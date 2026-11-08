import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { CareersHeader } from './Careers';
import '../../styles/careers.css';

/* The candidate's offer (HRM Module 3 §15), /offer/:token, no login. The letter comes from the approved offer
   template; the candidate accepts by typing their full name, or declines. Layout: approved "Offer acceptance" frame. */
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });
const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Dhaka' }) : '');

const ANSWERED = {
  accepted: ['Offer accepted', 'Thank you. Human Resources will be in touch about your first day.'],
  declined: ['Offer declined', 'Thank you for letting us know. We wish you well.'],
  expired: ['This offer has expired', 'Please contact Human Resources if you would still like to discuss it.'],
};

export default function OfferAccept() {
  const { token } = useParams();
  const [offer, setOffer] = useState(null);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [agree, setAgree] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { document.title = 'Your offer · Seventh Sky Careers'; }, []);
  useEffect(() => { api.get(`/public/careers/offers/${token}`).then((r) => setOffer(r.data)).catch((e) => setError(e.response?.data?.error || 'This offer link is not valid.')); }, [token]);

  const answer = async (kind) => {
    setMsg(null);
    if (kind === 'accept' && !name.trim()) { setMsg('Type your full name to sign.'); return; }
    if (kind === 'accept' && !agree) { setMsg('Tick the box to confirm you accept the offer.'); return; }
    setBusy(true);
    try {
      const { data } = await api.post(`/public/careers/offers/${token}/${kind}`, kind === 'accept' ? { full_name: name } : { reason });
      setOffer((o) => ({ ...o, status: data.status }));
    } catch (e) { setMsg(e.response?.data?.error || 'Your answer could not be saved. Please try again.'); } finally { setBusy(false); }
  };

  const frame = (children) => <div className="crs"><CareersHeader /><main className="crs-main">{children}</main></div>;
  if (error) return frame(<div className="crs-card crs-empty"><AlertTriangle size={28} aria-hidden /><h2 style={{ marginTop: 8 }}>Link unavailable</h2><p className="sub">{error}</p></div>);
  if (!offer) return frame(<div className="crs-card crs-empty">Loading…</div>);
  const done = ANSWERED[offer.status];

  return frame(
    <div className="crs-grid offer">
      {/* The letter is the stored HTML from our own approved template, with candidate values escaped when it was made. */}
      <article className="crs-card crs-letter" aria-label="Offer letter" dangerouslySetInnerHTML={{ __html: offer.letter_html || '' }} />
      <aside className="crs-card crs-side" aria-live="polite">
        {done ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            {offer.status === 'accepted' ? <CheckCircle2 size={36} color="#0EA5A4" aria-hidden /> : <AlertTriangle size={30} color="#64748B" aria-hidden />}
            <h2 style={{ marginTop: 8 }}>{done[0]}</h2>
            <p className="sub">{done[1]}</p>
            {offer.accepted_at && <p className="crs-note">Accepted on {fmtDay(offer.accepted_at)}.</p>}
          </div>
        ) : declining ? (
          <>
            <h2>Decline the offer</h2>
            <p className="sub">You can tell us why. This is optional.</p>
            <label className="crs-f" htmlFor="reason"><span>Reason</span><textarea id="reason" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
            {msg && <div className="crs-alert" role="alert">{msg}</div>}
            <button type="button" className="crs-btn block" disabled={busy} onClick={() => answer('decline')}>{busy ? 'Saving…' : 'Decline offer'}</button>
            <button type="button" className="crs-btn ghost block" disabled={busy} onClick={() => { setDeclining(false); setMsg(null); }}>Back</button>
          </>
        ) : (
          <>
            <h2>Your response</h2>
            <p className="sub">Type your full name to sign.</p>
            <label className="crs-f" htmlFor="sign"><span>Full name *</span><input id="sign" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={offer.candidate_name} /></label>
            <label className="crs-check"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><span>I accept the offer and its terms.</span></label>
            {msg && <div className="crs-alert" role="alert">{msg}</div>}
            <button type="button" className="crs-btn block" disabled={busy} onClick={() => answer('accept')}>{busy ? 'Saving…' : 'Accept offer'}</button>
            <button type="button" className="crs-btn ghost block" disabled={busy} onClick={() => { setDeclining(true); setMsg(null); }}>Decline</button>
            <p className="crs-note">We record the time and your network address.{offer.expires_at ? ` Please answer by ${fmtDay(offer.expires_at)}.` : ''}</p>
          </>
        )}
      </aside>
    </div>,
  );
}
