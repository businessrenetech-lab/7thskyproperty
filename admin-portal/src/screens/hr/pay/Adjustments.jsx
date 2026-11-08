import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Check, X, Trash2 } from 'lucide-react';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { Button, Drawer, Field, Input, Select, Textarea } from '../../../ui/kit';
import { useGet, errText, Loading, Tag, fmtDate } from '../hrShared';
import { tk } from './Payroll';

/*
 * One-off bonuses and deductions (Hadi's PayrollBonus / PayrollDeduction). Someone in HR adds one for a month,
 * someone else approves it, and the month's payroll picks it up when it is prepared.
 */

const TONE = { pending: 'amber', approved: 'blue', applied: 'green', rejected: 'red' };
const LABEL = { pending: 'Waiting', approved: 'Approved', applied: 'Paid', rejected: 'Rejected' };
const nice = (t) => String(t || '').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Adjustments() {
  const toast = useToast();
  const meta = useGet('/hr/payroll/meta');
  const [status, setStatus] = useState('pending,approved');
  const list = useGet('/hr/payroll/adjustments', { status: status || undefined });
  const [adding, setAdding] = useState(false);
  if (!meta.data) return <div className="hrm"><Loading error={meta.error} reload={meta.reload} /></div>;
  const m = meta.data;
  const rows = list.data?.data || [];
  const decide = async (a, decision) => {
    try { await api.post(`/hr/payroll/adjustments/${a.id}/decision`, { decision }); toast.success(decision === 'approve' ? 'Approved' : 'Rejected'); list.reload(); }
    catch (e) { toast.error(errText(e)); }
  };
  const remove = async (a) => {
    try { await api.delete(`/hr/payroll/adjustments/${a.id}`); toast.success('Removed'); list.reload(); } catch (e) { toast.error(errText(e)); }
  };
  return (
    <div className="hrm">
      <div className="hrm-head">
        <div><h1>Bonuses and deductions</h1><p>One-off amounts for a month. Someone else in HR approves each one before the month is prepared.</p></div>
        <div className="hrm-actions">
          <Link className="btn btn-ghost" to="/hr/payroll">Payroll</Link>
          {m.canManage && <Button icon={Plus} onClick={() => setAdding(true)}>Add</Button>}
        </div>
      </div>
      <div className="hrm-tabs" role="group" aria-label="Show">
        {[['pending,approved', 'Open'], ['applied', 'Paid'], ['rejected', 'Rejected'], ['', 'All']].map(([k, l]) => <button key={l} type="button" aria-pressed={status === k} onClick={() => setStatus(k)}>{l}</button>)}
      </div>
      <section className="hrm-card" aria-label="Bonuses and deductions">
        {!list.data ? <Loading error={list.error} reload={list.reload} /> : rows.length ? (
          <div className="hrm-table-wrap">
            <table className="hrm-table">
              <thead><tr><th>Employee</th><th>Type</th><th>Month</th><th className="num">Amount</th><th>Added</th><th aria-label="Status" /><th aria-label="Actions" /></tr></thead>
              <tbody>{rows.map((a) => (
                <tr key={a.id}>
                  <td><b>{a.full_name}</b><small>{a.employee_code}</small></td>
                  <td>{a.direction === 'bonus' ? 'Bonus' : 'Deduction'}: {nice(a.type)}<small>{a.reason}</small></td>
                  <td>{MONTHS[a.month - 1]} {a.year}</td>
                  <td className="num">{a.direction === 'bonus' ? '+' : '−'}{tk(a.amount)}</td>
                  <td>{a.created_by_name || '—'}<small>{fmtDate(a.created_at)}</small></td>
                  <td><Tag tone={TONE[a.status]}>{LABEL[a.status] || a.status}</Tag>{a.decided_by_name && <small>{a.decided_by_name}</small>}</td>
                  <td className="num" style={{ whiteSpace: 'nowrap' }}>
                    {m.canManage && a.status === 'pending' && !a.mine && <>
                      <button type="button" className="hrm-link" onClick={() => decide(a, 'approve')}><Check size={14} /> Approve</button>
                      <button type="button" className="hrm-link danger" style={{ marginLeft: 12 }} onClick={() => decide(a, 'reject')}><X size={14} /> Reject</button>
                    </>}
                    {m.canManage && a.status === 'pending' && a.mine && <button type="button" className="hrm-link danger" onClick={() => remove(a)} aria-label={`Remove ${nice(a.type)} for ${a.full_name}`}><Trash2 size={14} /> Remove</button>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="hrm-empty">Nothing here.</p>}
      </section>
      {adding && <Add meta={m} onClose={() => setAdding(false)} onDone={() => { setAdding(false); list.reload(); }} />}
    </div>
  );
}

function Add({ meta, onClose, onDone }) {
  const toast = useToast();
  const last = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [f, setF] = useState({ employee_code: '', direction: 'bonus', type: 'performance_bonus', amount: '', month: last.getMonth() + 1, year: last.getFullYear(), reason: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const types = f.direction === 'bonus' ? meta.bonusTypes : meta.deductionTypes;
  const save = async () => {
    setBusy(true); setErr(null);
    try { await api.post('/hr/payroll/adjustments', { ...f, amount: Number(f.amount), month: Number(f.month), year: Number(f.year) }); toast.success('Added. Someone else in HR approves it.'); onDone(); }
    catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };
  return (
    <Drawer title="Add a bonus or deduction" onClose={onClose} width={480}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? 'Adding…' : 'Add'}</Button></>}>
      <div className="hrm-form">
        <Field label="Employee" required full><Select value={f.employee_code} onChange={set('employee_code')}><option value="">Choose…</option>{meta.employees.map((e) => <option key={e.employee_code} value={e.employee_code}>{e.full_name} ({e.employee_code})</option>)}</Select></Field>
        <Field label="Kind"><Select value={f.direction} onChange={(e) => setF({ ...f, direction: e.target.value, type: (e.target.value === 'bonus' ? meta.bonusTypes : meta.deductionTypes)[0] })}><option value="bonus">Bonus</option><option value="deduction">Deduction</option></Select></Field>
        <Field label="Type"><Select value={f.type} onChange={set('type')}>{types.map((t) => <option key={t} value={t}>{nice(t)}</option>)}</Select></Field>
        <Field label="Amount (Tk)" required><Input type="number" min="1" value={f.amount} onChange={set('amount')} /></Field>
        <Field label="Month"><Select value={f.month} onChange={set('month')}>{MONTHS.map((mo, i) => <option key={mo} value={i + 1}>{mo}</option>)}</Select></Field>
        <Field label="Year"><Input type="number" value={f.year} onChange={set('year')} /></Field>
        <Field label="Reason" required full><Textarea rows={2} value={f.reason} onChange={set('reason')} /></Field>
      </div>
      <p className="hrm-note" style={{ marginTop: 10 }}>A loan repayment also comes off the employee's loan balance when the month is paid.</p>
      {err && <div className="hrm-error" role="alert" style={{ marginTop: 12 }}>{err}</div>}
    </Drawer>
  );
}
