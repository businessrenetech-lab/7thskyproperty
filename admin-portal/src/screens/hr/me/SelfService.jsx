import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Upload, FileText, Check, Printer } from 'lucide-react';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { Button, Drawer, Field, Input, Select } from '../../../ui/kit';
import { useGet, errText, Loading, Info, Tag, fmtDate } from '../hrShared';
import { FIELDS, FieldInput, STATUS_TONE, show } from '../employeeFields';
import { fileSrc } from '../../../ui/FileUpload';

/*
 * Employee self-service (M2 §12; plan Task 14): my profile, documents, requests, policies, roster and
 * letters. Everything reads the signed-in person's own record through /api/hr/employees/me. Address and
 * emergency-contact changes go to the HR Manager; nothing here writes straight to the master.
 */

const useMe = () => useGet('/hr/employees/me');
const NoRecord = ({ error, reload }) => (
  <div className="hrm"><div className="hrm-head"><div><h1>My HR</h1></div></div><Loading error={error} reload={reload} /></div>
);

export function MyProfile() {
  const me = useMe();
  const meta = useGet('/hr/employees/meta');
  const [edit, setEdit] = useState(false);
  if (!me.data) return <NoRecord error={me.error} reload={me.reload} />;
  const e = me.data;
  return (
    <div className="hrm">
      <div className="hrm-head">
        <div><h1>{e.full_name} <Tag tone={STATUS_TONE[e.status]}>{e.status}</Tag></h1><p>{e.employee_code} · {e.position_title || '—'} · {e.department_name || '—'}</p></div>
        <Button icon={Pencil} onClick={() => setEdit(true)}>Update address or emergency contact</Button>
      </div>
      {(e.pending_changes || []).map((c) => (
        <div className="hrm-banner" key={c.id}><div className="grow"><b>Waiting for approval: {c.label} ({c.code})</b><span>{c.fields.join(', ').replace(/_/g, ' ')} · waiting for the {c.step_role}</span></div><Link className="hrm-link" to="/hr/my-requests">My requests</Link></div>
      ))}
      <div className="hrm-split">
        <section className="hrm-card" aria-label="About me">
          <div className="hrm-card-head"><h2>About me</h2></div>
          <div className="hrm-facts">{FIELDS.basic.filter((f) => f.key in e).map((f) => <Info key={f.key} label={f.label}>{show(f, e[f.key])}</Info>)}</div>
          <p className="hrm-note hrm-pad">To correct your name, date of birth or ID numbers, ask HR: those changes need their approval and proof.</p>
        </section>
        <div>
          <section className="hrm-card" aria-label="Job">
            <div className="hrm-card-head"><h2>My job</h2></div>
            <div className="hrm-facts">
              <Info label="Position">{e.position_title}</Info><Info label="Department">{e.department_name}</Info>
              <Info label="Supervisor">{e.supervisor_name}</Info><Info label="Employee type">{e.employee_type}</Info>
              <Info label="Joined">{fmtDate(e.joining_date)}</Info><Info label="Probation ends">{e.probation_end_date ? fmtDate(e.probation_end_date) : null}</Info>
              <Info label="Work location">{e.work_location_name}</Info><Info label="Work schedule">{e.work_schedule}</Info>
            </div>
          </section>
          <section className="hrm-card" aria-label="Contact">
            <div className="hrm-card-head"><h2>Contact and emergency</h2></div>
            <div className="hrm-facts">{FIELDS.contact.map((f) => <Info key={f.key} label={f.label}>{show(f, e[f.key])}</Info>)}</div>
          </section>
        </div>
      </div>
      {edit && <ContactRequest e={e} meta={meta.data} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); me.reload(); }} />}
    </div>
  );
}

function ContactRequest({ e, meta, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(() => Object.fromEntries(FIELDS.contact.map((f) => [f.key, e[f.key] ?? ''])));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try { const r = await api.patch('/hr/employees/me', { ...form, reason }); toast.success(`Sent to HR: ${r.data.change_request.code}`); onSaved(); } catch (err) { toast.error(errText(err)); }
    setBusy(false);
  };
  return (
    <Drawer title="Update address or emergency contact" onClose={onClose} width={560}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={busy} onClick={send}>{busy ? 'Sending…' : 'Send to HR'}</Button></>}>
      <div className="hrm">
        <p className="hrm-note">HR checks the change before it shows on your record.</p>
        <div className="hrm-form" style={{ marginTop: 12 }}>
          {FIELDS.contact.map((f) => <FieldInput key={f.key} f={f} value={form[f.key]} onChange={(k, v) => setForm((x) => ({ ...x, [k]: v }))} meta={meta} />)}
          <Field label="Note for HR" full><Input value={reason} onChange={(ev) => setReason(ev.target.value)} placeholder="For example: moved house on 1 November" /></Field>
        </div>
      </div>
    </Drawer>
  );
}

export function MyDocuments() {
  const toast = useToast();
  const me = useMe();
  const meta = useGet('/hr/employees/meta');
  const [file, setFile] = useState(null);
  const [type, setType] = useState('');
  const [expiry, setExpiry] = useState('');
  const [busy, setBusy] = useState(false);
  if (!me.data) return <NoRecord error={me.error} reload={me.reload} />;
  const e = me.data;
  const upload = async () => {
    const fd = new FormData();
    fd.append('file', file); fd.append('doc_type', type); if (expiry) fd.append('expiry_date', expiry);
    setBusy(true);
    try { await api.post('/hr/employees/me/documents', fd); toast.success(`${type} uploaded. HR will check it.`); setFile(null); setType(''); setExpiry(''); me.reload(); } catch (err) { toast.error(errText(err)); }
    setBusy(false);
  };
  const tone = { verified: 'green', rejected: 'red', pending: 'amber' };
  return (
    <div className="hrm">
      <div className="hrm-head"><div><h1>My documents</h1><p>Your papers on file with HR. Only you and HR can open them.</p></div></div>
      <div className="hrm-split wide-left">
        <section className="hrm-card" aria-label="Documents">
          <div className="hrm-card-head"><h2>On file</h2><small>{e.documents.length}</small></div>
          {e.documents.length ? (
            <div className="hrm-table-wrap"><table className="hrm-table"><tbody>{e.documents.map((d) => (
              <tr key={d.id}>
                <td><a className="hrm-link" href={fileSrc(d.file_url)} target="_blank" rel="noreferrer">{d.doc_type}</a><small>{d.file_name} · {fmtDate(d.uploaded_at)}</small></td>
                <td>{d.expiry_date ? `Expires ${fmtDate(d.expiry_date)}` : ''}</td>
                <td className="num"><Tag tone={tone[d.verification_status]}>{d.verification_status === 'pending' ? 'HR is checking' : d.verification_status === 'verified' ? 'Verified' : 'Rejected'}</Tag>{d.verification_status === 'rejected' && d.notes ? <small>{d.notes}</small> : null}</td>
              </tr>
            ))}</tbody></table></div>
          ) : <div className="hrm-empty">Nothing on file yet. Upload what HR asks for below.</div>}
        </section>
        <div>
          <section className="hrm-card" aria-label="Still needed">
            <div className="hrm-card-head"><h2>HR still needs</h2></div>
            {e.missing_documents.length ? <div className="hrm-chips hrm-pad">{e.missing_documents.map((d) => <span key={d}>{d}</span>)}</div> : <div className="hrm-empty">Nothing. You are all set.</div>}
          </section>
          <section className="hrm-card" aria-label="Upload">
            <div className="hrm-card-head"><h2>Upload a document</h2></div>
            <div className="hrm-form hrm-pad">
              <Field label="Type" required full><Select value={type} onChange={(ev) => setType(ev.target.value)}><option value="">Choose…</option>{(meta.data?.documentTypes || []).map((t) => <option key={t}>{t}</option>)}</Select></Field>
              <Field label="Expires"><Input type="date" value={expiry} onChange={(ev) => setExpiry(ev.target.value)} /></Field>
              <Field label="File" required><Input type="file" onChange={(ev) => setFile(ev.target.files[0] || null)} /></Field>
              <div className="full"><Button icon={Upload} disabled={!file || !type || busy} onClick={upload}>{busy ? 'Uploading…' : 'Upload'}</Button></div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export function MyRequests() {
  const list = useGet('/hr/employees/me/requests');
  const tone = { pending: 'amber', approved: 'green', rejected: 'red', withdrawn: 'slate' };
  const rows = list.data?.data || [];
  return (
    <div className="hrm">
      <div className="hrm-head"><div><h1>My requests</h1><p>Changes to your record and where each one is.</p></div><Link className="hrm-link" to="/hr/my-leave">Leave requests are in My leave</Link></div>
      <section className="hrm-card" aria-label="Requests">
        {!list.data ? <Loading error={list.error} reload={list.reload} /> : rows.length ? (
          <div className="hrm-table-wrap"><table className="hrm-table">
            <thead><tr><th>Request</th><th>What</th><th>Sent</th><th aria-label="Status" /></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td><b>{r.label}</b><small>{r.code}</small></td>
                <td>{r.fields.join(', ').replace(/_/g, ' ') || '—'}{r.comment ? <small>“{r.comment}”</small> : null}</td>
                <td>{fmtDate(r.created_at)}</td>
                <td className="num"><Tag tone={tone[r.status]}>{r.status === 'pending' ? `With the ${r.waiting_for}` : r.status[0].toUpperCase() + r.status.slice(1)}</Tag></td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <div className="hrm-empty">No requests yet. Ask for a change from My profile.</div>}
      </section>
    </div>
  );
}

export function Policies() {
  const toast = useToast();
  const p = useGet('/hr/employees/me/policies');
  if (!p.data) return <NoRecord error={p.error} reload={p.reload} />;
  const ack = p.data.acknowledgement;
  const acknowledge = async () => {
    try { await api.patch(`/hr/employees/me/onboarding/${ack.id}`, { done: true }); toast.success('Thank you. HR can see you have read the policies.'); p.reload(); } catch (err) { toast.error(errText(err)); }
  };
  return (
    <div className="hrm">
      <div className="hrm-head"><div><h1>Policies</h1><p>{p.data.company || 'The company'} policies every employee follows.</p></div></div>
      <section className="hrm-card" aria-label="Policies">
        {p.data.policies.length ? (
          <ul className="hrm-alerts" style={{ padding: '0 16px 8px' }}>
            {p.data.policies.map((x, i) => <li key={`${x.title}${i}`}><span className="ic"><FileText size={16} aria-hidden="true" /></span><span className="t"><b>{x.title}</b><small>{x.version} · {fmtDate(x.date)}</small></span></li>)}
          </ul>
        ) : <div className="hrm-empty">HR has not published any policies yet.</div>}
        {ack && p.data.policies.length > 0 && (
          <div className="hrm-banner info">
            <div className="grow">{ack.done_at ? <><b>Read and acknowledged</b><span>{fmtDate(ack.done_at)}</span></> : <><b>Confirm you have read these policies</b><span>HR keeps the date on your record.</span></>}</div>
            {!ack.done_at && <Button size="sm" icon={Check} onClick={acknowledge}>I have read them</Button>}
          </div>
        )}
      </section>
    </div>
  );
}

const time = (t) => (t ? String(t).slice(0, 5) : '');
export function MyRoster() {
  const s = useGet('/hrm/me/schedule');
  if (!s.data) return <NoRecord error={s.error} reload={s.reload} />;
  const rows = s.data.data;
  return (
    <div className="hrm">
      <div className="hrm-head"><div><h1>My roster</h1><p>Your shifts from {fmtDate(s.data.from)} to {fmtDate(s.data.to)}.</p></div></div>
      <section className="hrm-card" aria-label="Shifts">
        {rows.length ? (
          <div className="hrm-table-wrap"><table className="hrm-table"><tbody>{rows.map((r) => (
            <tr key={r.id}>
              <td><b>{new Date(r.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}</b></td>
              <td>{r.shift ? <><b>{r.shift.name}</b><small>{time(r.shift.start_time)} – {time(r.shift.end_time)}</small></> : '—'}</td>
              <td>{r.notes || ''}</td>
            </tr>
          ))}</tbody></table></div>
        ) : <div className="hrm-empty">No shifts planned for the next four weeks. Your usual office hours apply.</div>}
      </section>
    </div>
  );
}

export function MyLetters() {
  const toast = useToast();
  const list = useGet('/hrm/me/leaves');
  const open = async (id) => {
    try {
      const r = await api.get(`/hrm/me/leaves/${id}/print`, { responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) { toast.error(errText(err, 'The letter could not be opened.')); }
  };
  const rows = (Array.isArray(list.data) ? list.data : []).filter((r) => r.status === 'approved');
  return (
    <div className="hrm">
      <div className="hrm-head"><div><h1>My letters</h1><p>Approved leave letters to print or keep. Employment letters will appear here when HR issues them.</p></div></div>
      <section className="hrm-card" aria-label="Letters">
        {!list.data ? <Loading error={list.error} reload={list.reload} /> : rows.length ? (
          <div className="hrm-table-wrap"><table className="hrm-table"><tbody>{rows.map((r) => (
            <tr key={r.id}>
              <td><b>{r.LeaveType?.name || r.leave_type?.name || 'Leave'} approval</b><small>{fmtDate(r.start_date)} – {fmtDate(r.end_date)}</small></td>
              <td className="num"><Button variant="secondary" size="sm" icon={Printer} onClick={() => open(r.id)}>Open letter</Button></td>
            </tr>
          ))}</tbody></table></div>
        ) : <div className="hrm-empty">No approved leave yet.</div>}
      </section>
      <section className="hrm-card" aria-label="Training">
        <div className="hrm-card-head"><h2>Training certificates</h2><Tag tone="slate">Coming soon</Tag></div>
        <div className="hrm-empty">Training records arrive with the training module.</div>
      </section>
    </div>
  );
}
