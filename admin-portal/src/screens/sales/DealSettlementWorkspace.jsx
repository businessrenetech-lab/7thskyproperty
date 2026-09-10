// admin-portal/src/screens/sales/DealSettlementWorkspace.jsx
//
// Mount point decision: embedded inside the existing deal detail Drawer in
// admin-portal/src/screens/DealsBoard.jsx (the drawer opened by clicking a
// deal row). DealsBoard already fetches and renders a single deal's detail
// in that drawer under a "Settlement" section — this workspace replaces the
// static settlement KV rows there so the guided settlement/disbursement flow
// lives right next to the rest of the deal's commercial info, with no new
// route needed. `dealId` is passed down from the selected row.
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button, Field, Input, Select, Spinner, Badge } from '../../ui/kit';

const money = (v) => 'BDT ' + Number(v || 0).toLocaleString();
const STATUS_TONE = { none: 'grey', unpaid: 'grey', not_started: 'grey', drafted: 'amber', sent: 'amber', partial: 'amber', pending: 'amber', in_progress: 'amber', signed: 'green', received: 'green', settled: 'green', disbursed: 'green' };

// payments.method ENUM on the backend — keep in sync with server/models/Payment.
const PAYMENT_METHODS = ['cash', 'bank_transfer', 'bkash', 'nagad', 'card', 'cheque', 'sslcommerz', 'other'];

export default function DealSettlementWorkspace({ dealId }) {
  const toast = useToast();
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [prep, setPrep] = useState({ expected_commission: '', expected_fee: '' });
  const [rcv, setRcv] = useState({ amount: '', kind: 'commission', method: 'bank_transfer' });
  const [disb, setDisb] = useState({ payee_type: 'agent', payee_name: '', amount: '', method: 'bank_transfer', reference: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/deals/${dealId}/settlement`);
      setD(data.data);
      setPrep({
        expected_commission: data.data?.deal?.expected_commission ?? '',
        expected_fee: data.data?.deal?.expected_fee ?? '',
      });
    } catch (e) { toast.error(e.response?.data?.error || 'Could not load settlement'); }
    finally { setLoading(false); }
  }, [dealId, toast]);
  useEffect(() => { load(); }, [load]);

  const call = async (fn, ok) => { try { await fn(); toast.success(ok); load(); } catch (e) { toast.error(e.response?.data?.error || 'Failed'); } };
  if (loading || !d) return <Spinner />;
  const m = d.money; const s = m.statuses;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[['Contract', s.contract], ['Settlement', s.settlement], ['Payment', s.payment], ['Disbursement', s.disbursement]].map(([k, v]) => (
          <div key={k} className="card" style={{ padding: '8px 12px' }}><div style={{ fontSize: 11, color: '#64748b' }}>{k}</div><Badge tone={STATUS_TONE[v] || 'grey'}>{String(v).replace('_', ' ')}</Badge></div>
        ))}
      </div>
      {m.next_action && <div className="card" style={{ padding: 12, borderLeft: '3px solid #0284c7' }}><strong>Next:</strong> {m.next_action.label}</div>}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[['Expected', m.expected.total], ['Received', m.received], ['Disbursed', m.disbursed], ['Remaining', m.remaining], ['Held', m.net_held]].map(([k, v]) => (
          <div key={k} className="card" style={{ padding: '10px 14px', minWidth: 130 }}><div style={{ fontSize: 11, color: '#64748b' }}>{k}</div><div style={{ fontWeight: 800 }}>{money(v)}</div></div>
        ))}
      </div>

      <div className="card" style={{ padding: 14 }}>
        <strong>Prepare</strong>
        <div style={{ display: 'flex', gap: 8, alignItems: 'end', marginTop: 8 }}>
          <Field label="Expected commission"><Input type="number" value={prep.expected_commission} onChange={(e) => setPrep({ ...prep, expected_commission: e.target.value })} /></Field>
          <Field label="Expected fee"><Input type="number" value={prep.expected_fee} onChange={(e) => setPrep({ ...prep, expected_fee: e.target.value })} /></Field>
          <Button onClick={() => call(() => api.post(`/deals/${dealId}/settlement/prepare`, { expected_commission: prep.expected_commission, expected_fee: prep.expected_fee }), 'Prepared')}>Save expected</Button>
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <strong>Receive money</strong>
        <div style={{ display: 'flex', gap: 8, alignItems: 'end', marginTop: 8 }}>
          <Field label="Amount"><Input type="number" value={rcv.amount} onChange={(e) => setRcv({ ...rcv, amount: e.target.value })} /></Field>
          <Field label="Kind"><Select value={rcv.kind} onChange={(e) => setRcv({ ...rcv, kind: e.target.value })}><option value="commission">Commission</option><option value="fee">Fee</option></Select></Field>
          <Field label="Method"><Select value={rcv.method} onChange={(e) => setRcv({ ...rcv, method: e.target.value })}>{PAYMENT_METHODS.map((mth) => <option key={mth} value={mth}>{mth.replace('_', ' ')}</option>)}</Select></Field>
          <Button onClick={() => call(() => api.post(`/deals/${dealId}/settlement/receive`, rcv), 'Recorded')}>Record receipt</Button>
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Disbursements</strong>
          {!d.deal.settlement_approved_at && <Button onClick={() => call(() => api.post(`/deals/${dealId}/settlement/approve`), 'Approved')}>Approve settlement</Button>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'end', margin: '8px 0' }}>
          <Field label="Payee"><Input value={disb.payee_name} onChange={(e) => setDisb({ ...disb, payee_name: e.target.value })} /></Field>
          <Field label="Type"><Select value={disb.payee_type} onChange={(e) => setDisb({ ...disb, payee_type: e.target.value })}>{['agent', 'vendor', 'client_refund', 'expense', 'other'].map((t) => <option key={t}>{t}</option>)}</Select></Field>
          <Field label="Amount"><Input type="number" value={disb.amount} onChange={(e) => setDisb({ ...disb, amount: e.target.value })} /></Field>
          <Button onClick={() => call(() => api.post(`/deals/${dealId}/disbursements`, disb), 'Added')}>Add</Button>
        </div>
        <table className="tbl"><tbody>
          {(d.disbursements || []).map((x) => (
            <tr key={x.id}><td>{x.disbursement_code}</td><td>{x.payee_name || x.payee_type}</td><td style={{ textAlign: 'right' }}>{money(x.amount)}</td><td><Badge tone={x.status === 'paid' ? 'green' : 'amber'}>{x.status}</Badge></td>
              <td>{x.status !== 'paid' && <Button size="sm" onClick={() => call(() => api.post(`/deals/${dealId}/disbursements/${x.id}/pay`), 'Paid')}>Pay</Button>}</td></tr>
          ))}
        </tbody></table>
      </div>

      {s.payment === 'received' && d.deal.settlement_status !== 'settled' && (
        <Button onClick={() => call(() => api.post(`/deals/${dealId}/settle`), 'Settled')}>Mark settled</Button>
      )}
    </div>
  );
}
