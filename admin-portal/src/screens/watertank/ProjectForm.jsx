import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import {
  Search, Check, ChevronLeft, ChevronRight, X, Users, MapPin, ClipboardList,
  GitBranch, CalendarClock, FileSignature, Plus, Loader2, Building2, AlertTriangle,
  ShieldCheck, Trash2, Repeat,
} from 'lucide-react';
import api from '../../services/api';
import { WtHead, DatePicker, Loading, EmptyState, bdt, toast, errText, Pill } from './common';

/*
 * New Project — SSPC-WTCM-SOP-01 Sec. 4.
 *
 * The project is the spine of the file: everything downstream hangs off its code.
 * So the wizard's job is to establish the four things nothing else can infer —
 * WHO the client is, WHERE the site is, WHAT the scope is, and HOW the job got
 * here — and then raise the records the SOP says must exist alongside it. The
 * service request is always raised (Sec. 5 Step 1 puts it at the head of the chain),
 * and a site assessment when the operator says the job needs a visit first (Sec. 6).
 */

const initials = (n) => String(n || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const lineTotal = (l) => Number(l.price || 0) * (Number(l.qty) || 1);

export default function ProjectForm() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { code: editCode } = useParams();
  const isEdit = !!editCode;

  const [ref, setRef] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  // ── step 0: client ──
  const [cq, setCq] = useState('');
  const [cHits, setCHits] = useState({ water_tank: [], contacts: [] });
  const [cSearching, setCSearching] = useState(false);
  const [clientMode, setClientMode] = useState(null); // 'existing' | 'new'

  // ── step 1: property ──
  const [pq, setPq] = useState('');
  const [pHits, setPHits] = useState([]);
  const [pSearching, setPSearching] = useState(false);

  // ── step 2: scope ──
  const [catQ, setCatQ] = useState('');
  const [catGroup, setCatGroup] = useState('');

  const [f, setF] = useState({
    // client
    client: { mode: 'new', id: null, code: '', name: '', phone: '', email: '', client_type: 'Residential', address: '', district: '', property_type: '' },
    // property
    property: { mode: 'none', id: null, property_code: '', title: '', category: 'residential', property_type: '', address: '', area: '', city: '', district: '', total_floors: '', total_units: '' },
    site_contact_name: '', site_contact_phone: '', access_notes: '',
    // scope
    name: '', project_type: 'Cleaning & Maintenance', service_category: '',
    services: [], scope_summary: '', priority: 'Medium',
    tank_type: '', tanks_count: '', tank_capacity: '', water_source: '',
    // origin
    origin: 'Direct', enquiry_code: '', request_code: '', assessment_code: '', quotation_code: '',
    route: 'assessment', // 'assessment' | 'quotation' — what to do next
    assessment_date: '',
    under_amc: false, amc_code: '', amc_package: '', amc_frequency: 'Quarterly', amc_visit_no: '', amc_next_visit: '',
    // delivery
    provider_code: '', provider_name: '', provider_id: null,
    assigned_officer: '', ops_manager: '',
    start_date: new Date().toISOString().slice(0, 10),
    scheduled_date: '', target_completion: '',
    deposit_required: false, deposit_amount: '', payment_terms: '50% advance, balance on completion',
    provider_cost: '', notes: '',
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const setClient = (k, v) => setF((s) => ({ ...s, client: { ...s.client, [k]: v } }));
  const setProp = (k, v) => setF((s) => ({ ...s, property: { ...s.property, [k]: v } }));

  useEffect(() => {
    api.get('/wt-projects/reference')
      .then((r) => setRef(r.data))
      .catch((e) => setErr(errText(e, 'Could not load reference data')))
      .finally(() => setLoading(false));
  }, []);

  /*
   * Edit mode. The same six steps, loaded from the project — editing a project is
   * the same journey as creating one, not a stripped-down quick-edit form. The
   * client and site steps land already resolved, so nothing is re-created unless
   * the operator actually changes them.
   */
  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    api.get(`/wt-projects/${editCode}`)
      .then(({ data }) => {
        if (cancelled) return;
        const p = data.project;
        const services = Array.isArray(p.services) ? p.services
          : (() => { try { return JSON.parse(p.services || '[]'); } catch { return []; } })();
        setClientMode('existing');
        setF((s) => ({
          ...s,
          client: {
            mode: p.client_code ? 'existing' : 'new',
            id: p.client_id, code: p.client_code || '',
            name: p.client_name || '', phone: p.client_phone || '', email: p.client_email || '',
            client_type: p.client_type || 'Residential',
            address: p.site_address || '', district: p.district || '',
            property_type: p.property_type || '',
          },
          property: {
            mode: p.property_id ? 'existing' : 'none',
            id: p.property_id, property_code: p.property_code || '', title: p.property_title || '',
            category: data.property?.category || 'residential',
            property_type: p.property_type || '',
            address: p.site_address || '', area: p.area || '', city: p.city || '',
            district: p.district || '',
            total_floors: data.property?.total_floors || '', total_units: data.property?.total_units || '',
          },
          site_contact_name: p.site_contact_name || '', site_contact_phone: p.site_contact_phone || '',
          access_notes: p.access_notes || '',
          name: p.name || '', project_type: p.project_type || 'Cleaning & Maintenance',
          service_category: p.service_category || '',
          services: services.map((l) => ({ ...l, qty: Number(l.qty) || 1, price: Number(l.price) || 0 })),
          scope_summary: p.scope_summary || '', priority: p.priority || 'Medium',
          tank_type: p.tank_type || '', tanks_count: p.tanks_count || '',
          tank_capacity: p.tank_capacity || '', water_source: p.water_source || '',
          origin: p.origin || 'Direct',
          enquiry_code: p.enquiry_code || '', request_code: p.request_code || '',
          assessment_code: p.assessment_code || '', quotation_code: p.quotation_code || '',
          under_amc: !!p.under_amc, amc_code: p.amc_code || '', amc_package: p.amc_package || '',
          amc_frequency: p.amc_frequency || 'Quarterly', amc_visit_no: p.amc_visit_no || '',
          amc_next_visit: p.amc_next_visit || '',
          provider_code: p.provider_code || '', provider_name: p.assigned_provider || '',
          provider_id: p.provider_id || null,
          assigned_officer: p.assigned_officer || '', ops_manager: p.ops_manager || '',
          start_date: p.start_date || '', scheduled_date: p.scheduled_date || '',
          target_completion: p.target_completion || '',
          deposit_required: !!p.deposit_required, deposit_amount: p.deposit_amount || '',
          payment_terms: p.payment_terms || '', provider_cost: p.provider_cost || '',
          notes: p.notes || '',
          status: p.status, warranty_period: p.warranty_period || '',
        }));
      })
      .catch((e) => setErr(errText(e, `Could not load ${editCode}`)));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, editCode]);

  // Arriving from a client file or an enquiry — pre-fill and skip the search.
  useEffect(() => {
    const clientCode = params.get('client');
    if (!clientCode || isEdit) return;
    api.get('/wt-projects/client-lookup', { params: { q: clientCode } })
      .then(({ data }) => {
        const hit = (data.water_tank || []).find((c) => c.code === clientCode);
        if (hit) { useExistingClient(hit); }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // ── lookups ──
  const runClientLookup = useCallback((term) => {
    if (term.trim().length < 2) { setCHits({ water_tank: [], contacts: [] }); setCSearching(false); return; }
    setCSearching(true);
    api.get('/wt-projects/client-lookup', { params: { q: term } })
      .then((r) => setCHits(r.data))
      .catch(() => setCHits({ water_tank: [], contacts: [] }))
      .finally(() => setCSearching(false));
  }, []);
  useEffect(() => { const t = setTimeout(() => runClientLookup(cq), 220); return () => clearTimeout(t); }, [cq, runClientLookup]);

  const runPropertyLookup = useCallback((term) => {
    if (term.trim().length < 2) { setPHits([]); setPSearching(false); return; }
    setPSearching(true);
    api.get('/wt-projects/property-lookup', { params: { q: term } })
      .then((r) => setPHits(r.data || []))
      .catch(() => setPHits([]))
      .finally(() => setPSearching(false));
  }, []);
  useEffect(() => { const t = setTimeout(() => runPropertyLookup(pq), 220); return () => clearTimeout(t); }, [pq, runPropertyLookup]);

  function useExistingClient(c, isWaterTank = true) {
    setClientMode('existing');
    setF((s) => ({
      ...s,
      client: {
        mode: isWaterTank ? 'existing' : 'new',
        id: isWaterTank ? c.id : null,
        code: isWaterTank ? c.code : '',
        name: c.name || '',
        phone: c.mobile || '',
        email: c.email || '',
        client_type: c.client_type || 'Residential',
        address: (isWaterTank ? c.service_address : c.address) || '',
        district: c.district || '',
        property_type: c.property_type || '',
      },
      tank_type: c.tank_type || s.tank_type,
      tanks_count: c.tanks_count || s.tanks_count,
      tank_capacity: c.tank_capacity || s.tank_capacity,
      name: s.name || `${c.name} — Water Tank Service`,
      // an existing client with a live AMC almost always means an AMC visit
      under_amc: s.under_amc || (String(c.amc_status || '').toLowerCase() === 'active'),
      amc_package: c.amc_package || s.amc_package,
    }));
    setStep(1);
  }

  function useExistingProperty(p) {
    setF((s) => ({
      ...s,
      property: {
        mode: 'existing', id: p.id, property_code: p.property_code, title: p.title,
        category: p.category || 'residential', property_type: p.property_type || '',
        address: p.address || '', area: p.area || '', city: p.city || '',
        district: p.district || '', total_floors: p.total_floors || '', total_units: p.total_units || '',
      },
    }));
  }

  // ── catalogue ──
  const catalog = ref?.catalog || [];
  const chosen = new Set(f.services.map((l) => l.code));
  const filteredCatalog = useMemo(() => {
    const term = catQ.trim().toLowerCase();
    return catalog.filter((c) => (!catGroup || c.group === catGroup)
      && (!term || [c.code, c.name, c.description].some((v) => String(v || '').toLowerCase().includes(term))));
  }, [catalog, catQ, catGroup]);

  const addService = (c) => setF((s) => ({
    ...s,
    services: [...s.services, { code: c.code, name: c.name, group: c.group_key, unit: c.unit, qty: 1, price: c.standard_price }],
  }));
  const removeService = (code) => setF((s) => ({ ...s, services: s.services.filter((l) => l.code !== code) }));
  const patchService = (code, patch) => setF((s) => ({
    ...s, services: s.services.map((l) => (l.code === code ? { ...l, ...patch } : l)),
  }));
  const contractValue = f.services.reduce((s, l) => s + lineTotal(l), 0);

  const providers = ref?.providers || [];
  const assignable = providers.filter((p) => p.assignable);

  const STEPS = [
    { key: 'client', label: 'Client', hint: 'Search or register', icon: Users },
    { key: 'site', label: 'Property & site', hint: 'Assign or create', icon: MapPin },
    { key: 'scope', label: 'Scope', hint: 'Services and tanks', icon: ClipboardList },
    { key: 'origin', label: 'Origin & AMC', hint: 'How the job got here', icon: GitBranch },
    { key: 'delivery', label: 'Delivery', hint: 'Provider, dates, money', icon: CalendarClock },
    { key: 'review', label: 'Review', hint: 'Confirm and create', icon: FileSignature },
  ];

  const stepValid = () => {
    if (step === 0) return !!f.client.name.trim();
    if (step === 1) return f.property.mode !== 'new' || !!f.property.title.trim();
    if (step === 2) return !!f.name.trim() && !!f.project_type;
    if (step === 3) return !f.under_amc || !!f.amc_code;
    return true;
  };

  const submit = async () => {
    setSaving(true); setErr('');
    const payload = {
      ...f,
      client: { ...f.client, mode: f.client.code ? 'existing' : 'new' },
      property: f.property.mode === 'none' ? { mode: 'none' } : f.property,
      services: f.services.map((l) => ({ ...l, qty: Number(l.qty) || 1, price: Number(l.price) || 0 })),
      tanks_count: Number(f.tanks_count) || 0,
      contract_value: contractValue,
      provider_cost: Number(f.provider_cost) || 0,
      deposit_amount: Number(f.deposit_amount) || 0,
      amc_visit_no: Number(f.amc_visit_no) || null,
    };
    try {
      if (isEdit) {
        // No downstream records are raised on edit — the request and assessment
        // already exist; only the project itself changes.
        await api.patch(`/wt-projects/${editCode}`, payload);
        toast.ok(`${editCode} updated`);
        nav(`/water-tank/projects/${editCode}`);
        return;
      }
      const { data } = await api.post('/wt-projects', {
        ...payload,
        needs_assessment: f.route === 'assessment',
        needs_quotation: f.route === 'quotation',
        assessment_date: f.route === 'assessment' ? f.assessment_date : null,
      });
      const made = data.created || {};
      const extra = [made.request && `request ${made.request}`, made.assessment && `assessment ${made.assessment}`]
        .filter(Boolean).join(' · ');
      toast.ok(`${data.project.code} created${extra ? ` — ${extra}` : ''}`);
      nav(`/water-tank/projects/${data.project.code}`);
    } catch (e) { setErr(errText(e, isEdit ? 'Could not save the changes' : 'Could not create the project')); setSaving(false); }
  };

  const next = () => { if (step < STEPS.length - 1) setStep(step + 1); else submit(); };

  const remove = async () => {
    // Deleting detaches the service request and assessment rather than orphaning
    // them — they outlive the project label. Worth confirming out loud.
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete ${editCode}? Its service request and site assessment are kept and detached, but the project file and its disbursements are removed.`)) return;
    setSaving(true);
    try {
      await api.delete(`/wt-projects/${editCode}`);
      toast.ok(`${editCode} deleted`);
      nav('/water-tank/projects');
    } catch (e) { setErr(errText(e, 'Could not delete the project')); setSaving(false); }
  };

  if (loading) return <Loading />;

  const amcOptions = ref?.amc_contracts || [];

  return (
    <>
      <WtHead
        crumb={<div className="wt-crumb">
          <span className="lnk" onClick={() => nav('/water-tank/projects')}>Projects</span>
          {' › '}
          {isEdit ? (
            <>
              <span className="lnk" onClick={() => nav(`/water-tank/projects/${editCode}`)}>{editCode}</span>
              {' › '}<span style={{ color: 'var(--wt-accent-ink)' }}>Edit</span>
            </>
          ) : <span style={{ color: 'var(--wt-accent-ink)' }}>New project</span>}
        </div>}
        title={isEdit ? `Edit ${editCode}` : 'New Project'}
        subtitle={isEdit
          ? 'Same six steps as the entry form — change anything and save'
          : `SOP-01 Sec. 4 — opening the project file${ref?.next_code ? ` · reserving ${ref.next_code}` : ''}`}
      >
        <button className="wt-btn" onClick={() => nav(isEdit ? `/water-tank/projects/${editCode}` : '/water-tank/projects')}>
          <X size={14} /> Cancel
        </button>
      </WtHead>

      <div className="wt-wizard">
        <aside className="wt-wizrail">
          <div className="wt-wizrail-h">Project steps</div>
          {STEPS.map((s, i) => (
            // Editing an existing project: every step is already valid, so jump
            // straight to the one you came to change.
            <button key={s.key} className={`wt-wizrail-item${i === step ? ' on' : ''}${i < step ? ' done' : ''}`}
              onClick={() => (isEdit || i <= step) && setStep(i)} disabled={!isEdit && i > step}>
              <span className="n">{i < step ? <Check size={12} /> : i + 1}</span>
              <span><span className="l">{s.label}</span><span className="s">{s.hint}</span></span>
            </button>
          ))}

          {(isEdit || ref?.next_code) && (
            <div className="wt-railnote">
              <span className="k">Project ID</span>
              <span className="v">{isEdit ? editCode : ref.next_code}</span>
              <span className="h">{isEdit ? 'Editing this project' : 'Reserved — assigned on save'}</span>
            </div>
          )}
          {f.client.name && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--wt-line)', fontSize: 11.5, color: 'var(--wt-muted)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--wt-ink)' }}>{f.client.name}</strong><br />
              {[f.client.code, f.client.phone].filter(Boolean).join(' · ')}
              {f.property.title && <><br />{f.property.property_code || 'New site'} · {f.property.title}</>}
              {f.services.length > 0 && <><br />{f.services.length} service(s) · {bdt(contractValue)}</>}
              {f.under_amc && <><br /><span style={{ color: 'var(--wt-accent-ink)', fontWeight: 700 }}>Under AMC</span></>}
            </div>
          )}
        </aside>

        <div className="wt-wizpane">
          {err && <div className="wt-formerr">{err}</div>}

          {/* ───────────────── 1 CLIENT ───────────────── */}
          {step === 0 && (
            <>
              <div className="wt-wizpane-h">
                <h2>Who is this project for?</h2>
                <p>Search the water-tank client book and the Seventh Sky contact directory first — an existing client keeps their whole service history, agreements and AMC on one file.</p>
              </div>

              <label className="wt-search" style={{ width: '100%', maxWidth: 460 }}>
                <Search />
                <input autoFocus value={cq} onChange={(e) => setCq(e.target.value)} placeholder="Search by name, mobile, email, code or address…" />
                {cSearching && <Loader2 size={14} className="wt-spin" />}
              </label>

              {cq.trim().length >= 2 && (
                <>
                  {cHits.water_tank.length > 0 && (
                    <div>
                      <div className="wt-sec-title" style={{ marginBottom: 8 }}>Existing water-tank clients</div>
                      <div className="wt-lookup">
                        {cHits.water_tank.map((c) => (
                          <button key={c.id} className="wt-lookup-item" onClick={() => useExistingClient(c, true)}>
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
                  {cHits.contacts.length > 0 && (
                    <div>
                      <div className="wt-sec-title" style={{ marginBottom: 8 }}>Known to Seventh Sky, not yet a water-tank client</div>
                      <div className="wt-lookup">
                        {cHits.contacts.map((c) => (
                          <button key={c.id} className="wt-lookup-item" onClick={() => useExistingClient(c, false)}>
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
                  {!cSearching && !cHits.water_tank.length && !cHits.contacts.length && (
                    <EmptyState eyebrow="No match" title={`Nobody on file matches “${cq.trim()}”`} hint="Register them below." />
                  )}
                </>
              )}

              {(clientMode === 'new' || f.client.name) ? (
                <div className="wt-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="wt-sec-title">
                    {f.client.code ? `Linked client — ${f.client.code}` : 'New client details'}
                  </div>
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
                    <div className="wt-field"><label>District</label>
                      <input className="wt-input" value={f.client.district} onChange={(e) => setClient('district', e.target.value)} /></div>
                    <div className="wt-field"><label>Property type</label>
                      <input className="wt-input" value={f.client.property_type} onChange={(e) => setClient('property_type', e.target.value)} placeholder="Apartment, house, factory…" /></div>
                  </div>

                  <div className="wt-note">
                    <strong>Sec. 7 Step 6 —</strong> a signed Customer Service Agreement is required before work starts.
                    Create the project first, then raise the agreement from the project file, or go straight to{' '}
                    <span className="lnk" style={{ textDecoration: 'underline', cursor: 'pointer' }}
                      onClick={() => window.open('/admin/agreements/water-tank-customer', '_blank')}>
                      WT Customer Agreements
                    </span>.
                  </div>
                </div>
              ) : (
                <button className="wt-btn primary" style={{ alignSelf: 'flex-start' }}
                  onClick={() => { setClientMode('new'); setClient('name', cq.trim()); }}>
                  <Plus size={15} /> {cq.trim() ? `New client “${cq.trim()}”` : 'Enter a new client'}
                </button>
              )}
            </>
          )}

          {/* ───────────────── 2 PROPERTY & SITE ───────────────── */}
          {step === 1 && (
            <>
              <div className="wt-wizpane-h">
                <h2>Where is the work happening?</h2>
                <p>Assign a property from the Seventh Sky register so the site is shared with sales, rentals and property care — or create one here and it joins the register.</p>
              </div>

              <div className="wt-choices">
                {[
                  { k: 'existing', t: 'Assign from the register', h: 'Search properties already on file', ic: Building2 },
                  { k: 'new', t: 'Create a new property', h: 'Adds it to the shared register', ic: Plus },
                  { k: 'none', t: 'Address only', h: 'No property record — just a service address', ic: MapPin },
                ].map((o) => (
                  <button key={o.k} className={`wt-choice${f.property.mode === o.k ? ' on' : ''}`} onClick={() => setProp('mode', o.k)}>
                    <o.ic size={18} />
                    <span className="t">{o.t}</span>
                    <span className="h">{o.h}</span>
                  </button>
                ))}
              </div>

              {f.property.mode === 'existing' && (
                <>
                  <label className="wt-search" style={{ width: '100%', maxWidth: 460 }}>
                    <Search />
                    <input value={pq} onChange={(e) => setPq(e.target.value)} placeholder="Search by code, title, address, area or district…" />
                    {pSearching && <Loader2 size={14} className="wt-spin" />}
                  </label>
                  {f.property.id && (
                    <div className="wt-note" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <ShieldCheck size={16} />
                      <span><strong>{f.property.property_code}</strong> — {f.property.title} assigned to this project.</span>
                    </div>
                  )}
                  {pq.trim().length >= 2 && (
                    <div className="wt-lookup">
                      {pHits.map((p) => (
                        <button key={p.id} className={`wt-lookup-item${f.property.id === p.id ? ' on' : ''}`} onClick={() => useExistingProperty(p)}>
                          <span className="av"><Building2 size={16} /></span>
                          <span style={{ flex: '1 0 0', minWidth: 0 }}>
                            <span className="nm">{p.title}</span>
                            <span className="mt">{[p.property_code, p.property_type, p.area, p.district].filter(Boolean).join(' · ')}</span>
                          </span>
                          <span style={{ fontSize: 11.5, color: 'var(--wt-accent-ink)', fontWeight: 700 }}>
                            {f.property.id === p.id ? 'Assigned' : 'Assign →'}
                          </span>
                        </button>
                      ))}
                      {!pSearching && !pHits.length && <EmptyState eyebrow="No match" title={`No property matches “${pq.trim()}”`} hint="Switch to “Create a new property” to add it." />}
                    </div>
                  )}
                </>
              )}

              {f.property.mode === 'new' && (
                <div className="wt-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="wt-sec-title">New property</div>
                  <div className="wt-grid2">
                    <div className="wt-field"><label>Property title *</label>
                      <input className="wt-input" value={f.property.title} onChange={(e) => setProp('title', e.target.value)} placeholder="e.g. Rahman Villa, House 12 Road 5" /></div>
                    <div className="wt-field"><label>Category</label>
                      <select className="wt-select" value={f.property.category} onChange={(e) => setProp('category', e.target.value)}>
                        {['residential', 'commercial', 'rural', 'business'].map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
                      </select></div>
                    <div className="wt-field"><label>Property type</label>
                      <input className="wt-input" value={f.property.property_type} onChange={(e) => setProp('property_type', e.target.value)} placeholder="Apartment, factory, school…" /></div>
                    <div className="wt-field"><label>Area</label>
                      <input className="wt-input" value={f.property.area} onChange={(e) => setProp('area', e.target.value)} /></div>
                    <div className="wt-field" style={{ gridColumn: '1 / -1' }}><label>Address</label>
                      <input className="wt-input" value={f.property.address} onChange={(e) => setProp('address', e.target.value)} /></div>
                    <div className="wt-field"><label>City</label>
                      <input className="wt-input" value={f.property.city} onChange={(e) => setProp('city', e.target.value)} /></div>
                    <div className="wt-field"><label>District</label>
                      <input className="wt-input" value={f.property.district} onChange={(e) => setProp('district', e.target.value)} /></div>
                    <div className="wt-field"><label>Total floors</label>
                      <input className="wt-input" value={f.property.total_floors} onChange={(e) => setProp('total_floors', e.target.value)} /></div>
                    <div className="wt-field"><label>Total units</label>
                      <input className="wt-input" value={f.property.total_units} onChange={(e) => setProp('total_units', e.target.value)} /></div>
                  </div>
                  <div className="wt-note">Created unpublished and inactive — a site registered for a service job is not a listing until someone deliberately lists it.</div>
                </div>
              )}

              {f.property.mode === 'none' && (
                <div className="wt-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="wt-sec-title">Service address</div>
                  <div className="wt-grid2">
                    <div className="wt-field" style={{ gridColumn: '1 / -1' }}><label>Address</label>
                      <input className="wt-input" value={f.property.address} onChange={(e) => setProp('address', e.target.value)} placeholder={f.client.address || 'Site address'} /></div>
                    <div className="wt-field"><label>Area</label>
                      <input className="wt-input" value={f.property.area} onChange={(e) => setProp('area', e.target.value)} /></div>
                    <div className="wt-field"><label>District</label>
                      <input className="wt-input" value={f.property.district} onChange={(e) => setProp('district', e.target.value)} /></div>
                  </div>
                </div>
              )}

              <div className="wt-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="wt-sec-title">Site access</div>
                <div className="wt-grid2">
                  <div className="wt-field"><label>Site contact name</label>
                    <input className="wt-input" value={f.site_contact_name} onChange={(e) => set('site_contact_name', e.target.value)} placeholder="Caretaker, building manager…" /></div>
                  <div className="wt-field"><label>Site contact phone</label>
                    <input className="wt-input" value={f.site_contact_phone} onChange={(e) => set('site_contact_phone', e.target.value)} /></div>
                  <div className="wt-field" style={{ gridColumn: '1 / -1' }}><label>Access notes</label>
                    <textarea className="wt-input" rows={2} value={f.access_notes} onChange={(e) => set('access_notes', e.target.value)}
                      placeholder="Roof hatch key held at the guard desk, water off between 10am–2pm…" /></div>
                </div>
              </div>
            </>
          )}

          {/* ───────────────── 3 SCOPE ───────────────── */}
          {step === 2 && (
            <>
              <div className="wt-wizpane-h">
                <h2>What is the scope?</h2>
                <p>Name the project, describe the tanks, and pick the services from the WTC price schedule. The selected lines set the indicative contract value.</p>
              </div>

              <div className="wt-grid2">
                <div className="wt-field" style={{ gridColumn: '1 / -1' }}><label>Project name *</label>
                  <input className="wt-input" value={f.name} onChange={(e) => set('name', e.target.value)}
                    placeholder={`${f.client.name || 'Client'} — Water Tank Cleaning`} /></div>
                <div className="wt-field"><label>Project type</label>
                  <select className="wt-select" value={f.project_type} onChange={(e) => set('project_type', e.target.value)}>
                    {(ref?.project_types || []).map((t) => <option key={t}>{t}</option>)}
                  </select></div>
                <div className="wt-field"><label>Service category</label>
                  <select className="wt-select" value={f.service_category} onChange={(e) => set('service_category', e.target.value)}>
                    <option value="">Select…</option>
                    {(ref?.categories || []).map((c) => <option key={c}>{c}</option>)}
                  </select></div>
                <div className="wt-field"><label>Priority</label>
                  <select className="wt-select" value={f.priority} onChange={(e) => set('priority', e.target.value)}>
                    {(ref?.priorities || []).map((p) => <option key={p}>{p}</option>)}
                  </select></div>
                <div className="wt-field"><label>Tank type</label>
                  <select className="wt-select" value={f.tank_type} onChange={(e) => set('tank_type', e.target.value)}>
                    <option value="">Select…</option>
                    {(ref?.tank_types || []).map((t) => <option key={t}>{t}</option>)}
                  </select></div>
                <div className="wt-field"><label>Number of tanks</label>
                  <input className="wt-input" type="number" min="0" value={f.tanks_count} onChange={(e) => set('tanks_count', e.target.value)} /></div>
                <div className="wt-field"><label>Tank capacity</label>
                  <input className="wt-input" value={f.tank_capacity} onChange={(e) => set('tank_capacity', e.target.value)} placeholder="e.g. 2 × 1,500 L" /></div>
                <div className="wt-field" style={{ gridColumn: '1 / -1' }}><label>Scope summary</label>
                  <textarea className="wt-input" rows={3} value={f.scope_summary} onChange={(e) => set('scope_summary', e.target.value)}
                    placeholder="What the client asked for, existing issues, water quality concerns…" /></div>
              </div>

              <div>
                <div className="wt-sec-title" style={{ marginBottom: 10 }}>Services from the price schedule</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <label className="wt-search" style={{ width: 280 }}>
                    <Search />
                    <input value={catQ} onChange={(e) => setCatQ(e.target.value)} placeholder="Search the catalogue…" />
                  </label>
                  <button className={`wt-chip${!catGroup ? ' on' : ''}`} onClick={() => setCatGroup('')}>All</button>
                  {(ref?.groups || []).map((g) => (
                    <button key={g} className={`wt-chip${catGroup === g ? ' on' : ''}`} onClick={() => setCatGroup(g)}>{g}</button>
                  ))}
                </div>

                {f.services.length > 0 && (
                  <div className="wt-card" style={{ padding: 16, marginBottom: 12 }}>
                    <table className="wt-tbl">
                      <thead><tr><th style={{ width: 90 }}>Code</th><th>Service</th><th style={{ width: 80 }}>Qty</th><th style={{ width: 130 }}>Agreed price</th><th style={{ width: 110, textAlign: 'right' }}>Line total</th><th style={{ width: 40 }} /></tr></thead>
                      <tbody>
                        {f.services.map((l) => (
                          <tr key={l.code}>
                            <td className="id">{l.code}</td>
                            <td>{l.name}</td>
                            <td><input className="wt-input sm" type="number" min="1" value={l.qty} onChange={(e) => patchService(l.code, { qty: e.target.value })} /></td>
                            <td><input className="wt-input sm" type="number" min="0" value={l.price} onChange={(e) => patchService(l.code, { price: e.target.value })} /></td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>{bdt(lineTotal(l))}</td>
                            <td><button className="wt-iconbtn" onClick={() => removeService(l.code)} title="Remove"><Trash2 size={14} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="wt-costrow total" style={{ marginTop: 8 }}>
                      <span>Indicative contract value</span><span className="amt">{bdt(contractValue)}</span>
                    </div>
                  </div>
                )}

                <div className="wt-catalog">
                  {filteredCatalog.slice(0, 40).map((c) => (
                    <button key={c.code} className={`wt-catitem${chosen.has(c.code) ? ' on' : ''}`}
                      disabled={chosen.has(c.code)} onClick={() => addService(c)}>
                      <span className="cd">{c.code}</span>
                      <span className="nm">{c.name}{c.unit ? <em> · {c.unit}</em> : null}</span>
                      <span className="pr">{bdt(c.standard_price)}</span>
                      {chosen.has(c.code) ? <Check size={14} /> : <Plus size={14} />}
                    </button>
                  ))}
                  {!filteredCatalog.length && <EmptyState eyebrow="Catalogue" title="Nothing matches that filter" />}
                </div>
              </div>
            </>
          )}

          {/* ───────────────── 4 ORIGIN & AMC ───────────────── */}
          {step === 3 && (
            <>
              <div className="wt-wizpane-h">
                <h2>How did this job get here, and what happens next?</h2>
                <p>Sec. 5 Step 1 puts a service request at the head of the chain — one is raised automatically whichever route you pick. Then decide whether the job needs a site visit before it can be quoted.</p>
              </div>

              <div className="wt-field" style={{ maxWidth: 320 }}><label>Origin</label>
                <select className="wt-select" value={f.origin} onChange={(e) => set('origin', e.target.value)}>
                  {['Direct', 'Enquiry', 'Service Request', 'Assessment', 'Quotation', 'AMC', 'Referral', 'Repeat Client'].map((o) => <option key={o}>{o}</option>)}
                </select></div>

              {/* link an existing upstream record so the chain is not duplicated */}
              <div className="wt-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="wt-sec-title">Link existing records (optional)</div>
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--wt-muted)' }}>
                  Only records not already attached to a project are listed. Linking one here attaches it to this project instead of raising a duplicate.
                </p>
                <div className="wt-grid2">
                  <div className="wt-field"><label>Service request</label>
                    <select className="wt-select" value={f.request_code} onChange={(e) => set('request_code', e.target.value)}>
                      <option value="">Raise a new one automatically</option>
                      {(ref?.unlinked?.requests || []).map((r) => <option key={r.code} value={r.code}>{r.code} — {r.client_name}</option>)}
                    </select></div>
                  <div className="wt-field"><label>Site assessment</label>
                    <select className="wt-select" value={f.assessment_code} onChange={(e) => set('assessment_code', e.target.value)}>
                      <option value="">None</option>
                      {(ref?.unlinked?.assessments || []).map((a) => <option key={a.code} value={a.code}>{a.code} — {a.client_name}</option>)}
                    </select></div>
                  <div className="wt-field"><label>Quotation</label>
                    <select className="wt-select" value={f.quotation_code} onChange={(e) => set('quotation_code', e.target.value)}>
                      <option value="">None</option>
                      {(ref?.unlinked?.quotations || []).map((q) => <option key={q.code} value={q.code}>{q.code} — {q.client_name} — {bdt(q.total)}</option>)}
                    </select></div>
                  <div className="wt-field"><label>Enquiry</label>
                    <select className="wt-select" value={f.enquiry_code} onChange={(e) => set('enquiry_code', e.target.value)}>
                      <option value="">None</option>
                      {(ref?.unlinked?.enquiries || []).map((en) => <option key={en.code} value={en.code}>{en.code} — {en.client_name}</option>)}
                    </select></div>
                </div>
              </div>

              {/* Creation-time routing only: the request and any assessment already
                  exist on an established project, so re-asking would raise duplicates. */}
              <div style={{ display: isEdit ? 'none' : undefined }}>
                <div className="wt-sec-title" style={{ marginBottom: 10 }}>What does this job need next?</div>
                <div className="wt-choices">
                  <button className={`wt-choice${f.route === 'assessment' ? ' on' : ''}`} onClick={() => set('route', 'assessment')}>
                    <CalendarClock size={18} />
                    <span className="t">Site assessment first</span>
                    <span className="h">Sec. 6 — physical inspection before quoting. Schedules an assessment now.</span>
                  </button>
                  <button className={`wt-choice${f.route === 'quotation' ? ' on' : ''}`} onClick={() => set('route', 'quotation')}>
                    <FileSignature size={18} />
                    <span className="t">Quote straight away</span>
                    <span className="h">Sec. 7 Step 5 — the job is well enough understood to price. Flags the project for quoting.</span>
                  </button>
                </div>
                {f.route === 'assessment' && !f.assessment_code && (
                  <div className="wt-field" style={{ maxWidth: 260, marginTop: 12 }}>
                    <label>Assessment date</label>
                    <DatePicker value={f.assessment_date} onChange={(v) => set('assessment_date', v)} />
                  </div>
                )}
              </div>

              <div className="wt-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <label className="wt-toggle">
                  <input type="checkbox" checked={f.under_amc} onChange={(e) => set('under_amc', e.target.checked)} />
                  <Repeat size={15} /> This project runs under an AMC contract (Sec. 10)
                </label>
                {f.under_amc && (
                  <>
                    <div className="wt-grid2">
                      <div className="wt-field"><label>AMC contract *</label>
                        <select className="wt-select" value={f.amc_code} onChange={(e) => {
                          const a = amcOptions.find((x) => x.code === e.target.value);
                          setF((s) => ({ ...s, amc_code: e.target.value, amc_package: a?.package || s.amc_package, amc_frequency: a?.frequency || s.amc_frequency, amc_next_visit: a?.next_visit || s.amc_next_visit }));
                        }}>
                          <option value="">Select a contract…</option>
                          {amcOptions.map((a) => <option key={a.code} value={a.code}>{a.code} — {a.client_name} — {a.package || 'Package'}</option>)}
                        </select></div>
                      <div className="wt-field"><label>Package</label>
                        <input className="wt-input" value={f.amc_package} onChange={(e) => set('amc_package', e.target.value)} /></div>
                      <div className="wt-field"><label>Frequency</label>
                        <select className="wt-select" value={f.amc_frequency} onChange={(e) => set('amc_frequency', e.target.value)}>
                          {['Monthly', 'Quarterly', 'Half Yearly', 'Annual'].map((x) => <option key={x}>{x}</option>)}
                        </select></div>
                      <div className="wt-field"><label>Visit number</label>
                        <input className="wt-input" type="number" min="1" value={f.amc_visit_no} onChange={(e) => set('amc_visit_no', e.target.value)} placeholder="e.g. 3" /></div>
                    </div>
                    {!f.amc_code && <div className="wt-formerr">Select the AMC contract this visit belongs to.</div>}
                  </>
                )}
              </div>
            </>
          )}

          {/* ───────────────── 5 DELIVERY ───────────────── */}
          {step === 4 && (
            <>
              <div className="wt-wizpane-h">
                <h2>Delivery plan and commercials</h2>
                <p>Who runs it, when it happens, and what the client pays. A provider can be left blank now and assigned at the Provider Assignment stage.</p>
              </div>

              <div className="wt-grid2">
                <div className="wt-field"><label>Service provider</label>
                  <select className="wt-select" value={f.provider_code} onChange={(e) => {
                    const p = providers.find((x) => x.code === e.target.value);
                    setF((s) => ({ ...s, provider_code: e.target.value, provider_name: p?.business_name || '', provider_id: p?.id || null }));
                  }}>
                    <option value="">Assign later</option>
                    {assignable.map((p) => <option key={p.code} value={p.code}>{p.business_name} — {p.specialty || 'General'}</option>)}
                  </select>
                  {providers.some((p) => !p.assignable) && (
                    <span className="hint">{providers.filter((p) => !p.assignable).length} provider(s) hidden — no signed master agreement or not approved.</span>
                  )}
                </div>
                <div className="wt-field"><label>Operations coordinator</label>
                  <input className="wt-input" value={f.assigned_officer} onChange={(e) => set('assigned_officer', e.target.value)} /></div>
                <div className="wt-field"><label>Operations manager</label>
                  <input className="wt-input" value={f.ops_manager} onChange={(e) => set('ops_manager', e.target.value)} /></div>
                <div className="wt-field"><label>Start date</label>
                  <DatePicker value={f.start_date} onChange={(v) => set('start_date', v)} /></div>
                <div className="wt-field"><label>Scheduled service date</label>
                  <DatePicker value={f.scheduled_date} onChange={(v) => set('scheduled_date', v)} /></div>
                <div className="wt-field"><label>Target completion</label>
                  <DatePicker value={f.target_completion} onChange={(v) => set('target_completion', v)} /></div>
              </div>

              <div className="wt-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="wt-sec-title">Commercials</div>
                <div className="wt-grid2">
                  <div className="wt-field"><label>Contract value</label>
                    <input className="wt-input" value={bdt(contractValue)} readOnly style={{ background: '#f8fafc' }} />
                    <span className="hint">From the {f.services.length} service line(s) selected. Edit the lines to change it.</span></div>
                  <div className="wt-field"><label>Estimated provider cost</label>
                    <input className="wt-input" type="number" min="0" value={f.provider_cost} onChange={(e) => set('provider_cost', e.target.value)} /></div>
                  <div className="wt-field" style={{ gridColumn: '1 / -1' }}><label>Payment terms</label>
                    <input className="wt-input" value={f.payment_terms} onChange={(e) => set('payment_terms', e.target.value)} /></div>
                </div>
                <label className="wt-toggle">
                  <input type="checkbox" checked={f.deposit_required} onChange={(e) => set('deposit_required', e.target.checked)} />
                  Deposit required before commencement (Sec. 7)
                </label>
                {f.deposit_required && (
                  <div className="wt-field" style={{ maxWidth: 240 }}><label>Deposit amount</label>
                    <input className="wt-input" type="number" min="0" value={f.deposit_amount} onChange={(e) => set('deposit_amount', e.target.value)} /></div>
                )}
                <div className="wt-field"><label>Internal notes</label>
                  <textarea className="wt-input" rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></div>
              </div>
            </>
          )}

          {/* ───────────────── 6 REVIEW ───────────────── */}
          {step === 5 && (
            <>
              <div className="wt-wizpane-h">
                <h2>{isEdit ? 'Review and save' : 'Review and create'}</h2>
                <p>{isEdit
                  ? 'Check the project reads the way the job actually is, then save. No new records are raised — only this project changes.'
                  : 'Everything below is created in one save. Check it reads the way the job actually is.'}</p>
              </div>

              <div className="wt-revgrid">
                <ReviewCard title="Project" rows={[
                  ['Project ID', isEdit ? editCode : (ref?.next_code || 'Assigned on save')],
                  ['Name', f.name || '—'],
                  ['Type', f.project_type],
                  ['Category', f.service_category || '—'],
                  ['Priority', f.priority],
                  ['Opening stage', f.route === 'assessment' ? 'Site Assessment' : 'Lead Enquiry'],
                ]} />
                <ReviewCard title="Client" rows={[
                  ['Name', f.client.name || '—'],
                  ['Status', f.client.code ? `Existing — ${f.client.code}` : 'New client will be created'],
                  ['Type', f.client.client_type],
                  ['Mobile', f.client.phone || '—'],
                  ['Email', f.client.email || '—'],
                ]} />
                <ReviewCard title="Site" rows={[
                  ['Property', f.property.mode === 'existing' ? `${f.property.property_code} — ${f.property.title}`
                    : f.property.mode === 'new' ? `New — ${f.property.title}` : 'Address only'],
                  ['Address', f.property.address || f.client.address || '—'],
                  ['District', f.property.district || f.client.district || '—'],
                  ['Site contact', f.site_contact_name || '—'],
                ]} />
                <ReviewCard title="Scope" rows={[
                  ['Tanks', f.tanks_count ? `${f.tanks_count} × ${f.tank_type || 'tank'}` : (f.tank_type || '—')],
                  ['Capacity', f.tank_capacity || '—'],
                  ['Services', f.services.length ? `${f.services.length} line(s)` : 'None selected'],
                  ['Contract value', bdt(contractValue)],
                ]} />
                <ReviewCard title="Delivery" rows={[
                  ['Provider', f.provider_name || 'Assign later'],
                  ['Coordinator', f.assigned_officer || '—'],
                  ['Scheduled', f.scheduled_date || '—'],
                  ['Target completion', f.target_completion || '—'],
                  ['Deposit', f.deposit_required ? bdt(f.deposit_amount) : 'Not required'],
                ]} />
                <ReviewCard title="AMC" rows={f.under_amc ? [
                  ['Contract', f.amc_code || '—'],
                  ['Package', f.amc_package || '—'],
                  ['Frequency', f.amc_frequency],
                  ['Visit', f.amc_visit_no ? `#${f.amc_visit_no}` : '—'],
                ] : [['Under AMC', 'No — one-off project']]} />
              </div>

              <div className="wt-card" style={{ padding: 18 }}>
                <div className="wt-sec-title" style={{ marginBottom: 10 }}>
                  {isEdit ? 'What this save changes' : 'Records created on save'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {isEdit ? (
                    <>
                      <CreateRow ok label="Project file" detail={`${editCode} updated with the details above`} />
                      {f.property.mode === 'new' && (
                        <CreateRow ok label="Property record" detail={`${f.property.title} added to the shared property register and assigned`} />
                      )}
                      {!f.client.code && f.client.name && (
                        <CreateRow ok label="Client record" detail={`${f.client.name} added to the water-tank client book and linked`} />
                      )}
                      <CreateRow label="Linked records"
                        detail={[f.request_code, f.assessment_code, f.quotation_code].filter(Boolean).join(' · ') || 'None — unchanged by this save'} />
                    </>
                  ) : (
                    <>
                      <CreateRow ok label="Project file" detail={`${ref?.next_code || 'WTCM-P####'} — ${f.name || 'unnamed'}`} />
                      {!f.client.code && <CreateRow ok label="Client record" detail={`${f.client.name} added to the water-tank client book`} />}
                      {f.property.mode === 'new' && <CreateRow ok label="Property record" detail={`${f.property.title} added to the shared property register`} />}
                      <CreateRow ok label="Service request"
                        detail={f.request_code ? `${f.request_code} linked to this project` : 'Raised automatically (Sec. 5 Step 1)'} />
                      {f.route === 'assessment' && !f.assessment_code && (
                        <CreateRow ok label="Site assessment" detail={f.assessment_date ? `Scheduled for ${f.assessment_date}` : 'Scheduled — date to be set'} />
                      )}
                      {f.assessment_code && <CreateRow ok label="Site assessment" detail={`${f.assessment_code} linked to this project`} />}
                      {f.quotation_code && <CreateRow ok label="Quotation" detail={`${f.quotation_code} linked to this project`} />}
                      {f.route === 'quotation' && !f.quotation_code && (
                        <CreateRow label="Quotation" detail="Project flagged for quoting — build it from the project file" />
                      )}
                    </>
                  )}
                </div>
              </div>

              {!f.services.length && (
                <div className="wt-warn"><AlertTriangle size={15} /> No services selected — the contract value will be zero. You can add them later from the project file.</div>
              )}
            </>
          )}

          <div className="wt-wizfoot">
            {isEdit && (
              <button className="wt-btn danger-ghost" disabled={saving} onClick={remove}>
                <Trash2 size={14} /> Delete project
              </button>
            )}
            {step > 0 && <button className="wt-btn" onClick={() => setStep(step - 1)}><ChevronLeft size={14} /> Back</button>}
            <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--wt-muted)' }}>Step {step + 1} of {STEPS.length}</span>
            {/* Editing: save from any step — you should not have to walk to the
                end of the wizard to commit a one-field change. */}
            {isEdit && step < STEPS.length - 1 && (
              <button className="wt-btn" disabled={saving || !stepValid()} onClick={submit}>
                <Check size={14} /> {saving ? 'Saving…' : 'Save changes'}
              </button>
            )}
            <button className="wt-btn primary" disabled={saving || !stepValid()} onClick={next}>
              {step < STEPS.length - 1 ? <>Continue <ChevronRight size={14} /></>
                : saving ? (isEdit ? 'Saving…' : 'Creating…')
                  : <><Check size={14} /> {isEdit ? 'Save changes' : 'Create project'}</>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function ReviewCard({ title, rows }) {
  return (
    <div className="wt-card" style={{ padding: 16 }}>
      <div className="wt-sec-title" style={{ marginBottom: 10 }}>{title}</div>
      <div className="wt-profile">
        {rows.map(([k, v]) => (
          <div className="f" key={k}><div className="k">{k}</div><div className="v">{v || '—'}</div></div>
        ))}
      </div>
    </div>
  );
}

function CreateRow({ ok, label, detail }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <span style={{
        width: 18, height: 18, borderRadius: 9, flex: 'none', display: 'grid', placeItems: 'center',
        background: ok ? 'var(--wt-green)' : '#e2e8f0', color: ok ? '#fff' : 'var(--wt-muted)', marginTop: 1,
      }}>{ok ? <Check size={11} /> : '·'}</span>
      <span style={{ fontSize: 13 }}>
        <strong>{label}</strong>
        <span style={{ color: 'var(--wt-muted)' }}> — {detail}</span>
      </span>
    </div>
  );
}
