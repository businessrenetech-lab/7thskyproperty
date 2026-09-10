// admin-portal/src/screens/sales/settlement-desk/PrepareView.jsx
//
// View 1 — Prepare. The obligation schedule (what the settlement owes and to
// whom), expected-vs-actual summary, editing an agreed fee (with a mandatory
// reason), and one-click rebalance of vendor proceeds. Editing is enabled only
// while the settlement is draft/returned and only for the prepare role — the
// backend enforces both; this hides what can't be used.
import React, { useState } from 'react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { Button, Input, Field } from '../../../ui/kit';
import {
  money, label, deskRoles, AGENCY_LINE_TYPES, payeeDisplayName,
} from './settlementMoney';

const money0 = (v) => Number(v || 0);

export default function PrepareView({ picture, desk }) {
  const { user } = useAuth();
  const { canPrepare } = deskRoles(user);
  const [editing, setEditing] = useState(null); // { id, amount, edit_reason }

  if (!picture.settlement) {
    return <div className="pm-card card-pad">No settlement yet. Accept an offer and open a settlement from the sales file first.</div>;
  }

  const sid = picture.settlement.id;
  const status = picture.settlement.status;
  const editable = canPrepare && ['draft', 'returned'].includes(status);
  const totals = picture.statement?.totals || picture.settlement.calculations || {};
  const parties = picture.parties;

  const saveFee = () => {
    const reason = String(editing.edit_reason || '').trim();
    if (!reason) return; // the input's own validation message covers this
    desk.call(
      () => api.patch(`/sales/settlement-lines/${editing.id}/fee`, { amount: editing.amount, edit_reason: reason }),
      'Fee updated',
    ).then((ok) => { if (ok) setEditing(null); });
  };

  const rebalance = () => desk.call(() => api.post(`/sales/settlements/${sid}/rebalance`, {}), 'Vendor proceeds rebalanced');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Expected-vs-actual summary */}
      <div className="pm-card card-pad">
        <div className="desk-summary" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
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

      {/* Obligation schedule */}
      <div className="pm-card card-pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}>Obligation schedule</h3>
          {editable && <Button size="sm" variant="ghost" onClick={rebalance}>Rebalance vendor proceeds</Button>}
        </div>
        <div style={{ overflowX: 'auto', marginTop: 8 }}>
          <table className="tbl">
            <thead><tr><th>Line</th><th>Payee</th><th>Terms</th><th style={{ textAlign: 'right' }}>Amount</th><th /></tr></thead>
            <tbody>
              {picture.lines.length === 0 && (
                <tr><td colSpan={5} className="cell-sub">No settlement lines yet.</td></tr>
              )}
              {picture.lines.map((line) => {
                const isFee = AGENCY_LINE_TYPES.includes(line.line_type);
                const isEditing = editing?.id === line.id;
                return (
                  <tr key={line.id}>
                    <td>{label(line.line_type)}</td>
                    <td>{line.line_type === 'purchase_price' ? '—' : payeeDisplayName(line, parties)}</td>
                    <td className="cell-sub">{line.terms || '—'}</td>
                    <td style={{ textAlign: 'right' }} className="pm-num">
                      {isEditing
                        ? <Input type="number" step="0.01" value={editing.amount} onChange={(e) => setEditing({ ...editing, amount: e.target.value })} style={{ maxWidth: 140 }} />
                        : money(line.amount)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {isFee && editable && !isEditing && (
                        <Button size="sm" variant="ghost" onClick={() => setEditing({ id: line.id, amount: money0(line.amount), edit_reason: '' })}>Edit</Button>
                      )}
                      {isEditing && (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                          <Button size="sm" onClick={saveFee} disabled={!String(editing.edit_reason || '').trim()}>Save</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {editing && (
          <div style={{ marginTop: 8 }}>
            <Field label="Reason for changing this agreed fee (printed on the vendor invoice)" required>
              <Input value={editing.edit_reason} onChange={(e) => setEditing({ ...editing, edit_reason: e.target.value })} placeholder="e.g. Discount agreed with vendor on 2026-09-11" />
            </Field>
          </div>
        )}
        {!editable && (
          <p className="cell-sub" style={{ marginTop: 8 }}>
            {canPrepare ? `Editing is only available while the settlement is draft or returned (it is ${label(status)}).` : 'You do not have the role to edit the schedule.'}
          </p>
        )}
      </div>
    </div>
  );
}
