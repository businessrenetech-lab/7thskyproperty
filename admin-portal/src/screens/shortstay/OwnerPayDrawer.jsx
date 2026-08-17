import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Banknote, Check, Loader2, Download, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import { Drawer, Field, Input, Select, Textarea, Button } from '../../ui/kit';
import { useToast } from '../../context/ToastContext';
import { bdtFull } from './common';

/*
 * Pay one owner what their statement says they are owed.
 *
 * This replaces a status flip. Marking a statement "paid" used to stamp three
 * columns and move it along an enum — no document for the owner, no way to undo
 * a mistake, and nothing in any journal. What it produced was a note that money
 * had moved, which is not the same as a record of the movement.
 *
 * Three things here are the point, and each mirrors the provider payout flow:
 *
 *   THE AMOUNT COMES FROM THE STATEMENT, not from a box someone types into. An
 *   operator keying a figure is how an owner is underpaid by a digit; the
 *   statement is the calculation everybody already agreed. A part payment is
 *   allowed and checked against what remains, so the same statement cannot be
 *   paid twice over.
 *
 *   NEVER TWICE. A key is minted when the drawer opens and sent with the
 *   request, so a double-click, a slow network and a hit of Retry all resolve to
 *   one payment. The server says whether it posted or replayed, and this reports
 *   honestly either way.
 *
 *   A NUMBERED VOUCHER comes out — the document the owner signs and the first
 *   thing an auditor asks for.
 *
 * It is a Drawer rather than a centred modal because that is what the other nine
 * dialogs in this module are: focus-trapped, Escape-closing, already familiar.
 * Consistency inside the module beats matching another module's chrome.
 */

const num = (v) => Number(v || 0);
const today = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const mintKey = () => `ui-own-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export default function OwnerPayDrawer({ line, onClose, onDone }) {
  const toast = useToast();
  const [methods, setMethods] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);
  const key = useRef(mintKey());

  const remaining = num(line.remaining);
  const [f, setF] = useState({
    amount: remaining,
    method: 'Bank Transfer',
    reference: '',
    paid_on: today(),
    note: '',
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    api.get('/sts-disbursements/reference')
      .then((r) => setMethods(r.data?.methods || []))
      .catch(() => setMethods([{ value: 'Bank Transfer', reference_required: true }]));
  }, []);

  const method = useMemo(
    () => methods.find((m) => m.value === f.method) || { value: f.method },
    [methods, f.method],
  );

  const openVoucher = (code) => window.open(`${api.defaults.baseURL || ''}/sts-disbursements/${code}/voucher`, '_blank');

  const submit = async (e) => {
    e?.preventDefault();
    const amount = num(f.amount);
    if (!(amount > 0)) { setErr('Enter an amount greater than zero.'); return; }
    if (amount > remaining + 0.009) { setErr(`That is more than the ${bdtFull(remaining)} still owed on this statement.`); return; }
    if (method.reference_required !== false && !f.reference.trim()) {
      setErr(`${method.reference_label || 'A reference'} is required — it is what matches this voucher to the bank statement.`);
      return;
    }
    if (f.paid_on > today()) { setErr('A payment cannot be dated in the future.'); return; }

    setBusy(true); setErr('');
    try {
      const r = await api.post(`/sts-disbursements/${line.statement_id}/pay`, {
        amount,
        method: f.method,
        reference: f.reference,
        paid_on: f.paid_on,
        note: f.note || null,
        owner_name: line.owner_name,
        property_label: line.property_label || null,
        idempotency_key: key.current,
      });
      setDone(r.data);
      key.current = mintKey();
      toast[r.data.duplicate ? 'error' : 'success'](r.data.message);
      onDone?.();
    } catch (e2) {
      setErr(e2.response?.data?.error || e2.message || 'Could not record this payment');
    } finally { setBusy(false); }
  };

  /* ── the voucher, once paid ──────────────────────────────────────────── */
  if (done) {
    const v = done.disbursement || {};
    return (
      <Drawer title="Payment recorded" onClose={onClose}
        footer={<>
          {v.voucher_no && (
            <Button variant="ghost" icon={Download} onClick={() => openVoucher(v.voucher_no)}>Open voucher</Button>
          )}
          <Button onClick={onClose}>Done</Button>
        </>}>
        <div className="pm-card" style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
            <div><div className="ph">Voucher</div><strong>{v.voucher_no || '—'}</strong></div>
            <div><div className="ph">Paid to</div><strong>{v.owner_name || line.owner_name}</strong></div>
            <div><div className="ph">Amount</div><strong>{bdtFull(v.amount)}</strong></div>
            <div><div className="ph">Statement</div><strong>{v.statement_code || line.statement_code}</strong></div>
          </div>
        </div>
        <p className="ph" style={{ marginTop: 14 }}>
          {done.settled
            ? 'The statement is settled in full.'
            : `${bdtFull(done.remaining)} is still owing on this statement — it stays on the payable list.`}
        </p>
        <p className="ph" style={{ marginTop: 8 }}>
          The voucher carries the amount in words and three signature blocks — prepared, approved and
          received. Print it for the owner to sign.
        </p>
      </Drawer>
    );
  }

  return (
    <Drawer title={`Pay ${line.owner_name}`} onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button icon={busy ? Loader2 : Banknote} onClick={submit} disabled={busy}>
          {busy ? 'Recording…' : `Pay ${bdtFull(f.amount || 0)}`}
        </Button>
      </>}>
      <form onSubmit={submit}>
        {err && <div className="pm-alert bad" style={{ marginBottom: 12 }}>{err}</div>}

        {/* What the statement says. Facts, not inputs. */}
        <div className="pm-card" style={{ padding: 14, marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
            <div><div className="ph">Statement</div><strong>{line.statement_code}</strong></div>
            <div><div className="ph">Period</div><strong>{line.period_label || '—'}</strong></div>
            <div><div className="ph">Booking revenue</div><strong>{bdtFull(line.revenue)}</strong></div>
            <div><div className="ph">Fees &amp; deductions</div><strong>− {bdtFull(num(line.fees) + num(line.deductions))}</strong></div>
            <div><div className="ph">Owner is owed</div><strong>{bdtFull(line.due)}</strong></div>
            <div>
              <div className="ph">Already paid</div>
              <strong>{num(line.paid) > 0 ? bdtFull(line.paid) : '—'}</strong>
            </div>
          </div>
        </div>

        {num(line.paid) > 0 && (
          <div className="pm-alert warn" style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              {bdtFull(line.paid)} has already been paid against this statement.
              {' '}{bdtFull(remaining)} remains.
            </span>
          </div>
        )}

        <Field label="Amount to pay">
          <Input type="number" step="0.01" value={f.amount} onChange={(e) => set('amount', e.target.value)} />
          <span className="ph">
            {num(f.amount) >= remaining - 0.009
              ? 'Settles this statement in full.'
              : `Leaves ${bdtFull(remaining - num(f.amount))} outstanding — the statement stays payable.`}
          </span>
        </Field>

        <Field label="How it was paid">
          <Select value={f.method} onChange={(e) => { set('method', e.target.value); set('reference', ''); }}>
            {methods.map((m) => <option key={m.value}>{m.value}</option>)}
          </Select>
        </Field>

        <Field label={method.reference_label || 'Reference'}>
          <Input value={f.reference} onChange={(e) => set('reference', e.target.value)}
            placeholder={method.reference_label || 'What the bank statement will show'} />
          <span className="ph">{method.reference_hint || 'What you would quote if this payment had to be traced.'}</span>
        </Field>

        <Field label="Paid on">
          <Input type="date" max={today()} value={f.paid_on} onChange={(e) => set('paid_on', e.target.value)} />
        </Field>

        <Field label="Note for the voucher (optional)">
          <Textarea rows={2} value={f.note} onChange={(e) => set('note', e.target.value)} />
        </Field>

        <p className="ph">A numbered voucher is issued the moment this is recorded.</p>
      </form>
    </Drawer>
  );
}
