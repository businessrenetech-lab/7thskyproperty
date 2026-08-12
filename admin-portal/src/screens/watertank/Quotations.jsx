import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Trash2, ChevronRight, Send, FileSignature, Pencil, ClipboardList, Plus } from 'lucide-react';
import {
  WtHead, WtTabs, StatCards, dateFmt, bdt, useCollection, StatusCell, RowActions,
  Loading, EmptyState, useFocusedRecord, parseJson, toast, errText,
} from './common';

/*
 * Quotations — SSPC-WTCM-SOP-01 Sec. 7 Step 5.
 * The register: KPI cards and the list, nothing else. Opening a row goes to its
 * own route (/water-tank/quotations/:code) where the cost sheet, the actions
 * and the comment thread live.
 */

const DECISIONS = ['Pending', 'Sent', 'Approved', 'Rejected'];
const TABS = ['All', ...DECISIONS];
const num = (v) => Number(v || 0);
const lineCount = (r) => (parseJson(r.lines, []) || []).length;

export default function Quotations() {
  const nav = useNavigate();
  const { rows, loading, error, reload, patch, remove } = useCollection('quotations');
  const [tab, setTab] = useState('All');
  const [q, setQ] = useState('');

  const open = (r) => nav(`/water-tank/quotations/${r.code}`);
  useFocusedRecord(rows, open);

  const counts = useMemo(() => {
    const c = { All: rows.length };
    DECISIONS.forEach((d) => { c[d] = rows.filter((r) => (r.decision || '').toLowerCase() === d.toLowerCase()).length; });
    return c;
  }, [rows]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => (tab === 'All' || (r.decision || '').toLowerCase() === tab.toLowerCase())
      && (!term || [r.code, r.client_name, r.project_id, r.source_assessment]
        .some((v) => String(v || '').toLowerCase().includes(term))));
  }, [rows, tab, q]);

  // register figures, computed from the quotations on file
  const stats = useMemo(() => {
    const is = (r, d) => (r.decision || '').toLowerCase() === d;
    const approved = rows.filter((r) => is(r, 'approved'));
    const awaiting = rows.filter((r) => is(r, 'pending') || is(r, 'sent'));
    const decided = rows.filter((r) => is(r, 'approved') || is(r, 'rejected'));
    return {
      pipeline: awaiting.reduce((s, r) => s + num(r.total), 0),
      pipelineCount: awaiting.length,
      won: approved.reduce((s, r) => s + num(r.total), 0),
      wonCount: approved.length,
      winRate: decided.length ? Math.round((approved.length / decided.length) * 100) : null,
      unsent: rows.filter((r) => !r.sent_at && !is(r, 'rejected')).length,
      avg: rows.length ? Math.round(rows.reduce((s, r) => s + num(r.total), 0) / rows.length) : 0,
      converted: approved.filter((r) => r.agreement_code).length,
    };
  }, [rows]);

  return (
    <>
      <WtHead
        title="Quotations"
        subtitle="Sec. 7 Step 5 — priced from the Customer Service Agreement schedule"
        search={q} onSearch={setQ}
      >
        {/* Two routes into a quotation: assess first (Sec. 6) or price it
            directly when the job is already understood (Sec. 7 Step 5). */}
        <button className="wt-btn" onClick={() => nav('/water-tank/site-assessments')}>
          <ClipboardList size={15} /> Build from an assessment
        </button>
        <button className="wt-btn primary" onClick={() => nav('/water-tank/quotations/new')}>
          <Plus size={15} /> Create quotation
        </button>
      </WtHead>

      <StatCards items={[
        { label: 'Open Pipeline', value: bdt(stats.pipeline), sub: `${stats.pipelineCount} awaiting a decision`, color: stats.pipelineCount ? 'var(--wt-amber)' : undefined },
        { label: 'Approved Value', value: bdt(stats.won), sub: `${stats.wonCount} approved · ${stats.converted} turned into agreements`, color: 'var(--wt-green)' },
        { label: 'Win Rate', value: stats.winRate == null ? '—' : `${stats.winRate}%`, sub: 'Approved vs. decided quotations' },
        { label: 'Not Yet Sent', value: `${stats.unsent}`, sub: stats.unsent ? 'Sitting with no email out' : 'All quotations issued', color: stats.unsent ? 'var(--wt-red)' : undefined },
      ]} />

      <WtTabs tabs={TABS} value={tab} onChange={setTab} counts={counts} />

      <div className="wt-card wt-tblcard">
        {loading ? <Loading /> : error ? (
          <EmptyState eyebrow="Error" title="Could not load quotations" hint={error}
            action={<button className="wt-btn" onClick={reload}>Retry</button>} />
        ) : shown.length ? (
          <>
            <table className="wt-tbl">
              <thead><tr>
                <th style={{ width: 92 }}>Quote No</th><th>Client</th><th style={{ width: 104 }}>Project</th>
                <th style={{ width: 106 }}>Assessment</th><th style={{ width: 60 }}>Lines</th>
                <th style={{ width: 116, textAlign: 'right' }}>Total</th><th style={{ width: 96 }}>Validity</th>
                <th style={{ width: 108 }}>Sent</th><th style={{ width: 128 }}>Decision</th>
                <th style={{ width: 44 }} /><th style={{ width: 28 }} />
              </tr></thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} className="click" onClick={() => open(r)}>
                    <td className="id">{r.code}</td>
                    <td>
                      <strong>{r.client_name}</strong>
                      {r.agreement_code && <span className="cell-sub" style={{ color: 'var(--wt-green)' }}>Agreement {r.agreement_code}</span>}
                    </td>
                    <td className="muted">{r.project_id || '—'}</td>
                    <td className="id">{r.source_assessment || '—'}</td>
                    <td className="muted">{lineCount(r) || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{bdt(r.total)}</td>
                    <td className="muted">{r.validity || '—'}</td>
                    <td className="muted">
                      {r.sent_at
                        ? <span style={{ color: 'var(--wt-green)' }}><Send size={10} style={{ verticalAlign: -1 }} /> {dateFmt(r.sent_at)}</span>
                        : <span style={{ color: 'var(--wt-amber)' }}>Not sent</span>}
                    </td>
                    <td>
                      <StatusCell value={r.decision} options={DECISIONS} field="decision"
                        onChange={(body) => patch(r.id, body, `${r.code} → ${body.decision}`)} />
                    </td>
                    <td>
                      <RowActions items={[
                        { label: 'Open quotation', icon: Eye, onClick: () => open(r) },
                        { label: 'Edit lines', icon: Pencil, onClick: () => nav(r.source_assessment
                          ? `/water-tank/site-assessments/${r.source_assessment}/quotation`
                          : `/water-tank/quotations/${r.code}/edit`) },
                        (r.decision || '').toLowerCase() === 'approved' && !r.agreement_code && {
                          label: 'Create Service Agreement', icon: FileSignature,
                          onClick: () => nav(r.source_assessment
                            ? `/water-tank/site-assessments/${r.source_assessment}/quotation/${r.code}/agreement`
                            : `/water-tank/quotations/${r.code}/agreement`),
                        },
                        { label: 'Delete', icon: Trash2, danger: true, onClick: () => remove(r.id, `${r.code} deleted`).catch((e) => toast.err(errText(e))) },
                      ]} />
                    </td>
                    <td><ChevronRight size={15} style={{ color: 'var(--wt-muted)' }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="wt-tblfoot">
              <span>Showing {shown.length} of {rows.length} quotation{rows.length === 1 ? '' : 's'}</span>
              <span style={{ marginLeft: 'auto' }}>Average value {bdt(stats.avg)}</span>
            </div>
          </>
        ) : (
          <EmptyState
            eyebrow="Quotations"
            title={q ? `Nothing matches “${q}”.` : `No quotations in “${tab}”.`}
            hint={q ? undefined : 'Quotations are built from a completed site assessment, so the recommended services and their prices carry across.'}
            action={!q && <button className="wt-btn primary" onClick={() => nav('/water-tank/site-assessments')}>
              <ClipboardList size={14} /> Go to site assessments
            </button>}
          />
        )}
      </div>
    </>
  );
}
