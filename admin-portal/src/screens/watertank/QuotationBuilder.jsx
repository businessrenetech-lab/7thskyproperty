import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Search, Plus, X, Check, Save, Download, Mail, FileSignature, Loader2,
  RotateCcw, Sparkles, Eye, ChevronRight,
} from 'lucide-react';
import api from '../../services/api';
import { WtHead, Loading, EmptyState, bdt, toast, errText } from './common';
import QuotationSendDrawer from './QuotationSend';

/*
 * Quotation builder — SSPC-WTCM-SOP-01 Sec. 7 Step 5.
 * Built from a site assessment: the assessor's recommendations come through
 * pre-matched to the Customer Service Agreement price schedule, every line's
 * price is editable, and anything not in the catalogue can be added as a fee.
 */

const VAT_RATE = 0.05;
const lineTotal = (l) => Number(l.price || 0) * (Number(l.qty) || 1);

export default function QuotationBuilder() {
  const { code } = useParams();
  const nav = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lines, setLines] = useState([]);
  const [terms, setTerms] = useState({
    provider_allocation_fee: '', discount: '', vat_exempt: false,
    validity: '15 Days', payment_terms: '50% advance, balance on completion', notes: '',
    advance_percent: 50, advance_amount: '', advance_basis: 'percent',
  });
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('');
  const [saving, setSaving] = useState(false);
  const [quote, setQuote] = useState(null);
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.get(`/wt-quotes/builder/${code}`)
      .then(({ data: d }) => {
        setData(d);
        const ex = d.existing_quotation;
        if (ex) {
          setQuote(ex);
          const parsed = Array.isArray(ex.lines) ? ex.lines : (() => { try { return JSON.parse(ex.lines || '[]'); } catch { return []; } })();
          setLines(parsed);
          setTerms({
            provider_allocation_fee: ex.provider_allocation_fee || '', discount: ex.discount || '',
            vat_exempt: !!ex.vat_exempt, validity: ex.validity || '15 Days',
            payment_terms: ex.payment_terms || '', notes: ex.notes || '',
            advance_basis: ex.advance_basis || 'percent',
            advance_percent: ex.advance_percent != null ? Number(ex.advance_percent) : 50,
            advance_amount: ex.advance_amount != null ? Number(ex.advance_amount) : '',
          });
        } else {
          // pre-select what the assessor recommended, priced from the schedule
          const seeded = (d.recommended || []).filter((r) => r.match).map((r) => ({
            kind: 'service', code: r.match.code, name: r.match.name, unit: r.match.unit,
            price: r.match.standard_price, standard_price: r.match.standard_price, qty: 1,
          }));
          const varLines = (d.variations || []).map((v) => ({
            kind: 'fee', code: '', name: v.label, description: v.reason || null,
            price: v.estimate || 0, standard_price: 0, qty: 1,
          }));
          setLines([...seeded, ...varLines]);
        }
      })
      .catch((e) => setError(errText(e, 'Could not load the quotation builder')))
      .finally(() => setLoading(false));
  }, [code]);
  useEffect(load, [load]);

  const totals = useMemo(() => {
    const services = lines.filter((l) => l.kind !== 'fee');
    const fees = lines.filter((l) => l.kind === 'fee');
    const service_charges = services.reduce((s, l) => s + lineTotal(l), 0);
    const other_fees = fees.reduce((s, l) => s + lineTotal(l), 0);
    const alloc = Number(terms.provider_allocation_fee || 0);
    const disc = Number(terms.discount || 0);
    const net = Math.max(0, service_charges + other_fees + alloc - disc);
    const vat = terms.vat_exempt ? 0 : Math.round(net * VAT_RATE * 100) / 100;
    const total = net + vat;
    /*
     * Advance / deposit. Whichever of the two figures the operator set wins; the
     * other follows the total, so the advance never drifts as lines are edited.
     * This is the same number the Customer Service Agreement quotes — free-text
     * payment terms could never be computed from, which is why the two documents
     * used to disagree.
     */
    const byAmount = terms.advance_basis === 'amount';
    const rawAdvance = byAmount
      ? Number(terms.advance_amount || 0)
      : Math.round((total * Number(terms.advance_percent || 0)) / 100);
    const advance = Math.max(0, Math.min(rawAdvance, total));
    const advance_pct = total > 0 ? Math.round((advance / total) * 1000) / 10 : 0;
    return {
      service_charges, other_fees, alloc, disc, vat, total,
      advance, advance_pct, balance: Math.round((total - advance) * 100) / 100,
    };
  }, [lines, terms]);

  const catalog = data?.catalog || [];
  const chosen = new Set(lines.filter((l) => l.kind !== 'fee').map((l) => l.code));
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return catalog.filter((c) => (!group || c.group === group)
      && (!term || [c.code, c.name, c.description].some((v) => String(v || '').toLowerCase().includes(term))));
  }, [catalog, q, group]);

  const addService = (c) => {
    if (chosen.has(c.code)) { toast.info(`${c.name} is already on the quotation.`); return; }
    setLines((s) => [...s, {
      kind: 'service', code: c.code, name: c.name, unit: c.unit,
      price: c.standard_price, standard_price: c.standard_price, qty: 1, description: c.description,
    }]);
  };
  const addFee = () => setLines((s) => [...s, { kind: 'fee', code: '', name: '', price: '', standard_price: 0, qty: 1 }]);
  const setLine = (i, k, v) => setLines((s) => s.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const delLine = (i) => setLines((s) => s.filter((_, j) => j !== i));
  const resetPrice = (i) => setLines((s) => s.map((l, j) => (j === i ? { ...l, price: l.standard_price } : l)));

  const save = async ({ silent } = {}) => {
    if (!lines.length) { toast.err('Add at least one service or fee.'); return null; }
    setSaving(true);
    try {
      const { data: saved } = await api.post(`/wt-quotes/from-assessment/${code}`, {
        lines: lines.map((l) => ({ ...l, price: Number(l.price || 0), qty: Number(l.qty) || 1 })),
        provider_allocation_fee: Number(terms.provider_allocation_fee || 0),
        discount: Number(terms.discount || 0),
        vat_exempt: terms.vat_exempt,
        validity: terms.validity, payment_terms: terms.payment_terms, notes: terms.notes,
        // structured advance so the agreement can reuse the exact same figure
        advance_basis: terms.advance_basis,
        advance_percent: totals.advance_pct,
        advance_amount: totals.advance,
      });
      setQuote(saved);
      if (!silent) toast.ok(`Quotation ${saved.code} saved — ${bdt(saved.total)}`);
      return saved;
    } catch (e) { toast.err(errText(e, 'Could not save the quotation')); return null; }
    finally { setSaving(false); }
  };

  /** Renders the server's branded HTML into a PDF blob in the browser. */
  const buildPdf = async (quoteId) => {
    const { data: doc } = await api.get(`/wt-quotes/${quoteId}/document`);
    const { default: html2pdf } = await import('html2pdf.js');
    const holder = document.createElement('div');
    holder.style.width = '794px';
    holder.innerHTML = doc.html;
    document.body.appendChild(holder);
    try {
      return await html2pdf().set({
        margin: [10, 10, 12, 10],
        filename: `Quotation-${doc.quote.code}.pdf`,
        image: { type: 'jpeg', quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(holder).outputPdf('blob');
    } finally { document.body.removeChild(holder); }
  };

  const download = async () => {
    const saved = quote || await save({ silent: true });
    if (!saved) return;
    setDownloading(true);
    try {
      const blob = await buildPdf(saved.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `Quotation-${saved.code}.pdf`; a.click();
      URL.revokeObjectURL(url);
      toast.ok('Quotation PDF downloaded');
    } catch (e) { toast.err(errText(e, 'Could not build the PDF')); }
    finally { setDownloading(false); }
  };

  const openSend = async () => {
    const saved = quote || await save({ silent: true });
    if (saved) setSending(true);
  };

  const preview = async () => {
    const saved = quote || await save({ silent: true });
    if (!saved) return;
    try {
      const { data: doc } = await api.get(`/wt-quotes/${saved.id}/document`);
      const w = window.open('', '_blank');
      if (w) { w.document.write(doc.html); w.document.close(); }
      else toast.err('Allow pop-ups to preview the quotation.');
    } catch (e) { toast.err(errText(e)); }
  };

  if (loading) return <Loading />;
  if (error) return (
    <>
      <WtHead title="Quotation builder"
        crumb={<div className="wt-crumb"><span className="lnk" onClick={() => nav('/water-tank/site-assessments')}>Site Assessments</span></div>} />
      <div className="wt-card"><EmptyState eyebrow="Error" title="Could not open the builder" hint={error}
        action={<button className="wt-btn primary" onClick={load}>Retry</button>} /></div>
    </>
  );

  const a = data.assessment;
  const client = data.client;
  // reached from /quotations/:code/edit there is no assessment behind the quote
  const standalone = !a.code;
  const backTo = standalone
    ? { label: 'Quotations', to: '/water-tank/quotations' }
    : { label: 'Site Assessments', to: '/water-tank/site-assessments' };

  return (
    <>
      <WtHead
        crumb={<div className="wt-crumb">
          <span className="lnk" onClick={() => nav(backTo.to)}>{backTo.label}</span>
          {!standalone && <>{' › '}<span className="lnk" onClick={() => nav(`/water-tank/site-assessments/${a.code}`)}>{a.code}</span></>}
          {' › '}<span style={{ color: 'var(--wt-accent-ink)' }}>{quote ? quote.code : 'New quotation'}</span>
        </div>}
        title={quote ? `Quotation ${quote.code}` : 'Build Quotation'}
        subtitle={`${a.client_name}${client?.service_address ? ` · ${client.service_address}` : ''}`}
      >
        <button className="wt-btn" onClick={preview}><Eye size={14} /> Preview</button>
        <button className="wt-btn" disabled={saving} onClick={() => save()}>
          {saving ? <Loader2 size={14} className="wt-spin" /> : <Save size={14} />} Save
        </button>
      </WtHead>

      <div className="wt-quote">
        {/* ── catalogue picker ── */}
        <aside className="wt-quote-pick">
          <div className="wt-panel-head" style={{ marginBottom: 10 }}>
            <h2 className="wt-section-title">Price Schedule</h2>
            <span className="muted" style={{ fontSize: 11 }}>{catalog.length} items</span>
          </div>
          <label className="wt-search" style={{ width: '100%', marginBottom: 8 }}>
            <Search /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search services…" />
          </label>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
            <button className={`wt-chip${!group ? ' on' : ''}`} onClick={() => setGroup('')}>All</button>
            {(data.groups || []).map((g) => (
              <button key={g} className={`wt-chip${group === g ? ' on' : ''}`} onClick={() => setGroup(g)}>{g}</button>
            ))}
          </div>
          <div className="wt-quote-cat">
            {filtered.map((c) => (
              <button key={c.id} className={`wt-catitem${chosen.has(c.code) ? ' on' : ''}`} onClick={() => addService(c)}>
                <span className="cd">{c.code}</span>
                <span className="nm">{c.name}{c.unit ? <em> / {c.unit}</em> : null}</span>
                <span className="pr">{c.standard_price > 0 ? bdt(c.standard_price) : 'On quote'}</span>
                {chosen.has(c.code) ? <Check size={13} style={{ color: 'var(--wt-green)', flex: 'none' }} /> : <Plus size={13} style={{ color: 'var(--wt-muted)', flex: 'none' }} />}
              </button>
            ))}
            {!filtered.length && <div className="muted" style={{ fontSize: 12.5, padding: 16, textAlign: 'center' }}>
              {catalog.length ? 'Nothing matches that search.' : 'No catalogue items seeded for water_tank_csa.'}
            </div>}
          </div>
        </aside>

        {/* ── the quotation ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          {data.recommended?.length > 0 && !quote && (
            <div className="wt-note">
              <Sparkles size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
              Pre-filled from the assessment: {data.recommended.filter((r) => r.match).length} recommended service(s)
              {data.variations?.length ? ` and ${data.variations.length} variation(s)` : ''}.
              {data.recommended.some((r) => !r.match) && (
                <> Not in the schedule: <strong>{data.recommended.filter((r) => !r.match).map((r) => r.label).join(', ')}</strong> — add these as fees.</>
              )}
            </div>
          )}

          <div className="wt-card wt-tblcard">
            <table className="wt-tbl">
              <thead><tr>
                <th style={{ width: 88 }}>Code</th><th>Description</th><th style={{ width: 92 }}>Unit</th>
                <th style={{ width: 64 }}>Qty</th><th style={{ width: 130 }}>Rate</th>
                <th style={{ width: 108, textAlign: 'right' }}>Amount</th><th style={{ width: 36 }} />
              </tr></thead>
              <tbody>
                {lines.map((l, i) => {
                  const edited = Number(l.standard_price) > 0 && Number(l.price) !== Number(l.standard_price);
                  return (
                    <tr key={i}>
                      <td>
                        {l.kind === 'fee'
                          ? <input className="wt-input sm" value={l.code || ''} onChange={(e) => setLine(i, 'code', e.target.value)} placeholder="—" />
                          : <span className="id">{l.code}</span>}
                      </td>
                      <td>
                        {l.kind === 'fee'
                          ? <input className="wt-input sm" value={l.name} onChange={(e) => setLine(i, 'name', e.target.value)} placeholder="Fee or material description" />
                          : <><strong>{l.name}</strong>{l.description && <div className="cell-sub">{l.description}</div>}</>}
                      </td>
                      <td>
                        {l.kind === 'fee'
                          ? <input className="wt-input sm" value={l.unit || ''} onChange={(e) => setLine(i, 'unit', e.target.value)} placeholder="Unit" />
                          : <span className="muted">{l.unit || '—'}</span>}
                      </td>
                      <td><input className="wt-input sm" type="number" min="1" value={l.qty || 1} onChange={(e) => setLine(i, 'qty', e.target.value)} /></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input className="wt-input sm" type="number" value={l.price} onChange={(e) => setLine(i, 'price', e.target.value)} />
                          {edited && (
                            <button className="wt-iconbtn" title={`Reset to standard ${bdt(l.standard_price)}`} onClick={() => resetPrice(i)}>
                              <RotateCcw size={12} />
                            </button>
                          )}
                        </div>
                        {edited && <span className="cell-sub" style={{ color: 'var(--wt-accent-ink)' }}>Std {bdt(l.standard_price)}</span>}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{bdt(lineTotal(l))}</td>
                      <td><button className="wt-iconbtn" onClick={() => delLine(i)}><X size={14} /></button></td>
                    </tr>
                  );
                })}
                {!lines.length && <tr className="wt-empty-row"><td colSpan={7}>Pick services from the schedule on the left, or add a fee.</td></tr>}
              </tbody>
            </table>
            <div className="wt-tblfoot">
              <button className="wt-btn sm" onClick={addFee}><Plus size={13} /> Add other fee / material</button>
              <span style={{ marginLeft: 'auto' }}>{lines.length} line{lines.length === 1 ? '' : 's'}</span>
            </div>
          </div>

          {/* ── terms + totals ── */}
          <div className="wt-detail-grid" style={{ gridTemplateColumns: '1fr 320px' }}>
            <div className="wt-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="wt-sec-title">Terms</div>
              <div className="wt-grid2">
                <div className="wt-field"><label>Validity</label>
                  <input className="wt-input" value={terms.validity} onChange={(e) => setTerms((s) => ({ ...s, validity: e.target.value }))} /></div>
                <div className="wt-field"><label>Provider allocation fee (৳)</label>
                  <input className="wt-input" type="number" value={terms.provider_allocation_fee}
                    onChange={(e) => setTerms((s) => ({ ...s, provider_allocation_fee: e.target.value }))} /></div>
              </div>
              <div className="wt-grid2">
                <div className="wt-field"><label>Discount (৳)</label>
                  <input className="wt-input" type="number" value={terms.discount}
                    onChange={(e) => setTerms((s) => ({ ...s, discount: e.target.value }))} /></div>
                <div className="wt-field"><label>VAT</label>
                  <label className="wt-toggle" style={{ height: 36 }}>
                    <input type="checkbox" checked={terms.vat_exempt} onChange={(e) => setTerms((s) => ({ ...s, vat_exempt: e.target.checked }))} />
                    <span>{terms.vat_exempt ? 'Exempt' : `Charged at ${VAT_RATE * 100}%`}</span>
                  </label></div>
              </div>
              <div className="wt-field"><label>Payment terms</label>
                <input className="wt-input" value={terms.payment_terms} onChange={(e) => setTerms((s) => ({ ...s, payment_terms: e.target.value }))} /></div>

              {/* Advance / deposit — a figure, not a sentence, so the agreement can reuse it. */}
              <div className="wt-field">
                <label>Advance / deposit on acceptance</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select className="wt-select" style={{ width: 96 }} value={terms.advance_basis}
                    onChange={(e) => setTerms((s) => ({ ...s, advance_basis: e.target.value }))}>
                    <option value="percent">%</option>
                    <option value="amount">৳</option>
                  </select>
                  {terms.advance_basis === 'percent' ? (
                    <input className="wt-input" type="number" min="0" max="100" value={terms.advance_percent}
                      onChange={(e) => setTerms((s) => ({ ...s, advance_percent: e.target.value }))} />
                  ) : (
                    <input className="wt-input" type="number" min="0" value={terms.advance_amount}
                      onChange={(e) => setTerms((s) => ({ ...s, advance_amount: e.target.value }))} />
                  )}
                </div>
                <span className="hint">
                  {terms.advance_basis === 'percent'
                    ? `${terms.advance_percent || 0}% of the total — recalculates as lines change.`
                    : 'A fixed amount — the balance follows the total.'}
                </span>
              </div>
              <div className="wt-field"><label>Notes to the client</label>
                <textarea className="wt-input" rows={3} style={{ resize: 'vertical' }} value={terms.notes}
                  onChange={(e) => setTerms((s) => ({ ...s, notes: e.target.value }))} /></div>
            </div>

            <div className="wt-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10, alignSelf: 'start' }}>
              <div className="wt-sec-title">Quotation Total</div>
              <div className="wt-costrow"><span>Service charges</span><span>{bdt(totals.service_charges)}</span></div>
              {totals.other_fees > 0 && <div className="wt-costrow"><span>Additional fees</span><span>{bdt(totals.other_fees)}</span></div>}
              {totals.alloc > 0 && <div className="wt-costrow"><span>Provider allocation</span><span>{bdt(totals.alloc)}</span></div>}
              {totals.disc > 0 && <div className="wt-costrow"><span style={{ color: 'var(--wt-green)' }}>Discount</span><span style={{ color: 'var(--wt-green)' }}>− {bdt(totals.disc)}</span></div>}
              <div className="wt-costrow"><span>VAT &amp; processing</span><span>{terms.vat_exempt ? 'Exempt' : bdt(totals.vat)}</span></div>
              <div className="wt-costrow total"><span>Total Payable</span><span className="amt">{bdt(totals.total)}</span></div>
              <div className="wt-costrow" style={{ marginTop: 6 }}>
                <span style={{ fontWeight: 700, color: 'var(--wt-ink)' }}>Advance on acceptance ({totals.advance_pct}%)</span>
                <span style={{ fontWeight: 700, color: 'var(--wt-ink)' }}>{bdt(totals.advance)}</span>
              </div>
              <div className="wt-costrow">
                <span>Balance on completion</span><span>{bdt(totals.balance)}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 6 }}>
                <button className="wt-btn primary" style={{ justifyContent: 'center' }} disabled={saving || !lines.length} onClick={() => save()}>
                  {saving ? <Loader2 size={14} className="wt-spin" /> : <Save size={14} />} Save quotation
                </button>
                <button className="wt-btn" style={{ justifyContent: 'center' }} disabled={downloading || !lines.length} onClick={download}>
                  {downloading ? <Loader2 size={14} className="wt-spin" /> : <Download size={14} />} Download PDF
                </button>
                <button className="wt-btn" style={{ justifyContent: 'center' }} disabled={!lines.length} onClick={openSend}>
                  <Mail size={14} /> Email to client
                </button>
                {quote && (
                  <button className="wt-btn" style={{ justifyContent: 'center', borderColor: 'var(--wt-accent)', color: 'var(--wt-accent-ink)' }}
                    onClick={() => nav(standalone
                      ? `/water-tank/quotations/${quote.code}/agreement`
                      : `/water-tank/site-assessments/${a.code}/quotation/${quote.code}/agreement`)}>
                    <FileSignature size={14} /> Create Service Agreement <ChevronRight size={13} />
                  </button>
                )}
              </div>
              {quote?.sent_at && (
                <span className="cell-sub" style={{ textAlign: 'center' }}>Emailed to {quote.sent_to}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {sending && quote && (
        <QuotationSendDrawer
          quote={quote} client={client} buildPdf={() => buildPdf(quote.id)}
          onClose={() => setSending(false)}
          onSent={(to) => { setSending(false); setQuote((s) => ({ ...s, sent_at: new Date().toISOString(), sent_to: to })); }}
        />
      )}
    </>
  );
}
