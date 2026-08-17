import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Wallet, ArrowLeft, Banknote, FileCheck2 } from 'lucide-react';
import api from '../../services/api';
import { Spinner } from '../../ui/kit';
import { useToast } from '../../context/ToastContext';
import { bdt, bdtFull, ScreenHead } from './common';

// Default period = current month
const monthBounds = () => {
  const n = new Date();
  const start = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const end = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
  return { start, end };
};

const PAY = {
  paid: ['good', 'Paid'], ready: ['info', 'Ready'], sent: ['warn', 'Sent'], closed: ['grey', 'Closed'],
  pending: ['warn', 'Pending'], owner_owes: ['bad', 'Owner owes'], no_activity: ['grey', 'No activity'],
};

export default function OwnerDisbursement({ onBack }) {
  const toast = useToast();
  const [{ start, end }, setPeriod] = useState(monthBounds());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState({});
  const [ref, setRef] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/short-stay/owner-statements', { params: { start, end } }); setRows(Array.isArray(r.data) ? r.data : []); }
    finally { setLoading(false); }
  }, [start, end]);
  useEffect(() => { load(); }, [load]);

  const errMsg = (e) => e.response?.data?.error || 'Something went wrong';
  // Only positive-payout, not-yet-paid rows are disbursable
  const disbursable = (r) => r.owner_payable > 0 && !['paid', 'closed'].includes(r.payment_status);
  const selectedRows = useMemo(() => rows.filter((r) => checked[r.owner_contact_id] && disbursable(r)), [rows, checked]);

  const totals = useMemo(() => rows.reduce((a, r) => ({
    revenue: a.revenue + Number(r.booking_revenue || 0),
    fees: a.fees + Number(r.management_fees || 0),
    expenses: a.expenses + Number(r.expenses || 0),
    payable: a.payable + Math.max(0, Number(r.owner_payable || 0)),
  }), { revenue: 0, fees: 0, expenses: 0, payable: 0 }), [rows]);

  const selectedTotal = selectedRows.reduce((s, r) => s + Number(r.owner_payable || 0), 0);

  const toggleAll = (on) => { const m = {}; if (on) rows.forEach((r) => { if (disbursable(r)) m[r.owner_contact_id] = true; }); setChecked(m); };

  const generate = async () => {
    setBusy(true);
    try { await api.post('/short-stay/owner-statements/generate', { start, end }); toast.success('Statements generated'); await load(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  // Bulk disburse = ensure statements exist, mark sent (if ready) then paid with the reference
  const disburse = async () => {
    if (!selectedRows.length) return toast.error('Select at least one owner to disburse');
    if (!ref.trim()) return toast.error('Enter a disbursement reference (e.g. bank batch no.)');
    setBusy(true);
    let ok = 0, fail = 0;
    try {
      // make sure statements are generated for the period
      await api.post('/short-stay/owner-statements/generate', { start, end }).catch(() => {});
      const fresh = await api.get('/short-stay/owner-statements', { params: { start, end } });
      const byOwner = Object.fromEntries((fresh.data || []).map((r) => [r.owner_contact_id, r]));
      for (const sel of selectedRows) {
        const stmt = byOwner[sel.owner_contact_id];
        if (!stmt?.statement_id) { fail++; continue; }
        try {
          if (stmt.payment_status === 'ready') await api.patch(`/short-stay/owner-statements/${stmt.statement_id}/status`, { status: 'sent' });
          await api.patch(`/short-stay/owner-statements/${stmt.statement_id}/status`, { status: 'paid', disbursement_reference: ref.trim(), disbursement_method: 'bank_transfer' });
          ok++;
        } catch { fail++; }
      }
      toast[fail ? 'error' : 'success'](`Disbursed ${ok} owner${ok === 1 ? '' : 's'}${fail ? `, ${fail} failed` : ''}`);
      setChecked({}); setRef(''); await load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div className="pm-scope">
      <ScreenHead
        title="Owner disbursement"
        desc="Bulk payouts to owners for the period. The payout deducts Seventh Sky's management fee (per the signed STR agreement) and owner expenses."
        actions={<button className="pm-btn" onClick={onBack}><ArrowLeft size={15} /> Back to payments</button>}
      />

      {/* Period + KPIs */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: 'var(--muted)' }}>Period</label>
        <input type="date" value={start} onChange={(e) => setPeriod((p) => ({ ...p, start: e.target.value }))} style={inp} />
        <span style={{ color: 'var(--muted)' }}>→</span>
        <input type="date" value={end} onChange={(e) => setPeriod((p) => ({ ...p, end: e.target.value }))} style={inp} />
        <button className="pm-btn" onClick={load}>Apply</button>
        <div className="sp" style={{ flex: 1 }} />
        <button className="pm-btn" disabled={busy} onClick={generate}><FileCheck2 size={15} /> Generate statements</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
        {[['Gross booking revenue', bdt(totals.revenue), 'ink'], ['Seventh Sky fees', bdt(totals.fees), 'cyan'], ['Owner expenses', bdt(totals.expenses), 'warn'], ['Owner payouts due', bdt(totals.payable), 'good']].map(([lab, val, tone]) => (
          <div key={lab} className="pm-kpi" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 11.5, fontWeight: 650, color: 'var(--muted)', marginBottom: 6 }}>{lab}</div>
            <div style={{ fontSize: 22, fontWeight: 780, letterSpacing: '-.02em', color: tone === 'good' ? 'var(--good)' : tone === 'cyan' ? 'var(--cyan)' : tone === 'warn' ? 'var(--warn)' : 'var(--ink)' }}>{val}</div>
          </div>
        ))}
      </div>

      {loading ? <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div> : (
        <div className="pm-card">
          <div className="pm-card-body" style={{ padding: 0 }}>
            <table className="pm-tbl">
              <thead><tr>
                <th style={{ width: 34 }}><input type="checkbox" onChange={(e) => toggleAll(e.target.checked)} checked={selectedRows.length > 0 && selectedRows.length === rows.filter(disbursable).length} /></th>
                <th>Owner</th><th>Properties</th><th style={{ textAlign: 'right' }}>Booking revenue</th><th style={{ textAlign: 'right' }}>Seventh Sky fee</th><th style={{ textAlign: 'right' }}>Expenses</th><th style={{ textAlign: 'right' }}>Net payout</th><th>Status</th>
              </tr></thead>
              <tbody>
                {rows.map((r) => {
                  const [tone, label] = PAY[r.payment_status] || ['grey', r.payment_status];
                  const can = disbursable(r);
                  return (
                    <tr key={r.owner_contact_id}>
                      <td><input type="checkbox" disabled={!can} checked={!!checked[r.owner_contact_id]} onChange={(e) => setChecked((c) => ({ ...c, [r.owner_contact_id]: e.target.checked }))} /></td>
                      <td style={{ fontWeight: 650 }}>{r.owner_name}</td>
                      <td style={{ fontSize: 12.5 }}>{r.property_label}</td>
                      <td style={{ textAlign: 'right' }}>{bdtFull(r.booking_revenue)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--cyan)' }}>– {bdtFull(r.management_fees)}<div className="ph" style={{ fontSize: 11, color: 'var(--muted)' }}>{r.revenue_share_percent ? `${r.revenue_share_percent}%` : 'fixed'}</div></td>
                      <td style={{ textAlign: 'right', color: 'var(--warn)' }}>{r.expenses ? '– ' + bdtFull(r.expenses) : '—'}</td>
                      <td style={{ textAlign: 'right' }}><strong style={{ color: r.owner_payable < 0 ? 'var(--bad)' : 'var(--ink)' }}>{bdtFull(r.owner_payable)}</strong></td>
                      <td><span className={`pm-chip ${tone}`}><span className="d" />{label}</span></td>
                    </tr>
                  );
                })}
                {!rows.length && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>No owner activity for this period.</td></tr>}
              </tbody>
            </table>
          </div>
          {/* Bulk action bar */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '14px 18px', borderTop: '1px solid var(--line-soft)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}><b>{selectedRows.length}</b> selected · <b>{bdt(selectedTotal)}</b> to disburse</span>
            <div className="sp" style={{ flex: 1 }} />
            <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Disbursement reference (bank batch no.)" style={{ ...inp, minWidth: 260 }} />
            <button className="pm-btn primary" disabled={busy || !selectedRows.length} onClick={disburse}><Banknote size={15} /> {busy ? 'Processing…' : 'Disburse selected'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
const inp = { border: '1px solid var(--line)', borderRadius: 10, padding: '8px 12px', background: 'var(--surface)', font: 'inherit', color: 'var(--ink)' };
