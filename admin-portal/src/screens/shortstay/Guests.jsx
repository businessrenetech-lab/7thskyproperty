import React, { useEffect, useState, useCallback } from 'react';
import { FileText, Search, ShieldCheck } from 'lucide-react';
import api from '../../services/api';
import { Spinner } from '../../ui/kit';
import { initials, Chip, bdtFull, fmtRange, ScreenHead } from './common';
import GuestVerificationModal from './GuestVerificationModal';

// Master (guest list) + detail (verification party for the selected booking)
export default function Guests({ goTab, refreshKey }) {
  const [rows, setRows] = useState([]);
  const [sel, setSel] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [verifyId, setVerifyId] = useState(null); // booking id whose verification modal is open

  const reloadDetail = useCallback(() => {
    if (sel) api.get(`/short-stay/bookings/${sel}`).then((r) => setDetail(r.data)).catch(() => {});
  }, [sel]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/short-stay/guests');
      const list = Array.isArray(res.data) ? res.data : [];
      setRows(list);
      setSel((cur) => cur || list[0]?.booking_id || null);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  useEffect(() => {
    if (!sel) { setDetail(null); return; }
    api.get(`/short-stay/bookings/${sel}`).then((r) => setDetail(r.data)).catch(() => setDetail(null));
  }, [sel]);

  if (loading) return <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>;
  const filtered = rows.filter((r) => !q.trim() || r.guest_name.toLowerCase().includes(q.trim().toLowerCase()));
  const g = detail?.gates || {};

  return (
    <div>
      <ScreenHead title="Guests & verification" desc="Lead guests, contractual signers and approved occupants with their KYC state." />
      <div style={{ display: 'grid', gridTemplateColumns: '360px minmax(0,1fr)', gap: 18, alignItems: 'start' }} className="ss-guests-grid">
        {/* Master list */}
        <div className="pm-card">
          <div className="pm-card-body" style={{ padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--line)', borderRadius: 10, padding: '0 12px', background: 'var(--surface)', marginBottom: 10 }}>
              <Search size={15} color="var(--muted)" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search guests…" style={{ border: 0, outline: 0, background: 'transparent', padding: '9px 0', font: 'inherit', flex: 1, color: 'var(--ink)' }} />
            </div>
            {filtered.map((r) => (
              <button key={r.booking_id} onClick={() => setSel(r.booking_id)} style={{ width: '100%', textAlign: 'left', border: 'none', background: sel === r.booking_id ? 'var(--cyan-weak)' : 'transparent', borderRadius: 10, padding: 10, cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center', marginBottom: 2 }}>
                <div className="pm-avatar">{initials(r.guest_name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 650, color: 'var(--ink)' }}>{r.guest_name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{r.booking_code} · {r.property_title}</div>
                </div>
                <Chip k={r.verification} />
              </button>
            ))}
            {!filtered.length && <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No guests yet.</div>}
          </div>
        </div>

        {/* Detail */}
        {detail ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 16, alignItems: 'start' }} className="ss-guests-detail">
            <div className="pm-card">
              <div className="pm-card-h">
                <div><h3 style={{ fontSize: 14.5 }}>Guest verification · {detail.booking_code}</h3></div>
                <div className="sp" /><Chip k={g.verification} />
                <button className="pm-btn primary" style={{ marginLeft: 10, padding: '5px 12px', fontSize: 12 }} onClick={() => setVerifyId(detail.id)}><ShieldCheck size={14} /> Open verification</button>
              </div>
              <div className="pm-card-body ss-table-scroll" style={{ padding: 0, cursor: 'pointer' }} onClick={() => setVerifyId(detail.id)} title="Open guest verification">
                <table className="pm-tbl">
                  <tbody>
                    <tr>
                      <td><div className="pm-who"><div className="pm-avatar">{initials(detail.lead_guest?.full_name)}</div><div><div className="nm">{detail.lead_guest?.full_name}</div><div className="ph">Lead guest · signs agreement</div></div></div></td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>{detail.lead_guest?.primary_phone || detail.lead_guest?.email || '—'}</td>
                      <td style={{ textAlign: 'right' }}><Chip k={g.verification} /></td>
                    </tr>
                    {(detail.occupants || []).map((o) => (
                      <tr key={o.id}>
                        <td><div className="pm-who"><div className="pm-avatar">{initials(o.full_name)}</div><div><div className="nm">{o.full_name}</div><div className="ph">{o.is_adult ? 'Adult' : 'Child'} · {String(o.relationship || 'occupant')}</div></div></div></td>
                        <td style={{ fontSize: 12, color: 'var(--muted)' }}>{o.id_passport_number || '—'}</td>
                        <td style={{ textAlign: 'right' }}><Chip k={o.verification_status} /></td>
                      </tr>
                    ))}
                    {!(detail.occupants || []).length && <tr><td colSpan={3} style={{ color: 'var(--muted)', fontSize: 12.5 }}>No additional occupants recorded.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="pm-card">
              <div className="pm-card-h"><div><h3 style={{ fontSize: 14 }}>Stay & risk</h3></div></div>
              <div className="pm-card-body" style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.7 }}>
                <div style={{ marginBottom: 10 }}><div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted-2)', fontWeight: 700 }}>Stay</div>{fmtRange(detail.check_in_date, detail.check_out_date)} · {detail.property?.title}</div>
                <div style={{ marginBottom: 10 }}><div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted-2)', fontWeight: 700 }}>Party</div>{detail.adults_count} adults{detail.children_count ? ` · ${detail.children_count} children` : ''} · {g.occupants?.verified ?? 0} of {g.occupants?.total ?? 0} verified</div>
                <div><div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted-2)', fontWeight: 700 }}>Deposit</div>{g.deposit?.required ? `${bdtFull(g.deposit.paid)} / ${bdtFull(g.deposit.required)} held` : 'Not required'}</div>
                <button className="pm-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 14 }} onClick={() => goTab?.('checkin', { booking: detail.id })}><FileText size={14} /> Open check-in desk</button>
              </div>
            </div>
          </div>
        ) : <div className="pm-card"><div className="pm-card-body" style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Select a guest to view verification.</div></div>}
      </div>
      <style>{`@media (max-width:1100px){ .ss-guests-grid{ grid-template-columns:1fr!important } .ss-guests-detail{ grid-template-columns:1fr!important } }`}</style>

      {verifyId && <GuestVerificationModal bookingId={verifyId} onClose={() => setVerifyId(null)} onChanged={reloadDetail} />}
    </div>
  );
}
