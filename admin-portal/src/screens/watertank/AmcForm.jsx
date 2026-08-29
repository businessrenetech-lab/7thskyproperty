import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, Check, ChevronLeft, ChevronRight, X, Users, MapPin, Repeat,
  CalendarClock, Wallet, FileSignature, Plus, Loader2, Building2, ShieldCheck,
  AlertTriangle, Droplets,
} from 'lucide-react';
import api from '../../services/api';
import { useSvcNav, WtHead, DatePicker, Loading, EmptyState, bdt, toast, errText, dateFmt } from './common';

/*
 * New AMC — SSPC-WTCM-SOP-01 Sec. 10 (Phase 6, AMC Management).
 *
 * An AMC is a term contract that promises a SCHEDULE OF VISITS at a price, so the
 * wizard's centre of gravity is step 4: pick a package, see the exact visits it
 * generates and when each falls due, then price it. The Customer Service
 * Agreement supplies the vocabulary — seven package tiers (Schedule A), the term
 * running for the duration in the work order (Clause 2), and payment monthly /
 * quarterly / half-yearly / annually (Clause 9).
 */

const initials = (n) => String(n || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export default function AmcForm() {
  const nav = useSvcNav();
  const [params] = useSearchParams();

  const [ref, setRef] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);

  const [cq, setCq] = useState('');
  const [cHits, setCHits] = useState({ water_tank: [], contacts: [] });
  const [cSearching, setCSearching] = useState(false);
  const [clientChosen, setClientChosen] = useState(false);

  const [pq, setPq] = useState('');
  const [pHits, setPHits] = useState([]);

  const [f, setF] = useState({
    client: { id: null, code: '', name: '', phone: '', email: '', client_type: 'Residential', address: '', district: '' },
    property: { mode: 'none', id: null, property_code: '', title: '', category: 'residential', property_type: '', address: '', area: '', city: '', district: '' },
    contact_person: '', site_contact_name: '', site_contact_phone: '', access_notes: '',
    tank_type: '', tanks_count: '', tank_capacity: '', water_source: '',
    package_tier: '', visit_mix: {}, inclusions: '', exclusions: '',
    start_date: new Date().toISOString().slice(0, 10),
    duration_months: 12, auto_renew: false, renewal_notice_days: 30, frequency: 'Quarterly',
    annual_value: '', discount: '', vat_percent: 0,
    payment_frequency: 'Annually', advance_amount: '', payment_terms: '',
    response_hours: 24, emergency_included: false, emergency_callouts_included: 0,
    water_testing_included: false, reports_included: true,
    agreement_code: '', project_code: '',
    provider_code: '', provider_name: '', provider_id: null, assigned_officer: '',
    status: 'Active', notes: '',
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const setClient = (k, v) => setF((s) => ({ ...s, client: { ...s.client, [k]: v } }));
  const setProp = (k, v) => setF((s) => ({ ...s, property: { ...s.property, [k]: v } }));

  useEffect(() => {
    api.get('/wt-amc/reference')
      .then((r) => setRef(r.data))
      .catch((e) => setErr(errText(e, 'Could not load reference data')))
      .finally(() => setLoading(false));
  }, []);

  // Arriving from a client file or a project.
  useEffect(() => {
    const code = params.get('client');
    if (!code) return;
    api.get('/wt-projects/client-lookup', { params: { q: code } })
      .then(({ data }) => {
        const c = (data.water_tank || []).find((x) => x.code === code);
        if (c) useClient(c);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const runClientLookup = useCallback((term) => {
    if (term.trim().length < 2) { setCHits({ water_tank: [], contacts: [] }); setCSearching(false); return; }
    setCSearching(true);
    api.get('/wt-projects/client-lookup', { params: { q: term } })
      .then((r) => setCHits(r.data)).catch(() => setCHits({ water_tank: [], contacts: [] }))
      .finally(() => setCSearching(false));
  }, []);
  useEffect(() => { const t = setTimeout(() => runClientLookup(cq), 220); return () => clearTimeout(t); }, [cq, runClientLookup]);

  useEffect(() => {
    if (pq.trim().length < 2) { setPHits([]); return undefined; }
    const t = setTimeout(() => {
      api.get('/wt-projects/property-lookup', { params: { q: pq } })
        .then((r) => setPHits(r.data || [])).catch(() => setPHits([]));
    }, 220);
    return () => clearTimeout(t);
  }, [pq]);

  function useClient(c) {
    setClientChosen(true);
    setF((s) => ({
      ...s,
      client: {
        id: c.id, code: c.code || '', name: c.name || '', phone: c.mobile || '',
        email: c.email || '', client_type: c.client_type || 'Residential',
        address: c.service_address || '', district: c.district || '',
      },
      tank_type: c.tank_type || s.tank_type,
      tanks_count: c.tanks_count || s.tanks_count,
      tank_capacity: c.tank_capacity || s.tank_capacity,
    }));
    setStep(1);
  }

  const packages = ref?.packages || [];
  const chosenPkg = packages.find((p) => p.key === f.package_tier) || null;

  // Selecting a tier seeds its visit mix and service levels; anything can then be overridden.
  const choosePackage = (pkg) => setF((s) => ({
    ...s,
    package_tier: pkg.key,
    visit_mix: { ...pkg.visits },
    response_hours: pkg.response_hours,
    water_testing_included: !!pkg.water_testing_included,
    emergency_callouts_included: pkg.emergency_callouts_included || 0,
    emergency_included: (pkg.emergency_callouts_included || 0) > 0,
    inclusions: s.inclusions || pkg.blurb,
    client_type: pkg.client_type,
  }));

  const setMix = (key, v) => setF((s) => ({ ...s, visit_mix: { ...s.visit_mix, [key]: Math.max(0, Number(v) || 0) } }));

  // Live plan + billing preview from the server, so what you see is what saves.
  const refreshPreview = useCallback(async () => {
    if (!f.package_tier && !Object.keys(f.visit_mix).length) return;
    setPreviewing(true);
    try {
      const { data } = await api.post('/wt-amc/preview', {
        package_tier: f.package_tier, visit_mix: f.visit_mix,
        start_date: f.start_date, duration_months: Number(f.duration_months) || 12,
        renewal_notice_days: Number(f.renewal_notice_days) || 30,
        annual_value: Number(f.annual_value) || 0, discount: Number(f.discount) || 0,
        vat_percent: Number(f.vat_percent) || 0, payment_frequency: f.payment_frequency,
        advance_amount: Number(f.advance_amount) || 0,
      });
      setPreview(data);
    } catch (e) { toast.err(errText(e, 'Could not build the visit plan')); }
    finally { setPreviewing(false); }
  }, [f.package_tier, f.visit_mix, f.start_date, f.duration_months, f.renewal_notice_days,
    f.annual_value, f.discount, f.vat_percent, f.payment_frequency, f.advance_amount]);

  useEffect(() => { if (step === 3 || step === 4 || step === 5) refreshPreview(); /* eslint-disable-next-line */ }, [step]);

  const STEPS = [
    { key: 'client', label: 'Client', hint: 'Who the contract is with', icon: Users },
    { key: 'site', label: 'Site & tanks', hint: 'What it covers', icon: MapPin },
    { key: 'package', label: 'Package', hint: 'Schedule A tier', icon: Repeat },
    { key: 'plan', label: 'Visit plan', hint: 'Term and schedule', icon: CalendarClock },
    { key: 'money', label: 'Commercials', hint: 'Value and billing', icon: Wallet },
    { key: 'review', label: 'Review', hint: 'Confirm and create', icon: FileSignature },
  ];

  const stepValid = () => {
    if (step === 0) return !!f.client.name.trim();
    if (step === 1) return f.property.mode !== 'new' || !!f.property.title.trim();
    if (step === 2) return !!f.package_tier;
    if (step === 3) return (preview?.plan?.length || 0) > 0;
    return true;
  };

  const submit = async () => {
    setSaving(true); setErr('');
    try {
      const { data } = await api.post('/wt-amc', {
        ...f,
        client: { ...f.client, mode: f.client.code ? 'existing' : 'new' },
        property: f.property.mode === 'none' ? { mode: 'none', address: f.property.address, district: f.property.district } : f.property,
        tanks_count: Number(f.tanks_count) || 0,
        duration_months: Number(f.duration_months) || 12,
        annual_value: Number(f.annual_value) || 0,
        discount: Number(f.discount) || 0,
        vat_percent: Number(f.vat_percent) || 0,
        advance_amount: Number(f.advance_amount) || 0,
        renewal_notice_days: Number(f.renewal_notice_days) || 30,
        response_hours: Number(f.response_hours) || 24,
        emergency_callouts_included: Number(f.emergency_callouts_included) || 0,
      });
      toast.ok(`${data.amc.code} created — ${data.visits_created} visit(s) scheduled`);
      nav('/water-tank/amc');
    } catch (e) { setErr(errText(e, 'Could not create the AMC')); setSaving(false); }
  };

  const next = () => { if (step < STEPS.length - 1) setStep(step + 1); else submit(); };

  if (loading) return <Loading />;

  const plan = preview?.plan || [];
  const billing = preview?.billing || {};
  const mixTotal = Object.values(f.visit_mix).reduce((s, n) => s + (Number(n) || 0), 0);

  return (
    <>
      <WtHead
        crumb={<div className="wt-crumb">
          <span className="lnk" onClick={() => nav('/water-tank/amc')}>AMC</span>
          {' › '}<span style={{ color: 'var(--wt-accent-ink)' }}>New contract</span>
        </div>}
        title="New AMC Contract"
        subtitle={`SOP-01 Sec. 10 — Phase 6, AMC Management${ref?.next_code ? ` · reserving ${ref.next_code}` : ''}`}
      >
        <button className="wt-btn" onClick={() => nav('/water-tank/amc')}><X size={14} /> Cancel</button>
      </WtHead>

      <div className="wt-wizard">
        <aside className="wt-wizrail">
          <div className="wt-wizrail-h">AMC steps</div>
          {STEPS.map((s, i) => (
            <button key={s.key} className={`wt-wizrail-item${i === step ? ' on' : ''}${i < step ? ' done' : ''}`}
              onClick={() => i <= step && setStep(i)} disabled={i > step}>
              <span className="n">{i < step ? <Check size={12} /> : i + 1}</span>
              <span><span className="l">{s.label}</span><span className="s">{s.hint}</span></span>
            </button>
          ))}
          {ref?.next_code && (
            <div className="wt-railnote">
              <span className="k">AMC No.</span>
              <span className="v">{ref.next_code}</span>
              <span className="h">Reserved — assigned on save</span>
            </div>
          )}
          {f.client.name && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--wt-line)', fontSize: 11.5, color: 'var(--wt-muted)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--wt-ink)' }}>{f.client.name}</strong><br />
              {[f.client.code, f.client.phone].filter(Boolean).join(' · ')}
              {chosenPkg && <><br />{chosenPkg.label}</>}
              {plan.length > 0 && <><br />{plan.length} visit(s) · {f.duration_months} months</>}
              {billing.contract_value > 0 && <><br />{bdt(billing.contract_value)}</>}
            </div>
          )}
        </aside>

        <div className="wt-wizpane">
          {err && <div className="wt-formerr">{err}</div>}

          {/* ── 1 CLIENT ── */}
          {step === 0 && (
            <>
              <div className="wt-wizpane-h">
                <h2>Who is the AMC with?</h2>
                <p>An AMC runs for a term and is judged on whether its visits happened, so it belongs to one client file. Search first — an existing client keeps their whole history together.</p>
              </div>
              <label className="wt-search" style={{ width: '100%', maxWidth: 460 }}>
                <Search />
                <input autoFocus value={cq} onChange={(e) => setCq(e.target.value)} placeholder="Search by name, mobile, email or code…" />
                {cSearching && <Loader2 size={14} className="wt-spin" />}
              </label>
              {cq.trim().length >= 2 && (
                <div className="wt-lookup">
                  {(cHits.water_tank || []).map((c) => (
                    <button key={c.id} className="wt-lookup-item" onClick={() => useClient(c)}>
                      <span className="av">{initials(c.name)}</span>
                      <span style={{ flex: '1 0 0', minWidth: 0 }}>
                        <span className="nm">{c.name}</span>
                        <span className="mt">{[c.code, c.mobile, c.district].filter(Boolean).join(' · ')}</span>
                      </span>
                      <span style={{ fontSize: 11.5, color: 'var(--wt-accent-ink)', fontWeight: 700 }}>Use →</span>
                    </button>
                  ))}
                  {!cSearching && !(cHits.water_tank || []).length && (
                    <EmptyState eyebrow="No match" title={`Nobody matches “${cq.trim()}”`} hint="Register them below." />
                  )}
                </div>
              )}

              {(clientChosen || f.client.name) ? (
                <div className="wt-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="wt-sec-title">{f.client.code ? `Linked client — ${f.client.code}` : 'New client'}</div>
                  <div className="wt-grid2">
                    <div className="wt-field"><label>Client name *</label>
                      <input className="wt-input" value={f.client.name} onChange={(e) => setClient('name', e.target.value)} /></div>
                    <div className="wt-field"><label>Client type</label>
                      <select className="wt-select" value={f.client.client_type} onChange={(e) => setClient('client_type', e.target.value)}>
                        {['Residential', 'Commercial', 'Industrial', 'Institutional'].map((t) => <option key={t}>{t}</option>)}
                      </select></div>
                    <div className="wt-field"><label>Mobile</label>
                      <input className="wt-input" value={f.client.phone} onChange={(e) => setClient('phone', e.target.value)} /></div>
                    <div className="wt-field"><label>Email</label>
                      <input className="wt-input" value={f.client.email} onChange={(e) => setClient('email', e.target.value)} /></div>
                    <div className="wt-field"><label>Contact person on site</label>
                      <input className="wt-input" value={f.contact_person} onChange={(e) => set('contact_person', e.target.value)} /></div>
                    <div className="wt-field"><label>District</label>
                      <input className="wt-input" value={f.client.district} onChange={(e) => setClient('district', e.target.value)} /></div>
                  </div>
                  <div className="wt-note">
                    <strong>Sec. 7 Step 6 —</strong> the Customer Service Agreement governs the AMC.
                    Link it on the Review step if it is already signed, or raise it from the client file afterwards.
                  </div>
                </div>
              ) : (
                <button className="wt-btn primary" style={{ alignSelf: 'flex-start' }}
                  onClick={() => { setClientChosen(true); setClient('name', cq.trim()); }}>
                  <Plus size={15} /> {cq.trim() ? `New client “${cq.trim()}”` : 'Enter a new client'}
                </button>
              )}
            </>
          )}

          {/* ── 2 SITE & TANKS ── */}
          {step === 1 && (
            <>
              <div className="wt-wizpane-h">
                <h2>What does the contract cover?</h2>
                <p>The site and the tank estate. Visit pricing follows the number and size of tanks, so record them accurately.</p>
              </div>
              <div className="wt-choices">
                {[
                  { k: 'existing', t: 'Assign from the register', h: 'A property already on file', ic: Building2 },
                  { k: 'new', t: 'Create a new property', h: 'Joins the shared register', ic: Plus },
                  { k: 'none', t: 'Address only', h: 'No property record', ic: MapPin },
                ].map((o) => (
                  <button key={o.k} className={`wt-choice${f.property.mode === o.k ? ' on' : ''}`} onClick={() => setProp('mode', o.k)}>
                    <o.ic size={18} /><span className="t">{o.t}</span><span className="h">{o.h}</span>
                  </button>
                ))}
              </div>

              {f.property.mode === 'existing' && (
                <>
                  <label className="wt-search" style={{ width: '100%', maxWidth: 460 }}>
                    <Search /><input value={pq} onChange={(e) => setPq(e.target.value)} placeholder="Search properties…" />
                  </label>
                  {f.property.id && <div className="wt-note"><ShieldCheck size={15} /> {f.property.property_code} — {f.property.title} assigned.</div>}
                  {pq.trim().length >= 2 && (
                    <div className="wt-lookup">
                      {pHits.map((p) => (
                        <button key={p.id} className="wt-lookup-item" onClick={() => setF((s) => ({
                          ...s,
                          property: { ...s.property, mode: 'existing', id: p.id, property_code: p.property_code, title: p.title, address: p.address || '', area: p.area || '', district: p.district || '', property_type: p.property_type || '' },
                        }))}>
                          <span className="av"><Building2 size={16} /></span>
                          <span style={{ flex: '1 0 0', minWidth: 0 }}>
                            <span className="nm">{p.title}</span>
                            <span className="mt">{[p.property_code, p.area, p.district].filter(Boolean).join(' · ')}</span>
                          </span>
                          <span style={{ fontSize: 11.5, color: 'var(--wt-accent-ink)', fontWeight: 700 }}>Assign →</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              {f.property.mode === 'new' && (
                <div className="wt-card" style={{ padding: 18 }}>
                  <div className="wt-grid2">
                    <div className="wt-field" style={{ gridColumn: '1 / -1' }}><label>Property title *</label>
                      <input className="wt-input" value={f.property.title} onChange={(e) => setProp('title', e.target.value)} /></div>
                    <div className="wt-field"><label>Property type</label>
                      <input className="wt-input" value={f.property.property_type} onChange={(e) => setProp('property_type', e.target.value)} /></div>
                    <div className="wt-field"><label>Area</label>
                      <input className="wt-input" value={f.property.area} onChange={(e) => setProp('area', e.target.value)} /></div>
                  </div>
                </div>
              )}

              <div className="wt-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="wt-sec-title">Site &amp; tanks</div>
                <div className="wt-grid2">
                  <div className="wt-field" style={{ gridColumn: '1 / -1' }}><label>Service address</label>
                    <input className="wt-input" value={f.property.address} onChange={(e) => setProp('address', e.target.value)} placeholder={f.client.address} /></div>
                  <div className="wt-field"><label>Tank type</label>
                    <select className="wt-select" value={f.tank_type} onChange={(e) => set('tank_type', e.target.value)}>
                      <option value="">Select…</option>
                      {(ref?.tank_types || []).map((t) => <option key={t}>{t}</option>)}
                    </select></div>
                  <div className="wt-field"><label>Number of tanks</label>
                    <input className="wt-input" type="number" min="0" value={f.tanks_count} onChange={(e) => set('tanks_count', e.target.value)} /></div>
                  <div className="wt-field"><label>Total capacity</label>
                    <input className="wt-input" value={f.tank_capacity} onChange={(e) => set('tank_capacity', e.target.value)} placeholder="e.g. 3 × 2,000 L" /></div>
                  <div className="wt-field"><label>Water source</label>
                    <input className="wt-input" value={f.water_source} onChange={(e) => set('water_source', e.target.value)} placeholder="WASA mains, deep tube well…" /></div>
                  <div className="wt-field"><label>Site contact name</label>
                    <input className="wt-input" value={f.site_contact_name} onChange={(e) => set('site_contact_name', e.target.value)} /></div>
                  <div className="wt-field"><label>Site contact phone</label>
                    <input className="wt-input" value={f.site_contact_phone} onChange={(e) => set('site_contact_phone', e.target.value)} /></div>
                  <div className="wt-field" style={{ gridColumn: '1 / -1' }}><label>Access notes</label>
                    <textarea className="wt-input" rows={2} value={f.access_notes} onChange={(e) => set('access_notes', e.target.value)} /></div>
                </div>
              </div>
            </>
          )}

          {/* ── 3 PACKAGE ── */}
          {step === 2 && (
            <>
              <div className="wt-wizpane-h">
                <h2>Which AMC package?</h2>
                <p>The seven tiers from Schedule A of the Customer Service Agreement. Each seeds a visit mix and a service level, which you can adjust on the next step.</p>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {packages.map((p) => {
                  const total = Object.values(p.visits).reduce((s, n) => s + n, 0);
                  return (
                    <button key={p.key} className={`wt-choice${f.package_tier === p.key ? ' on' : ''}`}
                      style={{ width: '100%' }} onClick={() => choosePackage(p)}>
                      <Repeat size={18} />
                      <span className="t">{p.label} <span style={{ fontWeight: 400, color: 'var(--wt-muted)' }}>· {p.client_type}</span></span>
                      <span className="h">{p.blurb}</span>
                      <span className="h" style={{ marginTop: 4 }}>
                        <strong>{total} visits/year</strong> —{' '}
                        {Object.entries(p.visits).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k.toLowerCase()}`).join(' · ')}
                        {' · '}response within {p.response_hours}h
                        {p.emergency_callouts_included > 0 && ` · ${p.emergency_callouts_included} emergency call-out(s)`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ── 4 VISIT PLAN ── */}
          {step === 3 && (
            <>
              <div className="wt-wizpane-h">
                <h2>Term and visit schedule</h2>
                <p>SOP Sec. 10 names four AMC activities: cleaning, inspection, water testing and pump inspection. Set how many of each per year and the plan spreads them evenly across the term.</p>
              </div>

              <div className="wt-grid3">
                <div className="wt-field"><label>Start date</label>
                  <DatePicker value={f.start_date} onChange={(v) => set('start_date', v)} /></div>
                <div className="wt-field"><label>Duration (months)</label>
                  <select className="wt-select" value={f.duration_months} onChange={(e) => set('duration_months', Number(e.target.value))}>
                    {[6, 12, 18, 24, 36].map((m) => <option key={m} value={m}>{m} months</option>)}
                  </select></div>
                <div className="wt-field"><label>Renewal notice (days)</label>
                  <input className="wt-input" type="number" min="0" value={f.renewal_notice_days} onChange={(e) => set('renewal_notice_days', e.target.value)} /></div>
              </div>

              <div className="wt-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="wt-sec-title">Visits per year</div>
                <div className="wt-grid2">
                  {(ref?.visit_types || []).map((vt) => (
                    <div className="wt-field" key={vt.key}>
                      <label>{vt.label} <span style={{ color: 'var(--wt-muted)' }}>({vt.sop})</span></label>
                      <input className="wt-input" type="number" min="0" value={f.visit_mix[vt.key] ?? 0}
                        onChange={(e) => setMix(vt.key, e.target.value)} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--wt-muted)' }}>{mixTotal} visits per year</span>
                  <button className="wt-btn primary" style={{ marginLeft: 'auto' }} disabled={previewing} onClick={refreshPreview}>
                    {previewing ? <Loader2 size={14} className="wt-spin" /> : <CalendarClock size={14} />} Build the plan
                  </button>
                </div>
              </div>

              {plan.length > 0 && (
                <div className="wt-card wt-tblcard">
                  <div style={{ padding: '14px 20px 0' }}>
                    <div className="wt-sec-title">Planned visits ({plan.length})</div>
                    <div style={{ fontSize: 11.5, color: 'var(--wt-muted)', marginTop: 3 }}>
                      Runs to {preview.end_date} · renewal review due {preview.renewal_due_at}.
                      Visits sharing a date are delivered in one site mobilisation.
                    </div>
                  </div>
                  <table className="wt-tbl">
                    <thead><tr><th style={{ width: 60 }}>#</th><th style={{ width: 130 }}>Due</th><th>Activity</th></tr></thead>
                    <tbody>
                      {plan.map((v) => (
                        <tr key={v.visit_no}>
                          <td className="id">{v.visit_no}</td>
                          <td>{dateFmt(v.due_date)}</td>
                          <td><Droplets size={12} style={{ verticalAlign: -1, color: 'var(--wt-accent-ink)' }} /> {v.visit_type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="wt-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="wt-sec-title">Service level</div>
                <div className="wt-grid3">
                  <div className="wt-field"><label>Response time (hours)</label>
                    <input className="wt-input" type="number" min="1" value={f.response_hours} onChange={(e) => set('response_hours', e.target.value)} /></div>
                  <div className="wt-field"><label>Emergency call-outs included</label>
                    <input className="wt-input" type="number" min="0" value={f.emergency_callouts_included} onChange={(e) => set('emergency_callouts_included', e.target.value)} /></div>
                  <div className="wt-field"><label>Auto-renew</label>
                    <label className="wt-toggle"><input type="checkbox" checked={f.auto_renew} onChange={(e) => set('auto_renew', e.target.checked)} /> Renew automatically</label></div>
                </div>
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                  <label className="wt-toggle"><input type="checkbox" checked={f.water_testing_included} onChange={(e) => set('water_testing_included', e.target.checked)} /> Water testing included</label>
                  <label className="wt-toggle"><input type="checkbox" checked={f.reports_included} onChange={(e) => set('reports_included', e.target.checked)} /> Reports issued after each visit</label>
                </div>
                <div className="wt-grid2">
                  <div className="wt-field"><label>Inclusions</label>
                    <textarea className="wt-input" rows={2} value={f.inclusions} onChange={(e) => set('inclusions', e.target.value)} /></div>
                  <div className="wt-field"><label>Exclusions</label>
                    <textarea className="wt-input" rows={2} value={f.exclusions} onChange={(e) => set('exclusions', e.target.value)} placeholder="Structural repairs, tank replacement…" /></div>
                </div>
              </div>
            </>
          )}

          {/* ── 5 COMMERCIALS ── */}
          {step === 4 && (
            <>
              <div className="wt-wizpane-h">
                <h2>Contract value and billing</h2>
                <p>Clause 9 allows monthly, quarterly, half-yearly or annual payment. The instalment and per-visit figures are derived, so they can never disagree with the total.</p>
              </div>
              <div className="wt-grid3">
                <div className="wt-field"><label>Annual value (৳)</label>
                  <input className="wt-input" type="number" min="0" value={f.annual_value} onChange={(e) => set('annual_value', e.target.value)} /></div>
                <div className="wt-field"><label>Discount (৳)</label>
                  <input className="wt-input" type="number" min="0" value={f.discount} onChange={(e) => set('discount', e.target.value)} /></div>
                <div className="wt-field"><label>VAT (%)</label>
                  <input className="wt-input" type="number" min="0" value={f.vat_percent} onChange={(e) => set('vat_percent', e.target.value)} /></div>
                <div className="wt-field"><label>Payment frequency</label>
                  <select className="wt-select" value={f.payment_frequency} onChange={(e) => set('payment_frequency', e.target.value)}>
                    {(ref?.payment_frequencies || []).map((p) => <option key={p.key} value={p.key}>{p.key}</option>)}
                  </select></div>
                <div className="wt-field"><label>Advance on signing (৳)</label>
                  <input className="wt-input" type="number" min="0" value={f.advance_amount} onChange={(e) => set('advance_amount', e.target.value)} /></div>
                <div className="wt-field" style={{ justifyContent: 'flex-end' }}>
                  <button className="wt-btn" disabled={previewing} onClick={refreshPreview}>Recalculate</button>
                </div>
                <div className="wt-field" style={{ gridColumn: '1 / -1' }}><label>Payment terms</label>
                  <input className="wt-input" value={f.payment_terms} onChange={(e) => set('payment_terms', e.target.value)} /></div>
              </div>

              {billing.contract_value > 0 && (
                <div className="wt-card" style={{ padding: 18 }}>
                  <div className="wt-sec-title" style={{ marginBottom: 10 }}>Derived from the figures above</div>
                  <div className="wt-costrow"><span>Annual value</span><span>{bdt(billing.annual_value)}</span></div>
                  {billing.discount > 0 && <div className="wt-costrow"><span style={{ color: 'var(--wt-green)' }}>Discount</span><span style={{ color: 'var(--wt-green)' }}>− {bdt(billing.discount)}</span></div>}
                  <div className="wt-costrow"><span>VAT ({billing.vat_percent}%)</span><span>{bdt(billing.vat)}</span></div>
                  <div className="wt-costrow total"><span>Contract value</span><span className="amt">{bdt(billing.contract_value)}</span></div>
                  <div className="wt-costrow" style={{ marginTop: 8 }}>
                    <span><strong>{billing.instalments} × {billing.payment_frequency.toLowerCase()} instalment</strong></span>
                    <span><strong>{bdt(billing.instalment_amount)}</strong></span>
                  </div>
                  {billing.advance_amount > 0 && (
                    <>
                      <div className="wt-costrow"><span>Advance on signing</span><span>{bdt(billing.advance_amount)}</span></div>
                      <div className="wt-costrow"><span>Balance across the term</span><span>{bdt(billing.balance)}</span></div>
                    </>
                  )}
                  <div className="wt-costrow"><span>Value per visit ({billing.visits_planned} visits)</span><span>{bdt(billing.per_visit_value)}</span></div>
                </div>
              )}

              <div className="wt-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="wt-sec-title">Delivery &amp; linkage</div>
                <div className="wt-grid2">
                  <div className="wt-field"><label>Service provider</label>
                    <select className="wt-select" value={f.provider_code} onChange={(e) => {
                      const p = (ref?.providers || []).find((x) => x.code === e.target.value);
                      setF((s) => ({ ...s, provider_code: e.target.value, provider_name: p?.business_name || '', provider_id: p?.id || null }));
                    }}>
                      <option value="">Assign later</option>
                      {(ref?.providers || []).filter((p) => p.assignable).map((p) => <option key={p.code} value={p.code}>{p.business_name}</option>)}
                    </select></div>
                  <div className="wt-field"><label>Operations coordinator</label>
                    <input className="wt-input" value={f.assigned_officer} onChange={(e) => set('assigned_officer', e.target.value)} /></div>
                  <div className="wt-field"><label>Customer Service Agreement ref.</label>
                    <input className="wt-input" value={f.agreement_code} onChange={(e) => set('agreement_code', e.target.value)} placeholder="ENV-WTCSA-…" /></div>
                  <div className="wt-field"><label>Linked project</label>
                    <select className="wt-select" value={f.project_code} onChange={(e) => set('project_code', e.target.value)}>
                      <option value="">None</option>
                      {(ref?.projects || []).map((p) => <option key={p.code} value={p.code}>{p.code} — {p.client_name}</option>)}
                    </select></div>
                  <div className="wt-field" style={{ gridColumn: '1 / -1' }}><label>Notes</label>
                    <textarea className="wt-input" rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></div>
                </div>
              </div>
            </>
          )}

          {/* ── 6 REVIEW ── */}
          {step === 5 && (
            <>
              <div className="wt-wizpane-h">
                <h2>Review and create</h2>
                <p>The contract and every planned visit are created in one save.</p>
              </div>
              <div className="wt-revgrid">
                <Card title="Contract" rows={[
                  ['AMC No.', ref?.next_code || 'On save'],
                  ['Package', chosenPkg?.label || '—'],
                  ['Term', `${f.duration_months} months from ${f.start_date}`],
                  ['Ends', preview?.end_date || '—'],
                  ['Renewal review', preview?.renewal_due_at || '—'],
                  ['Auto-renew', f.auto_renew ? 'Yes' : 'No'],
                ]} />
                <Card title="Client" rows={[
                  ['Name', f.client.name], ['Status', f.client.code ? `Existing — ${f.client.code}` : 'New client'],
                  ['Type', f.client.client_type], ['Mobile', f.client.phone], ['Email', f.client.email],
                ]} />
                <Card title="Site" rows={[
                  ['Property', f.property.mode === 'existing' ? `${f.property.property_code}` : f.property.mode === 'new' ? `New — ${f.property.title}` : 'Address only'],
                  ['Address', f.property.address || f.client.address || '—'],
                  ['Tanks', f.tanks_count ? `${f.tanks_count} × ${f.tank_type || 'tank'}` : (f.tank_type || '—')],
                  ['Capacity', f.tank_capacity], ['Water source', f.water_source],
                ]} />
                <Card title="Visit plan" rows={[
                  ['Visits planned', plan.length],
                  ['Per year', mixTotal],
                  ['First visit', plan[0]?.due_date || '—'],
                  ['Last visit', plan[plan.length - 1]?.due_date || '—'],
                  ['Response', `Within ${f.response_hours}h`],
                ]} />
                <Card title="Billing" rows={[
                  ['Contract value', bdt(billing.contract_value)],
                  ['Instalments', billing.instalments ? `${billing.instalments} × ${bdt(billing.instalment_amount)} (${billing.payment_frequency})` : '—'],
                  ['Advance', billing.advance_amount ? bdt(billing.advance_amount) : 'None'],
                  ['Per visit', bdt(billing.per_visit_value)],
                ]} />
                <Card title="Delivery" rows={[
                  ['Provider', f.provider_name || 'Assign later'],
                  ['Coordinator', f.assigned_officer || '—'],
                  ['Agreement', f.agreement_code || 'Not linked'],
                  ['Project', f.project_code || '—'],
                ]} />
              </div>

              {!f.agreement_code && (
                <div className="wt-warn">
                  <AlertTriangle size={15} />
                  No Customer Service Agreement linked. Sec. 7 Step 6 requires a signed agreement
                  before work commences — link it here or raise it from the client file.
                </div>
              )}
              {!Number(f.annual_value) && (
                <div className="wt-warn"><AlertTriangle size={15} /> The contract value is zero — the AMC will be created unpriced.</div>
              )}
            </>
          )}

          <div className="wt-wizfoot">
            {step > 0 && <button className="wt-btn" onClick={() => setStep(step - 1)}><ChevronLeft size={14} /> Back</button>}
            <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--wt-muted)' }}>Step {step + 1} of {STEPS.length}</span>
            <button className="wt-btn primary" disabled={saving || !stepValid()} onClick={next}>
              {step < STEPS.length - 1 ? <>Continue <ChevronRight size={14} /></>
                : saving ? 'Creating…' : <><Check size={14} /> Create AMC &amp; schedule {plan.length} visit(s)</>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Card({ title, rows }) {
  return (
    <div className="wt-card" style={{ padding: 16 }}>
      <div className="wt-sec-title" style={{ marginBottom: 10 }}>{title}</div>
      <div className="wt-profile">
        {rows.map(([k, v]) => <div className="f" key={k}><div className="k">{k}</div><div className="v">{v || '—'}</div></div>)}
      </div>
    </div>
  );
}
