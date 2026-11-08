import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import api from '../../services/api';
import '../../styles/linedash.css';

/*
 * LineDash — the building blocks of the per-line console dashboards
 * (screens/dashboards/*). The screens decide the layout; these only draw.
 *
 * Data colours: one blue family (b1 lightest → b4 darkest) for magnitude and
 * status steps, orange only for the one series that needs to stand apart.
 */
export const COLOR = { s1: '#2A78D6', s2: '#EB6834', s3: '#1BAF7A', b1: '#C9DDF6', b2: '#7FAEE8', b3: '#2A78D6', b4: '#1B4F8F', grid: '#EEF2F6', ink: '#0F172A' };

/* ── numbers ─────────────────────────────────────────────────────────────── */

const n = (v) => Number(v || 0);
// Taka in lakh / crore, as the business reads it: Tk 9.6L, Tk 1.2Cr.
export function short(v) {
  const x = n(v); const a = Math.abs(x);
  if (a >= 1e7) return `${+(x / 1e7).toFixed(a >= 1e8 ? 0 : 1)}Cr`;
  if (a >= 1e5) return `${+(x / 1e5).toFixed(a >= 1e6 ? 0 : 1)}L`;
  if (a >= 1e3) return `${+(x / 1e3).toFixed(a >= 1e4 ? 0 : 1)}k`;
  return String(Math.round(x));
}
export const money = (v) => `Tk ${short(v)}`;
export const moneyFull = (v) => `Tk ${Math.round(n(v)).toLocaleString('en-IN')}`;
export function fmt(v, format) {
  if (v === null || v === undefined) return '—';
  if (format === 'money') return money(v);
  if (format === 'pct') return `${v}%`;
  if (format === 'days') return `${v} day${v === 1 ? '' : 's'}`;
  if (format === 'hours') return `${v} hours`;
  return n(v).toLocaleString('en-IN');
}

/* ── data ────────────────────────────────────────────────────────────────── */

const PERIOD_KEY = 'ld.period';
const readPeriod = () => { try { return localStorage.getItem(PERIOD_KEY) || 'quarter'; } catch { return 'quarter'; } };

/** Loads a dashboard endpoint for the chosen period; remembers the period per viewer. */
export function useLineData(url, params) {
  const [period, setPeriodState] = useState(readPeriod);
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const key = JSON.stringify(params || {});
  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    api.get(url, { params: { ...(params || {}), period } })
      .then((r) => setState({ data: r.data, error: null, loading: false }))
      .catch((e) => setState({ data: null, error: e?.response?.data?.error || 'The dashboard could not be loaded.', loading: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, key, period]);
  useEffect(() => { load(); }, [load]);
  const setPeriod = (p) => { setPeriodState(p); try { localStorage.setItem(PERIOD_KEY, p); } catch { /* per-viewer nicety only */ } };
  return { ...state, period, setPeriod, reload: load };
}

/* ── frame ───────────────────────────────────────────────────────────────── */

const PERIODS = [['month', 'Month'], ['quarter', 'Quarter'], ['year', 'Year']];

export function DashHead({ title, desc, period, setPeriod, action }) {
  return (
    <div className="ld-head">
      <div>
        <h1>{title}</h1>
        {desc && <p>{desc}</p>}
      </div>
      <div className="ld-head-tools">
        <div className="ld-seg" role="group" aria-label="Period">
          {PERIODS.map(([k, label]) => (
            <button key={k} type="button" aria-pressed={period === k} onClick={() => setPeriod(k)}>{label}</button>
          ))}
        </div>
        {action && <Link className="ld-btn" to={action.to}>{action.icon && <action.icon size={16} />}{action.label}</Link>}
      </div>
    </div>
  );
}

const PERIOD_WORD = { month: 'last 30 days', quarter: 'last 3 months', year: 'last 12 months' };
export const periodWord = (p) => PERIOD_WORD[p] || '';

export function DashState({ loading, error, reload, children }) {
  if (error) {
    return (
      <div className="ld-error" role="alert">
        <span>{error}</span>
        <button type="button" className="ld-link" onClick={reload}>Try again</button>
      </div>
    );
  }
  if (loading && !children) {
    return (
      <>
        <div className="ld-skel" style={{ height: 66 }} />
        <div className="ld-grid">
          <div className="ld-skel c8" style={{ height: 280 }} />
          <div className="ld-skel c4" style={{ height: 280 }} />
        </div>
      </>
    );
  }
  return children;
}

/* ── headline figures ────────────────────────────────────────────────────── */

export function Spark({ values, width = 64, height = 26, color = COLOR.s1 }) {
  const v = (values || []).map(n);
  if (v.length < 2 || v.every((x) => x === 0)) return <svg width={width} height={height} aria-hidden="true" />;
  const max = Math.max(...v); const min = Math.min(...v);
  const pts = v.map((x, i) => `${((i / (v.length - 1)) * (width - 2) + 1).toFixed(1)},${(height - 2 - ((x - min) / (max - min || 1)) * (height - 4)).toFixed(1)}`);
  return (
    <svg width={width} height={height} aria-hidden="true">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function KpiStrip({ items }) {
  return (
    <div className="ld-kpis">
      {items.map((k) => {
        const delta = k.change !== null && k.change !== undefined ? `${k.change > 0 ? '+' : ''}${k.change}%` : null;
        const tone = k.tone || (k.change > 0 ? 'up' : k.change < 0 ? 'down' : '');
        const note = [delta, k.note].filter(Boolean).join(' · ');
        return (
          <div className="ld-kpi" key={k.key}>
            <div className="ld-kpi-top">
              <span className="ld-kpi-label">{k.label}</span>
              {note && <span className={`ld-kpi-note ${tone}`} title={note}>{note}</span>}
            </div>
            <span className="ld-kpi-value">{fmt(k.value, k.format)}</span>
            <Spark values={k.spark} />
          </div>
        );
      })}
    </div>
  );
}

/* ── panels ──────────────────────────────────────────────────────────────── */

export function Legend({ items }) {
  return items.map(([label, color]) => <span key={label} className="ld-legend"><i style={{ background: color }} />{label}</span>);
}

export function Panel({ title, meta, legend, span = 'c6', children, style }) {
  return (
    <section className={`ld-panel ${span}`} style={style} aria-label={title}>
      <div className="ld-panel-head">
        <h2>{title}</h2>
        {(meta || legend) && <div className="ld-panel-meta">{legend && <Legend items={legend} />}{meta}</div>}
      </div>
      {children}
    </section>
  );
}

export const Empty = ({ children = 'Nothing to show for this period yet.' }) => <div className="ld-empty">{children}</div>;

/* ── charts ──────────────────────────────────────────────────────────────── */

function Tip({ active, payload, label, format }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="ld-tip">
      <strong>{label}</strong>
      {payload.map((p) => (
        <div key={p.dataKey}><span><i style={{ background: p.color || p.fill || p.stroke }} />{p.name}</span><b>{format === 'money' ? moneyFull(p.value) : n(p.value).toLocaleString('en-IN')}</b></div>
      ))}
    </div>
  );
}

const axisProps = { tickLine: false, axisLine: false, tickMargin: 6 };

// Even axis steps (0, 5k, 10k, 15k…) with the top step just above the data.
function niceTicks(max, count = 4) {
  if (!(max > 0)) return [0, 1];
  const raw = max / count;
  const p = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 3, 4, 5, 6, 8, 10].find((m) => m * p >= raw) * p;
  return Array.from({ length: count + 1 }, (_, i) => +(i * step).toFixed(6));
}

/**
 * Vertical bars. series: [{ key, label, color, values }]. stacked puts them on
 * top of one another (status steps); otherwise they stand side by side.
 */
export function Bars({ labels, series, stacked = false, height = 230, format, empty }) {
  const rows = labels.map((label, i) => Object.fromEntries([['label', label], ...series.map((s) => [s.key, n(s.values[i])])]));
  if (rows.every((r) => series.every((s) => !r[s.key]))) return <Empty>{empty}</Empty>;
  const top = Math.max(...rows.map((r) => (stacked ? series.reduce((t, s) => t + r[s.key], 0) : Math.max(...series.map((s) => r[s.key])))));
  const ticks = niceTicks(top);
  return (
    <div className="ld-chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 500, height }}>
        <BarChart data={rows} margin={{ top: 12, right: 4, bottom: 0, left: -8 }} barGap={2} barCategoryGap={stacked ? '28%' : '22%'}>
          <CartesianGrid vertical={false} stroke={COLOR.grid} />
          <XAxis dataKey="label" {...axisProps} interval={labels.length <= 8 ? 0 : 'preserveStartEnd'} minTickGap={4} />
          <YAxis {...axisProps} width={46} ticks={ticks} domain={[0, ticks[ticks.length - 1]]} interval={0} tickFormatter={format === 'money' ? short : undefined} />
          <Tooltip content={<Tip format={format} />} cursor={{ fill: 'rgba(42,120,214,.06)' }} />
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} stackId={stacked ? 'a' : undefined}
              radius={!stacked || i === series.length - 1 ? [4, 4, 0, 0] : 0} maxBarSize={stacked ? 34 : series.length === 1 ? 36 : 18}
              stroke="#fff" strokeWidth={stacked ? 1 : 0} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** One line over time, with an optional dashed target. Gaps stay gaps. */
export function Trend({ labels, values, name, target, height = 210, unit = '' }) {
  const rows = labels.map((label, i) => ({ label, v: values[i] }));
  if (values.every((v) => v === null || v === undefined)) return <Empty>No closed cases in this window yet, so there is no turnaround to plot.</Empty>;
  const ticks = niceTicks(Math.max(target || 0, ...values.filter((v) => v !== null && v !== undefined)), 3);
  return (
    <div className="ld-chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 500, height }}>
        <LineChart data={rows} margin={{ top: 12, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid vertical={false} stroke={COLOR.grid} />
          <XAxis dataKey="label" {...axisProps} />
          <YAxis {...axisProps} width={40} ticks={ticks} domain={[0, ticks[ticks.length - 1]]} interval={0} unit={unit} />
          <Tooltip content={<Tip />} />
          {target ? <ReferenceLine y={target} stroke={COLOR.ink} strokeDasharray="4 4" strokeOpacity={0.5} /> : null}
          <Line type="monotone" dataKey="v" name={name} stroke={COLOR.s1} strokeWidth={2} dot={{ r: 3.5, strokeWidth: 2, fill: '#fff' }} connectNulls={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Horizontal bars with the value at the end. rows: [{ label, sub?, value, max?, tone?, display? }]
 * A `target` (0–100) draws a tick on every track.
 */
export function HBars({ rows, labelWidth = 130, target, format, empty }) {
  if (!rows.length) return <Empty>{empty}</Empty>;
  const max = Math.max(1, ...rows.map((r) => n(r.max ?? r.value)));
  return (
    <div className="ld-hbars" style={{ '--label': `${labelWidth}px` }}>
      {rows.map((r) => (
        <div className="ld-hbar" key={r.label}>
          <span className="ld-hbar-label" title={r.label}>{r.label}{r.sub && <small>{r.sub}</small>}</span>
          <span className="ld-track">
            <span className={`ld-fill ${r.light ? 'light' : ''}`} style={{ width: `${Math.min(100, (n(r.value) / n(r.max ?? max)) * 100)}%`, background: r.color }} />
            {target ? <span className="ld-target" style={{ left: `${target}%` }} aria-hidden="true" /> : null}
          </span>
          <span className="ld-hbar-value">{r.display ?? fmt(r.value, format)}</span>
        </div>
      ))}
    </div>
  );
}

/** A single strip split by stage, widths by count, labels underneath. */
export function StageStrip({ stages }) {
  const total = stages.reduce((s, x) => s + x.count, 0);
  if (!total) return <Empty>No open work right now.</Empty>;
  const ramp = [COLOR.b1, COLOR.b2, COLOR.b3, COLOR.b4];
  const shown = stages.filter((s) => s.count);
  return (
    <div className="ld-stages" style={{ gridTemplateColumns: shown.map((s) => `minmax(64px, ${s.count}fr)`).join(' ') }}>
      {shown.map((s, i) => (
        <div key={s.key}>
          <div className="ld-stage-bar" style={{ background: ramp[Math.min(ramp.length - 1, Math.floor((i / Math.max(1, shown.length - 1)) * (ramp.length - 1)))] }} title={`${s.label}: ${s.count}`} />
          <div className="ld-stage-label">{s.label}<small>{s.count} {s.count === 1 ? 'project' : 'projects'}</small></div>
        </div>
      ))}
    </div>
  );
}

/* ── tables ──────────────────────────────────────────────────────────────── */

/** cols: [{ key, label, num?, render?(row) }] */
export function Table({ cols, rows, empty, rowKey = (r, i) => i }) {
  if (!rows.length) return <Empty>{empty}</Empty>;
  return (
    <div className="ld-table-wrap">
      <table className="ld-table">
        <thead><tr>{cols.map((c) => <th key={c.key} className={c.num ? 'num' : ''}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={rowKey(r, i)}>
              {cols.map((c) => <td key={c.key} className={`${c.num ? 'num' : ''} ${c.strong ? 'strong' : ''} ${c.clip ? 'clip' : ''}`} title={c.clip ? String(r[c.key] ?? '') : undefined}>{c.render ? c.render(r) : (r[c.key] ?? '—')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const Pill = ({ tone, children }) => <span className={`ld-pill ${tone || ''}`}>{children}</span>;
export const Mini = ({ value }) => (
  <span className="mini" aria-hidden="true"><i className={n(value) < 60 ? 'low' : ''} style={{ width: `${Math.max(0, Math.min(100, n(value)))}%` }} /></span>
);
