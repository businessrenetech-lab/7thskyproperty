import React, { useEffect, useState, useCallback } from 'react';
import { Wallet, Banknote } from 'lucide-react';
import api from '../../services/api';
import { Spinner } from '../../ui/kit';
import { bdt, bdtFull, Chip, Kpi, ScreenHead } from './common';

export default function Payments({ refreshKey, goTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get('/short-stay/payments'); setData(res.data || null); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  if (loading) return <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>;
  const k = data?.kpi || {};
  const charges = data?.charges || [];

  return (
    <div>
      <ScreenHead title="Payments & charges" desc="Accommodation, deposits, extras, refunds and disbursement status."
        actions={<button className="pm-btn primary" onClick={() => goTab?.('owner-disbursement')}><Banknote size={15} /> Owner disbursement</button>} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 20 }} className="ss-kpi-row">
        <Kpi tone="bad" label="Due from guests" value={bdt(k.due_from_guests)} sub={`${k.due_count ?? 0} bookings`} />
        <Kpi tone="cyan" label="Deposits held" value={bdt(k.deposits_held)} sub={`${k.deposits_count ?? 0} stays`} />
        <Kpi tone="good" label="Collected (month)" value={bdt(k.collected_this_month)} sub="this period" />
        <Kpi tone={k.refunds_pending ? 'warn' : 'ink'} label="Refunds pending" value={bdt(k.refunds_pending)} sub={`${k.refunds_count ?? 0} closures`} />
        <Kpi label="Owner payouts due" value={bdt(k.owner_payouts_due)} sub="next run" />
      </div>

      <div className="pm-card">
        <div className="pm-card-h">
          <div className="ic"><Wallet size={17} /></div>
          <div><h3>Charges &amp; settlement</h3><div className="hsub">Folio, receipts and invoices live in Finance</div></div>
        </div>
        <div className="pm-card-body ss-table-scroll" style={{ padding: 0 }}>
          <table className="pm-tbl">
            <thead><tr><th>Booking</th><th>Guest</th><th>Property</th><th>Charge type</th><th style={{ textAlign: 'right' }}>Amount</th><th>Status</th><th>Disbursement</th></tr></thead>
            <tbody>
              {charges.map((c, i) => (
                <tr key={i}>
                  <td><strong style={{ color: 'var(--navy)' }}>{c.booking_code}</strong></td>
                  <td style={{ fontSize: 12.5 }}>{c.guest}</td>
                  <td style={{ fontSize: 12.5 }}>{c.property}</td>
                  <td style={{ fontSize: 12.5 }}>{c.charge_type}</td>
                  <td style={{ textAlign: 'right' }}><span className="pm-money">{bdtFull(c.amount)}</span>{c.due > 0 && <div className="ph" style={{ fontSize: 11, color: 'var(--bad)' }}>{bdt(c.due)} due</div>}</td>
                  <td><Chip k={c.status} /></td>
                  <td style={{ fontSize: 12.5, color: 'var(--muted)' }}>{c.settled ? 'Settled' : '—'}</td>
                </tr>
              ))}
              {!charges.length && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>No charges yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <style>{`@media (max-width:1080px){ .ss-kpi-row{ grid-template-columns:repeat(2,1fr)!important } } @media (max-width:560px){ .ss-kpi-row{ grid-template-columns:1fr!important } }`}</style>
    </div>
  );
}
