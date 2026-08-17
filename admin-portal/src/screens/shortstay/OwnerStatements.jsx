import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import { Spinner } from '../../ui/kit';
import { bdtFull, Chip, ScreenHead } from './common';
import { useToast } from '../../context/ToastContext';

const PAY = { ready: ['warn', 'Ready'], sent: ['warn', 'Sent'], paid: ['good', 'Paid'], closed: ['grey', 'Closed'], scheduled: ['warn', 'Scheduled'], pending: ['warn', 'Pending'], owner_owes: ['bad', 'Owner owes'], no_activity: ['grey', 'No activity'] };
const defaultPeriod = () => {
  const now = new Date();
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10),
  };
};

export default function OwnerStatements({ refreshKey }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(defaultPeriod);
  const [busy, setBusy] = useState(false);
  const [payout, setPayout] = useState(null);
  const [payoutForm, setPayoutForm] = useState({ disbursement_reference: '', disbursement_method: 'bank_transfer', disbursement_date: new Date().toISOString().slice(0, 10) });

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get('/short-stay/owner-statements', { params: period }); setRows(Array.isArray(res.data) ? res.data : []); }
    finally { setLoading(false); }
  }, [period]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const generate = async () => {
    setBusy(true);
    try { await api.post('/short-stay/owner-statements/generate', period); toast.success('Owner statements generated'); await load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Could not generate statements'); }
    finally { setBusy(false); }
  };
  const setStatus = async (row, status, extra = {}) => {
    setBusy(true);
    try { await api.patch(`/short-stay/owner-statements/${row.statement_id}/status`, { status, ...extra }); toast.success(`Statement marked ${status}`); setPayout(null); await load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Could not update statement'); }
    finally { setBusy(false); }
  };
  const openPayout = (row) => {
    setPayout(row);
    setPayoutForm({ disbursement_reference: '', disbursement_method: 'bank_transfer', disbursement_date: new Date().toISOString().slice(0, 10) });
  };

  if (loading) return <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>;

  return (
    <div>
      <ScreenHead title="Owner statements" desc="Revenue, fees and payable amounts per owner and period." actions={<button type="button" className="pm-btn primary" disabled={busy} onClick={generate}>{busy ? 'Working…' : 'Generate statements'}</button>} />
      <div className="pm-card" style={{ marginBottom: 14 }}><div className="pm-card-body" style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 12, fontWeight: 700 }}>Period start<input className="pm-input" type="date" value={period.start} onChange={(e) => setPeriod((current) => ({ ...current, start: e.target.value }))} /></label>
        <label style={{ fontSize: 12, fontWeight: 700 }}>Period end<input className="pm-input" type="date" value={period.end} onChange={(e) => setPeriod((current) => ({ ...current, end: e.target.value }))} /></label>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>End date is exclusive.</span>
      </div></div>
      {payout && <form className="pm-card" style={{ marginBottom: 14 }} onSubmit={(event) => { event.preventDefault(); setStatus(payout, 'paid', payoutForm); }}><div className="pm-card-body" style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px' }}><strong>Record payout for {payout.owner_name}</strong><div style={{ color: 'var(--muted)', fontSize: 12 }}>{bdtFull(payout.owner_payable)} · {payout.statement_code}</div></div>
        <label style={{ fontSize: 12, fontWeight: 700 }}>Reference<input className="pm-input" required value={payoutForm.disbursement_reference} onChange={(e) => setPayoutForm((current) => ({ ...current, disbursement_reference: e.target.value }))} /></label>
        <label style={{ fontSize: 12, fontWeight: 700 }}>Method<select className="pm-input" value={payoutForm.disbursement_method} onChange={(e) => setPayoutForm((current) => ({ ...current, disbursement_method: e.target.value }))}><option value="bank_transfer">Bank transfer</option><option value="mobile_banking">Mobile banking</option><option value="cheque">Cheque</option><option value="cash">Cash</option></select></label>
        <label style={{ fontSize: 12, fontWeight: 700 }}>Date<input className="pm-input" type="date" required value={payoutForm.disbursement_date} onChange={(e) => setPayoutForm((current) => ({ ...current, disbursement_date: e.target.value }))} /></label>
        <button type="button" className="pm-btn" onClick={() => setPayout(null)}>Cancel</button>
        <button type="submit" className="pm-btn primary" disabled={busy}>Confirm paid</button>
      </div></form>}
      <div className="pm-card"><div className="pm-card-body ss-table-scroll" style={{ padding: 0 }}>
        <table className="pm-tbl">
          <thead><tr><th>Owner</th><th>Property</th><th>Period</th><th style={{ textAlign: 'right' }}>Booking revenue</th><th style={{ textAlign: 'right' }}>Expenses</th><th style={{ textAlign: 'right' }}>Management fees</th><th style={{ textAlign: 'right' }}>Share</th><th style={{ textAlign: 'right' }}>Owner payable</th><th>Payment</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
          <tbody>
            {rows.map((r, i) => {
              const [tone, label] = PAY[r.payment_status] || ['grey', r.payment_status];
              return (
                <tr key={i}>
                  <td style={{ fontWeight: 650 }}>{r.owner_name}</td>
                  <td style={{ fontSize: 12.5 }}>{r.property_label}</td>
                  <td style={{ fontSize: 12.5 }}>{r.period}</td>
                  <td style={{ textAlign: 'right' }}>{r.booking_revenue ? bdtFull(r.booking_revenue) : '—'}</td>
                  <td style={{ textAlign: 'right' }}>{r.expenses ? bdtFull(r.expenses) : '—'}</td>
                  <td style={{ textAlign: 'right' }}>{r.management_fees ? bdtFull(r.management_fees) : '—'}</td>
                  <td style={{ textAlign: 'right', fontSize: 12.5 }}>{r.revenue_share_percent}%</td>
                  <td style={{ textAlign: 'right' }}><strong style={{ color: r.owner_payable < 0 ? 'var(--bad)' : 'var(--ink)' }}>{bdtFull(r.owner_payable)}</strong></td>
                  <td><span className={`pm-chip ${tone}`}><span className="d" />{label}</span></td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{r.payment_status === 'ready' && <button type="button" className="pm-btn" disabled={busy} onClick={() => setStatus(r, 'sent', { sent_channel: 'email' })}>Mark sent</button>}{r.payment_status === 'sent' && r.owner_payable > 0 && <button type="button" className="pm-btn primary" disabled={busy} onClick={() => openPayout(r)}>Record payout</button>}{r.payment_status === 'sent' && r.owner_payable <= 0 && <button type="button" className="pm-btn" disabled={busy} onClick={() => setStatus(r, 'closed')}>Close</button>}{r.payment_status === 'paid' && <button type="button" className="pm-btn" disabled={busy} onClick={() => setStatus(r, 'closed')}>Close</button>}</td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={10} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>No owner statements yet. They build from linked owner agreements and booking revenue.</td></tr>}
          </tbody>
        </table>
      </div></div>
    </div>
  );
}
