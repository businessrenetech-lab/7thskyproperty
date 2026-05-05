import React, { useState, useEffect } from 'react';
import { Clock, Plus, Loader2, Trash2 } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import '../styles/GlobalStyles.css';
import { useToast } from '../context/ToastContext';

const ShiftPlanner = () => {
  const toast = useToast();
  const [shifts, setShifts] = useState([]);
  const [staff, setStaff] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [shiftForm, setShiftForm] = useState({ name: '', start_time: '09:00', end_time: '17:00', color: '#00D4FF' });
  const [assignForm, setAssignForm] = useState({ user_id: '', shift_id: '', date: '' });
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1);
    return d.toISOString().split('T')[0];
  });

  useEffect(() => { fetchData(); }, [weekStart]);

  const getWeekDates = () => {
    const dates = [];
    const start = new Date(weekStart);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };

  const fetchData = async () => {
    setLoading(true);
    const weekDates = getWeekDates();
    try {
      const [shiftRes, staffRes, schedRes] = await Promise.all([
        api.get('/hrm/shifts'),
        api.get('/payroll/staff'),
        api.get(`/hrm/schedules?start_date=${weekDates[0]}&end_date=${weekDates[6]}`),
      ]);
      setShifts(shiftRes.data);
      setStaff(staffRes.data);
      setSchedules(schedRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCreateShift = async (e) => {
    e.preventDefault();
    try { await api.post('/hrm/shifts', shiftForm); setShowShiftModal(false); fetchData(); }
    catch (err) { toast.error('Failed'); }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    try { await api.post('/hrm/schedules', assignForm); setShowAssignModal(false); fetchData(); }
    catch (err) { toast.error('Failed'); }
  };

  const handleRemove = async (id) => {
    try { await api.delete(`/hrm/schedules/${id}`); fetchData(); }
    catch (err) { toast.error('Failed'); }
  };

  const weekDates = getWeekDates();
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d.toISOString().split('T')[0]); };
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d.toISOString().split('T')[0]); };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 size={48} className="animate-spin" color="var(--primary)" /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={24} /> Shift Planner</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Staff scheduling and shift management</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-secondary" onClick={() => setShowShiftModal(true)} style={{ fontSize: '0.8rem' }}><Plus size={14} /> Shift</button>
          <button className="btn-primary" onClick={() => setShowAssignModal(true)}><Plus size={16} /> Assign</button>
        </div>
      </div>

      {/* Shift Legend */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {shifts.map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.7rem', borderRadius: '20px', fontSize: '0.75rem', background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}30` }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
            {s.name} ({s.start_time} - {s.end_time})
          </div>
        ))}
      </div>

      {/* Week Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button className="btn-secondary" onClick={prevWeek} style={{ padding: '0.4rem 0.8rem' }}>Previous</button>
        <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{weekDates[0]} — {weekDates[6]}</span>
        <button className="btn-secondary" onClick={nextWeek} style={{ padding: '0.4rem 0.8rem' }}>Next</button>
      </div>

      {/* Schedule Grid */}
      <div className="glass-morphism" style={{ padding: 0, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-dim)' }}>STAFF</th>
              {weekDates.map((d, i) => (
                <th key={d} style={{ padding: '0.8rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  {dayNames[i]}<br /><span style={{ fontSize: '0.65rem' }}>{d.slice(5)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staff.map(member => (
              <tr key={member.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '0.8rem', fontWeight: '600', fontSize: '0.8rem' }}>{member.name}</td>
                {weekDates.map(date => {
                  const sched = schedules.find(s => s.user_id === member.id && s.date === date);
                  return (
                    <td key={date} style={{ padding: '0.4rem', textAlign: 'center' }}>
                      {sched ? (
                        <div style={{ padding: '0.3rem', borderRadius: '6px', fontSize: '0.65rem', fontWeight: '600', background: `${sched.Shift?.color || '#777'}20`, color: sched.Shift?.color || '#777', position: 'relative' }}>
                          {sched.Shift?.name}
                          <Trash2 size={10} onClick={() => handleRemove(sched.id)} style={{ position: 'absolute', top: 2, right: 2, cursor: 'pointer', opacity: 0.5 }} />
                        </div>
                      ) : (
                        <div style={{ height: '28px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)' }} />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showShiftModal} onClose={() => setShowShiftModal(false)} title="Create Shift">
        <form onSubmit={handleCreateShift} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group"><label>Shift Name</label><input className="glass-input" required value={shiftForm.name} onChange={e => setShiftForm({ ...shiftForm, name: e.target.value })} placeholder="e.g. Morning" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: '1rem' }}>
            <div className="form-group"><label>Start</label><input type="time" className="glass-input" required value={shiftForm.start_time} onChange={e => setShiftForm({ ...shiftForm, start_time: e.target.value })} /></div>
            <div className="form-group"><label>End</label><input type="time" className="glass-input" required value={shiftForm.end_time} onChange={e => setShiftForm({ ...shiftForm, end_time: e.target.value })} /></div>
            <div className="form-group"><label>Color</label><input type="color" value={shiftForm.color} onChange={e => setShiftForm({ ...shiftForm, color: e.target.value })} style={{ width: '100%', height: '40px', border: 'none' }} /></div>
          </div>
          <button type="submit" className="btn-primary" style={{ padding: '0.8rem' }}>Create Shift</button>
        </form>
      </Modal>

      <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Shift">
        <form onSubmit={handleAssign} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Staff</label>
            <select className="glass-input" required value={assignForm.user_id} onChange={e => setAssignForm({ ...assignForm, user_id: e.target.value })}>
              <option value="">Select...</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Shift</label>
            <select className="glass-input" required value={assignForm.shift_id} onChange={e => setAssignForm({ ...assignForm, shift_id: e.target.value })}>
              <option value="">Select...</option>
              {shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start_time} - {s.end_time})</option>)}
            </select>
          </div>
          <div className="form-group"><label>Date</label><input type="date" className="glass-input" required value={assignForm.date} onChange={e => setAssignForm({ ...assignForm, date: e.target.value })} /></div>
          <button type="submit" className="btn-primary" style={{ padding: '0.8rem' }}>Assign</button>
        </form>
      </Modal>
    </div>
  );
};

export default ShiftPlanner;
