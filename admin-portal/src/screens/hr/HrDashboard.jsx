import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Network, UserX, GitFork, FileQuestion, CirclePause, Stamp, FileWarning, FileClock, CalendarClock, UserCheck, Users, FilePlus2 } from 'lucide-react';
import { KpiStrip, Panel, HBars, Bars, Table, Pill, COLOR } from '../../ui/dash/LineDash';
import '../../styles/linedash.css';
import { useGet, useHrMe, Loading, fmtDate } from './hrShared';

/*
 * HR dashboard (M1 §12 and M2 §15 widgets, §9 alerts; design windows "HR dashboard: Organisation" and
 * "People", "Recruitment"). The People tab shows for people who may see every employee, Recruitment (M3 §19) for HR.
 */

const names = (rows) => (rows.length ? `${rows.slice(0, 2).map((r) => r.name).join(', ')}${rows.length > 2 ? `, ${rows.length - 2} more` : ''}` : 'None');

// Staff without HR duties land on their own profile (or attendance, before HR adds their record).
export default function HrDashboard() {
  const { me, can } = useHrMe();
  if (!me) return <div className="ld"><Loading /></div>;
  if (!can('org.edit') && !can('emp.view_any') && !can('approvals.inbox')) return <Navigate to={me?.employee_code ? '/hr/me' : '/hr/my-attendance'} replace />;
  return <Dashboard />;
}

function Dashboard() {
  const { data: d, error, loading, reload } = useGet('/hr/dashboard');
  const [tab, setTab] = useState('people');
  const tabs = [d?.people && ['people', 'People'], ['organisation', 'Organisation'], d?.recruitment && ['recruitment', 'Recruitment']].filter(Boolean);
  const shown = tabs.some(([k]) => k === tab) ? tab : 'organisation';
  const HEAD = {
    people: ['People overview', 'Who works here, what is missing and what runs out soon'],
    organisation: ['Organisation overview', 'Every division, department and position, and what needs attention'],
    recruitment: ['Recruitment overview', 'Open vacancies and where every applicant stands'],
  };

  return (
    <div className="ld">
      <div className="ld-head">
        <div>
          <h1>{HEAD[shown][0]}</h1>
          <p>{HEAD[shown][1]}</p>
        </div>
        <div className="ld-head-tools">
          {tabs.length > 1 && (
            <div className="hrm hrm-tabs" style={{ flexDirection: 'row', gap: 6 }} role="tablist" aria-label="Dashboard">
              {tabs.map(([k, label]) => <button key={k} type="button" aria-pressed={shown === k} onClick={() => setTab(k)}>{label}</button>)}
            </div>
          )}
          {shown === 'people' ? <Link className="ld-btn" to="/hr/employees"><Users size={16} />Open employees</Link>
            : shown === 'recruitment' ? <Link className="ld-btn" to="/hr/recruitment/requests"><FilePlus2 size={16} />New request</Link>
              : <Link className="ld-btn" to="/hr/structure"><Network size={16} />Open structure</Link>}
        </div>
      </div>
      {!d ? <Loading error={error} reload={reload} /> : shown === 'people' ? <PeopleBody p={d.people} /> : shown === 'recruitment' ? <RecruitmentBody r={d.recruitment} /> : <Body d={d} />}
    </div>
  );
}

const PRIORITY_TONE = { Critical: 'red', High: 'amber', Normal: 'blue', Future: '' };
function RecruitmentBody({ r }) {
  return (
    <>
      <KpiStrip items={[
        { key: 'open', label: 'Open vacancies', value: r.openVacancies, note: r.criticalOpen ? `${r.criticalOpen} critical` : null, tone: r.criticalOpen ? 'down' : '' },
        { key: 'apps', label: 'Applications', value: r.applicationsReceived },
        { key: 'short', label: 'Shortlisted', value: r.shortlisted },
        { key: 'int', label: 'Interviews scheduled', value: r.interviewsScheduled },
        { key: 'pend', label: 'Offers pending', value: r.offersPending },
        { key: 'acc', label: 'Offers accepted', value: r.offersAccepted, note: r.offerAcceptanceRate != null ? `${r.offerAcceptanceRate}% accept` : null, tone: 'up' },
      ]} />
      <div className="ld-grid">
        <Panel title="Pipeline" span="c4" meta="applicants by stage now">
          <HBars labelWidth={110} empty="No applications yet." rows={r.pipeline.map((x) => ({ label: x.name, value: x.count }))} />
        </Panel>
        <Panel title="Candidate sources" span="c4" meta="all applications">
          <HBars labelWidth={120} empty="No applications yet." rows={r.sources.map((x) => ({ label: x.name, value: x.count }))} />
        </Panel>
        <Panel title="Time and cost" span="c4">
          <ul className="hrm-alerts">
            <li><span className="t"><b>Average time to hire</b><small>median days from application to offer accepted</small></span><span className="n">{r.timeToHireDays != null ? `${r.timeToHireDays} days` : '—'}</span></li>
            <li><span className="t"><b>Recruitment cost</b><small>{r.costPerHire != null ? `Tk ${r.costPerHire.toLocaleString('en-IN')} per hire` : 'no hires yet'}</small></span><span className="n">Tk {Number(r.recruitmentCost).toLocaleString('en-IN')}</span></li>
            <li><span className="t"><b>Vacancies filled</b><small>positions filled through recruitment</small></span><span className="n">{r.vacanciesFilled}</span></li>
            <li><span className="t"><b>Talent pool</b><small>people kept for future roles</small></span><Link className="n hrm-link" to="/hr/recruitment/talent-pool">{r.talentPoolSize}</Link></li>
          </ul>
        </Panel>
      </div>
      <div className="ld-grid">
        <Panel title="Open vacancies" span="c12" meta="vacancy age counts from publishing">
          <Table empty="No open vacancies." rowKey={(x) => x.vacancy_code} rows={r.openVacancyRows} cols={[
            { key: 'title', label: 'Vacancy', render: (x) => <Link className="ld-link" to={`/hr/recruitment/pipeline/${x.vacancy_code}`}><b>{x.title}</b><br /><small>{x.vacancy_code} · {x.positions} {x.positions === 1 ? 'position' : 'positions'}</small></Link> },
            { key: 'department', label: 'Department' },
            { key: 'priority', label: 'Priority', render: (x) => <Pill tone={PRIORITY_TONE[x.priority]}>{x.priority}</Pill> },
            { key: 'applicants', label: 'Applicants', num: true },
            { key: 'stage', label: 'Furthest stage' },
            { key: 'ageDays', label: 'Age', num: true, render: (x) => (x.ageDays != null ? `${x.ageDays} days` : '—') },
          ]} />
        </Panel>
      </div>
    </>
  );
}

const MONTH = (key) => new Date(`${key}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'short' });
function PeopleBody({ p }) {
  const g = p.genderRatio;
  const known = g.male + g.female + g.other;
  const watch = [
    { icon: FileWarning, label: 'Missing documents', note: 'people missing what their type requires', n: p.missingDocuments, tone: 'red', to: '/hr/reports?r=missing-documents' },
    { icon: FileClock, label: 'Documents expiring', note: 'in 30 days, or already expired', n: p.expiringDocuments, tone: 'amber', to: '/hr/reports?r=document-expiry' },
    { icon: CalendarClock, label: 'Contracts ending', note: 'in the next 60 days', n: p.contractExpiry, tone: 'amber', to: '/hr/reports?r=contract-expiry' },
    { icon: UserCheck, label: 'Probation reviews due', note: 'probation ends within 14 days', n: p.probationReviewDue, tone: 'amber', to: '/hr/reports?r=probation' },
  ];
  return (
    <>
      <KpiStrip items={[
        { key: 'tot', label: 'Total employees', value: p.totalEmployees },
        { key: 'act', label: 'Active employees', value: p.activeEmployees },
        { key: 'pro', label: 'On probation', value: p.onProbation },
        { key: 'new', label: 'New joiners this month', value: p.newJoinersThisMonth },
        { key: 'ten', label: 'Average tenure (months)', value: p.averageTenureMonths },
      ]} />
      <div className="ld-grid">
        <Panel title="Employees by department" span="c7" meta="active employees">
          <HBars labelWidth={170} empty="No employees yet." rows={p.byDepartment.map((x) => ({ label: x.name, value: x.count }))} />
        </Panel>
        <Panel title="Needs attention" span="c5" meta="HR is reminded automatically">
          <ul className="hrm-alerts">
            {watch.map((x) => (
              <li key={x.label}>
                <span className={`ic ${x.n ? x.tone : ''}`}><x.icon size={16} /></span>
                <span className="t"><b>{x.label}</b><small>{x.note}</small></span>
                <Link className={`n hrm-link ${x.n ? x.tone : ''}`} to={x.to}>{x.n}</Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <div className="ld-grid">
        <Panel title="Turnover" span="c7" meta="leavers as % of average headcount, last 12 months">
          <Bars labels={p.turnoverTrend.map((x) => MONTH(x.month))} height={230} empty="Nobody has left in the last 12 months."
            series={[{ key: 'r', label: 'Turnover %', color: COLOR.s1, values: p.turnoverTrend.map((x) => x.rate) }]} />
        </Panel>
        <Panel title="Employees by type" span="c5" meta="active employees">
          <HBars labelWidth={170} empty="No employees yet." rows={p.byType.map((x) => ({ label: x.name, value: x.count }))} />
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #EEF2F6' }}>
            <span className="hrm-note">Gender ratio</span>
            <p className="hrm-text">{known ? `${g.male} male · ${g.female} female${g.other ? ` · ${g.other} other` : ''}${g.unknown ? ` · ${g.unknown} not recorded` : ''}` : 'Not recorded for anyone yet'}</p>
          </div>
        </Panel>
      </div>
    </>
  );
}

function Body({ d }) {
  const o = d.organisation;
  const a = d.alerts;
  const alerts = [
    { icon: UserX, label: 'Departments without a manager', rows: a.departmentsWithoutManager, tone: 'red' },
    { icon: GitFork, label: 'Positions without a supervisor', rows: a.positionsWithoutSupervisor, tone: 'red' },
    { icon: FileQuestion, label: 'Positions without a job description', rows: a.positionsWithoutJobDescription, tone: 'amber' },
    { icon: CirclePause, label: 'Inactive departments', rows: d.inactiveDepartments, tone: '' },
  ];
  return (
    <>
      <KpiStrip items={[
        { key: 'div', label: 'Divisions', value: o.divisions },
        { key: 'dep', label: 'Departments', value: o.departments, note: o.inactiveDepartments ? `${o.inactiveDepartments} inactive` : null, tone: 'flat' },
        { key: 'pos', label: 'Active positions', value: o.activePositions },
        { key: 'vac', label: 'Vacant positions', value: o.vacantPositions, tone: o.vacantPositions ? 'down' : 'flat' },
        { key: 'new', label: 'New positions this month', value: o.newPositionsThisMonth },
      ]} />
      <div className="ld-grid">
        <Panel title="Headcount by department" span="c7" meta="people in a seat">
          <HBars labelWidth={170} empty="No departments yet." rows={o.headcountByDepartment.map((x) => ({ label: x.name, value: x.headcount }))} />
        </Panel>
        <Panel title="Needs attention" span="c5" meta="HR is alerted automatically">
          <ul className="hrm-alerts">
            {alerts.map((x) => (
              <li key={x.label}>
                <span className={`ic ${x.tone}`}><x.icon size={16} /></span>
                <span className="t"><b>{x.label}</b><small>{names(x.rows)}</small></span>
                <span className={`n ${x.rows.length ? x.tone : ''}`}>{x.rows.length}</span>
              </li>
            ))}
            <li>
              <span className="ic amber"><Stamp size={16} /></span>
              <span className="t"><b>Approvals waiting for you</b><small>{d.approvals.pending} open in total</small></span>
              <Link className="n hrm-link" to="/hr/approvals">{d.approvals.waitingForMe}</Link>
            </li>
          </ul>
        </Panel>
      </div>
      <div className="ld-grid">
        <Panel title="Headcount by division" span="c5">
          <Bars labels={d.headcountByDivision.map((x) => x.division)} height={230} empty="Nobody is in a seat yet. Employee records arrive with the employee module."
            series={[{ key: 'h', label: 'Headcount', color: COLOR.s1, values: d.headcountByDivision.map((x) => x.headcount) }]} />
        </Panel>
        <Panel title="Recent structure changes" span="c7" meta={<Link className="ld-link" to="/hr/approvals?tab=decided">History</Link>}>
          <Table empty="No structure changes yet." rowKey={(r) => r.id} rows={d.recentChanges}
            cols={[
              { key: 'label', label: 'Change', render: (r) => <><b>{r.label}{r.subject ? `: ${r.subject}` : ''}</b><br /><small className="hrm-note">{r.code}</small></> },
              { key: 'by', label: 'By', render: (r) => r.requested_by_name || '—' },
              { key: 'st', label: 'Approved', render: (r) => (r.status === 'pending' ? `Waiting for ${r.waiting_for}` : r.status === 'approved' ? `${fmtDate(r.decided_at)}, ${r.decided_by_name || ''}` : '—') },
              { key: 'p', label: '', render: (r) => <Pill tone={{ approved: 'green', rejected: 'red', pending: 'amber' }[r.status]}>{r.status[0].toUpperCase() + r.status.slice(1)}</Pill> },
            ]} />
        </Panel>
      </div>
    </>
  );
}
