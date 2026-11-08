import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import {
  useLineData, DashHead, DashState, KpiStrip, Panel, Bars, Trend, HBars, StageStrip, Table, Pill, Mini, Empty,
  COLOR, moneyFull, money,
} from '../../ui/dash/LineDash';

/*
 * JobsDashboard — the index of every console that runs on the shared jobs
 * engine (Water Tank and its siblings). The service line comes from the URL
 * (services/api.js sets X-Service-Line), and the API answers with one of three
 * shapes, each drawn to fit how that business works:
 *
 *   field     visits done by providers: throughput, punctuality, complaints
 *   projects  long jobs paid in milestones: phases, value, payments, schedule
 *   cases     paperwork moving through authorities: stages, age, turnaround
 */
const COPY = {
  field: { desc: 'Jobs, providers and service quality', action: ['New service request', '/service-requests/new'] },
  projects: { desc: 'Projects from brief to handover, value and milestone payments', action: ['New project', '/projects/new'] },
  cases: { desc: 'Cases from enquiry to completion, and what each one is waiting on', action: ['New case', '/projects/new'] },
};

export default function JobsDashboard() {
  const { pathname } = useLocation();
  const base = `/${pathname.split('/')[1]}`;
  const { data, error, loading, period, setPeriod, reload } = useLineData('/line-dashboards/jobs');
  const copy = COPY[data?.model] || COPY.field;

  return (
    <div className="ld">
      <DashHead
        title={data?.line_label || 'Dashboard'}
        desc={copy.desc}
        period={period}
        setPeriod={setPeriod}
        action={{ label: copy.action[0], to: base + copy.action[1], icon: Plus }}
      />
      <DashState loading={loading} error={error} reload={reload}>
        {data && (
          <>
            <KpiStrip items={data.kpis} />
            {data.model === 'field' && <Field d={data} base={base} />}
            {data.model === 'projects' && <Projects d={data} base={base} />}
            {data.model === 'cases' && <Cases d={data} base={base} />}
          </>
        )}
      </DashState>
    </div>
  );
}

/* ── field service ───────────────────────────────────────────────────────── */

function Field({ d, base }) {
  const STATUS = { not_started: COLOR.b1, in_progress: COLOR.b2, completed: COLOR.b3 };
  const series = d.weekly.series.map((s) => ({ ...s, color: STATUS[s.key] }));
  return (
    <>
      <div className="ld-grid">
        <Panel title="Work orders raised per week" span="c8" legend={series.map((s) => [s.label, s.color])} meta="by where they stand now">
          <Bars labels={d.weekly.labels} series={series} stacked height={240} empty="No work orders raised in the last 12 weeks." />
        </Panel>
        <Panel title="On time, by provider" span="c4" meta="finished by the target date">
          <div className="ld-big">
            <b>{d.on_time.rate === null ? '—' : `${d.on_time.rate}%`}</b>
            <span>of jobs finished on time · target {d.on_time.target}%</span>
          </div>
          <div style={{ marginTop: 14 }}>
            <HBars
              rows={d.on_time.providers.map((p) => ({ label: p.name, sub: `${p.completed} of ${p.jobs} done`, value: p.on_time, max: 100, display: `${p.on_time}%`, color: p.on_time < 60 ? COLOR.s2 : COLOR.s1 }))}
              target={d.on_time.target}
              labelWidth={140}
              empty="No finished jobs with a target date yet."
            />
          </div>
        </Panel>
      </div>
      <div className="ld-grid">
        <Panel title="Providers" span="c6" meta={<Link className="ld-link" to={`${base}/providers`}>View all</Link>}>
          <Table
            rows={[...d.providers, ...(d.unassigned ? [{ name: null, jobs: d.unassigned }] : [])]}
            empty="No provider has been given a job yet."
            cols={[
              { key: 'name', label: 'Provider', strong: true, clip: true, render: (r) => r.name ?? <span className="ld-warn-text">Not assigned</span> },
              { key: 'jobs', label: 'Jobs', num: true },
              { key: 'on_time', label: 'On time', render: (r) => (r.name === null ? <Link className="ld-link" to={`${base}/work-orders`}>Assign providers</Link> : r.on_time === null ? '—' : <><Mini value={r.on_time} />{r.on_time}%</>) },
              { key: 'rating', label: 'Rating', num: true, render: (r) => r.rating ?? '—' },
              { key: 'payout_due', label: 'Payout due', num: true, render: (r) => (r.name === null ? '' : r.payout_due ? moneyFull(r.payout_due) : 'Tk 0') },
            ]}
          />
        </Panel>
        <Panel title="Invoiced and collected" span="c3" legend={[['Invoiced', COLOR.b1], ['Collected', COLOR.s1]]}>
          <Bars labels={d.revenue.labels} format="money" height={220} empty="No invoices sent in this window."
            series={[{ key: 'inv', label: 'Invoiced', color: COLOR.b1, values: d.revenue.invoiced }, { key: 'col', label: 'Collected', color: COLOR.s1, values: d.revenue.collected }]} />
        </Panel>
        <Panel title="Complaints by reason" span="c3">
          <HBars rows={d.complaints.reasons.map((r) => ({ label: r.label, value: r.count, color: r.open ? COLOR.s2 : COLOR.b2 }))} labelWidth={110} empty="No complaints logged." />
          <div className="ld-stat">
            <span>Median time to resolve</span>
            <b>{d.complaints.median_hours === null ? '—' : `${d.complaints.median_hours} hours`}</b>
            <small>Target {d.complaints.target_hours} hours</small>
          </div>
          {d.complaints.open > 0 && (
            <div className={d.complaints.overdue ? 'ld-alert' : 'ld-foot'}>
              {d.complaints.open} open{d.complaints.overdue ? `, ${d.complaints.overdue} past their response time` : ''}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

/* ── projects ────────────────────────────────────────────────────────────── */

function Projects({ d, base }) {
  return (
    <>
      <div className="ld-grid">
        <Panel title="Projects by phase" span="c12" meta={`${d.phases.reduce((s, p) => s + p.count, 0)} active`}>
          <StageStrip stages={d.phases} />
        </Panel>
      </div>
      <div className="ld-grid">
        <Panel title="Value and invoiced, largest projects" span="c7" legend={[['Invoiced', COLOR.s1], ['Contract value', COLOR.b1]]}>
          <HBars
            labelWidth={230}
            empty="No active project has a value yet. Values come from the work order or the payment schedule."
            rows={d.budget.map((p) => ({ label: `${p.code}  ${p.name}`, value: p.invoiced, max: p.value, display: `${money(p.invoiced)} of ${money(p.value)}`, color: p.budget && p.invoiced > p.budget ? COLOR.s2 : COLOR.s1 }))}
          />
        </Panel>
        <Panel title="Milestone payments" span="c5" legend={[['Scheduled', COLOR.b1], ['Collected', COLOR.s1]]}>
          <Bars labels={d.milestones.labels} format="money" height={220} empty="No payments scheduled or collected in this window."
            series={[{ key: 's', label: 'Scheduled', color: COLOR.b1, values: d.milestones.scheduled }, { key: 'c', label: 'Collected', color: COLOR.s1, values: d.milestones.collected }]} />
        </Panel>
      </div>
      <div className="ld-grid">
        <Panel title="Next eight weeks" span="c12" legend={[['On site', COLOR.s1], ['Payment due', COLOR.s2]]} meta={<Link className="ld-link" to={`${base}/projects`}>All projects</Link>}>
          <Timeline t={d.timeline} />
        </Panel>
      </div>
    </>
  );
}

function Timeline({ t }) {
  if (!t.rows.length) return <Empty>Nothing is scheduled on site or falling due in the next eight weeks. Add start and target dates to projects to see them here.</Empty>;
  const from = new Date(t.from).getTime(); const to = new Date(t.to).getTime();
  const at = (v) => `${Math.max(0, Math.min(100, ((new Date(v).getTime() - from) / (to - from)) * 100))}%`;
  const ticks = Array.from({ length: 8 }, (_, i) => new Date(from + i * 7 * 864e5));
  return (
    <div className="ld-tl">
      <span />
      <div className="ld-tl-axis">{ticks.map((d) => <span key={d.getTime()} style={{ left: at(d) }}>{d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>)}</div>
      {t.rows.map((r) => (
        <React.Fragment key={r.code}>
          <span className="ld-hbar-label" title={r.name}>{r.code}  {r.name}</span>
          <div className="ld-tl-row">
            {r.bar && <b style={{ left: at(r.bar.from), width: `calc(${at(r.bar.to)} - ${at(r.bar.from)})` }} title={r.bar.label}>{r.bar.label}</b>}
            {r.payments.map((p) => <i key={p.label} style={{ left: at(p.on) }} title={`${p.label}: ${moneyFull(p.amount)} due ${new Date(p.on).toLocaleDateString('en-GB')}`} />)}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

/* ── cases ───────────────────────────────────────────────────────────────── */

function Cases({ d, base }) {
  const open = d.stages.reduce((s, x) => s + x.count, 0);
  return (
    <>
      <div className="ld-grid">
        <Panel title="Open cases by stage" span="c6" meta={`${open} open`}>
          <Bars labels={d.stages.map((s) => s.label)} series={[{ key: 'n', label: 'Cases', color: COLOR.b3, values: d.stages.map((s) => s.count) }]} height={230} empty="No open cases." />
        </Panel>
        <Panel title="Open cases by age" span="c6" meta="days since the case was opened">
          <Bars labels={d.ageing.map((a) => a.label)} series={[{ key: 'n', label: 'Cases', color: COLOR.b3, values: d.ageing.map((a) => a.count) }]} height={230} empty="No open cases." />
        </Panel>
      </div>
      <div className="ld-grid">
        <Panel title="Turnaround, median days" span="c5" meta="cases closed each month">
          <Trend labels={d.turnaround.labels} values={d.turnaround.values} name="Median days" />
        </Panel>
        <Panel title="Waiting longest" span="c7" meta={<Link className="ld-link" to={`${base}/projects`}>All cases</Link>}>
          <Table
            rows={d.waiting}
            empty="No open cases."
            rowKey={(r) => r.code}
            cols={[
              { key: 'code', label: 'Case', strong: true },
              { key: 'client', label: 'Client' },
              { key: 'stage', label: 'Stage', render: (r) => <Pill tone={/lead/i.test(r.stage) ? 'amber' : 'blue'}>{r.stage}</Pill> },
              { key: 'officer', label: 'Officer', render: (r) => r.officer || <span className="ld-warn-text">Unassigned</span> },
              { key: 'days', label: 'Days open', num: true, render: (r) => <span className={r.days > 30 ? 'ld-bad-text' : ''}>{r.days}</span> },
            ]}
          />
        </Panel>
      </div>
    </>
  );
}
