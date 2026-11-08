import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send } from 'lucide-react';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { Button, Drawer, Field, Select } from '../../../ui/kit';
import { useGet, errText, Loading, Tag } from '../hrShared';
import { useRecMeta } from './recShared';

/*
 * Talent pool (M3 §16; approved frame "Talent pool"). People kept for future roles, searchable by skill,
 * position, experience, education, location and availability. "Invite to apply" emails the careers link of
 * an open vacancy to the people ticked.
 */

const match = (s) => (s == null ? null : s >= 75 ? ['Strong match', 'green'] : s >= 60 ? ['Good', 'blue'] : ['Consider', 'slate']);

export default function TalentPool() {
  const nav = useNavigate();
  const { meta, error } = useRecMeta();
  const [f, setF] = useState({ skill: '', position_id: '', min_experience: '', education: '', location: '', availability: '' });
  const params = useMemo(() => ({ talent_pool: 1, ...Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '')) }), [f]);
  const all = useGet('/hr/recruitment/candidates', { talent_pool: 1 });
  const list = useGet('/hr/recruitment/candidates', params);
  const [ticked, setTicked] = useState([]);
  const [inviting, setInviting] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  if (!meta) return <div className="hrm"><Loading error={error} /></div>;
  const rows = list.data?.data || [];
  const total = all.data?.data?.length ?? 0;
  const best = (c) => { const s = (c.applications || []).map((a) => (a.screening_score != null ? Number(a.screening_score) : null)).filter((n) => n != null); return s.length ? Math.max(...s) : null; };
  const last = (c) => [...(c.applications || [])].sort((x, y) => new Date(y.applied_at) - new Date(x.applied_at))[0];
  const toggle = (code) => setTicked((t) => (t.includes(code) ? t.filter((x) => x !== code) : [...t, code]));

  return (
    <div className="hrm">
      <div className="hrm-head">
        <div><h1>Talent pool</h1><p>{total} {total === 1 ? 'person' : 'people'} kept for future roles</p></div>
        <Button icon={Send} onClick={() => setInviting(true)} disabled={!ticked.length}>{ticked.length ? `Invite ${ticked.length} to apply` : 'Invite to apply'}</Button>
      </div>
      <div className="hrm-filters">
        <label>Skills<input className="input" value={f.skill} onChange={set('skill')} placeholder="e.g. Excel" /></label>
        <label>Position<select value={f.position_id} onChange={set('position_id')}><option value="">Any position</option>{meta.positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
        <label>Experience<select value={f.min_experience} onChange={set('min_experience')}><option value="">Any</option>{[1, 2, 3, 5, 10].map((n) => <option key={n} value={n}>{n}+ years</option>)}</select></label>
        <label>Education<input className="input" value={f.education} onChange={set('education')} placeholder="e.g. BBA" /></label>
        <label>Location<input className="input" value={f.location} onChange={set('location')} placeholder="e.g. Dhaka" /></label>
        <label>Availability<input className="input" value={f.availability} onChange={set('availability')} placeholder="e.g. Immediately" /></label>
      </div>
      <section className="hrm-card" aria-labelledby="tp-title">
        <div className="hrm-card-head"><h2 id="tp-title">Matching people</h2><small>{rows.length} of {total}</small></div>
        {!list.data ? <Loading error={list.error} reload={list.reload} /> : rows.length ? (
          <div className="hrm-table-wrap">
            <table className="hrm-table">
              <thead><tr><th aria-label="Select" /><th>Candidate</th><th>Last applied for</th><th>Experience</th><th>Education</th><th>Location</th><th>Availability</th><th className="num">Score</th><th aria-label="Match" /></tr></thead>
              <tbody>{rows.map((c) => {
                const s = best(c); const m = match(s); const l = last(c);
                const go = () => nav(`/hr/recruitment/candidates/${c.candidate_code}`);
                return (
                  <tr key={c.id} className="click" onClick={go}>
                    <td onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={ticked.includes(c.candidate_code)} onChange={() => toggle(c.candidate_code)} aria-label={`Select ${c.full_name}`} /></td>
                    <td><a className="hrm-link" href={`/admin/hr/recruitment/candidates/${c.candidate_code}`} onClick={(e) => { e.preventDefault(); go(); }}>{c.full_name}</a><small>{c.candidate_code}</small></td>
                    <td>{l?.title || '—'}</td>
                    <td>{c.years_experience != null ? `${Number(c.years_experience)} years` : '—'}</td>
                    <td>{c.highest_qualification || '—'}</td>
                    <td>{c.location || '—'}</td>
                    <td>{c.availability || '—'}</td>
                    <td className="num">{s != null ? Math.round(s) : '—'}</td>
                    <td className="num">{m && <Tag tone={m[1]}>{m[0]}</Tag>}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        ) : <p className="hrm-empty">{total ? 'Nobody matches these filters.' : 'Nobody is in the talent pool yet. When a candidate is not selected, HR can keep them here.'}</p>}
      </section>
      {inviting && <Invite codes={ticked} onClose={() => setInviting(false)} onDone={() => { setInviting(false); setTicked([]); }} />}
    </div>
  );
}

function Invite({ codes, onClose, onDone }) {
  const toast = useToast();
  const open = useGet('/hr/recruitment/vacancies', { status: 'published' });
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      const r = await api.post(`/hr/recruitment/vacancies/${code}/invite`, { candidate_codes: codes });
      toast.success(`Invitation sent to ${r.data.sent} of ${r.data.of}${r.data.without_email ? ` (${r.data.without_email} without an email address)` : ''}`);
      onDone();
    } catch (e) { toast.error(errText(e)); } finally { setBusy(false); }
  };
  return (
    <Drawer title={`Invite ${codes.length} to apply`} onClose={onClose} width={440}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={Send} onClick={send} disabled={!code || busy}>{busy ? 'Sending…' : 'Send invitations'}</Button></>}>
      <Field label="Vacancy" required>
        <Select value={code} onChange={(e) => setCode(e.target.value)}><option value="">Choose an open vacancy…</option>{(open.data?.data || []).map((v) => <option key={v.vacancy_code} value={v.vacancy_code}>{v.vacancy_code} {v.title}</option>)}</Select>
      </Field>
      <p className="hrm-note" style={{ marginTop: 10 }}>Each person gets an email with a link to the role on the careers page. They apply themselves.</p>
    </Drawer>
  );
}
