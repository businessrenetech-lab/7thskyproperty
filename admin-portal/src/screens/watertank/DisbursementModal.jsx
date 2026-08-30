import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X, Check, Loader2, Banknote, Truck, Building2, FileText, AlertTriangle, Search, Download,
} from 'lucide-react';
import api from '../../services/api';
import { bdt, dateFmt, Pill, toast, errText } from './common';

/*
 * Disbursement — money leaving Seventh Sky.
 *
 * The design turns on one thing the operator said and the software did not know:
 * NOT EVERY PAYMENT GOES TO A SERVICE PROVIDER. Seventh Sky buys chemicals,
 * hires a vehicle, pays a ward-office fee, settles a day-labourer. Until now
 * there was nowhere to record that, so either it went unrecorded or it landed in
 * a project table the money ledger never read — which is why the margin on the
 * Payments screen has been flattering: it counted everything coming in and only
 * the provider fees going out.
 *
 * So this dialog has two modes and they are genuinely different transactions:
 *
 *   PROVIDER PAYOUT — pick a work order. The amount is what is still owed on it,
 *   and the signed agreement decides whether it may be paid at all. Blocked
 *   lines are SHOWN with their reason rather than hidden, because "why can't I
 *   pay this contractor" is a question the screen should answer.
 *
 *   DIRECT COST — type who was paid and what for. No list to pick from, because
 *   the payee is a hardware shop or a rickshaw van. No gate, because the money
 *   has already gone; refusing to record it would not unspend it.
 *
 * Either way a numbered, branded voucher comes out — the document the recipient
 * signs and the auditor asks for. A business that pays money out and produces no
 * paperwork cannot answer the simplest question about its own cash.
 */

const num = (v) => Number(v || 0);
const today = () => new Date().toISOString().slice(0, 10);
const mintKey = () => `ui-dsb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export default function DisbursementModal({ mode: seedMode = 'direct', line: seedLine, onClose, onDone }) {
  const [ref, setRef] = useState(null);
  const [mode, setMode] = useState(seedLine ? 'provider' : seedMode);
  const [due, setDue] = useState(null);
  const [line, setLine] = useState(seedLine || null);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);
  const key = useRef(mintKey());

  const [f, setF] = useState({
    payee: '', payee_type: 'Supplier', payee_details: '',
    category: '', description: '',
    amount: '', method: 'Cash', reference: '',
    paid_on: today(), project_code: '', billable_to_client: false, notes: '',
    pay_now: true,
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    api.get('/wt-disbursements/reference')
      .then((r) => { setRef(r.data); setF((s) => ({ ...s, category: s.category || r.data?.categories?.[0] || 'Other' })); })
      .catch(() => setRef({ categories: ['Other'], payee_types: ['Supplier'], methods: [{ value: 'Cash' }], projects: [] }));
    api.get('/wt-disbursements/due').then((r) => setDue(r.data)).catch(() => setDue({ provider: [], provider_blocked: [], direct: [] }));
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

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    const all = [...(due?.provider || []), ...(due?.provider_blocked || [])];
    return all.filter((l) => !term || [l.code, l.payee, l.project_code, l.client_name].some((v) => String(v || '').toLowerCase().includes(term)));
  }, [due, q]);

  const pickLine = (l) => {
    setLine(l);
    setF((s) => ({ ...s, amount: l.amount, payee: l.payee, description: l.description || `Provider payout against ${l.code}` }));
    setErr('');
  };

  const openVoucher = (code) => window.open(`${api.defaults.baseURL || ''}/wt-disbursements/${code}/voucher`, '_blank');

  const submit = async () => {
    const amount = num(f.amount);
    if (!(amount > 0)) { setErr('Enter an amount greater than zero.'); return; }
    if (f.paid_on > today()) { setErr('A payment cannot be made in the future.'); return; }
    if (method.reference_required && !f.reference.trim()) {
      setErr(`${method.reference_label || 'A reference'} is required for a ${f.method} payment — otherwise the bank statement cannot be matched to this voucher.`);
      return;
    }

    setBusy(true); setErr('');
    try {
      if (mode === 'provider') {
        if (!line) { setErr('Choose the work order being paid.'); setBusy(false); return; }
        if (line.blocked_reason) { setErr(`This payout is not due yet: ${line.blocked_reason}.`); setBusy(false); return; }
        if (amount > num(line.amount) + 0.009) { setErr(`That is more than the ${bdt(line.amount)} still owed on ${line.code}.`); setBusy(false); return; }
        /*
         * Routed through the payment RUN even for a single line, so a provider
         * payout gets a voucher exactly like a direct cost does. The alternative
         * — the plain pay-provider endpoint — moves the money but produces no
         * paperwork, which is the gap this whole screen exists to close.
         */
        const r = await api.post('/wt-disbursements/run', {
          lines: [{ kind: 'provider', id: line.id, amount }],
          method: f.method, reference: f.reference || null,
          paid_on: f.paid_on, note: f.notes || null,
          idempotency_key: key.current,
        });
        setDone({ ...r.data, single: r.data.vouchers?.[0] });
        toast.ok(r.data.message);
      } else {
        if (!f.payee.trim()) { setErr('Who was paid?'); setBusy(false); return; }
        if (!f.description.trim()) { setErr('Say what the money was for — that is the whole purpose of a voucher.'); setBusy(false); return; }
        const r = await api.post('/wt-disbursements', {
          ...f, amount, idempotency_key: key.current,
        });
        setDone({ single: r.data.disbursement, paid: r.data.paid, message: r.data.message });
        toast.ok(r.data.message);
      }
      key.current = mintKey();
      onDone?.();
    } catch (e) { setErr(errText(e, 'Could not record this payment')); }
    finally { setBusy(false); }
  };

  /* ── the voucher, once paid ──────────────────────────────────────────── */
  if (done) {
    const v = done.single || {};
    return (
      <div className="wt-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="wt-modal" role="dialog" aria-modal="true" style={{ maxWidth: 560 }}>
          <div className="wt-modal-head">
            <div>
              <h3><Check size={16} style={{ verticalAlign: -3, marginRight: 6, color: 'var(--wt-green)' }} />
                {done.paid === false ? 'Filed for approval' : 'Voucher issued'}</h3>
              <div className="sub">{done.message}</div>
            </div>
            <button className="wt-modal-x" onClick={onClose}><X size={18} /></button>
          </div>
          <div className="wt-modal-body">
            <div className="wt-ctxcard">
              <div className="wt-ctxgrid">
                <span><span className="muted">Voucher</span><b>{v.voucher_no || '— not yet paid —'}</b></span>
                <span><span className="muted">Paid to</span><b>{v.payee}</b></span>
                <span><span className="muted">Amount</span><b style={{ color: 'var(--wt-red)' }}>{bdt(v.amount)}</b></span>
                <span><span className="muted">Reference</span><b>{v.code}</b></span>
              </div>
            </div>
            <p className="muted" style={{ fontSize: 12.5, marginTop: 14 }}>
              {done.paid === false
                ? 'Nothing has been paid yet. It will appear on the payment run once approved.'
                : 'The voucher carries the amount in words and three signature blocks — prepared, approved and received. Print it for the recipient to sign.'}
            </p>
          </div>
          <div className="wt-modal-foot">
            {v.voucher_no && (
              <button className="wt-btn" onClick={() => openVoucher(v.voucher_no)}>
                <Download size={14} /> Open voucher
              </button>
            )}
            <button className="wt-btn primary" style={{ marginLeft: 'auto' }} onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wt-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="wt-modal" role="dialog" aria-modal="true" style={{ maxWidth: 820 }}>
        <div className="wt-modal-head">
          <div>
            <h3><Banknote size={16} style={{ verticalAlign: -3, marginRight: 6 }} />Make a Disbursement</h3>
            <div className="sub">Money leaving Seventh Sky · a numbered voucher is issued for every payment</div>
          </div>
          <button className="wt-modal-x" onClick={onClose} disabled={busy}><X size={18} /></button>
        </div>

        <div className="wt-modal-body">
          {err && <div className="wt-formerr">{err}</div>}

          {/* The two kinds, named plainly. */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {[
              { v: 'provider', icon: Truck, label: 'Pay a provider', hint: 'Against a work order' },
              { v: 'direct', icon: Building2, label: 'Direct cost', hint: 'Seventh Sky paid it itself' },
            ].map(({ v, icon: Icon, label, hint }) => (
              <button key={v} className={`wt-pickrow${mode === v ? ' on' : ''}`}
                style={{
                  flex: '1 0 0',
                  borderColor: mode === v ? 'var(--wt-accent)' : undefined,
                  background: mode === v ? 'var(--wt-accent-tint)' : undefined,
                }}
                onClick={() => { setMode(v); setErr(''); }}>
                <span className="wt-pickrow-mark"><Icon size={15} /></span>
                <span style={{ textAlign: 'left' }}>
                  <strong>{label}</strong>
                  <span className="muted" style={{ display: 'block', fontSize: 11.5 }}>{hint}</span>
                </span>
              </button>
            ))}
          </div>

          {mode === 'provider' ? (
            <>
              {!line ? (
                <>
                  <div className="wt-field">
                    <label>Which job is being paid for?</label>
                    <div style={{ position: 'relative' }}>
                      <Search size={15} style={{ position: 'absolute', left: 11, top: 11, color: 'var(--wt-muted)' }} />
                      <input className="wt-input" style={{ paddingLeft: 34 }} autoFocus
                        placeholder="Work order, provider, project or client…" value={q} onChange={(e) => setQ(e.target.value)} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto' }}>
                    {!due && <div className="muted" style={{ padding: 20, textAlign: 'center' }}><Loader2 size={16} className="wt-spin" /> Loading…</div>}
                    {due && shown.length === 0 && (
                      <div className="muted" style={{ padding: 24, textAlign: 'center', fontSize: 13 }}>
                        {q ? `No job matches “${q}”.` : 'No provider fees are outstanding.'}
                      </div>
                    )}
                    {shown.map((l) => (
                      <button key={l.code} className="wt-pickrow" disabled={!!l.blocked_reason}
                        style={l.blocked_reason ? { opacity: 0.62, cursor: 'not-allowed' } : undefined}
                        onClick={() => !l.blocked_reason && pickLine(l)}>
                        <span className="wt-pickrow-mark"><Truck size={15} /></span>
                        <span style={{ flex: '1 0 0', minWidth: 0, textAlign: 'left' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <strong>{l.payee}</strong>
                            <span className="muted" style={{ fontSize: 11.5 }}>{l.code}</span>
                          </span>
                          <span className="muted" style={{ display: 'block', fontSize: 12, marginTop: 2 }}>
                            {[l.client_name, l.project_code].filter(Boolean).join(' · ') || 'No project'}
                          </span>
                          {/* Shown, not hidden: "why can't I pay this contractor"
                              is a question the screen should answer. */}
                          {l.blocked_reason && (
                            <span className="wt-chip warn" style={{ marginTop: 4, display: 'inline-block' }}>
                              <AlertTriangle size={10} style={{ verticalAlign: -1 }} /> {l.blocked_reason}
                            </span>
                          )}
                        </span>
                        <span style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{bdt(l.amount)}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="wt-ctxcard">
                  <div className="wt-ctxcard-head">
                    <span><Truck size={14} /> <strong>{line.payee}</strong> <Pill value={line.code} sm /></span>
                    <button className="wt-btn sm" onClick={() => { setLine(null); setErr(''); }}>Change job</button>
                  </div>
                  <div className="wt-ctxgrid">
                    <span><span className="muted">Client</span><b>{line.client_name || '—'}</b></span>
                    <span><span className="muted">Project</span><b>{line.project_code || '—'}</b></span>
                    <span><span className="muted">Still owed</span><b style={{ color: 'var(--wt-red)' }}>{bdt(line.amount)}</b></span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="wt-grid2">
                <div className="wt-field">
                  <label>Who was paid?</label>
                  <input className="wt-input" autoFocus value={f.payee} onChange={(e) => set('payee', e.target.value)}
                    placeholder="e.g. Karim Hardware, Dhaka WASA, Md. Rafiq (day labour)" />
                  <span className="hint">Typed, not picked — this payee is on no list, which is the point.</span>
                </div>
                <div className="wt-field">
                  <label>What kind of payee</label>
                  <select className="wt-select" value={f.payee_type} onChange={(e) => set('payee_type', e.target.value)}>
                    {(ref?.payee_types || []).map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="wt-field">
                <label>Payee details (optional)</label>
                <input className="wt-input" value={f.payee_details} onChange={(e) => set('payee_details', e.target.value)}
                  placeholder="Shop address, mobile number, NID — whatever the voucher should carry" />
              </div>

              <div className="wt-grid2">
                <div className="wt-field">
                  <label>What kind of cost</label>
                  <select className="wt-select" value={f.category} onChange={(e) => set('category', e.target.value)}>
                    {(ref?.categories || []).map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="wt-field">
                  <label>Against a project (optional)</label>
                  <select className="wt-select" value={f.project_code} onChange={(e) => set('project_code', e.target.value)}>
                    <option value="">Not tied to one project</option>
                    {(ref?.projects || []).map((p) => (
                      <option key={p.code} value={p.code}>{p.code} — {p.name || p.client_name}</option>
                    ))}
                  </select>
                  <span className="hint">One purchase may cover several jobs; leave it blank rather than guessing.</span>
                </div>
              </div>

              <div className="wt-field">
                <label>What the money was for</label>
                <textarea className="wt-input" rows={2} value={f.description} onChange={(e) => set('description', e.target.value)}
                  placeholder="e.g. 4 × 20L sodium hypochlorite for the Banani rooftop jobs, invoice 2291" />
                <span className="hint">This is printed on the voucher. Write what you would want to read in six months.</span>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 4 }}>
                <input type="checkbox" checked={f.billable_to_client}
                  onChange={(e) => set('billable_to_client', e.target.checked)} />
                Recharge this to the client
              </label>
              <span className="hint" style={{ display: 'block', marginBottom: 10 }}>
                Marks it as recoverable so it is not absorbed as Seventh Sky's own margin. It does
                not raise an invoice by itself.
              </span>
            </>
          )}

          {/* Common to both: the money itself. */}
          {(mode === 'direct' || line) && (
            <>
              <div className="wt-grid2">
                <div className="wt-field">
                  <label>Amount</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="wt-input" type="number" step="0.01" style={{ flex: '1 0 0' }}
                      value={f.amount} onChange={(e) => set('amount', e.target.value)} />
                    {mode === 'provider' && line && (
                      <button className="wt-chip" onClick={() => set('amount', line.amount)}>All {bdt(line.amount)}</button>
                    )}
                  </div>
                </div>
                <div className="wt-field">
                  <label>Paid on</label>
                  <input className="wt-input" type="date" max={today()} value={f.paid_on}
                    onChange={(e) => set('paid_on', e.target.value)} />
                </div>
              </div>

              <div className="wt-grid2">
                <div className="wt-field">
                  <label>How it was paid</label>
                  <select className="wt-select" value={f.method} onChange={(e) => { set('method', e.target.value); set('reference', ''); }}>
                    {(ref?.methods || []).map((m) => <option key={m.value}>{m.value}</option>)}
                  </select>
                </div>
                <div className="wt-field">
                  <label>{method.reference_label || 'Reference'}{method.reference_required ? '' : ' (optional)'}</label>
                  <input className="wt-input" value={f.reference} onChange={(e) => set('reference', e.target.value)}
                    placeholder={method.reference_label || 'What the bank statement will show'} />
                  <span className="hint">{method.reference_hint || 'What you would quote if this payment had to be traced.'}</span>
                </div>
              </div>

              <div className="wt-field">
                <label>Notes for the voucher (optional)</label>
                <input className="wt-input" value={f.notes} onChange={(e) => set('notes', e.target.value)} />
              </div>

              {mode === 'direct' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <input type="checkbox" checked={!f.pay_now} onChange={(e) => set('pay_now', !e.target.checked)} />
                  <FileText size={13} /> File for approval instead — do not record the money as paid yet
                </label>
              )}
            </>
          )}
        </div>

        <div className="wt-modal-foot">
          <span className="muted" style={{ fontSize: 12, marginRight: 'auto' }}>
            {f.pay_now ? 'A numbered voucher is issued the moment this is recorded.' : 'Filed only — nothing leaves the account.'}
          </span>
          <button className="wt-btn" onClick={onClose} disabled={busy}>Cancel</button>
          {(mode === 'direct' || line) && (
            <button className="wt-btn primary" onClick={submit} disabled={busy}>
              {busy ? <Loader2 size={14} className="wt-spin" /> : <Banknote size={14} />}
              {busy ? ' Recording…' : f.pay_now ? ` Pay ${bdt(f.amount || 0)}` : ' File for approval'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
