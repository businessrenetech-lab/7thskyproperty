import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Plus, Search, XCircle, CalendarRange } from 'lucide-react';
import api from '../../services/api';
import { Spinner } from '../../ui/kit';
import { bdt, bdtFull, initials, Chip, fmtDate, ScreenHead } from './common';

const num = (v) => Number(v || 0);
const verifyOf = (b) => (['confirmed', 'ready_checkin', 'checked_in', 'checked_out', 'closed', 'pending_payment'].includes(b.status)
  ? 'verified' : b.status === 'pending_verification' ? 'under_review' : b.status === 'enquiry' || b.status === 'hold' ? 'not_started' : 'submitted');
const agreementOf = (b) => (['confirmed', 'ready_checkin', 'checked_in', 'checked_out', 'closed'].includes(b.status)
  ? 'signed' : b.agreement_envelope_id ? 'sent' : 'draft');
const paymentOf = (b) => {
  const paid = num(b.paid_amount), total = num(b.total_booking_value);
  if (total > 0 && paid >= total) return 'paid';
  if (paid > 0) return 'part_paid';
  return 'unpaid';
};

const SEGMENTS = [
  { id: 'all', label: 'All' },
  { id: 'needs_action', label: 'Needs action' },
  { id: 'arriving', label: 'Arriving' },
  { id: 'in_house', label: 'In house' },
  { id: 'departing', label: 'Departing' },
  { id: 'closure', label: 'Closure pending' },
];
const NEEDS_ACTION = ['hold', 'pending_verification', 'pending_agreement', 'pending_payment', 'inspection_pending'];

export default function Bookings({ actions = {}, goTab, refreshKey }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seg, setSeg] = useState('all');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [source, setSource] = useState('all');
  const [propertyF, setPropertyF] = useState('all');
  const [agreementF, setAgreementF] = useState('all');
  const [paymentF, setPaymentF] = useState('all');
  const [sort, setSort] = useState('checkin_asc');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/short-stay/bookings');
      setRows(Array.isArray(res.data) ? res.data : []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  const today = new Date().toISOString().slice(0, 10);
  const inSeg = (b) => {
    switch (seg) {
      case 'needs_action': return NEEDS_ACTION.includes(b.status);
      case 'arriving': return ['confirmed', 'ready_checkin'].includes(b.status) && b.check_in_date >= today;
      case 'in_house': return b.status === 'checked_in';
      case 'departing': return b.status === 'checked_in' && b.check_out_date <= today;
      case 'closure': return ['checked_out', 'inspection_pending'].includes(b.status);
      default: return true;
    }
  };
  const counts = useMemo(() => {
    const c = {};
    for (const s of SEGMENTS) c[s.id] = rows.filter((b) => (s.id === 'all' ? true
      : s.id === 'needs_action' ? NEEDS_ACTION.includes(b.status)
      : s.id === 'arriving' ? ['confirmed', 'ready_checkin'].includes(b.status) && b.check_in_date >= today
      : s.id === 'in_house' ? b.status === 'checked_in'
      : s.id === 'departing' ? b.status === 'checked_in' && b.check_out_date <= today
      : ['checked_out', 'inspection_pending'].includes(b.status))).length;
    return c;
  }, [rows, today]);

  const propertyOptions = useMemo(() => {
    const seen = new Map();
    rows.forEach((b) => { if (b.property_id && !seen.has(b.property_id)) seen.set(b.property_id, b.property?.title || `#${b.property_id}`); });
    return [...seen.entries()];
  }, [rows]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = rows.filter((b) => inSeg(b)
      && (status === 'all' || b.status === status)
      && (source === 'all' || b.booking_source === source)
      && (propertyF === 'all' || String(b.property_id) === propertyF)
      && (agreementF === 'all' || agreementOf(b) === agreementF)
      && (paymentF === 'all' || paymentOf(b) === paymentF)
      && (!t || b.booking_code?.toLowerCase().includes(t) || b.property?.title?.toLowerCase().includes(t) || b.lead_guest?.full_name?.toLowerCase().includes(t)));
    const dir = { checkin_asc: (a, c) => (a.check_in_date || '').localeCompare(c.check_in_date || ''), checkin_desc: (a, c) => (c.check_in_date || '').localeCompare(a.check_in_date || ''), value_desc: (a, c) => num(c.total_booking_value) - num(a.total_booking_value), ref_desc: (a, c) => c.id - a.id };
    return list.sort(dir[sort] || dir.checkin_asc);
  }, [rows, seg, q, status, source, propertyF, agreementF, paymentF, sort, today]);

  const rowAction = (b) => {
    const cancel = <button className="pm-btn" style={btn} onClick={(e) => { e.stopPropagation(); actions.cancelBooking?.(b); }}><XCircle size={13} /> Cancel</button>;
    const reschedule = <button className="pm-btn" style={btn} onClick={(e) => { e.stopPropagation(); actions.rescheduleBooking?.(b); }}><CalendarRange size={13} /> Amend</button>;
    if (['hold', 'pending_verification', 'pending_agreement'].includes(b.status)) {
      return (
        <div style={{ display: 'inline-flex', gap: 6 }}>
          {!b.agreement_envelope_id && <button className="pm-btn" style={btn} onClick={(e) => { e.stopPropagation(); actions.sendGuestAgreement?.(b.id); }}>Send terms</button>}
          {reschedule}{cancel}
        </div>
      );
    }
    if (b.status === 'pending_payment') return <div style={{ display: 'inline-flex', gap: 6 }}><button className="pm-btn primary" style={btn} onClick={(e) => { e.stopPropagation(); actions.confirm?.(b); }}>Confirm</button>{reschedule}{cancel}</div>;
    if (['confirmed', 'ready_checkin'].includes(b.status)) return <div style={{ display: 'inline-flex', gap: 6 }}><button className="pm-btn primary" style={btn} onClick={(e) => { e.stopPropagation(); goTab?.('checkin', { booking: b.id }); }}>Check-in</button>{reschedule}{cancel}</div>;
    if (b.status === 'checked_in') return <button className="pm-btn" style={btn} onClick={(e) => { e.stopPropagation(); goTab?.('checkin', { booking: b.id }); }}>Check-out</button>;
    if (['checked_out', 'inspection_pending'].includes(b.status)) return <span className="pm-chip info"><span className="d" />Closure</span>;
    return <span style={{ color: 'var(--muted)' }}>—</span>;
  };

  if (loading) return <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>;

  return (
    <div>
      <ScreenHead
        title="Bookings"
        desc="Every stay with its agreement, verification and payment position."
        actions={<button className="pm-btn primary" onClick={actions.addBooking}><Plus size={15} /> Add booking</button>}
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div className="pm-search" style={{ flex: '1 1 260px', display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--line)', borderRadius: 10, padding: '0 12px', background: 'var(--surface)' }}>
          <Search size={15} color="var(--muted)" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Guest or reference…" style={{ border: 0, outline: 0, background: 'transparent', padding: '9px 0', font: 'inherit', flex: 1, color: 'var(--ink)' }} />
        </div>
        <select className="pm-select" value={status} onChange={(e) => setStatus(e.target.value)} style={sel}>
          <option value="all">Status · all</option>
          {['enquiry', 'hold', 'pending_verification', 'pending_agreement', 'pending_payment', 'confirmed', 'ready_checkin', 'checked_in', 'checked_out', 'inspection_pending', 'closed', 'cancelled'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <select className="pm-select" value={source} onChange={(e) => setSource(e.target.value)} style={sel}>
          <option value="all">Source · all</option>
          {['direct', 'website', 'phone', 'airbnb', 'booking_com', 'agoda', 'corporate'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <select className="pm-select" value={propertyF} onChange={(e) => setPropertyF(e.target.value)} style={sel}>
          <option value="all">Property · all</option>
          {propertyOptions.map(([id, title]) => <option key={id} value={String(id)}>{title}</option>)}
        </select>
        <select className="pm-select" value={agreementF} onChange={(e) => setAgreementF(e.target.value)} style={sel}>
          <option value="all">Agreement · all</option>
          {['signed', 'sent', 'draft'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="pm-select" value={paymentF} onChange={(e) => setPaymentF(e.target.value)} style={sel}>
          <option value="all">Payment · all</option>
          {['paid', 'part_paid', 'unpaid'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <select className="pm-select" value={sort} onChange={(e) => setSort(e.target.value)} style={sel}>
          <option value="checkin_asc">Sort · Check-in ↑</option>
          <option value="checkin_desc">Sort · Check-in ↓</option>
          <option value="value_desc">Sort · Value ↓</option>
          <option value="ref_desc">Sort · Newest</option>
        </select>
      </div>

      {/* Segments */}
      <div className="pm-segment" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        {SEGMENTS.map((s) => (
          <button key={s.id} className={seg === s.id ? 'on' : ''} onClick={() => setSeg(s.id)}>
            {s.label} <span style={{ opacity: 0.6, marginLeft: 4 }}>{counts[s.id] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="pm-card">
        <div className="pm-card-body ss-table-scroll" style={{ padding: 0 }}>
          <table className="pm-tbl">
            <thead><tr>
              <th>Ref</th><th>Guest</th><th>Property</th><th>Stay</th><th>Source</th>
              <th style={{ textAlign: 'right' }}>Total / Due</th><th>Agreement</th><th>Verification</th><th>Status</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr></thead>
            <tbody>
              {filtered.map((b) => {
                const due = Math.max(0, num(b.total_booking_value) - num(b.paid_amount));
                return (
                  <tr key={b.id}>
                    <td><strong style={{ color: 'var(--navy)' }}>{b.booking_code}</strong></td>
                    <td>
                      <div className="pm-who">
                        <div className="pm-avatar">{initials(b.lead_guest?.full_name)}</div>
                        <div><div className="nm">{b.lead_guest?.full_name || `Guest #${b.lead_guest_contact_id}`}</div><div className="ph">{num(b.adults_count)} adult{num(b.adults_count) === 1 ? '' : 's'}{num(b.children_count) ? ` · ${num(b.children_count)} kid${num(b.children_count) === 1 ? '' : 's'}` : ''}</div></div>
                      </div>
                    </td>
                    <td><div className="nm" style={{ fontWeight: 650 }}>{b.property?.title || `#${b.property_id}`}</div><div className="ph" style={{ fontSize: 11.5, color: 'var(--muted)' }}>{b.property?.district || '—'}</div></td>
                    <td><div style={{ fontWeight: 600, fontSize: 12.5 }}>{fmtDate(b.check_in_date)} → {fmtDate(b.check_out_date)}</div><div className="ph" style={{ fontSize: 11.5, color: 'var(--muted)' }}>{b.nights_count} night{b.nights_count === 1 ? '' : 's'}</div></td>
                    <td style={{ textTransform: 'capitalize', fontSize: 12.5 }}>{String(b.booking_source || 'direct').replace(/_/g, ' ')}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="pm-money">{bdtFull(b.total_booking_value)}</div>
                      <div className="ph" style={{ fontSize: 11.5, color: due > 0 ? 'var(--bad)' : 'var(--muted)' }}>{due > 0 ? `${bdt(due)} due` : 'settled'}</div>
                    </td>
                    <td><Chip k={agreementOf(b)} /></td>
                    <td><Chip k={verifyOf(b)} /></td>
                    <td><Chip k={b.status} /></td>
                    <td style={{ textAlign: 'right' }}>{rowAction(b)}</td>
                  </tr>
                );
              })}
              {!filtered.length && <tr><td colSpan={10} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>No bookings match this view.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12, lineHeight: 1.6 }}>
        Check-in only appears once the booking is confirmed, the guest agreement is signed and the property is guest-ready — otherwise the row offers the blocking step instead.
      </p>
    </div>
  );
}

const btn = { padding: '4px 10px', fontSize: 12 };
const sel = { border: '1px solid var(--line)', borderRadius: 10, padding: '9px 12px', background: 'var(--surface)', font: 'inherit', color: 'var(--ink)', textTransform: 'capitalize' };
