import React, { useEffect, useState } from 'react';
import { CalendarOff, Plus, Trash2, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { isCompanyLevel } from '../../utils/hrRoles';

/*
 * Office calendar (owner request 2026-10-17): the weekly closed day(s) and public holidays / other closures.
 * Attendance is not counted on these days. Server: services/officeCalendar.service.js.
 */
const KIND_LABEL = { public_holiday: 'Public holiday', office_closed: 'Office closed' };
const fmt = (d) => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '');

/** Closed days of a month from the calendar answer: Map day-of-month -> name. */
export const closedInMonth = (cal, year, month) => {
  const out = new Map();
  if (!cal) return out;
  const n = new Date(year, month, 0).getDate();
  for (let d = 1; d <= n; d += 1) {
    const ymd = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dow = new Date(`${ymd}T00:00:00Z`).getUTCDay();
    const h = (cal.holidays || []).find((x) => String(x.date_from).slice(0, 10) <= ymd && String(x.date_to).slice(0, 10) >= ymd);
    if (h) out.set(d, h.name);
    else if ((cal.weekly_off || []).includes(dow)) out.set(d, cal.day_names?.[dow] || 'Weekly off');
  }
  return out;
};

const OfficeCalendar = () => {
  const toast = useToast();
  const { user } = useAuth();
  const company = isCompanyLevel(user?.role);
  const [year, setYear] = useState(new Date().getFullYear());
  const [cal, setCal] = useState(null);
  const [off, setOff] = useState([]);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ name: '', kind: 'public_holiday', date_from: '', date_to: '', scope: 'all' });
  const [adding, setAdding] = useState(false);

  const load = async () => {
    try {
      const r = await api.get('/hrm/attendance/calendar', { params: { year } });
      setCal(r.data); setOff(r.data.weekly_off);
    } catch { toast.error('The office calendar did not load'); }
  };
  useEffect(() => { load(); }, [year]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveOff = async () => {
    setSaving(true);
    try { const r = await api.put('/hrm/attendance/calendar/weekly-off', { days: off }); setOff(r.data.weekly_off); toast.success('Weekly closed day saved'); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Could not save'); }
    finally { setSaving(false); }
  };
  const add = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      await api.post('/hrm/attendance/calendar/holidays', { ...f, date_to: f.date_to || f.date_from, scope: company ? f.scope : 'office' });
      toast.success('Closed day added');
      setF({ name: '', kind: 'public_holiday', date_from: '', date_to: '', scope: f.scope });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Could not add'); }
    finally { setAdding(false); }
  };
  const remove = async (h) => {
    if (!window.confirm(`Remove "${h.name}"?`)) return;
    try { await api.delete(`/hrm/attendance/calendar/holidays/${h.id}`); toast.success('Removed'); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Could not remove'); }
  };

  if (!cal) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 size={32} className="animate-spin" /></div>;
  const changed = JSON.stringify([...off].sort()) !== JSON.stringify([...cal.weekly_off].sort());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} data-testid="office-calendar">
      <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.85rem' }}>
        On these days the office is closed: attendance is not counted (no absence, no "not marked"). If someone works on a closed day, their attendance is still recorded.
      </p>

      <div className="glass-morphism" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', margin: '0 0 0.25rem' }}>Weekly closed day</h3>
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>Every office. {company ? '' : 'Only a super admin or director can change it.'}</p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {cal.day_names.map((name, i) => {
            const on = off.includes(i);
            return (
              <button key={name} type="button" disabled={!company} onClick={() => setOff(on ? off.filter((x) => x !== i) : [...off, i])} aria-pressed={on}
                style={{
                  padding: '0.5rem 0.9rem', borderRadius: 999, cursor: company ? 'pointer' : 'default', fontWeight: 600, fontSize: '0.85rem',
                  border: `1px solid ${on ? 'var(--danger)' : 'var(--border)'}`, background: on ? 'rgba(255,77,109,0.12)' : 'transparent', color: on ? 'var(--danger)' : 'var(--text-main)',
                }}>{name}{on ? ' · closed' : ''}</button>
            );
          })}
        </div>
        {company && <button type="button" className="btn-primary" disabled={!changed || saving} onClick={saveOff} style={{ marginTop: '0.9rem' }}>{saving ? 'Saving…' : 'Save'}</button>}
      </div>

      <div className="glass-morphism" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1rem', margin: 0 }}>Public holidays and other closed days</h3>
          <select className="glass-input" style={{ width: 'auto' }} value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))}>
            {Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - 1 + i).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <form onSubmit={add} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.6rem', alignItems: 'end', marginBottom: '1rem' }}>
          <div className="form-group" style={{ gridColumn: 'span 2' }}><label>Name</label><input className="glass-input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Victory Day" /></div>
          <div className="form-group"><label>Type</label>
            <select className="glass-input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
              <option value="public_holiday">Public holiday</option><option value="office_closed">Office closed (other)</option>
            </select>
          </div>
          <div className="form-group"><label>From</label><input type="date" className="glass-input" required value={f.date_from} onChange={(e) => setF({ ...f, date_from: e.target.value, date_to: f.date_to && f.date_to >= e.target.value ? f.date_to : '' })} /></div>
          <div className="form-group"><label>To (optional)</label><input type="date" className="glass-input" min={f.date_from} value={f.date_to} onChange={(e) => setF({ ...f, date_to: e.target.value })} /></div>
          {company && (
            <div className="form-group"><label>Offices</label>
              <select className="glass-input" value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value })}>
                <option value="all">Every office</option><option value="office">The selected office only</option>
              </select>
            </div>
          )}
          <button type="submit" className="btn-primary" disabled={adding} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}><Plus size={16} /> Add</button>
        </form>
        {cal.holidays.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.85rem', display: 'flex', gap: 8, alignItems: 'center' }}><CalendarOff size={16} /> No holidays or closures in {year} yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {cal.holidays.map((h) => (
              <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', padding: '0.6rem 0', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
                <span>
                  <strong>{h.name}</strong>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    {fmt(h.date_from)}{String(h.date_to).slice(0, 10) !== String(h.date_from).slice(0, 10) ? ` – ${fmt(h.date_to)}` : ''} · {KIND_LABEL[h.kind] || h.kind} · {h.branch_id ? 'This office' : 'Every office'}
                  </span>
                </span>
                {(company || h.branch_id) && <button type="button" onClick={() => remove(h)} aria-label={`Remove ${h.name}`} style={{ background: 'none', border: 0, color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={18} /></button>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OfficeCalendar;
