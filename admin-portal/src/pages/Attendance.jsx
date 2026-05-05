import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Calendar, Search, Loader2 } from 'lucide-react';
import api from '../services/api';
import '../styles/GlobalStyles.css';
import { useToast } from '../context/ToastContext';

const Attendance = () => {
  const toast = useToast();
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [students, setStudents] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [attendance, setAttendance] = useState({}); // { student_id: status }

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const response = await api.get('/lms/batches');
        setBatches(response.data);
      } catch (error) {
        console.error('Failed to fetch batches:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBatches();
  }, []);

  const fetchStudents = async (batchId) => {
    setLoading(true);
    try {
      // Assuming Student model has batch_id
      const response = await api.get(`/students?batch_id=${batchId}`);
      setStudents(response.data.filter(s => s.batch_id === parseInt(batchId)));
      
      // Auto-set all to present by default
      const initialAttendance = {};
      response.data.forEach(s => {
        initialAttendance[s.id] = 'present';
      });
      setAttendance(initialAttendance);

      // Try to fetch existing attendance for this date
      const existing = await api.get(`/attendance/batch?batch_id=${batchId}&date=${date}`);
      if (existing.data.length > 0) {
        const updatedAttendance = { ...initialAttendance };
        existing.data.forEach(rec => {
          updatedAttendance[rec.student_id] = rec.status;
        });
        setAttendance(updatedAttendance);
      }

    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchChange = (e) => {
    const batchId = e.target.value;
    setSelectedBatch(batchId);
    if (batchId) fetchStudents(batchId);
  };

  const setStatus = (studentId, status) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const saveAttendance = async () => {
    setMarking(true);
    try {
      const attendanceData = Object.keys(attendance).map(id => ({
        student_id: parseInt(id),
        status: attendance[id]
      }));

      await api.post('/attendance/mark', {
        batch_id: selectedBatch,
        date,
        attendance_data: attendanceData
      });

      toast.success('Attendance saved successfully!');
    } catch (error) {
      console.error('Failed to save attendance:', error);
      toast.error('Failed to save attendance');
    } finally {
      setMarking(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem' }}>Daily Attendance</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Mark present, absent, or leave for scheduled batches</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
            style={{ 
              padding: '0.6rem 1rem', 
              background: 'var(--glass)', 
              border: '1px solid var(--border)', 
              borderRadius: '8px', 
              color: 'white' 
            }}
          />
          <select 
            onChange={handleBatchChange} 
            style={{ 
              padding: '0.6rem 1rem', 
              background: 'var(--glass)', 
              border: '1px solid var(--border)', 
              borderRadius: '8px', 
              color: 'white' 
            }}
          >
            <option value="">Select Batch...</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.code} - {b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ height: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={48} className="animate-spin" color="var(--primary)" />
        </div>
      ) : selectedBatch ? (
        <div className="glass-morphism" style={{ padding: '0' }}>
          <div style={{ padding: '1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem' }}>Roll Call: {students.length} Students</h3>
            <button className="btn-primary" onClick={saveAttendance} disabled={marking}>
              {marking ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Attendance'}
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                <th style={{ padding: '1.2rem' }}>STUDENT</th>
                <th style={{ padding: '1.2rem', textAlign: 'center' }}>PRESENT</th>
                <th style={{ padding: '1.2rem', textAlign: 'center' }}>ABSENT</th>
                <th style={{ padding: '1.2rem', textAlign: 'center' }}>LATE</th>
                <th style={{ padding: '1.2rem', textAlign: 'center' }}>LEAVE</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1.2rem' }}>
                    <div style={{ fontWeight: '600' }}>{student.User?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{student.User?.email}</div>
                  </td>
                  <td style={{ padding: '1.2rem', textAlign: 'center' }}>
                    <CheckCircle 
                      size={24} 
                      onClick={() => setStatus(student.id, 'present')}
                      style={{ 
                        cursor: 'pointer', 
                        color: attendance[student.id] === 'present' ? 'var(--success)' : 'var(--glass)',
                        opacity: attendance[student.id] === 'present' ? 1 : 0.3
                      }} 
                    />
                  </td>
                  <td style={{ padding: '1.2rem', textAlign: 'center' }}>
                    <XCircle 
                      size={24} 
                      onClick={() => setStatus(student.id, 'absent')}
                      style={{ 
                        cursor: 'pointer', 
                        color: attendance[student.id] === 'absent' ? 'var(--danger)' : 'var(--glass)',
                        opacity: attendance[student.id] === 'absent' ? 1 : 0.3
                      }} 
                    />
                  </td>
                  <td style={{ padding: '1.2rem', textAlign: 'center' }}>
                    <Clock 
                      size={24} 
                      onClick={() => setStatus(student.id, 'late')}
                      style={{ 
                        cursor: 'pointer', 
                        color: attendance[student.id] === 'late' ? 'var(--warning)' : 'var(--glass)',
                        opacity: attendance[student.id] === 'late' ? 1 : 0.3
                      }} 
                    />
                  </td>
                  <td style={{ padding: '1.2rem', textAlign: 'center' }}>
                    <Calendar 
                      size={24} 
                      onClick={() => setStatus(student.id, 'leave')}
                      style={{ 
                        cursor: 'pointer', 
                        color: attendance[student.id] === 'leave' ? 'var(--primary)' : 'var(--glass)',
                        opacity: attendance[student.id] === 'leave' ? 1 : 0.3
                      }} 
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ height: '40vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
           <Search size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
           <p>Select a batch and date to start marking attendance.</p>
        </div>
      )}
    </div>
  );
};

export default Attendance;
