import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X, Search, Plus, Trash2, Loader2, Check, User, FolderOpen, Mail, Phone, ShieldCheck,
} from 'lucide-react';
import api from '../../services/api';
import { DatePicker, bdt, toast, errText } from './common';

/*
 * Create invoice — a CENTRED modal, not a right-hand drawer.
 *
 * Building an invoice needs a client search, a catalogue and a running total
 * visible together; a 460px drawer cannot hold that without the operator
 * scrolling past what they are trying to reconcile.
 *
 * The invoice is created as a DRAFT and the caller opens it in the full editor,
 * so this dialog only has to capture enough to make a sensible draft.
 */

const initials = (n) => String(n || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const blankLine = () => ({ code: '', name: '', description: '', qty: 1, unit: '', unit_price: 0, group: 'service' });

export default function InvoiceCreateModal({ onClose, onCreated }) {
  const [ref, setRef] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const [q, setQ] = useState('');
  const [hits, setHits] = useState([]);
  const [searching, setSearching] = useState(false);
  const [client, setClient] = useState(null);

  const [catQ, setCatQ] = useState('');
  const [f, setF] = useState({
    inv_type: 'Final',
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    project_id: '', lines: [],
    discount: '', discount_note: '',
    transport: '', govt_fees: '', other_charges: '',
    vat_percent: 0, advance_applied: '', advance_note: '',
    payment_terms: 'Payable within 7 days of issue.', notes: '',
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    api.get('/wt-invoices/reference').then((r) => setRef(r.data)).catch(() => setRef(null));
  }, []);

  // Close on Escape — a modal that traps you is worse than a drawer.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const runLookup = useCallback((term) => {
    if (term.trim().length < 2) { setHits([]); setSearching(false); return; }
    setSearching(true);
    api.get('/wt-invoices/client-lookup', { params: { q: term } })
      .then((r) => setHits(r.data || [])).catch(() => setHits([]))
      .finally(() => setSearching(false));
  }, []);
  useEffect(() => { const t = setTimeout(() => runLookup(q), 220); return () => clearTimeout(t); }, [q, runLookup]);

  const pickClient = (c) => {
    setClient(c);
    setQ('');
    // A client with exactly one project needs no further choosing.
    if (c.projects?.length === 1) set('project_id', c.projects[0].code);
  };

  const addLine = (seed) => setF((s) => ({ ...s, lines: [...s.lines, seed || blankLine()] }));
  const setLine = (i, k, v) => setF((s) => ({ ...s, lines: s.lines.map((l, j) => (j === i ? { ...l, [k]: v } : l)) }));
  const delLine = (i) => setF((s) => ({ ...s, lines: s.lines.filter((_, j) => j !== i) }));

  const catalog = useMemo(() => (ref?.catalog || []).filter((c) => !catQ
    || [c.code, c.name].some((v) => String(v || '').toLowerCase().includes(catQ.toLowerCase()))), [ref, catQ]);

  const totals = useMemo(() => {
    const lines = f.lines.map((l) => ({ ...l, line_total: Number(l.unit_price || 0) * (Number(l.qty) || 1) }));
    const subtotal = lines.reduce((s, l) => s + l.line_total, 0);
    const net = Math.max(0, subtotal + Number(f.transport || 0) + Number(f.govt_fees || 0)
      + Number(f.other_charges || 0) - Number(f.discount || 0));
    const vat = Math.round((net * Number(f.vat_percent || 0)) / 100 * 100) / 100;
    const amount = Math.round((net + vat) * 100) / 100;
    const advance = Math.min(Number(f.advance_applied || 0), amount);
    return { subtotal, net, vat, amount, advance, outstanding: Math.max(0, amount - advance) };
  }, [f]);

  const submit = async () => {
    if (!client) { setErr('Choose a client.'); return; }
    if (!f.lines.length) { setErr('Add at least one item.'); return; }
    setSaving(true); setErr('');
    try {
      const { data } = await api.post('/wt-invoices', {
        client_name: client.name, client_code: client.code, client_id: client.id,
        bill_to_name: client.name, bill_to_email: client.email,
        bill_to_phone: client.mobile, bill_to_address: client.address,
        site_address: client.address,
        project_id: f.project_id || null,
        agreement_code: client.agreement_code || null,
        inv_type: f.inv_type,
        lines: f.lines.map((l) => ({ ...l, qty: Number(l.qty) || 1, unit_price: Number(l.unit_price) || 0 })),
        discount: Number(f.discount) || 0, discount_note: f.discount_note || null,
        transport: Number(f.transport) || 0, govt_fees: Number(f.govt_fees) || 0,
        other_charges: Number(f.other_charges) || 0,
        vat_percent: Number(f.vat_percent) || 0,
        advance_applied: Number(f.advance_applied) || 0, advance_note: f.advance_note || null,
        issue_date: f.issue_date, due_date: f.due_date || null,
        payment_terms: f.payment_terms || null, notes: f.notes || null,
        source_type: 'Manual',
      });
      toast.ok(`${data.code} drafted`);
      onCreated(data);
    } catch (e) { setErr(errText(e, 'Could not create the invoice')); setSaving(false); }
  };

  return (
    <div className="wt-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="wt-modal" role="dialog" aria-modal="true">
        <div className="wt-modal-head">
          <div>
            <h3>New invoice</h3>
            <div className="sub">Created as a draft — you can edit every figure before it goes out.</div>
          </div>
          <button className="wt-modal-x" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <div className="wt-modal-body">
          {err && <div className="wt-formerr">{err}</div>}

          {/* ── client ── */}
          <div>
            <div className="wt-sec-title" style={{ marginBottom: 8 }}>Client</div>
            {client ? (
              <div className="wt-card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="wt-avatar">{initials(client.name)}</span>
                <div style={{ flex: '1 0 0', minWidth: 0 }}>
                  <strong>{client.name}</strong>
                  <div style={{ fontSize: 11.5, color: 'var(--wt-muted)' }}>
                    {[client.code, client.mobile, client.email, client.address].filter(Boolean).join(' · ')}
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
                    {Number(client.due_balance) > 0 && (
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--wt-red, #c0392b)' }}>
                        Due balance: {bdt(client.due_balance)}
                      </span>
                    )}
                    {client.projects?.length > 0 && (
                      <span style={{ fontSize: 11.5, color: 'var(--wt-muted)' }}>{client.projects.length} project(s)</span>
                    )}
                  </div>
                  {client.agreement_status === 'Signed' && (
                    <div style={{ fontSize: 11.5, color: 'var(--wt-green)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <ShieldCheck size={12} /> Agreement {client.agreement_code} signed
                    </div>
                  )}
                </div>
                <button className="wt-btn sm" onClick={() => { setClient(null); set('project_id', ''); }}>Change</button>
              </div>
            ) : (
              <>
                <label className="wt-search" style={{ width: '100%' }}>
                  <Search />
                  <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
                    placeholder="Search by name, email, mobile, client code or project ID…" />
                  {searching && <Loader2 size={14} className="wt-spin" />}
                </label>
                {q.trim().length >= 2 && (
                  <div className="wt-lookup" style={{ marginTop: 8, maxHeight: 220 }}>
                    {hits.map((c) => (
                      <button key={c.id} className="wt-lookup-item" onClick={() => pickClient(c)}>
                        <span className="av">{initials(c.name)}</span>
                        <span style={{ flex: '1 0 0', minWidth: 0 }}>
                          <span className="nm">{c.name}</span>
                          <span className="mt">
                            {[c.code, c.mobile, c.email].filter(Boolean).join(' · ')}
                            {c.projects?.length ? ` · ${c.projects.length} project(s)` : ''}
                            {Number(c.due_balance) > 0 ? ` · due ${bdt(c.due_balance)}` : ''}
                          </span>
                        </span>
                        {c.matched_on?.length > 0 && (
                          <span style={{ fontSize: 10.5, color: 'var(--wt-muted)' }}>matched {c.matched_on.join(', ')}</span>
                        )}
                      </button>
                    ))}
                    {!searching && !hits.length && (
                      <div style={{ padding: 16, textAlign: 'center', fontSize: 12.5, color: 'var(--wt-muted)' }}>
                        Nothing matches “{q.trim()}”. Try a mobile number, an email or a project ID.
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="wt-modal-cols">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* ── header fields ── */}
              <div className="wt-grid3">
                <div className="wt-field"><label>Invoice type</label>
                  <select className="wt-select" value={f.inv_type} onChange={(e) => set('inv_type', e.target.value)}>
                    {(ref?.types || ['Advance', 'Progress', 'Final']).map((t) => <option key={t}>{t}</option>)}
                  </select></div>
                <div className="wt-field"><label>Issue date</label>
                  <DatePicker value={f.issue_date} onChange={(v) => set('issue_date', v)} /></div>
                <div className="wt-field"><label>Due date</label>
                  <DatePicker value={f.due_date} onChange={(v) => set('due_date', v)} /></div>
                {client?.projects?.length > 0 && (
                  <div className="wt-field" style={{ gridColumn: '1 / -1' }}>
                    <label><FolderOpen size={12} style={{ verticalAlign: -1 }} /> Against project</label>
                    <select className="wt-select" value={f.project_id} onChange={(e) => set('project_id', e.target.value)}>
                      <option value="">Not linked to a project</option>
                      {client.projects.map((p) => <option key={p.code} value={p.code}>{p.code} — {p.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* ── items ── */}
              <div>
                <div className="wt-sec-title" style={{ marginBottom: 8 }}>Items</div>
                {f.lines.length > 0 && (
                  <table className="wt-tbl">
                    <thead><tr>
                      <th style={{ width: 84 }}>Code</th><th>Description</th>
                      <th style={{ width: 60 }}>Qty</th><th style={{ width: 96 }}>Rate</th>
                      <th style={{ width: 96, textAlign: 'right' }}>Amount</th><th style={{ width: 36 }} />
                    </tr></thead>
                    <tbody>
                      {f.lines.map((l, i) => (
                        <tr key={i}>
                          <td><input className="wt-input sm" value={l.code || ''} onChange={(e) => setLine(i, 'code', e.target.value)} /></td>
                          <td><input className="wt-input sm" value={l.name || ''} onChange={(e) => setLine(i, 'name', e.target.value)} placeholder="What is being charged" /></td>
                          <td><input className="wt-input sm" type="number" min="1" value={l.qty} onChange={(e) => setLine(i, 'qty', e.target.value)} /></td>
                          <td><input className="wt-input sm" type="number" min="0" value={l.unit_price} onChange={(e) => setLine(i, 'unit_price', e.target.value)} /></td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{bdt(Number(l.unit_price || 0) * (Number(l.qty) || 1))}</td>
                          <td><button className="wt-iconbtn" onClick={() => delLine(i)}><Trash2 size={13} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
                  <label className="wt-search" style={{ width: 260 }}>
                    <Search /><input value={catQ} onChange={(e) => setCatQ(e.target.value)} placeholder="Add from the price schedule…" />
                  </label>
                  <button className="wt-btn sm" onClick={() => addLine()}>
                    <Plus size={13} /> Manual line
                  </button>
                </div>
                {catQ && (
                  <div className="wt-lookup" style={{ marginTop: 8, maxHeight: 180 }}>
                    {catalog.slice(0, 8).map((c) => (
                      <button key={c.code} className="wt-lookup-item"
                        onClick={() => { addLine({ code: c.code, name: c.name, description: '', qty: 1, unit: c.unit, unit_price: c.standard_price, group: c.group }); setCatQ(''); }}>
                        <span style={{ flex: '1 0 0', minWidth: 0 }}>
                          <span className="nm">{c.name}</span><span className="mt">{c.code}{c.unit ? ` · ${c.unit}` : ''}</span>
                        </span>
                        <span style={{ fontWeight: 700, fontSize: 12 }}>{bdt(c.standard_price)}</span>
                      </button>
                    ))}
                    {!catalog.length && <div style={{ padding: 12, fontSize: 12.5, color: 'var(--wt-muted)' }}>Nothing in the schedule matches.</div>}
                  </div>
                )}
              </div>

              {/* ── adjustments & terms ── */}
              <div>
                <div className="wt-sec-title" style={{ marginBottom: 8 }}>Adjustments &amp; terms</div>
                <div className="wt-grid3">
                  <div className="wt-field"><label>Discount (৳)</label>
                    <input className="wt-input" type="number" min="0" value={f.discount} onChange={(e) => set('discount', e.target.value)} /></div>
                  <div className="wt-field" style={{ gridColumn: 'span 2' }}><label>Reason for the discount</label>
                    <input className="wt-input" value={f.discount_note} onChange={(e) => set('discount_note', e.target.value)}
                      placeholder="Shown on the invoice beside the discount" /></div>
                  <div className="wt-field"><label>Transport (৳)</label>
                    <input className="wt-input" type="number" min="0" value={f.transport} onChange={(e) => set('transport', e.target.value)} /></div>
                  <div className="wt-field"><label>Government fees (৳)</label>
                    <input className="wt-input" type="number" min="0" value={f.govt_fees} onChange={(e) => set('govt_fees', e.target.value)} /></div>
                  <div className="wt-field"><label>Other charges (৳)</label>
                    <input className="wt-input" type="number" min="0" value={f.other_charges} onChange={(e) => set('other_charges', e.target.value)} /></div>
                  <div className="wt-field"><label>VAT (%)</label>
                    <input className="wt-input" type="number" min="0" value={f.vat_percent} onChange={(e) => set('vat_percent', e.target.value)} /></div>
                  <div className="wt-field"><label>Advance already paid (৳)</label>
                    <input className="wt-input" type="number" min="0" value={f.advance_applied} onChange={(e) => set('advance_applied', e.target.value)} /></div>
                  <div className="wt-field"><label>Advance note</label>
                    <input className="wt-input" value={f.advance_note} onChange={(e) => set('advance_note', e.target.value)}
                      placeholder="e.g. Advance received on signing" /></div>
                  <div className="wt-field" style={{ gridColumn: '1 / -1' }}><label>Payment terms</label>
                    <input className="wt-input" value={f.payment_terms} onChange={(e) => set('payment_terms', e.target.value)} /></div>
                  <div className="wt-field" style={{ gridColumn: '1 / -1' }}><label>Notes shown on the invoice</label>
                    <textarea className="wt-input" rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></div>
                </div>
              </div>
            </div>

            {/* ── running total ── */}
            <div className="wt-card" style={{ padding: 16, position: 'sticky', top: 0 }}>
              <div className="wt-sec-title" style={{ marginBottom: 10 }}>Total</div>
              <div className="wt-costrow"><span>Subtotal</span><span>{bdt(totals.subtotal)}</span></div>
              {Number(f.discount) > 0 && <div className="wt-costrow"><span style={{ color: 'var(--wt-green)' }}>Discount</span><span style={{ color: 'var(--wt-green)' }}>− {bdt(f.discount)}</span></div>}
              {Number(f.transport) > 0 && <div className="wt-costrow"><span>Transport</span><span>{bdt(f.transport)}</span></div>}
              {Number(f.govt_fees) > 0 && <div className="wt-costrow"><span>Government fees</span><span>{bdt(f.govt_fees)}</span></div>}
              {Number(f.other_charges) > 0 && <div className="wt-costrow"><span>Other</span><span>{bdt(f.other_charges)}</span></div>}
              <div className="wt-costrow"><span>VAT ({f.vat_percent || 0}%)</span><span>{bdt(totals.vat)}</span></div>
              <div className="wt-costrow total"><span>Invoice total</span><span className="amt">{bdt(totals.amount)}</span></div>
              {totals.advance > 0 && (
                <>
                  <div className="wt-costrow"><span style={{ color: 'var(--wt-green)' }}>Less advance</span><span style={{ color: 'var(--wt-green)' }}>− {bdt(totals.advance)}</span></div>
                  <div className="wt-costrow total"><span>Balance due</span><span className="amt">{bdt(totals.outstanding)}</span></div>
                </>
              )}
              <div style={{ fontSize: 11.5, color: 'var(--wt-muted)', marginTop: 12, lineHeight: 1.55 }}>
                {f.lines.length} item{f.lines.length === 1 ? '' : 's'}. Saved as a draft — nothing is sent
                until you issue it from the invoice file.
              </div>
            </div>
          </div>
        </div>

        <div className="wt-modal-foot">
          <button className="wt-btn" onClick={onClose}>Cancel</button>
          <span style={{ marginLeft: 'auto', fontSize: 12.5, fontWeight: 700 }}>{bdt(totals.amount)}</span>
          <button className="wt-btn primary" disabled={saving || !client || !f.lines.length} onClick={submit}>
            {saving ? <Loader2 size={14} className="wt-spin" /> : <Check size={14} />} Create draft
          </button>
        </div>
      </div>
    </div>
  );
}
