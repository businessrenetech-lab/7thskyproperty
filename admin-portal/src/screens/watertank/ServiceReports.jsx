import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Check, RotateCcw, Trash2, Eye, Image, FileText } from 'lucide-react';
import api from '../../services/api';
import ServiceReportModal from './ServiceReportModal';
import {
  WtHead,
  WtTabs,
  StatCards,
  dateFmt,
  Loading,
  EmptyState,
  WtDrawer,
  StatusCell,
  RowActions,
  useRoutedRecord,
  parseJson,
  toast,
  errText,
} from './common';

/*
 * Service Reports — SSPC-WTCM-SOP-02 Sec. 8 Step 10.
 * Providers must submit site assessment, cleaning, inspection, testing, repair
 * and AMC reports with before & after photos. Sec. 9 Step 11 says Seventh Sky then
 * verifies the work is complete and the reports are in before sign-off — so the
 * review action (Accept / Rework) is the point of this screen.
 */

const REPORT_TYPES = ['Site Assessment', 'Cleaning', 'Inspection', 'Testing', 'Repair', 'AMC'];
const STATUSES = ['Draft', 'Submitted', 'Accepted', 'Rework'];

function ReportDrawer({ record, providers, onClose, onSaved }) {
  const [f, setF] = useState({
    report_type: record?.report_type || 'Cleaning',
    work_order_code: record?.work_order_code || '',
    project_id: record?.project_id || '',
    client_name: record?.client_name || '',
    provider_id: record?.provider_id || '',
    provider_name: record?.provider_name || '',
    submitted_date: record?.submitted_date || new Date().toISOString().slice(0, 10),
    summary: record?.summary || '',
    findings: record?.findings || '',
    status: record?.status || 'Submitted',
    photos_before: parseJson(record?.photos_before, []) || [],
    photos_after: parseJson(record?.photos_after, []) || [],
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const addPhoto = (w) => set(w, [...f[w], { caption: '', url: '' }]);
  const setPhoto = (w, i, k, v) => set(w, f[w].map((p, j) => (j === i ? { ...p, [k]: v } : p)));
  const delPhoto = (w, i) => set(w, f[w].filter((_, j) => j !== i));

  const go = async () => {
    if (!f.report_type) { setErr('Choose a report type.'); return; }
    setBusy(true); setErr('');
    try {
      const provider = providers.find((p) => String(p.id) === String(f.provider_id));
      const body = { ...f, provider_name: provider?.business_name || f.provider_name || null, provider_id: f.provider_id || null };
      if (record?.id) await api.patch(`/wt-providers/reports/${record.id}`, body);
      else await api.post('/wt-providers/reports', body);
      onSaved();
    } catch (e) { setErr(errText(e, 'Could not save the report')); setBusy(false); }
  };

  return (
    <WtDrawer wide title={record?.code ? `Report ${record.code}` : 'New Service Report'}
      subtitle="Sec. 8 Step 10 — provider reporting" onClose={onClose}
      footer={<><button className="wt-btn" onClick={onClose}>Cancel</button>
        <button className="wt-btn primary" disabled={busy} onClick={go}>{busy ? 'Saving…' : 'Save report'}</button></>}>
      {err && <div className="wt-formerr">{err}</div>}
      <div className="wt-grid2">
        <div className="wt-field"><label>Report type *</label>
          <select className="wt-select" value={f.report_type} onChange={(e) => set('report_type', e.target.value)}>
            {REPORT_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select></div>
        <div className="wt-field"><label>Status</label>
          <select className="wt-select" value={f.status} onChange={(e) => set('status', e.target.value)}>
            {STATUSES.map((t) => <option key={t}>{t}</option>)}
          </select></div>
      </div>
      <div className="wt-field"><label>Provider</label>
        <select className="wt-select" value={f.provider_id} onChange={(e) => set('provider_id', e.target.value)}>
          <option value="">Select…</option>{providers.map((p) => <option key={p.id} value={p.id}>{p.business_name}</option>)}
        </select></div>
      <div className="wt-grid3">
        <div className="wt-field"><label>Client</label><input className="wt-input" value={f.client_name} onChange={(e) => set('client_name', e.target.value)} /></div>
        <div className="wt-field"><label>Work order</label><input className="wt-input" value={f.work_order_code} onChange={(e) => set('work_order_code', e.target.value)} /></div>
        <div className="wt-field"><label>Submitted</label><input className="wt-input" type="date" value={f.submitted_date || ''} onChange={(e) => set('submitted_date', e.target.value)} /></div>
      </div>
      <div className="wt-field"><label>Summary</label>
        <textarea className="wt-input" rows={3} style={{ resize: 'vertical' }} value={f.summary} onChange={(e) => set('summary', e.target.value)} /></div>
      <div className="wt-field"><label>Findings</label>
        <textarea className="wt-input" rows={3} style={{ resize: 'vertical' }} value={f.findings} onChange={(e) => set('findings', e.target.value)} /></div>
      {[['photos_before', 'Before photos'], ['photos_after', 'After photos']].map(([w, label]) => (
        <div className="wt-field" key={w}>
          <label>{label}</label>
          {f[w].map((p, i) => (
            <div className="wt-riskrow" key={i} style={{ gridTemplateColumns: '1fr 1fr 30px', marginBottom: 6 }}>
              <input className="wt-input" value={p.caption} onChange={(e) => setPhoto(w, i, 'caption', e.target.value)} placeholder="Caption" />
              <input className="wt-input" value={p.url} onChange={(e) => setPhoto(w, i, 'url', e.target.value)} placeholder="Image link" />
              <button className="wt-iconbtn" onClick={() => delPhoto(w, i)}>×</button>
            </div>
          ))}
          <button className="wt-btn" style={{ alignSelf: 'flex-start' }} onClick={() => addPhoto(w)}><Plus size={14} /> Add photo</button>
        </div>
      ))}
    </WtDrawer>
  );
}

export default function ServiceReports() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('All');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState(null);
  // A provider report is evidence attached to a job — it needs a URL someone can
  // be sent, not just a drawer over a list.
  const routed = useRoutedRecord({ rows, base: '/water-tank/reports', current: viewing, setCurrent: setViewing });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/wt-providers/reports').catch(() => ({ data: [] })),
      api.get('/wt-ops/providers').catch(() => ({ data: [] })),
    ]).then(([r, p]) => { setRows(r.data || []); setProviders(p.data || []); })
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const counts = useMemo(() => {
    const c = { All: rows.length };
    REPORT_TYPES.forEach((t) => { c[t] = rows.filter((r) => r.report_type === t).length; });
    return c;
  }, [rows]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => (tab === 'All' || r.report_type === tab)
      && (!term || [r.code, r.client_name, r.provider_name, r.work_order_code, r.summary].some((v) => String(v || '').toLowerCase().includes(term))));
  }, [rows, tab, q]);

  const review = async (r, status) => {
    try { await api.patch(`/wt-providers/reports/${r.id}`, { status }); toast.ok(`${r.code} ${status.toLowerCase()}`); load(); }
    catch (e) { toast.err(errText(e)); }
  };

  const pending = rows.filter((r) => r.status === 'Submitted').length;
  const accepted = rows.filter((r) => r.status === 'Accepted').length;
  const rework = rows.filter((r) => r.status === 'Rework').length;
  const withPhotos = rows.filter((r) => (parseJson(r.photos_before, []) || []).length || (parseJson(r.photos_after, []) || []).length).length;

  if (loading) return (<><WtHead title="Service Reports" subtitle="Sec. 8 Step 10 — provider reporting" /><Loading /></>);

  return (
    <>
      <WtHead
        title="Service Reports"
        subtitle="SSPC-WTCM-SOP-02 Sec. 8 Step 10 · verified at Sec. 9 Step 11 before completion sign-off"
        search={q} onSearch={setQ}
      >
        <button className="wt-btn" onClick={load}><RefreshCw size={14} /> Refresh</button>
        <button className="wt-btn primary" onClick={() => setCreating(true)}><Plus size={15} /> Log Report</button>
      </WtHead>

      <StatCards items={[
        { label: 'Awaiting Review', value: `${pending}`, sub: 'Submitted by providers', color: pending ? 'var(--wt-amber)' : undefined },
        { label: 'Accepted', value: `${accepted}`, sub: 'Verified at completion review', color: 'var(--wt-green)' },
        { label: 'Sent Back', value: `${rework}`, sub: 'Rework required', color: rework ? 'var(--wt-red)' : undefined },
        { label: 'With Photos', value: `${withPhotos}`, sub: `${rows.length} reports on file` },
      ]} />

      <WtTabs tabs={['All', ...REPORT_TYPES]} value={tab} onChange={setTab} counts={counts} />

      <div className="wt-card wt-tblcard">
        {shown.length ? (
          <table className="wt-tbl">
            <thead><tr><th style={{ width: 90 }}>Code</th><th style={{ width: 142 }}>Type</th><th>Client</th>
              <th style={{ width: 172 }}>Provider</th><th style={{ width: 104 }}>Work order</th>
              <th style={{ width: 106 }}>Submitted</th><th style={{ width: 74 }}>Photos</th>
              <th style={{ width: 128 }}>Status</th><th style={{ width: 44 }} /></tr></thead>
            <tbody>
              {shown.map((r) => {
                const nPhotos = (parseJson(r.photos_before, []) || []).length + (parseJson(r.photos_after, []) || []).length;
                return (
                  <tr key={r.id} className="click" onClick={() => routed.open(r)}>
                    <td className="id">{r.code}</td>
                    <td><strong>{r.report_type}</strong></td>
                    <td>{r.client_name || '—'}{r.summary && <div className="cell-sub">{r.summary.slice(0, 60)}{r.summary.length > 60 ? '…' : ''}</div>}</td>
                    <td className="muted">{r.provider_name || '—'}</td>
                    <td className="id">{r.work_order_code || '—'}</td>
                    <td className="muted">{dateFmt(r.submitted_date)}</td>
                    <td className="muted">{nPhotos ? <><Image size={11} style={{ verticalAlign: -1 }} /> {nPhotos}</> : '—'}</td>
                    <td><StatusCell value={r.status} options={STATUSES}
                      onChange={async (body) => { await api.patch(`/wt-providers/reports/${r.id}`, body); toast.ok(`${r.code} → ${body.status}`); load(); }} /></td>
                    <td>
                      <RowActions items={[
                        { label: 'View', icon: Eye, onClick: () => routed.open(r) },
                        { label: 'Edit', icon: FileText, onClick: () => setEditing(r) },
                        r.status === 'Submitted' && { label: 'Accept', icon: Check, onClick: () => review(r, 'Accepted') },
                        r.status === 'Submitted' && { label: 'Send back for rework', icon: RotateCcw, onClick: () => review(r, 'Rework') },
                        { label: 'Delete', icon: Trash2, danger: true, onClick: async () => { await api.delete(`/wt-providers/reports/${r.id}`); toast.ok('Report deleted'); load(); } },
                      ]} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyState eyebrow="Service Reports" title={q ? `Nothing matches “${q}”.` : `No ${tab === 'All' ? '' : `${tab} `}reports yet`}
            hint={q ? undefined : 'Sec. 8 Step 10 requires site assessment, cleaning, inspection, testing, repair and AMC reports with before & after photos.'}
            action={!q && <button className="wt-btn primary" onClick={() => setCreating(true)}><Plus size={14} /> Log the first report</button>} />
        )}
      </div>

      {creating && (
        <ServiceReportModal
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); load(); }} />
      )}

      {editing && (
        <ReportDrawer record={editing} providers={providers}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); toast.ok('Report saved'); load(); }} />
      )}

      {viewing && (
        <WtDrawer wide title={`${viewing.report_type} Report ${viewing.code}`}
          subtitle={[viewing.client_name, viewing.provider_name].filter(Boolean).join(' · ')}
          onClose={routed.close}
          footer={<>
            <button className="wt-btn" onClick={() => { setViewing(null); setEditing(viewing); }}>Edit</button>
            {viewing.status === 'Submitted' && <>
              <button className="wt-btn" onClick={() => { review(viewing, 'Rework'); setViewing(null); }}><RotateCcw size={14} /> Rework</button>
              <button className="wt-btn primary" onClick={() => { review(viewing, 'Accepted'); setViewing(null); }}><Check size={14} /> Accept</button>
            </>}
          </>}>
          <div className="wt-readfields">
            {[['Type', viewing.report_type], ['Client', viewing.client_name], ['Provider', viewing.provider_name],
              ['Work order', viewing.work_order_code], ['Project', viewing.project_id],
              ['Submitted', dateFmt(viewing.submitted_date)], ['Status', viewing.status],
              ['Reviewed by', viewing.reviewed_by], ['Reviewed', dateFmt(viewing.reviewed_date)]]
              .map(([k, v]) => <div className="wt-readfield" key={k}><div className="k">{k}</div><div className="v">{v || '—'}</div></div>)}
          </div>
          {viewing.summary && <><div className="wt-sec-title">Summary</div>
            <p style={{ fontSize: 12.5, color: 'var(--wt-ink-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{viewing.summary}</p></>}
          {viewing.findings && <><div className="wt-sec-title">Findings</div>
            <p style={{ fontSize: 12.5, color: 'var(--wt-ink-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{viewing.findings}</p></>}
          {[['photos_before', 'Before photos'], ['photos_after', 'After photos']].map(([w, label]) => {
            const list = parseJson(viewing[w], []) || [];
            return (
              <div key={w}>
                <div className="wt-sec-title">{label} ({list.length})</div>
                <div className="wt-photos">
                  {list.map((p, i) => <div key={i} className="wt-photo"><div className="ph"><Image size={22} /></div><div className="cap">{p.caption || `Photo ${i + 1}`}</div></div>)}
                  {!list.length && <span className="muted" style={{ fontSize: 12.5 }}>None.</span>}
                </div>
              </div>
            );
          })}
        </WtDrawer>
      )}
    </>
  );
}
