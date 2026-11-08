import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { Button } from '../../../ui/kit';
import { useGet, Loading, fmtDate } from '../hrShared';
import { tk } from './Payroll';

/*
 * A payslip (Hadi's PayrollView / MyPayslips). Payroll staff open any; an employee opens their own once the month
 * is paid. The page prints cleanly.
 */

export function Payslip() {
  const { id } = useParams();
  const p = useGet(`/hr/payroll/payslips/${id}`);
  if (!p.data) return <div className="hrm"><Loading error={p.error} reload={p.reload} /></div>;
  const s = p.data;
  const earnings = s.lines.filter((l) => l.kind === 'earning');
  const deductions = s.lines.filter((l) => l.kind === 'deduction');
  const info = s.lines.filter((l) => l.kind === 'info');
  return (
    <div className="hrm">
      <div className="hrm-head hrm-noprint">
        <div><h1>Payslip</h1><p>{s.month_label}</p></div>
        <div className="hrm-actions"><Button variant="ghost" icon={Printer} onClick={() => window.print()}>Print</Button></div>
      </div>
      <section className="hrm-card hrm-payslip" aria-label={`Payslip for ${s.month_label}`} style={{ paddingTop: 16 }}>
        <div className="hrm-pad">
          <div className="hrm-payslip-head">
            <div><b>Seventh Sky Private Ltd</b><small>Payslip for {s.month_label}</small></div>
            <div style={{ textAlign: 'right' }}><b>{s.full_name}</b><small>{s.employee_code}{s.department_name ? ` · ${s.department_name}` : ''}</small></div>
          </div>
          <p className="hrm-note">{s.active_days} of {s.days_in_month} days employed{Number(s.unpaid_days) > 0 ? ` · ${Number(s.unpaid_days)} unpaid` : ''}{s.run_status === 'paid' ? ` · paid ${fmtDate(s.paid_at)}` : ' · not paid yet'}</p>
          <div className="hrm-split even">
            <table className="hrm-table"><thead><tr><th>Earnings</th><th className="num">Tk</th></tr></thead>
              <tbody>{earnings.map((l, i) => <tr key={i}><td>{l.label}</td><td className="num">{tk(l.amount).replace('Tk ', '')}</td></tr>)}</tbody>
              <tfoot><tr><td><b>Gross</b></td><td className="num"><b>{tk(s.gross).replace('Tk ', '')}</b></td></tr></tfoot>
            </table>
            <table className="hrm-table"><thead><tr><th>Deductions</th><th className="num">Tk</th></tr></thead>
              <tbody>{deductions.length ? deductions.map((l, i) => <tr key={i}><td>{l.label}{l.note && <small>{l.note}</small>}</td><td className="num">{tk(l.amount).replace('Tk ', '')}</td></tr>) : <tr><td colSpan={2}>None</td></tr>}</tbody>
              <tfoot><tr><td><b>Total deductions</b></td><td className="num"><b>{tk(s.deduction_total).replace('Tk ', '')}</b></td></tr></tfoot>
            </table>
          </div>
          <div className="hrm-payslip-net"><span>Net pay</span><b>{tk(s.net)}</b></div>
          {info.map((l, i) => <p key={i} className="hrm-note">{l.label}: {l.value}</p>)}
        </div>
      </section>
    </div>
  );
}

export function MyPayslips() {
  const list = useGet('/hr/payroll/mine');
  const rows = list.data?.data || [];
  return (
    <div className="hrm">
      <div className="hrm-head"><div><h1>My payslips</h1><p>Each month's payslip appears here once Accounts has paid it.</p></div></div>
      <section className="hrm-card" aria-label="Payslips">
        {!list.data ? <Loading error={list.error} reload={list.reload} /> : rows.length ? (
          <div className="hrm-table-wrap"><table className="hrm-table">
            <thead><tr><th>Month</th><th className="num">Gross</th><th className="num">Deductions</th><th className="num">Net pay</th><th aria-label="Open" /></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td><b>{r.label}</b><small>Paid {fmtDate(r.paid_at)}</small></td>
                <td className="num">{tk(r.gross)}</td>
                <td className="num">{tk(r.deduction_total)}</td>
                <td className="num"><b>{tk(r.net)}</b></td>
                <td className="num"><Link className="hrm-link" to={`/hr/payslips/${r.id}`}>Open</Link></td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <p className="hrm-empty">No payslips yet.</p>}
      </section>
    </div>
  );
}
