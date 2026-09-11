// admin-portal/src/screens/sales/SalesCalendar.jsx
//
// Branch-wide sales month calendar. Aggregates SOP stage deadlines, offer
// expiries, buyer viewings and follow-ups (GET /sales/calendar) into a month
// grid; selecting a day lists its items, each linking to the property file.
// Built in-house (date math only) — no calendar library.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { PageHead, Spinner, Button, Badge } from '../../ui/kit';
import { propertyFilePath } from './paths';
import './sales-calendar.css';

const TYPE = {
  sop_deadline: { color: '#2563eb', label: 'SOP', section: '?section=workflow' },
  offer_expiry: { color: '#d97706', label: 'Offer', section: '?section=offers' },
  viewing: { color: '#059669', label: 'Viewing', section: '?section=enquiries' },
  follow_up: { color: '#6b7280', label: 'Follow-up', section: '?section=enquiries' },
};
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function SalesCalendar({ category = 'residential' }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // ISO date string

  // 6-week (42-cell) grid starting on the Sunday on/before the 1st.
  const cells = useMemo(() => {
    const start = new Date(month);
    start.setDate(1 - start.getDay());
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [month]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = iso(cells[0]);
      const to = iso(cells[41]);
      const { data } = await api.get(`/sales/calendar?from=${from}&to=${to}`);
      setEvents(data.events || []);
    } catch { toast.error('Failed to load the calendar'); } finally { setLoading(false); }
  }, [cells, toast]);
  useEffect(() => { load(); }, [load]);

  const byDay = useMemo(() => {
    const m = new Map();
    for (const e of events) { if (!m.has(e.date)) m.set(e.date, []); m.get(e.date).push(e); }
    return m;
  }, [events]);

  const todayIso = iso(new Date());
  const monthLabel = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const shift = (n) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
  const selectedEvents = selected ? (byDay.get(selected) || []) : [];
  const go = (e) => navigate(`${propertyFilePath(category, e.property_id)}${TYPE[e.type]?.section || ''}`);

  return (
    <>
      <PageHead title="Calendar" desc="SOP deadlines, offer expiries, viewings and follow-ups across all sale properties." actions={
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Button size="sm" variant="ghost" icon={ChevronLeft} onClick={() => shift(-1)} />
          <strong style={{ minWidth: 150, textAlign: 'center' }}>{monthLabel}</strong>
          <Button size="sm" variant="ghost" icon={ChevronRight} onClick={() => shift(1)} />
          <Button size="sm" variant="ghost" onClick={() => setMonth(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })}>Today</Button>
        </div>
      } />

      <div className="cal-legend">
        {Object.entries(TYPE).map(([k, v]) => (
          <span key={k} className="cal-legend-item"><span className="cal-dot" style={{ background: v.color }} /> {v.label}</span>
        ))}
      </div>

      {loading ? <div className="card card-pad"><Spinner /></div> : (
        <div className="card cal-wrap">
          <div className="cal-grid cal-head">{WD.map((w) => <div key={w} className="cal-wd">{w}</div>)}</div>
          <div className="cal-grid">
            {cells.map((d) => {
              const key = iso(d);
              const inMonth = d.getMonth() === month.getMonth();
              const items = byDay.get(key) || [];
              return (
                <button
                  type="button"
                  key={key}
                  className={`cal-cell${inMonth ? '' : ' cal-out'}${key === todayIso ? ' cal-today' : ''}${key === selected ? ' cal-sel' : ''}`}
                  onClick={() => setSelected(key)}
                >
                  <span className="cal-day">{d.getDate()}</span>
                  <span className="cal-dots">
                    {items.slice(0, 3).map((e, i) => <span key={i} className="cal-dot" style={{ background: TYPE[e.type]?.color || '#999' }} />)}
                    {items.length > 3 && <span className="cal-more">+{items.length - 3}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selected && (
        <div className="card card-pad" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>{new Date(selected + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
          {selectedEvents.length === 0 ? <p className="cell-sub">Nothing scheduled.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedEvents.map((e, i) => (
                <button type="button" key={i} className="cal-event" onClick={() => go(e)}>
                  <Badge tone="grey"><span className="cal-dot" style={{ background: TYPE[e.type]?.color }} /> {TYPE[e.type]?.label}</Badge>
                  <span style={{ flex: 1 }}>{e.label}</span>
                  <span className="cell-sub">{e.property_code || ''}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
