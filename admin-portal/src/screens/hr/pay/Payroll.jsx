import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Calculator, Send, Banknote, RotateCcw, FileText } from 'lucide-react';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { Button, Drawer, Field, Input, Select } from '../../../ui/kit';
import { useGet, errText, Loading, Info, Tag, fmtDate } from '../hrShared';

/*
 * Payroll (plan Task 29), ported from Hadi Real Estate. HR prepares a month once it has closed, checks each
 * payslip, and sends it to the CEO in the Approvals inbox. Accounts then marks the approved month paid, and
 * everyone finds their payslip under My HR.
 */

export const tk = (n) => `Tk ${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export const RUN_TONE = { draft: 'slate', rejected: 'red', pending_approval: 'amber', approved: 'blue', paid: 'green' };
export const RUN_LABEL = { draft: 'Draft', rejected: 'Sent back', pending_approval: 'Waiting for the CEO', approved: 'Approved, to pay', paid: 'Paid' };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function Payroll() {
  const { id } = useParams();
  return id ? <PayRun id={id} /> : <Runs />;
}

function Runs() {
  const nav = useNavigate();
  const meta = useGet('/hr/payroll/meta');
  const list = useGet('/hr/payroll/runs');
  const [preparing, setPreparing] = useState(false);
  if (!meta.data) return <div className="hrm"><Loading error={meta.error} reload={meta.reload} /></div>;
  const rows = list.data?.data || [];
  return (
    <div className="hrm">
      <div className="hrm-head">
        <div><h1>Payroll</h1><p>Prepare a month once it has closed. The CEO approves it, then Accounts pays it.</p></div>
        <div className="hrm-actions">
          <Link className="btn btn-ghost" to="/hr/payroll-adjustments">Bonuses and deductions</Link>
          {meta.data.canManage && <Button icon={Calculator} onClick={() => setPreparing(true)}>Prepare a month</Button>}
        </div>
      </div>
      <section className="hrm-card" aria-label="Payroll months">
        {!list.data ? <Loading error={list.error} reload={list.reload} /> : rows.length ? (
          <div className="hrm-table-wrap">
            <table className="hrm-table">
              <thead><tr><th>Month</th><th className="num">People</th><th className="num">Gross</th><th className="num">Deductions</th><th className="num">Net pay</th><th>Prepared</th><th aria-label="Status" /></tr></thead>
              <tbody>{rows.map((r) => {
                const go = () => nav(`/hr/payroll/${r.id}`);
                return (
                  <tr key={r.id} className="click" tabIndex={0} onClick={go} onKeyDown={(e) => { if (e.key === 'Enter') go(); }}>
                    <td><b>{r.label}</b>{r.request_code && <small>{r.request_code}</small>}</td>
                    <td className="num">{r.employees}</td>
                    <td className="num">{tk(r.gross_total)}</td>
                    <td className="num">{tk(r.deduction_total)}</td>
                    <td className="num"><b>{tk(r.net_total)}</b></td>
                    <td>{fmtDate(r.prepared_at)}<small>{r.prepared_by_name || ''}</small></td>
                    <td className="num"><Tag tone={RUN_TONE[r.status]}>{RUN_LABEL[r.status] || r.status}</Tag></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        ) : <p className="hrm-empty">No payroll yet. {meta.data.canManage ? 'Prepare last month to start.' : 'HR prepares each month once it has closed.'}</p>}
      </section>
      {preparing && <Prepare onClose={() => setPreparing(false)} onDone={(run) => { setPreparing(false); nav(`/hr/payroll/${run.id}`); }} />}
    </div>
  );
}

function Prepare({ onClose, onDone }) {
  const toast = useToast();
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const [f, setF] = useState({ month: last.getMonth() + 1, year: last.getFullYear() });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const go = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await api.post('/hr/payroll/runs', f);
      const left = r.data.skipped?.length ? `. Left out (no basic salary on file): ${r.data.skipped.map((x) => x.full_name).join(', ')}` : '';
      toast.success(`${r.data.run.label} prepared for ${r.data.run.employees} people${left}`);
      onDone(r.data.run);
    } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };
  return (
    <Drawer title="Prepare a month" onClose={onClose} width={420}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={Calculator} onClick={go} disabled={busy}>{busy ? 'Preparing…' : 'Prepare'}</Button></>}>
      <div className="hrm-form">
        <Field label="Month"><Select value={f.month} onChange={(e) => setF({ ...f, month: Number(e.target.value) })}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</Select></Field>
        <Field label="Year"><Input type="number" value={f.year} onChange={(e) => setF({ ...f, year: Number(e.target.value) })} /></Field>
      </div>
      <p className="hrm-note" style={{ marginTop: 10 }}>Each person's basic salary and allowances, for the days they were employed that month, plus approved bonuses, less unpaid leave, recurring deductions and approved deductions. Preparing the month again replaces the draft.</p>
      {err && <div className="hrm-error" role="alert" style={{ marginTop: 12 }}>{err}</div>}
    </Drawer>
  );
}

function PayRun({ id }) {
  const toast = useToast();
  const meta = useGet('/hr/payroll/meta');
  const run = useGet(`/hr/payroll/runs/${id}`);
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!run.data || !meta.data) return <div className="hrm"><Loading error={run.error || meta.error} reload={run.reload} /></div>;
  const r = run.data;
  const m = meta.data;
  const act = async (path, body, done) => {
    setBusy(true);
    try { await api.post(`/hr/payroll/runs/${id}/${path}`, body || {}); toast.success(done); run.reload(); }
    catch (e) { toast.error(errText(e)); } finally { setBusy(false); }
  };
  const prepareAgain = async () => {
    setBusy(true);
    try { await api.post('/hr/payroll/runs', { month: r.month, year: r.year }); toast.success('Prepared again'); run.reload(); }
    catch (e) { toast.error(errText(e)); } finally { setBusy(false); }
  };
  const editable = ['draft', 'rejected'].includes(r.status);
  return (
    <div className="hrm">
      <div className="hrm-head">
        <div><h1>{r.label} payroll <Tag tone={RUN_TONE[r.status]}>{RUN_LABEL[r.status] || r.status}</Tag></h1><p>{r.employees} {r.employees === 1 ? 'person' : 'people'}{r.request_code ? ` · ${r.request_code}` : ''}</p></div>
        <div className="hrm-actions">
          <Link className="btn btn-ghost" to="/hr/payroll">All months</Link>
          {m.canManage && editable && <Button variant="ghost" icon={Calculator} onClick={prepareAgain} disabled={busy}>Prepare again</Button>}
          {m.canManage && editable && <Button icon={Send} onClick={() => act('submit', {}, 'Sent to the CEO for approval')} disabled={busy || !r.employees}>Send for approval</Button>}
          {m.canReopen && r.status === 'approved' && <Button variant="ghost" icon={RotateCcw} onClick={() => { if (window.confirm(`Send ${r.label} back to draft?`)) act('reopen', {}, 'Reopened'); }} disabled={busy}>Reopen</Button>}
          {m.canPay && r.status === 'approved' && <Button icon={Banknote} onClick={() => setPaying(true)}>Mark paid</Button>}
        </div>
      </div>
      {r.status === 'rejected' && <div className="hrm-error" role="status">The CEO sent this month back. Fix what is needed, prepare it again and send it for approval.</div>}
      <section className="hrm-card" aria-label="Totals" style={{ paddingTop: 14 }}>
        <div className="hrm-facts">
          <Info label="Gross">{tk(r.gross_total)}</Info>
          <Info label="Deductions">{tk(r.deduction_total)}</Info>
          <Info label="Net pay">{tk(r.net_total)}</Info>
          <Info label="Prepared">{fmtDate(r.prepared_at)}{r.prepared_by_name ? ` by ${r.prepared_by_name}` : ''}</Info>
          {r.status === 'paid' && <Info label="Paid">{fmtDate(r.paid_at)}{r.paid_by_name ? ` by ${r.paid_by_name}` : ''}{r.payment_reference ? ` · ${r.payment_reference}` : ''}</Info>}
        </div>
      </section>
      <section className="hrm-card" aria-label="Payslips">
        <div className="hrm-card-head"><h2>Payslips</h2></div>
        {r.payslips.length ? (
          <div className="hrm-table-wrap">
            <table className="hrm-table">
              <thead><tr><th>Employee</th><th className="num">Days</th><th className="num">Basic</th><th className="num">Allowances</th><th className="num">Bonuses</th><th className="num">Deductions</th><th className="num">Net</th><th>Paid to</th><th aria-label="Payslip" /></tr></thead>
              <tbody>{r.payslips.map((p) => (
                <tr key={p.id}>
                  <td><b>{p.full_name}</b><small>{p.employee_code}{p.department_name ? ` · ${p.department_name}` : ''}</small></td>
                  <td className="num">{p.active_days}/{p.days_in_month}{Number(p.unpaid_days) > 0 && <small>{Number(p.unpaid_days)} unpaid</small>}</td>
                  <td className="num">{tk(p.basic)}</td>
                  <td className="num">{tk(p.allowances_total)}</td>
                  <td className="num">{tk(p.bonus_total)}</td>
                  <td className="num">{tk(p.deduction_total)}</td>
                  <td className="num"><b>{tk(p.net)}</b></td>
                  <td>{p.paid_to || <Tag tone="amber">No account</Tag>}</td>
                  <td className="num"><Link className="hrm-link" to={`/hr/payslips/${p.id}`}><FileText size={14} /> Payslip</Link></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="hrm-empty">Nobody is paid in this month. Check that people have a basic salary and a joining date.</p>}
      </section>
      {paying && <Pay run={r} onClose={() => setPaying(false)} onDone={() => { setPaying(false); run.reload(); }} />}
    </div>
  );
}

function Pay({ run, onClose, onDone }) {
  const toast = useToast();
  const [f, setF] = useState({ payment_method: 'bank_transfer', payment_reference: '' });
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try { await api.post(`/hr/payroll/runs/${run.id}/pay`, f); toast.success(`${run.label} marked paid`); onDone(); }
    catch (e) { toast.error(errText(e)); } finally { setBusy(false); }
  };
  return (
    <Drawer title={`Pay ${run.label}`} onClose={onClose} width={420}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={Banknote} onClick={go} disabled={busy}>{busy ? 'Saving…' : `Mark ${tk(run.net_total)} paid`}</Button></>}>
      <div className="hrm-form">
        <Field label="Paid by" full><Select value={f.payment_method} onChange={(e) => setF({ ...f, payment_method: e.target.value })}>
          <option value="bank_transfer">Bank transfer</option><option value="mobile_banking">Mobile banking</option><option value="cheque">Cheque</option><option value="cash">Cash</option>
        </Select></Field>
        <Field label="Reference" full><Input value={f.payment_reference} onChange={(e) => setF({ ...f, payment_reference: e.target.value })} placeholder="Bank batch or voucher number" /></Field>
      </div>
      <p className="hrm-note" style={{ marginTop: 10 }}>Everyone in this month gets their payslip in My HR, and loan repayments come off their loan balance.</p>
    </Drawer>
  );
}
