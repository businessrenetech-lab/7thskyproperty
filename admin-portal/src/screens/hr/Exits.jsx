import React, { useState } from 'react';
import { LogOut, Calculator, Send, Banknote } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button, Drawer, Field, Input, Select, Textarea } from '../../ui/kit';
import { useGet, errText, Loading, Tag, Info, fmtDate } from './hrShared';
import { tk } from './pay/Payroll';

/*
 * Exits (plan Task 29), ported from Hadi Real Estate's offboarding: leaving is a record, never a delete. HR records
 * the exit, the status change is approved as usual, the people who reported to the leaver move to the person
 * taking over, the login is switched off, and the final settlement goes to Accounts.
 */

const TONE = { open: 'amber', rejected: 'red', completed: 'green', cancelled: 'slate' };
const LABEL = { open: 'Waiting for approval', rejected: 'Not approved', completed: 'Left', cancelled: 'Cancelled' };
const SETTLE = { pending: 'Not worked out', calculated: 'Worked out', sent_to_accounts: 'With Accounts', paid: 'Paid' };

export default function Exits() {
  const meta = useGet('/hr/exits/meta');
  const list = useGet('/hr/exits');
  const [starting, setStarting] = useState(false);
  const [open, setOpen] = useState(null);
  const me = useGet('/hr/access/me');
  if (!meta.data) return <div className="hrm"><Loading error={meta.error} reload={meta.reload} /></div>;
  const rows = list.data?.data || [];
  const canStart = Boolean(me.data?.can?.['off.manage']);
  return (
    <div className="hrm">
      <div className="hrm-head">
        <div><h1>Exits</h1><p>Resignations, terminations and retirements. Nothing is deleted: leavers keep their records.</p></div>
        {canStart && <Button icon={LogOut} onClick={() => setStarting(true)}>Record an exit</Button>}
      </div>
      <section className="hrm-card" aria-label="Exits">
        {!list.data ? <Loading error={list.error} reload={list.reload} /> : rows.length ? (
          <div className="hrm-table-wrap">
            <table className="hrm-table">
              <thead><tr><th>Employee</th><th>Type</th><th>Last day</th><th>Takes over</th><th>Checklist</th><th>Settlement</th><th aria-label="Status" /></tr></thead>
              <tbody>{rows.map((x) => (
                <tr key={x.id} className="click" tabIndex={0} onClick={() => setOpen(x.id)} onKeyDown={(e) => { if (e.key === 'Enter') setOpen(x.id); }}>
                  <td><b>{x.full_name}</b><small>{x.employee_code}{x.request_code ? ` · ${x.request_code}` : ''}</small></td>
                  <td>{x.exit_type}</td>
                  <td>{fmtDate(x.last_working_day)}</td>
                  <td>{x.handover ? x.handover.full_name : '—'}</td>
                  <td>{x.checklist.filter((c) => c.done).length} of {x.checklist.length}</td>
                  <td>{SETTLE[x.settlement_status] || x.settlement_status}</td>
                  <td className="num"><Tag tone={TONE[x.status]}>{LABEL[x.status] || x.status}</Tag></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="hrm-empty">Nobody is leaving.</p>}
      </section>
      {starting && <Start meta={meta.data} onClose={() => setStarting(false)} onDone={() => { setStarting(false); list.reload(); }} />}
      {open && <Detail id={open} meta={meta.data} canManage={canStart} onClose={() => { setOpen(null); list.reload(); }} />}
    </div>
  );
}

function Start({ meta, onClose, onDone }) {
  const toast = useToast();
  const [f, setF] = useState({ employee_code: '', exit_type: 'Resigned', reason: '', notice_date: '', last_working_day: '', handover_employee_code: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const save = async () => {
    setBusy(true); setErr(null);
    try {
      await api.post('/hr/exits', { ...f, notice_date: f.notice_date || null, handover_employee_code: f.handover_employee_code || null });
      toast.success(f.exit_type === 'Terminated' ? 'Sent to the HR Manager and the CEO for approval' : 'Sent to the HR Manager for approval');
      onDone();
    } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };
  return (
    <Drawer title="Record an exit" onClose={onClose} width={520}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={LogOut} onClick={save} disabled={busy}>{busy ? 'Sending…' : 'Send for approval'}</Button></>}>
      <div className="hrm-form">
        <Field label="Employee" required full><Select value={f.employee_code} onChange={set('employee_code')}><option value="">Choose…</option>{meta.people.map((p) => <option key={p.employee_code} value={p.employee_code}>{p.full_name} ({p.employee_code})</option>)}</Select></Field>
        <Field label="Leaving because they" required><Select value={f.exit_type} onChange={set('exit_type')}>{meta.exitTypes.map((t) => <option key={t} value={t}>{{ Resigned: 'Resigned', Terminated: 'Were terminated', Retired: 'Retired' }[t] || t}</option>)}</Select></Field>
        <Field label="Last working day" required><Input type="date" value={f.last_working_day} onChange={set('last_working_day')} /></Field>
        <Field label="Notice given on"><Input type="date" value={f.notice_date} onChange={set('notice_date')} /></Field>
        <Field label="Who takes over"><Select value={f.handover_employee_code} onChange={set('handover_employee_code')}><option value="">Nobody</option>{meta.people.filter((p) => p.employee_code !== f.employee_code).map((p) => <option key={p.employee_code} value={p.employee_code}>{p.full_name}</option>)}</Select></Field>
        <Field label="Reason for leaving" required full><Textarea rows={3} value={f.reason} onChange={set('reason')} /></Field>
      </div>
      <p className="hrm-note" style={{ marginTop: 10 }}>When it is approved the login is switched off and anyone who reported to them moves to the person taking over. Their records stay.</p>
      {err && <div className="hrm-error" role="alert" style={{ marginTop: 12 }}>{err}</div>}
    </Drawer>
  );
}

function Detail({ id, meta, canManage, onClose }) {
  const toast = useToast();
  const x = useGet(`/hr/exits/${id}`);
  const me = useGet('/hr/access/me');
  const [busy, setBusy] = useState(false);
  if (!x.data) return <Drawer title="Exit" onClose={onClose} width={560}><Loading error={x.error} reload={x.reload} /></Drawer>;
  const e = x.data;
  const can = me.data?.can || {};
  const post = async (path, body, done) => {
    setBusy(true);
    try { await api.post(`/hr/exits/${id}/${path}`, body || {}); if (done) toast.success(done); x.reload(); }
    catch (err) { toast.error(errText(err)); } finally { setBusy(false); }
  };
  const closed = ['cancelled', 'rejected'].includes(e.status);
  const s = e.settlement;
  return (
    <Drawer title={`${e.full_name} is leaving`} onClose={onClose} width={560}
      footer={<>{canManage && !closed && e.status !== 'completed' && <Button variant="ghost" onClick={() => post('cancel', {}, 'Exit cancelled')} disabled={busy}>Cancel exit</Button>}<Button variant="ghost" onClick={onClose}>Close</Button></>}>
      <div className="hrm-facts">
        <Info label="Status"><Tag tone={TONE[e.status]}>{LABEL[e.status]}</Tag></Info>
        <Info label="Type">{e.exit_type}</Info>
        <Info label="Last working day">{fmtDate(e.last_working_day)}</Info>
        <Info label="Notice given">{fmtDate(e.notice_date)}</Info>
        <Info label="Takes over">{e.handover ? e.handover.full_name : '—'}</Info>
        <Info label="Request">{e.request_code || '—'}</Info>
      </div>
      <p className="hrm-text" style={{ margin: '10px 0' }}>{e.reason}</p>
      <h3 className="hrm-subhead">Checklist</h3>
      <div className="hrm-checklist">
        {e.checklist.map((c) => (
          <label key={c.item} className="hrm-check"><input type="checkbox" checked={c.done} disabled={!canManage || closed || busy} onChange={(ev) => post('checklist', { item: c.item, done: ev.target.checked })} /> {c.item}</label>
        ))}
      </div>
      {meta.seesPay && (
        <>
          <h3 className="hrm-subhead">Final settlement <Tag tone={e.settlement_status === 'paid' ? 'green' : 'slate'}>{SETTLE[e.settlement_status]}</Tag></h3>
          {s ? (
            <div className="hrm-facts">
              <Info label={`Pay to ${fmtDate(e.last_working_day)}`}>{tk(s.payslip.net)}</Info>
              <Info label="Loan still owed">{tk(s.loan_outstanding)}</Info>
              <Info label={s.total < 0 ? 'They owe' : 'To pay them'}>{tk(Math.abs(s.total))}</Info>
            </div>
          ) : <p className="hrm-note">The last month’s pay up to the last working day, less what is still owed on a loan.</p>}
          <div className="hrm-actions" style={{ marginTop: 10 }}>
            {can['pay.manage'] && !closed && ['pending', 'calculated'].includes(e.settlement_status) && <Button variant="secondary" icon={Calculator} onClick={() => post('settlement', {}, 'Settlement worked out')} disabled={busy}>{s ? 'Work it out again' : 'Work it out'}</Button>}
            {can['pay.manage'] && e.settlement_status === 'calculated' && <Button icon={Send} onClick={() => post('settlement/send', {}, 'Sent to Accounts')} disabled={busy || e.status !== 'completed'} title={e.status !== 'completed' ? 'Once the exit is approved' : undefined}>Send to Accounts</Button>}
            {can['pay.pay'] && e.settlement_status === 'sent_to_accounts' && <Button icon={Banknote} onClick={() => post('settlement/paid', {}, 'Settlement paid')} disabled={busy}>Mark paid</Button>}
          </div>
          {e.settlement_status === 'calculated' && e.status !== 'completed' && <p className="hrm-note">It goes to Accounts once the exit is approved.</p>}
        </>
      )}
    </Drawer>
  );
}
