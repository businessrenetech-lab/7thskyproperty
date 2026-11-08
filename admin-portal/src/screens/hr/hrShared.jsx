import React, { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import '../../styles/hrm.css';

/*
 * Shared pieces for the HRM screens (organisation, approvals, reports, access).
 * The server decides what each person may do; useHrMe only hides what would fail.
 */

export const errText = (e, fallback = 'Something went wrong. Try again.') => e?.response?.data?.error || fallback;

/** GET a URL; reload() fetches again. */
export function useGet(url, params) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const key = JSON.stringify(params || {});
  const load = useCallback(() => {
    if (!url) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    api.get(url, { params })
      .then((r) => setState({ data: r.data, error: null, loading: false }))
      .catch((e) => setState({ data: null, error: errText(e, 'This could not be loaded.'), loading: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, key]);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}

/** What the signed-in person may do in HR: { role, role_label, can: { 'org.edit': true, … } }. */
let meCache = null;
export function useHrMe() {
  const [me, setMe] = useState(meCache);
  useEffect(() => {
    if (meCache) return;
    api.get('/hr/access/me').then((r) => { meCache = r.data; setMe(r.data); }).catch(() => setMe({ role: null, can: {} }));
  }, []);
  return { me, can: (action) => Boolean(me?.can?.[action]) };
}
export const forgetHrMe = () => { meCache = null; };

/** Every row of one organisation level (active and inactive). */
export const fetchLevel = (level) => api.get(`/hr/org/${level}`, { params: { all: 1 } }).then((r) => r.data.data);

export const LEVEL = {
  companies: { one: 'Company', name: 'name' },
  divisions: { one: 'Division', name: 'name' },
  departments: { one: 'Department', name: 'name' },
  teams: { one: 'Team', name: 'name' },
  positions: { one: 'Position', name: 'title' },
  'cost-centres': { one: 'Cost centre', name: 'name' },
  'salary-grades': { one: 'Salary grade', name: 'name' },
};

export const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Probation', 'Intern', 'Field staff', 'Consultant'];

export const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const ago = (v) => {
  if (!v) return '';
  const m = Math.max(0, Math.round((Date.now() - new Date(v).getTime()) / 60000));
  if (m < 60) return `${m} min`;
  if (m < 60 * 24) return `${Math.round(m / 60)} h`;
  return `${Math.round(m / 1440)} d`;
};

export const Tag = ({ tone = 'slate', children }) => <span className={`hrm-tag ${tone}`}>{children}</span>;

export function Loading({ error, reload }) {
  if (error) {
    return (
      <div className="hrm-error" role="alert">
        <span>{error}</span>
        {reload && <button type="button" className="hrm-link" onClick={reload}>Try again</button>}
      </div>
    );
  }
  return <div className="hrm-skel" aria-busy="true" aria-label="Loading" />;
}

export const Info = ({ label, children, tone }) => (
  <div className="hrm-info">
    <span>{label}</span>
    <b className={tone || ''}>{children ?? '—'}</b>
  </div>
);
