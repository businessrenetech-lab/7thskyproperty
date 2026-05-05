import React, { useState, useEffect } from 'react';
import { Calendar, Plus, CheckCircle, XCircle, Clock, Loader2, AlertCircle } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import '../styles/GlobalStyles.css';
import { useToast } from '../context/ToastContext';

const LeaveManagement = () => {
  const toast = useToast();
  const [leaves, setLeaves] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ leave_type_id: '', start_date: '', end_date: '', total_days: 1, reason: '' });
  const [typeForm, setTypeForm] = useState({ name: '', days_per_year: 14, is_paid: true, color: '#00D4FF' });

  useEffect(() => { fetchData(); }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leavesRes, typesRes] = await Promise.all([
        api.get(`/hrm/leaves${filter !== 'all' ? `?status=${filter}` : ''}`),
        api.get('/hrm/leave-types'),
      ]);
      setLeaves(leavesRes.data);
      setLeaveTypes(typesRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    try {
      await api.post('/hrm/leaves', form);
      setShowModal(false);
      setForm({ leave_type_id: '', start_date: '', end_date: '', total_days: 1, reason: '' });
      fetchData();
    } catch (err) { toast.error('Failed to submit leave request'); }
  };

  const handleCreateType = async (e) => {
    e.preventDefault();
    try {
      await api.post('/hrm/leave-types', typeForm);
      setShowTypeModal(false);
      setTypeForm({ name: '', days_per_year: 14, is_paid: true, color: '#00D4FF' });
      fetchData();
    } catch (err) { toast.error('Failed'); }
  };

  const handleAction = async (id, action) => {
    try {
      await api.patch(`/hrm/leaves/${id}/${action}`);
      fetchData();
    } catch (err) { toast.error('Failed'); }
  };

  const statusColors = { pending: '#FFB347', approved: '#00FF94', rejected: '#FF4D6D', cancelled: '#777' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={24} /> Leave Management</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Leave requests, approvals, and balance tracking</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-secondary" onClick={() => setShowTypeModal(true)} style={{ fontSize: '0.8rem' }}><Plus size={14} /> Leave Type</button>
          <button className="btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> New Request</button>
        </div>
      </div>

      {/* Leave Type Pills */}
      {leaveTypes.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {leaveTypes.map(t => (
            <div key={t.id} style={{ padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', background: `${t.color}15`, color: t.color, border: `1px solid ${t.color}30` }}>
              {t.name} · {t.days_per_year}d/yr · {t.is_paid ? 'Paid' : 'Unpaid'}
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '2px', padding: '3px', borderRadius: '8px', background: 'var(--glass)', border: '1px solid var(--border)', width: 'fit-content' }}>
        {['all', 'pending', 'approved', 'rejected'].map(f => (
          <div key={f} onClick={() => setFilter(f)} style={{
            padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', textTransform: 'capitalize',
            background: filter === f ? 'rgba(255,255,255,0.06)' : 'transparent',
            color: filter === f ? 'var(--text-main)' : 'var(--text-dim)',
          }}>{f}</div>
        ))}
      </div>

      {/* Leave List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 size={40} className="animate-spin" color="var(--primary)" /></div>
      ) : (
        <div className="glass-morphism" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Employee</th>
                <th style={{ padding: '1rem' }}>Type</th>
                <th style={{ padding: '1rem' }}>Duration</th>
                <th style={{ padding: '1rem' }}>Days</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaves.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>No leave requests found</td></tr>
              ) : leaves.map(req => (
                <tr key={req.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <p style={{ fontWeight: '600', fontSize: '0.85rem' }}>{req.Employee?.name}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{req.reason?.substring(0, 40)}</p>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '600', background: `${req.LeaveType?.color || '#777'}15`, color: req.LeaveType?.color || '#777' }}>
                      {req.LeaveType?.name}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem' }}>{req.start_date} → {req.end_date}</td>
                  <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '700' }}>{req.total_days}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{ padding: '0.2rem 0.8rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', background: `${statusColors[req.status]}20`, color: statusColors[req.status] }}>
                      {req.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    {req.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                        <button onClick={() => handleAction(req.id, 'approve')} style={{ background: 'none', border: 'none', color: 'var(--success)', cursor: 'pointer' }}><CheckCircle size={20} /></button>
                        <button onClick={() => handleAction(req.id, 'reject')} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><XCircle size={20} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Leave Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Submit Leave Request">
        <form onSubmit={handleSubmitLeave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Leave Type</label>
            <select className="glass-input" required value={form.leave_type_id} onChange={e => setForm({ ...form, leave_type_id: e.target.value })}>
              <option value="">Select...</option>
              {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group"><label>Start Date</label><input type="date" className="glass-input" required value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
            <div className="form-group"><label>End Date</label><input type="date" className="glass-input" required value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
          </div>
          <div className="form-group"><label>Total Days</label><input type="number" step="0.5" className="glass-input" required value={form.total_days} onChange={e => setForm({ ...form, total_days: e.target.value })} /></div>
          <div className="form-group"><label>Reason</label><textarea className="glass-input" rows={3} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></div>
          <button type="submit" className="btn-primary" style={{ padding: '0.8rem' }}>Submit Request</button>
        </form>
      </Modal>

      {/* Leave Type Modal */}
      <Modal isOpen={showTypeModal} onClose={() => setShowTypeModal(false)} title="Create Leave Type">
        <form onSubmit={handleCreateType} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group"><label>Name</label><input className="glass-input" required value={typeForm.name} onChange={e => setTypeForm({ ...typeForm, name: e.target.value })} placeholder="e.g. Annual Leave" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group"><label>Days/Year</label><input type="number" className="glass-input" value={typeForm.days_per_year} onChange={e => setTypeForm({ ...typeForm, days_per_year: parseInt(e.target.value) })} /></div>
            <div className="form-group"><label>Color</label><input type="color" value={typeForm.color} onChange={e => setTypeForm({ ...typeForm, color: e.target.value })} style={{ width: '100%', height: '40px', border: 'none', cursor: 'pointer' }} /></div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <input type="checkbox" checked={typeForm.is_paid} onChange={e => setTypeForm({ ...typeForm, is_paid: e.target.checked })} /> Paid Leave
          </label>
          <button type="submit" className="btn-primary" style={{ padding: '0.8rem' }}>Create Type</button>
        </form>
      </Modal>
    </div>
  );
};

export default LeaveManagement;
