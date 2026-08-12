import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Building2, Wrench, MapPin, Landmark, BadgeDollarSign, Send, Check,
  ChevronLeft, ChevronRight, Search, Loader2, ExternalLink, X,
} from 'lucide-react';
import api from '../../../services/api';
import { WtHead, EmptyState, Loading, Pill, toast, errText, bdt } from '../common';

const STEPS = [
  { label: 'Application', hint: 'Identity and representative', icon: Building2 },
  { label: 'Capability', hint: 'Services, team and equipment', icon: Wrench },
  { label: 'Coverage', hint: 'Territories and capacity', icon: MapPin },
  { label: 'Payment', hint: 'Settlement details', icon: Landmark },
  { label: 'Proposed rates', hint: 'Commercial proposal', icon: BadgeDollarSign },
  { label: 'Review & invite', hint: 'Provider collaboration', icon: Send },
];
const BUSINESS_TYPES = ['Sole Proprietorship', 'Partnership', 'Private Limited', 'Public Limited', 'Cooperative'];

const blank = {
  business_name: '', legal_name: '', business_type: '', registration_no: '',
  contact_person: '', contact_email: '', contact_phone: '', website: '', address: '', district: '',
  years_experience: '', team_size: '', capacity_per_week: '', equipment_summary: '',
  service_categories: [], coverage_areas: [], cumilla_exclusive: false, availability_notes: '',
  bank_details: { account_name: '', bank_name: '', branch: '', account_number: '', routing_number: '', mobile_banking: '' },
  proposed_rates: [], onboarding_last_step: 0,
};

export default function ProviderOnboarding() {
  const { code } = useParams();
  const nav = useNavigate();
  const editing = !!code;
  const [step, setStep] = useState(0);
  const [provider, setProvider] = useState(null);
  const [form, setForm] = useState(blank);
  const [reference, setReference] = useState({ service_categories: [] });
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lookup, setLookup] = useState('');
  const [matches, setMatches] = useState([]);
  const [invite, setInvite] = useState(null);

  const hydrate = (row) => {
    const rates = Array.isArray(row.proposed_rates) ? row.proposed_rates : [];
    setProvider(row);
    // Unset columns come back as null. Spreading the row would overwrite the blank
    // defaults with null, which crashes the string checks in valid() and turns every
    // affected input into an uncontrolled one — so coerce every null back to its default.
    const merged = { ...blank, ...row };
    Object.keys(merged).forEach((key) => {
      if (merged[key] == null) merged[key] = key in blank ? blank[key] : '';
    });
    setForm({
      ...merged,
      service_categories: Array.isArray(row.service_categories) ? row.service_categories : [],
      coverage_areas: Array.isArray(row.coverage_areas) ? row.coverage_areas : [],
      bank_details: row.bank_details && typeof row.bank_details === 'object' ? row.bank_details : blank.bank_details,
      proposed_rates: rates,
    });
    setStep(Math.min(Number(row.onboarding_last_step || 0), STEPS.length - 1));
  };

  useEffect(() => {
    Promise.all([
      api.get('/wt-providers/reference'),
      api.get('/wt-agreements/provider/catalog'),
      ...(editing ? [api.get(`/wt-providers/${code}`)] : []),
    ]).then(([ref, cat, detail]) => {
      setReference(ref.data || {}); setCatalog(Array.isArray(cat.data) ? cat.data : []);
      if (detail?.data?.provider) hydrate(detail.data.provider);
    }).catch((e) => setError(errText(e, 'Could not load provider onboarding')))
      .finally(() => setLoading(false));
  }, [code, editing]);

  useEffect(() => {
    if (editing || lookup.trim().length < 2) { setMatches([]); return undefined; }
    const timer = setTimeout(() => api.get('/wt-providers/lookup', { params: { q: lookup } })
      .then((r) => setMatches(Array.isArray(r.data) ? r.data : [])).catch(() => setMatches([])), 220);
    return () => clearTimeout(timer);
  }, [lookup, editing]);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const setBank = (key, value) => setForm((current) => ({ ...current, bank_details: { ...current.bank_details, [key]: value } }));
  const toggle = (key, value) => setForm((current) => ({
    ...current,
    [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value],
  }));
  const selectedRates = useMemo(() => new Map((form.proposed_rates || []).map((rate) => [rate.code, rate])), [form.proposed_rates]);
  const toggleRate = (item) => setForm((current) => {
    const rows = [...(current.proposed_rates || [])];
    const index = rows.findIndex((rate) => rate.code === item.code);
    if (index >= 0) rows.splice(index, 1);
    else rows.push({ code: item.code, name: item.name, unit: item.unit, standard_price: item.standard_price, proposed_rate: item.standard_price });
    return { ...current, proposed_rates: rows };
  });
  const setRate = (codeValue, value) => setForm((current) => ({
    ...current,
    proposed_rates: current.proposed_rates.map((rate) => rate.code === codeValue ? { ...rate, proposed_rate: value } : rate),
  }));

  const filled = (key) => String(form[key] ?? '').trim().length > 0;
  const valid = () => {
    if (step === 0) return filled('business_name') && filled('contact_person') && filled('contact_email');
    if (step === 1) return (form.service_categories || []).length > 0;
    if (step === 2) return (form.coverage_areas || []).length > 0;
    if (step === 4) return (form.proposed_rates || []).length > 0;
    return true;
  };

  const save = async (next = true) => {
    if (!valid()) return;
    setBusy(true); setError('');
    try {
      const body = { ...form, onboarding_last_step: Math.max(form.onboarding_last_step || 0, next ? step + 1 : step) };
      let row;
      if (provider) ({ data: row } = await api.patch(`/wt-providers/${provider.code}`, body));
      else ({ data: row } = await api.post('/wt-providers', body));
      hydrate(row);
      if (!provider) {
        toast.ok(`${row.business_name} application created`);
        nav(`/water-tank/providers/${row.code}/edit`, { replace: true });
      }
      if (next) setStep((current) => Math.min(STEPS.length - 1, current + 1));
      else toast.ok('Progress saved');
    } catch (e) { setError(errText(e, 'Could not save this onboarding step')); }
    finally { setBusy(false); }
  };

  const sendInvite = async () => {
    if (!provider) return;
    setBusy(true); setError('');
    try {
      const { data } = await api.post(`/wt-providers/${provider.code}/invite`);
      setInvite(data); toast.ok('Secure onboarding invitation generated');
    } catch (e) { setError(errText(e, 'Could not generate the invitation')); }
    finally { setBusy(false); }
  };

  if (loading) return <Loading />;
  const title = editing ? `Continue ${form.business_name || 'Provider'} Onboarding` : 'Onboard a Service Provider';

  return (
    <>
      <WtHead
        crumb={<div className="wt-crumb"><span className="lnk" onClick={() => nav('/water-tank/providers')}>Providers</span> › <span>{editing ? provider?.code : 'New provider'}</span></div>}
        title={title}
        subtitle="SSPC-WTCM-SOP-02 · resumable application, commercial proposal and agreement handoff"
      >
        <button className="wt-btn" onClick={() => nav('/water-tank/providers')}><X size={14} /> Close</button>
        {provider && <button className="wt-btn" onClick={() => save(false)}>Save progress</button>}
      </WtHead>

      <div className="wt-wizard">
        <aside className="wt-wizrail">
          <div className="wt-wizrail-h">Provider onboarding</div>
          {STEPS.map((item, index) => (
            <button key={item.label} className={`wt-wizrail-item${step === index ? ' on' : ''}${index < step ? ' done' : ''}`}
              onClick={() => provider && index <= Number(form.onboarding_last_step || 0) && setStep(index)}>
              <span className="n">{index < step ? <Check size={12} /> : index + 1}</span>
              <span><span className="l">{item.label}</span><span className="s">{item.hint}</span></span>
            </button>
          ))}
          {provider && <div className="wt-note" style={{ marginTop: 10 }}><strong>{provider.code}</strong><br />{provider.onboarding_submission_status || 'Staff Draft'}</div>}
        </aside>

        <section className="wt-wizpane">
          {error && <div className="wt-formerr">{error}</div>}

          {step === 0 && <>
            <div className="wt-wizpane-h"><h2>Business application</h2><p>Search first to avoid duplicate provider records, then capture the legal business and authorised representative.</p></div>
            {!editing && <div className="wt-field"><label>Search existing providers</label><div className="wt-search" style={{ maxWidth: 'none' }}><Search /><input value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="Business, registration, email or phone…" /></div>
              {matches.length > 0 && <div className="wt-lookup">{matches.map((match) => <button className="wt-lookup-item" key={match.id} onClick={() => nav(`/water-tank/providers/${match.code}`)}><span className="av">{match.business_name.slice(0, 2).toUpperCase()}</span><span style={{ flex: 1 }}><span className="nm">{match.business_name}</span><span className="mt">{[match.code, match.registration_no, match.contact_email].filter(Boolean).join(' · ')}</span></span><Pill value={match.status} sm /></button>)}</div>}</div>}
            <div className="wt-grid2">
              <Field label="Trading name *" value={form.business_name} onChange={(v) => set('business_name', v)} />
              <Field label="Registered legal name" value={form.legal_name} onChange={(v) => set('legal_name', v)} />
              <SelectField label="Business type" value={form.business_type} onChange={(v) => set('business_type', v)} options={BUSINESS_TYPES} />
              <Field label="Registration number" value={form.registration_no} onChange={(v) => set('registration_no', v)} />
              <Field label="Authorised representative *" value={form.contact_person} onChange={(v) => set('contact_person', v)} />
              <Field label="Email *" type="email" value={form.contact_email} onChange={(v) => set('contact_email', v)} />
              <Field label="Mobile" value={form.contact_phone} onChange={(v) => set('contact_phone', v)} />
              <Field label="Website" value={form.website} onChange={(v) => set('website', v)} />
            </div>
            <Field label="Business address" value={form.address} onChange={(v) => set('address', v)} />
          </>}

          {step === 1 && <>
            <div className="wt-wizpane-h"><h2>Capability assessment inputs</h2><p>Select the services to assess and capture resources. Formal scoring remains on the provider dashboard.</p></div>
            <div className="wt-field"><label>Service categories *</label><div className="wt-checkgrid">{(reference.service_categories || []).map((item) => <Choice key={item} label={item} on={form.service_categories.includes(item)} onClick={() => toggle('service_categories', item)} />)}</div></div>
            <div className="wt-grid3"><Field label="Years of experience" type="number" value={form.years_experience} onChange={(v) => set('years_experience', v)} /><Field label="Team size" type="number" value={form.team_size} onChange={(v) => set('team_size', v)} /><Field label="Jobs per week capacity" type="number" value={form.capacity_per_week} onChange={(v) => set('capacity_per_week', v)} /></div>
            <TextField label="Equipment, vehicles and specialist resources" value={form.equipment_summary} onChange={(v) => set('equipment_summary', v)} />
          </>}

          {step === 2 && <>
            <div className="wt-wizpane-h"><h2>Coverage and availability</h2><p>Coverage drives provider matching. Cumilla work remains controlled by Seventh Sky and the signed territory terms.</p></div>
            <div className="wt-field"><label>Coverage areas *</label><div className="wt-checkgrid">{(reference.districts || ['Dhaka', 'Cumilla', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna', 'Barishal', 'Rangpur', 'Mymensingh', 'Gazipur', 'Narayanganj']).map((item) => <Choice key={item} label={item} on={form.coverage_areas.includes(item)} onClick={() => toggle('coverage_areas', item)} badge={item === 'Cumilla' ? 'Protected' : null} />)}</div></div>
            <label className="wt-toggle"><input type="checkbox" checked={!!form.cumilla_exclusive} onChange={(e) => set('cumilla_exclusive', e.target.checked)} /><span>Cumilla exclusive service-area obligations apply</span></label>
            <TextField label="Availability, blackout dates or operating constraints" value={form.availability_notes} onChange={(v) => set('availability_notes', v)} />
          </>}

          {step === 3 && <>
            <div className="wt-wizpane-h"><h2>Provider settlement account</h2><p>These details are copied into the draft master agreement. Accounts must verify them before work assignment.</p></div>
            <div className="wt-grid2"><Field label="Account holder" value={form.bank_details.account_name || ''} onChange={(v) => setBank('account_name', v)} /><Field label="Bank name" value={form.bank_details.bank_name || ''} onChange={(v) => setBank('bank_name', v)} /><Field label="Branch" value={form.bank_details.branch || ''} onChange={(v) => setBank('branch', v)} /><Field label="Account number" value={form.bank_details.account_number || ''} onChange={(v) => setBank('account_number', v)} /><Field label="Routing number" value={form.bank_details.routing_number || ''} onChange={(v) => setBank('routing_number', v)} /><Field label="bKash / Nagad" value={form.bank_details.mobile_banking || ''} onChange={(v) => setBank('mobile_banking', v)} /></div>
            <div className="wt-note">Bank details remain unverified until Accounts confirms them on the provider dashboard. An unverified account blocks client assignment.</div>
          </>}

          {step === 4 && <>
            <div className="wt-wizpane-h"><h2>Proposed provider rates</h2><p>Select authorised catalogue items and record what the provider proposes to charge before commission.</p></div>
            <div className="wt-rate-list">{catalog.map((item) => { const rate = selectedRates.get(item.code); return <div className={`wt-rate-row${rate ? ' on' : ''}`} key={item.code}><input type="checkbox" checked={!!rate} onChange={() => toggleRate(item)} /><span className="code">{item.code}</span><span className="name">{item.name}<small>{item.unit || 'service'}</small></span><span className="standard">Std {bdt(item.standard_price)}</span>{rate ? <input className="wt-input" type="number" value={rate.proposed_rate} onChange={(e) => setRate(item.code, e.target.value)} aria-label={`${item.name} proposed rate`} /> : <span />}</div>; })}</div>
          </>}

          {step === 5 && <>
            <div className="wt-wizpane-h"><h2>Review and collaborate</h2><p>Invite the provider to verify their profile, upload private compliance and insurance evidence, confirm settlement details and submit proposed rates.</p></div>
            {!provider ? <EmptyState eyebrow="Save required" title="Create the provider application first" /> : <>
              <div className="wt-review-grid">
                <Review label="Business" value={form.business_name} sub={form.contact_person} />
                <Review label="Services" value={`${form.service_categories.length} categories`} sub={`${form.proposed_rates.length} proposed rates`} />
                <Review label="Coverage" value={`${form.coverage_areas.length} areas`} sub={form.coverage_areas.join(', ')} />
                <Review label="Capacity" value={`${Number(form.capacity_per_week || 0)} jobs / week`} sub={form.availability_notes || 'No constraints recorded'} />
              </div>
              <div className="wt-card" style={{ padding: 18 }}><strong>Provider invitation</strong><p className="muted" style={{ fontSize: 12.5 }}>The secure link expires after 30 days and can be revoked by issuing another link.</p><button className="wt-btn primary" onClick={sendInvite} disabled={busy}><Send size={14} /> Generate and email invitation</button>{invite?.link && <div className="wt-invite-link"><input className="wt-input" readOnly value={invite.link} /><button className="wt-btn" onClick={() => navigator.clipboard.writeText(invite.link).then(() => toast.ok('Invitation link copied'))}>Copy</button><a className="wt-btn" href={invite.link} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Open</a></div>}</div>
              <div className="wt-note">After staff verifies documents, payment details and proposed rates, create the 63-clause master agreement. Both the provider and Seventh Sky must sign before rates activate.</div>
              <button className="wt-btn primary" onClick={() => nav(`/agreements/water-tank-provider/new?provider=${provider.code}`)}><BadgeDollarSign size={14} /> Draft provider master agreement</button>
            </>}
          </>}

          <div className="wt-wizfoot">
            <button className="wt-btn" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}><ChevronLeft size={14} /> Back</button>
            <span style={{ marginLeft: 'auto' }}>Step {step + 1} of {STEPS.length}</span>
            {step < STEPS.length - 1 && <button className="wt-btn primary" disabled={busy || !valid()} onClick={() => save(true)}>{busy ? <Loader2 size={14} className="wt-spin" /> : <>Save & continue <ChevronRight size={14} /></>}</button>}
          </div>
        </section>
      </div>
    </>
  );
}

function Field({ label, value, onChange, type = 'text' }) { return <div className="wt-field"><label>{label}</label><input className="wt-input" type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} /></div>; }
function TextField({ label, value, onChange }) { return <div className="wt-field"><label>{label}</label><textarea className="wt-input" rows={3} value={value || ''} onChange={(e) => onChange(e.target.value)} /></div>; }
function SelectField({ label, value, onChange, options }) { return <div className="wt-field"><label>{label}</label><select className="wt-select" value={value || ''} onChange={(e) => onChange(e.target.value)}><option value="">Select…</option>{options.map((option) => <option key={option}>{option}</option>)}</select></div>; }
function Choice({ label, on, onClick, badge }) { return <button type="button" className={`wt-checkitem${on ? ' on' : ''}`} onClick={onClick}><span className="box">{on ? <Check size={12} /> : null}</span>{label}{badge && <span className="wt-pill sm amber" style={{ marginLeft: 'auto' }}>{badge}</span>}</button>; }
function Review({ label, value, sub }) { return <div className="wt-review"><span>{label}</span><strong>{value || '—'}</strong><small>{sub || '—'}</small></div>; }
