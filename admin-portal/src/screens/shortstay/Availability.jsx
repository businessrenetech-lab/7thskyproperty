import React, { useEffect, useState, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import { Spinner } from '../../ui/kit';
import { ScreenHead } from './common';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);

// block_type + booking metadata → a visual kind matching the mockup legend
const KINDS = {
  confirmed: { label: 'Confirmed booking', color: 'var(--good)', bg: 'var(--good-bg)' },
  external: { label: 'External platform', color: 'var(--cyan)', bg: 'var(--cyan-weak)' },
  hold: { label: 'Pending hold', color: 'var(--warn)', bg: 'var(--warn-bg)' },
  owner: { label: 'Owner block', color: 'var(--navy)', bg: 'rgba(0,55,104,.08)' },
  maintenance: { label: 'Maintenance block', color: 'var(--bad)', bg: 'var(--bad-bg)' },
  housekeeping: { label: 'Housekeeping reset', color: '#0f766e', bg: 'rgba(15,118,110,.1)' },
};
const kindOf = (bl) => {
  if (bl.block_type === 'owner_hold' || bl.block_type === 'blocked') return 'owner';
  if (bl.block_type === 'maintenance') return 'maintenance';
  if (bl.block_type === 'cleaning') return 'housekeeping';
  if (bl.block_type === 'booking') {
    if (['airbnb', 'booking_com', 'agoda'].includes(bl.source)) return 'external';
    if (['hold', 'enquiry', 'pending_verification', 'pending_agreement', 'pending_payment'].includes(bl.booking_status)) return 'hold';
    return 'confirmed';
  }
  return 'owner';
};
const barLabel = (bl) => {
  if (bl.block_type === 'booking') {
    const who = bl.guest_name ? bl.guest_name.split(' ')[0] : bl.booking_code || 'Booking';
    if (bl.source && ['airbnb', 'booking_com', 'agoda'].includes(bl.source)) return `${bl.source.replace('_', '.')} · ${who}`;
    return `${who}${bl.pax ? ` · ${bl.pax} pax` : ''}${bl.booking_status === 'hold' ? ' · hold' : ''}`;
  }
  return { owner_hold: 'Owner block', blocked: 'Owner block', maintenance: 'Maintenance', cleaning: 'Housekeeping reset' }[bl.block_type] || 'Block';
};

const VIEWS = { Week: 7, Timeline: 14, Month: 31 };

export default function Availability({ actions = {}, refreshKey, goTab }) {
  const [anchor, setAnchor] = useState(() => new Date());
  const [view, setView] = useState('Timeline');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const span = VIEWS[view];
  const start = iso(anchor);
  const end = iso(addDays(anchor, span - 1));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/short-stay/availability', { params: { start, end } });
      setData(res.data || null);
    } finally { setLoading(false); }
  }, [start, end]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const days = data?.days || [];
  const properties = data?.properties || [];
  const conflicts = data?.conflicts || [];
  const todayIso = iso(new Date());

  const rangeLabel = `${anchor.getDate()} ${MON[anchor.getMonth()]} – ${addDays(anchor, span - 1).getDate()} ${MON[addDays(anchor, span - 1).getMonth()]} ${addDays(anchor, span - 1).getFullYear()}`;

  return (
    <div>
      <ScreenHead
        title="Availability calendar"
        desc="Bookings, holds, owner blocks, maintenance and housekeeping resets."
        actions={<button className="pm-btn primary" onClick={actions.addBooking}><Plus size={15} /> Add booking</button>}
      />

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        <div className="pm-segment">
          {Object.keys(VIEWS).map((v) => <button key={v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>{v}</button>)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button className="pm-btn" style={{ padding: 6 }} onClick={() => setAnchor((a) => addDays(a, -span))}><ChevronLeft size={15} /></button>
          <div style={{ fontWeight: 700, fontSize: 13.5, minWidth: 190, textAlign: 'center', color: 'var(--ink)' }}>{rangeLabel}</div>
          <button className="pm-btn" style={{ padding: 6 }} onClick={() => setAnchor((a) => addDays(a, span))}><ChevronRight size={15} /></button>
        </div>
        <button className="pm-btn" onClick={() => setAnchor(new Date())}>Today</button>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
        {Object.values(KINDS).map((k) => (
          <span key={k.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--muted)' }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: k.bg, border: `1.5px solid ${k.color}` }} />{k.label}
          </span>
        ))}
      </div>

      {/* Conflict banner */}
      {conflicts.length > 0 && (
        <div className="st-notice st-notice-error" style={{ marginBottom: 14 }}>
          <AlertTriangle size={16} />
          <span><strong>Conflict</strong> · {conflicts.length} overlapping block{conflicts.length === 1 ? '' : 's'} detected — review affected properties below.</span>
        </div>
      )}

      {loading ? <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div> : (
        <div className="pm-card">
          <div className="pm-card-body" style={{ padding: 0, overflowX: 'auto' }}>
            <div style={{ minWidth: 240 + span * 46 }}>
              {/* Header row */}
              <div style={{ display: 'grid', gridTemplateColumns: `220px repeat(${span}, minmax(44px,1fr))`, borderBottom: '1px solid var(--line)' }}>
                <div style={{ padding: '10px 14px', fontSize: 10.5, fontWeight: 750, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--muted-2)' }}>Property</div>
                {days.map((d) => {
                  const dt = new Date(d);
                  const isToday = d === todayIso;
                  const weekend = dt.getDay() === 5 || dt.getDay() === 6;
                  return (
                    <div key={d} style={{ padding: '8px 2px', textAlign: 'center', borderLeft: '1px solid var(--line-soft)', background: isToday ? 'var(--cyan-weak)' : weekend ? 'var(--surface-2)' : 'transparent' }}>
                      <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>{DOW[dt.getDay()]}</div>
                      <div style={{ fontSize: 13, fontWeight: 750, color: isToday ? 'var(--cyan)' : 'var(--ink)' }}>{dt.getDate()}</div>
                    </div>
                  );
                })}
              </div>

              {/* Property rows */}
              {properties.map((p) => {
                // Assign each visible block a lane so overlapping bars stack instead of colliding
                const vis = p.blocks
                  .map((bl) => ({ bl, s: Math.max(0, daysBetween(start, bl.start_date)), e: Math.min(span, daysBetween(start, bl.end_date)) }))
                  .filter((x) => x.e > 0 && x.s < span)
                  .sort((a, b) => a.s - b.s);
                const laneEnds = [];
                vis.forEach((x) => {
                  let lane = laneEnds.findIndex((end) => end <= x.s);
                  if (lane === -1) { lane = laneEnds.length; laneEnds.push(x.e); } else { laneEnds[lane] = x.e; }
                  x.lane = lane;
                });
                const lanes = Math.max(1, laneEnds.length);
                const rowH = 16 + lanes * 40;
                return (
                  <div key={p.profile_id} style={{ display: 'grid', gridTemplateColumns: `220px repeat(${span}, minmax(44px,1fr))`, borderBottom: '1px solid var(--line-soft)', minHeight: rowH }}>
                    <div style={{ padding: '10px 14px', borderRight: '1px solid var(--line-soft)' }}>
                      <div style={{ fontWeight: 650, fontSize: 12.5, color: 'var(--ink)' }}>{p.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.max_guests || 0} guests · {p.area || '—'}</div>
                    </div>
                    <div style={{ gridColumn: `2 / ${span + 2}`, position: 'relative' }}>
                      <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: `repeat(${span}, 1fr)` }}>
                        {days.map((d) => { const dt = new Date(d); const weekend = dt.getDay() === 5 || dt.getDay() === 6; return <div key={d} style={{ borderLeft: '1px solid var(--line-soft)', background: d === todayIso ? 'var(--cyan-weak)' : weekend ? 'var(--surface-2)' : 'transparent' }} />; })}
                      </div>
                      {vis.map(({ bl, s, e, lane }, idx) => {
                        const width = Math.max(1, e - s);
                        const kind = KINDS[kindOf(bl)];
                        const clickable = !!bl.booking_id;
                        return (
                          <div key={bl.id || idx} title={`${barLabel(bl)} · ${bl.start_date} → ${bl.end_date}${clickable ? ' · open' : ''}`}
                            onClick={clickable ? () => goTab?.('checkin', { booking: bl.booking_id }) : undefined}
                            style={{ position: 'absolute', top: 8 + lane * 40, left: `calc(${(s / span) * 100}% + 3px)`, width: `calc(${(width / span) * 100}% - 6px)`, height: 34,
                              background: kind.bg, border: `1.5px solid ${kind.color}`, borderRadius: 7, padding: '0 8px', display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap', cursor: clickable ? 'pointer' : 'default' }}>
                            <span style={{ fontSize: 11, fontWeight: 650, color: kind.color, textOverflow: 'ellipsis', overflow: 'hidden' }}>{barLabel(bl)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {!properties.length && <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No stay properties to schedule yet.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
