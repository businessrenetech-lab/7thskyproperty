// admin-portal/src/screens/sales/settlement-desk/AuditPanel.jsx
//
// The raw ledger detail, one disclosure away from the primary flow: beneficiary
// trust balances, the trust ledger with running balance, and the approval trail.
// Read-only — no mutations.
import React from 'react';
import { Badge } from '../../../ui/kit';
import { money, label, STATUS_TONE, arr } from './settlementMoney';

export default function AuditPanel({ picture }) {
  const trust = picture.trust || { accounts: [], entries: [] };
  const entries = arr(picture.statement?.entries);
  const approvals = arr(picture.statement?.approvals || picture.approvals);

  return (
    <details className="pm-card audit-panel" style={{ padding: 12, marginTop: 12 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Audit &amp; ledger detail</summary>

      <h4 style={{ marginTop: 12 }}>Beneficiary trust balances</h4>
      {arr(trust.accounts).length ? (
        <table className="tbl"><thead><tr><th>Beneficiary</th><th>Type</th><th style={{ textAlign: 'right' }}>Balance</th></tr></thead>
          <tbody>{arr(trust.accounts).map((a) => (
            <tr key={a.id}><td>{a.beneficiary_key}</td><td>{label(a.account_type)}</td><td style={{ textAlign: 'right' }}>{money(a.balance)}</td></tr>
          ))}</tbody>
        </table>
      ) : <p className="cell-sub">No trust accounts yet.</p>}

      <h4 style={{ marginTop: 12 }}>Trust ledger</h4>
      {entries.length ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl"><thead><tr><th>Date</th><th>Entry</th><th>Ref</th><th style={{ textAlign: 'right' }}>In</th><th style={{ textAlign: 'right' }}>Out</th><th style={{ textAlign: 'right' }}>Balance</th></tr></thead>
            <tbody>{entries.map((e) => (
              <tr key={e.id}>
                <td>{(e.date || '').slice(0, 10)}</td>
                <td>{label(e.entry_kind)}{e.party ? ` · ${e.party}` : ''}</td>
                <td>{e.reference || '—'}</td>
                <td style={{ textAlign: 'right' }}>{e.amount_in ? money(e.amount_in) : ''}</td>
                <td style={{ textAlign: 'right' }}>{e.amount_out ? money(e.amount_out) : ''}</td>
                <td style={{ textAlign: 'right' }}>{e.running_balance != null ? money(e.running_balance) : '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <p className="cell-sub">No ledger entries yet.</p>}

      <h4 style={{ marginTop: 12 }}>Approval trail</h4>
      {approvals.length ? (
        <table className="tbl"><thead><tr><th>Action</th><th>From → To</th><th>Reason</th><th>When</th></tr></thead>
          <tbody>{approvals.map((a) => (
            <tr key={a.id}>
              <td><Badge tone={STATUS_TONE[a.to_status] || 'grey'}>{label(a.action)}</Badge></td>
              <td>{label(a.from_status)} → {label(a.to_status)}</td>
              <td>{a.reason || '—'}</td>
              <td>{(a.created_at || a.createdAt || '').slice(0, 16).replace('T', ' ')}</td>
            </tr>
          ))}</tbody>
        </table>
      ) : <p className="cell-sub">No approval events yet.</p>}
    </details>
  );
}
