import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Layers, Check, Loader2, Download, AlertTriangle, Banknote } from 'lucide-react';
import api from '../../services/api';
import { Drawer, Field, Input, Select, Textarea, Button } from '../../ui/kit';
import { useToast } from '../../context/ToastContext';
import { bdtFull } from './common';

/*
 * The owner payment run — several owners settled in one banking act.
 *
 * This is the end-of-month job: statements go out, and then somebody sits down
 * with the bank open and pays every owner at once. Doing that one dialog at a
 * time is not merely slow, it produces a false record — a dozen separate
 * payments on a dozen timestamps for what was one transfer batch, and no single
 * document to reconcile the bank line against.
 *
 * Two decisions shape it.
 *
 *   IT POSTS ATOMICALLY. Every owner lands or none does. A run that half-posts
 *   leaves the operator believing they have paid owners they have not — and
 *   owners are the people most likely to notice and least likely to forgive it.
 *
 *   STATEMENTS NOT YET SENT ARE SHOWN, NOT HIDDEN. An owner who has not received
 *   their statement should not normally be paid against it, but an operator
 *   looking for a name that is missing needs to know the system has not lost
 *   them.
 *
 * Every line gets its own numbered voucher, and the run gets one document: a
 * summary page for the bank line, then a voucher per owner.
 */

const num = (v) => Number(v || 0);
const round2 = (v) => Math.round((num(v) + Number.EPSILON) * 100) / 100;
const today = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const mintKey = () => `ui-ownrun-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export default function OwnerPaymentRunDrawer({ onClose, onDone }) {
  const toast = useToast();
  const [due, setDue] = useState(null);
  const [methods, setMethods] = useState([]);
  const [picked, setPicked] = useState({});     // statement_id -> amount as typed
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState(null);
  const key = useRef(mintKey());

  const [f, setF] = useState({ method: 'Bank Transfer', reference: '', paid_on: today(), note: '' });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    api.get('/sts-disbursements/due').then((r) => setDue(r.data))
      .catch(() => setDue({ payable: [], blocked: [], totals: {} }));
    api.get('/sts-disbursements/reference').then((r) => setMethods(r.data?.methods || []))
      .catch(() => setMethods([{ value: 'Bank Transfer', reference_required: true }]));
  }, []);

  const method = useMemo(
    () => methods.find((m) => m.value === f.method) || { value: f.method },
    [methods, f.method],
  );

  const payable = due?.payable || [];
  const blocked = due?.blocked || [];
  const total = round2(Object.values(picked).reduce((s, v) => s + num(v), 0));
  const count = Object.values(picked).filter((v) => num(v) > 0).length;

  const toggle = (l) => {
    setPicked((s) => {
      if (l.statement_id in s) { const next = { ...s }; delete next[l.statement_id]; return next; }
      return { ...s, [l.statement_id]: l.remaining };
    });
    setErr('');
  };
  const selectAll = () => setPicked(Object.fromEntries(payable.map((l) => [l.statement_id, l.remaining])));

  const openRun = (batch) => window.open(`${api.defaults.baseURL || ''}/sts-disbursements/run/${batch}/voucher`, '_blank');

  const post = async () => {
    if (!count) { setErr('Choose at least one owner to pay.'); return; }
    if (method.reference_required !== false && !f.reference.trim()) {
      setErr(`${method.reference_label || 'A reference'} is required for a ${f.method} run — it is what matches this batch to the bank statement.`);
      return;
    }
    if (f.paid_on > today()) { setErr('A payment run cannot be dated in the future.'); return; }

    const overs = payable.filter((l) => l.statement_id in picked && num(picked[l.statement_id]) > num(l.remaining) + 0.009);
    if (overs.length) {
      setErr(`${overs[0].owner_name} is only owed ${bdtFull(overs[0].remaining)} — you cannot pay more than is due on a line.`);
      return;
    }

    const lines = payable
      .filter((l) => num(picked[l.statement_id]) > 0)
      .map((l) => ({
        statement_id: l.statement_id,
        amount: num(picked[l.statement_id]),
        owner_name: l.owner_name,
        property_label: l.property_label || null,
      }));

    setBusy(true); setErr('');
    try {
      const r = await api.post('/sts-disbursements/run', {
        lines,
        method: f.method,
        reference: f.reference,
        paid_on: f.paid_on,
        note: f.note || null,
        idempotency_key: key.current,
      });
      setResult(r.data);
      toast.success(r.data.message);
      onDone?.(r.data);
    } catch (e) {
      setErr(e.response?.data?.error || e.message || 'Could not make these payments');
    } finally { setBusy(false); }
  };

  /* ── the run document, once posted ───────────────────────────────────── */
  if (result) {
    return (
      <Drawer title="Payment run complete" onClose={onClose}
        footer={<>
          <Button variant="ghost" icon={Download} onClick={() => openRun(result.batch_ref)}>Open the run document</Button>
          <Button onClick={onClose}>Done</Button>
        </>}>
        <div className="pm-card" style={{ padding: 14, marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
            <div><div className="ph">Total paid out</div><strong>{bdtFull(result.total)}</strong></div>
            <div><div className="ph">Owners paid</div><strong>{result.paid.length}</strong></div>
            <div><div className="ph">Run reference</div><strong>{result.batch_ref}</strong></div>
            <div><div className="ph">Bank reference</div><strong>{f.reference || '—'}</strong></div>
          </div>
        </div>

        <table className="pm-table">
          <thead><tr><th>Voucher</th><th>Owner</th><th style={{ textAlign: 'right' }}>Paid</th></tr></thead>
          <tbody>
            {result.paid.map((p) => (
              <tr key={p.statement_id}>
                <td>{p.voucher_no || '—'}</td>
                <td>{p.owner_name}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{bdtFull(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="ph" style={{ marginTop: 12 }}>
          One document: a summary page for the bank line, then a signed voucher for each owner.
          Every row carries the run reference, so the batch reconciles as one transfer rather than
          {' '}{result.paid.length} unrelated payments.
        </p>
      </Drawer>
    );
  }

  return (
    <Drawer title="Owner payment run" onClose={onClose} width={720}
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button icon={busy ? Loader2 : Check} onClick={post} disabled={busy || !count}>
          {busy ? 'Paying…' : `Pay ${bdtFull(total)}`}
        </Button>
      </>}>
      {err && <div className="pm-alert bad" style={{ marginBottom: 12 }}>{err}</div>}

      <Field label="How the run is paid">
        <Select value={f.method} onChange={(e) => { set('method', e.target.value); set('reference', ''); }}>
          {methods.map((m) => <option key={m.value}>{m.value}</option>)}
        </Select>
      </Field>
      <Field label={method.reference_label || 'Reference'}>
        <Input value={f.reference} onChange={(e) => set('reference', e.target.value)}
          placeholder="The batch / slip number" />
        <span className="ph">One reference for the whole run — because it is one payment out of the account.</span>
      </Field>
      <Field label="Paid on">
        <Input type="date" max={today()} value={f.paid_on} onChange={(e) => set('paid_on', e.target.value)} />
      </Field>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 8px' }}>
        <strong style={{ fontSize: 13 }}>Owners owed money</strong>
        <button type="button" className="pm-btn" style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: 12 }}
          onClick={selectAll}>Select all</button>
        <button type="button" className="pm-btn" style={{ padding: '4px 10px', fontSize: 12 }}
          onClick={() => { setPicked({}); setErr(''); }}>Clear</button>
      </div>

      {!due && <p className="ph">Loading…</p>}
      {due && payable.length === 0 && (
        <p className="ph">Nothing is waiting to be paid. Generate and send statements first.</p>
      )}

      {payable.length > 0 && (
        <table className="pm-table">
          <thead><tr>
            <th style={{ width: 32 }} /><th>Owner</th><th>Period</th>
            <th style={{ textAlign: 'right' }}>Owed</th><th style={{ width: 120 }}>Pay</th>
          </tr></thead>
          <tbody>
            {payable.map((l) => {
              const on = l.statement_id in picked;
              return (
                <tr key={l.statement_id}>
                  <td><input type="checkbox" checked={on} onChange={() => toggle(l)} /></td>
                  <td>
                    <strong>{l.owner_name}</strong>
                    <div className="ph">{l.statement_code}</div>
                  </td>
                  <td className="ph">{l.period_label || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {bdtFull(l.remaining)}
                    {num(l.paid) > 0 && <div className="ph">{bdtFull(l.paid)} already paid</div>}
                  </td>
                  <td>
                    <Input type="number" step="0.01" disabled={!on}
                      value={on ? picked[l.statement_id] : ''} placeholder="—"
                      onChange={(e) => setPicked((s) => ({ ...s, [l.statement_id]: e.target.value }))} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Shown rather than hidden: an operator looking for an owner who is not
          on the list needs to know the system has not lost them. */}
      {blocked.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <strong style={{ fontSize: 13 }}>Not ready to pay</strong>
          {blocked.map((l) => (
            <div key={l.statement_id} className="pm-alert warn" style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 12.5 }}>
                <b>{l.owner_name}</b> · {bdtFull(l.remaining)} — {l.blocked_reason}.
              </span>
            </div>
          ))}
          <p className="ph" style={{ marginTop: 6 }}>
            Send the statement first, so the owner has the figures before the money arrives.
          </p>
        </div>
      )}

      <Field label="Note for the run (optional)" style={{ marginTop: 14 }}>
        <Textarea rows={2} value={f.note} onChange={(e) => set('note', e.target.value)} />
      </Field>

      <div className="pm-card" style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', marginTop: 12,
      }}>
        <Banknote size={15} />
        <span style={{ fontSize: 13 }}>
          {count
            ? <>Paying <b>{count}</b> owner{count === 1 ? '' : 's'} in one act. All of it lands, or none of it does.</>
            : 'Tick the owners to include in this run.'}
        </span>
        <strong style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>{bdtFull(total)}</strong>
      </div>

      <p className="ph" style={{ marginTop: 10 }}>A numbered voucher is issued for every owner in the run.</p>
    </Drawer>
  );
}
