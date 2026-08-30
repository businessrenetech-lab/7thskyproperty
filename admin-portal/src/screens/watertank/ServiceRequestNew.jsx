import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, Check, ChevronLeft, ChevronRight, X, Users, ClipboardList, GitBranch,
  CalendarClock, FileText, Plus, RotateCcw, Loader2, Sparkles, Truck, Ban, AlertTriangle,
} from 'lucide-react';
import api from '../../services/api';
import { useSvcNav, WtHead, DatePicker, Loading, EmptyState, bdt, toast, errText, svcEquip, svcProfile } from './common';

/*
 * New Service Request — the front door of the water-tank operation.
 * Step 3 is the decision the SOP turns on: does this job need a site visit
 * first (Sec. 6), or is it well enough understood to quote straight away
 * (Sec. 7 Step 5)? The wizard then branches and does the right thing in one save.
 */

const initials = (n) => String(n || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const lineTotal = (l) => Number(l.price || 0) * (Number(l.qty) || 1);

export default function ServiceRequestNew() {
  const nav = useSvcNav();
  const eq = svcEquip();
  const [params] = useSearchParams();
  const fromClient = params.get('client');
  const routeParam = params.get('route'); // 'assessment' | 'quotation'

  const [ref, setRef] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  // step 0 — who
  const [q, setQ] = useState('');
  const [hits, setHits] = useState({ water_tank: [], contacts: [] });
  const [searching, setSearching] = useState(false);
  const [linkedClient, setLinkedClient] = useState(null);

  const [f, setF] = useState({
    client_name: '', client_code: '', client_type: 'Residential',
    phone: '', email: '', address: '', district: '', property_type: '',
    tank_type: '', tanks_count: '',
    category: '', specific_service: '', services_requested: [],
    priority: 'Medium', preferred_date: '', assigned_officer: '',
    description: '', provider_name: '', source: 'Direct',
    deposit_required: false,
    needs_assessment: true,
    assessment_date: '',
    lines: [], provider_allocation_fee: '', discount: '', vat_exempt: false,
    validity: '15 Days', payment_terms: '50% advance, balance on completion', notes: '',
    enquiry_code: '',
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  // catalogue picker
  const [catQ, setCatQ] = useState('');
  const [catGroup, setCatGroup] = useState('');

  useEffect(() => {
    api.get('/wt-intake/request-reference')
      .then((r) => setRef(r.data))
      .catch((e) => setErr(errText(e, 'Could not load reference data')))
      .finally(() => setLoading(false));
  }, []);

  /*
   * Arriving from a client file: /service-requests/new?client=WTCM-C0026&route=quotation
   * The client is already known, so skip the search entirely and land on the
   * details step. `route` preselects the SOP branch the operator already chose —
   * assessment first (Sec. 6) or straight to a quotation (Sec. 7 Step 5).
   */
  useEffect(() => {
    if (!fromClient) return;
    api.get('/wt-clients/lookup', { params: { q: fromClient } })
      .then(({ data }) => {
        const c = (data.water_tank || []).find((x) => x.code === fromClient);
        if (!c) return;
        setLinkedClient(c);
        setF((s) => ({
          ...s,
          client_name: c.name || '', client_code: c.code,
          phone: c.mobile || '', email: c.email || '',
          address: c.service_address || '', district: c.district || '',
          property_type: c.property_type || '', client_type: c.client_type || s.client_type,
          tank_type: c.tank_type || '', tanks_count: c.tanks_count || '',
          needs_assessment: routeParam !== 'quotation',
        }));
        // Straight to the step that actually needs input for the chosen branch.
        setStep(routeParam ? 3 : 1);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromClient, routeParam]);

  // Intake is standardised on the Service Request — there is no separate
  // "enquiry" record to convert from. A lead arriving by any channel is captured
  // here directly; the channel is recorded on the client, not as a parallel object.

  // client lookup
  const runLookup = useCallback((term) => {
    if (term.trim().length < 2) { setHits({ water_tank: [], contacts: [] }); setSearching(false); return; }
    setSearching(true);
    api.get('/wt-clients/lookup', { params: { q: term } })
      .then((r) => setHits(r.data))
      .catch(() => setHits({ water_tank: [], contacts: [] }))
      .finally(() => setSearching(false));
  }, []);
  useEffect(() => { const t = setTimeout(() => runLookup(q), 220); return () => clearTimeout(t); }, [q, runLookup]);

  const useClient = (c, isWaterTank) => {
    setLinkedClient(c);
    setF((s) => ({
      ...s,
      client_name: c.name || '', client_code: isWaterTank ? c.code : '',
      phone: c.mobile || s.phone, email: c.email || s.email,
      address: (isWaterTank ? c.service_address : c.address) || s.address,
      district: c.district || s.district, property_type: c.property_type || s.property_type,
      tank_type: c.tank_type || s.tank_type, tanks_count: c.tanks_count || s.tanks_count,
      client_type: c.client_type || s.client_type,
    }));
    setStep(1);
  };

  const catalog = ref?.catalog || [];
  const chosen = new Set(f.lines.filter((l) => l.kind !== 'fee').map((l) => l.code));
  const filteredCatalog = useMemo(() => {
    const term = catQ.trim().toLowerCase();
    return catalog.filter((c) => (!catGroup || c.group === catGroup)
      && (!term || [c.code, c.name, c.description].some((v) => String(v || '').toLowerCase().includes(term))));
  }, [catalog, catQ, catGroup]);

  const addService = (c) => {
    if (chosen.has(c.code)) { toast.info(`${c.name} is already on the quote.`); return; }
    set('lines', [...f.lines, {
      kind: 'service', code: c.code, name: c.name, unit: c.unit,
      price: c.standard_price, standard_price: c.standard_price, qty: 1, description: c.description,
    }]);
  };
  const addFee = () => set('lines', [...f.lines, { kind: 'fee', code: '', name: '', price: '', standard_price: 0, qty: 1 }]);
  const setLine = (i, k, v) => set('lines', f.lines.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const delLine = (i) => set('lines', f.lines.filter((_, j) => j !== i));

  const totals = useMemo(() => {
    const services = f.lines.filter((l) => l.kind !== 'fee').reduce((s, l) => s + lineTotal(l), 0);
    const fees = f.lines.filter((l) => l.kind === 'fee').reduce((s, l) => s + lineTotal(l), 0);
    const alloc = Number(f.provider_allocation_fee || 0);
    const disc = Number(f.discount || 0);
    const net = Math.max(0, services + fees + alloc - disc);
    const vat = f.vat_exempt ? 0 : Math.round(net * 0.05 * 100) / 100;
    return { services, fees, alloc, disc, vat, total: net + vat };
  }, [f.lines, f.provider_allocation_fee, f.discount, f.vat_exempt]);

  // providers that may actually be assigned (Sec. 6 Step 4)
  const providers = ref?.providers || [];
  const eligible = useMemo(() => providers.filter((p) => p.assignable
    && (!f.district || !p.coverage_areas.length || p.coverage_areas.includes(f.district))), [providers, f.district]);
  const blocked = providers.filter((p) => !p.assignable);

  const STEPS = [
    { key: 'who', label: 'Client', hint: 'Search or register', icon: Users },
    { key: 'what', label: 'Service needed', hint: 'What they are asking for', icon: ClipboardList },
    { key: 'route', label: 'Route the job', hint: 'Assessment or quote', icon: GitBranch },
    { key: 'finish', label: f.needs_assessment ? 'Schedule assessment' : 'Build quote',
      hint: f.needs_assessment ? 'Pick a date' : 'Select services', icon: f.needs_assessment ? CalendarClock : FileText },
  ];

  const stepValid = () => {
    if (step === 0) return true;
    if (step === 1) return f.client_name.trim() && f.phone.trim();
    if (step === 2) return true;
    return f.needs_assessment ? !!f.assessment_date : f.lines.length > 0;
  };

  const submit = async () => {
    setSaving(true); setErr('');
    try {
      const { data } = await api.post('/wt-intake/requests', {
        ...f,
        tanks_count: Number(f.tanks_count) || 0,
        lines: f.lines.map((l) => ({ ...l, price: Number(l.price || 0), qty: Number(l.qty) || 1 })),
        provider_allocation_fee: Number(f.provider_allocation_fee || 0),
        discount: Number(f.discount || 0),
      });
      if (data.assessment) {
        toast.ok(`${data.request.code} raised — assessment ${data.assessment.code} scheduled`);
        nav(`/water-tank/site-assessments/${data.assessment.code}`);
      } else {
        toast.ok(`${data.request.code} raised — quotation ${data.quotation.code} created`);
        nav(`/water-tank/quotations/${data.quotation.code}`);
      }
    } catch (e) { setErr(errText(e, 'Could not create the request')); setSaving(false); }
  };

  const next = () => { if (step < STEPS.length - 1) setStep(step + 1); else submit(); };

  if (loading) return <Loading />;

  return (
    <>
      <WtHead
        crumb={<div className="wt-crumb">
          <span className="lnk" onClick={() => nav('/water-tank/service-requests')}>Service Requests</span>
          {' › '}<span style={{ color: 'var(--wt-accent-ink)' }}>New request</span>
        </div>}
        title="New Service Request"
        subtitle={`Sec. 5 — the single intake for a ${svcProfile().label} job, through to assessment or quotation`}
      >
        <button className="wt-btn" onClick={() => nav('/water-tank/service-requests')}><X size={14} /> Cancel</button>
      </WtHead>

      <div className="wt-wizard">
        <aside className="wt-wizrail">
          <div className="wt-wizrail-h">Request steps</div>
          {STEPS.map((s, i) => (
            <button key={s.key} className={`wt-wizrail-item${i === step ? ' on' : ''}${i < step ? ' done' : ''}`}
              onClick={() => i <= step && setStep(i)} disabled={i > step}>
              <span className="n">{i < step ? <Check size={12} /> : i + 1}</span>
              <span><span className="l">{s.label}</span><span className="s">{s.hint}</span></span>
            </button>
          ))}
          {f.client_name && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--wt-line)', fontSize: 11.5, color: 'var(--wt-muted)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--wt-ink)' }}>{f.client_name}</strong><br />
              {f.phone}{f.district ? ` · ${f.district}` : ''}
              {!f.needs_assessment && f.lines.length > 0 && <><br />{f.lines.length} service(s) · {bdt(totals.total)}</>}
              {f.needs_assessment && f.assessment_date && <><br />Assessment {f.assessment_date}</>}
            </div>
          )}
        </aside>

        <div className="wt-wizpane">
          {err && <div className="wt-formerr">{err}</div>}

          {/* ── 1 CLIENT ── */}
          {step === 0 && (
            <>
              <div className="wt-wizpane-h">
                <h2>Who is this request for?</h2>
                <p>Search the client book and the Seventh Sky contact directory first — an existing client keeps their whole service history in one place.</p>
              </div>
              <label className="wt-search" style={{ width: '100%', maxWidth: 460 }}>
                <Search />
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, mobile, email or address…" />
                {searching && <Loader2 size={14} className="wt-spin" />}
              </label>

              {q.trim().length >= 2 && (
                <>
                  {hits.water_tank.length > 0 && (
                    <div>
                      <div className="wt-sec-title" style={{ marginBottom: 8 }}>Existing {svcProfile().label} clients</div>
                      <div className="wt-lookup">
                        {hits.water_tank.map((c) => (
                          <button key={c.id} className="wt-lookup-item" onClick={() => useClient(c, true)}>
                            <span className="av">{initials(c.name)}</span>
                            <span style={{ flex: '1 0 0', minWidth: 0 }}>
                              <span className="nm">{c.name}</span>
                              <span className="mt">{[c.code, c.mobile, c.district].filter(Boolean).join(' · ')}</span>
                            </span>
                            <span style={{ fontSize: 11.5, color: 'var(--wt-accent-ink)', fontWeight: 700 }}>Use this client →</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {hits.contacts.length > 0 && (
                    <div>
                      <div className="wt-sec-title" style={{ marginBottom: 8 }}>Known to Seventh Sky, not yet a {svcProfile().label} client</div>
                      <div className="wt-lookup">
                        {hits.contacts.map((c) => (
                          <button key={c.id} className="wt-lookup-item" onClick={() => useClient(c, false)}>
                            <span className="av">{initials(c.name)}</span>
                            <span style={{ flex: '1 0 0', minWidth: 0 }}>
                              <span className="nm">{c.name}</span>
                              <span className="mt">{[c.mobile, c.email].filter(Boolean).join(' · ') || 'No contact details'}</span>
                            </span>
                            <span style={{ fontSize: 11.5, color: 'var(--wt-accent-ink)', fontWeight: 700 }}>Use these details →</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {!searching && !hits.water_tank.length && !hits.contacts.length && (
                    <EmptyState eyebrow="No match" title={`Nobody on file matches “${q.trim()}”`} hint="Register them below." />
                  )}
                </>
              )}

              <button className="wt-btn primary" style={{ alignSelf: 'flex-start' }}
                onClick={() => { setLinkedClient(null); setF((s) => ({ ...s, client_name: q.trim() || s.client_name, client_code: '' })); setStep(1); }}>
                <Plus size={15} /> {q.trim() ? `New client “${q.trim()}”` : 'Enter a new client'}
              </button>
            </>
          )}

          {/* ── 2 SERVICE NEEDED ── */}
          {step === 1 && (
            <>
              <div className="wt-wizpane-h">
                <h2>Client &amp; service details</h2>
                <p>Contact details so the coordinator can call back, and what the client is asking for.</p>
              </div>
              {linkedClient && (
                <div className="wt-note"><Sparkles size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
                  Pre-filled from {f.client_code ? `client ${f.client_code}` : 'the contact directory'} — check the details are current.</div>
              )}
              {f.enquiry_code && (
                <div className="wt-note"><Sparkles size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
                  Carried over from website enquiry <strong>{f.enquiry_code}</strong>. It will be marked Converted when you save.</div>
              )}

              <div className="wt-grid2">
                <div className="wt-field"><label>Client name *</label>
                  <input className="wt-input" value={f.client_name} onChange={(e) => set('client_name', e.target.value)} /></div>
                <div className="wt-field"><label>Client type</label>
                  <select className="wt-select" value={f.client_type} onChange={(e) => set('client_type', e.target.value)}>
                    {['Residential', 'Commercial', 'Industrial'].map((t) => <option key={t}>{t}</option>)}
                  </select></div>
              </div>
              <div className="wt-grid2">
                <div className="wt-field"><label>Phone *</label>
                  <input className="wt-input" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></div>
                <div className="wt-field"><label>Email</label>
                  <input className="wt-input" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></div>
              </div>
              <div className="wt-field"><label>Site address</label>
                <input className="wt-input" value={f.address} onChange={(e) => set('address', e.target.value)} /></div>
              <div className="wt-grid3">
                <div className="wt-field"><label>District</label>
                  <select className="wt-select" value={f.district} onChange={(e) => set('district', e.target.value)}>
                    <option value="">Select…</option>{(ref?.districts || []).map((d) => <option key={d}>{d}</option>)}
                  </select></div>
                <div className="wt-field"><label>Property type</label>
                  <select className="wt-select" value={f.property_type} onChange={(e) => set('property_type', e.target.value)}>
                    <option value="">Select…</option>{(ref?.property_types || []).map((t) => <option key={t}>{t}</option>)}
                  </select></div>
                <div className="wt-field"><label>{eq.type_label}</label>
                  <select className="wt-select" value={f.tank_type} onChange={(e) => set('tank_type', e.target.value)}>
                    <option value="">Select…</option>{(ref?.tank_types || eq.type_options).map((t) => <option key={t}>{t}</option>)}
                  </select></div>
              </div>
              <div className="wt-grid3">
                <div className="wt-field"><label>{eq.count_label}</label>
                  <input className="wt-input" type="number" value={f.tanks_count} onChange={(e) => set('tanks_count', e.target.value)} /></div>
                <div className="wt-field"><label>Category</label>
                  <select className="wt-select" value={f.category} onChange={(e) => set('category', e.target.value)}>
                    <option value="">Select…</option>{(ref?.categories || []).map((c) => <option key={c}>{c}</option>)}
                  </select></div>
                <div className="wt-field"><label>Priority</label>
                  <select className="wt-select" value={f.priority} onChange={(e) => set('priority', e.target.value)}>
                    {(ref?.priorities || ['High', 'Medium', 'Low']).map((p) => <option key={p}>{p}</option>)}
                  </select></div>
              </div>
              <div className="wt-grid2">
                <div className="wt-field"><label>Specific service requested</label>
                  <input className="wt-input" value={f.specific_service} onChange={(e) => set('specific_service', e.target.value)}
                    placeholder={`e.g. ${(ref?.catalog || [])[0]?.name || 'the exact service the client asked for'}`} /></div>
                <div className="wt-field"><label>Client's preferred date</label>
                  <DatePicker value={f.preferred_date} onChange={(v) => set('preferred_date', v)} /></div>
              </div>
              <div className="wt-field"><label>Assigned officer</label>
                <input className="wt-input" value={f.assigned_officer} onChange={(e) => set('assigned_officer', e.target.value)} /></div>
              <div className="wt-field"><label>What the client told us</label>
                <textarea className="wt-input" rows={3} style={{ resize: 'vertical' }} value={f.description}
                  onChange={(e) => set('description', e.target.value)} /></div>
            </>
          )}

          {/* ── 3 ROUTE ── */}
          {step === 2 && (
            <>
              <div className="wt-wizpane-h">
                <h2>Does this job need a site assessment?</h2>
                <p>A visit first is the norm (Sec. 6) — it confirms tank condition, access and risks before anything is priced. Skip it only when the job is well understood and standard.</p>
              </div>

              <div className="wt-routechoice">
                <button className={`wt-routecard${f.needs_assessment ? ' on' : ''}`} onClick={() => set('needs_assessment', true)}>
                  <span className="ic"><CalendarClock size={20} /></span>
                  <span className="tx">
                    <strong>Yes — schedule a site assessment</strong>
                    <span>Book a visit. The assessor confirms scope, records risks and photos, then the quotation is built from their findings.</span>
                  </span>
                  <span className="tick">{f.needs_assessment ? <Check size={14} /> : null}</span>
                </button>
                <button className={`wt-routecard${!f.needs_assessment ? ' on' : ''}`} onClick={() => set('needs_assessment', false)}>
                  <span className="ic"><FileText size={20} /></span>
                  <span className="tx">
                    <strong>No — quote straight away</strong>
                    <span>Pick services from the price schedule now. The quotation goes to the Quotations register and follows the normal workflow.</span>
                  </span>
                  <span className="tick">{!f.needs_assessment ? <Check size={14} /> : null}</span>
                </button>
              </div>

              <div className="wt-field">
                <label>Provider (optional at this stage)</label>
                <select className="wt-select" value={f.provider_name} onChange={(e) => set('provider_name', e.target.value)}>
                  <option value="">Assign later…</option>
                  {eligible.map((p) => (
                    <option key={p.id} value={p.business_name}>
                      {p.business_name}{p.rank ? ` · rank #${p.rank}` : ''}{p.rating ? ` · ${p.rating}★` : ''}
                    </option>
                  ))}
                </select>
                <span className="hint">
                  <Truck size={11} style={{ verticalAlign: -1 }} /> Only approved providers with a signed master agreement appear here (Sec. 6 Step 4)
                  {f.district ? `, covering ${f.district}` : ''}. {eligible.length} available.
                </span>
                {blocked.length > 0 && (
                  <span className="hint" style={{ color: 'var(--wt-amber)' }}>
                    <Ban size={11} style={{ verticalAlign: -1 }} /> {blocked.length} provider(s) hidden — {blocked[0].blocked_reason}
                    {blocked.length > 1 ? ' and similar' : ''}.
                  </span>
                )}
                {!eligible.length && (
                  <span className="hint" style={{ color: 'var(--wt-red)' }}>
                    <AlertTriangle size={11} style={{ verticalAlign: -1 }} /> No assignable providers. Record their master agreements on the provider file first.
                  </span>
                )}
              </div>

              <label className="wt-toggle" style={{ padding: '10px 12px', border: '1px solid var(--wt-line)', borderRadius: 8 }}>
                <input type="checkbox" checked={f.deposit_required} onChange={(e) => set('deposit_required', e.target.checked)} />
                <span>A deposit will be required before work starts</span>
              </label>
            </>
          )}

          {/* ── 4A SCHEDULE ASSESSMENT ── */}
          {step === 3 && f.needs_assessment && (
            <>
              <div className="wt-wizpane-h">
                <h2>Schedule the site assessment</h2>
                <p>Sec. 6 Step 3 — this creates the assessment record and opens the client's project file. The assessor fills it in on site.</p>
              </div>
              <div className="wt-grid2">
                <div className="wt-field"><label>Assessment date *</label>
                  <DatePicker value={f.assessment_date} onChange={(v) => set('assessment_date', v)} min={new Date().toISOString().slice(0, 10)} />
                  {f.preferred_date && <span className="hint">Client asked for {f.preferred_date}.</span>}
                </div>
                <div className="wt-field"><label>Assessing provider</label>
                  <select className="wt-select" value={f.provider_name} onChange={(e) => set('provider_name', e.target.value)}>
                    <option value="">Assign later…</option>
                    {eligible.map((p) => <option key={p.id} value={p.business_name}>{p.business_name}</option>)}
                  </select></div>
              </div>
              <div className="wt-note">
                On save: service request raised, site assessment <strong>scheduled</strong> for {f.assessment_date || '—'},
                client registered if new, and the project file opened at the Assessment stage.
                You will land on the assessment so it is ready for the visit.
              </div>
            </>
          )}

          {/* ── 4B BUILD QUOTE ── */}
          {step === 3 && !f.needs_assessment && (
            <>
              <div className="wt-wizpane-h">
                <h2>Build the quotation</h2>
                <p>Search the full price schedule, pick the services, adjust any rate, and add fees. This becomes a quotation in the register.</p>
              </div>

              <div className="wt-quote" style={{ gridTemplateColumns: '280px 1fr' }}>
                <aside className="wt-quote-pick" style={{ position: 'static' }}>
                  <label className="wt-search" style={{ width: '100%', marginBottom: 8 }}>
                    <Search /><input value={catQ} onChange={(e) => setCatQ(e.target.value)} placeholder="Search services…" />
                  </label>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                    <button className={`wt-chip${!catGroup ? ' on' : ''}`} onClick={() => setCatGroup('')}>All</button>
                    {(ref?.groups || []).map((g) => (
                      <button key={g} className={`wt-chip${catGroup === g ? ' on' : ''}`} onClick={() => setCatGroup(g)}>{g}</button>
                    ))}
                  </div>
                  <div className="wt-quote-cat">
                    {filteredCatalog.map((c) => (
                      <button key={c.id} className={`wt-catitem${chosen.has(c.code) ? ' on' : ''}`} onClick={() => addService(c)}>
                        <span className="cd">{c.code}</span>
                        <span className="nm">{c.name}{c.unit ? <em> / {c.unit}</em> : null}</span>
                        <span className="pr">{c.standard_price > 0 ? bdt(c.standard_price) : 'On quote'}</span>
                        {chosen.has(c.code) ? <Check size={13} style={{ color: 'var(--wt-green)', flex: 'none' }} /> : <Plus size={13} style={{ color: 'var(--wt-muted)', flex: 'none' }} />}
                      </button>
                    ))}
                    {!filteredCatalog.length && <div className="muted" style={{ fontSize: 12.5, padding: 16, textAlign: 'center' }}>Nothing matches that search.</div>}
                  </div>
                </aside>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
                  <div className="wt-card wt-tblcard">
                    <table className="wt-tbl">
                      <thead><tr>
                        <th style={{ width: 84 }}>Code</th><th>Description</th><th style={{ width: 56 }}>Qty</th>
                        <th style={{ width: 108 }}>Rate</th><th style={{ width: 100, textAlign: 'right' }}>Amount</th><th style={{ width: 34 }} />
                      </tr></thead>
                      <tbody>
                        {f.lines.map((l, i) => {
                          const edited = Number(l.standard_price) > 0 && Number(l.price) !== Number(l.standard_price);
                          return (
                            <tr key={i}>
                              <td>{l.kind === 'fee'
                                ? <input className="wt-input sm" value={l.code || ''} onChange={(e) => setLine(i, 'code', e.target.value)} placeholder="—" />
                                : <span className="id">{l.code}</span>}</td>
                              <td>{l.kind === 'fee'
                                ? <input className="wt-input sm" value={l.name} onChange={(e) => setLine(i, 'name', e.target.value)} placeholder="Fee or material" />
                                : <strong>{l.name}</strong>}</td>
                              <td><input className="wt-input sm" type="number" min="1" value={l.qty || 1} onChange={(e) => setLine(i, 'qty', e.target.value)} /></td>
                              <td>
                                <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                                  <input className="wt-input sm" type="number" value={l.price} onChange={(e) => setLine(i, 'price', e.target.value)} />
                                  {edited && <button className="wt-iconbtn" title={`Reset to ${bdt(l.standard_price)}`}
                                    onClick={() => setLine(i, 'price', l.standard_price)}><RotateCcw size={11} /></button>}
                                </div>
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 700 }}>{bdt(lineTotal(l))}</td>
                              <td><button className="wt-iconbtn" onClick={() => delLine(i)}><X size={13} /></button></td>
                            </tr>
                          );
                        })}
                        {!f.lines.length && <tr className="wt-empty-row"><td colSpan={6}>Pick services from the schedule on the left.</td></tr>}
                      </tbody>
                    </table>
                    <div className="wt-tblfoot">
                      <button className="wt-btn sm" onClick={addFee}><Plus size={13} /> Add other fee</button>
                      <span style={{ marginLeft: 'auto' }}>{f.lines.length} line{f.lines.length === 1 ? '' : 's'}</span>
                    </div>
                  </div>

                  <div className="wt-grid3">
                    <div className="wt-field"><label>Allocation fee (৳)</label>
                      <input className="wt-input" type="number" value={f.provider_allocation_fee} onChange={(e) => set('provider_allocation_fee', e.target.value)} /></div>
                    <div className="wt-field"><label>Discount (৳)</label>
                      <input className="wt-input" type="number" value={f.discount} onChange={(e) => set('discount', e.target.value)} /></div>
                    <div className="wt-field"><label>Validity</label>
                      <input className="wt-input" value={f.validity} onChange={(e) => set('validity', e.target.value)} /></div>
                  </div>

                  <div className="wt-card" style={{ padding: 16 }}>
                    <div className="wt-costrow"><span>Services</span><span>{bdt(totals.services)}</span></div>
                    {totals.fees > 0 && <div className="wt-costrow"><span>Other fees</span><span>{bdt(totals.fees)}</span></div>}
                    {totals.alloc > 0 && <div className="wt-costrow"><span>Allocation</span><span>{bdt(totals.alloc)}</span></div>}
                    {totals.disc > 0 && <div className="wt-costrow"><span style={{ color: 'var(--wt-green)' }}>Discount</span><span style={{ color: 'var(--wt-green)' }}>− {bdt(totals.disc)}</span></div>}
                    <div className="wt-costrow"><span>VAT (5%)</span><span>{f.vat_exempt ? 'Exempt' : bdt(totals.vat)}</span></div>
                    <div className="wt-costrow total"><span>Total</span><span className="amt">{bdt(totals.total)}</span></div>
                  </div>

                  <div className="wt-note">
                    On save: request raised and quotation created in the Quotations register, ready to send,
                    approve and turn into a Customer Service Agreement.
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="wt-wizfoot">
            {step > 0 && <button className="wt-btn" onClick={() => setStep(step - 1)}><ChevronLeft size={14} /> Back</button>}
            <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--wt-muted)' }}>Step {step + 1} of {STEPS.length}</span>
            <button className="wt-btn primary" disabled={saving || !stepValid()} onClick={next}>
              {step < STEPS.length - 1 ? <>Continue <ChevronRight size={14} /></>
                : saving ? 'Creating…'
                  : <><Check size={14} /> {f.needs_assessment ? 'Create request & schedule assessment' : 'Create request & quotation'}</>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
