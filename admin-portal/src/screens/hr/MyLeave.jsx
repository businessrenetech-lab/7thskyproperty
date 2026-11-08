import React, { useCallback, useEffect, useState } from 'react';
import { Plus, CalendarOff, FileDown } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { PageHead, Button, Badge, EmptyState, Field, Input, Select, Textarea, Spinner } from '../../ui/kit';
import Modal from '../../components/hr/HrModal';
import '../../styles/hr.css';

/*
 * My leave: balance (Sick 11 + Casual 10 = 21 days a year; weekend leave earned), own requests with the
 * application letter, cancel while pending, and the apply form. Ported from the Hadi Real Estate staff portal
 * (MyLeaves). The leave type's ready application text is filled in with the dates; working days come from
 * the server (office closed days are not counted). Every rule is checked again on the server.
 */
const API_BASE = import.meta.env.VITE_API_URL || '/api';
const TONE = { pending: 'amber', approved: 'green', rejected: 'red', cancelled: 'grey' };
const STATUS = { pending: 'Pending', approved: 'Approved', rejected: 'Not approved', cancelled: 'Cancelled' };
const blank = { leave_type_id: '', start_date: '', end_date: '', reason: '', worked_date: '', proof_note: '', handover_note: '' };
const todayYmd = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
const daysBetween = (a, b) => (!a || !b || b < a ? 0 : Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000) + 1);
const longDate = (ymd) => (ymd ? new Date(`${ymd}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }) : '[date]');
const short = (d) => new Date(`${String(d).slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' });
const errText = (e) => e.response?.data?.error || 'That did not work. Try again.';

const fillTemplate = (tpl, type, f, user, days) => String(tpl || '')
  .replace(/\{name\}/g, user?.name || '')
  .replace(/\{type\}/g, type?.name || '')
  .replace(/\{from\}/g, longDate(f.start_date))
  .replace(/\{to\}/g, longDate(f.end_date))
  .replace(/\{days\}/g, String((days ?? daysBetween(f.start_date, f.end_date)) || '[days]'))
  .replace(/\{worked_date\}/g, longDate(f.worked_date));

export default function MyLeave() {
  const toast = useToast();
  const { user } = useAuth();
  const [types, setTypes] = useState([]);
  const [bal, setBal] = useState(null);
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(blank);
  const [auto, setAuto] = useState(''); // the last filled-in template: date changes refill it until the user edits
  const [busy, setBusy] = useState(false);
  const [wd, setWd] = useState(null);

  const load = useCallback(() => {
    Promise.all([api.get('/hrm/me/leave-types'), api.get('/hrm/me/leave-balance'), api.get('/hrm/me/leaves')])
      .then(([t, b, l]) => { setTypes(t.data); setBal(b.data); setList(l.data); setError(''); })
      .catch((e) => setError(errText(e)));
  }, []);
  useEffect(load, [load]);

  useEffect(() => {
    if (!f.start_date || !f.end_date || f.end_date < f.start_date) { setWd(null); return undefined; }
    let alive = true;
    api.get('/hrm/me/leave-days', { params: { from: f.start_date, to: f.end_date } })
      .then((r) => { if (alive) setWd(r.data); }).catch(() => { if (alive) setWd(null); });
    return () => { alive = false; };
  }, [f.start_date, f.end_date]);

  // Once the working days arrive, refill the application while it is still the untouched template.
  useEffect(() => {
    const tp = types.find((x) => String(x.id) === String(f.leave_type_id));
    if (!wd || !tp || f.reason !== auto) return;
    const filled = fillTemplate(tp.template, tp, f, user, wd.days);
    if (filled !== f.reason) { setF((x) => ({ ...x, reason: filled })); setAuto(filled); }
  }, [wd]); // eslint-disable-line react-hooks/exhaustive-deps

  const type = types.find((x) => String(x.id) === String(f.leave_type_id));
  const weekend = Boolean(type && (type.category === 'weekend' || type.requires_proof));
  const total = wd ? wd.days : daysBetween(f.start_date, f.end_date);
  const typeBal = bal?.types?.find((x) => String(x.leave_type_id) === String(f.leave_type_id));

  const patch = (changes) => {
    const next = { ...f, ...changes };
    const nextType = types.find((x) => String(x.id) === String(next.leave_type_id));
    if (nextType?.category === 'weekend' && next.start_date) next.end_date = next.start_date;
    if (nextType && (changes.leave_type_id !== undefined || f.reason === auto)) {
      next.reason = fillTemplate(nextType.template, nextType, next, user, null);
      setAuto(next.reason);
    }
    setF(next);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!type) { toast.error('Choose a leave type'); return; }
    if (!total) { toast.error('Choose the leave dates'); return; }
    if (/\[[^\]]+\]/.test(f.reason)) { toast.error('Fill in or remove the [ ] parts of the application'); return; }
    setBusy(true);
    try {
      await api.post('/hrm/me/leaves', {
        leave_type_id: f.leave_type_id, start_date: f.start_date, end_date: f.end_date, reason: f.reason,
        handover_note: f.handover_note || undefined,
        ...(weekend ? { worked_date: f.worked_date, proof_note: f.proof_note } : {}),
      });
      toast.success('Leave request sent to HR');
      setF(blank); setAuto(''); setOpen(false); load();
    } catch (err) { toast.error(errText(err)); } finally { setBusy(false); }
  };

  const cancel = async (id) => {
    try { await api.post(`/hrm/me/leaves/${id}/cancel`); toast.success('Request cancelled'); load(); } catch (err) { toast.error(errText(err)); }
  };

  return (
    <div className="hr">
      <PageHead title="My leave" desc="Your leave balance and requests. HR approves each request."
        actions={<Button icon={Plus} onClick={() => setOpen(true)}>Apply for leave</Button>} />
      {error && <div className="hr-alert">{error}</div>}
      {!list && !error ? <Spinner /> : (
        <>
          {bal && (
            <section className="hr-card">
              <h3 className="hr-card__title">Leave in {bal.year}</h3>
              <p className="hr-hint">{bal.annual.remaining} of {bal.annual.entitled} days of annual leave left{bal.annual.pending ? `, ${bal.annual.pending} waiting for approval` : ''}.</p>
              <div className="hr-stats">
                {bal.types.map((x) => (
                  <div key={x.leave_type_id} className="hr-stat" style={{ '--c': x.color }}>
                    <b>{x.entitled === null ? x.used : x.remaining}</b>
                    <span>{x.entitled === null ? `${x.name} taken` : `${x.name} left of ${x.entitled}`}{x.pending ? ` · ${x.pending} pending` : ''}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="hr-card">
            <h3 className="hr-card__title">My requests</h3>
            {!list?.length ? <EmptyState icon={CalendarOff} title="No leave requests yet" sub="Apply for leave and it will appear here." /> : (
              <div className="hr-list">
                {list.map((r) => (
                  <div key={r.id} className="hr-list__row">
                    <span>
                      <strong>{r.LeaveType?.name}</strong>
                      <span className="hr-hint">{short(r.start_date)} – {short(r.end_date)}, {Number(r.total_days)} day{Number(r.total_days) === 1 ? '' : 's'} · {r.reference}</span>
                      {r.rejection_note && <span className="hr-hint">Remarks: {r.rejection_note}</span>}
                      <span className="hr-row">
                        <a className="hr-link" href={`${API_BASE}/hrm/me/leaves/${r.id}/print?print=1`} target="_blank" rel="noreferrer"><FileDown size={14} /> Application PDF</a>
                        {r.status === 'pending' && <button type="button" className="hr-link hr-link--danger" onClick={() => cancel(r.id)}>Cancel request</button>}
                      </span>
                    </span>
                    <Badge tone={TONE[r.status] || 'grey'}>{STATUS[r.status] || r.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {open && (
        <Modal onClose={() => setOpen(false)} title="Apply for leave" maxWidth="640px"
          footer={<><Button variant="secondary" type="button" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" form="my-leave-form" disabled={busy}>Send to HR</Button></>}>
          <form id="my-leave-form" className="hr-form" onSubmit={submit}>
            <Field label="Leave type" required>
              <Select required value={f.leave_type_id} onChange={(e) => patch({ leave_type_id: e.target.value })}>
                <option value="">Select</option>
                {types.map((lt) => {
                  const tb = bal?.types?.find((x) => x.leave_type_id === lt.id);
                  return <option key={lt.id} value={lt.id}>{lt.name}{tb && tb.remaining !== null ? ` (${tb.remaining} left)` : ''}</option>;
                })}
              </Select>
            </Field>
            {type?.description && <p className="hr-hint">{type.description}</p>}
            {weekend && (
              <Field label="Weekend day you worked" required>
                <Input type="date" required max={todayYmd()} value={f.worked_date} onChange={(e) => patch({ worked_date: e.target.value })} />
              </Field>
            )}
            <div className="hr-form__2">
              <Field label="First day" required>
                <Input type="date" required min={weekend && f.worked_date ? f.worked_date : undefined} value={f.start_date}
                  onChange={(e) => patch({ start_date: e.target.value, end_date: f.end_date && f.end_date >= e.target.value ? f.end_date : e.target.value })} />
              </Field>
              <Field label="Last day" required>
                <Input type="date" required disabled={weekend} min={f.start_date} value={f.end_date} onChange={(e) => patch({ end_date: e.target.value })} />
              </Field>
            </div>
            {total > 0 && (
              <p className="hr-hint">
                {total} working day{total === 1 ? '' : 's'}
                {wd && wd.closed.length > 0 && ` · not counted (office closed): ${wd.closed.map((c) => `${short(c.ymd)} ${c.kind === 'weekly' ? '(weekly off)' : `(${c.name})`}`).join(', ')}`}
                {typeBal && typeBal.remaining !== null ? ` · ${typeBal.remaining} left` : ''}
              </p>
            )}
            {weekend && (
              <Field label="Proof of the weekend work" required>
                <Textarea required rows={3} placeholder="Who asked, the work done, the client or site" value={f.proof_note} onChange={(e) => patch({ proof_note: e.target.value })} />
              </Field>
            )}
            <Field label="Application" required>
              <Textarea required rows={8} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} />
            </Field>
            <Field label="Who covers your work">
              <Input value={f.handover_note} maxLength={500} onChange={(e) => setF({ ...f, handover_note: e.target.value })} />
            </Field>
          </form>
        </Modal>
      )}
    </div>
  );
}
