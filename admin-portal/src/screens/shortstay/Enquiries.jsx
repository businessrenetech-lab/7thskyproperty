import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Plus, Search } from 'lucide-react';
import api from '../../services/api';
import { Spinner } from '../../ui/kit';
import { initials, Chip, fmtRange, ScreenHead } from './common';

// Status-aware primary action mirroring the mockup (Qualify / Send options / Suggest / Convert)
function enquiryAction(r, actions) {
  const btn = { padding: '4px 10px', fontSize: 12 };
  // A held reservation must complete guest terms and KYC before payment confirmation.
  if (r.status === 'hold') return <button className="pm-btn primary" style={btn} onClick={() => actions.sendGuestAgreement?.(r.id)}>Send terms</button>;
  if (r.source_record === 'website_enquiry' && r.status !== 'new') return <button className="pm-btn primary" style={btn} onClick={() => actions.convertEnquiry?.(r)}>Create booking</button>;
  if (!r.property_interest) return <button className="pm-btn" style={btn} onClick={() => actions.qualifyEnquiry?.(r)}>Suggest property</button>;
  return <button className="pm-btn primary" style={btn} onClick={() => actions.qualifyEnquiry?.(r)}>Qualify</button>;
}

export default function Enquiries({ actions = {}, refreshKey }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [source, setSource] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get('/short-stay/enquiries'); setRows(Array.isArray(res.data) ? res.data : []); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => (source === 'all' || r.source === source)
      && (!t || r.guest_name?.toLowerCase().includes(t) || (r.property_interest || '').toLowerCase().includes(t)));
  }, [rows, q, source]);

  if (loading) return <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>;

  return (
    <div>
      <ScreenHead title="Enquiries" desc="Requests waiting to be qualified, quoted or converted into bookings."
        actions={<button className="pm-btn primary" onClick={actions.addBooking}><Plus size={15} /> Create reservation</button>} />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ flex: '1 1 260px', display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--line)', borderRadius: 10, padding: '0 12px', background: 'var(--surface)' }}>
          <Search size={15} color="var(--muted)" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search enquiries…" style={{ border: 0, outline: 0, background: 'transparent', padding: '9px 0', font: 'inherit', flex: 1, color: 'var(--ink)' }} />
        </div>
        <select value={source} onChange={(e) => setSource(e.target.value)} style={sel}>
          <option value="all">Source · all</option>
          {['direct', 'website', 'phone', 'airbnb', 'booking_com', 'agoda', 'corporate'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <div className="pm-card"><div className="pm-card-body ss-table-scroll" style={{ padding: 0 }}>
        <table className="pm-tbl">
          <thead><tr><th>Guest</th><th>Contact</th><th>Requested dates</th><th>Guests</th><th>Property interest</th><th>Source</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td><div className="pm-who"><div className="pm-avatar">{initials(r.guest_name)}</div><div><div className="nm">{r.guest_name}</div></div></div></td>
                <td style={{ fontSize: 12.5 }}>{r.contact}</td>
                <td style={{ fontSize: 12.5 }}>{fmtRange(r.check_in_date, r.check_out_date)}</td>
                <td style={{ fontSize: 12.5 }}>{r.adults_count} adult{r.adults_count === 1 ? '' : 's'}{r.children_count ? ` · ${r.children_count} kid${r.children_count === 1 ? '' : 's'}` : ''}</td>
                <td style={{ fontSize: 12.5 }}>{r.property_interest || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                <td style={{ textTransform: 'capitalize', fontSize: 12.5 }}>{String(r.source || '').replace(/_/g, ' ')}</td>
                <td><Chip k={r.status} /></td>
                <td style={{ textAlign: 'right' }}>{enquiryAction(r, actions)}</td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>No open enquiries. New enquiries appear here as they come in.</td></tr>}
          </tbody>
        </table>
      </div></div>
    </div>
  );
}
const sel = { border: '1px solid var(--line)', borderRadius: 10, padding: '9px 12px', background: 'var(--surface)', font: 'inherit', color: 'var(--ink)', textTransform: 'capitalize' };
