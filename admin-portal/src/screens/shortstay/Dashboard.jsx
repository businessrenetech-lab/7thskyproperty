import React, { useEffect, useState, useCallback } from 'react';
import {
  Hotel, Plus, CalendarDays, AlertTriangle, Sparkles, ShieldCheck, Wallet, FileSignature, ClipboardCheck, ArrowRight,
} from 'lucide-react';
import api from '../../services/api';
import { Spinner } from '../../ui/kit';
import { bdt, initials, Chip, Kpi, ScreenHead } from './common';

const SEV = { critical: 'sev-bad', blocker: 'sev-bad', high: 'sev-warn', medium: 'sev-info', low: 'sev-good' };
const SEV_ICON = { Incident: AlertTriangle, Housekeeping: Sparkles, Readiness: ShieldCheck, Payment: Wallet, Agreement: FileSignature };

export default function Dashboard({ actions = {}, goTab, refreshKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [movementFilter, setMovementFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/short-stay/dashboard');
      setData(res.data || null);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  if (loading) return <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>;
  const k = data?.kpi || {};
  const pipeline = data?.pipeline || [];
  const movements = (data?.movements || []).filter((m) => movementFilter === 'all' || (movementFilter === 'arrivals' ? m.movement === 'check_in' : m.movement === 'check_out'));
  const operations = data?.operations || [];

  return (
    <div>
      <ScreenHead
        title="Operations Dashboard"
        desc="Guest-ready inventory, bookings and daily turnover across the short-stay portfolio."
        actions={<>
          <button className="pm-btn primary" onClick={actions.addProperty}><Hotel size={15} /> Add stay property</button>
          <button className="pm-btn" onClick={actions.addBooking}><Plus size={15} /> Add booking</button>
          <button className="pm-btn" onClick={() => goTab?.('availability')}><CalendarDays size={15} /> View calendar</button>
        </>}
      />

      {/* KPI row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 14 }} className="ss-kpi-row">
        <Kpi label="Total Properties" value={k.total_properties ?? 0} unit="units" sub={`${k.onboarding_count ?? 0} onboarding`} />
        <Kpi tone="good" label="Guest-Ready" value={k.guest_ready ?? 0} unit={`of ${k.total_properties ?? 0}`} sub={`${k.not_live_count ?? 0} not live`} />
        <Kpi tone={k.arrivals_unverified ? 'bad' : 'ink'} label="Today's Arrivals" value={k.arrivals_today ?? 0} sub={`${k.arrivals_unverified ?? 0} unverified`} />
        <Kpi tone={k.departures_today ? 'bad' : 'ink'} label="Today's Departures" value={k.departures_today ?? 0} sub={`${k.inspections_due ?? 0} inspections due`} />
        <Kpi label="Active Stays" value={k.active_stays ?? 0} unit="in house" sub={`${k.in_house_guests ?? 0} guests`} />
      </div>
      {/* KPI row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }} className="ss-kpi-row">
        <Kpi tone="cyan" label="Pending Agreements" value={k.pending_agreements ?? 0} sub={`${k.pending_owner_agreements ?? 0} owner · ${k.pending_guest_agreements ?? 0} guest`} />
        <Kpi tone="cyan" label="Pending Payments" value={k.pending_payments ?? 0} sub={`${bdt(k.payments_due_amount)} due`} />
        <Kpi tone={k.housekeeping_overdue ? 'warn' : 'ink'} label="Housekeeping Due" value={k.housekeeping_due ?? 0} unit="tasks" sub={`${k.housekeeping_overdue ?? 0} overdue`} />
        <Kpi tone={k.open_incidents ? 'bad' : 'ink'} label="Open Incidents" value={k.open_incidents ?? 0} sub={`${k.critical_incidents ?? 0} critical`} />
      </div>

      {/* Booking pipeline */}
      <div className="pm-card" style={{ marginBottom: 20 }}>
        <div className="pm-card-h">
          <div className="ic"><ClipboardCheck size={17} /></div>
          <div><h3>Booking pipeline</h3><div className="hsub">Where bookings sit today · click a stage to work it</div></div>
          <div className="sp" />
          {data?.total_blocked > 0 && <span className="pm-chip bad"><span className="d" />{data.total_blocked} blocked</span>}
        </div>
        <div className="pm-card-body" style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: 4, minWidth: 760 }}>
            {pipeline.map((s) => (
              <button key={s.key} onClick={() => goTab?.('bookings')} style={{ flex: 1, minWidth: 82, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px 0', font: 'inherit' }}>
                <div style={{ fontSize: 22, fontWeight: 780, letterSpacing: '-.02em', color: s.blocking && s.count ? 'var(--bad)' : 'var(--ink)' }}>{s.count}</div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', minHeight: 13, margin: '2px 0 6px' }}>{s.note || ''}</div>
                <div style={{ fontSize: 11.5, fontWeight: 650, color: 'var(--ink-soft)', paddingBottom: 8, borderBottom: `2px solid ${s.blocking && s.count ? 'var(--bad)' : 'var(--line)'}` }}>{s.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main split: arrivals/departures + operations */}
      <div className="pm-main">
        <div className="pm-col">
          <div className="pm-card">
            <div className="pm-card-h">
              <div className="ic"><CalendarDays size={17} /></div>
              <div><h3>Arrivals &amp; departures</h3><div className="hsub">Next 48 hours · {movements.length} movement{movements.length === 1 ? '' : 's'}</div></div>
              <div className="sp" />
              <div className="pm-segment">
                {['all', 'arrivals', 'departures'].map((f) => (
                  <button key={f} className={movementFilter === f ? 'on' : ''} onClick={() => setMovementFilter(f)} style={{ textTransform: 'capitalize' }}>{f}</button>
                ))}
              </div>
            </div>
            <div className="pm-card-body ss-table-scroll" style={{ padding: 0 }}>
              <table className="pm-tbl">
                <thead><tr><th>Guest</th><th>Property</th><th>Movement</th><th>Verify</th><th>Agreement</th><th>Payment</th></tr></thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={`${m.booking_id}-${m.movement}`} onClick={() => goTab?.('checkin', { booking: m.booking_id })} style={{ cursor: 'pointer' }}>
                      <td>
                        <div className="pm-who">
                          <div className="pm-avatar">{initials(m.guest_name)}</div>
                          <div><div className="nm">{m.guest_name}</div><div className="ph">{m.booking_code} · {m.pax}</div></div>
                        </div>
                      </td>
                      <td><div className="nm" style={{ fontWeight: 650 }}>{m.property_title}</div><div className="ph" style={{ fontSize: 11.5, color: 'var(--muted)' }}>{m.area || '—'}</div></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 650, fontSize: 12.5, color: m.movement === 'check_in' ? 'var(--good)' : 'var(--bad)' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />{m.movement === 'check_in' ? 'Check-in' : 'Check-out'}
                        </div>
                        <div className="ph" style={{ fontSize: 11.5, color: 'var(--muted)' }}>{m.when}</div>
                      </td>
                      <td><Chip k={m.verify_status} /></td>
                      <td><Chip k={m.agreement_status} /></td>
                      <td><Chip k={m.payment_status} />{m.amount_due > 0 && <div className="ph" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{bdt(m.amount_due)} due</div>}</td>
                    </tr>
                  ))}
                  {!movements.length && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>No arrivals or departures in the next 48 hours.</td></tr>}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderTop: '1px solid var(--line-soft)' }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Showing next 48 hours</span>
              <button className="pm-link" onClick={() => goTab?.('bookings')}>All bookings <ArrowRight size={13} /></button>
            </div>
          </div>
        </div>

        <div className="pm-col">
          <div className="pm-card">
            <div className="pm-card-h">
              <div className="ic"><AlertTriangle size={17} /></div>
              <div><h3>Today's operations</h3><div className="hsub">{data?.ops_open ?? 0} open · {data?.ops_urgent ?? 0} urgent</div></div>
            </div>
            <div className="pm-card-body ss-table-scroll" style={{ padding: 0 }}>
              {operations.map((o, i) => {
                const Icon = SEV_ICON[o.category] || AlertTriangle;
                return (
                  <div key={i} className={`pm-act ${SEV[o.priority] || 'sev-info'}`}>
                    <div className="ai"><Icon size={15} /></div>
                    <div className="grow">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                        <span style={{ fontSize: 10, fontWeight: 750, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--sev, var(--muted))' }}>{o.priority}</span>
                        <span style={{ fontSize: 11, color: 'var(--muted-2)' }}>{o.category}</span>
                      </div>
                      <div className="at" style={{ whiteSpace: 'normal' }}>{o.title}</div>
                      <div className="as">{o.sub}</div>
                    </div>
                    <button className="pm-link" style={{ color: 'var(--sev, var(--cyan))', alignSelf: 'flex-start' }} onClick={() => goTab?.(o.category === 'Incident' ? 'maintenance' : o.category === 'Housekeeping' ? 'housekeeping' : o.category === 'Payment' ? 'bookings' : o.category === 'Agreement' ? 'owner-agreements' : 'properties')}>{o.action}</button>
                  </div>
                );
              })}
              {!operations.length && <div className="pm-empty" style={{ padding: '32px 20px' }}><div className="ic"><ClipboardCheck size={20} /></div>All clear — no open operational items.</div>}
            </div>
            <div style={{ padding: '12px 18px', borderTop: '1px solid var(--line-soft)' }}>
              <button className="pm-btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => goTab?.('maintenance')}>Open operations board</button>
            </div>
          </div>
        </div>
      </div>

      <style>{`@media (max-width:1080px){ .ss-kpi-row{ grid-template-columns:repeat(2,1fr)!important } } @media (max-width:560px){ .ss-kpi-row{ grid-template-columns:1fr!important } }`}</style>
    </div>
  );
}
