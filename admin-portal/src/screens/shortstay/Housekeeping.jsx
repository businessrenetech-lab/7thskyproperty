import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import api from '../../services/api';
import { Spinner } from '../../ui/kit';
import { bdt, Chip, fmtDate, ScreenHead } from './common';

const COLS = [
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'completed', label: 'Completed' },
];

export default function Housekeeping({ actions = {}, refreshKey }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('board');

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get('/short-stay/housekeeping'); setRows(Array.isArray(res.data) ? res.data : []); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  const today = new Date().toISOString().slice(0, 10);
  const colOf = (t) => t.status === 'completed' ? 'completed' : t.status === 'in_progress' ? 'in_progress' : (t.scheduled_date && t.scheduled_date > today) ? 'upcoming' : 'today';
  const grouped = useMemo(() => {
    const g = { today: [], upcoming: [], in_progress: [], completed: [] };
    rows.forEach((t) => g[colOf(t)].push(t));
    return g;
  }, [rows, today]);
  const overdue = rows.filter((t) => t.status === 'pending' && t.scheduled_date && t.scheduled_date < today).length;

  if (loading) return <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>;

  const cardBtn = (t) => {
    if (t.status === 'pending') return <button className="pm-btn primary" style={fullBtn} onClick={() => actions.updateHousekeeping?.(t.id, 'in_progress')}>Start</button>;
    if (t.status === 'in_progress') return <button className="pm-btn primary" style={fullBtn} onClick={() => actions.updateHousekeeping?.(t.id, 'completed')}>Complete checklist</button>;
    return <button className="pm-btn" style={fullBtn} disabled>Completed</button>;
  };

  return (
    <div>
      <ScreenHead title="Housekeeping" desc="Turnovers, resets and quality checks by provider."
        actions={<button className="pm-btn primary" onClick={actions.addHousekeeping}><Plus size={15} /> Add task</button>} />

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <div className="pm-segment">
          <button className={view === 'board' ? 'on' : ''} onClick={() => setView('board')}>Board</button>
          <button className={view === 'table' ? 'on' : ''} onClick={() => setView('table')}>Table</button>
        </div>
        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{rows.filter((t) => t.status !== 'completed').length} open · {overdue} overdue</span>
      </div>

      {view === 'board' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 14 }} className="ss-hk-board">
          {COLS.map((c) => (
            <div key={c.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>{c.label}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--surface-2)', borderRadius: 20, padding: '1px 8px' }}>{grouped[c.id].length}</span>
              </div>
              {grouped[c.id].map((t) => {
                const isOverdue = t.status === 'pending' && t.scheduled_date && t.scheduled_date < today;
                return (
                  <div key={t.id} className="pm-card" style={{ marginBottom: 10 }}>
                    <div className="pm-card-body" style={{ padding: 13 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                        <Chip k={isOverdue ? 'blocked' : t.status} label={isOverdue ? 'Overdue' : undefined} />
                        <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'capitalize' }}>{String(t.task_type || '').replace(/_/g, ' ')}</span>
                      </div>
                      <div style={{ fontWeight: 650, fontSize: 13, color: 'var(--ink)', marginBottom: 3 }}>{t.property?.title || `#${t.property_id}`}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 6 }}>Due {fmtDate(t.scheduled_date)} · {bdt(t.cost)} · {String(t.charge_to || 'owner')}</div>
                      <div style={{ fontSize: 11.5, color: t.provider_name ? 'var(--ink-soft)' : 'var(--muted-2)', marginBottom: 10, fontWeight: t.provider_name ? 600 : 500 }}>{t.provider_name || 'Unassigned provider'}</div>
                      {t.status !== 'completed' && <button className="pm-btn" style={{ ...fullBtn, marginBottom: 6 }} onClick={() => actions.assignHousekeeping?.(t)}>{t.provider_name ? 'Reassign' : 'Assign provider'}</button>}
                      {cardBtn(t)}
                    </div>
                  </div>
                );
              })}
              {!grouped[c.id].length && <div style={{ fontSize: 12, color: 'var(--muted-2)', padding: '14px 8px', textAlign: 'center', border: '1px dashed var(--line)', borderRadius: 10 }}>Nothing here</div>}
            </div>
          ))}
        </div>
      ) : (
        <div className="pm-card"><div className="pm-card-body ss-table-scroll" style={{ padding: 0 }}>
          <table className="pm-tbl">
            <thead><tr><th>Property</th><th>Type</th><th>Provider</th><th>Scheduled</th><th>Charge to</th><th style={{ textAlign: 'right' }}>Cost</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 650 }}>{t.property?.title || `#${t.property_id}`}</td>
                  <td style={{ textTransform: 'capitalize', fontSize: 12.5 }}>{String(t.task_type || '').replace(/_/g, ' ')}</td>
                  <td style={{ fontSize: 12.5 }}>{t.provider_name || <span style={{ color: 'var(--muted)' }}>Unassigned</span>}</td>
                  <td style={{ fontSize: 12.5 }}>{fmtDate(t.scheduled_date)}</td>
                  <td style={{ textTransform: 'capitalize', fontSize: 12.5 }}>{t.charge_to}</td>
                  <td style={{ textAlign: 'right' }}><strong>{bdt(t.cost)}</strong></td>
                  <td><Chip k={t.status} /></td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      {t.status !== 'completed' && <button className="pm-btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => actions.assignHousekeeping?.(t)}>Assign</button>}
                      {t.status !== 'completed' ? <button className="pm-btn primary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => actions.updateHousekeeping?.(t.id, t.status === 'pending' ? 'in_progress' : 'completed')}>{t.status === 'pending' ? 'Start' : 'Complete'}</button> : <span style={{ color: 'var(--muted)' }}>—</span>}
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>No housekeeping tasks. Turnovers are scheduled automatically on check-out.</td></tr>}
            </tbody>
          </table>
        </div></div>
      )}
      <style>{`@media (max-width:1000px){ .ss-hk-board{ grid-template-columns:repeat(2,1fr)!important } } @media (max-width:560px){ .ss-hk-board{ grid-template-columns:1fr!important } }`}</style>
    </div>
  );
}
const fullBtn = { width: '100%', justifyContent: 'center', padding: '6px 10px', fontSize: 12 };
