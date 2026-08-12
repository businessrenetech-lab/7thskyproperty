import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Repeat, AlertTriangle, FolderOpen, CheckCircle2, Wallet, Loader2,
} from 'lucide-react';
import api from '../../services/api';
import {
  WtHead, WtTabs, Pill, dateFmt, bdt, Loading, EmptyState, toast, errText,
} from './common';

/*
 * Projects index — SSPC-WTCM-SOP-01.
 * The rollups (progress, value, receivable, AMC) come from the server so the
 * table is not doing arithmetic over a client-side copy of the whole database.
 */

const money = (v) => bdt(Number(v || 0));
const STATUSES = ['Open', 'On Hold', 'Completed', 'Cancelled'];

export default function Projects() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [ov, setOv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('All');
  const [q, setQ] = useState('');
  const [stage, setStage] = useState('');
  const [amcOnly, setAmcOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [list, overview] = await Promise.all([
        api.get('/wt-projects'),
        api.get('/wt-projects/overview').catch(() => ({ data: null })),
      ]);
      setRows(list.data || []);
      setOv(overview.data);
    } catch (e) { setError(errText(e, 'Could not load projects')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c = { All: rows.length };
    STATUSES.forEach((s) => { c[s] = rows.filter((r) => String(r.status || '').toLowerCase() === s.toLowerCase()).length; });
    return c;
  }, [rows]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => (tab === 'All' || String(r.status || '').toLowerCase() === tab.toLowerCase())
      && (!stage || r.stage === stage)
      && (!amcOnly || r.under_amc)
      && (!term || [r.code, r.name, r.client_name, r.assigned_provider, r.site_address]
        .some((v) => String(v || '').toLowerCase().includes(term))));
  }, [rows, tab, q, stage, amcOnly]);

  const stageOptions = ov?.stage_counts || [];

  return (
    <>
      <WtHead
        title="Projects"
        subtitle="Every water-tank engagement from lead enquiry to AMC handover — SOP-01 Sec. 4"
      >
        <button className="wt-btn primary" onClick={() => nav('/water-tank/projects/new')}><Plus size={15} /> New Project</button>
      </WtHead>

      {ov && (
        <div className="wt-pkpis" style={{ marginBottom: 16 }}>
          <IdxKpi icon={FolderOpen} tone="accent" label="Active projects" value={ov.active}
            sub={`${ov.total} on file · ${ov.avg_progress}% avg progress`} />
          <IdxKpi icon={AlertTriangle} tone={ov.overdue > 0 ? 'red' : 'green'} label="Overdue" value={ov.overdue}
            sub={ov.at_risk ? `${ov.at_risk} due within 3 days` : 'None due within 3 days'} />
          <IdxKpi icon={CheckCircle2} tone="green" label="Completed" value={ov.completed}
            sub={ov.on_time_pct == null ? 'No completions yet' : `${ov.on_time_pct}% delivered on time`} />
          <IdxKpi icon={Repeat} tone="accent" label="Under AMC" value={ov.under_amc}
            sub="Recurring maintenance contracts" />
          <IdxKpi icon={Wallet} tone="slate" label="Contract value" value={money(ov.financials.contract_value)}
            sub={`${money(ov.financials.collected)} collected`} />
          <IdxKpi icon={Wallet} tone={ov.financials.receivable > 0 ? 'amber' : 'green'} label="Receivable" value={money(ov.financials.receivable)}
            sub={`${money(ov.financials.disbursed)} disbursed`} />
        </div>
      )}

      <WtTabs tabs={['All', ...STATUSES]} value={tab} onChange={setTab} counts={counts} />

      <div className="wt-filterbar">
        <label className="wt-search" style={{ width: 300 }}>
          <Search />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by code, name, client, provider or address…" />
        </label>
        <select className="wt-select" style={{ width: 210 }} value={stage} onChange={(e) => setStage(e.target.value)}>
          <option value="">All stages</option>
          {stageOptions.map((s) => <option key={s.stage} value={s.stage}>{s.stage} ({s.count})</option>)}
        </select>
        <label className="wt-toggle">
          <input type="checkbox" checked={amcOnly} onChange={(e) => setAmcOnly(e.target.checked)} />
          Under AMC only
        </label>
        {(q || stage || amcOnly) && (
          <button className="wt-btn sm" onClick={() => { setQ(''); setStage(''); setAmcOnly(false); }}>Clear filters</button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--wt-muted)' }}>
          {shown.length} of {rows.length}
        </span>
      </div>

      <div className="wt-card wt-tblcard">
        {loading ? <Loading /> : error ? (
          <EmptyState eyebrow="Error" title="Could not load projects" hint={error}
            action={<button className="wt-btn" onClick={load}>Retry</button>} />
        ) : (
          <table className="wt-tbl">
            <thead><tr>
              <th style={{ width: 116 }}>Project ID</th>
              <th>Project</th>
              <th style={{ width: 160 }}>Client</th>
              <th style={{ width: 160 }}>Stage</th>
              <th style={{ width: 150 }}>Progress</th>
              <th style={{ width: 120 }}>Target</th>
              <th style={{ width: 130, textAlign: 'right' }}>Value</th>
              <th style={{ width: 130, textAlign: 'right' }}>Receivable</th>
              <th style={{ width: 110 }}>Status</th>
            </tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="click" onClick={() => nav(`/water-tank/projects/${r.code}`)}>
                  <td className="id">{r.code}</td>
                  <td>
                    <strong style={{ display: 'block', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</strong>
                    <span style={{ fontSize: 11.5, color: 'var(--wt-muted)' }}>
                      {[r.assigned_provider || 'No provider', r.district].filter(Boolean).join(' · ')}
                    </span>
                    {!!r.under_amc && <span className="wt-tag amc"><Repeat size={10} /> AMC</span>}
                    {r.overdue && <span className="wt-tag red">Overdue</span>}
                    {!r.overdue && r.at_risk && <span className="wt-tag amber">Due soon</span>}
                  </td>
                  <td className="muted">{r.client_name || '—'}</td>
                  <td><span style={{ fontSize: 12.5 }}>{r.stage}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="wt-progress"><span style={{ width: `${r.progress_pct || 0}%` }} /></div>
                      <span style={{ fontSize: 11.5, color: 'var(--wt-muted)', width: 30 }}>{r.progress_pct || 0}%</span>
                    </div>
                  </td>
                  <td className="muted" style={{ color: r.overdue ? 'var(--wt-red)' : undefined }}>{dateFmt(r.target_completion)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{money(r.financials?.contract_value)}</td>
                  <td style={{ textAlign: 'right', color: Number(r.financials?.receivable) > 0 ? 'var(--wt-red)' : 'var(--wt-muted)' }}>
                    {money(r.financials?.receivable)}
                  </td>
                  <td><Pill value={r.status} sm /></td>
                </tr>
              ))}
              {!shown.length && (
                <tr className="wt-empty-row"><td colSpan={9}>
                  {q || stage || amcOnly ? 'Nothing matches those filters.' : `No projects in “${tab}”.`}
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function IdxKpi({ icon: Icon, label, value, sub, tone = 'slate' }) {
  return (
    <div className={`wt-card wt-pkpi tone-${tone}`}>
      <span className="ic"><Icon /></span>
      <span className="tx">
        <span className="lb">{label}</span>
        <span className="vl">{value}</span>
        {sub && <span className="sb">{sub}</span>}
      </span>
    </div>
  );
}

export { Projects };
