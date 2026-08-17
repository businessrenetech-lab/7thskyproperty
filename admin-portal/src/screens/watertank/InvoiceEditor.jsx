import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Save, Send, FileDown, Ban, Plus, Trash2, Loader2, Lock, Search,
  AlertTriangle, Check, Wallet, RefreshCw,
} from 'lucide-react';
import api from '../../services/api';
import { WtHead, DatePicker, Loading, EmptyState, Pill, bdt, dateFmt, toast, errText, parseJson } from './common';
import PaymentModal from './PaymentModal';

/*
 * Invoice draft editor.
 *
 * The lifecycle the operator works to: a signed contract DRAFTS the invoice, the
 * draft is edited here, and only then is it sent. Once sent the document is
 * frozen — the client is holding it — so this screen goes read-only and offers
 * void-and-replace instead of silent edits.
 */

const money = (v) => bdt(Number(v || 0));
const blankLine = () => ({ code: '', name: '', description: '', qty: 1, unit: '', unit_price: 0, group: 'service' });

export default function InvoiceEditor() {
  const { code } = useParams();
  const nav = useNavigate();

  const [inv, setInv] = useState(null);
  const [totals, setTotals] = useState(null);
  const [editable, setEditable] = useState(false);
  const [ref, setRef] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [dirty, setDirty] = useState(false);
  const [catQ, setCatQ] = useState('');
  const [payOpen, setPayOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, r] = await Promise.all([
        api.get(`/wt-invoices/${code}`),
        api.get('/wt-invoices/reference').catch(() => ({ data: null })),
      ]);
      // Belt and braces: the API normalises JSON columns, but Sequelize hands
      // them back as strings on this setup, so never trust the shape blindly.
      const row = d.data.invoice || {};
      setInv({ ...row, lines: parseJson(row.lines, []) || [], payments: parseJson(row.payments, []) || [] });
      setTotals(d.data.totals);
      setEditable(d.data.editable);
      setRef(r.data);
      setDirty(false);
    } catch (e) { toast.err(errText(e, `Could not load ${code}`)); setInv(null); }
    finally { setLoading(false); }
  }, [code]);
  useEffect(() => { load(); }, [load]);

  const set = (k, v) => { setInv((s) => ({ ...s, [k]: v })); setDirty(true); };
  const setLine = (i, k, v) => {
    setInv((s) => {
      const lines = [...(s.lines || [])];
      lines[i] = { ...lines[i], [k]: v };
      return { ...s, lines };
    });
    setDirty(true);
  };
  const addLine = (seed) => { setInv((s) => ({ ...s, lines: [...(s.lines || []), seed || blankLine()] })); setDirty(true); };
  const delLine = (i) => { setInv((s) => ({ ...s, lines: (s.lines || []).filter((_, j) => j !== i) })); setDirty(true); };

  // Local mirror of the server calculation so the operator sees figures move as
  // they type; the server recomputes authoritatively on save.
  const local = useMemo(() => {
    if (!inv) return null;
    const lines = (inv.lines || []).map((l) => ({ ...l, line_total: Number(l.unit_price || 0) * (Number(l.qty) || 1) }));
    const subtotal = lines.reduce((s, l) => s + l.line_total, 0);
    const net = Math.max(0, subtotal + Number(inv.transport || 0) + Number(inv.govt_fees || 0)
      + Number(inv.other_charges || 0) - Number(inv.discount || 0));
    const vat = Math.round((net * Number(inv.vat_percent || 0)) / 100 * 100) / 100;
    const amount = Math.round((net + vat) * 100) / 100;
    const advance = Math.min(Number(inv.advance_applied || 0), amount);
    const paid = Number(inv.paid_amount || 0);
    return { lines, subtotal, net, vat, amount, advance, paid, outstanding: Math.max(0, amount - advance - paid) };
  }, [inv]);

  const save = async () => {
    setBusy('save');
    try {
      const { data } = await api.patch(`/wt-invoices/${code}`, {
        client_name: inv.client_name, bill_to_name: inv.bill_to_name,
        bill_to_address: inv.bill_to_address, bill_to_phone: inv.bill_to_phone,
        bill_to_email: inv.bill_to_email, site_address: inv.site_address,
        inv_type: inv.inv_type, lines: inv.lines,
        discount: Number(inv.discount) || 0, discount_note: inv.discount_note,
        transport: Number(inv.transport) || 0, govt_fees: Number(inv.govt_fees) || 0,
        other_charges: Number(inv.other_charges) || 0,
        vat_percent: Number(inv.vat_percent) || 0,
        advance_applied: Number(inv.advance_applied) || 0, advance_note: inv.advance_note,
        issue_date: inv.issue_date, due_date: inv.due_date,
        payment_terms: inv.payment_terms, notes: inv.notes, footer_note: inv.footer_note,
        reference: inv.reference,
      });
      setTotals(data.totals);
      setDirty(false);
      toast.ok('Draft saved');
    } catch (e) { toast.err(errText(e, 'Could not save the draft')); }
    finally { setBusy(''); }
  };

  const send = async () => {
    if (dirty) { toast.err('Save the draft before sending.'); return; }
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Send ${code} to ${inv.bill_to_email || 'the client'}?\n\nOnce sent the invoice is frozen and can no longer be edited — you would have to void it and raise a replacement.`)) return;
    setBusy('send');
    try {
      await api.post(`/wt-invoices/${code}/send`);
      toast.ok(`${code} issued`);
      await load();
    } catch (e) {
      const b = e?.response?.data?.blocking;
      toast.err(b ? `${e.response.data.error} ${b.join(' · ')}` : errText(e, 'Could not send'));
    } finally { setBusy(''); }
  };

  const voidIt = async () => {
    // eslint-disable-next-line no-alert
    const reason = window.prompt('Void this invoice? Give a reason — it stays on the record with its number so the sequence remains auditable.');
    if (reason === null) return;
    setBusy('void');
    try { await api.post(`/wt-invoices/${code}/void`, { reason }); toast.ok(`${code} voided`); await load(); }
    catch (e) { toast.err(errText(e, 'Could not void it')); }
    finally { setBusy(''); }
  };

  const openPdf = () => window.open(`/api/wt-invoices/${code}/pdf`, '_blank');

  if (loading) return <Loading />;
  if (!inv) return (
    <>
      <WtHead title="Invoice not found" crumb={<div className="wt-crumb"><span className="lnk" onClick={() => nav('/water-tank/invoices')}>Invoices</span></div>} />
      <div className="wt-card"><EmptyState eyebrow="404" title={`No invoice ${code}`}
        action={<button className="wt-btn primary" onClick={() => nav('/water-tank/invoices')}>Back to invoices</button>} /></div>
    </>
  );

  const catalog = (ref?.catalog || []).filter((c) => !catQ
    || [c.code, c.name].some((v) => String(v || '').toLowerCase().includes(catQ.toLowerCase())));
  const isVoid = String(inv.status).toLowerCase() === 'void';

  return (
    <>
      <WtHead
        crumb={<div className="wt-crumb">
          <span className="lnk" onClick={() => nav('/water-tank/invoices')}>Invoices</span>
          {' › '}<span style={{ color: 'var(--wt-accent-ink)' }}>{inv.code}</span>
        </div>}
        title={`${inv.code}${inv.inv_type ? ` — ${inv.inv_type}` : ''}`}
        subtitle={[inv.client_name, inv.agreement_code && `Agreement ${inv.agreement_code}`,
          inv.amc_code && `AMC ${inv.amc_code}`, inv.instalment_no && `Instalment ${inv.instalment_no} of ${inv.instalment_of}`]
          .filter(Boolean).join(' · ')}
      >
        <button className="wt-btn" onClick={load}><RefreshCw size={14} /> Reload</button>
        <button className="wt-btn" onClick={openPdf}><FileDown size={14} /> PDF</button>
        {editable && (
          <button className="wt-btn" disabled={busy === 'save' || !dirty} onClick={save}>
            {busy === 'save' ? <Loader2 size={14} className="wt-spin" /> : <Save size={14} />} Save draft
          </button>
        )}
        {editable && (
          <button className="wt-btn primary" disabled={busy === 'send'} onClick={send}>
            {busy === 'send' ? <Loader2 size={14} className="wt-spin" /> : <Send size={14} />} Send to client
          </button>
        )}
        {!editable && !isVoid && (
          <button className="wt-btn primary" onClick={() => setPayOpen(true)}><Wallet size={14} /> Record payment</button>
        )}
        {!isVoid && <button className="wt-btn danger-ghost" disabled={busy === 'void'} onClick={voidIt}><Ban size={14} /> Void</button>}
        <Pill value={inv.status} />
      </WtHead>

      {!editable && !isVoid && (
        <div className="wt-note" style={{ marginBottom: 14 }}>
          <Lock size={14} /> This invoice was issued {dateFmt(inv.sent_at)}{inv.sent_to ? ` to ${inv.sent_to}` : ''} and is frozen.
          To correct it, void this one and raise a replacement — the client is holding this document.
        </div>
      )}
      {isVoid && (
        <div className="wt-warn" style={{ marginBottom: 14 }}>
          <AlertTriangle size={15} /> Voided {dateFmt(inv.voided_at)}.{inv.void_reason ? ` ${inv.void_reason}` : ''}
        </div>
      )}
      {dirty && (
        <div className="wt-warn" style={{ marginBottom: 14 }}>
          <AlertTriangle size={15} /> Unsaved changes — save the draft before sending.
        </div>
      )}

      {/*
        * The SAME dialog the register opens. This was a strip of inline fields
        * here and a drawer there — two validations, two ideas of what a
        * "reference" is, and a refund offered on neither. One component means
        * money is taken the same way whichever screen the operator is on.
        */}
      {payOpen && (
        <PaymentModal
          invoice={inv}
          onClose={() => { setPayOpen(false); load(); }}
          onDone={() => load()}
        />
      )}

      <div className="wt-split">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ── bill to ── */}
          <div className="wt-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="wt-sec-title">Bill to</div>
            <div className="wt-grid2">
              <Field label="Client name" value={inv.bill_to_name || inv.client_name} on={(v) => set('bill_to_name', v)} ro={!editable} />
              <Field label="Email (invoice is sent here)" value={inv.bill_to_email} on={(v) => set('bill_to_email', v)} ro={!editable} />
              <Field label="Phone" value={inv.bill_to_phone} on={(v) => set('bill_to_phone', v)} ro={!editable} />
              <Field label="Reference / PO" value={inv.reference} on={(v) => set('reference', v)} ro={!editable} />
              <Field label="Billing address" value={inv.bill_to_address} on={(v) => set('bill_to_address', v)} ro={!editable} span />
              <Field label="Service site" value={inv.site_address} on={(v) => set('site_address', v)} ro={!editable} span />
            </div>
            <div className="wt-grid3">
              <div className="wt-field"><label>Invoice type</label>
                {editable ? (
                  <select className="wt-select" value={inv.inv_type || ''} onChange={(e) => set('inv_type', e.target.value)}>
                    {(ref?.types || []).map((t) => <option key={t}>{t}</option>)}
                  </select>
                ) : <div style={{ fontSize: 13, fontWeight: 600 }}>{inv.inv_type || '—'}</div>}
              </div>
              <div className="wt-field"><label>Issue date</label>
                {editable ? <DatePicker value={inv.issue_date || ''} onChange={(v) => set('issue_date', v)} />
                  : <div style={{ fontSize: 13 }}>{dateFmt(inv.issue_date)}</div>}
              </div>
              <div className="wt-field"><label>Due date</label>
                {editable ? <DatePicker value={inv.due_date || ''} onChange={(v) => set('due_date', v)} />
                  : <div style={{ fontSize: 13 }}>{dateFmt(inv.due_date)}</div>}
              </div>
            </div>
          </div>

          {/* ── line items ── */}
          <div className="wt-card wt-tblcard">
            <div style={{ padding: '14px 20px 0' }}>
              <div className="wt-sec-title">Items</div>
              <div style={{ fontSize: 11.5, color: 'var(--wt-muted)', marginTop: 3 }}>
                The services and prices the client agreed to. They should recognise these from Schedule C of their agreement.
              </div>
            </div>
            <table className="wt-tbl">
              <thead><tr>
                <th style={{ width: 90 }}>Code</th><th>Description</th>
                <th style={{ width: 70 }}>Qty</th><th style={{ width: 110 }}>Rate</th>
                <th style={{ width: 110, textAlign: 'right' }}>Amount</th>
                {editable && <th style={{ width: 40 }} />}
              </tr></thead>
              <tbody>
                {(inv.lines || []).map((l, i) => (
                  <tr key={i}>
                    <td>{editable ? <input className="wt-input sm" value={l.code || ''} onChange={(e) => setLine(i, 'code', e.target.value)} /> : <span className="id">{l.code}</span>}</td>
                    <td>
                      {editable ? (
                        <>
                          <input className="wt-input sm" value={l.name || ''} onChange={(e) => setLine(i, 'name', e.target.value)} />
                          <input className="wt-input sm" style={{ marginTop: 4 }} placeholder="Description (optional)"
                            value={l.description || ''} onChange={(e) => setLine(i, 'description', e.target.value)} />
                        </>
                      ) : (
                        <><strong>{l.name}</strong>{l.description && <div style={{ fontSize: 11.5, color: 'var(--wt-muted)' }}>{l.description}</div>}</>
                      )}
                    </td>
                    <td>{editable ? <input className="wt-input sm" type="number" min="1" value={l.qty ?? 1} onChange={(e) => setLine(i, 'qty', e.target.value)} /> : (l.qty || 1)}</td>
                    <td>{editable ? <input className="wt-input sm" type="number" min="0" value={l.unit_price ?? 0} onChange={(e) => setLine(i, 'unit_price', e.target.value)} /> : money(l.unit_price)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{money(Number(l.unit_price || 0) * (Number(l.qty) || 1))}</td>
                    {editable && <td><button className="wt-iconbtn" onClick={() => delLine(i)} title="Remove"><Trash2 size={13} /></button></td>}
                  </tr>
                ))}
                {!(inv.lines || []).length && (
                  <tr className="wt-empty-row"><td colSpan={editable ? 6 : 5}>No items. Add the services being charged for.</td></tr>
                )}
              </tbody>
            </table>
            {editable && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--wt-line)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button className="wt-btn sm" onClick={() => addLine()}><Plus size={13} /> Blank line</button>
                <label className="wt-search" style={{ width: 240 }}>
                  <Search /><input value={catQ} onChange={(e) => setCatQ(e.target.value)} placeholder="Add from the price schedule…" />
                </label>
                {catQ && (
                  <div className="wt-lookup" style={{ width: '100%', maxHeight: 180 }}>
                    {catalog.slice(0, 8).map((c) => (
                      <button key={c.code} className="wt-lookup-item"
                        onClick={() => { addLine({ code: c.code, name: c.name, description: '', qty: 1, unit: c.unit, unit_price: c.standard_price, group: c.group }); setCatQ(''); }}>
                        <span style={{ flex: '1 0 0' }}><span className="nm">{c.name}</span><span className="mt">{c.code}</span></span>
                        <span style={{ fontWeight: 700, fontSize: 12 }}>{money(c.standard_price)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── adjustments ── */}
          <div className="wt-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="wt-sec-title">Adjustments &amp; terms</div>
            <div className="wt-grid3">
              <Field label="Discount (৳)" value={inv.discount} on={(v) => set('discount', v)} ro={!editable} type="number" />
              <Field label="Discount reason" value={inv.discount_note} on={(v) => set('discount_note', v)} ro={!editable} />
              <Field label="Transport (৳)" value={inv.transport} on={(v) => set('transport', v)} ro={!editable} type="number" />
              <Field label="Government fees (৳)" value={inv.govt_fees} on={(v) => set('govt_fees', v)} ro={!editable} type="number" />
              <Field label="Other charges (৳)" value={inv.other_charges} on={(v) => set('other_charges', v)} ro={!editable} type="number" />
              <Field label="VAT (%)" value={inv.vat_percent} on={(v) => set('vat_percent', v)} ro={!editable} type="number" />
              <Field label="Advance already paid (৳)" value={inv.advance_applied} on={(v) => set('advance_applied', v)} ro={!editable} type="number" />
              <Field label="Advance note" value={inv.advance_note} on={(v) => set('advance_note', v)} ro={!editable} span />
              <Field label="Payment terms" value={inv.payment_terms} on={(v) => set('payment_terms', v)} ro={!editable} span />
              <Field label="Notes shown on the invoice" value={inv.notes} on={(v) => set('notes', v)} ro={!editable} span />
            </div>
          </div>
        </div>

        {/* ── totals ── */}
        <div className="wt-card" style={{ padding: 18, alignSelf: 'start', position: 'sticky', top: 20 }}>
          <div className="wt-sec-title" style={{ marginBottom: 12 }}>Totals</div>
          <div className="wt-costrow"><span>Subtotal</span><span>{money(local.subtotal)}</span></div>
          {Number(inv.discount) > 0 && <div className="wt-costrow"><span style={{ color: 'var(--wt-green)' }}>Discount</span><span style={{ color: 'var(--wt-green)' }}>− {money(inv.discount)}</span></div>}
          {Number(inv.transport) > 0 && <div className="wt-costrow"><span>Transport</span><span>{money(inv.transport)}</span></div>}
          {Number(inv.govt_fees) > 0 && <div className="wt-costrow"><span>Government fees</span><span>{money(inv.govt_fees)}</span></div>}
          {Number(inv.other_charges) > 0 && <div className="wt-costrow"><span>Other charges</span><span>{money(inv.other_charges)}</span></div>}
          <div className="wt-costrow"><span>VAT ({inv.vat_percent || 0}%)</span><span>{money(local.vat)}</span></div>
          <div className="wt-costrow total"><span>Invoice total</span><span className="amt">{money(local.amount)}</span></div>
          {local.advance > 0 && <div className="wt-costrow"><span style={{ color: 'var(--wt-green)' }}>Less advance paid</span><span style={{ color: 'var(--wt-green)' }}>− {money(local.advance)}</span></div>}
          {local.paid > 0 && <div className="wt-costrow"><span style={{ color: 'var(--wt-green)' }}>Less payments</span><span style={{ color: 'var(--wt-green)' }}>− {money(local.paid)}</span></div>}
          <div className="wt-costrow total" style={{ marginTop: 6 }}>
            <span>{local.outstanding > 0 ? 'Balance due' : 'Settled'}</span>
            <span className="amt" style={{ color: local.outstanding > 0 ? undefined : 'var(--wt-green)' }}>{money(local.outstanding)}</span>
          </div>

          {inv.period_start && (
            <div className="wt-note" style={{ marginTop: 12 }}>
              Covers {dateFmt(inv.period_start)} – {dateFmt(inv.period_end)}
              {inv.instalment_no ? ` · instalment ${inv.instalment_no} of ${inv.instalment_of}` : ''}
            </div>
          )}
          {(inv.payments || []).length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div className="wt-sec-title" style={{ marginBottom: 6 }}>Payments</div>
              {(inv.payments || []).map((p, i) => (
                <div className="wt-costrow" key={i}>
                  <span>{dateFmt(p.received_on)}{p.method ? ` · ${p.method}` : ''}</span>
                  <span>{money(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
          <button className="wt-btn" style={{ marginTop: 14, width: '100%' }} onClick={openPdf}>
            <FileDown size={14} /> Preview the branded PDF
          </button>
        </div>
      </div>
    </>
  );
}

function Field({ label, value, on, ro, type, span }) {
  return (
    <div className="wt-field" style={span ? { gridColumn: '1 / -1' } : undefined}>
      <label>{label}</label>
      {ro
        ? <div style={{ fontSize: 13, color: 'var(--wt-ink-2)', minHeight: 18 }}>{value == null || value === '' ? '—' : String(value)}</div>
        : <input className="wt-input" type={type || 'text'} value={value ?? ''} onChange={(e) => on(e.target.value)} />}
    </div>
  );
}
