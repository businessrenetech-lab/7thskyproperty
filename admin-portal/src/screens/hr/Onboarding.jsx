import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useGet, errText, Loading, Tag, fmtDate } from './hrShared';
import { STATUS_TONE, ONBOARDING_LABEL } from './employeeFields';

/*
 * Onboarding (M2 §11, M1 §10; design window 16). New joiners until they are confirmed: the five links every
 * record needs, the documents their type requires, and the checklist. Hiring from an applicant (the transfer
 * gate, M3 §21) feeds this list once recruitment is built (plan Task 19).
 */

const LINKS = [['company_name', 'Company'], ['division_name', 'Division'], ['department_name', 'Department'], ['position_title', 'Position'], ['supervisor_name', 'Supervisor']];

export default function Onboarding() {
  const toast = useToast();
  const list = useGet('/hr/employees', { status: 'Offer Accepted,Onboarding,Probation', limit: 50 });
  const [detail, setDetail] = useState({});

  const loadDetails = () => {
    const rows = list.data?.data || [];
    Promise.all(rows.map((e) => api.get(`/hr/employees/${e.employee_code}`).then((r) => [e.id, r.data]).catch(() => [e.id, null])))
      .then((pairs) => setDetail(Object.fromEntries(pairs)));
  };
  useEffect(loadDetails, [list.data]);   // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async (e, t) => {
    try { await api.patch(`/hr/employees/${e.employee_code}/onboarding/${t.id}`, { done: !t.done_at }); loadDetails(); } catch (err) { toast.error(errText(err)); }
  };

  if (!list.data) return <div className="hrm"><Loading error={list.error} reload={list.reload} /></div>;
  const rows = list.data.data;
  return (
    <div className="hrm">
      <div className="hrm-head"><div><h1>Onboarding</h1><p>New joiners until they are confirmed: the links every record needs, their documents and the checklist.</p></div></div>
      {!rows.length && <section className="hrm-card"><div className="hrm-empty">Nobody is onboarding. New employees appear here once the HR Manager approves them.</div></section>}
      {rows.map((e) => {
        const d = detail[e.id];
        const tasks = d?.onboarding || [];
        const done = tasks.filter((t) => t.done_at).length;
        const top = d && !d.supervisor_name && (d.reporting_line || []).length === 0;
        return (
          <section className="hrm-card" key={e.id} aria-label={e.full_name}>
            <div className="hrm-card-head">
              <h2><Link className="hrm-link" to={`/hr/employees/${e.employee_code}`}>{e.full_name}</Link> <small>{e.employee_code} · joins {fmtDate(e.joining_date)}</small></h2>
              <Tag tone={STATUS_TONE[e.status]}>{e.status}</Tag>
            </div>
            {!d ? <Loading /> : (
              <div className="hrm-split even hrm-pad">
                <div>
                  <span className="hrm-note">Required links</span>
                  <ul className="hrm-alerts">
                    {LINKS.map(([k, label]) => {
                      const ok = Boolean(d[k]) || (k === 'supervisor_name' && top);
                      return <li key={k}><span className={`ic ${ok ? '' : 'red'}`}>{ok ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}</span><span className="t"><b>{label}</b><small>{d[k] || (ok ? 'Top of the company' : 'Missing')}</small></span></li>;
                    })}
                  </ul>
                  <span className="hrm-note">Documents still needed</span>
                  {d.missing_documents?.length ? <div className="hrm-chips" style={{ marginTop: 6 }}>{d.missing_documents.map((x) => <span key={x}>{x}</span>)}</div> : <p className="hrm-text">All on file.</p>}
                </div>
                <div>
                  <span className="hrm-note">Checklist · {done} of {tasks.length}</span>
                  <ul className="hrm-alerts">
                    {tasks.map((t) => (
                      <li key={t.id}>
                        <span className={`ic ${t.done_at ? '' : 'red'}`}>{t.done_at ? <Check size={14} aria-hidden="true" /> : '•'}</span>
                        <span className="t"><b>{ONBOARDING_LABEL[t.task] || t.task}</b><small>{t.done_at ? `Done ${fmtDate(t.done_at)}` : t.due_on ? `Due ${fmtDate(t.due_on)}` : t.owner === 'employee' ? 'The employee does this' : 'Open'}</small></span>
                        {t.owner !== 'auto' && <button type="button" className="hrm-link" onClick={() => toggle(e, t)}>{t.done_at ? 'Undo' : 'Mark done'}</button>}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
