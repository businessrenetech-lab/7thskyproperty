import React, { useState, useEffect } from 'react';
import CardTable from '../components/ui/CardTable';
import { Calendar, Plus, CheckCircle, XCircle, Loader2, FileDown, Eye, Pencil } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/hr/HrModal';
import '../styles/GlobalStyles.css';
import { useToast } from '../context/ToastContext';

/*
 * Leave management (owner request 2026-10-14): requests with the full application, approve / not approve with
 * remarks, the branded application PDF, each staff member's balance (Sick 11 + Casual 10 = 21 a year, weekend
 * leave earned), and the leave types with their ready application text.
 */
const API_BASE = import.meta.env.VITE_API_URL || '/api';
const printUrl = (id) => {
  let branch = '';
  try { branch = localStorage.getItem('selectedBranch') || ''; } catch { /* no storage */ }
  const q = new URLSearchParams({ print: '1' });
  if (branch) q.set('branchId', branch);
  return `${API_BASE}/hrm/leaves/${id}/print?${q}`;
};
const STATUS_COLORS = { pending: '#FFB347', approved: '#00C48C', rejected: '#FF4D6D', cancelled: '#888' };
const STATUS_TEXT = { pending: 'Pending', approved: 'Approved', rejected: 'Not approved', cancelled: 'Cancelled' };
const fmt = (d) => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }) : '');
const daysBetween = (a, b) => (a && b && b >= a ? Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000) + 1 : 0);
const longDate = (ymd) => (ymd ? new Date(`${ymd}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }) : '[date]');
const fillTemplate = (tpl, type, f, name, days) => String(tpl || '')
  .replace(/\{name\}/g, name || '').replace(/\{designation\}/g, '').replace(/\{type\}/g, type?.name || '')
  .replace(/\{from\}/g, longDate(f.start_date)).replace(/\{to\}/g, longDate(f.end_date))
  .replace(/\{days\}/g, String((days ?? daysBetween(f.start_date, f.end_date)) || '[days]')).replace(/\{worked_date\}/g, longDate(f.worked_date));
const isWeekend = (t) => Boolean(t && (t.category === 'weekend' || t.requires_proof));

const Pill = ({ color, children }) => (
  <span style={{ padding: '0.2rem 0.6rem', borderRadius: 12, fontSize: '0.7rem', fontWeight: 700, background: `${color}20`, color, whiteSpace: 'nowrap' }}>{children}</span>
);

/* One request in full, with the decision. */
const RequestDetail = ({ req, onClose, onDone }) => {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const emp = req.Employee || {};
  const sp = emp.StaffProfile || {};
  const decide = async (action) => {
    setBusy(action);
    try {
      await api.patch(`/hrm/leaves/${req.id}/${action}`, action === 'reject' ? { rejection_note: note } : { note });
      toast.success(action === 'approve' ? 'Leave approved' : 'Leave not approved');
      onDone();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setBusy(''); }
  };
  const row = (k, v) => (v ? <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 8, padding: '0.35rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}><span style={{ color: 'var(--text-dim)' }}>{k}</span><span style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{v}</span></div> : null);
  return (
    <Modal isOpen onClose={onClose} title={`${emp.name || 'Staff'} · ${req.LeaveType?.name || 'Leave'}`} subtitle={`${req.reference} · applied ${fmt(req.created_at || req.createdAt)}`} maxWidth="720px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Pill color={STATUS_COLORS[req.status]}>{STATUS_TEXT[req.status]}</Pill>
          <a className="btn-secondary" href={printUrl(req.id)} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: '0.8rem' }}><FileDown size={14} /> Application PDF</a>
        </div>
        <div>
          {row('Employee', [emp.name, sp.employee_id, sp.designation].filter(Boolean).join(' · '))}
          {row('Leave', `${req.LeaveType?.name || ''}: ${fmt(req.start_date)} to ${fmt(req.end_date)} (${Number(req.total_days)} working day${Number(req.total_days) === 1 ? '' : 's'})`)}
          {row('Work covered by', req.handover_note)}
          {req.worked_date && row('Weekend day worked', fmt(req.worked_date))}
          {req.worked_date && row('Attendance that day', req.worked_attendance ? `${req.worked_attendance.status.replace('_', ' ')}${req.worked_attendance.check_in ? ` (in ${String(req.worked_attendance.check_in).slice(0, 5)})` : ''}` : 'No attendance record')}
          {row('Proof', req.proof_note)}
          {req.status !== 'pending' && row('Decided by', req.Approver?.name)}
          {row('HR remarks', req.rejection_note)}
        </div>
        <div>
          <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 0.4rem' }}>Application</h4>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: '0.9rem', lineHeight: 1.55, padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 8 }}>{req.reason}</p>
        </div>
        {req.status === 'pending' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <textarea className="glass-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Remarks (needed if not approved)" />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button type="button" className="btn-secondary" disabled={!!busy || note.trim().length < 3} onClick={() => decide('reject')} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: 'var(--danger)' }}>
                {busy === 'reject' ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} Not approve
              </button>
              <button type="button" className="btn-primary" disabled={!!busy} onClick={() => decide('approve')} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                {busy === 'approve' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Approve
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-dim)' }}>Approving marks the leave days as "On leave" in attendance.</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

/* Edit one leave type: name, days, paid, colour, active, description and its ready application text. */
const TypeEditor = ({ type, onClose, onSaved }) => {
  const toast = useToast();
  const [f, setF] = useState({
    name: type?.name || '', days_per_year: type?.days_per_year ?? 0, is_paid: type?.is_paid ?? true, color: type?.color || '#1570EF',
    category: type?.category || 'other', is_active: type?.is_active ?? true, description: type?.description || '', template: type?.template || '',
  });
  const save = async (e) => {
    e.preventDefault();
    try {
      if (type) await api.patch(`/hrm/leave-types/${type.id}`, f);
      else await api.post('/hrm/leave-types', f);
      toast.success('Leave type saved');
      onSaved();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };
  const locked = type?.code === 'weekend';
  return (
    <Modal isOpen onClose={onClose} title={type ? `Edit ${type.name}` : 'New leave type'} maxWidth="680px">
      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.8rem' }}>
          <div className="form-group"><label>Name</label><input className="glass-input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="form-group"><label>Days per year</label><input type="number" min={0} max={365} className="glass-input" disabled={locked} value={f.days_per_year} onChange={(e) => setF({ ...f, days_per_year: e.target.value })} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: '0.8rem', alignItems: 'end' }}>
          <div className="form-group"><label>Group</label>
            <select className="glass-input" disabled={locked} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
              <option value="annual">Annual leave (counts toward the 21 days)</option>
              <option value="other">Other</option>
              {locked && <option value="weekend">Weekend leave (earned, proof needed)</option>}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '1rem', paddingBottom: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}><input type="checkbox" checked={f.is_paid} onChange={(e) => setF({ ...f, is_paid: e.target.checked })} /> Paid</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}><input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} /> Staff can apply</label>
          </div>
          <div className="form-group"><label>Colour</label><input type="color" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} style={{ width: '100%', height: 38, border: 'none', cursor: 'pointer' }} /></div>
        </div>
        <div className="form-group"><label>Short description (shown to staff)</label><input className="glass-input" maxLength={255} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div className="form-group">
          <label>Ready application text</label>
          <textarea className="glass-input" rows={9} value={f.template} onChange={(e) => setF({ ...f, template: e.target.value })} />
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Filled in for the staff member: {'{name} {type} {from} {to} {days} {worked_date}'}. Parts in [ ] must be filled in by the staff member before sending.
          </p>
        </div>
        <button type="submit" className="btn-primary" style={{ padding: '0.8rem' }}>Save</button>
      </form>
    </Modal>
  );
};

/* HR files a leave for a staff member (or themself), with the same rules as the staff portal. */
const NewRequest = ({ types, staff, onClose, onSaved }) => {
  const toast = useToast();
  const [f, setF] = useState({ user_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '', worked_date: '', proof_note: '', handover_note: '' });
  const [auto, setAuto] = useState('');
  // Working days for that staff member's office (closed days are not counted): from the server.
  const [wd, setWd] = useState(null);
  useEffect(() => {
    if (!f.user_id || !f.start_date || !f.end_date || f.end_date < f.start_date) { setWd(null); return undefined; }
    let alive = true;
    api.get('/hrm/leaves/days', { params: { from: f.start_date, to: f.end_date, user_id: f.user_id } }).then((r) => { if (alive) setWd(r.data); }).catch(() => { if (alive) setWd(null); });
    return () => { alive = false; };
  }, [f.user_id, f.start_date, f.end_date]);
  const type = types.find((t) => String(t.id) === String(f.leave_type_id));
  const person = staff.find((s) => String(s.user.id) === String(f.user_id));
  const patch = (changes) => {
    const next = { ...f, ...changes };
    const nt = types.find((t) => String(t.id) === String(next.leave_type_id));
    if (isWeekend(nt) && next.start_date) next.end_date = next.start_date;
    if (nt && (changes.leave_type_id !== undefined || f.reason === auto)) {
      const p = staff.find((s) => String(s.user.id) === String(next.user_id));
      next.reason = fillTemplate(nt.template, nt, next, p?.user?.name, null);
      setAuto(next.reason);
    }
    setF(next);
  };
  useEffect(() => {
    if (!wd || !type || f.reason !== auto) return;
    const filled = fillTemplate(type.template, type, f, person?.user?.name, wd.days);
    if (filled !== f.reason) { setF((x) => ({ ...x, reason: filled })); setAuto(filled); }
  }, [wd]); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/hrm/leaves', { ...f, ...(isWeekend(type) ? {} : { worked_date: undefined, proof_note: undefined }) });
      toast.success('Leave request added');
      onSaved();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };
  return (
    <Modal isOpen onClose={onClose} title="New leave request" maxWidth="680px">
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
          <div className="form-group"><label>Staff member</label>
            <select className="glass-input" required value={f.user_id} onChange={(e) => patch({ user_id: e.target.value })}>
              <option value="">Select…</option>
              {staff.map((s) => <option key={s.user.id} value={s.user.id}>{s.user.name}{s.user.employee_id ? ` (${s.user.employee_id})` : ''}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Leave type</label>
            <select className="glass-input" required value={f.leave_type_id} onChange={(e) => patch({ leave_type_id: e.target.value })}>
              <option value="">Select…</option>
              {types.filter((t) => t.is_active !== false).map((t) => {
                const b = person?.types?.find((x) => x.leave_type_id === t.id);
                return <option key={t.id} value={t.id}>{t.name}{b && b.remaining !== null ? ` (${b.remaining} left)` : ''}</option>;
              })}
            </select>
          </div>
        </div>
        {isWeekend(type) && <div className="form-group"><label>Weekend day worked</label><input type="date" className="glass-input" required value={f.worked_date} onChange={(e) => patch({ worked_date: e.target.value })} /></div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
          <div className="form-group"><label>From</label><input type="date" className="glass-input" required value={f.start_date} onChange={(e) => patch({ start_date: e.target.value, end_date: f.end_date && f.end_date >= e.target.value ? f.end_date : e.target.value })} /></div>
          <div className="form-group"><label>To</label><input type="date" className="glass-input" required disabled={isWeekend(type)} min={f.start_date} value={f.end_date} onChange={(e) => patch({ end_date: e.target.value })} /></div>
        </div>
        {daysBetween(f.start_date, f.end_date) > 0 && (
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            {wd ? wd.days : daysBetween(f.start_date, f.end_date)} working day(s)
            {wd && wd.closed.length > 0 && ` · not counted, office closed: ${wd.closed.map((c) => `${fmt(c.ymd)} (${c.kind === 'weekly' ? 'weekly off' : c.name})`).join(', ')}`}
          </p>
        )}
        {isWeekend(type) && <div className="form-group"><label>Proof of the weekend work</label><textarea className="glass-input" rows={2} required value={f.proof_note} onChange={(e) => setF({ ...f, proof_note: e.target.value })} placeholder="Who asked, the work done, the client or site" /></div>}
        <div className="form-group"><label>Application</label><textarea className="glass-input" rows={8} required value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></div>
        <div className="form-group"><label>Work covered by (optional)</label><input className="glass-input" value={f.handover_note} onChange={(e) => setF({ ...f, handover_note: e.target.value })} /></div>
        <button type="submit" className="btn-primary" style={{ padding: '0.8rem' }}>Add request</button>
      </form>
    </Modal>
  );
};

const LeaveManagement = () => {
  const [tab, setTab] = useState('requests');
  const [leaves, setLeaves] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [balances, setBalances] = useState({ year: new Date().getFullYear(), rows: [] });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [openReq, setOpenReq] = useState(null);
  const [editType, setEditType] = useState(null); // null closed, {} new, a type to edit
  const [showNew, setShowNew] = useState(false);
  const year = new Date().getFullYear();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leavesRes, typesRes, balRes] = await Promise.all([
        api.get(`/hrm/leaves${filter !== 'all' ? `?status=${filter}` : ''}`),
        api.get('/hrm/leave-types'),
        api.get(`/hrm/leaves/balances?year=${year}`),
      ]);
      setLeaves(leavesRes.data);
      setLeaveTypes(typesRes.data);
      setBalances(balRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, [filter]);

  const capped = leaveTypes.filter((t) => t.is_active !== false);
  const tabs = [['requests', 'Requests'], ['balances', `Balances ${year}`], ['types', 'Leave types & templates']];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={24} /> Leave Management</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>21 days annual leave a year (Sick 11 + Casual 10), plus weekend leave for a weekly day off worked. Fridays and holidays inside a leave are not counted.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew(true)}><Plus size={16} /> New Request</button>
      </div>

      <div style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 8, background: 'var(--glass)', border: '1px solid var(--border)', width: 'fit-content', flexWrap: 'wrap' }}>
        {tabs.map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} style={{
            padding: '0.45rem 0.9rem', borderRadius: 6, fontSize: '0.85rem', cursor: 'pointer', border: 0,
            background: tab === k ? 'rgba(255,255,255,0.08)' : 'transparent', color: tab === k ? 'var(--text-main)' : 'var(--text-dim)', fontWeight: tab === k ? 700 : 500,
          }}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 size={40} className="animate-spin" color="var(--primary-text)" /></div>
      ) : tab === 'requests' ? (
        <>
          <div style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 8, background: 'var(--glass)', border: '1px solid var(--border)', width: 'fit-content' }}>
            {['pending', 'approved', 'rejected', 'cancelled', 'all'].map((f) => (
              <div key={f} onClick={() => setFilter(f)} style={{
                padding: '0.4rem 0.8rem', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer',
                background: filter === f ? 'rgba(255,255,255,0.06)' : 'transparent', color: filter === f ? 'var(--text-main)' : 'var(--text-dim)',
              }}>{f === 'all' ? 'All' : STATUS_TEXT[f]}</div>
            ))}
          </div>
          <div className="glass-morphism" style={{ padding: 0, overflow: 'hidden' }}>
            <CardTable><table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.9rem 1rem', textAlign: 'left' }}>Employee</th>
                  <th style={{ padding: '0.9rem' }}>Type</th>
                  <th style={{ padding: '0.9rem' }}>Dates</th>
                  <th style={{ padding: '0.9rem' }} title="Working days (office closed days not counted)">Working days</th>
                  <th style={{ padding: '0.9rem' }}>Status</th>
                  <th style={{ padding: '0.9rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaves.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>No leave requests here</td></tr>
                ) : leaves.map((req) => (
                  <tr key={req.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.8rem 1rem' }}>
                      <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>{req.Employee?.name}</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{[req.Employee?.StaffProfile?.employee_id, req.reference].filter(Boolean).join(' · ')}</p>
                    </td>
                    <td style={{ padding: '0.8rem', textAlign: 'center' }}><Pill color={req.LeaveType?.color || '#777'}>{req.LeaveType?.name}</Pill></td>
                    <td style={{ padding: '0.8rem', textAlign: 'center', fontSize: '0.8rem' }}>{fmt(req.start_date)}{req.end_date !== req.start_date ? ` – ${fmt(req.end_date)}` : ''}</td>
                    <td style={{ padding: '0.8rem', textAlign: 'center', fontWeight: 700 }}>{Number(req.total_days)}</td>
                    <td style={{ padding: '0.8rem', textAlign: 'center' }}><Pill color={STATUS_COLORS[req.status]}>{STATUS_TEXT[req.status]}</Pill></td>
                    <td style={{ padding: '0.8rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button type="button" className="btn-secondary" onClick={() => setOpenReq(req)} style={{ display: 'inline-flex', gap: 4, alignItems: 'center', fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}><Eye size={14} /> {req.status === 'pending' ? 'Review' : 'View'}</button>
                        <a className="btn-secondary" href={printUrl(req.id)} target="_blank" rel="noreferrer" title="Application PDF" style={{ display: 'inline-flex', gap: 4, alignItems: 'center', fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}><FileDown size={14} /> PDF</a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></CardTable>
          </div>
        </>
      ) : tab === 'balances' ? (
        <div className="glass-morphism" style={{ padding: 0, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.9rem 1rem', textAlign: 'left' }}>Staff</th>
                {capped.map((t) => <th key={t.id} style={{ padding: '0.9rem', textAlign: 'center' }}>{t.name}{t.category !== 'weekend' && t.days_per_year > 0 ? ` (${t.days_per_year})` : ''}</th>)}
                <th style={{ padding: '0.9rem', textAlign: 'center' }}>Annual left</th>
              </tr>
            </thead>
            <tbody>
              {balances.rows.length === 0 ? (
                <tr><td colSpan={capped.length + 2} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>No staff</td></tr>
              ) : balances.rows.map((r) => (
                <tr key={r.user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.7rem 1rem', fontSize: '0.85rem', fontWeight: 600 }}>{r.user.name}<span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 400 }}>{[r.user.employee_id, r.user.designation].filter(Boolean).join(' · ')}</span></td>
                  {capped.map((t) => {
                    const b = r.types.find((x) => x.leave_type_id === t.id);
                    if (!b) return <td key={t.id} style={{ textAlign: 'center' }}>—</td>;
                    return (
                      <td key={t.id} style={{ textAlign: 'center', fontSize: '0.85rem' }}>
                        {b.entitled === null ? <strong>{b.used} taken</strong> : <><strong>{b.remaining}</strong><span style={{ color: 'var(--text-dim)' }}> left</span></>}
                        {(b.entitled !== null || b.pending > 0) && <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-dim)' }}>{b.entitled !== null ? `${b.used} taken` : ''}{b.pending ? `${b.entitled !== null ? ' · ' : ''}${b.pending} pending` : ''}</span>}
                      </td>
                    );
                  })}
                  <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--success)' }}>{r.annual.remaining} / {r.annual.entitled}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div><button className="btn-secondary" onClick={() => setEditType({})} style={{ fontSize: '0.8rem' }}><Plus size={14} /> Leave type</button></div>
          {leaveTypes.map((t) => (
            <div key={t.id} className="glass-morphism" style={{ padding: '1rem 1.25rem', borderLeft: `4px solid ${t.color}`, opacity: t.is_active === false ? 0.6 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '1rem' }}>{t.name}</strong>
                  <span style={{ marginLeft: 8, fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    {t.category === 'weekend' ? 'Earned: 1 day per weekend day worked · proof required' : `${t.days_per_year} days a year${t.category === 'annual' ? ' · annual leave' : ''}`}
                    {t.is_paid ? ' · paid' : ' · unpaid'}{t.is_active === false ? ' · hidden from staff' : ''}
                  </span>
                  {t.description && <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-dim)' }}>{t.description}</p>}
                </div>
                <button type="button" className="btn-secondary" onClick={() => setEditType(t)} style={{ display: 'inline-flex', gap: 4, alignItems: 'center', fontSize: '0.8rem' }}><Pencil size={14} /> Edit</button>
              </div>
              {t.template && <p style={{ margin: '0.6rem 0 0', whiteSpace: 'pre-wrap', fontSize: '0.8rem', lineHeight: 1.5, color: 'var(--text-dim)', borderTop: '1px solid var(--border)', paddingTop: '0.6rem' }}>{t.template}</p>}
            </div>
          ))}
        </div>
      )}

      {openReq && <RequestDetail req={openReq} onClose={() => setOpenReq(null)} onDone={() => { setOpenReq(null); fetchData(); }} />}
      {editType && <TypeEditor type={editType.id ? editType : null} onClose={() => setEditType(null)} onSaved={() => { setEditType(null); fetchData(); }} />}
      {showNew && <NewRequest types={leaveTypes} staff={balances.rows} onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); fetchData(); }} />}
    </div>
  );
};

export default LeaveManagement;
