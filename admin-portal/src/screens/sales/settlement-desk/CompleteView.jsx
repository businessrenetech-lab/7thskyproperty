// admin-portal/src/screens/sales/settlement-desk/CompleteView.jsx
//
// View 5 — Complete & issue statements. The readiness check (blockers with
// Resolve links that jump to the owning view), the Lock action once clear, and
// the closing statement + vendor invoice. For a withdrawal settlement the same
// readiness rendering applies (the server returns withdrawalBlockers); for a
// completion settlement still holding cleared money, an "Unwind / refund" entry
// opens a withdrawal settlement.
import React, { useState } from 'react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { Button, Input, Field, Select } from '../../../ui/kit';
import { money, label, deskRoles, BLOCKER_VIEW, BLOCKER_LABEL } from './settlementMoney';

export default function CompleteView({ picture, desk, goView }) {
  const { user } = useAuth();
  const roles = deskRoles(user);
  const [override, setOverride] = useState('');
  const [unwind, setUnwind] = useState(null); // { buyer_party_id, reason }

  if (!picture.settlement) return <div className="pm-card card-pad">No settlement yet.</div>;
  const sid = picture.settlement.id;
  const status = picture.settlement.status;
  const isWithdrawal = picture.settlement.settlement_type === 'withdrawal';
  const totals = picture.statement?.totals || {};
  const blockers = picture.blockers || [];
  const canLock = roles.canAdmin && status === 'approved' && blockers.length === 0;

  const lock = () => {
    if (!window.confirm('Lock this settlement? This completes it and cannot be undone.')) return;
    const body = override.trim() && user?.role === 'super_admin' ? { override: true, override_reason: override.trim() } : {};
    desk.call(() => api.post(`/sales/settlements/${sid}/lock`, body), 'Settlement locked');
  };

  const issueInvoice = () => desk.call(() => api.post(`/sales/settlements/${sid}/vendor-invoice`, {}), 'Vendor invoice issued');

  const startUnwind = () => {
    const buyer = picture.parties.find((p) => p.party_type === 'buyer' && p.is_primary) || picture.parties.find((p) => p.party_type === 'buyer');
    setUnwind({ buyer_party_id: buyer?.id || '', reason: '' });
  };
  const openWithdrawal = () => {
    if (!unwind.buyer_party_id || !unwind.reason.trim()) return;
    const txId = picture.transaction?.id;
    desk.call(() => api.post(`/sales/transactions/${txId}/withdrawal`, {
      buyer_party_id: unwind.buyer_party_id, reason: unwind.reason.trim(), withdrawal_date: new Date().toISOString().slice(0, 10),
    }), 'Withdrawal settlement opened').then((ok) => { if (ok) { setUnwind(null); goView('prepare'); } });
  };

  const buyers = picture.parties.filter((p) => p.party_type === 'buyer');
  const hasClearedMoney = Number(totals.receipts || 0) > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Readiness */}
      <div className="pm-card card-pad">
        <h3 style={{ marginTop: 0 }}>Readiness{isWithdrawal ? ' (withdrawal)' : ''}</h3>
        {blockers.length === 0 ? (
          <p style={{ color: 'var(--green, #16a34a)' }}>Nothing blocking — this settlement is ready to lock.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {blockers.map((b) => (
              <li key={b} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span>• {BLOCKER_LABEL[b] || label(b)}</span>
                <Button size="sm" variant="ghost" onClick={() => goView(BLOCKER_VIEW[b] || 'complete')}>Resolve</Button>
              </li>
            ))}
          </ul>
        )}
        <div style={{ marginTop: 12 }}>
          {status === 'approved' && blockers.length === 0 && user?.role === 'super_admin' && (
            <Field label="Separation-of-duties override reason (optional, single-staff branch)">
              <Input value={override} onChange={(e) => setOverride(e.target.value)} placeholder="e.g. No independent locker available" />
            </Field>
          )}
          <Button disabled={!canLock} onClick={lock}>{isWithdrawal ? 'Lock & refund' : 'Lock & complete'}</Button>
          {status !== 'approved' && <p className="cell-sub" style={{ marginTop: 6 }}>The settlement must be approved before it can be locked.</p>}
          {!roles.canAdmin && <p className="cell-sub" style={{ marginTop: 6 }}>Locking requires an admin role.</p>}
        </div>
      </div>

      {/* Closing statement + vendor invoice */}
      <div className="pm-card card-pad">
        <h3 style={{ marginTop: 0 }}>Closing statement</h3>
        <div className="desk-summary" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            ['Purchase price', totals.purchase_price],
            ['Received', totals.receipts],
            ['Disbursed', totals.disbursed],
            ['Funds held', totals.funds_held],
            ['Residual', totals.residual],
          ].map(([k, v]) => (
            <div key={k}><div className="cell-sub">{k}</div><strong className="pm-num">{money(v)}</strong></div>
          ))}
        </div>
        {!isWithdrawal && (
          <div style={{ marginTop: 10 }}>
            <Button variant="ghost" disabled={!roles.canAccounts} onClick={issueInvoice}>Issue vendor invoice</Button>
          </div>
        )}
      </div>

      {/* Unwind / refund entry (completion settlement still holding money) */}
      {!isWithdrawal && ['draft', 'returned'].includes(status) && hasClearedMoney && (
        <div className="pm-card card-pad">
          <h3 style={{ marginTop: 0 }}>Unwind / refund</h3>
          <p className="cell-sub">Cleared money is held but the deal must be reversed. Open a buyer-withdrawal settlement to refund it correctly.</p>
          {!unwind ? (
            <Button variant="ghost" disabled={!roles.canPrepare} onClick={startUnwind}>Start withdrawal / refund</Button>
          ) : (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <Field label="Buyer to refund" required>
                <Select value={unwind.buyer_party_id} onChange={(e) => setUnwind({ ...unwind, buyer_party_id: e.target.value })}>
                  <option value="">Select…</option>
                  {buyers.map((b) => <option key={b.id} value={b.id}>{b.snapshot_name}</option>)}
                </Select>
              </Field>
              <Field label="Reason" required>
                <Input value={unwind.reason} onChange={(e) => setUnwind({ ...unwind, reason: e.target.value })} />
              </Field>
              <Button onClick={openWithdrawal} disabled={!unwind.buyer_party_id || !unwind.reason.trim()}>Open withdrawal</Button>
              <Button variant="ghost" onClick={() => setUnwind(null)}>Cancel</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
