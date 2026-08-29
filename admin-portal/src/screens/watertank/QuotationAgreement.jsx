import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileSignature, Send, Loader2, Eye, RefreshCw, Check, ExternalLink, Copy, Search,
} from 'lucide-react';
import api from '../../services/api';
import { WtHead, DatePicker, Loading, EmptyState, bdt, toast, errText } from './common';

/*
 * Customer Service Agreement, drafted from the quotation (Sec. 7 Step 6).
 * The agreement itself is built and sent by the existing /wt-agreements/customer
 * engine — this screen only pre-fills it from the quote, lets the operator edit
 * the draft, shows a live preview, and sends it for signature.
 */

export default function QuotationAgreement() {
  const params = useParams();
  // /site-assessments/:code/quotation/:quoteCode/agreement  or  /quotations/:code/agreement
  const quoteCode = params.quoteCode || params.code;
  const assessmentCode = params.quoteCode ? params.code : null;
  const nav = useNavigate();

  const [draft, setDraft] = useState(null);
  const [quote, setQuote] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(null);
  // AMC packages, billing cycles and live contracts come from the backend so the
  // agreement offers what actually exists rather than a hardcoded list.
  const [meta, setMeta] = useState({});
  const [catalog, setCatalog] = useState([]);
  const [catQ, setCatQ] = useState('');
  useEffect(() => {
    api.get('/wt-agreements/customer/meta').then((r) => setMeta(r.data || {})).catch(() => {});
    // The full price schedule, so services can be ticked on/off here instead of
    // only on the quotation — pre-selected from the quote, no re-adding.
    api.get('/wt-agreements/customer/catalog').then((r) => setCatalog(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.get(`/wt-quotes/${quoteCode}/agreement-draft`)
      .then(({ data }) => {
        // Normalise onto schedule_b — the only shape the agreement engine reads.
        // Older drafts carried property/project instead; fold them in so nothing
        // the server already knew is lost.
        const d0 = data.draft || {};
        setDraft({
          ...d0,
          // Both witness slots always exist so the inputs are controlled, and the
          // org block must exist for the countersigner fields to bind.
          witnesses: [0, 1].map((i) => ({ name: '', nid: '', email: '', ...(d0.witnesses?.[i] || {}) })),
          org: { name: 'Seventh Sky Property Care', represented_by: '', position: '', phone: '', email: '', ...(d0.org || {}) },
          // Residential unless the client record says otherwise — it drives which
          // party details the agreement asks for and prints.
          client_type: d0.client_type || d0.client?.client_type || 'Residential',
          // Schedule A — services the agreement covers (Clause 3). Priced services
          // are added automatically by the engine; this holds any extra ticks.
          services: Array.isArray(d0.services) ? d0.services : [],
          // Schedule D — warranty summary & project-requirement ticks.
          checklist: Array.isArray(d0.checklist) ? d0.checklist : [],
          pricing_input: { advance_percent: '', advance_amount: '', ...(d0.pricing_input || {}) },
          schedule_b: {
            project_no: '', work_order_no: '', quotation_no: '',
            property_address: '', property_type: '', tank_type: '', tank_capacity: '',
            tanks_count: '', water_source: '', provider_name: '',
            scope: '', materials: '',
            site_contact_name: '', site_contact_phone: '', access_notes: '',
            start_date: '', completion_date: '',
            // AMC is off until someone says yes — see the toggle below.
            under_amc: false,
            amc_code: '', amc_package: '', amc_frequency: '',
            amc_payment_frequency: '', amc_start: '', amc_expiry: '',
            warranty_period: '', special_conditions: '',
            // whatever the server supplied wins over the blanks above
            ...(d0.schedule_b || {}),
            // legacy fallbacks, only where schedule_b left a gap
            ...(d0.schedule_b?.property_address ? {} : { property_address: d0.property?.address || '' }),
            ...(d0.schedule_b?.property_type ? {} : { property_type: d0.property?.type || '' }),
            ...(d0.schedule_b?.tank_type ? {} : { tank_type: d0.property?.tank_type || '' }),
            ...(d0.schedule_b?.tank_capacity ? {} : { tank_capacity: d0.property?.tank_capacity || '' }),
            ...(d0.schedule_b?.tanks_count ? {} : { tanks_count: d0.property?.tanks_count || '' }),
            ...(d0.schedule_b?.scope ? {} : { scope: d0.project?.scope || d0.project?.summary || '' }),
            ...(d0.schedule_b?.start_date ? {} : { start_date: d0.project?.start_date || '' }),
          },
        });
        setQuote(data.quote);
      })
      .catch((e) => setError(errText(e, 'Could not draft the agreement')))
      .finally(() => setLoading(false));
  }, [quoteCode]);
  useEffect(load, [load]);

  // The preview is an iframe; keep its scroll position across re-renders so an edit
  // doesn't jump the agreement back to the top while the operator is reading it.
  const previewRef = useRef(null);
  const previewScroll = useRef(0);

  // live preview from the real agreement engine
  const refresh = useCallback(async (body) => {
    if (!body) return;
    // Remember where the reader was before the iframe reloads with new HTML.
    try { previewScroll.current = previewRef.current?.contentWindow?.scrollY || previewScroll.current; } catch { /* cross-origin guard */ }
    setPreviewing(true);
    try {
      const { data } = await api.post('/wt-agreements/customer/preview', body);
      setPreview(data);
    } catch (e) { toast.err(errText(e, 'Could not render the preview')); }
    finally { setPreviewing(false); }
  }, []);
  // Debounced: refresh once the operator pauses, not on every keystroke/tick, so
  // ticking several options doesn't reload the preview repeatedly.
  useEffect(() => {
    if (!draft) return undefined;
    const t = setTimeout(() => refresh(draft), 500);
    return () => clearTimeout(t);
  }, [draft, refresh]);

  /* Witnesses are a fixed pair of slots, so edit them positionally. */
  const setWitness = (i, key, value) => setDraft((s) => {
    const list = [0, 1].map((n) => ({ ...(s.witnesses?.[n] || {}) }));
    list[i][key] = value;
    return { ...s, witnesses: list };
  });

  const setPath = (path, value) => setDraft((s) => {
    const next = { ...s };
    const keys = path.split('.');
    let node = next;
    keys.slice(0, -1).forEach((k) => { node[k] = { ...node[k] }; node = node[k]; });
    node[keys[keys.length - 1]] = value;
    return next;
  });

  const send = async () => {
    if (!draft.client.full_name?.trim()) { setError('Client name is required.'); return; }
    if (!draft.client.email?.trim()) { setError('A client email address is required to send for signature.'); return; }
    setSending(true); setError('');
    try {
      const { data } = await api.post('/wt-agreements/customer/agreements', draft);
      await api.post(`/wt-quotes/${quoteCode}/link-agreement`, {
        envelope_id: data.id, envelope_code: data.envelope_code,
      });
      setSent(data);
      toast.ok(`Agreement ${data.envelope_code} sent to ${draft.client.email}`);
    } catch (e) { setError(errText(e, 'Could not create the agreement')); }
    finally { setSending(false); }
  };

  const openPreview = () => {
    if (!preview?.html) return;
    const w = window.open('', '_blank');
    if (w) { w.document.write(preview.html); w.document.close(); }
    else toast.err('Allow pop-ups to preview the agreement.');
  };

  if (loading) return <Loading />;
  if (error && !draft) return (
    <>
      <WtHead title="Customer Service Agreement"
        crumb={<div className="wt-crumb"><span className="lnk" onClick={() => nav('/water-tank/quotations')}>Quotations</span></div>} />
      <div className="wt-card"><EmptyState eyebrow="Error" title="Could not draft the agreement" hint={error}
        action={<button className="wt-btn primary" onClick={load}>Retry</button>} /></div>
    </>
  );

  const quotePath = assessmentCode
    ? `/water-tank/site-assessments/${assessmentCode}/quotation`
    : `/water-tank/quotations/${quoteCode}`;
  const crumb = (
    <div className="wt-crumb">
      {assessmentCode ? (
        <>
          <span className="lnk" onClick={() => nav('/water-tank/site-assessments')}>Site Assessments</span>
          {' › '}<span className="lnk" onClick={() => nav(`/water-tank/site-assessments/${assessmentCode}`)}>{assessmentCode}</span>
        </>
      ) : (
        <span className="lnk" onClick={() => nav('/water-tank/quotations')}>Quotations</span>
      )}
      {' › '}<span className="lnk" onClick={() => nav(quotePath)}>{quoteCode}</span>
      {' › '}<span style={{ color: 'var(--wt-accent-ink)' }}>Agreement</span>
    </div>
  );

  /* ── sent confirmation ── */
  if (sent) {
    // per-signer links are rendered below; this remains for the header summary
    const signerCount = sent.signers?.length || 1;
    return (
      <>
        <WtHead crumb={crumb} title="Agreement sent for signature" subtitle={sent.envelope_code} />
        <div className="wt-card" style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: '50%', background: 'var(--wt-green-bg)', color: 'var(--wt-green)' }}>
              <Check size={22} />
            </span>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>
                Sent to {signerCount} {signerCount === 1 ? 'party' : 'parties'}
              </div>
              <div className="muted" style={{ fontSize: 12.5 }}>
                Each party signs in their own block, in order. Work may commence only once the
                agreement is signed (Sec. 7 Step 6).
              </div>
            </div>
          </div>

          {/* One link per party. Signing is ordered, so only the first is live
              immediately — the rest open as the party before them signs. */}
          <div className="wt-note" style={{ width: '100%' }}>
            Signing links — share these directly if the emails do not arrive:
            {(sent.signers?.length ? sent.signers : [{ label: 'Client', name: draft.client.full_name, email: draft.client.email, order: 1, signing_path: sent.signing_path }])
              .map((s) => {
                const link = `${window.location.origin}${s.signing_path}`;
                return (
                  <div key={s.signing_path} style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>
                      {s.order}. {s.label || s.role} — {s.name}
                      <span style={{ fontWeight: 400, color: 'var(--wt-muted)' }}> · {s.email}</span>
                      {s.order > 1 && <span style={{ fontWeight: 400, color: 'var(--wt-muted)' }}> · opens once #{s.order - 1} has signed</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input className="wt-input" readOnly value={link} onFocus={(e) => e.target.select()} />
                      <button className="wt-btn" onClick={() => { navigator.clipboard?.writeText(link); toast.ok('Link copied'); }}>
                        <Copy size={13} /> Copy
                      </button>
                      <a className="wt-btn" href={link} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Open</a>
                    </div>
                  </div>
                );
              })}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="wt-btn" onClick={() => nav(quotePath)}>Back to quotation</button>
            <button className="wt-btn" onClick={() => nav('/water-tank/clients')}>Client book</button>
            <button className="wt-btn primary" onClick={() => nav('/water-tank/agreements/customer')}>All customer agreements</button>
          </div>
        </div>
      </>
    );
  }

  const selected = draft.pricing_input.selected || [];
  const summary = preview?.pricing;

  // Editable Schedule C — the whole price schedule, grouped, with the quote's
  // services already ticked. Toggling/editing here redrafts the agreement live.
  const selCodes = new Set(selected.map((s) => s.code));
  const CAT_LABEL = { service: 'Standard Services', material: 'Materials & Consumables', labour: 'Labour' };
  const catQterm = catQ.trim().toLowerCase();
  const grouped = catalog
    .filter((c) => !catQterm || [c.code, c.name].some((v) => String(v || '').toLowerCase().includes(catQterm)))
    .reduce((g, c) => { (g[c.group || 'service'] ||= []).push(c); return g; }, {});
  const toggleLine = (code) => setDraft((s) => {
    const arr = [...(s.pricing_input.selected || [])];
    const i = arr.findIndex((x) => x.code === code);
    if (i >= 0) arr.splice(i, 1);
    else { const c = catalog.find((x) => x.code === code); arr.push({ code, qty: 1, agreed_price: c ? c.standard_price : '' }); }
    return { ...s, pricing_input: { ...s.pricing_input, selected: arr } };
  });
  const setLineField = (code, field, v) => setDraft((s) => ({
    ...s,
    pricing_input: { ...s.pricing_input, selected: (s.pricing_input.selected || []).map((x) => (x.code === code ? { ...x, [field]: v } : x)) },
  }));

  // Schedule A — the services the agreement covers. Priced (Schedule C) lines
  // imply their Schedule A entries automatically; the operator can tick extras.
  const serviceGroups = meta.service_groups || {};
  const codeToA = meta.code_to_schedule_a || {};
  const impliedA = new Set();
  selected.forEach((s) => (codeToA[String(s.code).toUpperCase()] || []).forEach((n) => impliedA.add(n)));
  const svcList = draft.services || [];
  const toggleService = (item) => setDraft((s) => {
    const arr = [...(s.services || [])];
    const i = arr.indexOf(item);
    if (i >= 0) arr.splice(i, 1); else arr.push(item);
    return { ...s, services: arr };
  });

  // Schedule D — warranty summary & project requirements (ticked items).
  const checklistGroups = meta.checklist_groups || {};
  const chkList = draft.checklist || [];
  const toggleChecklist = (item) => setDraft((s) => {
    const arr = [...(s.checklist || [])];
    const i = arr.indexOf(item);
    if (i >= 0) arr.splice(i, 1); else arr.push(item);
    return { ...s, checklist: arr };
  });
  const sb = draft.schedule_b || {};
  const isBusinessClient = ['commercial', 'industrial', 'institutional']
    .includes(String(draft.client_type || '').toLowerCase());

  return (
    <>
      {/* The header (with Refresh / Full preview / Send for signature) stays pinned
          to the top so the actions are always in reach while scrolling the form. */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, background: 'var(--wt-page)', paddingTop: 10, marginTop: -10, borderBottom: '1px solid var(--wt-line)' }}>
        <WtHead crumb={crumb} title="Customer Service Agreement" subtitle={`Drafted from quotation ${quoteCode} · ${bdt(quote?.total)}`}>
          <button className="wt-btn" onClick={() => refresh(draft)} disabled={previewing}>
            {previewing ? <Loader2 size={14} className="wt-spin" /> : <RefreshCw size={14} />} Refresh preview
          </button>
          <button className="wt-btn" onClick={openPreview} disabled={!preview?.html}><Eye size={14} /> Full preview</button>
          <button className="wt-btn primary" disabled={sending} onClick={send}>
            {sending ? <><Loader2 size={14} className="wt-spin" /> Sending…</> : <><Send size={14} /> Send for signature</>}
          </button>
        </WtHead>
      </div>

      {error && <div className="wt-formerr">{error}</div>}

      <div className="wt-note">
        <FileSignature size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
        Drafted automatically from the quotation — parties, property, services and pricing are carried over.
        Edit anything below; the preview on the right updates from the live agreement engine.
      </div>

      <div className="wt-detail-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* ── editable draft ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="wt-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="wt-sec-title">Client</div>

            {/* Client type drives what the agreement has to ask for. A residential
                customer signs personally; a business signs THROUGH someone, so the
                agreement must name the entity and the person who can bind it. */}
            <div className="wt-field">
              <label>Client type</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(meta.client_types || ['Residential', 'Commercial', 'Industrial', 'Institutional']).map((t) => (
                  <button key={t} className={`wt-btn sm${(draft.client_type || 'Residential') === t ? ' primary' : ''}`}
                    onClick={() => setPath('client_type', t)}>{t}</button>
                ))}
              </div>
            </div>

            <div className="wt-grid2">
              <div className="wt-field"><label>{isBusinessClient ? 'Business / organisation name *' : 'Full name *'}</label>
                <input className="wt-input" value={draft.client.full_name} onChange={(e) => setPath('client.full_name', e.target.value)} /></div>
              <div className="wt-field"><label>Email *</label>
                <input className="wt-input" type="email" value={draft.client.email} onChange={(e) => setPath('client.email', e.target.value)} />
                {!draft.client.email && <span className="hint" style={{ color: 'var(--wt-amber)' }}>Required to send for signature.</span>}
              </div>
            </div>

            {isBusinessClient ? (
              <>
                <div className="wt-grid2">
                  <div className="wt-field"><label>Registered / legal name</label>
                    <input className="wt-input" value={draft.client.company || ''} onChange={(e) => setPath('client.company', e.target.value)}
                      placeholder="If different from the trading name" /></div>
                  <div className="wt-field"><label>Business type</label>
                    <input className="wt-input" value={draft.client.business_type || ''} onChange={(e) => setPath('client.business_type', e.target.value)}
                      placeholder="Private Ltd, partnership, trust…" /></div>
                </div>
                <div className="wt-grid2">
                  <div className="wt-field"><label>Trade licence no.</label>
                    <input className="wt-input" value={draft.client.trade_licence_no || ''} onChange={(e) => setPath('client.trade_licence_no', e.target.value)} /></div>
                  <div className="wt-field"><label>Company registration no.</label>
                    <input className="wt-input" value={draft.client.registration_no || ''} onChange={(e) => setPath('client.registration_no', e.target.value)} /></div>
                  <div className="wt-field"><label>TIN</label>
                    <input className="wt-input" value={draft.client.tin || ''} onChange={(e) => setPath('client.tin', e.target.value)} /></div>
                  <div className="wt-field"><label>BIN / VAT reg. no.</label>
                    <input className="wt-input" value={draft.client.bin || ''} onChange={(e) => setPath('client.bin', e.target.value)} /></div>
                </div>

                <div style={{ borderTop: '1px solid var(--wt-line)', paddingTop: 12 }}>
                  <div className="wt-sec-title" style={{ marginBottom: 8 }}>Authorised representative</div>
                  <div style={{ fontSize: 11.5, color: 'var(--wt-muted)', marginBottom: 10 }}>
                    The person signing on behalf of the organisation — they appear in the parties
                    block and in the execution section.
                  </div>
                  <div className="wt-grid2">
                    <div className="wt-field"><label>Representative name</label>
                      <input className="wt-input" value={draft.client.representative_name || ''} onChange={(e) => setPath('client.representative_name', e.target.value)} /></div>
                    <div className="wt-field"><label>Position / designation</label>
                      <input className="wt-input" value={draft.client.representative_position || ''} onChange={(e) => setPath('client.representative_position', e.target.value)}
                        placeholder="Managing Director, Estate Manager…" /></div>
                    <div className="wt-field"><label>Representative phone</label>
                      <input className="wt-input" value={draft.client.phone} onChange={(e) => setPath('client.phone', e.target.value)} /></div>
                    <div className="wt-field"><label>Representative NID / passport</label>
                      <input className="wt-input" value={draft.client.nid} onChange={(e) => setPath('client.nid', e.target.value)} /></div>
                  </div>
                </div>

                <div className="wt-grid2">
                  <div className="wt-field"><label>Accounts contact</label>
                    <input className="wt-input" value={draft.client.accounts_contact || ''} onChange={(e) => setPath('client.accounts_contact', e.target.value)}
                      placeholder="Who invoices go to" /></div>
                  <div className="wt-field"><label>Accounts email</label>
                    <input className="wt-input" type="email" value={draft.client.accounts_email || ''} onChange={(e) => setPath('client.accounts_email', e.target.value)} /></div>
                </div>
                <div className="wt-field"><label>Registered address</label>
                  <input className="wt-input" value={draft.client.address} onChange={(e) => setPath('client.address', e.target.value)} /></div>
              </>
            ) : (
              <>
                <div className="wt-grid2">
                  <div className="wt-field"><label>Phone</label>
                    <input className="wt-input" value={draft.client.phone} onChange={(e) => setPath('client.phone', e.target.value)} /></div>
                  <div className="wt-field"><label>NID / passport</label>
                    <input className="wt-input" value={draft.client.nid} onChange={(e) => setPath('client.nid', e.target.value)} /></div>
                </div>
                <div className="wt-grid2">
                  <div className="wt-field"><label>Address</label>
                    <input className="wt-input" value={draft.client.address} onChange={(e) => setPath('client.address', e.target.value)} /></div>
                  <div className="wt-field"><label>Alternate contact</label>
                    <input className="wt-input" value={draft.client.alt_contact || ''} onChange={(e) => setPath('client.alt_contact', e.target.value)}
                      placeholder="Second name and number" /></div>
                </div>
              </>
            )}
          </div>

          {/* SCHEDULE B — every field here is what the rendered Schedule B reads.
              These bind to schedule_b.* directly: an earlier version wrote to
              property.* / project.*, which the agreement engine never looked at,
              so anything typed here silently vanished from the document. */}
          <div className="wt-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="wt-sec-title">Schedule B — Project Summary</div>
            <div style={{ fontSize: 11.5, color: 'var(--wt-muted)', marginTop: -4 }}>
              Clause 4 requires each of these. Everything below appears in Schedule B of the agreement.
            </div>

            <div className="wt-grid3">
              <RefBox label="Project No." value={sb.project_no} />
              <RefBox label="Quotation No." value={sb.quotation_no} />
              <RefBox label="Work Order No." value={sb.work_order_no} />
            </div>

            <div className="wt-field"><label>Property address</label>
              <input className="wt-input" value={sb.property_address || ''} onChange={(e) => setPath('schedule_b.property_address', e.target.value)} /></div>
            <div className="wt-grid3">
              <div className="wt-field"><label>Property type</label>
                <input className="wt-input" value={sb.property_type || ''} onChange={(e) => setPath('schedule_b.property_type', e.target.value)} /></div>
              <div className="wt-field"><label>Tank type</label>
                <input className="wt-input" value={sb.tank_type || ''} onChange={(e) => setPath('schedule_b.tank_type', e.target.value)} /></div>
              <div className="wt-field"><label>Tank capacity</label>
                <input className="wt-input" value={sb.tank_capacity || ''} onChange={(e) => setPath('schedule_b.tank_capacity', e.target.value)} /></div>
            </div>
            <div className="wt-grid3">
              <div className="wt-field"><label>Number of tanks</label>
                <input className="wt-input" type="number" min="0" value={sb.tanks_count || ''} onChange={(e) => setPath('schedule_b.tanks_count', e.target.value)} /></div>
              <div className="wt-field"><label>Water source</label>
                <input className="wt-input" value={sb.water_source || ''} onChange={(e) => setPath('schedule_b.water_source', e.target.value)} /></div>
              <div className="wt-field"><label>Service provider</label>
                <input className="wt-input" value={sb.provider_name || ''} onChange={(e) => setPath('schedule_b.provider_name', e.target.value)} /></div>
            </div>

            <div className="wt-field"><label>Scope of work</label>
              <textarea className="wt-input" rows={4} style={{ resize: 'vertical' }} value={sb.scope || ''}
                onChange={(e) => setPath('schedule_b.scope', e.target.value)} /></div>
            <div className="wt-field"><label>Materials &amp; consumables</label>
              <input className="wt-input" value={sb.materials || ''} onChange={(e) => setPath('schedule_b.materials', e.target.value)} /></div>

            <div className="wt-grid3">
              <div className="wt-field"><label>Site contact name</label>
                <input className="wt-input" value={sb.site_contact_name || ''} onChange={(e) => setPath('schedule_b.site_contact_name', e.target.value)} /></div>
              <div className="wt-field"><label>Site contact phone</label>
                <input className="wt-input" value={sb.site_contact_phone || ''} onChange={(e) => setPath('schedule_b.site_contact_phone', e.target.value)} /></div>
              <div className="wt-field"><label>Warranty period</label>
                <input className="wt-input" value={sb.warranty_period || ''} onChange={(e) => setPath('schedule_b.warranty_period', e.target.value)} placeholder="e.g. 6 months" /></div>
            </div>
            <div className="wt-field"><label>Site access requirements</label>
              <textarea className="wt-input" rows={2} style={{ resize: 'vertical' }} value={sb.access_notes || ''}
                onChange={(e) => setPath('schedule_b.access_notes', e.target.value)} /></div>

            <div className="wt-grid2">
              <div className="wt-field"><label>Estimated start date</label>
                <DatePicker value={sb.start_date || ''} onChange={(v) => setPath('schedule_b.start_date', v)} /></div>
              <div className="wt-field"><label>Estimated completion date</label>
                <DatePicker value={sb.completion_date || ''} onChange={(v) => setPath('schedule_b.completion_date', v)} /></div>
            </div>

            {/* AMC is a yes/no question first. Only when it is yes do the
                package, billing cycle and contract fields appear — an unused
                block of AMC inputs on a one-off job is just noise. */}
            <div className="wt-field">
              <label>Is this project under an Annual Maintenance Contract?</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['No', 'Yes'].map((opt) => {
                  const on = (opt === 'Yes') === !!sb.under_amc;
                  return (
                    <button key={opt} className={`wt-btn sm${on ? ' primary' : ''}`}
                      onClick={() => setDraft((s) => ({
                        ...s,
                        schedule_b: {
                          ...s.schedule_b,
                          under_amc: opt === 'Yes',
                          // clearing on "No" means a stale package can never
                          // survive onto the signed document
                          ...(opt === 'No' ? { amc_code: '', amc_package: '', amc_frequency: '', amc_payment_frequency: '' } : {}),
                        },
                      }))}>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {!!sb.under_amc && (
              <>
                <div className="wt-grid3">
                  <div className="wt-field"><label>Existing AMC contract</label>
                    <select className="wt-select" value={sb.amc_code || ''}
                      onChange={(e) => {
                        const a = (meta.amc_contracts || []).find((x) => x.code === e.target.value);
                        setDraft((s) => ({
                          ...s,
                          schedule_b: {
                            ...s.schedule_b,
                            amc_code: e.target.value,
                            amc_package: a?.package || s.schedule_b.amc_package,
                            amc_frequency: a?.frequency || s.schedule_b.amc_frequency,
                            amc_payment_frequency: a?.payment_frequency || s.schedule_b.amc_payment_frequency,
                          },
                        }));
                      }}>
                      <option value="">Not linked to an existing contract</option>
                      {(meta.amc_contracts || []).map((a) => (
                        <option key={a.code} value={a.code}>{a.code} — {a.client_name} — {a.package || 'AMC'}</option>
                      ))}
                    </select>
                    <span className="hint">Live contracts only. Leave blank if the AMC is being set up with this agreement.</span>
                  </div>
                  <div className="wt-field"><label>AMC package</label>
                    <select className="wt-select" value={sb.amc_package || ''} onChange={(e) => setPath('schedule_b.amc_package', e.target.value)}>
                      <option value="">Select a package…</option>
                      {(meta.amc_packages || []).map((p) => (
                        <option key={p.key} value={p.label}>{p.label} — {p.visits_per_year} visits/yr</option>
                      ))}
                    </select>
                    <span className="hint">Schedule A tiers.</span>
                  </div>
                  <div className="wt-field"><label>Visit frequency</label>
                    <select className="wt-select" value={sb.amc_frequency || ''} onChange={(e) => setPath('schedule_b.amc_frequency', e.target.value)}>
                      <option value="">Select…</option>
                      {(meta.amc_visit_frequencies || []).map((x) => <option key={x}>{x}</option>)}
                    </select>
                  </div>
                </div>
                <div className="wt-grid3">
                  <div className="wt-field"><label>Billing cycle (Clause 9)</label>
                    <select className="wt-select" value={sb.amc_payment_frequency || ''} onChange={(e) => setPath('schedule_b.amc_payment_frequency', e.target.value)}>
                      <option value="">Select…</option>
                      {(meta.amc_frequencies || []).map((x) => <option key={x}>{x}</option>)}
                    </select>
                    <span className="hint">Drives how the AMC is invoiced.</span>
                  </div>
                  <div className="wt-field"><label>AMC start date</label>
                    <DatePicker value={sb.amc_start || ''} onChange={(v) => setPath('schedule_b.amc_start', v)} /></div>
                  <div className="wt-field"><label>AMC expiry date</label>
                    <DatePicker value={sb.amc_expiry || ''} onChange={(v) => setPath('schedule_b.amc_expiry', v)} /></div>
                </div>
              </>
            )}

            <div className="wt-field"><label>Special conditions</label>
              <textarea className="wt-input" rows={2} style={{ resize: 'vertical' }} value={sb.special_conditions || ''}
                onChange={(e) => setPath('schedule_b.special_conditions', e.target.value)} /></div>
          </div>

          <div className="wt-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="wt-sec-title">Schedule A — services this agreement covers</div>
            <div className="muted" style={{ fontSize: 12.5 }}>
              Clause 3 limits the agreement to what is ticked here. The services you price below are
              covered automatically{impliedA.size ? ` (${impliedA.size} from pricing)` : ''}; tick anything
              additional the agreement should also cover.
            </div>
            {Object.keys(serviceGroups).length === 0 ? (
              <div className="muted" style={{ fontSize: 12.5 }}>Loading the service list…</div>
            ) : Object.entries(serviceGroups).map(([g, items]) => (
              <div key={g}>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--wt-accent-ink)', margin: '6px 0' }}>{g}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
                  {items.map((it) => {
                    const auto = impliedA.has(it);
                    const on = auto || svcList.includes(it);
                    return (
                      <label key={it}
                        title={auto ? 'Covered automatically — it is priced in Schedule C' : ''}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, cursor: auto ? 'default' : 'pointer', opacity: auto ? 0.85 : 1 }}>
                        <input type="checkbox" checked={on} disabled={auto} onChange={() => toggleService(it)} />
                        {it}{auto && <span className="muted" style={{ fontSize: 10.5 }}> · from pricing</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="wt-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="wt-panel-head">
              <div className="wt-sec-title">Schedule C — priced services</div>
              <button className="wt-link" onClick={() => nav(quotePath)}>Open quotation</button>
            </div>
            <div className="muted" style={{ fontSize: 12.5 }}>
              Pre-filled from quotation {quoteCode} — {selected.length} service line{selected.length === 1 ? '' : 's'}.
              Tick to add or remove, and adjust quantity or agreed price. The agreement and its total redraft below.
            </div>

            {catalog.length > 0 ? (
              <>
                <label className="wt-search" style={{ maxWidth: 320 }}>
                  <Search size={14} />
                  <input value={catQ} onChange={(e) => setCatQ(e.target.value)} placeholder="Filter services by name or code…" />
                </label>
                {['service', 'material', 'labour'].filter((g) => (grouped[g] || []).length).map((grp) => (
              <div key={grp}>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--wt-accent-ink)', margin: '6px 0' }}>{CAT_LABEL[grp]}</div>
                <table className="wt-tbl">
                  <thead><tr>
                    <th style={{ width: 34 }} /><th style={{ width: 92 }}>Code</th><th>Item</th>
                    <th style={{ width: 88, textAlign: 'right' }}>Standard</th>
                    <th style={{ width: 64, textAlign: 'center' }}>Qty</th>
                    <th style={{ width: 110, textAlign: 'right' }}>Agreed (৳)</th>
                  </tr></thead>
                  <tbody>
                    {(grouped[grp] || []).map((l) => {
                      const on = selCodes.has(l.code);
                      const row = selected.find((s) => s.code === l.code);
                      return (
                        <tr key={l.code} style={{ opacity: on ? 1 : 0.55 }}>
                          <td><input type="checkbox" checked={on} onChange={() => toggleLine(l.code)} /></td>
                          <td className="id">{l.code}</td>
                          <td>{l.name}{l.unit ? <span className="muted"> · {l.unit}</span> : null}</td>
                          <td className="muted" style={{ textAlign: 'right' }}>{bdt(l.standard_price)}</td>
                          <td style={{ textAlign: 'center' }}>{on
                            ? <input className="wt-input sm" type="number" min="1" style={{ width: 52, textAlign: 'center' }} value={row?.qty ?? 1} onChange={(e) => setLineField(l.code, 'qty', Number(e.target.value) || 1)} />
                            : '—'}</td>
                          <td style={{ textAlign: 'right' }}>{on
                            ? <input className="wt-input sm" type="number" min="0" style={{ width: 96, textAlign: 'right' }} placeholder={String(l.standard_price)} value={row?.agreed_price ?? ''} onChange={(e) => setLineField(l.code, 'agreed_price', e.target.value)} />
                            : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
                ))}
                {catQterm && !['service', 'material', 'labour'].some((g) => (grouped[g] || []).length) && (
                  <div className="muted" style={{ fontSize: 12.5 }}>Nothing matches “{catQ.trim()}”. Any already-selected services still stay on the agreement.</div>
                )}
              </>
            ) : (
              <div className="muted" style={{ fontSize: 12.5 }}>{selected.length} service line{selected.length === 1 ? '' : 's'} carried from the quotation.</div>
            )}

            <div className="wt-grid3" style={{ borderTop: '1px solid var(--wt-line)', paddingTop: 12 }}>
              <div className="wt-field"><label>Transport / other (৳)</label>
                <input className="wt-input" type="number" value={draft.pricing_input.transport}
                  onChange={(e) => setPath('pricing_input.transport', Number(e.target.value) || 0)} /></div>
              <div className="wt-field"><label>Discount (৳)</label>
                <input className="wt-input" type="number" value={draft.pricing_input.discount}
                  onChange={(e) => setPath('pricing_input.discount', Number(e.target.value) || 0)} /></div>
              <div className="wt-field"><label>VAT (%)</label>
                <input className="wt-input" type="number" value={draft.pricing_input.vat_percent}
                  onChange={(e) => setPath('pricing_input.vat_percent', Number(e.target.value) || 0)} /></div>
            </div>

            {/* Advance payable on acceptance. Carried from the quotation, but
                editable here — the share paid up front is routinely renegotiated
                between quoting and signing. */}
            <div style={{ borderTop: '1px solid var(--wt-line)', paddingTop: 12, marginTop: 4 }}>
              <div className="wt-sec-title" style={{ marginBottom: 4 }}>Advance / deposit on acceptance</div>
              <div style={{ fontSize: 11.5, color: 'var(--wt-muted)', marginBottom: 10 }}>
                What the client pays before work starts. Appears in Schedule B and Schedule C.
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {[20, 25, 30, 40, 50].map((v) => (
                  <button key={v}
                    className={`wt-btn sm${String(draft.pricing_input.advance_percent) === String(v) ? ' primary' : ''}`}
                    onClick={() => setDraft((s) => ({ ...s, pricing_input: { ...s.pricing_input, advance_percent: v, advance_amount: '' } }))}>
                    {v}%
                  </button>
                ))}
              </div>
              <div className="wt-grid3">
                <div className="wt-field"><label>Advance (%)</label>
                  <input className="wt-input" type="number" min="0" max="100" placeholder="e.g. 30"
                    value={draft.pricing_input.advance_percent ?? ''}
                    onChange={(e) => setDraft((s) => ({ ...s, pricing_input: { ...s.pricing_input, advance_percent: e.target.value, advance_amount: '' } }))} /></div>
                <div className="wt-field"><label>or Advance (৳)</label>
                  <input className="wt-input" type="number" min="0" placeholder="fixed amount"
                    value={draft.pricing_input.advance_amount ?? ''}
                    onChange={(e) => setDraft((s) => ({ ...s, pricing_input: { ...s.pricing_input, advance_amount: e.target.value, advance_percent: '' } }))} /></div>
                <div className="wt-field" style={{ justifyContent: 'flex-end' }}>
                  <button className="wt-btn" onClick={() => { setDraft((s) => ({ ...s, pricing_input: { ...s.pricing_input, advance_percent: '', advance_amount: '' } })); }}>
                    Clear (use 40/30/30)
                  </button>
                </div>
              </div>
              {summary?.summary?.advance_amount != null && (
                <div className="wt-note" style={{ marginTop: 10 }}>
                  Advance <strong>{bdt(summary.summary.advance_amount)}</strong>
                  {summary.summary.advance_percent ? ` (${summary.summary.advance_percent}%)` : ''} ·
                  balance on completion <strong>{bdt(summary.summary.balance_due)}</strong>
                </div>
              )}
            </div>
            {summary && (
              <div>
                <div className="wt-costrow"><span>Service charges</span><span>{bdt(summary.summary?.service_charges)}</span></div>
                {summary.summary?.materials > 0 && <div className="wt-costrow"><span>Materials</span><span>{bdt(summary.summary.materials)}</span></div>}
                {summary.summary?.labour > 0 && <div className="wt-costrow"><span>Labour</span><span>{bdt(summary.summary.labour)}</span></div>}
                {summary.summary?.transport > 0 && <div className="wt-costrow"><span>Transport / other</span><span>{bdt(summary.summary.transport)}</span></div>}
                {summary.summary?.discount > 0 && <div className="wt-costrow"><span style={{ color: 'var(--wt-green)' }}>Discount</span><span style={{ color: 'var(--wt-green)' }}>− {bdt(summary.summary.discount)}</span></div>}
                <div className="wt-costrow"><span>VAT ({summary.summary?.vat_percent || 0}%)</span><span>{bdt(summary.summary?.vat)}</span></div>
                <div className="wt-costrow total"><span>Total Contract Value</span><span className="amt">{bdt(summary.summary?.total_contract_value)}</span></div>
              </div>
            )}
          </div>

          {/* ── Schedule D — warranty summary & project requirements ── */}
          <div className="wt-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="wt-sec-title">Schedule D — warranty summary &amp; project requirements</div>
            <div className="muted" style={{ fontSize: 12.5 }}>
              Tick what this agreement's Schedule D should state — warranty coverage and the
              project requirements the client confirms.
            </div>
            {Object.keys(checklistGroups).length === 0 ? (
              <div className="muted" style={{ fontSize: 12.5 }}>Loading the warranty list…</div>
            ) : Object.entries(checklistGroups).map(([g, items]) => (
              <div key={g}>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--wt-accent-ink)', margin: '6px 0' }}>{g}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
                  {items.map((it) => (
                    <label key={it} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, cursor: 'pointer' }}>
                      <input type="checkbox" checked={chkList.includes(it)} onChange={() => toggleChecklist(it)} />
                      {it}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ── who signs ── */}
          <div className="wt-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="wt-sec-title">Signing parties</div>
            <div style={{ fontSize: 11.5, color: 'var(--wt-muted)', marginTop: -4 }}>
              Each party below gets their own signature and date block on the document and their own
              signing link. Order: client signs, Seventh Sky countersigns, then the witnesses attest.
              A party without an email cannot be sent to and will not be added.
            </div>

            <div className="wt-grid2">
              <div className="wt-field"><label>Seventh Sky representative</label>
                <input className="wt-input" value={draft.org?.represented_by || ''}
                  onChange={(e) => setPath('org.represented_by', e.target.value)} /></div>
              <div className="wt-field"><label>Position</label>
                <input className="wt-input" value={draft.org?.position || ''}
                  onChange={(e) => setPath('org.position', e.target.value)} /></div>
              <div className="wt-field" style={{ gridColumn: '1 / -1' }}><label>Countersigner email</label>
                <input className="wt-input" type="email" value={draft.org?.email || ''}
                  onChange={(e) => setPath('org.email', e.target.value)}
                  placeholder="Leave blank to skip the Seventh Sky countersignature" /></div>
            </div>

            {[0, 1].map((i) => (
              <div key={i} style={{ borderTop: '1px solid var(--wt-line)', paddingTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Witness {i + 1}</div>
                <div className="wt-grid3">
                  <div className="wt-field"><label>Name</label>
                    <input className="wt-input" value={draft.witnesses?.[i]?.name || ''}
                      onChange={(e) => setWitness(i, 'name', e.target.value)} /></div>
                  <div className="wt-field"><label>NID / Passport</label>
                    <input className="wt-input" value={draft.witnesses?.[i]?.nid || ''}
                      onChange={(e) => setWitness(i, 'nid', e.target.value)} /></div>
                  <div className="wt-field"><label>Email (to send for signature)</label>
                    <input className="wt-input" type="email" value={draft.witnesses?.[i]?.email || ''}
                      onChange={(e) => setWitness(i, 'email', e.target.value)} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── live agreement preview ── */}
        <div className="wt-card" style={{ padding: 0, overflow: 'hidden', alignSelf: 'start', position: 'sticky', top: 104 }}>
          <div className="wt-panel-head" style={{ padding: '14px 18px', borderBottom: '1px solid var(--wt-line)' }}>
            <div className="wt-sec-title">{preview?.title || 'Customer Service Agreement'}</div>
            {previewing && <Loader2 size={14} className="wt-spin" style={{ color: 'var(--wt-muted)' }} />}
          </div>
          {preview?.html
            ? <iframe ref={previewRef} title="Agreement preview" srcDoc={preview.html}
                sandbox="allow-same-origin"
                onLoad={() => { try { previewRef.current?.contentWindow?.scrollTo(0, previewScroll.current); } catch { /* cross-origin guard */ } }}
                style={{ width: '100%', height: 620, border: 0, background: '#fff' }} />
            : <div style={{ padding: 40, textAlign: 'center' }}><Loader2 size={20} className="wt-spin" style={{ color: 'var(--wt-muted)' }} /></div>}
        </div>
      </div>
    </>
  );
}

/* A system-generated reference. Read-only: it belongs to the record it names. */
function RefBox({ label, value }) {
  return (
    <div className="wt-field">
      <label>{label}</label>
      <input className="wt-input" readOnly value={value || ''} placeholder="Not yet issued"
        style={{ background: '#f1f5f9', fontWeight: value ? 700 : 400, cursor: 'default' }} />
    </div>
  );
}
