import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus, Search, Check, ChevronLeft, ChevronRight, Building2, Droplets,
  ClipboardList, Sparkles, Users, X, Loader2,
} from 'lucide-react';
import api from '../../../services/api';
import { useSvcNav, WtHead, DatePicker, EmptyState, toast, errText, Pill, svcEquip, svcProfile } from '../common';

/*
 * New Client — SSPC-WTCM-SOP-01 Sec. 5 Phase 1 (Client Enquiry).
 * A full page rather than a modal: registering a client is the start of a
 * project, not a quick edit, and Step 1 + Step 2 together are more than a
 * drawer's worth of thinking. Four steps, each one a decision the coordinator
 * actually makes on the call.
 */

const buildSteps = (eq) => [
  { key: 'who', label: 'Who is the client', hint: 'Search first, then register', icon: Users, sop: 'Sec. 5 Step 1' },
  { key: 'contact', label: 'Contact & property', hint: 'Address and property type', icon: Building2, sop: 'Sec. 5 Step 1' },
  { key: 'service', label: 'Requested service', hint: 'What they are asking for', icon: ClipboardList, sop: 'Sec. 5 Step 1' },
  { key: 'consult', label: 'Initial consultation', hint: `${eq.section_label.replace(' Details', '')}, issues, AMC`, icon: Droplets, sop: 'Sec. 5 Step 2' },
];

const DISTRICTS = ['Dhaka', 'Cumilla', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna', 'Barishal', 'Rangpur', 'Mymensingh', 'Gazipur', 'Narayanganj'];
const CLIENT_TYPES = ['Residential', 'Commercial', 'Industrial'];
const initials = (n) => String(n || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export default function ClientCreate() {
  const STEPS = buildSteps(svcEquip());
  const svc = svcProfile().label;
  const nav = useSvcNav();
  const eq = svcEquip();
  const [step, setStep] = useState(0);
  const [ref, setRef] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // step 0 — existing-client lookup
  const [q, setQ] = useState('');
  const [hits, setHits] = useState({ water_tank: [], contacts: [] });
  const [searching, setSearching] = useState(false);
  const [linked, setLinked] = useState(null); // a contact we pre-filled from

  const [f, setF] = useState({
    name: '', client_type: 'Residential', mobile: '', email: '',
    alt_contact_name: '', alt_contact_phone: '',
    service_address: '', district: '', property_type: '',
    lead_source: '', enquiry_channel: 'Phone Call', enquiry_date: new Date().toISOString().slice(0, 10),
    assigned_officer: '', service_category: '', requested_service: '',
    tank_type: '', tank_capacity: '', tanks_count: '', last_cleaning: '',
    key_issues: '', water_quality_concerns: '', amc_required: false,
    consultation_notes: '',
    current_status: 'New Lead', workflow_stage: 'Lead Enquiry',
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    api.get('/wt-clients/reference').then((r) => setRef(r.data)).catch(() => setRef(null));
  }, []);

  // debounced lookup so an existing client is never entered twice
  const runLookup = useCallback((term) => {
    if (term.trim().length < 2) { setHits({ water_tank: [], contacts: [] }); setSearching(false); return; }
    setSearching(true);
    api.get('/wt-clients/lookup', { params: { q: term } })
      .then((r) => setHits(r.data))
      .catch(() => setHits({ water_tank: [], contacts: [] }))
      .finally(() => setSearching(false));
  }, []);
  useEffect(() => {
    const t = setTimeout(() => runLookup(q), 220);
    return () => clearTimeout(t);
  }, [q, runLookup]);

  const useContact = (c) => {
    setLinked(c);
    setF((s) => ({ ...s, name: c.name || '', mobile: c.mobile || '', email: c.email || '', service_address: c.address || s.service_address }));
    setStep(1);
  };
  const startFresh = () => { setLinked(null); setF((s) => ({ ...s, name: q.trim() })); setStep(1); };

  const stepValid = () => {
    if (step === 0) return true;
    if (step === 1) return f.name.trim() && f.mobile.trim() && f.service_address.trim();
    if (step === 2) return !!f.requested_service;
    return true;
  };

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      // The specialist create — generic writes to "clients" are blocked because
      // they bypass code generation, de-duplication and the workflow defaults.
      const { data: client } = await api.post('/wt-clients', {
        ...f,
        tanks_count: Number(f.tanks_count) || 0,
      });
      // A project is NOT opened at registration — it opens when a quotation is
      // approved (each engagement gets its own), so a fresh lead has no project yet.
      // Sec. 5 Step 2 — record the consultation if anything was captured
      if (f.tank_type || f.tanks_count || f.key_issues || f.amc_required) {
        try {
          await api.post(`/wt-clients/${client.id}/consultation`, {
            tank_type: f.tank_type, tank_capacity: f.tank_capacity,
            tanks_count: Number(f.tanks_count) || 0, key_issues: f.key_issues,
            water_quality_concerns: f.water_quality_concerns, amc_required: f.amc_required,
            last_cleaning: f.last_cleaning, consultation_notes: f.consultation_notes,
          });
        } catch { /* non-fatal */ }
      }
      toast.ok(`${client.name} registered as ${client.code}`);
      nav(`/water-tank/clients/${client.code}`);
    } catch (e) { setErr(errText(e, 'Could not register the client')); setBusy(false); }
  };

  const next = () => { if (step < STEPS.length - 1) setStep(step + 1); else submit(); };
  const catalogue = ref?.service_catalogue || {};
  const categories = Object.keys(catalogue);

  return (
    <>
      <WtHead
        crumb={<div className="wt-crumb"><span className="lnk" onClick={() => nav('/water-tank/clients')}>Clients</span> › <span style={{ color: 'var(--wt-accent-ink)' }}>New client</span></div>}
        title="Register a Client"
        subtitle="SSPC-WTCM-SOP-01 Sec. 5 Phase 1 — Client Enquiry"
      >
        <button className="wt-btn" onClick={() => nav('/water-tank/clients')}><X size={14} /> Cancel</button>
      </WtHead>

      <div className="wt-wizard">
        <aside className="wt-wizrail">
          <div className="wt-wizrail-h">Phase 1 · Client Enquiry</div>
          {STEPS.map((s, i) => (
            <button
              key={s.key} className={`wt-wizrail-item${i === step ? ' on' : ''}${i < step ? ' done' : ''}`}
              onClick={() => i <= step && setStep(i)} disabled={i > step}
            >
              <span className="n">{i < step ? <Check size={12} /> : i + 1}</span>
              <span><span className="l">{s.label}</span><span className="s">{s.hint} · {s.sop}</span></span>
            </button>
          ))}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--wt-line)', fontSize: 11.5, color: 'var(--wt-muted)', lineHeight: 1.55 }}>
            Registering creates the <strong>Client ID</strong>, opens a <strong>Project ID</strong> and starts the CRM profile, as Sec. 5 Step 1 requires.
          </div>
        </aside>

        <div className="wt-wizpane">
          {err && <div className="wt-formerr">{err}</div>}

          {/* ── STEP 0: search before you create ── */}
          {step === 0 && (
            <>
              <div className="wt-wizpane-h">
                <h2>Is this client already on file?</h2>
                <p>Search the {svc.toLowerCase()} client book and the wider Seventh Sky contact directory first — linking an existing record keeps their service history in one place.</p>
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
                      <div className="wt-sec-title" style={{ marginBottom: 8 }}>Already a {svc} client ({hits.water_tank.length})</div>
                      <div className="wt-lookup">
                        {hits.water_tank.map((c) => (
                          <button key={c.id} className="wt-lookup-item" onClick={() => nav(`/water-tank/clients/${c.code}`)}>
                            <span className="av">{initials(c.name)}</span>
                            <span style={{ flex: '1 0 0', minWidth: 0 }}>
                              <span className="nm">{c.name}</span>
                              <span className="mt">{[c.code, c.mobile, c.district].filter(Boolean).join(' · ')}</span>
                            </span>
                            <Pill value={c.current_status} sm />
                            <span style={{ fontSize: 11.5, color: 'var(--wt-accent-ink)', fontWeight: 700 }}>Open file →</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {hits.contacts.length > 0 && (
                    <div>
                      <div className="wt-sec-title" style={{ marginBottom: 8 }}>Known to Seventh Sky, not yet a {svc} client ({hits.contacts.length})</div>
                      <div className="wt-lookup">
                        {hits.contacts.map((c) => (
                          <button key={c.id} className="wt-lookup-item" onClick={() => useContact(c)}>
                            <span className="av">{initials(c.name)}</span>
                            <span style={{ flex: '1 0 0', minWidth: 0 }}>
                              <span className="nm">{c.name}</span>
                              <span className="mt">{[c.mobile, c.email].filter(Boolean).join(' · ') || 'No contact details on file'}</span>
                            </span>
                            <span style={{ fontSize: 11.5, color: 'var(--wt-accent-ink)', fontWeight: 700 }}>Use these details →</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {!searching && !hits.water_tank.length && !hits.contacts.length && (
                    <EmptyState eyebrow="No match" title={`Nobody on file matches “${q.trim()}”`} hint="Register them as a new client below." />
                  )}
                </>
              )}

              <button className="wt-btn primary" style={{ alignSelf: 'flex-start' }} onClick={startFresh}>
                <UserPlus size={15} /> {q.trim() ? `Register “${q.trim()}” as a new client` : 'Register a new client'}
              </button>
            </>
          )}

          {/* ── STEP 1: contact & property ── */}
          {step === 1 && (
            <>
              <div className="wt-wizpane-h">
                <h2>Contact &amp; property</h2>
                <p>Sec. 5 Step 1 — client name, mobile, email, service address and property type.</p>
              </div>
              {linked && (
                <div className="wt-note"><Sparkles size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
                  Pre-filled from the Seventh Sky contact directory — check the details are current.</div>
              )}
              <div className="wt-grid2">
                <div className="wt-field"><label>Client name *</label>
                  <input className="wt-input" autoFocus value={f.name} onChange={(e) => set('name', e.target.value)} /></div>
                <div className="wt-field"><label>Client type</label>
                  <select className="wt-select" value={f.client_type} onChange={(e) => set('client_type', e.target.value)}>
                    {CLIENT_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select></div>
              </div>
              <div className="wt-grid2">
                <div className="wt-field"><label>Mobile *</label>
                  <input className="wt-input" value={f.mobile} onChange={(e) => set('mobile', e.target.value)} placeholder="01XXXXXXXXX" /></div>
                <div className="wt-field"><label>Email</label>
                  <input className="wt-input" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></div>
              </div>
              <div className="wt-field"><label>Service address *</label>
                <input className="wt-input" value={f.service_address} onChange={(e) => set('service_address', e.target.value)}
                  placeholder="House / road / area — where the equipment actually is" /></div>
              <div className="wt-grid2">
                <div className="wt-field"><label>District</label>
                  <select className="wt-select" value={f.district} onChange={(e) => set('district', e.target.value)}>
                    <option value="">Select…</option>{DISTRICTS.map((d) => <option key={d}>{d}</option>)}
                  </select>
                  {f.district === 'Cumilla' && <span className="hint" style={{ color: 'var(--wt-amber)' }}>Cumilla is Seventh Sky protected territory.</span>}
                </div>
                <div className="wt-field"><label>Property type</label>
                  <select className="wt-select" value={f.property_type} onChange={(e) => set('property_type', e.target.value)}>
                    <option value="">Select…</option>{(ref?.property_types || []).map((t) => <option key={t}>{t}</option>)}
                  </select></div>
              </div>
              <div className="wt-grid2">
                <div className="wt-field"><label>Alternate contact</label>
                  <input className="wt-input" value={f.alt_contact_name} onChange={(e) => set('alt_contact_name', e.target.value)}
                    placeholder="Caretaker, building manager…" /></div>
                <div className="wt-field"><label>Alternate phone</label>
                  <input className="wt-input" value={f.alt_contact_phone} onChange={(e) => set('alt_contact_phone', e.target.value)} /></div>
              </div>
            </>
          )}

          {/* ── STEP 2: requested service ── */}
          {step === 2 && (
            <>
              <div className="wt-wizpane-h">
                <h2>What are they asking for?</h2>
                <p>Sec. 2 Scope — pick the category, then the specific service. This drives the quotation and provider capability match.</p>
              </div>
              <div className="wt-field"><label>Service category *</label>
                <div className="wt-checkgrid">
                  {categories.map((c) => (
                    <button key={c} type="button" className={`wt-checkitem${f.service_category === c ? ' on' : ''}`}
                      onClick={() => { set('service_category', c); set('requested_service', ''); }}>
                      <span className="box">{f.service_category === c ? <Check size={12} /> : null}</span>{c}
                    </button>
                  ))}
                </div>
              </div>
              {f.service_category && (
                <div className="wt-field"><label>Requested service *</label>
                  <div className="wt-checkgrid">
                    {(catalogue[f.service_category] || []).map((sv) => (
                      <button key={sv} type="button" className={`wt-checkitem${f.requested_service === sv ? ' on' : ''}`}
                        onClick={() => set('requested_service', sv)}>
                        <span className="box">{f.requested_service === sv ? <Check size={12} /> : null}</span>{sv}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="wt-grid3">
                <div className="wt-field"><label>Enquiry date</label>
                  <DatePicker value={f.enquiry_date} onChange={(v) => set('enquiry_date', v)} max={new Date().toISOString().slice(0, 10)} /></div>
                <div className="wt-field"><label>Enquiry channel</label>
                  <select className="wt-select" value={f.enquiry_channel} onChange={(e) => set('enquiry_channel', e.target.value)}>
                    {(ref?.enquiry_channels || []).map((c) => <option key={c}>{c}</option>)}
                  </select></div>
                <div className="wt-field"><label>Assigned officer</label>
                  <input className="wt-input" value={f.assigned_officer} onChange={(e) => set('assigned_officer', e.target.value)} /></div>
              </div>
              <div className="wt-field"><label>Lead source</label>
                <input className="wt-input" value={f.lead_source} onChange={(e) => set('lead_source', e.target.value)}
                  placeholder="Referral name, campaign, search…" /></div>
            </>
          )}

          {/* ── STEP 3: initial consultation ── */}
          {step === 3 && (
            <>
              <div className="wt-wizpane-h">
                <h2>Initial consultation</h2>
                <p>Sec. 5 Step 2 — equipment type, capacity, how many, existing issues, service concerns and whether they want an AMC. Anything unknown can be filled in after the site assessment.</p>
              </div>
              <div className="wt-grid3">
                <div className="wt-field"><label>{eq.type_label}</label>
                  <select className="wt-select" value={f.tank_type} onChange={(e) => set('tank_type', e.target.value)}>
                    <option value="">Select…</option>{(ref?.tank_types || eq.type_options).map((t) => <option key={t}>{t}</option>)}
                  </select></div>
                <div className="wt-field"><label>{eq.capacity_label}</label>
                  <input className="wt-input" value={f.tank_capacity} onChange={(e) => set('tank_capacity', e.target.value)} placeholder={eq.capacity_placeholder} /></div>
                <div className="wt-field"><label>{eq.count_label}</label>
                  <input className="wt-input" type="number" value={f.tanks_count} onChange={(e) => set('tanks_count', e.target.value)} /></div>
              </div>
              <div className="wt-field"><label>Last serviced</label>
                <input className="wt-input" value={f.last_cleaning} onChange={(e) => set('last_cleaning', e.target.value)} placeholder="e.g. about 14 months ago, or never" /></div>
              <div className="wt-field"><label>Existing issues</label>
                <textarea className="wt-input" rows={3} style={{ resize: 'vertical' }} value={f.key_issues}
                  onChange={(e) => set('key_issues', e.target.value)} placeholder="Sediment, smell, discolouration, leak, low pressure…" /></div>
              <div className="wt-field"><label>Water quality concerns</label>
                <textarea className="wt-input" rows={2} style={{ resize: 'vertical' }} value={f.water_quality_concerns}
                  onChange={(e) => set('water_quality_concerns', e.target.value)} /></div>
              <label className="wt-toggle" style={{ padding: '11px 13px', border: '1px solid var(--wt-line)', borderRadius: 9 }}>
                <input type="checkbox" checked={f.amc_required} onChange={(e) => set('amc_required', e.target.checked)} />
                <span>Client is interested in an Annual Maintenance Contract (Sec. 10)</span>
              </label>
              <div className="wt-field"><label>Consultation notes</label>
                <textarea className="wt-input" rows={3} style={{ resize: 'vertical' }} value={f.consultation_notes}
                  onChange={(e) => set('consultation_notes', e.target.value)} /></div>
              <div className="wt-note">
                On save: client <strong>{f.name || '—'}</strong> is registered, a Project ID is opened and the consultation is stamped to their CRM profile.
                Next stop is <strong>Site Assessment (Sec. 6)</strong>.
              </div>
            </>
          )}

          {step > 0 && (
            <div className="wt-wizfoot">
              <button className="wt-btn" onClick={() => setStep(step - 1)}><ChevronLeft size={14} /> Back</button>
              <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--wt-muted)' }}>Step {step + 1} of {STEPS.length}</span>
              <button className="wt-btn primary" disabled={busy || !stepValid()} onClick={next}>
                {step < STEPS.length - 1 ? <>Continue <ChevronRight size={14} /></>
                  : busy ? 'Registering…' : <><Check size={14} /> Register client</>}
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`.wt-spin{animation:wt-rot 1s linear infinite}@keyframes wt-rot{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}
