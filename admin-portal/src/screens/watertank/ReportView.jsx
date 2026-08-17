import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, FileDown, RefreshCw, Calendar, Filter } from 'lucide-react';
import api from '../../services/api';
import { bdt, dateFmt, Loading, EmptyState, toast, errText } from './common';

/*
 * One renderer for every accounting report.
 *
 * The server sends the COLUMNS along with the rows, so this component does not
 * know what a client payment report looks like — it knows how to draw whatever
 * it was handed. Three things follow, and they are the reason it is built this
 * way rather than as five screens:
 *
 *   The table and the branded PDF cannot disagree, because neither owns the
 *   column list. That is the classic way a report loses its authority: someone
 *   adds a column to the screen and the printed version quietly lacks it.
 *
 *   The date filter behaves identically everywhere. "Last 30 days" is resolved
 *   once, on the server, inclusive of today — a range that silently excludes
 *   today is one an operator reconciles against the bank, finds short, and stops
 *   trusting.
 *
 *   The sixth report costs a definition, not a screen.
 *
 * It is also embeddable: a client dashboard passes `filters={{ client }}` and
 * `compact`, and gets that client's statement of account from the same code
 * that produces the register-wide report. A dashboard total that disagrees with
 * the report the same client is emailed is exactly what that prevents.
 */

const PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: '7D' },
  { value: '14d', label: '14D' },
  { value: '30d', label: '30D' },
  { value: '1y', label: '1Y' },
];

const num = (v) => Number(v || 0);
const today = () => new Date().toISOString().slice(0, 10);

/** Presets plus a custom range. Shared by every report and every dashboard. */
export function DateRangeBar({ value, onChange, right }) {
  const [open, setOpen] = useState(value.preset === 'custom');

  const pick = (preset) => {
    setOpen(preset === 'custom');
    onChange({ ...value, preset });
  };

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
      <Calendar size={15} style={{ color: 'var(--wt-muted)' }} />
      {PRESETS.map((p) => (
        <button key={p.value} className={`wt-chip${value.preset === p.value ? ' on' : ''}`}
          onClick={() => pick(p.value)}>{p.label}</button>
      ))}
      <button className={`wt-chip${value.preset === 'custom' ? ' on' : ''}`} onClick={() => pick('custom')}>
        Custom
      </button>

      {open && (
        <>
          <input className="wt-input" type="date" style={{ width: 148, padding: '6px 9px' }}
            max={value.to || today()} value={value.from || ''}
            onChange={(e) => onChange({ ...value, preset: 'custom', from: e.target.value })} />
          <span className="muted" style={{ fontSize: 12 }}>to</span>
          <input className="wt-input" type="date" style={{ width: 148, padding: '6px 9px' }}
            min={value.from || undefined} max={today()} value={value.to || ''}
            onChange={(e) => onChange({ ...value, preset: 'custom', to: e.target.value })} />
        </>
      )}

      {right && <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>{right}</span>}
    </div>
  );
}

/** Format one cell exactly as its column declares — the PDF does the same. */
function cell(col, row) {
  const v = row[col.key];
  if (col.money) return num(v) === 0 ? <span className="muted">—</span> : bdt(v);
  if (col.key === 'date' || col.key === 'completed_at') return v ? dateFmt(v) : '—';
  if (v == null || v === '') return <span className="muted">—</span>;
  return String(v);
}

const toneColour = (tone) => (tone === 'in' ? 'var(--wt-green)' : tone === 'out' ? 'var(--wt-red)' : undefined);

export default function ReportView({
  kind,
  filters = {},
  compact = false,
  title: titleOverride,
  defaultPreset = '30d',
  onLoaded,
}) {
  const [range, setRange] = useState({ preset: defaultPreset, from: '', to: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const params = useCallback(() => {
    const p = { preset: range.preset, ...filters };
    if (range.preset === 'custom') {
      if (range.from) p.from = range.from;
      if (range.to) p.to = range.to;
    }
    return p;
  }, [range, filters]);

  const load = useCallback(() => {
    setLoading(true); setErr('');
    api.get(`/wt-reports/${kind}`, { params: params() })
      .then((r) => { setData(r.data); onLoaded?.(r.data); })
      .catch((e) => { setData(null); setErr(errText(e, 'Could not build this report')); })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, params]);

  useEffect(() => {
    // A custom range with no dates yet would ask the server for a default it
    // did not choose; wait until at least one end is set.
    if (range.preset === 'custom' && !range.from && !range.to) { setLoading(false); return; }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const openPdf = () => {
    const qs = new URLSearchParams(params()).toString();
    const url = `${api.defaults.baseURL || ''}/wt-reports/${kind}/pdf?${qs}`;
    const w = window.open(url, '_blank');
    if (!w) toast.err('Allow pop-ups to open the PDF.');
  };

  const actions = (
    <>
      <button className="wt-btn sm" onClick={load} disabled={loading}>
        {loading ? <Loader2 size={13} className="wt-spin" /> : <RefreshCw size={13} />} Refresh
      </button>
      <button className="wt-btn sm primary" onClick={openPdf} disabled={loading || !data}>
        <FileDown size={13} /> Download PDF
      </button>
    </>
  );

  return (
    <>
      <DateRangeBar value={range} onChange={setRange} right={actions} />

      {/* What narrowed this report, stated rather than implied. */}
      {Object.entries(filters).filter(([, v]) => v).length > 0 && (
        <div className="wt-note" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <Filter size={13} style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: 12.5 }}>
            Showing only {Object.entries(filters).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(', ')}.
          </span>
        </div>
      )}

      {loading ? <Loading /> : err ? (
        <div className="wt-card">
          <EmptyState eyebrow="Error" title="Could not build this report" hint={err}
            action={<button className="wt-btn" onClick={load}>Retry</button>} />
        </div>
      ) : !data ? (
        <div className="wt-card">
          <EmptyState eyebrow="Date range" title="Choose the dates"
            hint="Pick a start and an end date to build this report." />
        </div>
      ) : (
        <>
          {!compact && (
            <div style={{ marginBottom: 12 }}>
              <div className="wt-sec-title" style={{ marginBottom: 2 }}>{titleOverride || data.title}</div>
              <span className="muted" style={{ fontSize: 12.5 }}>
                {data.subtitle} · {data.range.label} ({data.range.from} to {data.range.to})
              </span>
            </div>
          )}

          {/* Headline figures. */}
          <div className="wt-kpis" style={{ marginBottom: 14 }}>
            {(data.summary?.headline || []).map((h) => (
              <div key={h.label} className="wt-card wt-kpi" style={{ padding: 14 }}>
                <div>
                  <div className="wt-kpi-label">{h.label}</div>
                  <div className="wt-kpi-value" style={{ color: toneColour(h.tone) }}>
                    {h.money ? bdt(h.value) : h.value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="wt-card wt-tblcard">
            {data.rows.length ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="wt-tbl">
                  <thead>
                    <tr>
                      {data.columns.map((c) => (
                        <th key={c.key} style={{ textAlign: c.align === 'right' ? 'right' : 'left', whiteSpace: 'nowrap' }}>
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row, i) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <tr key={i}>
                        {data.columns.map((c) => (
                          <td key={c.key} style={{
                            textAlign: c.align === 'right' ? 'right' : 'left',
                            fontWeight: c.money && num(row[c.key]) !== 0 ? 700 : undefined,
                            // Money in green, money out red, on every report — so
                            // a reader never has to work out which column this is.
                            color: c.money && num(row[c.key]) !== 0
                              ? (c.key === 'out' ? 'var(--wt-red)' : c.key === 'in' ? 'var(--wt-green)' : undefined)
                              : undefined,
                            whiteSpace: c.key === 'particulars' ? 'normal' : 'nowrap',
                          }}>
                            {cell(c, row)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  {/* A totals row for every money column except a running balance,
                      which has no meaningful sum. */}
                  <tfoot>
                    <tr style={{ borderTop: '2px solid var(--wt-accent-ink)', fontWeight: 800 }}>
                      {data.columns.map((c, i) => (
                        <td key={c.key} style={{ textAlign: c.align === 'right' ? 'right' : 'left', paddingTop: 10 }}>
                          {i === 0 ? 'Total' : (c.money && c.key !== 'balance'
                            ? bdt(data.rows.reduce((s, r) => s + num(r[c.key]), 0)) : '')}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <EmptyState eyebrow={data.range.label} title="Nothing in this period"
                hint="Widen the date range, or clear the filters." />
            )}
          </div>

          {/* Breakdowns — where the money went, which is the question a monthly
              review asks and a flat transaction list cannot answer. */}
          {(data.summary?.breakdowns || []).filter((b) => b.items?.length).length > 0 && (
            <div className="wt-grid2" style={{ marginTop: 14 }}>
              {data.summary.breakdowns.filter((b) => b.items?.length).map((b) => (
                <div key={b.title} className="wt-card" style={{ padding: 16 }}>
                  <div className="wt-sec-title" style={{ marginBottom: 10 }}>{b.title}</div>
                  <table className="wt-tbl">
                    <tbody>
                      {b.items.slice(0, 12).map((it) => (
                        <tr key={it.name}>
                          <td>{it.name}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, width: 130 }}>{bdt(it.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {b.items.length > 12 && (
                    <p className="muted" style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
                      … and {b.items.length - 12} more. The PDF carries the full list.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
