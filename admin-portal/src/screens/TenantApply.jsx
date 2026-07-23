import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, AlertTriangle, Plus, Trash2, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { Spinner, Button, Field, Input, Select, Textarea } from '../ui/kit';
import FileUpload from '../ui/FileUpload';

/* Public tenant application — /apply/:token, no login. Multi-step, branded.
   Uploads go through the token-gated /uploads/application/:token route. */
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

const STEPS = ['About you', 'Occupation & income', 'Identity', 'Tenancy', 'History & references', 'Pets & declaration'];

export default function TenantApply() {
  const { token } = useParams();
  const [cfg, setCfg] = useState(null);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [f, setF] = useState({
    applicant_name: '', mobile: '', email: '', photo_url: '',
    occupation: '', employer: '', job_title: '', employment_duration: '', employment_type: 'permanent',
    is_business: false, business_name: '', business_location: '', monthly_income: '',
    nid_number: '', nid_url: '', date_of_birth: '',
    proposed_monthly_rent: '', preferred_move_in: '', lease_period: '', occupancy_requirement: '',
    occupants: [],
    emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
    employer_ref_name: '', employer_ref_email: '', employer_ref_phone: '', employer_ref_role: '', employer_ref_company: '',
    current_address: '', current_landlord_name: '', current_landlord_phone: '', current_tenancy_address: '',
    current_tenancy_rent: '', current_tenancy_duration: '', reason_for_moving: '',
    has_pets: false, pet_types: [], declaration_accepted: false, notes: '',
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/public-party/apply/${token}`);
        setCfg(data.data);
        setF((s) => ({ ...s, ...Object.fromEntries(Object.entries(data.data.prefill || {}).filter(([, v]) => v)) }));
        if (data.data.already_submitted) setDone('This application has already been submitted. Seventh Sky will contact you shortly.');
      } catch (e) { setError(e.response?.data?.error || 'This link is invalid or has expired.'); }
    })();
  }, [token]);

  const uploader = async (file) => {
    const fd = new FormData(); fd.append('file', file);
    const { data } = await api.post(`/uploads/application/${token}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data.data.url;
  };

  const submit = async () => {
    if (!f.declaration_accepted) { setError2('Please accept the declaration.'); return; }
    setBusy(true); setError2('');
    try {
      const { occupants, is_business, declaration_accepted, ...rest } = f;
      const { data } = await api.post(`/public-party/apply/${token}`, {
        ...rest, declaration_accepted: true,
        business_name: is_business ? f.business_name : '',
        business_location: is_business ? f.business_location : '',
        occupants: occupants.filter((o) => o.name),
      });
      setDone(data.message);
    } catch (e) { setError2(e.response?.data?.error || 'Submission failed — please try again.'); setBusy(false); }
  };
  const [error2, setError2] = useState('');

  const Shell = ({ children }) => (
    <div style={{ minHeight: '100vh', background: '#f6f8fb', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '28px 14px' }}>
      <div style={{ width: '100%', maxWidth: 680 }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ display: 'inline-grid', placeItems: 'center', width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#003768,#12b6f3)', color: '#fff', fontWeight: 800, fontSize: 18 }}>7S</div>
          <div style={{ fontWeight: 800, marginTop: 8 }}>Seventh Sky Property Care</div>
          <div style={{ fontSize: 12.5, color: '#64748b' }}>Tenant application</div>
        </div>
        {children}
      </div>
    </div>
  );

  if (error) return <Shell><div className="card" style={{ padding: 24, textAlign: 'center' }}><AlertTriangle size={28} color="#dc2626" /><h3>Link unavailable</h3><p className="cell-sub">{error}</p></div></Shell>;
  if (!cfg) return <Shell><div className="card" style={{ padding: 40, textAlign: 'center' }}><Spinner /></div></Shell>;
  if (done) return <Shell><div className="card" style={{ padding: 28, textAlign: 'center' }}><Check size={36} color="#16a34a" /><h3 style={{ margin: '10px 0 6px' }}>Thank you!</h3><p className="cell-sub" style={{ margin: 0 }}>{done}</p></div></Shell>;

  const p = cfg.property;
  const setOcc = (i, patch) => set('occupants', f.occupants.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  const togglePet = (t) => set('pet_types', f.pet_types.includes(t) ? f.pet_types.filter((x) => x !== t) : [...f.pet_types, t]);

  return (
    <Shell>
      {p && (
        <div className="card" style={{ padding: 14, marginBottom: 12, fontSize: 13.5 }}>
          <strong>{p.title}</strong> · {[p.area, p.city].filter(Boolean).join(', ')}
          {p.approved_monthly_rent ? <span style={{ color: '#64748b' }}> · ৳{Number(p.approved_monthly_rent).toLocaleString()}/month</span> : null}
          {p.bedrooms ? <span style={{ color: '#64748b' }}> · {p.bedrooms} bed</span> : null}
        </div>
      )}

      {/* Step pills */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, overflowX: 'auto', paddingBottom: 2 }}>
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => i <= step && setStep(i)}
            style={{ whiteSpace: 'nowrap', padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: i <= step ? 'pointer' : 'default', border: 'none', background: i === step ? '#003768' : i < step ? '#dcfce7' : '#e2e8f0', color: i === step ? '#fff' : i < step ? '#15803d' : '#94a3b8' }}>
            {i < step ? '✓ ' : `${i + 1}. `}{s}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 20 }}>
        {step === 0 && (
          <>
            <h4 className="form-section-title" style={{ marginTop: 0 }}>About you</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
              <Field label="Full name *"><Input value={f.applicant_name} onChange={(e) => set('applicant_name', e.target.value)} /></Field>
              <Field label="Mobile *"><Input value={f.mobile} onChange={(e) => set('mobile', e.target.value)} placeholder="01XXXXXXXXX" /></Field>
              <Field label="Email"><Input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
              <Field label="Date of birth"><Input type="date" value={f.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} /></Field>
            </div>
            <Field label="Your photo"><FileUpload compact value={f.photo_url} onChange={(u) => set('photo_url', u)} uploader={uploader} label="Upload a clear photo of yourself" /></Field>
          </>
        )}

        {step === 1 && (
          <>
            <h4 className="form-section-title" style={{ marginTop: 0 }}>Occupation &amp; income</h4>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <button type="button" onClick={() => set('is_business', false)} style={{ flex: 1, padding: '8px', borderRadius: 10, border: '1px solid', borderColor: !f.is_business ? '#003768' : '#e2e8f0', background: !f.is_business ? '#eff6ff' : '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>I'm employed</button>
              <button type="button" onClick={() => set('is_business', true)} style={{ flex: 1, padding: '8px', borderRadius: 10, border: '1px solid', borderColor: f.is_business ? '#003768' : '#e2e8f0', background: f.is_business ? '#eff6ff' : '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>I run a business</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
              {f.is_business ? (
                <>
                  <Field label="Business name"><Input value={f.business_name} onChange={(e) => set('business_name', e.target.value)} /></Field>
                  <Field label="Business location"><Input value={f.business_location} onChange={(e) => set('business_location', e.target.value)} /></Field>
                  <Field label="Your role"><Input value={f.occupation} onChange={(e) => set('occupation', e.target.value)} placeholder="e.g. Proprietor" /></Field>
                </>
              ) : (
                <>
                  <Field label="Occupation"><Input value={f.occupation} onChange={(e) => set('occupation', e.target.value)} /></Field>
                  <Field label="Company name"><Input value={f.employer} onChange={(e) => set('employer', e.target.value)} /></Field>
                  <Field label="Your role / designation"><Input value={f.job_title} onChange={(e) => set('job_title', e.target.value)} /></Field>
                  <Field label="Working there since"><Input value={f.employment_duration} onChange={(e) => set('employment_duration', e.target.value)} placeholder="e.g. Jan 2024" /></Field>
                  <Field label="Employment type">
                    <Select value={f.employment_type} onChange={(e) => set('employment_type', e.target.value)}>
                      <option value="permanent">Permanent</option><option value="contract">Contractual</option><option value="part_time">Casual / part-time</option><option value="self_employed">Self-employed</option>
                    </Select>
                  </Field>
                </>
              )}
              <Field label="Monthly income (৳)"><Input type="number" value={f.monthly_income} onChange={(e) => set('monthly_income', e.target.value)} /></Field>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h4 className="form-section-title" style={{ marginTop: 0 }}>Identity</h4>
            <Field label="NID number"><Input value={f.nid_number} onChange={(e) => set('nid_number', e.target.value)} /></Field>
            <Field label="Upload NID (front, image or PDF)"><FileUpload compact value={f.nid_url} onChange={(u) => set('nid_url', u)} uploader={uploader} label="Upload NID" /></Field>
            <p className="cell-sub" style={{ fontSize: 12 }}>Your documents are stored securely and used only to verify your application.</p>
          </>
        )}

        {step === 3 && (
          <>
            <h4 className="form-section-title" style={{ marginTop: 0 }}>Tenancy</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
              <Field label="Your rent offer (৳/month)"><Input type="number" value={f.proposed_monthly_rent} onChange={(e) => set('proposed_monthly_rent', e.target.value)} /></Field>
              <Field label="Preferred move-in date"><Input type="date" value={f.preferred_move_in} onChange={(e) => set('preferred_move_in', e.target.value)} /></Field>
              <Field label="Lease period"><Input value={f.lease_period} onChange={(e) => set('lease_period', e.target.value)} placeholder="e.g. 12 months" /></Field>
            </div>
            <div className="form-section-title">Who will live at the property?</div>
            {f.occupants.map((o, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 34px', gap: 8, marginBottom: 6 }}>
                <Input placeholder="Name" value={o.name || ''} onChange={(e) => setOcc(i, { name: e.target.value })} />
                <Input placeholder="Phone (if any)" value={o.phone || ''} onChange={(e) => setOcc(i, { phone: e.target.value })} />
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => set('occupants', f.occupants.filter((_, idx) => idx !== i))}><Trash2 size={13} /></button>
              </div>
            ))}
            <Button size="sm" variant="ghost" icon={Plus} onClick={() => set('occupants', [...f.occupants, { name: '', phone: '' }])}>Add occupant</Button>
          </>
        )}

        {step === 4 && (
          <>
            <h4 className="form-section-title" style={{ marginTop: 0 }}>Previous rental</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
              <Field label="Current address"><Input value={f.current_address} onChange={(e) => set('current_address', e.target.value)} /></Field>
              <Field label="Current/previous landlord name"><Input value={f.current_landlord_name} onChange={(e) => set('current_landlord_name', e.target.value)} /></Field>
              <Field label="Landlord phone"><Input value={f.current_landlord_phone} onChange={(e) => set('current_landlord_phone', e.target.value)} /></Field>
              <Field label="Current rent (৳)"><Input type="number" value={f.current_tenancy_rent} onChange={(e) => set('current_tenancy_rent', e.target.value)} /></Field>
              <Field label="How long there?"><Input value={f.current_tenancy_duration} onChange={(e) => set('current_tenancy_duration', e.target.value)} placeholder="e.g. 2 years" /></Field>
              <Field label="Reason for moving"><Input value={f.reason_for_moving} onChange={(e) => set('reason_for_moving', e.target.value)} /></Field>
            </div>
            <div className="form-section-title">Emergency contact</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
              <Field label="Name"><Input value={f.emergency_contact_name} onChange={(e) => set('emergency_contact_name', e.target.value)} /></Field>
              <Field label="Phone"><Input value={f.emergency_contact_phone} onChange={(e) => set('emergency_contact_phone', e.target.value)} /></Field>
              <Field label="Relationship"><Input value={f.emergency_contact_relationship} onChange={(e) => set('emergency_contact_relationship', e.target.value)} /></Field>
            </div>
            <div className="form-section-title">Employment reference (optional — strengthens your application)</div>
            <p className="cell-sub" style={{ fontSize: 12, marginTop: 0 }}>We'll politely email your employer a one-minute questionnaire to confirm your employment. This is optional.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
              <Field label="Contact name"><Input value={f.employer_ref_name} onChange={(e) => set('employer_ref_name', e.target.value)} /></Field>
              <Field label="Email"><Input type="email" value={f.employer_ref_email} onChange={(e) => set('employer_ref_email', e.target.value)} /></Field>
              <Field label="Phone"><Input value={f.employer_ref_phone} onChange={(e) => set('employer_ref_phone', e.target.value)} /></Field>
              <Field label="Their role"><Input value={f.employer_ref_role} onChange={(e) => set('employer_ref_role', e.target.value)} placeholder="e.g. HR Manager" /></Field>
              <Field label="Company"><Input value={f.employer_ref_company} onChange={(e) => set('employer_ref_company', e.target.value)} /></Field>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h4 className="form-section-title" style={{ marginTop: 0 }}>Pets</h4>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <button type="button" onClick={() => set('has_pets', false)} style={{ padding: '7px 16px', borderRadius: 999, border: '1px solid', borderColor: !f.has_pets ? '#003768' : '#e2e8f0', background: !f.has_pets ? '#eff6ff' : '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>No pets</button>
              <button type="button" onClick={() => set('has_pets', true)} style={{ padding: '7px 16px', borderRadius: 999, border: '1px solid', borderColor: f.has_pets ? '#003768' : '#e2e8f0', background: f.has_pets ? '#eff6ff' : '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>I have pets / birds</button>
            </div>
            {f.has_pets && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {['Dogs', 'Cats', 'Birds', 'Others'].map((t) => (
                  <button key={t} type="button" onClick={() => togglePet(t.toLowerCase())} style={{ padding: '6px 14px', borderRadius: 999, border: '1px solid', borderColor: f.pet_types.includes(t.toLowerCase()) ? '#003768' : '#e2e8f0', background: f.pet_types.includes(t.toLowerCase()) ? '#eff6ff' : '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>{t}</button>
                ))}
              </div>
            )}
            <Field label="Anything else we should know?"><Textarea rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>

            <div className="form-section-title">Declaration</div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, fontSize: 12.5, color: '#475569' }}>{cfg.declaration_text}</div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 10, fontSize: 13.5, cursor: 'pointer' }}>
              <input type="checkbox" checked={f.declaration_accepted} onChange={(e) => set('declaration_accepted', e.target.checked)} style={{ marginTop: 3 }} />
              <span>I have read and agree to the declaration above. *</span>
            </label>
          </>
        )}

        {error2 && <div style={{ color: '#b91c1c', fontSize: 13, marginTop: 12, padding: 10, background: '#fef2f2', borderRadius: 8 }}>{error2}</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
          <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0 || busy}>Back</Button>
          {step < STEPS.length - 1
            ? <Button onClick={() => setStep(step + 1)}>Continue <ChevronRight size={14} /></Button>
            : <Button onClick={submit} disabled={busy || !f.declaration_accepted}>{busy ? <Spinner /> : 'Submit application'}</Button>}
        </div>
      </div>
    </Shell>
  );
}
