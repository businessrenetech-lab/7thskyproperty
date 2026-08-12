import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw, ChevronLeft, ChevronRight, CalendarDays, List, AlertTriangle, UserX,
} from 'lucide-react';
import api from '../../services/api';
import { WtHead, Loading, EmptyState, errText, dateFmt, toast } from './common';

/*
 * Calendar — the four scheduled things in this module, finally on one timeline.
 *
 * Site assessments, work-order service dates, AMC visits and invoice due dates
 * each had a date and each lived on its own register. The AMC visit plan is the
 * clearest cost of that: it generates a full year of dated rows the moment a
 * contract is activated, and nothing ever showed them beside anything else — a
 * week with four AMC visits and two assessments looked empty until you opened
 * two different screens.
 *
 * No new scheduling model sits behind this. It reads dates that already exist.
 */

const KIND_STYLE = {
  assessment: { label: 'Site assessment', dot: '#8b5cf6' },
  service: { label: 'Service visit', dot: '#2563eb' },
  amc_visit: { label: 'AMC visit', dot: '#0d9488' },
  invoice_due: { label: 'Invoice due', dot: '#b45309' },
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayIso = () => iso(new Date());

/** The Monday-first grid covering a month, padded to whole weeks. */
function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  // getDay() is Sunday-first; this shifts to Monday-first without a lookup table.
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(d);
    // Stop after a whole week once the month is behind us — a 6th row of
    // greyed-out next-month days is noise.
    if (i % 7 === 6 && d.getMonth() !== month && d > first) break;
  }
  return cells;
}

function EventPill({ e, onClick }) {
  const s = KIND_STYLE[e.kind] || {};
  return (
    <button className="wt-cal-event" onClick={onClick} title={`${s.label}: ${e.title}${e.subtitle ? ` — ${e.subtitle}` : ''}`}
      style={{ borderLeftColor: s.dot, opacity: e.done ? 0.55 : 1 }}>
      <span className="wt-cal-event-title" style={{ textDecoration: e.done ? 'line-through' : undefined }}>
        {e.title}
      </span>
      {e.overdue && <AlertTriangle size={11} style={{ color: 'var(--wt-red)', flexShrink: 0 }} />}
      {e.unassigned && <UserX size={11} style={{ color: '#b45309', flexShrink: 0 }} />}
    </button>
  );
}

export default function Calendar() {
  const nav = useNavigate();
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [view, setView] = useState('month');
  const [kinds, setKinds] = useState(() => new Set(Object.keys(KIND_STYLE)));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const range = useMemo(() => {
    const from = new Date(cursor.y, cursor.m, 1);
    const to = new Date(cursor.y, cursor.m + 1, 0);
    // The grid shows a little of the neighbouring months, so fetch a wider window.
    from.setDate(from.getDate() - 7);
    to.setDate(to.getDate() + 7);
    return { from: iso(from), to: iso(to) };
  }, [cursor]);

  const load = useCallback(() => {
    setLoading(true); setError('');
    // The agenda is a forward-looking list rather than a month, so it asks for
    // everything from today onwards instead of the grid's window.
    const params = view === 'agenda' ? { from: todayIso() } : range;
    api.get('/wt-ops/calendar', { params })
      .then((r) => setData(r.data))
      .catch((e) => { setData(null); setError(errText(e, 'Could not load the calendar')); })
      .finally(() => setLoading(false));
  }, [range, view]);
  useEffect(load, [load]);

  const shown = useMemo(
    () => (data?.events || []).filter((e) => kinds.has(e.kind)),
    [data, kinds],
  );
  const byDay = useMemo(() => {
    const map = {};
    shown.forEach((e) => { (map[e.date] = map[e.date] || []).push(e); });
    return map;
  }, [shown]);

  const toggleKind = (k) => setKinds((prev) => {
    const next = new Set(prev);
    if (next.has(k)) next.delete(k); else next.add(k);
    return next;
  });

  const step = (n) => setCursor((c) => {
    const d = new Date(c.y, c.m + n, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const cells = monthGrid(cursor.y, cursor.m);
  const today = todayIso();

  if (loading && !data) return (<><WtHead title="Calendar" subtitle="Assessments, service visits, AMC visits and invoice due dates on one timeline" /><Loading /></>);

  if (error) return (
    <>
      <WtHead title="Calendar" subtitle="Assessments, service visits, AMC visits and invoice due dates on one timeline" />
      <div className="wt-card"><EmptyState eyebrow="Error" title="Could not load the calendar" hint={error}
        action={<button className="wt-btn primary" onClick={load}><RefreshCw size={14} /> Retry</button>} /></div>
    </>
  );

  const c = data?.counts || {};

  return (
    <>
      <WtHead title="Calendar" subtitle="Assessments, service visits, AMC visits and invoice due dates on one timeline">
        <button className="wt-btn" onClick={load}><RefreshCw size={14} /> Refresh</button>
      </WtHead>

      <div className="wt-kpis">
        <div className="wt-card wt-kpi"><span className="wt-kpi-label">Scheduled in view</span><b>{shown.length}</b></div>
        <div className="wt-card wt-kpi">
          <span className="wt-kpi-label">Overdue</span>
          <b style={{ color: c.overdue ? 'var(--wt-red)' : undefined }}>{shown.filter((e) => e.overdue).length}</b>
          <span className="wt-kpi-sub">date passed, not done</span>
        </div>
        <div className="wt-card wt-kpi"><span className="wt-kpi-label">Today</span><b>{shown.filter((e) => e.date === today).length}</b></div>
        <div className="wt-card wt-kpi">
          <span className="wt-kpi-label">Unassigned jobs</span>
          <b style={{ color: shown.some((e) => e.unassigned) ? '#b45309' : undefined }}>{shown.filter((e) => e.unassigned).length}</b>
          <span className="wt-kpi-sub">scheduled with nobody to do them</span>
        </div>
      </div>

      <div className="wt-card" style={{ padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {view === 'month' && (
          <>
            <button className="wt-btn sm" onClick={() => step(-1)}><ChevronLeft size={14} /></button>
            <strong style={{ minWidth: 150, textAlign: 'center' }}>{MONTHS[cursor.m]} {cursor.y}</strong>
            <button className="wt-btn sm" onClick={() => step(1)}><ChevronRight size={14} /></button>
            <button className="wt-btn sm" onClick={() => setCursor({ y: now.getFullYear(), m: now.getMonth() })}>Today</button>
          </>
        )}

        <div style={{ display: 'flex', gap: 6, marginLeft: view === 'month' ? 'auto' : 0 }}>
          {Object.entries(KIND_STYLE).map(([k, s]) => (
            <button key={k} className={`wt-btn sm${kinds.has(k) ? ' primary' : ''}`} onClick={() => toggleKind(k)}>
              <span style={{ width: 8, height: 8, borderRadius: 3, background: s.dot, display: 'inline-block' }} />
              {s.label} {c.by_kind?.[k] ? `(${c.by_kind[k]})` : ''}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, marginLeft: view === 'month' ? 0 : 'auto' }}>
          <button className={`wt-btn sm${view === 'month' ? ' primary' : ''}`} onClick={() => setView('month')}><CalendarDays size={13} /> Month</button>
          <button className={`wt-btn sm${view === 'agenda' ? ' primary' : ''}`} onClick={() => setView('agenda')}><List size={13} /> Agenda</button>
        </div>
      </div>

      {view === 'month' ? (
        <div className="wt-card" style={{ padding: 14 }}>
          <div className="wt-cal-grid">
            {WEEKDAYS.map((d) => <div key={d} className="wt-cal-weekday">{d}</div>)}
            {cells.map((d) => {
              const key = iso(d);
              const outside = d.getMonth() !== cursor.m;
              const events = byDay[key] || [];
              return (
                <div key={key} className={`wt-cal-day${outside ? ' out' : ''}${key === today ? ' today' : ''}`}>
                  <div className="wt-cal-daynum">{d.getDate()}</div>
                  {events.slice(0, 4).map((e) => (
                    <EventPill key={e.id} e={e} onClick={() => nav(e.to)} />
                  ))}
                  {events.length > 4 && (
                    <button className="wt-cal-more" onClick={() => { setView('agenda'); toast.ok(`${events.length} events on ${dateFmt(key)}`); }}>
                      +{events.length - 4} more
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="wt-card wt-tblcard">
          {shown.length ? (
            <table className="wt-tbl">
              <thead><tr><th style={{ width: 120 }}>Date</th><th style={{ width: 140 }}>Type</th><th style={{ width: 120 }}>Reference</th><th>What</th><th style={{ width: 110 }}>Status</th></tr></thead>
              <tbody>
                {shown.map((e) => {
                  const s = KIND_STYLE[e.kind] || {};
                  return (
                    <tr key={e.id} className="click" onClick={() => nav(e.to)}>
                      <td style={{ whiteSpace: 'nowrap', color: e.overdue ? 'var(--wt-red)' : undefined, fontWeight: e.date === today || e.overdue ? 700 : 400 }}>
                        {dateFmt(e.date)}{e.date === today ? ' · today' : ''}
                      </td>
                      <td>
                        <span style={{ width: 8, height: 8, borderRadius: 3, background: s.dot, display: 'inline-block', marginRight: 7 }} />
                        {s.label}
                      </td>
                      <td className="id">{e.code}</td>
                      <td>
                        <strong style={{ textDecoration: e.done ? 'line-through' : undefined }}>{e.title}</strong>
                        {e.subtitle && <div className="muted" style={{ fontSize: 11 }}>{e.subtitle}</div>}
                      </td>
                      <td className="muted">
                        {e.overdue ? <span style={{ color: 'var(--wt-red)', fontWeight: 600 }}>Overdue</span> : e.status || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <EmptyState eyebrow="Calendar" title="Nothing scheduled ahead"
              hint="Assessments, service dates and AMC visits will appear here as they are booked." />
          )}
        </div>
      )}
    </>
  );
}
