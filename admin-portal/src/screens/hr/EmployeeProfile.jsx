import React, { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Pencil, Download, Printer, Mail, Power, Archive, Upload, Lock, Check } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button, Drawer, Field, Input, Select } from '../../ui/kit';
import { useGet, useHrMe, errText, Loading, Info, Tag, fmtDate, ago } from './hrShared';
import { FIELDS, STATUS_TONE, ONBOARDING_LABEL, show, money } from './employeeFields';
import EmployeeEdit from './EmployeeEdit';
import { fileSrc } from '../../ui/FileUpload';

/*
 * One employee (M2 §3, §6, §10; design window "Employee profile"). Tabs follow the spec's field groups.
 * What the viewer may not see arrives already removed by the server; the tab then says "Restricted"
 * instead of showing blanks that look like missing data.
 */

const TABS = [['overview', 'Overview'], ['contact', 'Contact'], ['employment', 'Employment'], ['payroll', 'Payroll'], ['documents', 'Documents'], ['history', 'History']];

export default function EmployeeProfile() {
  const { code } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'overview';
  const { can } = useHrMe();
  const toast = useToast();
  const emp = useGet(`/hr/employees/${code}`);
  const meta = useGet('/hr/employees/meta');
  const [edit, setEdit] = useState(null);
  const [confirm, setConfirm] = useState(null);

  if (!emp.data) return <div className="hrm"><Loading error={emp.error} reload={emp.reload} /></div>;
  const e = emp.data;
  const isHr = can('emp.edit');
  const off = Boolean(e.archived_at);
  const mayEdit = (section) => !off && (isHr || (section === 'payroll' && can('emp.view_payroll')));
  const editBtn = (section) => mayEdit(section) && <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setEdit(section)}>Edit</Button>;

  const act = async (fn, done) => {
    try { const r = await fn(); toast.success(done(r)); emp.reload(); } catch (err) { toast.error(errText(err)); }
    setConfirm(null);
  };
  // Exports are JWT-gated: fetch through the api, then print the page or save the CSV.
  const open = async (format) => {
    try {
      const r = await api.get(`/hr/employees/${e.employee_code}/export`, { params: format ? { format } : {}, responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      if (format === 'csv') {
        const a = document.createElement('a');
        a.href = url; a.download = `${e.employee_code}.csv`; a.click();
      } else window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) { toast.error(errText(err, 'The export could not be made.')); }
  };

  return (
    <div className="hrm">
      <div className="hrm-head">
        <div>
          <h1>{e.full_name} <Tag tone={STATUS_TONE[e.status]}>{e.status}</Tag>{off && <Tag tone="slate">Archived</Tag>}</h1>
          <p>{e.employee_code} · {e.position_title || 'No position'} · {e.department_name || 'No department'}{e.supervisor_name ? ` · reports to ${e.supervisor_name}` : ''}</p>
        </div>
        <div className="hrm-actions">
          <Button variant="secondary" icon={Printer} onClick={() => open()}>Print</Button>
          <Button variant="secondary" icon={Download} onClick={() => open('csv')}>CSV</Button>
          {isHr && !off && <Button variant="secondary" icon={Mail} onClick={() => act(() => api.post(`/hr/employees/${e.employee_code}/send-login`, {}), (r) => `Set-password email sent to ${r.data.email}`)}>{e.login ? 'Resend login' : 'Create login'}</Button>}
          {isHr && !off && (e.next_statuses || []).includes('Inactive') && <Button variant="secondary" icon={Power} onClick={() => setConfirm('deactivate')}>Deactivate</Button>}
          {isHr && !off && e.status === 'Inactive' && <Button variant="secondary" icon={Archive} onClick={() => setConfirm('archive')}>Archive</Button>}
        </div>
      </div>

      {(e.pending_changes || []).map((c) => (
        <div className="hrm-banner" key={c.id}>
          <div className="grow"><b>Waiting for approval: {c.label} ({c.code})</b><span>{c.fields.join(', ').replace(/_/g, ' ')} · waiting for the {c.step_role}</span></div>
          <Link className="hrm-link" to={`/hr/approvals?id=${c.id}`}>View request</Link>
        </div>
      ))}

      <div className="hrm-tabs" role="tablist" aria-label="Employee record">
        {TABS.map(([k, label]) => <button key={k} type="button" aria-pressed={tab === k} onClick={() => setParams(k === 'overview' ? {} : { tab: k })}>{label}{k === 'documents' && e.missing_documents?.length ? <b>{e.missing_documents.length} missing</b> : null}</button>)}
      </div>

      {tab === 'overview' && <Overview e={e} editBtn={editBtn} reload={emp.reload} isHr={isHr} />}
      {tab === 'contact' && <Section e={e} section="contact" title="Contact and emergency" editBtn={editBtn} />}
      {tab === 'employment' && <Employment e={e} editBtn={editBtn} />}
      {tab === 'payroll' && <Payroll e={e} editBtn={editBtn} />}
      {tab === 'documents' && <Documents e={e} meta={meta.data} isHr={isHr} reload={emp.reload} />}
      {tab === 'history' && <History code={e.employee_code} />}

      {edit && <EmployeeEdit emp={e} section={edit} meta={meta.data} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); emp.reload(); }} />}
      {confirm && (
        <Drawer title={confirm === 'deactivate' ? `Deactivate ${e.full_name}?` : `Archive ${e.full_name}?`} onClose={() => setConfirm(null)} width={460}
          footer={<><Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button onClick={() => act(() => api.post(`/hr/employees/${e.employee_code}/${confirm}`, {}), (r) => (confirm === 'deactivate' ? `Sent for approval: ${r.data.change_request.code}` : 'Archived'))}>{confirm === 'deactivate' ? 'Send for approval' : 'Archive record'}</Button></>}>
          <p className="hrm-text">{confirm === 'deactivate'
            ? 'The HR Manager approves it. Once inactive, they drop out of attendance, leave and payroll and their login is switched off. The record and its history stay.'
            : 'The record leaves every list but is kept with its history. Nothing is deleted.'}</p>
        </Drawer>
      )}
    </div>
  );
}

function Restricted({ what }) {
  return <div className="hrm-banner info"><Lock size={16} aria-hidden="true" style={{ marginTop: 2 }} /><div className="grow"><b>Restricted</b><span>Your role does not show {what}.</span></div></div>;
}

function Facts({ e, fields }) {
  return (
    <div className="hrm-facts">
      {fields.filter((f) => f.key in e).map((f) => <Info key={f.key} label={f.label}>{show(f, e[f.key])}</Info>)}
    </div>
  );
}

function Section({ e, section, title, editBtn }) {
  return (
    <section className="hrm-card" aria-label={title}>
      <div className="hrm-card-head"><h2>{title}</h2>{editBtn(section)}</div>
      <Facts e={e} fields={FIELDS[section]} />
    </section>
  );
}

function Overview({ e, editBtn, reload, isHr }) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [vis, setVis] = useState('hr');
  const done = (e.onboarding || []).filter((t) => t.done_at).length;
  const toggle = async (t) => {
    try { await api.patch(`/hr/employees/${e.employee_code}/onboarding/${t.id}`, { done: !t.done_at }); reload(); } catch (err) { toast.error(errText(err)); }
  };
  const addNote = async () => {
    try { await api.post(`/hr/employees/${e.employee_code}/notes`, { body: note, visibility: vis }); setNote(''); reload(); } catch (err) { toast.error(errText(err)); }
  };
  return (
    <div className="hrm-split">
      <div>
        <section className="hrm-card" aria-label="Basic details">
          <div className="hrm-card-head"><h2>Basic details</h2>{editBtn('basic')}</div>
          <Facts e={e} fields={FIELDS.basic} />
          {e.restricted?.sensitive && <Restricted what="identity numbers, religion, family or medical details" />}
        </section>
        {(e.notes || []).length > 0 || isHr || !e.own ? (
          <section className="hrm-card" aria-label="Notes">
            <div className="hrm-card-head"><h2>Notes</h2><small>{(e.notes || []).length}</small></div>
            {(e.notes || []).map((n) => <div className="hrm-pad" key={n.id}><p className="hrm-text">{n.body}</p><small className="hrm-note">{fmtDate(n.created_at || n.createdAt)} · {n.visibility === 'hr' ? 'HR only' : 'HR and managers'}</small></div>)}
            {!e.own && (
              <div className="hrm-pad hrm-form">
                <Field label="Add a note" full><Input value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="Visible to HR and, if you choose, the managers" /></Field>
                {isHr && <Field label="Who sees it"><Select value={vis} onChange={(ev) => setVis(ev.target.value)}><option value="hr">HR only</option><option value="manager">HR and managers</option></Select></Field>}
                <div style={{ alignSelf: 'end' }}><Button size="sm" disabled={!note.trim()} onClick={addNote}>Add note</Button></div>
              </div>
            )}
          </section>
        ) : null}
      </div>
      <div>
        <section className="hrm-card" aria-label="Reporting line">
          <div className="hrm-card-head"><h2>Reporting line</h2></div>
          {(e.reporting_line || []).length ? (
            <ol className="hrm-steps">{e.reporting_line.map((p) => <li key={p.id}><span className="dot ok" /><div><b>{p.full_name}</b><small>{p.role === p.position_title || !p.position_title ? p.role : `${p.role} · ${p.position_title}`}</small></div></li>)}</ol>
          ) : <div className="hrm-empty">Top of the company.</div>}
        </section>
        <section className="hrm-card" aria-label="Onboarding">
          <div className="hrm-card-head"><h2>Onboarding</h2><small>{done} of {(e.onboarding || []).length} done</small></div>
          <div className="hrm-pad"><ul className="hrm-alerts">
            {(e.onboarding || []).map((t) => {
              const mine = isHr || (e.own && t.owner === 'employee');
              return (
                <li key={t.id}>
                  <span className={`ic ${t.done_at ? '' : 'red'}`}>{t.done_at ? <Check size={14} aria-hidden="true" /> : '•'}</span>
                  <span className="t"><b>{ONBOARDING_LABEL[t.task] || t.task}</b><small>{t.done_at ? `Done ${fmtDate(t.done_at)}` : t.due_on ? `Due ${fmtDate(t.due_on)}` : t.owner === 'employee' ? 'The employee does this' : 'Open'}</small></span>
                  {mine && t.owner !== 'auto' && <button type="button" className="hrm-link" onClick={() => toggle(t)}>{t.done_at ? 'Undo' : 'Mark done'}</button>}
                </li>
              );
            })}
          </ul></div>
        </section>
        {e.login && (
          <section className="hrm-card" aria-label="Login">
            <div className="hrm-card-head"><h2>Login</h2><Tag tone={e.login.status === 'active' ? 'green' : 'slate'}>{e.login.status === 'active' ? 'On' : 'Off'}</Tag></div>
            <div className="hrm-facts" style={{ gridTemplateColumns: '1fr' }}><Info label="Email">{e.login.email}</Info></div>
          </section>
        )}
      </div>
    </div>
  );
}

function Employment({ e, editBtn }) {
  return (
    <section className="hrm-card" aria-label="Employment">
      <div className="hrm-card-head"><h2>Employment</h2>{editBtn('employment')}</div>
      <div className="hrm-facts">
        <Info label="Company">{e.company_name}</Info>
        <Info label="Division">{e.division_name}</Info>
        <Info label="Department">{e.department_name}</Info>
        <Info label="Team">{e.team_name}</Info>
        <Info label="Position">{e.position_id ? <Link className="hrm-link" to={`/hr/positions/${e.position_id}`}>{e.position_title}</Link> : null}</Info>
        <Info label="Supervisor">{e.supervisor_name}</Info>
        <Info label="Employee type">{e.employee_type}</Info>
        <Info label="Lifecycle stage">{e.lifecycle_stage}</Info>
        <Info label="Work location">{e.work_location_name}</Info>
        {'salary_grade_name' in e && <Info label="Salary grade">{e.salary_grade_name}</Info>}
        {'cost_centre_name' in e && <Info label="Cost centre">{e.cost_centre_name}</Info>}
        <Info label="Exit date">{e.exit_date ? fmtDate(e.exit_date) : null}</Info>
      </div>
      <Facts e={e} fields={FIELDS.employment} />
    </section>
  );
}

function Payroll({ e, editBtn }) {
  if (e.restricted?.payroll) return <section className="hrm-card" aria-label="Payroll"><div className="hrm-card-head"><h2>Payroll and bank</h2></div><Restricted what="salary, allowances or bank details" /></section>;
  const list = (v) => (Array.isArray(v) ? v : []);
  return (
    <section className="hrm-card" aria-label="Payroll">
      <div className="hrm-card-head"><h2>Payroll and bank</h2>{editBtn('payroll')}</div>
      <Facts e={e} fields={FIELDS.payroll} />
      <div className="hrm-split even hrm-pad">
        <div><span className="hrm-note">Allowances</span>{list(e.allowances).length ? <ul className="hrm-text">{list(e.allowances).map((a, i) => <li key={i}>{a.name}: {money(a.amount)}</li>)}</ul> : <p className="hrm-text">None</p>}</div>
        <div><span className="hrm-note">Deduction rules</span>{list(e.deduction_rules).length ? <ul className="hrm-text">{list(e.deduction_rules).map((a, i) => <li key={i}>{a.name}: {a.amount != null ? money(a.amount) : a.rule}</li>)}</ul> : <p className="hrm-text">None</p>}</div>
      </div>
      <p className="hrm-note hrm-pad">Salary changes go to the HR Manager and the CEO; bank, allowance and deduction changes to Finance.</p>
    </section>
  );
}

function Documents({ e, meta, isHr, reload }) {
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [type, setType] = useState('');
  const [expiry, setExpiry] = useState('');
  const [busy, setBusy] = useState(false);
  const mayUpload = isHr || e.own;
  const today = new Date().toISOString().slice(0, 10);

  const upload = async () => {
    const fd = new FormData();
    fd.append('file', file); fd.append('doc_type', type); if (expiry) fd.append('expiry_date', expiry);
    setBusy(true);
    try { await api.post(`/hr/employees/${e.employee_code}/documents`, fd); toast.success(`${type} uploaded`); setFile(null); setType(''); setExpiry(''); reload(); } catch (err) { toast.error(errText(err)); }
    setBusy(false);
  };
  const [rejecting, setRejecting] = useState(null);
  const [why, setWhy] = useState('');
  const verify = async (d, status, notes) => {
    try { await api.patch(`/hr/employees/${e.employee_code}/documents/${d.id}`, { status, notes }); setRejecting(null); setWhy(''); reload(); } catch (err) { toast.error(errText(err)); }
  };
  const tone = { verified: 'green', rejected: 'red', pending: 'amber' };

  return (
    <div className="hrm-split wide-left">
      <section className="hrm-card" aria-label="Documents">
        <div className="hrm-card-head"><h2>Documents</h2><small>{(e.documents || []).length}</small></div>
        {(e.documents || []).length ? (
          <div className="hrm-table-wrap"><table className="hrm-table">
            <thead><tr><th>Document</th><th>Uploaded</th><th>Expires</th><th aria-label="Status" /><th aria-label="Actions" /></tr></thead>
            <tbody>{e.documents.map((d) => (
              <tr key={d.id}>
                <td><a className="hrm-link" href={fileSrc(d.file_url)} target="_blank" rel="noreferrer">{d.doc_type}</a><small>{d.file_name}</small></td>
                <td>{fmtDate(d.uploaded_at)}</td>
                <td>{d.expiry_date ? <span className={d.expiry_date < today ? 'hrm-warn' : ''}>{fmtDate(d.expiry_date)}{d.expiry_date < today ? ' (expired)' : ''}</span> : '—'}</td>
                <td><Tag tone={tone[d.verification_status]}>{d.verification_status === 'pending' ? 'To check' : d.verification_status === 'verified' ? 'Verified' : 'Rejected'}</Tag>{d.verification_status === 'rejected' && d.notes ? <small>{d.notes}</small> : null}</td>
                <td className="num">{isHr && d.verification_status === 'pending' && <><button type="button" className="hrm-link" onClick={() => verify(d, 'verified')}>Verify</button>{' '}<button type="button" className="hrm-link danger" onClick={() => { setRejecting(d.id); setWhy(''); }}>Reject</button></>}
                  {rejecting === d.id && (
                    <div className="hrm-decide" style={{ marginTop: 6 }}>
                      <input className="input" aria-label="Why is it rejected?" placeholder="Why is it rejected?" value={why} onChange={(ev) => setWhy(ev.target.value)} />
                      <Button size="sm" disabled={!why.trim()} onClick={() => verify(d, 'rejected', why)}>Reject</Button>
                    </div>
                  )}</td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <div className="hrm-empty">No documents yet.</div>}
      </section>
      <div>
        <section className="hrm-card" aria-label="Missing documents">
          <div className="hrm-card-head"><h2>Still needed</h2><small>{(e.missing_documents || []).length}</small></div>
          {(e.missing_documents || []).length ? <div className="hrm-chips hrm-pad">{e.missing_documents.map((d) => <span key={d}>{d}</span>)}</div>
            : <div className="hrm-empty">Everything the {e.employee_type ? e.employee_type.toLowerCase() : 'employee'} type requires is on file.</div>}
        </section>
        {mayUpload && !e.archived_at && (
          <section className="hrm-card" aria-label="Upload a document">
            <div className="hrm-card-head"><h2>Upload a document</h2></div>
            <div className="hrm-form hrm-pad">
              <Field label="Type" required full><Select value={type} onChange={(ev) => setType(ev.target.value)}><option value="">Choose…</option>{(meta?.documentTypes || []).map((t) => <option key={t}>{t}</option>)}</Select></Field>
              <Field label="Expires"><Input type="date" value={expiry} onChange={(ev) => setExpiry(ev.target.value)} /></Field>
              <Field label="File" required><Input type="file" onChange={(ev) => setFile(ev.target.files[0] || null)} /></Field>
              <div className="full"><Button icon={Upload} disabled={!file || !type || busy} onClick={upload}>{busy ? 'Uploading…' : 'Upload'}</Button></div>
            </div>
            <p className="hrm-note hrm-pad">Files stay private: only HR and the people allowed to see this record can open them.</p>
          </section>
        )}
      </div>
    </div>
  );
}

const FIELD_NAME = (f) => (f || '').replace(/_id$/, '').replace(/_/g, ' ');
function History({ code }) {
  const h = useGet(`/hr/employees/${code}/history`);
  if (!h.data) return <Loading error={h.error} reload={h.reload} />;
  const rows = h.data.data;
  return (
    <section className="hrm-card" aria-label="History">
      <div className="hrm-card-head"><h2>History</h2><small>{rows.length}</small></div>
      {rows.length ? (
        <ol className="hrm-steps hrm-pad">
          {rows.map((r, i) => (
            <li key={i}>
              <span className={`dot ${r.type === 'change' ? 'ok' : 'now'}`} />
              <div>
                {r.type === 'change' && <b>{r.field === 'document' ? r.new_value : r.field === 'exported' ? `Exported as ${r.new_value}` : <>{FIELD_NAME(r.field)}: {r.old_value != null && r.old_value !== '' ? <><s>{r.old_value}</s> → </> : ''}{r.new_value ?? '—'}</>}</b>}
                {r.type === 'leave' && <b>Leave {fmtDate(r.start_date)} – {fmtDate(r.end_date)} ({r.days} {r.days === 1 ? 'day' : 'days'}, {r.status})</b>}
                {r.type === 'attendance' && <b>Attendance {r.month}: {r.present || 0} present, {r.late || 0} late, {r.absent || 0} absent</b>}
                <small>{fmtDate(r.at)}{r.by ? ` · ${r.by}` : ''}{r.change_request_id ? ' · approved request' : ''} · {ago(r.at)} ago</small>
              </div>
            </li>
          ))}
        </ol>
      ) : <div className="hrm-empty">Nothing recorded yet.</div>}
    </section>
  );
}
