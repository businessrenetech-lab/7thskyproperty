import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Eye, ChevronRight, AlertTriangle, FileText } from 'lucide-react';
import {
  WtHead, WtTabs, StatCards, dateFmt, useCollection, StatusCell, RowActions,
  Loading, EmptyState, useFocusedRecord, parseJson, toast, errText,
} from './common';

/*
 * Site Assessments — SSPC-WTCM-SOP-02 Sec. 8 Step 8.
 * This screen is the register: KPI cards and the list, nothing else.
 * Opening a row goes to its own route (/water-tank/site-assessments/:code)
 * where the full assessment report lives.
 */

const STATUSES = ['Scheduled', 'In Progress', 'Completed', 'Cancelled'];
const BASE_CHECKS = 9; // the standard safety list; templates and assessors add more
const TABS = ['All', ...STATUSES];

const riskCount = (r) => (parseJson(r.risks, []) || []).length;
const photoCount = (r) => (parseJson(r.photos, []) || []).length + (parseJson(r.photos_after, []) || []).length;
// A record's checklist can carry standard, template and assessor-added items,
// so the totals come from the record itself rather than a fixed list.
const checkTotals = (r) => {
  const cl = parseJson(r.checklist, {}) || {};
  const custom = parseJson(r.custom_checks, []) || [];
  const keys = new Set([...Object.keys(cl), ...custom.map((c) => c.key)]);
  const done = [...keys].filter((k) => cl[k] === true).length;
  return { done, total: Math.max(keys.size, BASE_CHECKS) };
};
const hasHighRisk = (r) => (parseJson(r.risks, []) || [])
  .some((x) => ['high', 'critical'].includes(String(x.level || '').toLowerCase()));

export default function SiteAssessments() {
  const nav = useNavigate();
  const { rows, loading, error, reload, patch, remove } = useCollection('site-assessments');
  const [tab, setTab] = useState('All');
  const [q, setQ] = useState('');

  const open = (r) => nav(`/water-tank/site-assessments/${r.code}`);
  useFocusedRecord(rows, open);

  const counts = useMemo(() => {
    const c = { All: rows.length };
    STATUSES.forEach((s) => { c[s] = rows.filter((r) => (r.status || '').toLowerCase() === s.toLowerCase()).length; });
    return c;
  }, [rows]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => (tab === 'All' || (r.status || '').toLowerCase() === tab.toLowerCase())
      && (!term || [r.code, r.client_name, r.provider, r.project_id, r.contamination, r.assessor, r.tank_type]
        .some((v) => String(v || '').toLowerCase().includes(term))));
  }, [rows, tab, q]);

  // register-level figures, computed from the assessments on file
  const stats = useMemo(() => {
    const is = (r, s) => (r.status || '').toLowerCase() === s;
    const scheduled = rows.filter((r) => is(r, 'scheduled'));
    const completed = rows.filter((r) => is(r, 'completed'));
    const flagged = rows.filter(hasHighRisk);
    const fullyChecked = completed.filter((r) => { const t = checkTotals(r); return t.total > 0 && t.done === t.total; });
    return {
      scheduled: scheduled.length,
      completed: completed.length,
      flagged: flagged.length,
      safetyRate: completed.length ? Math.round((fullyChecked.length / completed.length) * 100) : null,
      awaitingScope: completed.filter((r) => !r.scope_confirmed).length,
    };
  }, [rows]);

  return (
    <>
      <WtHead
        title="Site Assessments"
        subtitle="Sec. 8 Step 8 — inspect site, confirm scope, identify risks and variations. Assessments normally start from a Service Request."
        search={q} onSearch={setQ}
      >
        <button className="wt-btn" onClick={() => nav('/water-tank/site-assessments/new')}><Plus size={15} /> New Assessment</button>
      </WtHead>

      <StatCards items={[
        { label: 'Scheduled', value: `${stats.scheduled}`, sub: 'Awaiting the site visit', color: stats.scheduled ? 'var(--wt-amber)' : undefined },
        { label: 'Completed', value: `${stats.completed}`, sub: `${stats.awaitingScope} not yet scope-confirmed` },
        { label: 'Safety Verification', value: stats.safetyRate == null ? '—' : `${stats.safetyRate}%`, sub: 'Completed visits with every check verified', color: 'var(--wt-green)' },
        { label: 'High-Risk Findings', value: `${stats.flagged}`, sub: stats.flagged ? 'Need a control measure and a decision' : 'None flagged', color: stats.flagged ? 'var(--wt-red)' : undefined },
      ]} />

      <WtTabs tabs={TABS} value={tab} onChange={setTab} counts={counts} />

      <div className="wt-card wt-tblcard">
        {loading ? <Loading /> : error ? (
          <EmptyState eyebrow="Error" title="Could not load assessments" hint={error}
            action={<button className="wt-btn" onClick={reload}>Retry</button>} />
        ) : shown.length ? (
          <>
            <table className="wt-tbl">
              <thead><tr>
                <th style={{ width: 106 }}>Assessment</th><th>Client</th><th style={{ width: 150 }}>Tank</th>
                <th style={{ width: 140 }}>Provider</th><th style={{ width: 108 }}>Date</th>
                <th style={{ width: 96 }}>Safety</th><th style={{ width: 78 }}>Risks</th><th style={{ width: 80 }}>Photos</th>
                <th style={{ width: 134 }}>Status</th><th style={{ width: 44 }} /><th style={{ width: 28 }} />
              </tr></thead>
              <tbody>
                {shown.map((r) => {
                  const { done, total } = checkTotals(r);
                  const nRisk = riskCount(r);
                  const flagged = hasHighRisk(r);
                  return (
                    <tr key={r.id} className="click" onClick={() => open(r)}>
                      <td className="id">{r.code}</td>
                      <td>
                        <strong>{r.client_name}</strong>
                        {r.project_id && <span className="cell-sub">{r.project_id}</span>}
                      </td>
                      <td className="muted">{[r.tank_type, r.tank_capacity].filter(Boolean).join(' · ') || '—'}</td>
                      <td className="muted">{r.provider || '—'}</td>
                      <td className="muted">{dateFmt(r.assessed_date)}</td>
                      <td>
                        <div className="wt-readiness">
                          <div className="bar"><span style={{ width: `${total ? (done / total) * 100 : 0}%`, background: done === total ? 'var(--wt-green)' : 'var(--wt-amber)' }} /></div>
                          <span className="n">{done}/{total}</span>
                        </div>
                      </td>
                      <td>
                        {nRisk
                          ? <span className={`wt-pill sm ${flagged ? 'red' : 'amber'}`}>{flagged && <AlertTriangle size={9} />} {nRisk}</span>
                          : <span className="muted">—</span>}
                      </td>
                      <td className="muted">{photoCount(r) || '—'}</td>
                      <td>
                        <StatusCell value={r.status} options={STATUSES}
                          onChange={(body) => patch(r.id, body, `${r.code} → ${body.status}`)} />
                      </td>
                      <td>
                        <RowActions items={[
                          { label: 'Open assessment', icon: Eye, onClick: () => open(r) },
                          { label: 'Build Quotation', icon: FileText, onClick: () => nav(`/water-tank/site-assessments/${r.code}/quotation`) },
                          { label: 'Delete', icon: Trash2, danger: true, onClick: () => remove(r.id, `${r.code} deleted`).catch((e) => toast.err(errText(e))) },
                        ]} />
                      </td>
                      <td><ChevronRight size={15} style={{ color: 'var(--wt-muted)' }} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="wt-tblfoot">
              <span>Showing {shown.length} of {rows.length} assessment{rows.length === 1 ? '' : 's'}</span>
            </div>
          </>
        ) : (
          <EmptyState
            eyebrow="Site Assessments"
            title={q ? `Nothing matches “${q}”.` : `No assessments in “${tab}”.`}
            hint={q ? undefined : 'Schedule an assessment from a service request, or create one directly.'}
            action={!q && <button className="wt-btn primary" onClick={() => nav('/water-tank/site-assessments/new')}><Plus size={14} /> New assessment</button>}
          />
        )}
      </div>
    </>
  );
}
