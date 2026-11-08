import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button, Spinner, EmptyState } from '../ui/kit';
import '../styles/dashboard.css';

/*
 * The company at a glance, designed in docs/design/admin-dashboard.figcraft.
 * One request (GET /api/dashboard/overview) feeds every panel; the period
 * switch re-asks for the same picture over a different window.
 */
const PERIODS = [['month', 'Month'], ['quarter', 'Quarter'], ['year', 'Year'], ['12m', '12 months']];
// Validated categorical order (dataviz validate_palette.js, light surface).
const AREA_COLOR = { property: '#2a78d6', services: '#eb6834', interior: '#1baf7a', advisory: '#eda100' };
const JOB_STAGES = [['scheduled', 'Scheduled', '#C9DDF6'], ['in_progress', 'In progress', '#7FAEE8'], ['completed', 'Completed', '#2a78d6']];
const NEW_ITEMS = [['Add a property', '/sales/properties/new'], ['Add a contact', '/contacts'], ['Add a lead', '/leads']];

const taka = (v) => '৳' + Math.round(Number(v || 0)).toLocaleString('en-IN');
const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });
const takaShort = (v) => (Number(v) ? '৳' + compact.format(v) : '৳0');
const count = (v) => Number(v || 0).toLocaleString('en-IN');
const monthName = (ym) => new Date(ym + '-01T00:00:00').toLocaleDateString('en-GB', { month: 'short' });

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};
const ago = (at) => {
  const mins = Math.round((Date.now() - new Date(at).getTime()) / 6e4);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)} h ago`;
  const days = Math.round(mins / 1440);
  return days === 1 ? 'Yesterday' : days < 30 ? `${days} days ago` : new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

function delta(k, isMoney, prevLabel) {
  if (!k.previous) return { text: k.value ? `Nothing in ${prevLabel} to compare` : `None in ${prevLabel} either`, tone: 'flat' };
  const diff = k.value - k.previous;
  if (isMoney) {
    const pct = Math.round((diff / k.previous) * 100);
    return { text: `${pct > 0 ? '+' : ''}${pct}% vs ${prevLabel}`, tone: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat' };
  }
  return { text: `${diff > 0 ? '+' : diff < 0 ? '−' : '±'}${count(Math.abs(diff))} vs ${prevLabel}`, tone: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat' };
}

function Spark({ values, color = 'currentColor', width = 80, height = 24 }) {
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => [(i * width) / Math.max(1, values.length - 1), height - 2 - (v / max) * (height - 4)]);
  const d = 'M' + pts.map((p) => p.map((c) => c.toFixed(1)).join(' ')).join(' L');
  const last = pts[pts.length - 1];
  return (
    <svg className="spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {last && <circle cx={last[0]} cy={last[1]} r="3" fill={color} />}
    </svg>
  );
}

function Kpi({ label, k, money, prevLabel }) {
  const d = delta(k, money, prevLabel);
  return (
    <div className="dash-kpi">
      <div className="k-label">{label}</div>
      <div className="k-value">{money ? taka(k.value) : count(k.value)}</div>
      <div className="k-foot">
        <span className={`k-delta is-${d.tone}`}>{d.text}</span>
        <Spark values={k.spark} color="#1CC4FA" />
      </div>
    </div>
  );
}

function Panel({ title, sub, aside, className = '', children }) {
  return (
    <section className={`card dash-panel ${className}`}>
      <header className="dash-panel-head">
        <div><h2>{title}</h2>{sub && <p>{sub}</p>}</div>
        {aside}
      </header>
      {children}
    </section>
  );
}

function ChartTip({ active, payload, label, money, labelFor }) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => Number(p.value));
  const total = rows.reduce((s, p) => s + Number(p.value), 0);
  return (
    <div className="dash-tip">
      <div className="dash-tip-h">{labelFor ? labelFor(label) : label}</div>
      {rows.map((p) => (
        <div key={p.dataKey} className="dash-tip-row"><i style={{ background: p.color || p.stroke }} />{p.name}<b>{money ? taka(p.value) : count(p.value)}</b></div>
      ))}
      {rows.length > 1 && <div className="dash-tip-row is-total">Total<b>{money ? taka(total) : count(total)}</b></div>}
      {!rows.length && <div className="dash-tip-row">Nothing recorded</div>}
    </div>
  );
}

function revenueTakeaway(rba) {
  const last = rba.months.length - 1;
  const totals = rba.areas.map((a) => ({ label: a.label, now: a.values[last], before: a.values[last - 1] || 0 }));
  const sumNow = totals.reduce((s, a) => s + a.now, 0);
  if (!sumNow) {
    return rba.areas.some((a) => a.values.some(Boolean))
      ? `Nothing invoiced in ${monthName(rba.months[last])} yet.`
      : 'No invoices issued in this window yet.';
  }
  const top = totals.reduce((a, b) => (b.now > a.now ? b : a));
  return `${top.label} is ${Math.round((top.now / sumNow) * 100)}% of ${monthName(rba.months[last])} revenue so far.`;
}

function NewMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div className="dash-new" ref={ref}>
      <button type="button" className="dash-new-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Plus size={16} /> New
      </button>
      {open && (
        <div className="dash-new-menu" role="menu">
          {NEW_ITEMS.map(([label, to]) => <Link key={to} to={to} role="menuitem" onClick={() => setOpen(false)}>{label}</Link>)}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [period, setPeriod] = useState('month');
  const [branch, setBranch] = useState('all');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const branches = data?.branches || [];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: d } = await api.get('/dashboard/overview', { params: { period, ...(branch !== 'all' ? { branch } : {}) } });
      setData(d);
    } catch (err) {
      setError(err?.response?.status === 403
        ? 'Company figures are available to administrators, property managers and accounts.'
        : err?.response?.data?.error || 'The dashboard could not be loaded. Check the API is running, then try again.');
    } finally {
      setLoading(false);
    }
  }, [period, branch]);

  useEffect(() => { load(); }, [load]);

  const revRows = useMemo(() => data && data.revenue_by_area.months.map((m, i) => ({
    month: m, ...Object.fromEntries(data.revenue_by_area.areas.map((a) => [a.key, a.values[i]])),
  })), [data]);
  const enqRows = useMemo(() => data && data.enquiries_trend.months.map((m, i) => ({ month: m, enquiries: data.enquiries_trend.values[i] })), [data]);

  const firstName = (user?.name || '').split(' ')[0] || 'there';
  const header = (
    <div className="dash-header">
      <div>
        <h1>{greeting()}, {firstName}</h1>
        <p>{data ? `Here is how Seventh Sky is doing ${data.period.label} across all eleven business lines.` : 'Loading the latest figures.'}</p>
      </div>
      <div className="dash-controls">
        <div className="dash-seg" role="radiogroup" aria-label="Period">
          {PERIODS.map(([key, label]) => (
            <button key={key} type="button" role="radio" aria-checked={period === key}
              className={period === key ? 'is-on' : ''} onClick={() => setPeriod(key)}>{label}</button>
          ))}
        </div>
        {branches.length > 1 && (
          <label className="dash-branch">
            <span className="sr-only">Branch</span>
            <select value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="all">All branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <ChevronDown size={14} aria-hidden="true" />
          </label>
        )}
        <button type="button" className="dash-icon-btn" onClick={load} disabled={loading} title="Refresh" aria-label="Refresh">
          <RefreshCw size={16} className={loading ? 'is-spinning' : ''} />
        </button>
        <NewMenu />
      </div>
    </div>
  );

  if (!data) {
    return (
      <div className="dash">
        {header}
        {error
          ? <EmptyState icon={AlertCircle} title="The dashboard could not load" sub={error} action={<Button onClick={load}>Try again</Button>} />
          : <div className="dash-loading"><Spinner /></div>}
      </div>
    );
  }

  const prev = data.period.previous_label;
  const funnelTop = Math.max(1, data.funnel[0]?.count || 0);
  const won = data.funnel[data.funnel.length - 1]?.count || 0;
  const occLet = data.occupancy.reduce((s, o) => s + o.let, 0);
  const occTotal = data.occupancy.reduce((s, o) => s + o.total, 0);
  const jobMax = Math.max(1, ...data.jobs.map((j) => j.scheduled + j.in_progress + j.completed));
  const att = data.attention;

  return (
    <div className={`dash ${loading ? 'is-loading' : ''}`}>
      {header}
      {error && <div className="dash-inline-error" role="alert">{error}</div>}

      <div className="dash-band">
        <Kpi label="Revenue invoiced" k={data.kpis.revenue} money prevLabel={prev} />
        <Kpi label="Cash collected" k={data.kpis.collected} money prevLabel={prev} />
        <Kpi label="New enquiries" k={data.kpis.enquiries} prevLabel={prev} />
        <Kpi label="Jobs completed" k={data.kpis.jobs_completed} prevLabel={prev} />
      </div>

      <div className="dash-row dash-row-hero">
        <Panel title="Revenue by business area" sub={`Invoiced each month, last ${data.revenue_by_area.months.length} months`}
          aside={(
            <ul className="dash-legend" aria-label="Business areas">
              {data.revenue_by_area.areas.map((a) => <li key={a.key}><i style={{ background: AREA_COLOR[a.key] }} />{a.label}</li>)}
            </ul>
          )}>
          <div className="dash-chart" style={{ height: 240 }}>
            <ResponsiveContainer initialDimension={{ width: 600, height: 240 }}>
              <BarChart data={revRows} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} barCategoryGap="28%">
                <CartesianGrid vertical={false} stroke="#EEF2F6" />
                <XAxis dataKey="month" tickFormatter={monthName} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} tick={{ fontSize: 11.5, fill: '#475569' }} />
                <YAxis tickFormatter={takaShort} tickLine={false} axisLine={false} width={56} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <Tooltip cursor={{ fill: 'rgba(15,23,42,.04)' }} content={<ChartTip money labelFor={(m) => new Date(m + '-01T00:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} />} />
                {data.revenue_by_area.areas.map((a, i, all) => (
                  <Bar key={a.key} dataKey={a.key} name={a.label} stackId="rev" fill={AREA_COLOR[a.key]}
                    stroke="#fff" strokeWidth={1} radius={i === all.length - 1 ? [4, 4, 0, 0] : 0} maxBarSize={48} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="dash-note">{revenueTakeaway(data.revenue_by_area)}</p>
        </Panel>

        <Panel title="Enquiry pipeline" sub={`Enquiries received ${data.period.label}, by the furthest stage reached`}>
          <ol className="dash-funnel">
            {data.funnel.map((f, i) => (
              <li key={f.label} title={`${f.label}: ${count(f.count)}`}>
                <div className="dash-bar-label"><span>{f.label}</span><b>{count(f.count)}</b></div>
                <div className="dash-track"><div className={`dash-fill ${i === data.funnel.length - 1 ? 'is-won' : ''}`} style={{ width: `${(f.count / funnelTop) * 100}%` }} /></div>
              </li>
            ))}
          </ol>
          <p className="dash-note is-strong">
            {data.funnel[0]?.count ? `${((won / data.funnel[0].count) * 100).toFixed(1)}% of these enquiries were won` : 'No enquiries in this period yet'}
          </p>
        </Panel>
      </div>

      <div className="dash-row dash-row-three">
        <Panel title="Enquiries" sub="New each month">
          <div className="dash-chart" style={{ height: 180 }}>
            <ResponsiveContainer initialDimension={{ width: 600, height: 240 }}>
              <AreaChart data={enqRows} margin={{ top: 12, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid vertical={false} stroke="#EEF2F6" />
                <XAxis dataKey="month" tickFormatter={monthName} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} tick={{ fontSize: 11, fill: '#475569' }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <Tooltip cursor={{ stroke: '#94A3B8', strokeDasharray: '3 3' }} content={<ChartTip labelFor={(m) => new Date(m + '-01T00:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} />} />
                <Area type="linear" dataKey="enquiries" name="Enquiries" stroke="#2a78d6" strokeWidth={2} fill="#2a78d6" fillOpacity={0.1}
                  dot={false} activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Rental occupancy" sub="Let units out of all rental units">
          <div className="dash-occ-hero">
            <b>{occTotal ? Math.round((occLet / occTotal) * 100) : 0}%</b>
            <span>{count(occLet)} of {count(occTotal)} units let</span>
          </div>
          <ul className="dash-bars">
            {data.occupancy.map((o) => (
              <li key={o.key} title={`${o.label}: ${o.let} of ${o.total} let`}>
                <div className="dash-bar-label"><span>{o.label}</span><b>{o.let} / {o.total}</b></div>
                <div className="dash-track"><div className="dash-fill" style={{ width: `${o.total ? (o.let / o.total) * 100 : 0}%` }} /></div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Jobs by service" sub={`Open now, and completed ${data.period.label}`}
          aside={null}>
          <ul className="dash-legend is-inline" aria-label="Job stages">
            {JOB_STAGES.map(([k, label, c]) => <li key={k}><i style={{ background: c }} />{label}</li>)}
          </ul>
          <ul className="dash-jobs">
            {data.jobs.map((j) => {
              const total = j.scheduled + j.in_progress + j.completed;
              return (
                <li key={j.key}>
                  <Link to={j.to} className="dash-jobs-label">{j.label}</Link>
                  <div className="dash-jobs-bar" title={`${j.label}: ${j.scheduled} scheduled, ${j.in_progress} in progress, ${j.completed} completed`}>
                    {JOB_STAGES.map(([k, , c]) => j[k] > 0 && <span key={k} style={{ width: `${(j[k] / jobMax) * 100}%`, background: c }} />)}
                    <b>{count(total)}</b>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      <div className="dash-row dash-row-hero">
        <Panel title="Business lines" sub={`${data.period.label[0].toUpperCase()}${data.period.label.slice(1)}, sorted by revenue`} className="dash-table-panel">
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr><th scope="col">Line</th><th scope="col" className="num">Enquiries</th><th scope="col" className="num">Active</th><th scope="col" className="num">Revenue</th><th scope="col">Trend</th><th aria-hidden="true" /></tr>
              </thead>
              <tbody>
                {data.lines.map((l) => (
                  <tr key={l.key} onClick={() => nav(l.to)} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') nav(l.to); }}>
                    <th scope="row"><i style={{ background: AREA_COLOR[l.area] }} />{l.label}</th>
                    <td className={`num ${l.enquiries ? '' : 'is-zero'}`}>{count(l.enquiries)}</td>
                    <td className="num is-soft">{count(l.active.count)} {l.active.unit}</td>
                    <td className={`num ${l.revenue ? 'is-money' : 'is-zero'}`}>{l.revenue ? taka(l.revenue) : '—'}</td>
                    <td><Spark values={l.trend} color={l.trend.some(Boolean) ? '#2a78d6' : '#E2E8F0'} width={96} height={22} /></td>
                    <td className="chev"><ChevronRight size={16} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Recent activity" sub="Across every business line" className="dash-activity">
          {data.activity.length === 0
            ? <p className="dash-note">Nothing has happened yet. New enquiries, payments and finished jobs will show here.</p>
            : (
              <ol className="dash-feed">
                {data.activity.map((a, i) => (
                  <li key={`${a.kind}-${a.at}-${i}`}>
                    <i style={{ background: AREA_COLOR[a.area] }} />
                    <div>
                      <div className="t">{a.title}{a.amount ? `, ${taka(a.amount)}` : ''}</div>
                      <div className="s">{a.line_label}, {ago(a.at)}</div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          {(att.overdue_invoices > 0 || att.jobs_late > 0 || att.leases_ending > 0) && (
            <div className="dash-attn">
              {att.overdue_invoices > 0 && <Link to="/property-management/invoices">{count(att.overdue_invoices)} invoices overdue, {taka(att.overdue_amount)}</Link>}
              {att.jobs_late > 0 && <Link to="/water-tank/work-orders">{count(att.jobs_late)} jobs past their target date</Link>}
              {att.leases_ending > 0 && <Link to="/property-management/renewals">{count(att.leases_ending)} leases end within 30 days</Link>}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
