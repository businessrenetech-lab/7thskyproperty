import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  X, Check, Loader2, Layers, Search, User, AlertTriangle, Clock, Wand2, Mail,
} from 'lucide-react';
import api from '../../services/api';
import { bdt, dateFmt, Pill, toast, errText } from './common';

/*
 * Bulk payment — one client, one lump sum, several invoices.
 *
 * The case this exists for is ordinary and was unserveable: an AMC client sends
 * ৳50,000 covering four months. Recording that one invoice at a time meant four
 * separate acts, four chances to fat-finger an amount, and — worse — four
 * payments on the client's statement for money they sent once.
 *
 * Two decisions shape this screen.
 *
 *   IT STARTS FROM THE CLIENT, NOT THE INVOICE. "Someone is paying, what do they
 *   owe?" is the question at the counter. An invoice-first list cannot answer it,
 *   because a client with four unpaid invoices appears four times and their total
 *   debt appears nowhere.
 *
 *   EVERY TAKA MUST BE PLACED. The allocation has to come to exactly the amount
 *   received before this will post. Money parked as an unexplained credit is how
 *   a ledger stops being trustworthy, so the screen refuses rather than inventing
 *   somewhere to put it. Oldest-first is offered as one click because that is
 *   what most businesses do — but it is offered, not imposed.
 *
 * The post itself is atomic on the server: all of the allocation lands, or none
 * of it does. A lump sum that half-applied would be worse than one that failed.
 */

const num = (v) => Number(v || 0);
const round2 = (v) => Math.round((num(v) + Number.EPSILON) * 100) / 100;
const today = () => new Date().toISOString().slice(0, 10);
const mintKey = () => `ui-bulk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/* ── who owes what ─────────────────────────────────────────────────────── */

function ClientPicker({ onPick }) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const timer = useRef(null);

  const load = useCallback((term) => {
    setLoading(true);
    api.get('/wt-invoices/collections', { params: term ? { q: term } : {} })
      .then((r) => setRows(Array.isArray(r.data) ? r.data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => load(q.trim()), 220);
    return () => clearTimeout(timer.current);
  }, [q, load]);

  return (
    <>
      <div className="wt-field">
        <label>Who is paying?</label>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: 11, color: 'var(--wt-muted)' }} />
          <input className="wt-input" style={{ paddingLeft: 34 }} autoFocus
            placeholder="Client name or code…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <span className="hint">Only clients with money outstanding are listed, most owed first.</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
        {loading && <div className="muted" style={{ padding: 20, textAlign: 'center' }}><Loader2 size={16} className="wt-spin" /> Looking…</div>}

        {!loading && rows.length === 0 && (
          <div className="muted" style={{ padding: 24, textAlign: 'center', fontSize: 13 }}>
            {q ? `No client with an outstanding balance matches “${q}”.` : 'Nothing is outstanding — every invoice is settled.'}
          </div>
        )}

        {!loading && rows.map((c) => (
          <button key={c.key} className="wt-pickrow" onClick={() => onPick(c)}>
            <span className="wt-pickrow-mark"><User size={15} /></span>
            <span style={{ flex: '1 0 0', minWidth: 0, textAlign: 'left' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <strong>{c.client_name}</strong>
                {c.client_code && <span className="muted" style={{ fontSize: 11.5 }}>{c.client_code}</span>}
                {c.overdue_count > 0 && (
                  <span className="wt-chip warn"><Clock size={11} style={{ verticalAlign: -1 }} /> {c.overdue_count} overdue</span>
                )}
              </span>
              <span className="muted" style={{ display: 'block', fontSize: 12, marginTop: 2 }}>
                {c.invoice_count} unpaid invoice{c.invoice_count === 1 ? '' : 's'}
              </span>
            </span>
            <span style={{ fontWeight: 800, whiteSpace: 'nowrap', color: 'var(--wt-red)' }}>{bdt(c.outstanding)}</span>
          </button>
        ))}
      </div>
    </>
  );
}

/* ── the modal ─────────────────────────────────────────────────────────── */

export default function BulkPaymentModal({ onClose, onDone }) {
  const [ref, setRef] = useState(null);
  const [client, setClient] = useState(null);
  const [alloc, setAlloc] = useState({});      // invoice_id -> amount as typed
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState(null);
  const key = useRef(mintKey());

  const [f, setF] = useState({
    total: '', method: 'Cash', reference: '', received_on: today(), note: '', email_receipt: true,
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    api.get('/wt-invoices/reference')
      .then((r) => setRef(r.data))
      .catch(() => setRef({ payment_methods: [{ value: 'Cash' }] }));
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  const method = useMemo(
    () => (ref?.payment_methods || []).find((m) => m.value === f.method) || { value: f.method },
    [ref, f.method],
  );

  const allocated = round2(Object.values(alloc).reduce((s, v) => s + num(v), 0));
  const unallocated = round2(num(f.total) - allocated);
  const lines = (client?.invoices || []);

  /** Oldest debt first — what most businesses do, offered rather than imposed. */
  const autoAllocate = () => {
    let left = round2(num(f.total));
    const next = {};
    // Oldest due date first; the API already returns them in that order.
    for (const inv of lines) {
      if (left <= 0.009) break;
      const take = Math.min(left, round2(num(inv.outstanding)));
      next[inv.id] = take;
      left = round2(left - take);
    }
    setAlloc(next);
    if (left > 0.009) {
      setErr(`${bdt(left)} is more than ${client.client_name} owes in total. Reduce the amount, or record the excess against a new invoice.`);
    } else { setErr(''); }
  };

  const pickClient = (c) => {
    setClient(c);
    // Pre-fill with the whole balance: settling everything is the common case.
    setF((s) => ({ ...s, total: c.outstanding }));
    setAlloc(Object.fromEntries(c.invoices.map((i) => [i.id, i.outstanding])));
  };

  const post = async () => {
    const total = num(f.total);
    if (!(total > 0)) { setErr('Enter the amount received.'); return; }
    if (Math.abs(unallocated) > 0.009) {
      setErr(unallocated > 0
        ? `${bdt(unallocated)} is still unallocated. Every taka has to be placed against an invoice before this can be recorded.`
        : `The allocation is ${bdt(Math.abs(unallocated))} more than the payment received.`);
      return;
    }
    if (method.reference_required && !f.reference.trim()) {
      setErr(`${method.reference_label || 'A reference'} is required for a ${f.method} payment.`);
      return;
    }
    if (f.received_on > today()) { setErr('A payment cannot be received in the future.'); return; }

    const allocations = Object.entries(alloc)
      .map(([invoice_id, amount]) => ({ invoice_id: Number(invoice_id), amount: num(amount) }))
      .filter((a) => a.amount > 0);
    if (!allocations.length) { setErr('Allocate the payment to at least one invoice.'); return; }

    setBusy(true); setErr('');
    try {
      const r = await api.post('/wt-invoices/payments/bulk', {
        allocations, total,
        method: f.method, reference: f.reference || null,
        received_on: f.received_on, note: f.note || null,
        email_receipt: f.email_receipt,
        idempotency_key: key.current,
      });
      setResult(r.data);
      toast.ok(r.data.message);
      onDone?.(r.data);
    } catch (e) { setErr(errText(e, 'Could not record this payment')); }
    finally { setBusy(false); }
  };

  /* ── the receipt, after posting ──────────────────────────────────────── */
  if (result) {
    return (
      <div className="wt-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="wt-modal" role="dialog" aria-modal="true" style={{ maxWidth: 640 }}>
          <div className="wt-modal-head">
            <div>
              <h3><Check size={16} style={{ verticalAlign: -3, marginRight: 6, color: 'var(--wt-green)' }} />Payment recorded</h3>
              <div className="sub">{client?.client_name} · {result.batch_ref}</div>
            </div>
            <button className="wt-modal-x" onClick={onClose}><X size={18} /></button>
          </div>
          <div className="wt-modal-body">
            <div className="wt-ctxcard">
              <div className="wt-ctxgrid">
                <span><span className="muted">Received</span><b style={{ color: 'var(--wt-green)' }}>{bdt(result.total)}</b></span>
                <span><span className="muted">Applied to</span><b>{result.applied.length} invoice{result.applied.length === 1 ? '' : 's'}</b></span>
                <span><span className="muted">Receipt emailed</span><b>{result.receipt_emailed ? 'Yes' : 'No'}</b></span>
              </div>
            </div>
            <table className="wt-tbl" style={{ marginTop: 14 }}>
              <thead><tr><th>Invoice</th><th style={{ width: 120 }}>Applied</th><th style={{ width: 120 }}>Now owing</th><th style={{ width: 110 }}>Status</th></tr></thead>
              <tbody>
                {result.applied.map((a) => (
                  <tr key={a.invoice_id}>
                    <td className="id">{a.invoice_code}</td>
                    <td style={{ fontWeight: 700, color: 'var(--wt-green)' }}>{bdt(a.amount)}</td>
                    <td style={{ color: a.outstanding > 0 ? 'var(--wt-red)' : 'var(--wt-muted)' }}>{bdt(a.outstanding)}</td>
                    <td><Pill value={a.status} sm /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
              These rows share one batch reference, so the client's statement shows a single
              payment applied across {result.applied.length} invoices — not {result.applied.length} payments.
            </p>
          </div>
          <div className="wt-modal-foot">
            <button className="wt-btn primary" style={{ marginLeft: 'auto' }} onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wt-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="wt-modal" role="dialog" aria-modal="true" style={{ maxWidth: 900 }}>
        <div className="wt-modal-head">
          <div>
            <h3><Layers size={16} style={{ verticalAlign: -3, marginRight: 6 }} />Bulk Payment</h3>
            <div className="sub">
              {client ? `${client.client_name} · ${bdt(client.outstanding)} outstanding across ${client.invoice_count} invoices`
                : 'One payment, applied across several invoices'}
            </div>
          </div>
          <button className="wt-modal-x" onClick={onClose} disabled={busy}><X size={18} /></button>
        </div>

        <div className="wt-modal-body">
          {err && <div className="wt-formerr">{err}</div>}

          {!client ? <ClientPicker onPick={pickClient} /> : (
            <>
              <div className="wt-ctxcard">
                <div className="wt-ctxcard-head">
                  <span><User size={14} /> <strong>{client.client_name}</strong>
                    {client.client_code && <span className="muted" style={{ fontSize: 11.5 }}>{client.client_code}</span>}</span>
                  <button className="wt-btn sm" onClick={() => { setClient(null); setAlloc({}); setErr(''); }}>Change client</button>
                </div>
                <div className="wt-ctxgrid">
                  <span><span className="muted">Total owed</span><b style={{ color: 'var(--wt-red)' }}>{bdt(client.outstanding)}</b></span>
                  <span><span className="muted">Invoices</span><b>{client.invoice_count}</b></span>
                  <span><span className="muted">Overdue</span><b>{client.overdue_count || 'None'}</b></span>
                </div>
              </div>

              <div className="wt-grid2" style={{ marginTop: 14 }}>
                <div className="wt-field">
                  <label>Amount received</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="wt-input" type="number" step="0.01" style={{ flex: '1 0 0' }}
                      value={f.total} onChange={(e) => set('total', e.target.value)} />
                    <button className="wt-chip" onClick={() => set('total', client.outstanding)}>Everything</button>
                  </div>
                </div>
                <div className="wt-field">
                  <label>Date received</label>
                  <input className="wt-input" type="date" max={today()} value={f.received_on}
                    onChange={(e) => set('received_on', e.target.value)} />
                </div>
              </div>

              <div className="wt-grid2">
                <div className="wt-field">
                  <label>How they paid</label>
                  <select className="wt-select" value={f.method} onChange={(e) => { set('method', e.target.value); set('reference', ''); }}>
                    {(ref?.payment_methods || []).map((m) => <option key={m.value}>{m.value}</option>)}
                  </select>
                </div>
                <div className="wt-field">
                  <label>{method.reference_label || 'Reference'}{method.reference_required ? '' : ' (optional)'}</label>
                  <input className="wt-input" value={f.reference} onChange={(e) => set('reference', e.target.value)}
                    placeholder={method.reference_label || 'What identifies this payment'} />
                  <span className="hint">One reference for the whole payment — because it was one payment.</span>
                </div>
              </div>

              {/* The allocation. */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, marginBottom: 8 }}>
                <div className="wt-sec-title" style={{ margin: 0 }}>How it is applied</div>
                <button className="wt-btn sm" style={{ marginLeft: 'auto' }} onClick={autoAllocate}>
                  <Wand2 size={13} /> Oldest first
                </button>
                <button className="wt-btn sm" onClick={() => { setAlloc({}); setErr(''); }}>Clear</button>
              </div>

              <table className="wt-tbl">
                <thead><tr>
                  <th style={{ width: 104 }}>Invoice</th><th>Type</th>
                  <th style={{ width: 104 }}>Due</th><th style={{ width: 110 }}>Owed</th>
                  <th style={{ width: 150 }}>Apply</th>
                </tr></thead>
                <tbody>
                  {lines.map((inv) => {
                    const applied = num(alloc[inv.id]);
                    const over = applied > num(inv.outstanding) + 0.009;
                    return (
                      <tr key={inv.id}>
                        <td className="id">{inv.code}</td>
                        <td className="muted">{inv.inv_type || '—'}</td>
                        <td className="muted" style={{ color: inv.days_overdue ? 'var(--wt-red)' : undefined }}>
                          {inv.due_date ? dateFmt(inv.due_date) : '—'}
                          {inv.days_overdue ? ` · ${inv.days_overdue}d` : ''}
                        </td>
                        <td style={{ fontWeight: 600 }}>{bdt(inv.outstanding)}</td>
                        <td>
                          <input className="wt-input" type="number" step="0.01" style={{
                            padding: '6px 8px', fontSize: 13,
                            borderColor: over ? 'var(--wt-red)' : undefined,
                          }}
                            value={alloc[inv.id] ?? ''} placeholder="0"
                            onChange={(e) => setAlloc((s) => ({ ...s, [inv.id]: e.target.value }))} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* The number that decides whether this can post. */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginTop: 12,
                padding: '11px 14px', borderRadius: 10,
                border: `1px solid ${Math.abs(unallocated) < 0.009 ? '#bbf7d0' : '#fcd34d'}`,
                background: Math.abs(unallocated) < 0.009 ? '#f0fdf4' : 'var(--wt-amber-bg)',
              }}>
                {Math.abs(unallocated) < 0.009
                  ? <Check size={15} style={{ color: 'var(--wt-green)' }} />
                  : <AlertTriangle size={15} style={{ color: '#b45309' }} />}
                <span style={{ fontSize: 13 }}>
                  {Math.abs(unallocated) < 0.009
                    ? <>All {bdt(f.total || 0)} is allocated across {Object.values(alloc).filter((v) => num(v) > 0).length} invoice(s).</>
                    : unallocated > 0
                      ? <><b>{bdt(unallocated)} unallocated.</b> Place it against an invoice — money with nowhere to sit is how a ledger stops being trusted.</>
                      : <><b>{bdt(Math.abs(unallocated))} over-allocated.</b> You have applied more than was received.</>}
                </span>
                <span className="muted" style={{ marginLeft: 'auto', fontSize: 12.5, whiteSpace: 'nowrap' }}>
                  {bdt(allocated)} of {bdt(f.total || 0)}
                </span>
              </div>

              <div className="wt-field" style={{ marginTop: 14 }}>
                <label>Note (optional)</label>
                <input className="wt-input" value={f.note} onChange={(e) => set('note', e.target.value)}
                  placeholder="Anything the books should remember" />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={f.email_receipt} onChange={(e) => set('email_receipt', e.target.checked)} />
                <Mail size={13} /> Email one receipt for the whole payment
              </label>
            </>
          )}
        </div>

        <div className="wt-modal-foot">
          <span className="muted" style={{ fontSize: 12, marginRight: 'auto' }}>
            {client ? 'Posts all at once — every invoice updates, or none does.' : 'Step 1 of 2 — pick the client who is paying'}
          </span>
          <button className="wt-btn" onClick={onClose} disabled={busy}>Cancel</button>
          {client && (
            <button className="wt-btn primary" onClick={post} disabled={busy || Math.abs(unallocated) > 0.009}>
              {busy ? <Loader2 size={14} className="wt-spin" /> : <Check size={14} />}
              {busy ? ' Recording…' : ` Record ${bdt(f.total || 0)}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
