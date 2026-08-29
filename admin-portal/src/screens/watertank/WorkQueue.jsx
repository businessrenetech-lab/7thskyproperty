import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, ArrowRight, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import api from '../../services/api';
import { useSvcNav, WtHead, Loading, EmptyState, errText, dateFmt, bdt } from './common';

/*
 * My Work Queue — the one screen that answers "what needs me today".
 *
 * Every register in this console already lists its own records. What none of
 * them could answer was the question an operator actually starts the day with,
 * because it crosses registers: an unsent quotation, an unassigned work order
 * and an overdue invoice are the same kind of problem — something is waiting on
 * a person — and they lived on three different screens.
 *
 * Built entirely from data that already exists. Nothing here is a new status
 * field or a new workflow; it is the existing records, filtered by whether they
 * are stuck.
 */

const SEVERITY = {
  late: { label: 'Overdue', icon: AlertTriangle, cls: 'late' },
  due: { label: 'Waiting', icon: Clock, cls: 'due' },
};

/* Registers store different shapes; this pulls a sensible line out of any of them. */
const titleOf = (r) => r.code || r.name || r.client_name || `#${r.id}`;
const subtitleOf = (r) => [
  r.code && r.client_name ? r.client_name : null,
  r.provider_name, r.specific_service || r.category || r.visit_type || r.inv_type,
  r.target_date ? `target ${dateFmt(r.target_date)}` : null,
  r.due_date ? `due ${dateFmt(r.due_date)}` : null,
  r.assessed_date ? `booked ${dateFmt(r.assessed_date)}` : null,
  r.amount != null && Number(r.amount) > 0 ? bdt(r.amount) : null,
].filter(Boolean).join(' · ');

export default function WorkQueue() {
  const nav = useSvcNav();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [only, setOnly] = useState('all');

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.get('/wt-ops/work-queue')
      .then((r) => setData(r.data))
      .catch((e) => { setData(null); setError(errText(e, 'Could not load the work queue')); })
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const queues = (data?.queues || []).filter((q) => only === 'all' || q.severity === only);

  if (loading) return (<><WtHead title="My Work Queue" subtitle="Everything waiting on someone, across the whole console" /><Loading /></>);

  if (error) return (
    <>
      <WtHead title="My Work Queue" subtitle="Everything waiting on someone, across the whole console" />
      <div className="wt-card"><EmptyState eyebrow="Error" title="Could not load the work queue" hint={error}
        action={<button className="wt-btn primary" onClick={load}><RefreshCw size={14} /> Retry</button>} /></div>
    </>
  );

  return (
    <>
      <WtHead title="My Work Queue" subtitle="Everything waiting on someone, across the whole console">
        <button className="wt-btn" onClick={load}><RefreshCw size={14} /> Refresh</button>
      </WtHead>

      <div className="wt-kpis">
        <div className="wt-card wt-kpi">
          <span className="wt-kpi-label">Records waiting</span><b>{data.total}</b>
          <span className="wt-kpi-sub">counted once each, not per reason</span>
        </div>
        <div className="wt-card wt-kpi">
          <span className="wt-kpi-label">Past a promised date</span>
          <b style={{ color: data.late ? 'var(--wt-red)' : undefined }}>{data.late}</b>
          <span className="wt-kpi-sub">these have already slipped</span>
        </div>
        <div className="wt-card wt-kpi">
          <span className="wt-kpi-label">Queues with work</span><b>{data.queues.length}</b>
        </div>
      </div>

      <div className="wt-card" style={{ padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <span className="wt-subtitle" style={{ margin: 0 }}>Show</span>
        {[['all', 'Everything'], ['late', 'Overdue only'], ['due', 'Waiting only']].map(([k, l]) => (
          <button key={k} className={`wt-btn sm${only === k ? ' primary' : ''}`} onClick={() => setOnly(k)}>{l}</button>
        ))}
      </div>

      {queues.length === 0 ? (
        <div className="wt-card">
          <EmptyState
            eyebrow="Work queue"
            title={only === 'all' ? 'Nothing is waiting' : 'Nothing in this filter'}
            hint={only === 'all'
              ? 'Every request is qualified, every quotation sent, every work order assigned and every invoice collected.'
              : undefined}
          />
        </div>
      ) : queues.map((q) => {
        const s = SEVERITY[q.severity] || SEVERITY.due;
        const Icon = s.icon;
        return (
          <div className="wt-card wt-tblcard" key={q.key}>
            <div style={{ padding: '16px 20px 0' }}>
              <div className="wt-panel-head">
                <div>
                  <h2 className="wt-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon size={15} style={{ color: q.severity === 'late' ? 'var(--wt-red)' : '#b45309' }} />
                    {q.label}
                    <span className={`wt-badge ${s.cls}`} style={{ marginLeft: 0 }}>{q.count}</span>
                  </h2>
                  {q.hint && <p className="wt-subtitle" style={{ marginBottom: 8 }}>{q.hint}</p>}
                </div>
                <button className="wt-btn sm" onClick={() => nav(q.to)}>
                  Open register <ArrowRight size={13} />
                </button>
              </div>
            </div>

            <table className="wt-tbl">
              <tbody>
                {q.rows.map((r) => (
                  <tr key={`${q.key}-${r.id}`}>
                    <td className="id" style={{ width: 130 }}>{titleOf(r)}</td>
                    <td className="muted">{subtitleOf(r) || '—'}</td>
                    <td style={{ width: 120, textAlign: 'right' }}>
                      <button className="wt-btn sm" onClick={() => nav(q.to)}>Go</button>
                    </td>
                  </tr>
                ))}
                {/*
                  * Only the first handful travel with the payload — the queue is a
                  * prompt to act, not another register. The rest are one click away.
                  */}
                {q.count > q.rows.length && (
                  <tr>
                    <td colSpan={3} className="muted" style={{ textAlign: 'center', fontSize: 12 }}>
                      and {q.count - q.rows.length} more —{' '}
                      <button className="wt-btn sm" onClick={() => nav(q.to)}>see all in the register</button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      })}

      {data.total === 0 && (
        <div className="wt-card" style={{ padding: 24, display: 'flex', gap: 10, alignItems: 'center' }}>
          <CheckCircle2 size={18} style={{ color: 'var(--wt-green, #059669)' }} />
          <span>Nothing is waiting on anyone right now.</span>
        </div>
      )}
    </>
  );
}
