import React, { useEffect, useState } from 'react';
import api from '../../../services/api';
import '../../../styles/recruit.css';
import { errText } from '../hrShared';

/* Shared pieces for the recruitment screens (plan Task 21). The server decides who may do what; meta.canManage
   only hides HR actions from department managers. */

let metaCache = null;
export function useRecMeta() {
  const [meta, setMeta] = useState(metaCache);
  const [error, setError] = useState(null);
  const load = () => api.get('/hr/recruitment/meta').then((r) => { metaCache = r.data; setMeta(r.data); }).catch((e) => setError(errText(e, 'Recruitment settings could not be loaded.')));
  useEffect(() => { if (!metaCache) load(); }, []);
  return { meta, error, reload: () => { metaCache = null; load(); } };
}

/** The board columns of the approved pipeline frame, each holding one or more applicant statuses (M3 §10). */
export const COLUMNS = [
  { key: 'applied', label: 'Applied', sub: 'Received', statuses: ['Application Received'] },
  { key: 'screening', label: 'Screening', sub: 'Under review', statuses: ['Under Review'] },
  { key: 'shortlisted', label: 'Shortlisted', sub: 'Shortlisted', statuses: ['Shortlisted'] },
  { key: 'interview', label: 'Interview', sub: 'Scheduled · Completed', statuses: ['Interview Scheduled', 'Interview Completed'] },
  { key: 'assessment', label: 'Assessment', sub: 'Pending · Completed', statuses: ['Assessment Pending', 'Assessment Completed'] },
  { key: 'checks', label: 'Checks', sub: 'Reference check', statuses: ['Reference Check'] },
  { key: 'offer', label: 'Offer', sub: 'Pending · Sent · Accepted', statuses: ['Offer Pending', 'Offer Sent', 'Offer Accepted'] },
];
export const CLOSED = ['Not Selected', 'Offer Declined', 'Talent Pool'];

export const statusTone = (s) => (s === 'Offer Accepted' ? 'green' : CLOSED.includes(s) ? 'slate' : s.startsWith('Offer') ? 'blue' : 'amber');
export const vacancyTone = { published: 'green', pending_approval: 'amber', draft: 'slate', closed: 'slate', filled: 'blue' };
export const vacancyLabel = { published: 'Open', pending_approval: 'Waiting for approval', draft: 'Draft', closed: 'Closed', filled: 'Filled' };
export const priorityTone = { Critical: 'red', High: 'amber', Normal: 'slate', Future: 'blue' };

const AV = ['#0EA5A4', '#2563EB', '#7C3AED', '#EA580C', '#16A34A', '#DB2777', '#0891B2'];
export function Avatar({ name }) {
  const init = String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const hue = AV[[...String(name || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % AV.length];
  return <span className="rec-av" style={{ background: hue }} aria-hidden="true">{init}</span>;
}

export const days = (v) => (v ? Math.max(0, Math.floor((Date.now() - new Date(v).getTime()) / 86400000)) : null);
export const tk = (n) => (n == null || n === '' ? '—' : `Tk ${Number(n).toLocaleString('en-IN')}`);
export const range = (a, b) => (a && b ? `Tk ${Number(a).toLocaleString('en-IN')} – ${Number(b).toLocaleString('en-IN')}` : a ? `From ${tk(a)}` : b ? `Up to ${tk(b)}` : '—');
export const when = (v) => (v ? new Date(v).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka' }) : '—');
