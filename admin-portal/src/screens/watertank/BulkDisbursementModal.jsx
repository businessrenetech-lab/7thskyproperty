import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X, Check, Loader2, Layers, Truck, Building2, AlertTriangle, Download, Banknote,
} from 'lucide-react';
import api from '../../services/api';
import { bdt, toast, errText } from './common';

/*
 * Payment run — several disbursements settled in one banking act.
 *
 * This is the Thursday afternoon job: the accounts person sits down with the
 * bank open and pays everybody who is owed money. Doing that one dialog at a
 * time is not merely slow, it produces a false record — four separate payments
 * on four separate dates for what was one transfer batch, and no single document
 * to reconcile the bank line against.
 *
 * Two decisions shape it.
 *
 *   PROVIDER FEES AND DIRECT COSTS IN ONE LIST. A payment run does not care
 *   whether a line is a contractor's fee or a hardware bill; it cares who is
 *   owed money today. They are visually distinguished but selected together.
 *
 *   BLOCKED LINES ARE SHOWN, NOT HIDDEN. A payout the signed agreement will not
 *   allow yet is the thing most likely to be looked for, and a list that quietly
 *   omits it invites the operator to conclude the system has lost it.
 *
 * The post is atomic: every line lands or none does. A run that half-posts is
 * the most expensive failure available here — the operator believes they have
 * paid people they have not, and nothing on screen says otherwise.
 */

const num = (v) => Number(v || 0);
const round2 = (v) => Math.round((num(v) + Number.EPSILON) * 100) / 100;
const today = () => new Date().toISOString().slice(0, 10);
const mintKey = () => `ui-run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const keyOf = (l) => `${l.kind}:${l.id}`;

export default function BulkDisbursementModal({ onClose, onDone }) {
  const [ref, setRef] = useState(null);
  const [due, setDue] = useState(null);
  const [picked, setPicked] = useState({});   // key -> amount as typed
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState(null);
  const key = useRef(mintKey());

  const [f, setF] = useState({ method: 'Bank Transfer', reference: '', paid_on: today(), note: '' });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    api.get('/wt-disbursements/reference').then((r) => setRef(r.data))
      .catch(() => setRef({ methods: [{ value: 'Bank Transfer' }] }));
    api.get('/wt-disbursements/due').then((r) => setDue(r.data))
      .catch(() => setDue({ provider: [], provider_blocked: [], direct: [] }));
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  const method = useMemo(
    () => (ref?.methods || []).find((m) => m.value === f.method) || { value: f.method },
    [ref, f.method],
  );

  const payable = useMemo(() => [...(due?.provider || []), ...(due?.direct || [])], [due]);
  const blocked = due?.provider_blocked || [];

  const total = round2(Object.values(picked).reduce((s, v) => s + num(v), 0));
  const count = Object.values(picked).filter((v) => num(v) > 0).length;

  const toggle = (l) => {
    setPicked((s) => {
      const k = keyOf(l);
      if (k in s) { const next = { ...s }; delete next[k]; return next; }
      return { ...s, [k]: l.amount };
    });
    setErr('');
  };
  const selectAll = () => setPicked(Object.fromEntries(payable.map((l) => [keyOf(l), l.amount])));

  const post = async () => {
    if (!count) { setErr('Choose at least one payment to make.'); return; }
    if (method.reference_required && !f.reference.trim()) {
      setErr(`${method.reference_label || 'A reference'} is required for a ${f.method} run — it is what matches this batch to the bank statement.`);
      return;
    }
    if (f.paid_on > today()) { setErr('A payment run cannot be dated in the future.'); return; }

    const overs = payable.filter((l) => keyOf(l) in picked && num(picked[keyOf(l)]) > num(l.amount) + 0.009);
    if (overs.length) { setErr(`${overs[0].payee} is only owed ${bdt(overs[0].amount)} — you cannot pay more than is due on a line.`); return; }

    const lines = payable
      .filter((l) => num(picked[keyOf(l)]) > 0)
      .map((l) => ({ kind: l.kind, id: l.id, amount: num(picked[keyOf(l)]) }));

    setBusy(true); setErr('');
    try {
      const r = await api.post('/wt-disbursements/run', {
        lines, method: f.method, reference: f.reference || null,
        paid_on: f.paid_on, note: f.note || null, idempotency_key: key.current,
      });
      setResult(r.data);
      toast.ok(r.data.message);
      onDone?.(r.data);
    } catch (e) { setErr(errText(e, 'Could not make these payments')); }
    finally { setBusy(false); }
  };

  const openRun = (batch) => window.open(`${api.defaults.baseURL || ''}/wt-disbursements/run/${batch}/voucher`, '_blank');

  /* ── the run document, once posted ───────────────────────────────────── */
  if (result) {
    return (
      <div className="wt-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="wt-modal" role="dialog" aria-modal="true" style={{ maxWidth: 660 }}>
          <div className="wt-modal-head">
            <div>
              <h3><Check size={16} style={{ verticalAlign: -3, marginRight: 6, color: 'var(--wt-green)' }} />Payment run complete</h3>
              <div className="sub">{result.batch_ref} · {result.paid.length} payment{result.paid.length === 1 ? '' : 's'}</div>
            </div>
            <button className="wt-modal-x" onClick={onClose}><X size={18} /></button>
          </div>
          <div className="wt-modal-body">
            <div className="wt-ctxcard">
              <div className="wt-ctxgrid">
                <span><span className="muted">Total paid out</span><b style={{ color: 'var(--wt-red)' }}>{bdt(result.total)}</b></span>
                <span><span className="muted">Vouchers issued</span><b>{result.vouchers?.length || 0}</b></span>
                <span><span className="muted">Reference</span><b>{f.reference || '—'}</b></span>
              </div>
            </div>
            <table className="wt-tbl" style={{ marginTop: 14 }}>
              <thead><tr><th style={{ width: 92 }}>Voucher</th><th>Paid to</th><th style={{ width: 120 }}>Amount</th></tr></thead>
              <tbody>
                {(result.vouchers || []).map((v) => (
                  <tr key={v.voucher_no}>
                    <td className="id">{v.voucher_no}</td>
                    <td><strong>{v.payee}</strong></td>
                    <td style={{ fontWeight: 700 }}>{bdt(v.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
              One document: a summary page for the bank line, then a signed voucher for each
              recipient. Every row carries the run reference, so the batch reconciles as one
              transfer rather than {result.paid.length} unrelated payments.
            </p>
          </div>
          <div className="wt-modal-foot">
            <button className="wt-btn" onClick={() => openRun(result.batch_ref)}>
              <Download size={14} /> Open the run document
            </button>
            <button className="wt-btn primary" style={{ marginLeft: 'auto' }} onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wt-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="wt-modal" role="dialog" aria-modal="true" style={{ maxWidth: 940 }}>
        <div className="wt-modal-head">
          <div>
            <h3><Layers size={16} style={{ verticalAlign: -3, marginRight: 6 }} />Payment Run</h3>
            <div className="sub">Pay several at once · one bank reference, one document, a voucher each</div>
          </div>
          <button className="wt-modal-x" onClick={onClose} disabled={busy}><X size={18} /></button>
        </div>

        <div className="wt-modal-body">
          {err && <div className="wt-formerr">{err}</div>}

          <div className="wt-grid3">
            <div className="wt-field">
              <label>How the run is paid</label>
              <select className="wt-select" value={f.method} onChange={(e) => { set('method', e.target.value); set('reference', ''); }}>
                {(ref?.methods || []).map((m) => <option key={m.value}>{m.value}</option>)}
              </select>
            </div>
            <div className="wt-field">
              <label>{method.reference_label || 'Reference'}{method.reference_required ? '' : ' (optional)'}</label>
              <input className="wt-input" value={f.reference} onChange={(e) => set('reference', e.target.value)}
                placeholder="The batch / slip number" />
            </div>
            <div className="wt-field">
              <label>Paid on</label>
              <input className="wt-input" type="date" max={today()} value={f.paid_on}
                onChange={(e) => set('paid_on', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, marginBottom: 8 }}>
            <div className="wt-sec-title" style={{ margin: 0 }}>Who is owed money</div>
            <button className="wt-btn sm" style={{ marginLeft: 'auto' }} onClick={selectAll}>Select all</button>
            <button className="wt-btn sm" onClick={() => { setPicked({}); setErr(''); }}>Clear</button>
          </div>

          {!due && <div className="muted" style={{ padding: 24, textAlign: 'center' }}><Loader2 size={16} className="wt-spin" /> Loading…</div>}

          {due && payable.length === 0 && (
            <div className="muted" style={{ padding: 24, textAlign: 'center', fontSize: 13 }}>
              Nothing is waiting to be paid.
            </div>
          )}

          {payable.length > 0 && (
            <table className="wt-tbl">
              <thead><tr>
                <th style={{ width: 36 }} /><th style={{ width: 108 }}>Kind</th>
                <th>Paid to</th><th style={{ width: 150 }}>For</th>
                <th style={{ width: 108 }}>Owed</th><th style={{ width: 132 }}>Pay</th>
              </tr></thead>
              <tbody>
                {payable.map((l) => {
                  const k = keyOf(l);
                  const on = k in picked;
                  return (
                    <tr key={k} style={{ background: on ? 'var(--wt-accent-tint)' : undefined }}>
                      <td><input type="checkbox" checked={on} onChange={() => toggle(l)} /></td>
                      <td>
                        <span className="wt-chip" style={{ cursor: 'default' }}>
                          {l.kind === 'provider'
                            ? <><Truck size={11} style={{ verticalAlign: -1 }} /> Provider</>
                            : <><Building2 size={11} style={{ verticalAlign: -1 }} /> Direct</>}
                        </span>
                      </td>
                      <td>
                        <strong>{l.payee}</strong>
                        <span className="muted" style={{ display: 'block', fontSize: 11.5 }}>
                          {[l.code, l.project_code].filter(Boolean).join(' · ')}
                        </span>
                      </td>
                      <td className="muted" title={l.description || ''}>{l.category || '—'}</td>
                      <td style={{ fontWeight: 600 }}>{bdt(l.amount)}</td>
                      <td>
                        <input className="wt-input" type="number" step="0.01"
                          style={{ padding: '6px 8px', fontSize: 13 }}
                          disabled={!on} value={on ? picked[k] : ''} placeholder="—"
                          onChange={(e) => setPicked((s) => ({ ...s, [k]: e.target.value }))} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Shown rather than hidden: an operator looking for a contractor who
              is not on the list needs to know the system has not lost them. */}
          {blocked.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div className="wt-sec-title" style={{ marginBottom: 8 }}>Not due yet</div>
              {blocked.map((l) => (
                <div key={keyOf(l)} className="wt-note" style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 2, color: '#b45309' }} />
                  <span style={{ fontSize: 12.5 }}>
                    <b>{l.payee}</b> · {l.code} · {bdt(l.amount)} — {l.blocked_reason}.
                  </span>
                </div>
              ))}
              <p className="muted" style={{ fontSize: 12 }}>
                These are held by the signed provider agreement, not by an oversight. Paying them
                early would break the terms the contractor agreed to.
              </p>
            </div>
          )}

          <div className="wt-field" style={{ marginTop: 14 }}>
            <label>Note for the run (optional)</label>
            <input className="wt-input" value={f.note} onChange={(e) => set('note', e.target.value)} />
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginTop: 12,
            padding: '11px 14px', borderRadius: 10,
            border: `1px solid ${count ? '#bbf7d0' : 'var(--wt-line)'}`,
            background: count ? '#f0fdf4' : '#f8fafc',
          }}>
            <Banknote size={15} style={{ color: count ? 'var(--wt-green)' : 'var(--wt-muted)' }} />
            <span style={{ fontSize: 13 }}>
              {count
                ? <>Paying <b>{count}</b> recipient{count === 1 ? '' : 's'} in one act. All of it lands, or none of it does.</>
                : 'Tick the payments to include in this run.'}
            </span>
            <span style={{ marginLeft: 'auto', fontWeight: 800, whiteSpace: 'nowrap' }}>{bdt(total)}</span>
          </div>
        </div>

        <div className="wt-modal-foot">
          <span className="muted" style={{ fontSize: 12, marginRight: 'auto' }}>
            A voucher is issued for every line, including provider fees.
          </span>
          <button className="wt-btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="wt-btn primary" onClick={post} disabled={busy || !count}>
            {busy ? <Loader2 size={14} className="wt-spin" /> : <Check size={14} />}
            {busy ? ' Paying…' : ` Pay ${bdt(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
