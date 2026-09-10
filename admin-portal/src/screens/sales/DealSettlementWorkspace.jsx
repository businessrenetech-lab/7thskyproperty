// admin-portal/src/screens/sales/DealSettlementWorkspace.jsx
//
// Mount point: embedded inside the existing deal detail Drawer in
// admin-portal/src/screens/DealsBoard.jsx (the drawer opened by clicking a
// deal row). `dealId` is the only prop passed down — everything else this
// workspace needs (the sales transaction id, the settlement id, the
// property id) is read from the responses below, not from new props.
//
// This workspace drives the EXISTING /sales trust-settlement engine — it no
// longer writes through the interim /deals money endpoints
// (/deals/:id/settlement/*, /deals/:id/disbursements*, /deals/:id/settle).
// It reads its picture from GET /deals/:id/sales-picture (added in Task 1)
// and, once a settlement exists, hydrates the real settlement lines /
// disbursements / transaction parties it needs for its forms from
// GET /sales/properties/:propertyId (the same read SalesPropertyFile.jsx
// uses) plus GET /sales/settlements/:sid/statement for the money totals.
//
// IMPORTANT: the read-model's `badges.payment` / `badges.payout` are always
// null (SaleSettlement has no such columns — see Task 1's report). The
// Payment / Payout badges below are derived here from the statement's
// totals (receipts vs purchase price, disbursed vs outgoing obligations),
// not from those null fields.
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button, Field, Input, Select, Spinner, Badge, EmptyState } from '../../ui/kit';

const money = (v) => 'BDT ' + Number(v || 0).toLocaleString();
const unwrap = (res) => res?.data?.data ?? res?.data ?? {};
const label = (s) => (s == null || s === '' ? '—' : String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));

const STATUS_TONE = {
  none: 'grey', draft: 'grey', drafted: 'amber', sent: 'amber', submitted: 'amber', reviewed: 'amber',
  pending: 'amber', prepared: 'amber', processing: 'amber', partial: 'amber', in_progress: 'amber', returned: 'red', failed: 'red',
  signed: 'green', approved: 'green', received: 'green', disbursed: 'green', locked: 'green', paid: 'green',
  cancelled: 'grey',
};

// payments.method ENUM on the backend — keep in sync with server/models/SalesModels.
const PAYMENT_METHODS = ['cash', 'bank_transfer', 'bkash', 'nagad', 'card', 'cheque', 'sslcommerz', 'other'];
// sale_settlement_lines.line_type values that are agency commission/marketing fees
// (agencyFees.service.AGENCY_LINE_TYPES) — these are the ones editFeeLine allows.
const AGENCY_LINE_TYPES = ['commission', 'advertising'];
// sale_settlement_lines.line_type values a payout can be raised against
// (mirrors PAYOUT_LINE_TYPES in SalesPropertyFile.jsx).
const PAYOUT_LINE_TYPES = ['buyer_refund', 'commission', 'agency_fee', 'advertising', 'admin_fee', 'vat_tax', 'legal_fee', 'registration_fee', 'lender_payoff', 'rates_adjustment', 'utility_adjustment', 'third_party', 'vendor_proceeds', 'rounding'];
// Settlement lifecycle — mirrors backend/utils/salesSettlementCalculations.js TRANSITIONS.
const LIFECYCLE_ACTIONS = [
  { key: 'submit', label: 'Submit', from: ['draft', 'returned'], done: 'Settlement submitted' },
  { key: 'review', label: 'Mark reviewed', from: ['submitted'], done: 'Settlement reviewed' },
  { key: 'approve', label: 'Approve', from: ['reviewed'], done: 'Settlement approved' },
];

// Payment/payout badges from the read-model are always null (no such columns
// on SaleSettlement) — derive a display state from the statement totals instead.
function derivePaymentState(totals) {
  if (!totals) return 'none';
  const receipts = Number(totals.receipts || 0);
  const price = Number(totals.purchase_price || 0);
  if (receipts <= 0) return Number(totals.pending_receipts || 0) > 0 ? 'pending' : 'none';
  if (price > 0 && receipts >= price) return 'received';
  return 'partial';
}
function derivePayoutState(totals) {
  if (!totals) return 'none';
  const obligations = Number(totals.outgoing_obligations || 0);
  const disbursed = Number(totals.disbursed || 0);
  if (obligations > 0 && disbursed >= obligations) return 'disbursed';
  if (disbursed > 0 || Number(totals.pending_disbursements || 0) > 0) return 'in_progress';
  return 'none';
}

export default function DealSettlementWorkspace({ dealId }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [picture, setPicture] = useState(null);
  const [propertyId, setPropertyId] = useState(null);
  const [salesFile, setSalesFile] = useState(null);
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [rcv, setRcv] = useState({ transaction_party_id: '', amount: '', reference: '', method: 'bank_transfer' });
  const [payout, setPayout] = useState({ settlement_line_id: '', amount: '', reference: '' });
  const [editing, setEditing] = useState(null); // { id, amount, edit_reason }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pictureRes = await api.get(`/deals/${dealId}/sales-picture`);
      const pic = pictureRes.data?.data || null;
      setPicture(pic);

      // Property id for the "open the sales file" link. Present on the
      // transaction once linked; otherwise fall back to the deal's own
      // property (read-only lookup — not a /deals money endpoint).
      let propId = pic?.transaction?.property_id || null;
      if (!propId) {
        try {
          const dealRes = await api.get(`/deals/${dealId}`);
          propId = dealRes.data?.data?.Property?.id || dealRes.data?.data?.property_id || null;
        } catch { /* the empty-state link just won't render */ }
      }
      setPropertyId(propId);

      if (pic?.settlement && propId) {
        const [fileRes, stmtRes] = await Promise.allSettled([
          api.get(`/sales/properties/${propId}`),
          api.get(`/sales/settlements/${pic.settlement.id}/statement`),
        ]);
        setSalesFile(fileRes.status === 'fulfilled' ? unwrap(fileRes.value) : null);
        setStatement(stmtRes.status === 'fulfilled' ? unwrap(stmtRes.value) : null);
      } else {
        setSalesFile(null);
        setStatement(null);
      }
    } catch (e) {
      toast.error(e.response?.data?.error || 'Could not load the sales picture');
      setPicture(null);
    } finally {
      setLoading(false);
    }
  }, [dealId, toast]);
  useEffect(() => { load(); }, [load]);

  const call = async (fn, ok) => {
    setBusy(true);
    try {
      const res = await fn();
      toast.success(res?.data?.message || ok);
      await load();
      return true;
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;
  if (!picture) return <div className="card" style={{ padding: 14 }}>Could not load the sales picture.</div>;

  // ---------------------------------------------------------------- linked:false
  if (!picture.linked) {
    return (
      <EmptyState
        title="Accept an offer to open the sales transaction"
        sub={picture.next_action?.label || 'This deal has no linked sales transaction yet — accept a buyer offer on the property to open one.'}
        action={propertyId ? <Button variant="ghost" onClick={() => navigate(`/sales/property/${propertyId}`)}>Open property sales file</Button> : null}
      />
    );
  }

  const tx = picture.transaction;

  // ---------------------------------------------------------- linked, no settlement
  if (!picture.settlement) {
    return (
      <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div><strong>Sales transaction</strong> · <Badge tone={STATUS_TONE[tx?.status] || 'grey'}>{label(tx?.status)}</Badge></div>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>{picture.next_action?.label || 'No settlement statement has been opened yet.'}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button disabled={busy} onClick={() => call(() => api.post(`/sales/transactions/${tx.id}/settlement`, {}), 'Settlement opened')}>Open settlement</Button>
          {propertyId && <Button variant="ghost" onClick={() => navigate(`/sales/property/${propertyId}`)}>Open property sales file</Button>}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- has a settlement
  const settlement = picture.settlement;
  const sid = settlement.id;
  const totals = statement?.totals || null;
  const badges = picture.badges || {};
  const paymentState = derivePaymentState(totals);
  const payoutState = derivePayoutState(totals);

  const lines = salesFile?.settlement?.lines || [];
  const disbursements = salesFile?.settlement?.disbursements || [];
  const parties = salesFile?.transaction?.parties || salesFile?.active_transaction?.parties || [];
  const buyerParties = parties.filter((p) => p.party_type === 'buyer' && p.status === 'active');
  const partyName = (id) => parties.find((p) => Number(p.id) === Number(id))?.snapshot_name;
  const detailUnavailable = Boolean(picture.settlement) && !salesFile;

  const feeLines = lines.filter((l) => AGENCY_LINE_TYPES.includes(l.line_type));
  const remainingForLine = (line) => Math.max(0, Number(line.amount || 0) - disbursements
    .filter((d) => d.status !== 'cancelled' && Number(d.settlement_line_id) === Number(line.id))
    .reduce((s, d) => s + Number(d.amount || 0), 0));
  const payoutLines = lines.filter((l) => PAYOUT_LINE_TYPES.includes(l.line_type) && remainingForLine(l) > 0);
  const editableFees = ['draft', 'returned'].includes(settlement.status);

  const startEditFee = (line) => setEditing({ id: line.id, amount: line.amount, edit_reason: '' });
  const saveEditFee = () => {
    const reason = String(editing.edit_reason || '').trim();
    if (!reason) { toast.error('A reason is required to change an agreed fee — it is printed on the vendor invoice'); return; }
    // Backend field is `edit_reason` (PATCH /settlement-lines/:id/fee), not `reason`.
    call(() => api.patch(`/sales/settlement-lines/${editing.id}/fee`, { amount: editing.amount, edit_reason: reason }), 'Fee updated')
      .then((ok) => { if (ok) setEditing(null); });
  };

  const submitReceipt = () => {
    if (!rcv.transaction_party_id) { toast.error('Select the buyer'); return; }
    if (!rcv.amount || Number(rcv.amount) <= 0) { toast.error('Enter a positive amount'); return; }
    if (!rcv.reference.trim()) { toast.error('A reference is required'); return; }
    call(() => api.post(`/sales/settlements/${sid}/payments`, {
      direction: 'incoming', payment_kind: 'buyer_receipt', status: 'cleared',
      amount: rcv.amount, reference: rcv.reference, method: rcv.method,
      transaction_party_id: rcv.transaction_party_id, payment_at: new Date().toISOString(),
    }), 'Receipt recorded').then((ok) => { if (ok) setRcv({ transaction_party_id: '', amount: '', reference: '', method: 'bank_transfer' }); });
  };

  const submitPayout = () => {
    const line = lines.find((l) => Number(l.id) === Number(payout.settlement_line_id));
    if (!line) { toast.error('Select an obligation to pay out'); return; }
    const payload = { settlement_line_id: line.id, amount: payout.amount || remainingForLine(line), reference: payout.reference || undefined };
    if (line.line_type === 'vendor_proceeds') { payload.payee_type = 'vendor'; payload.transaction_party_id = line.payee_transaction_party_id; }
    else if (['commission', 'advertising', 'agency_fee', 'admin_fee'].includes(line.line_type)) { payload.payee_type = 'agency'; }
    else if (line.line_type === 'buyer_refund') { payload.payee_type = 'third_party'; payload.transaction_party_id = line.payee_transaction_party_id; }
    else { payload.payee_type = 'third_party'; payload.contact_id = line.payee_contact_id || undefined; }
    call(() => api.post(`/sales/settlements/${sid}/disbursements`, payload), 'Payout created')
      .then((ok) => { if (ok) setPayout({ settlement_line_id: '', amount: '', reference: '' }); });
  };

  const payOut = (d) => {
    // payDisbursement requires an existing cleared + trust-bank-reconciled
    // outgoing SalePayment id to allocate — that reconciliation flow lives
    // in the full Sales Property File (bank statement import + match).
    const paymentId = window.prompt('Enter the cleared & reconciled outgoing payment ID to allocate to this payout (reconcile it in the full Sales Property File first):');
    if (!paymentId) return;
    call(() => api.post(`/sales/disbursements/${d.id}/pay`, { payment_id: Number(paymentId) }), 'Payout marked paid');
  };

  const cancelPayout = (d) => {
    const reason = window.prompt('Reason for cancelling this payout:');
    if (!reason || !reason.trim()) return;
    call(() => api.post(`/sales/disbursements/${d.id}/cancel`, { reason: reason.trim() }), 'Payout cancelled');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[['Contract', badges.contract], ['Settlement', settlement.status], ['Payment', paymentState], ['Payout', payoutState]].map(([k, v]) => (
          <div key={k} className="card" style={{ padding: '8px 12px' }}>
            <div style={{ fontSize: 11, color: '#64748b' }}>{k}</div>
            <Badge tone={STATUS_TONE[v] || 'grey'}>{label(v)}</Badge>
          </div>
        ))}
      </div>

      {picture.next_action && <div className="card" style={{ padding: 12, borderLeft: '3px solid #0284c7' }}><strong>Next:</strong> {picture.next_action.label}</div>}
      {detailUnavailable && <div className="card" style={{ padding: 12, borderLeft: '3px solid #f59e0b' }}>Could not load settlement line/payout detail — some actions below may be limited. <Button variant="ghost" size="sm" onClick={load}>Retry</Button></div>}
      {propertyId && <Button variant="ghost" size="sm" onClick={() => navigate(`/sales/property/${propertyId}`)}>Open full sales file →</Button>}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          ['Agreed fees', picture.money?.drafted_fees?.total_amount],
          ['Receipts', totals?.receipts],
          ['Disbursed', totals?.disbursed],
          ['Outstanding', totals?.unpaid_obligations],
          ['Funds held', totals?.funds_held],
        ].map(([k, v]) => (
          <div key={k} className="card" style={{ padding: '10px 14px', minWidth: 130 }}>
            <div style={{ fontSize: 11, color: '#64748b' }}>{k}</div>
            <div style={{ fontWeight: 800 }}>{money(v)}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 14 }}>
        <strong>Agency fees</strong>
        {picture.money?.drafted_fees?.terms && <p style={{ margin: '4px 0 10px', fontSize: 12, color: '#64748b' }}>{picture.money.drafted_fees.terms}</p>}
        {!feeLines.length ? (
          <p style={{ fontSize: 13, color: '#64748b' }}>No settlement fee lines loaded yet.</p>
        ) : (
          <table className="tbl"><tbody>
            {feeLines.map((l) => (
              <tr key={l.id}>
                <td>{label(l.line_type)}</td>
                <td style={{ textAlign: 'right' }}>{money(l.amount)}</td>
                <td>{editableFees && <Button size="sm" variant="ghost" onClick={() => startEditFee(l)}>Edit</Button>}</td>
              </tr>
            ))}
          </tbody></table>
        )}
        {editing && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'end', marginTop: 10, flexWrap: 'wrap' }}>
            <Field label="New amount"><Input type="number" value={editing.amount} onChange={(e) => setEditing({ ...editing, amount: e.target.value })} /></Field>
            <Field label="Reason (required)"><Input value={editing.edit_reason} onChange={(e) => setEditing({ ...editing, edit_reason: e.target.value })} /></Field>
            <Button disabled={busy} onClick={saveEditFee}>Save</Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        )}
        {editableFees && feeLines.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => call(() => api.post(`/sales/settlements/${sid}/vendor-invoice`, {}), 'Vendor invoice issued')}>Issue vendor invoice</Button>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 14 }}>
        <strong>Receive buyer money</strong>
        <div style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap', marginTop: 8 }}>
          <Field label="Buyer">
            <Select value={rcv.transaction_party_id} onChange={(e) => setRcv({ ...rcv, transaction_party_id: e.target.value })}>
              <option value="">Select buyer…</option>
              {buyerParties.map((p) => <option key={p.id} value={p.id}>{p.snapshot_name}</option>)}
            </Select>
          </Field>
          <Field label="Amount"><Input type="number" value={rcv.amount} onChange={(e) => setRcv({ ...rcv, amount: e.target.value })} /></Field>
          <Field label="Reference"><Input value={rcv.reference} onChange={(e) => setRcv({ ...rcv, reference: e.target.value })} /></Field>
          <Field label="Method">
            <Select value={rcv.method} onChange={(e) => setRcv({ ...rcv, method: e.target.value })}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{label(m)}</option>)}
            </Select>
          </Field>
          <Button disabled={busy || settlement.status === 'locked'} onClick={submitReceipt}>Record receipt</Button>
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <strong>Payouts</strong>
        {editableFees && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap', margin: '8px 0' }}>
            <Field label="Obligation">
              <Select
                value={payout.settlement_line_id}
                onChange={(e) => {
                  const line = lines.find((l) => Number(l.id) === Number(e.target.value));
                  setPayout({ ...payout, settlement_line_id: e.target.value, amount: line ? remainingForLine(line) : '' });
                }}
              >
                <option value="">Select…</option>
                {payoutLines.map((l) => <option key={l.id} value={l.id}>{label(l.line_type)} — {money(remainingForLine(l))} remaining</option>)}
              </Select>
            </Field>
            <Field label="Amount"><Input type="number" value={payout.amount} onChange={(e) => setPayout({ ...payout, amount: e.target.value })} /></Field>
            <Field label="Reference"><Input value={payout.reference} onChange={(e) => setPayout({ ...payout, reference: e.target.value })} /></Field>
            <Button disabled={busy} onClick={submitPayout}>Create payout</Button>
          </div>
        )}
        <table className="tbl"><tbody>
          {disbursements.map((d) => (
            <tr key={d.id}>
              <td>{d.reference || `#${d.id}`}</td>
              <td>{['vendor', 'third_party'].includes(d.payee_type) ? (partyName(d.transaction_party_id) || label(d.payee_type)) : label(d.payee_type)}</td>
              <td style={{ textAlign: 'right' }}>{money(d.amount)}</td>
              <td><Badge tone={STATUS_TONE[d.status] || 'grey'}>{label(d.status)}</Badge></td>
              <td>
                {settlement.status === 'approved' && !['paid', 'cancelled'].includes(d.status) && <Button size="sm" disabled={busy} onClick={() => payOut(d)}>Pay</Button>}
                {editableFees && ['pending', 'prepared', 'failed'].includes(d.status) && <Button size="sm" variant="ghost" disabled={busy} onClick={() => cancelPayout(d)}>Cancel</Button>}
              </td>
            </tr>
          ))}
          {!disbursements.length && <tr><td colSpan={5} style={{ color: '#64748b', fontSize: 13 }}>No payouts yet.</td></tr>}
        </tbody></table>
      </div>

      <div className="card" style={{ padding: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <strong style={{ marginRight: 8 }}>Settlement lifecycle</strong>
        {LIFECYCLE_ACTIONS.filter((a) => a.from.includes(settlement.status)).map((a) => (
          <Button key={a.key} disabled={busy} onClick={() => call(() => api.post(`/sales/settlements/${sid}/${a.key}`, {}), a.done)}>{a.label}</Button>
        ))}
        {!LIFECYCLE_ACTIONS.some((a) => a.from.includes(settlement.status)) && <span style={{ fontSize: 13, color: '#64748b' }}>No lifecycle action available while {label(settlement.status)}.</span>}
      </div>
    </div>
  );
}
