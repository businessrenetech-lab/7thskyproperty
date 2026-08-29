import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Check, X, Plus, Trash2, Loader2, FileSignature, ShieldCheck,
  AlertTriangle, ClipboardList, ArrowRight,
} from 'lucide-react';
import api from '../../services/api';
import { useSvcNav, WtHead, Loading, EmptyState, bdt, dateFmt, toast, errText } from './common';

/*
 * Direct quotation — Sec. 7 Step 5, "the job is well enough understood to price".
 * No site assessment behind it: pick the client, pick the services, done.
 *
 * The agreement question this screen has to answer: Clause 1 makes the Customer
 * Service Agreement the umbrella for the engagement, with each job's specifics
 * confirmed in the quotation and work order. So a client who has already signed
 * does NOT sign again — but that is the operator's call to make knowingly, so
 * the screen states the position and asks.
 */

const initials = (n) => String(n || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const VAT_RATE = 0.05;

export default function QuotationDirect() {
  const nav = useSvcNav();
  const [ref, setRef] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const [cq, setCq] = useState('');
  const [hits, setHits] = useState({ water_tank: [], contacts: [] });
  const [searching, setSearching] = useState(false);
  const [position, setPosition] = useState(null);
  const [choice, setChoice] = useState('');

  const [f, setF] = useState({
    client_name: '', client_code: '', site_address: '', project_id: '',
    lines: [], provider_allocation_fee: '', discount: '', vat_exempt: false,
    validity: '15 Days', payment_terms: '50% advance, balance on completion',
    advance_basis: 'percent', advance_percent: 50, advance_amount: '',
    notes: '', draft_work_order: true,
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const [catQ, setCatQ] = useState('');

  useEffect(() => {
    // The invoice reference already exposes the water-tank price schedule.
    api.get('/wt-invoices/reference')
      .then((r) => setRef(r.data))
      .catch((e) => setErr(errText(e, 'Could not load the price schedule')))
      .finally(() => setLoading(false));
  }, []);

  const runLookup = useCallback((term) => {
    if (term.trim().length < 2) { setHits({ water_tank: [], contacts: [] }); setSearching(false); return; }
    setSearching(true);
    api.get('/wt-projects/client-lookup', { params: { q: term } })
      .then((r) => setHits(r.data)).catch(() => setHits({ water_tank: [], contacts: [] }))
      .finally(() => setSearching(false));
  }, []);
  useEffect(() => { const t = setTimeout(() => runLookup(cq), 220); return () => clearTimeout(t); }, [cq, runLookup]);

  /* Choosing a client answers the agreement question. */
  const useClient = async (c) => {
    setF((s) => ({
      ...s, client_name: c.name || '', client_code: c.code || '',
      site_address: c.service_address || '',
    }));
    setCq('');
    try {
      const { data } = await api.get('/wt-quotes/agreement-position', { params: { client: c.code, name: c.name } });
      setPosition(data);
      // Pre-select what the SOP would do, but leave it visible and changeable.
      setChoice((data.options || []).find((o) => o.recommended)?.key || '');
    } catch { setPosition(null); }
  };

  const catalog = (ref?.catalog || []).filter((c) => !catQ
    || [c.code, c.name].some((v) => String(v || '').toLowerCase().includes(catQ.toLowerCase())));
  const chosen = new Set(f.lines.map((l) => l.code));

  // Group the whole price schedule so an operator can browse and tick services
  // straight from the list instead of searching for them one at a time.
  const CAT_LABEL = { service: 'Services', material: 'Materials', labour: 'Labour' };
  const grouped = catalog.reduce((m, c) => { const k = c.group || 'service'; (m[k] ||= []).push(c); return m; }, {});
  const groupOrder = ['service', 'material', 'labour',
    ...Object.keys(grouped).filter((k) => !['service', 'material', 'labour'].includes(k))];
  const totalCatalog = (ref?.catalog || []).length;
  const selectedCount = f.lines.filter((l) => l.kind !== 'fee').length;

  const addLine = (c) => setF((s) => ({
    ...s,
    lines: [...s.lines, { kind: 'service', code: c.code, name: c.name, unit: c.unit, qty: 1, price: c.standard_price, standard_price: c.standard_price }],
  }));
  const addFee = () => setF((s) => ({ ...s, lines: [...s.lines, { kind: 'fee', code: '', name: '', qty: 1, price: '' }] }));
  const setLine = (i, k, v) => setF((s) => ({ ...s, lines: s.lines.map((l, j) => (j === i ? { ...l, [k]: v } : l)) }));
  const delLine = (i) => setF((s) => ({ ...s, lines: s.lines.filter((_, j) => j !== i) }));
  const removeByCode = (code) => setF((s) => ({ ...s, lines: s.lines.filter((l) => !(l.kind !== 'fee' && l.code === code)) }));

  const totals = useMemo(() => {
    const lt = (l) => Number(l.price || 0) * (Number(l.qty) || 1);
    const services = f.lines.filter((l) => l.kind !== 'fee');
    const fees = f.lines.filter((l) => l.kind === 'fee');
    const service_charges = services.reduce((s, l) => s + lt(l), 0);
    const other_fees = fees.reduce((s, l) => s + lt(l), 0);
    const alloc = Number(f.provider_allocation_fee || 0);
    const disc = Number(f.discount || 0);
    const net = Math.max(0, service_charges + other_fees + alloc - disc);
    const vat = f.vat_exempt ? 0 : Math.round(net * VAT_RATE * 100) / 100;
    const total = net + vat;
    const raw = f.advance_basis === 'amount'
      ? Number(f.advance_amount || 0)
      : Math.round((total * Number(f.advance_percent || 0)) / 100);
    const advance = Math.max(0, Math.min(raw, total));
    return {
      service_charges, other_fees, alloc, disc, vat, total,
      advance, advance_pct: total > 0 ? Math.round((advance / total) * 1000) / 10 : 0,
      balance: Math.round((total - advance) * 100) / 100,
    };
  }, [f]);

  const submit = async () => {
    if (!f.client_name) { setErr('Choose a client.'); return; }
    if (!f.lines.length) { setErr('Add at least one service.'); return; }
    setSaving(true); setErr('');
    try {
      const { data } = await api.post('/wt-quotes/direct', {
        ...f,
        lines: f.lines.map((l) => ({ ...l, price: Number(l.price || 0), qty: Number(l.qty) || 1 })),
        provider_allocation_fee: Number(f.provider_allocation_fee || 0),
        discount: Number(f.discount || 0),
        agreement_choice: choice,
        draft_work_order: f.draft_work_order,
      });
      const bits = [`Quotation ${data.quote.code} created`];
      if (data.work_order) bits.push(`work order ${data.work_order.code} drafted`);
      toast.ok(bits.join(' — '));
      // A client with no agreement gets sent to raise one; otherwise open the quote.
      if (choice === 'new') nav(`/water-tank/quotations/${data.quote.code}/agreement`);
      else nav(`/water-tank/quotations/${data.quote.code}`);
    } catch (e) { setErr(errText(e, 'Could not create the quotation')); setSaving(false); }
  };

  if (loading) return <Loading />;

  return (
    <>
      <WtHead
        crumb={<div className="wt-crumb">
          <span className="lnk" onClick={() => nav('/water-tank/quotations')}>Quotations</span>
          {' › '}<span style={{ color: 'var(--wt-accent-ink)' }}>New quotation</span>
        </div>}
        title="New Quotation"
        subtitle="Sec. 7 Step 5 — price the job directly, without a site assessment"
      >
        <button className="wt-btn" onClick={() => nav('/water-tank/quotations')}><X size={14} /> Cancel</button>
        <button className="wt-btn primary" disabled={saving || !f.client_name || !f.lines.length} onClick={submit}>
          {saving ? <Loader2 size={14} className="wt-spin" /> : <Check size={14} />} Create quotation
        </button>
      </WtHead>

      {err && <div className="wt-formerr" style={{ marginBottom: 14 }}>{err}</div>}

      <div className="wt-split">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ── client ── */}
          <div className="wt-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="wt-sec-title">Client</div>
            {f.client_name ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="wt-avatar">{initials(f.client_name)}</span>
                <div style={{ flex: '1 0 0' }}>
                  <strong>{f.client_name}</strong>
                  <div style={{ fontSize: 11.5, color: 'var(--wt-muted)' }}>{[f.client_code, f.site_address].filter(Boolean).join(' · ')}</div>
                </div>
                <button className="wt-btn sm" onClick={() => { setF((s) => ({ ...s, client_name: '', client_code: '' })); setPosition(null); setChoice(''); }}>Change</button>
              </div>
            ) : (
              <>
                <label className="wt-search" style={{ width: '100%', maxWidth: 460 }}>
                  <Search />
                  <input autoFocus value={cq} onChange={(e) => setCq(e.target.value)} placeholder="Search the client book…" />
                  {searching && <Loader2 size={14} className="wt-spin" />}
                </label>
                {cq.trim().length >= 2 && (
                  <div className="wt-lookup">
                    {(hits.water_tank || []).map((c) => (
                      <button key={c.id} className="wt-lookup-item" onClick={() => useClient(c)}>
                        <span className="av">{initials(c.name)}</span>
                        <span style={{ flex: '1 0 0', minWidth: 0 }}>
                          <span className="nm">{c.name}</span>
                          <span className="mt">{[c.code, c.mobile, c.district].filter(Boolean).join(' · ')}</span>
                        </span>
                        <span style={{ fontSize: 11.5, color: 'var(--wt-accent-ink)', fontWeight: 700 }}>Use →</span>
                      </button>
                    ))}
                    {!searching && !(hits.water_tank || []).length && (
                      <EmptyState eyebrow="No match" title={`Nobody matches “${cq.trim()}”`}
                        hint="A direct quotation needs an existing client. Register them from the Clients screen first." />
                    )}
                  </div>
                )}
              </>
            )}
            <div className="wt-field"><label>Service address</label>
              <input className="wt-input" value={f.site_address} onChange={(e) => set('site_address', e.target.value)} /></div>
          </div>

          {/* ── the agreement question ── */}
          {position && (
            <div className="wt-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="wt-sec-title">Customer Service Agreement</div>
              {position.has_signed_agreement ? (
                <div className="wt-note">
                  <ShieldCheck size={15} />
                  <span>
                    <strong>{position.agreement_code}</strong> is signed
                    {position.signed_date ? ` (${dateFmt(position.signed_date)})` : ''}.
                    Clause 1 makes it the umbrella for the engagement — this quotation and its work
                    order confirm the specifics, so a new signature is not required.
                  </span>
                </div>
              ) : (
                <div className="wt-warn">
                  <AlertTriangle size={15} />
                  No signed agreement on file for this client. Sec. 7 Step 6 requires one before work commences.
                </div>
              )}
              <div className="wt-choices">
                {(position.options || []).map((o) => (
                  <button key={o.key} className={`wt-choice${choice === o.key ? ' on' : ''}`} onClick={() => setChoice(o.key)}>
                    {o.key === 'continue' ? <ArrowRight size={18} /> : <FileSignature size={18} />}
                    <span className="t">{o.label}{o.recommended ? ' · recommended' : ''}</span>
                    <span className="h">{o.detail}</span>
                  </button>
                ))}
              </div>
              <label className="wt-toggle">
                <input type="checkbox" checked={f.draft_work_order} onChange={(e) => set('draft_work_order', e.target.checked)} />
                <ClipboardList size={15} /> Draft the work order as soon as the quotation is created
              </label>
              <div style={{ fontSize: 11.5, color: 'var(--wt-muted)' }}>
                The work order is created as a <strong>Draft</strong> — nothing is dispatched to a provider
                until you issue it from the work order file.
              </div>
            </div>
          )}

          {/* ── services ── */}
          <div className="wt-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div className="wt-sec-title" style={{ margin: 0 }}>Services</div>
              <span style={{ fontSize: 11.5, color: 'var(--wt-muted)' }}>{selectedCount} of {totalCatalog} selected</span>
            </div>

            {f.lines.length > 0 && (
              <table className="wt-tbl">
                <thead><tr><th style={{ width: 90 }}>Code</th><th>Item</th><th style={{ width: 70 }}>Qty</th><th style={{ width: 110 }}>Price</th><th style={{ width: 110, textAlign: 'right' }}>Total</th><th style={{ width: 40 }} /></tr></thead>
                <tbody>
                  {f.lines.map((l, i) => (
                    <tr key={i}>
                      <td>{l.kind === 'fee'
                        ? <input className="wt-input sm" value={l.code || ''} onChange={(e) => setLine(i, 'code', e.target.value)} />
                        : <span className="id">{l.code}</span>}</td>
                      <td>{l.kind === 'fee'
                        ? <input className="wt-input sm" value={l.name || ''} onChange={(e) => setLine(i, 'name', e.target.value)} placeholder="Additional fee" />
                        : l.name}</td>
                      <td><input className="wt-input sm" type="number" min="1" value={l.qty} onChange={(e) => setLine(i, 'qty', e.target.value)} /></td>
                      <td><input className="wt-input sm" type="number" min="0" value={l.price} onChange={(e) => setLine(i, 'price', e.target.value)} /></td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{bdt(Number(l.price || 0) * (Number(l.qty) || 1))}</td>
                      <td><button className="wt-iconbtn" onClick={() => delLine(i)}><Trash2 size={13} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <label className="wt-search" style={{ flex: '1 1 240px' }}>
                <Search /><input value={catQ} onChange={(e) => setCatQ(e.target.value)} placeholder="Filter the price schedule…" />
              </label>
              <button className="wt-btn sm" onClick={addFee}><Plus size={13} /> Additional fee</button>
            </div>

            {/* The whole price schedule, grouped and tickable — click to add, click again to remove. */}
            <div className="wt-lookup" style={{ maxHeight: 380 }}>
              {groupOrder.map((key) => {
                const rows = grouped[key] || [];
                if (!rows.length) return null;
                return (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--wt-muted)', fontWeight: 800, padding: '4px 2px 0' }}>
                      {CAT_LABEL[key] || key} · {rows.length}
                    </div>
                    {rows.map((c) => {
                      const on = chosen.has(c.code);
                      return (
                        <button
                          key={c.code}
                          className="wt-lookup-item"
                          onClick={() => (on ? removeByCode(c.code) : addLine(c))}
                          style={on ? { borderColor: 'var(--wt-accent)', background: 'var(--wt-accent-tint)' } : undefined}
                        >
                          <span style={{ display: 'grid', placeItems: 'center', width: 20, flex: 'none', color: on ? 'var(--wt-accent-ink)' : 'var(--wt-muted)' }}>
                            {on ? <Check size={15} /> : <Plus size={14} />}
                          </span>
                          <span style={{ flex: '1 0 0', minWidth: 0 }}>
                            <span className="nm">{c.name}</span>
                            <span className="mt">{c.code}{c.unit ? ` · ${c.unit}` : ''}</span>
                          </span>
                          <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--wt-ink)' }}>
                            {c.standard_price > 0 ? bdt(c.standard_price) : 'On quote'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
              {!catalog.length && (
                <EmptyState eyebrow="No match"
                  title={catQ ? `Nothing matches “${catQ.trim()}”` : 'The price schedule is empty'}
                  hint={catQ ? 'Clear the filter to see the full list.' : 'Add items on the Price Schedule screen first.'} />
              )}
            </div>
          </div>

          {/* ── terms ── */}
          <div className="wt-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="wt-sec-title">Terms</div>
            <div className="wt-grid3">
              <div className="wt-field"><label>Provider allocation fee (৳)</label>
                <input className="wt-input" type="number" value={f.provider_allocation_fee} onChange={(e) => set('provider_allocation_fee', e.target.value)} /></div>
              <div className="wt-field"><label>Discount (৳)</label>
                <input className="wt-input" type="number" value={f.discount} onChange={(e) => set('discount', e.target.value)} /></div>
              <div className="wt-field"><label>VAT</label>
                <label className="wt-toggle"><input type="checkbox" checked={f.vat_exempt} onChange={(e) => set('vat_exempt', e.target.checked)} />
                  <span>{f.vat_exempt ? 'Exempt' : `Charged at ${VAT_RATE * 100}%`}</span></label></div>
              <div className="wt-field"><label>Validity</label>
                <input className="wt-input" value={f.validity} onChange={(e) => set('validity', e.target.value)} /></div>
              <div className="wt-field"><label>Advance</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <select className="wt-select" style={{ width: 78 }} value={f.advance_basis} onChange={(e) => set('advance_basis', e.target.value)}>
                    <option value="percent">%</option><option value="amount">৳</option>
                  </select>
                  {f.advance_basis === 'percent'
                    ? <input className="wt-input" type="number" min="0" max="100" value={f.advance_percent} onChange={(e) => set('advance_percent', e.target.value)} />
                    : <input className="wt-input" type="number" min="0" value={f.advance_amount} onChange={(e) => set('advance_amount', e.target.value)} />}
                </div></div>
              <div className="wt-field" style={{ gridColumn: '1 / -1' }}><label>Payment terms</label>
                <input className="wt-input" value={f.payment_terms} onChange={(e) => set('payment_terms', e.target.value)} /></div>
              <div className="wt-field" style={{ gridColumn: '1 / -1' }}><label>Notes</label>
                <textarea className="wt-input" rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></div>
            </div>
          </div>
        </div>

        {/* ── totals ── */}
        <div className="wt-card" style={{ padding: 18, alignSelf: 'start', position: 'sticky', top: 20 }}>
          <div className="wt-sec-title" style={{ marginBottom: 12 }}>Quotation total</div>
          <div className="wt-costrow"><span>Service charges</span><span>{bdt(totals.service_charges)}</span></div>
          {totals.other_fees > 0 && <div className="wt-costrow"><span>Additional fees</span><span>{bdt(totals.other_fees)}</span></div>}
          {totals.alloc > 0 && <div className="wt-costrow"><span>Provider allocation</span><span>{bdt(totals.alloc)}</span></div>}
          {totals.disc > 0 && <div className="wt-costrow"><span style={{ color: 'var(--wt-green)' }}>Discount</span><span style={{ color: 'var(--wt-green)' }}>− {bdt(totals.disc)}</span></div>}
          <div className="wt-costrow"><span>VAT</span><span>{f.vat_exempt ? 'Exempt' : bdt(totals.vat)}</span></div>
          <div className="wt-costrow total"><span>Total Payable</span><span className="amt">{bdt(totals.total)}</span></div>
          <div className="wt-costrow" style={{ marginTop: 6 }}>
            <span style={{ fontWeight: 700 }}>Advance ({totals.advance_pct}%)</span>
            <span style={{ fontWeight: 700 }}>{bdt(totals.advance)}</span>
          </div>
          <div className="wt-costrow"><span>Balance on completion</span><span>{bdt(totals.balance)}</span></div>

          <div className="wt-note" style={{ marginTop: 14 }}>
            On create: the quotation is registered
            {f.draft_work_order && position?.has_signed_agreement ? ', and the work order is drafted' : ''}
            {choice === 'new' ? ', then you go straight to raising the agreement' : ''}.
          </div>
        </div>
      </div>
    </>
  );
}
