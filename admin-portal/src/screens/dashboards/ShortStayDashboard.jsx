import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, LogIn, LogOut } from 'lucide-react';
import { useLineData, DashHead, DashState, KpiStrip, Panel, Bars, HBars, Pill, Empty, COLOR } from '../../ui/dash/LineDash';

/* ShortStayDashboard — the Short Term Stay console index: who is in which unit, and what it earns. */
export default function ShortStayDashboard() {
  const { data: d, error, loading, period, setPeriod, reload } = useLineData('/line-dashboards/short-stay');
  return (
    <div className="ld">
      <DashHead title="Short Term Stay" desc="Bookings, nights and revenue across serviced apartments"
        period={period} setPeriod={setPeriod} action={{ label: 'New booking', to: '/short-stay/bookings', icon: Plus }} />
      <DashState loading={loading} error={error} reload={reload}>
        {d && (
          <>
            <KpiStrip items={d.kpis} />
            <div className="ld-grid">
              <Panel title="Occupancy, next 30 days" span="c12" legend={[['Booked', COLOR.s1], ['Awaiting agreement', COLOR.b2], ['Blocked', '#CBD5E1']]}
                meta={<Link className="ld-link" to="/short-stay/availability">Availability</Link>}>
                <Calendar cal={d.calendar} />
              </Panel>
            </div>
            <div className="ld-grid">
              <Panel title="Booking revenue by month" span="c5" meta="by check-in month">
                <Bars labels={d.revenue.labels} format="money" height={220} empty="No bookings checked in during this window."
                  series={[{ key: 'r', label: 'Revenue', color: COLOR.s1, values: d.revenue.values }]} />
              </Panel>
              <Panel title="Bookings by channel" span="c3">
                <HBars labelWidth={90} rows={d.channels.map((c) => ({ label: c.label, value: c.count }))} empty="No bookings yet." />
                <div className="ld-stat">
                  <span>Average stay</span>
                  <b>{d.stay.average_nights === null ? '—' : `${d.stay.average_nights} nights`}</b>
                  {d.stay.lead_days !== null && <small>Booked {d.stay.lead_days} days ahead (median)</small>}
                </div>
              </Panel>
              <Panel title="Coming up" span="c4" meta={`${d.today_counts.check_ins} in, ${d.today_counts.check_outs} out today`}>
                {d.upcoming.length ? (
                  <ul className="ld-list">
                    {d.upcoming.map((u, i) => (
                      <li key={i}>
                        <span className="ico" aria-hidden="true">{u.kind === 'in' ? <LogIn size={15} /> : <LogOut size={15} />}</span>
                        <span>
                          <strong>{u.title}, {u.on === d.today ? 'today' : new Date(u.on).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
                          <small>{[u.unit, u.guest, u.nights ? `${u.nights} nights` : null].filter(Boolean).join(' · ')}</small>
                        </span>
                        <Pill tone={u.tone}>{u.status}</Pill>
                      </li>
                    ))}
                  </ul>
                ) : <Empty>No check-ins or check-outs in the next seven days.</Empty>}
              </Panel>
            </div>
          </>
        )}
      </DashState>
    </div>
  );
}

function Calendar({ cal }) {
  if (!cal.units.length) return <Empty>No short-stay units yet. Add a property to start taking bookings.</Empty>;
  const start = new Date(`${cal.from}T00:00:00`).getTime();
  const DAY = 864e5;
  const pos = (iso) => Math.max(0, Math.min(cal.days, (new Date(`${iso}T00:00:00`).getTime() - start) / DAY));
  const pct = (x) => `${(x / cal.days) * 100}%`;
  const ticks = Array.from({ length: cal.days }, (_, i) => i).filter((i) => i % 3 === 0);
  const label = (i) => {
    const dt = new Date(start + i * DAY);
    if (i === 0) return 'Today';
    return dt.getDate() <= 3 ? dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : String(dt.getDate());
  };
  return (
    <div className="ld-cal">
      <span />
      <div className="ld-cal-days">{ticks.map((i) => <span key={i} className={i === 0 ? 'today' : ''} style={{ left: pct(i + 0.5) }}>{label(i)}</span>)}</div>
      {cal.units.map((u) => (
        <React.Fragment key={u.id}>
          <span className="ld-cal-name" title={u.name}>{u.name}</span>
          <div className="ld-cal-row">
            {u.items.map((it, i) => {
              const a = pos(it.from); const b = pos(it.to);
              return b > a && <b key={i} className={it.kind} style={{ left: pct(a), width: pct(b - a) }} title={`${it.label}: ${it.from} to ${it.to}`} />;
            })}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
