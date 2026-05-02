import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Users, Mail, MessageSquare, Calendar, Clock, CheckCircle } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import '../styles/GlobalStyles.css';

const readableSchedule = (schedule) => {
  if (!schedule) return 'Not set';
  if (typeof schedule === 'string') return schedule;
  if (schedule.days && schedule.start_time && schedule.end_time) {
    const labelMap = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
    const days = schedule.days.map((day) => labelMap[day] || day).join(', ');
    return `${days} • ${schedule.start_time}-${schedule.end_time}`;
  }
  try { return JSON.stringify(schedule); } catch (e) { return String(schedule); }
};

const formatDate = (dateValue) => {
  if (!dateValue) return 'Not set';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleDateString();
};

const BatchDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [batch, setBatch] = useState(null);
  const [students, setStudents] = useState([]);
  
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [notifyType, setNotifyType] = useState('sms');
  const [notifySubject, setNotifySubject] = useState('');
  const [notifyMessage, setNotifyMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBatchData();
  }, [id]);

  const fetchBatchData = async () => {
    setLoading(true);
    try {
      const [batchRes, studentsRes] = await Promise.all([
        api.get(`/lms/batches/${id}`),
        api.get(`/lms/batches/${id}/students`)
      ]);
      setBatch(batchRes.data);
      setStudents(studentsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch batch data:', error);
      alert('Failed to load batch. It may have been deleted.');
      navigate('/lms');
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!notifyMessage.trim()) return alert('Please enter a message');
    if (notifyType === 'email' && !notifySubject.trim()) return alert('Email notifications require a subject');
    
    if (!window.confirm(`Are you sure you want to send this ${notifyType.toUpperCase()} to ${students.length} students?`)) return;

    setSubmitting(true);
    try {
      const response = await api.post(`/lms/batches/${id}/notify`, {
        type: notifyType,
        subject: notifySubject,
        message: notifyMessage
      });
      alert(response.data.message || 'Notification sent successfully');
      setIsNotifyModalOpen(false);
      setNotifyMessage('');
      setNotifySubject('');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to send notification');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={48} className="animate-spin" color="var(--primary)" />
      </div>
    );
  }

  if (!batch) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* View Head */}
      <div className="view-head">
        <div>
          <button className="btn-ghost" onClick={() => navigate('/lms')} style={{ padding: '4px 8px', marginBottom: '8px', fontSize: '13px', color: 'var(--text-dim)' }}>
            <ArrowLeft size={14} style={{ marginRight: '6px' }} /> Back to Batches
          </button>
          <div className="view-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {batch.code} 
            <span className="sb2" style={{ background: 'var(--primary-glow)', color: 'var(--primary)', textTransform: 'uppercase', fontSize: '12px' }}>
              {batch.status}
            </span>
          </div>
          <div className="view-sub">{batch.name || 'Untitled Batch'}</div>
        </div>
        <div className="view-actions">
          <button 
            className="btn-stitch" 
            onClick={() => setIsNotifyModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #FF4D6D, #9B6DFF)' }}
          >
            <MessageSquare size={16} /> Bulk Notify Batch
          </button>
        </div>
      </div>

      {/* Batch Meta Grid */}
      <div className="g65" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)', gap: '1.5rem' }}>
        
        {/* Left Side: Summary Card */}
        <div className="sc" style={{ height: '100%' }}>
          <div className="sc-head">
            <span className="sc-title">Batch Configuration</span>
          </div>
          <div className="sc-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: '0 0 4px 0', textTransform: 'uppercase' }}>Master Course</p>
              <p style={{ margin: 0, fontWeight: 600 }}>{batch.Course?.title || 'Unknown Course'}</p>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: '0 0 4px 0', textTransform: 'uppercase' }}>Assigned Trainer</p>
              <p style={{ margin: 0 }}>{batch.Trainer?.name || 'Unassigned'}</p>
            </div>
            
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '8px 0' }} />
            
            <div>
              <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: '0 0 4px 0', textTransform: 'uppercase' }}>Class Schedule</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                <Clock size={15} /> {readableSchedule(batch.schedule)}
              </div>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: '0 0 4px 0', textTransform: 'uppercase' }}>Duration Period</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                <Calendar size={15} /> {formatDate(batch.start_date)} — {formatDate(batch.end_date)}
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '8px 0' }} />

            <div>
              <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: '0 0 4px 0', textTransform: 'uppercase' }}>Capacity Utilization</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <strong style={{ fontSize: '18px', color: 'var(--primary)' }}>{batch.enrolled_count || 0}</strong>
                <span style={{ color: 'var(--text-dim)' }}>/ {batch.capacity} Students</span>
              </div>
              <div className="pbar" style={{ background: 'var(--bg-deep)' }}>
                <div 
                  className="pbar-fill" 
                  style={{ 
                    width: `${Math.min(100, ((batch.enrolled_count || 0) / batch.capacity) * 100)}%`,
                    background: 'var(--primary)',
                    borderRadius: '4px'
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Students Table */}
        <div className="sc" style={{ height: '100%' }}>
          <div className="sc-head">
            <span className="sc-title">Enrolled Students ({students.length})</span>
          </div>
          <div className="st-wrap">
            <table className="stitch">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Contact Info</th>
                  <th>Enrollment Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                      No students enrolled in this batch yet.
                    </td>
                  </tr>
                ) : (
                  students.map(student => (
                    <tr key={student.id}>
                      <td className="td-name">
                        <Users size={14} style={{ display: 'inline', marginRight: '6px', color: 'var(--text-dim)' }} />
                        {student.name}
                      </td>
                      <td>
                        <div style={{ fontSize: '12px' }}>{student.mobile_no}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{student.email}</div>
                      </td>
                      <td style={{ fontSize: '12px' }}>{formatDate(student.enrollment_date)}</td>
                      <td>
                        <span className="sb2 sb2-mint">
                          <CheckCircle size={10} /> {student.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Notify Modal */}
      <Modal isOpen={isNotifyModalOpen} onClose={() => setIsNotifyModalOpen(false)} title="Send Bulk Notification">
        <form onSubmit={handleSendNotification} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ background: 'rgba(0, 212, 255, 0.08)', border: '1px solid rgba(0, 212, 255, 0.2)', padding: '12px', borderRadius: '8px' }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#38E8FF' }}>
              <strong>Note:</strong> This will send a message to all <strong>{students.length}</strong> students currently enrolled in {batch.code}.
            </p>
          </div>

          <div className="form-group">
            <label className="flabel">Notification Channel</label>
            <select 
              className="glass-input" 
              value={notifyType} 
              onChange={e => setNotifyType(e.target.value)}
              style={{ appearance: 'auto' }}
            >
              <option value="sms">SMS (Direct to mobile numbers)</option>
              <option value="email">Email (Direct to student inboxes)</option>
            </select>
          </div>

          {notifyType === 'email' && (
            <div className="form-group">
              <label className="flabel">Email Subject</label>
              <input 
                required 
                className="glass-input" 
                placeholder="e.g. Schedule Change Update"
                value={notifySubject}
                onChange={e => setNotifySubject(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label className="flabel">Message Content</label>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px' }}>
              Supported variables: {'{{name}}'}, {'{{phone}}'}, {'{{email}}'}, {'{{course}}'}
            </div>
            <textarea 
              required
              className="glass-input" 
              placeholder={`Dear {{name}}, your class scheduled for tomorrow has been updated...`}
              value={notifyMessage}
              onChange={e => setNotifyMessage(e.target.value)}
              style={{ height: '150px', resize: 'vertical' }}
            />
          </div>

          <button 
            type="submit" 
            className="btn-stitch" 
            disabled={submitting || students.length === 0} 
            style={{ 
              display: 'flex', justifyContent: 'center', padding: '12px', 
              background: 'linear-gradient(135deg, #10b981, #059669)' 
            }}
          >
            {submitting ? 'Sending Notifications...' : `Dispatch ${notifyType.toUpperCase()} to ${students.length} students`}
          </button>
        </form>
      </Modal>

    </div>
  );
};

export default BatchDetails;
