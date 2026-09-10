// admin-portal/src/screens/sales/settlement-desk/ReviewApproveView.jsx
//
// View 2 — Review & approve. The read-only statement summary plus the lifecycle
// action valid for the current status (submit → review → approve, and return),
// gated by role. A single-user branch uses the super-admin separation-of-duties
// override with a written reason. The backend enforces the real rule; this only
// surfaces it. Independent of Prepare, as policy requires.
import React, { useState } from 'react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { Button, Input, Field, Badge } from '../../../ui/kit';
import { money, label, deskRoles, STATUS_TONE, LIFECYCLE_ACTIONS } from './settlementMoney';

export default function ReviewApproveView({ picture, desk }) {
  const { user } = useAuth();
  const roles = deskRoles(user);
  const [override, setOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  if (!picture.settlement) {
    return <div className="pm-card card-pad">No settlement to review yet.</div>;
  }

  const sid = picture.settlement.id;
  const status = picture.settlement.status;
  const totals = picture.statement?.totals || picture.settlement.calculations || {};
  const approvals = picture.approvals || picture.statement?.approvals || [];
  const roleAllows = (actionRole) => (actionRole === 'admin' ? roles.canAdmin : roles.canAccounts);

  const act = (key) => {
    const body = {};
    if (override && user?.role === 'super_admin' && overrideReason.trim()) {
      body.override = true; body.override_reason = overrideReason.trim();
    }
    if (key === 'return') {
      const reason = window.prompt('Reason for returning this settlement to draft:');
      if (!reason || !reason.trim()) return;
      body.reason = reason.trim();
    }
    const done = key === 'return' ? 'Settlement returned' : `Settlement ${key === 'approve' ? 'approved' : key === 'review' ? 'reviewed' : 'submitted'}`;
    desk.call(() => api.post(`/sales/settlements/${sid}/${key}`, body), done);
  };

  const available = LIFECYCLE_ACTIONS.filter((a) => a.from.includes(status) && roleAllows(a.role));
  const canReturn = roles.canAccounts && ['submitted', 'reviewed', 'approved'].includes(status);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="pm-card card-pad">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="cell-sub">Status</span>
          <Badge tone={STATUS_TONE[status] || 'grey'}>{label(status)}</Badge>
        </div>
        <div className="desk-summary" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 10 }}>
          {[
            ['Purchase price', totals.purchase_price],
            ['Obligations', totals.outgoing_obligations],
            ['Funds held', totals.funds_held],
            ['Residual', totals.residual],
          ].map(([k, v]) => (
            <div key={k}><div className="cell-sub">{k}</div><strong className="pm-num">{money(v)}</strong></div>
          ))}
        </div>
      </div>

      <div className="pm-card card-pad">
        <h3 style={{ marginTop: 0 }}>Move this settlement forward</h3>
        {available.length === 0 && !canReturn && (
          <p className="cell-sub">No lifecycle action is available to your role at status “{label(status)}”.</p>
        )}
        {user?.role === 'super_admin' && (available.some((a) => ['review', 'approve'].includes(a.key)) || status === 'approved') && (
          <div style={{ margin: '8px 0', padding: 8, background: 'var(--wash, #f8fafc)', borderRadius: 6 }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
              <span>Override separation of duties (single-staff branch)</span>
            </label>
            {override && (
              <div style={{ marginTop: 6 }}>
                <Field label="Written reason (recorded on the approval trail)" required>
                  <Input value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="e.g. No second accounts user available" />
                </Field>
              </div>
            )}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {available.map((a) => (
            <Button key={a.key} onClick={() => act(a.key)}>{a.label}</Button>
          ))}
          {canReturn && <Button variant="ghost" onClick={() => act('return')}>Return to draft</Button>}
        </div>
      </div>

      <div className="pm-card card-pad">
        <h3 style={{ marginTop: 0 }}>Approval trail</h3>
        {approvals.length === 0 ? (
          <p className="cell-sub">No approval events yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr><th>Action</th><th>From → To</th><th>Reason</th><th>When</th></tr></thead>
              <tbody>
                {approvals.map((a) => (
                  <tr key={a.id}>
                    <td><Badge tone={STATUS_TONE[a.to_status] || 'grey'}>{label(a.action)}</Badge></td>
                    <td>{label(a.from_status)} → {label(a.to_status)}</td>
                    <td>{a.reason || '—'}</td>
                    <td>{(a.created_at || a.createdAt || '').slice(0, 16).replace('T', ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
