import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import { Spinner } from '../../ui/kit';
import { bdt, ScreenHead } from './common';

// Route each report card to the screen that backs it
const OPEN_TAB = {
  'Occupancy & ADR': 'properties', 'Revenue by property': 'properties',
  'Arrivals & departures': 'bookings', 'Cancellations': 'bookings',
  'Booking revenue': 'payments', 'Booking source': 'bookings', 'Deposits': 'payments',
  'Agreements': 'owner-agreements', 'Housekeeping': 'housekeeping', 'Incidents': 'maintenance',
  'Owner fees': 'owner-statements', 'Payouts': 'owner-statements',
};
const defaultPeriod = () => {
  const now = new Date();
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10),
  };
};

export default function Reports({ refreshKey, goTab }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(defaultPeriod);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get('/short-stay/reports', { params: period }); setCards(Array.isArray(res.data) ? res.data : []); }
    finally { setLoading(false); }
  }, [period]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const exportCsv = () => {
    const head = ['Group', 'Report', 'Detail', 'Value'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const body = cards.map((c) => [c.group, c.title, c.sub, typeof c.value === 'number' ? c.value : c.value].map(esc).join(','));
    const csv = [head.map(esc).join(','), ...body].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url; a.download = `short-stay-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  if (loading) return <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>;
  const fmt = (v) => typeof v === 'number' ? bdt(v) : v;

  return (
    <div>
      <ScreenHead title="Reports" desc="Occupancy, revenue, compliance and operational performance."
        actions={<><button className="pm-btn" onClick={exportCsv}>Export CSV</button><button className="pm-btn" onClick={() => window.print()}>Export PDF</button></>} />

      <div className="pm-card" style={{ marginBottom: 14 }}><div className="pm-card-body" style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 12, fontWeight: 700 }}>Report start<input className="pm-input" type="date" value={period.start} onChange={(e) => setPeriod((current) => ({ ...current, start: e.target.value }))} /></label>
        <label style={{ fontSize: 12, fontWeight: 700 }}>Report end<input className="pm-input" type="date" value={period.end} onChange={(e) => setPeriod((current) => ({ ...current, end: e.target.value }))} /></label>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>End date is exclusive.</span>
      </div></div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 14 }} className="ss-reports-grid">
        {cards.map((c, i) => (
          <div key={i} className="pm-card">
            <div className="pm-card-body" style={{ padding: 18 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--muted-2)', marginBottom: 8 }}>{c.group}</div>
              <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--ink)', marginBottom: 3 }}>{c.title}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, minHeight: 32 }}>{c.sub}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 22, fontWeight: 780, letterSpacing: '-.02em', color: 'var(--ink)' }}>{fmt(c.value)}</span>
                <button className="pm-link" onClick={() => goTab?.(OPEN_TAB[c.title] || 'dashboard')}>Open</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <style>{`@media (max-width:1000px){ .ss-reports-grid{ grid-template-columns:repeat(2,1fr)!important } } @media (max-width:600px){ .ss-reports-grid{ grid-template-columns:1fr!important } }`}</style>
    </div>
  );
}
