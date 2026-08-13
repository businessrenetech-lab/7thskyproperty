import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Loader2, Briefcase, MapPin } from 'lucide-react';
import api from '../../services/api';
import { dateFmt, Pill } from './common';

/*
 * JobPicker — "which job is this about?", asked once.
 *
 * Service reports, warranties, complaints and incidents all describe work that
 * was done, and all four used to ask for the client, work order and project as
 * free text with no property field at all. Picking the job instead means the
 * client, project, property and provider are resolved on the SERVER, so a record
 * can no longer name a client who was not the client on the job.
 *
 * One component rather than one per screen, for the same reason the backend has
 * one wtJobContext.service: four copies of this drift, and then two screens
 * disagree about what a job is.
 *
 * `countKey` names which existing-record count to warn about. An operator about
 * to file a second report, or register a second warranty, for the same visit
 * usually did not mean to — and cannot see it any other way.
 */

const COUNT_WORDS = {
  reports: ['report', 'reports'],
  warranties: ['warranty', 'warranties'],
  complaints: ['complaint', 'complaints'],
  incidents: ['incident', 'incidents'],
};

export default function JobPicker({
  endpoint = '/wt-ops/registers/jobs',
  providerFilter,
  countKey,
  label = 'Find the job this is about',
  hint = 'Everything else — client, project, property, provider — is taken from the job, so it cannot disagree with it.',
  onPick,
}) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const timer = useRef(null);

  const load = useCallback((term) => {
    setLoading(true);
    const params = {};
    if (term) params.q = term;
    if (providerFilter) params.provider_id = providerFilter;
    api.get(endpoint, { params })
      .then((r) => setRows(Array.isArray(r.data) ? r.data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [endpoint, providerFilter]);

  // Debounced: this fires on every keystroke and each call joins several tables.
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => load(q.trim()), 220);
    return () => clearTimeout(timer.current);
  }, [q, load]);

  const countFor = (j) => (countKey ? Number(j.existing?.[countKey] || 0) : 0);

  return (
    <>
      <div className="wt-field">
        <label>{label}</label>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: 11, color: 'var(--wt-muted)' }} />
          <input className="wt-input" style={{ paddingLeft: 34 }} autoFocus
            placeholder="Work order, client, project, provider or address…"
            value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <span className="hint">{hint}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 380, overflowY: 'auto' }}>
        {loading && <div className="muted" style={{ padding: 20, textAlign: 'center' }}><Loader2 size={16} className="wt-spin" /> Searching…</div>}

        {!loading && rows.length === 0 && (
          <div className="muted" style={{ padding: 24, textAlign: 'center', fontSize: 13 }}>
            {q ? `No job matches “${q}”.` : 'No work orders on file yet.'}
          </div>
        )}

        {!loading && rows.map((j) => {
          const n = countFor(j);
          const [one, many] = COUNT_WORDS[countKey] || ['record', 'records'];
          return (
            <button key={j.code} className="wt-pickrow" onClick={() => onPick(j)}>
              <span className="wt-pickrow-mark"><Briefcase size={15} /></span>
              <span style={{ flex: '1 0 0', minWidth: 0, textAlign: 'left' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <strong>{j.code}</strong>
                  <Pill value={j.status} sm />
                  {n > 0 && (
                    <span className="wt-chip warn">
                      {n} {n === 1 ? one : many} already on this job
                    </span>
                  )}
                </span>
                <span className="muted" style={{ display: 'block', fontSize: 12, marginTop: 2 }}>
                  {j.client?.name || 'Unknown client'}
                  {j.project?.code ? ` · ${j.project.code}` : ''}
                  {j.provider?.name ? ` · ${j.provider.name}` : ' · unassigned'}
                </span>
                {j.site_address && (
                  <span className="muted" style={{ display: 'block', fontSize: 11.5 }}>
                    <MapPin size={10} style={{ verticalAlign: -1 }} /> {j.site_address}
                  </span>
                )}
              </span>
              <span className="muted" style={{ fontSize: 11.5, whiteSpace: 'nowrap' }}>
                {j.completed_at ? dateFmt(j.completed_at)
                  : j.scheduled_date ? dateFmt(j.scheduled_date)
                    : j.target_date ? dateFmt(j.target_date) : ''}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

/** The resolved job, shown read-only — facts from the work order, not inputs. */
export function JobContextCard({ job, onChange, children }) {
  return (
    <div className="wt-ctxcard">
      <div className="wt-ctxcard-head">
        <span><Briefcase size={14} /> <strong>{job.code}</strong> <Pill value={job.status} sm /></span>
        {onChange && <button className="wt-btn sm" onClick={onChange}>Change job</button>}
      </div>
      <div className="wt-ctxgrid">
        <span><span className="muted">Client</span><b>{job.client?.name || '—'}</b></span>
        <span><span className="muted">Project</span><b>{job.project?.code || '—'}</b></span>
        <span><span className="muted">Property</span><b>{job.site_address || '—'}</b></span>
        <span><span className="muted">Provider</span><b>{job.provider?.name || 'Seventh Sky'}</b></span>
        <span><span className="muted">Service</span><b>{job.category || '—'}</b></span>
        <span>
          <span className="muted">Completed</span>
          <b>{job.completed_at ? dateFmt(job.completed_at) : job.scheduled_date ? dateFmt(job.scheduled_date) : '—'}</b>
        </span>
      </div>
      {children}
    </div>
  );
}
