import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { MapPin, Briefcase, Banknote, CalendarDays, Upload, FileCheck2, CheckCircle2 } from 'lucide-react';
import logo from '../../assets/logo-mark.png';
import '../../styles/careers.css';

/* Public careers page (HRM Module 3 §7–8), no login. /careers lists open roles; /careers/:slug shows one role
   and the application form from the approved "Careers application" frame. */
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

const fmtDay = (d) => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '');
const tk = (n) => Number(n).toLocaleString('en-IN');
const salary = (r) => (r.salary_min && r.salary_max ? `Tk ${tk(r.salary_min)} – ${tk(r.salary_max)} a month` : r.salary_min ? `From Tk ${tk(r.salary_min)} a month` : r.salary_max ? `Up to Tk ${tk(r.salary_max)} a month` : null);
const lines = (t) => String(t || '').split(/\r?\n/).map((s) => s.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);

export function CareersHeader() {
  return (
    <header className="crs-top">
      <div className="crs-top-in">
        <Link to="/careers" className="crs-brand"><img src={logo} alt="" /><span><b>Seventh Sky</b><small>Careers</small></span></Link>
        <nav className="crs-nav" aria-label="Careers"><Link to="/careers" aria-current="page">Open roles</Link><a href="https://seventhskyproperty.com" rel="noopener">Seventh Sky</a></nav>
      </div>
    </header>
  );
}

function Shell({ children, title }) {
  useEffect(() => { document.title = title ? `${title} · Seventh Sky Careers` : 'Seventh Sky Careers'; }, [title]);
  return <div className="crs"><CareersHeader /><main className="crs-main">{children}</main></div>;
}

export default function Careers() {
  const { slug } = useParams();
  return slug ? <Role slug={slug} /> : <RoleList />;
}

function RoleList() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { api.get('/public/careers').then((r) => setRows(r.data.data)).catch((e) => setError(e.response?.data?.error || 'We could not load the open roles. Please try again.')); }, []);
  return (
    <Shell>
      <h1>Open roles</h1>
      <p className="sub">Join the team that keeps Dhaka's homes and buildings running.</p>
      <div className="crs-roles" style={{ marginTop: 20 }}>
        {error && <div className="crs-card crs-empty">{error}</div>}
        {!error && !rows && <div className="crs-card crs-empty">Loading…</div>}
        {rows && !rows.length && <div className="crs-card crs-empty">There are no open roles right now. Please check again soon.</div>}
        {(rows || []).map((r) => (
          <Link key={r.slug} to={`/careers/${r.slug}`} className="crs-card crs-role">
            <div>
              <h2>{r.title}</h2>
              <div className="meta">
                {r.department && <span>{r.department}</span>}
                {r.location && <span>{r.location}</span>}
                {r.employment_type && <span>{r.employment_type}</span>}
                {r.closing_date && <span>Apply by {fmtDay(r.closing_date)}</span>}
              </div>
            </div>
            <span className="go">View role</span>
          </Link>
        ))}
      </div>
    </Shell>
  );
}

const DOCS = [
  ['cv', 'CV', true], ['photo', 'Photograph', true], ['national_id_doc', 'National ID', true], ['certificates', 'Certificates', false, true],
  ['cover_letter_doc', 'Cover letter'], ['portfolio', 'Portfolio'], ['licences', 'Licences', false, true],
];

function Field({ name, label, required, error, type = 'text', value, onChange, ...rest }) {
  const id = `f-${name}`;
  return (
    <label className={`crs-f${error ? ' err' : ''}`} htmlFor={id}>
      <span>{label}{required ? ' *' : ''}</span>
      <input id={id} name={name} type={type} value={value} onChange={(e) => onChange(name, e.target.value)} required={required} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-e` : undefined} {...rest} />
      {error && <em id={`${id}-e`}>{error}</em>}
    </label>
  );
}

function Role({ slug }) {
  const [role, setRole] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [v, setV] = useState({ full_name: '', date_of_birth: '', mobile: '', email: '', address: '', highest_qualification: '', institution: '', graduation_year: '', current_employer: '', current_position: '', years_experience: '', expected_salary: '', notice_period: '', website: '' });
  const [files, setFiles] = useState({});
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const formRef = useRef(null);

  useEffect(() => { api.get(`/public/careers/${slug}`).then((r) => setRole(r.data)).catch((e) => setLoadError(e.response?.data?.error || 'This role could not be loaded.')); }, [slug]);
  const set = (k, val) => { setV((s) => ({ ...s, [k]: val })); setErrors((e) => ({ ...e, [k]: undefined })); };

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    const fd = new FormData();
    Object.entries(v).forEach(([k, val]) => fd.append(k, val));
    fd.append('consent', consent ? 'true' : 'false');
    Object.entries(files).forEach(([k, list]) => list.forEach((f) => fd.append(k, f)));
    setBusy(true);
    try {
      const { data } = await api.post(`/public/careers/${slug}/apply`, fd);
      setDone(data.reference || true);
      window.scrollTo({ top: 0 });
    } catch (err) {
      const d = err.response?.data || {};
      setErrors(d.fields || {});
      setMsg(d.error || 'Your application could not be sent. Please try again.');
      const first = d.fields && Object.keys(d.fields)[0];
      const el = first && formRef.current && formRef.current.querySelector(`[name="${first}"]`);
      if (el) el.focus();
    } finally { setBusy(false); }
  };

  if (loadError) return <Shell><div className="crs-card crs-empty"><h2>Role unavailable</h2><p className="sub">{loadError}</p><p><Link to="/careers">See all open roles</Link></p></div></Shell>;
  if (!role) return <Shell><div className="crs-card crs-empty">Loading…</div></Shell>;
  const j = role.job || {};
  const youWill = [...lines(j.duties), ...lines(j.responsibilities)];
  const youHave = [...lines(j.qualifications), ...lines(j.experience), ...lines(j.technical_skills), ...lines(j.soft_skills)];
  const pay = salary(role);

  return (
    <Shell title={role.title}>
      <div className="crs-grid">
        <section className="crs-card" aria-labelledby="role-title">
          <h1 id="role-title">{role.title}</h1>
          <p className="sub">{[role.department, 'Seventh Sky Private Ltd'].filter(Boolean).join(', ')}</p>
          <ul className="crs-facts">
            {role.location && <li><MapPin size={16} aria-hidden />{role.location}</li>}
            {role.employment_type && <li><Briefcase size={16} aria-hidden />{role.employment_type}{role.positions > 1 ? `, ${role.positions} openings` : ''}</li>}
            {pay && <li><Banknote size={16} aria-hidden />{pay}</li>}
            {role.closing_date && <li><CalendarDays size={16} aria-hidden />Apply by {fmtDay(role.closing_date)}</li>}
            {j.working_hours && <li><CalendarDays size={16} aria-hidden />{j.working_hours}</li>}
          </ul>
          {j.summary && <><h3>About the role</h3><p className="crs-body">{j.summary}</p></>}
          {youWill.length > 0 && <><h3>You will</h3><ul className="crs-list">{youWill.map((t) => <li key={t}>{t}</li>)}</ul></>}
          {youHave.length > 0 && <><h3>You have</h3><ul className="crs-list">{youHave.map((t) => <li key={t}>{t}</li>)}</ul></>}
          {j.career_path && <><h3>Where it leads</h3><p className="crs-body">{j.career_path}</p></>}
        </section>

        {done ? (
          <section className="crs-card crs-done" aria-live="polite">
            <CheckCircle2 size={40} aria-hidden />
            <h2>Application sent</h2>
            <p className="sub">Thank you for applying for {role.title}. {typeof done === 'string' ? <>Your reference is <b>{done}</b>. </> : null}We have emailed you a confirmation and will contact you if you are shortlisted.</p>
            <p><Link to="/careers">See other open roles</Link></p>
          </section>
        ) : (
          <form className="crs-card crs-form" onSubmit={submit} noValidate ref={formRef} aria-labelledby="apply-title">
            <h2 id="apply-title">Apply for this role</h2>
            <p className="sub">It takes about 5 minutes. Fields marked * are required.</p>
            <fieldset>
              <legend>Personal details</legend>
              <div className="crs-row"><Field name="full_name" label="Full name" required autoComplete="name" value={v.full_name} onChange={set} error={errors.full_name} />
                <Field name="date_of_birth" label="Date of birth" type="date" required autoComplete="bday" value={v.date_of_birth} onChange={set} error={errors.date_of_birth} /></div>
              <div className="crs-row"><Field name="mobile" label="Mobile" type="tel" required autoComplete="tel" placeholder="01XXXXXXXXX" value={v.mobile} onChange={set} error={errors.mobile} />
                <Field name="email" label="Email" type="email" required autoComplete="email" value={v.email} onChange={set} error={errors.email} /></div>
              <div className="crs-row" style={{ '--cols': 1 }}><Field name="address" label="Address" required autoComplete="street-address" value={v.address} onChange={set} error={errors.address} /></div>
            </fieldset>
            <fieldset>
              <legend>Education and work</legend>
              <div className="crs-row" style={{ '--cols': 3 }}>
                <Field name="highest_qualification" label="Highest qualification" required value={v.highest_qualification} onChange={set} error={errors.highest_qualification} />
                <Field name="institution" label="Institution" required value={v.institution} onChange={set} error={errors.institution} />
                <Field name="graduation_year" label="Graduation year" inputMode="numeric" required value={v.graduation_year} onChange={set} error={errors.graduation_year} />
              </div>
              <div className="crs-row" style={{ '--cols': 3 }}>
                <Field name="current_employer" label="Current employer" autoComplete="organization" value={v.current_employer} onChange={set} />
                <Field name="current_position" label="Current position" autoComplete="organization-title" value={v.current_position} onChange={set} />
                <Field name="years_experience" label="Years of experience" inputMode="decimal" value={v.years_experience} onChange={set} error={errors.years_experience} />
              </div>
              <div className="crs-row" style={{ '--cols': 3 }}>
                <Field name="expected_salary" label="Expected salary (Tk a month)" inputMode="numeric" value={v.expected_salary} onChange={set} />
                <Field name="notice_period" label="Notice period" placeholder="e.g. 30 days" value={v.notice_period} onChange={set} />
              </div>
            </fieldset>
            <fieldset>
              <legend>Documents</legend>
              <div className="crs-docs">
                {DOCS.map(([key, label, req, many]) => {
                  const list = files[key] || [];
                  const Icon = list.length ? FileCheck2 : Upload;
                  return (
                    <label key={key} className={`crs-doc${list.length ? ' has' : ''}${errors[key] ? ' err' : ''}`}>
                      <Icon size={18} aria-hidden />
                      <span style={{ minWidth: 0 }}><b>{label}{req ? ' *' : ''}</b><small>{list.length ? list.map((f) => f.name).join(', ') : errors[key] || 'PDF or image, up to 10MB'}</small></span>
                      <input type="file" name={key} multiple={Boolean(many)} accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" aria-label={`${label}${req ? ' (required)' : ''}`}
                        onChange={(e) => { const picked = [...e.target.files]; setFiles((s) => ({ ...s, [key]: picked })); setErrors((x) => ({ ...x, [key]: undefined })); }} />
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div className="crs-hp" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" value={v.website} onChange={(e) => set('website', e.target.value)} /></label></div>
            <label className="crs-check"><input type="checkbox" name="consent" checked={consent} onChange={(e) => { setConsent(e.target.checked); setErrors((x) => ({ ...x, consent: undefined })); }} />
              <span>I confirm the information is true and agree to Seventh Sky keeping my details for future roles.{errors.consent && <em style={{ display: 'block', color: 'var(--red)', fontStyle: 'normal' }}>{errors.consent}</em>}</span></label>
            {msg && <div className="crs-alert" role="alert">{msg}</div>}
            <div className="crs-foot"><p>You'll get an email confirming we received it.</p><button className="crs-btn" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Submit application'}</button></div>
          </form>
        )}
      </div>
    </Shell>
  );
}
