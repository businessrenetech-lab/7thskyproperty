import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Calendar, Users, Loader2, Save, Download } from 'lucide-react';
import api from '../services/api';
import '../styles/GlobalStyles.css';
import { useToast } from '../context/ToastContext';

const StaffAttendancePage = () => {
  const toast = useToast();
  const [staff, setStaff] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState('mark'); // 'mark' | 'summary'
  const [summary, setSummary] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => { if (view === 'mark') fetchStaff(); }, [date, view]);
  useEffect(() => { if (view === 'summary') fetchSummary(); }, [view, month, year]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      // Use the newly engineered endpoint which merges StaffProfile and StaffAttendance
      const response = await api.get(`/hrm/attendance?date=${date}`);
      const staffData = response.data.staff;
      console.log('STAFF DATA FETCHED:', staffData);
      setStaff(staffData);
      
      const initial = {};
      staffData.forEach(member => { 
        // member.StaffAttendances is an array (due to User.hasMany)
        const record = member.StaffAttendances && member.StaffAttendances[0];
        initial[member.id] = { 
          status: record ? record.status : 'absent', 
          check_in: record?.check_in || '', 
          check_out: record?.check_out || '',
          notes: record?.notes || '',
          ip_address: record?.ip_address || '',
          latitude: record?.latitude || '',
          longitude: record?.longitude || ''
        }; 
      });
      setAttendance(initial);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/hrm/attendance/summary?month=${month}&year=${year}`);
      setSummary(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const setStatus = (userId, status) => {
    setAttendance(prev => ({ ...prev, [userId]: { ...prev[userId], status } }));
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const attendance_data = Object.entries(attendance).map(([user_id, data]) => ({
        user_id: parseInt(user_id), status: data.status, check_in: data.check_in || null, check_out: data.check_out || null, notes: data.notes || null
      }));
      await api.post('/hrm/attendance/mark', { date, attendance_data });
      toast.success('Staff attendance saved successfully!');
    } catch (err) { toast.error('Failed to save attendance'); }
    finally { setSaving(false); }
  };

  const exportPDF = async () => {
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.getElementById('report-container');
      const opt = {
        margin: 0.5,
        filename: view === 'mark' ? `Attendance_Sheet_${date}.pdf` : `Attendance_Summary_${month}_${year}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
      };
      html2pdf().set(opt).from(element).save();
    } catch(err) {
      toast.error(`Failed to export PDF! ${err.message}`);
    }
  };

  const statusConfig = {
    present: { icon: <CheckCircle size={22} />, color: 'var(--success)', label: 'Present' },
    absent: { icon: <XCircle size={22} />, color: 'var(--danger)', label: 'Absent' },
    late: { icon: <Clock size={22} />, color: 'var(--warning)', label: 'Late' },
    half_day: { icon: <Calendar size={22} />, color: '#FFB347', label: 'Half Day' },
    on_leave: { icon: <Calendar size={22} />, color: '#9B6DFF', label: 'On Leave' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={24} /> Staff Attendance</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Daily check-in tracking & attendance sheets</p>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <button className="btn-secondary" onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Download size={16} /> Export PDF
          </button>
          <div style={{ display: 'flex', gap: '2px', padding: '3px', borderRadius: '8px', background: 'var(--glass)', border: '1px solid var(--border)' }}>
            {[{ key: 'mark', label: 'Daily Mark' }, { key: 'summary', label: 'Monthly Summary' }].map(t => (
              <div key={t.key} onClick={() => setView(t.key)} style={{
                padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer',
                background: view === t.key ? 'rgba(255,255,255,0.06)' : 'transparent',
                color: view === t.key ? 'var(--text-main)' : 'var(--text-dim)',
              }}>{t.label}</div>
            ))}
          </div>
        </div>
      </div>

      <div id="report-container">
        {view === 'mark' ? (
          <>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }} data-html2canvas-ignore="true">
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="glass-input" style={{ width: 'auto' }} />
              <button className="btn-primary" onClick={saveAttendance} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Attendance
              </button>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 size={40} className="animate-spin" color="var(--primary)" /></div>
            ) : (
              <div className="glass-morphism" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                      <th style={{ padding: '1rem', textAlign: 'left' }}>Staff Name</th>
                      <th style={{ padding: '1rem', textAlign: 'left' }}>Details</th>
                      {Object.entries(statusConfig).map(([key, cfg]) => (
                        <th key={key} style={{ padding: '1rem', textAlign: 'center' }}>{cfg.label}</th>
                      ))}
                      <th style={{ padding: '1rem', textAlign: 'center' }}>Check In</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>Check Out</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>Tracker Info</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>Reason / Notes</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map(member => (
                      <tr key={member.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #9B6DFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '0.8rem' }}>
                              {member.name?.[0]}
                            </div>
                            <div>
                              <p style={{ fontWeight: '700', fontSize: '0.9rem' }}>{member.name}</p>
                              <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{member.StaffProfile?.designation || member.role}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          <p>Ph: {member.StaffProfile?.phone || 'N/A'}</p>
                          <p>Joined: {member.StaffProfile?.joining_date || 'N/A'}</p>
                          <p>Salary: ৳ {Number(member.StaffProfile?.base_salary || 0).toLocaleString()}</p>
                        </td>
                        {Object.entries(statusConfig).map(([key, cfg]) => (
                          <td key={key} style={{ textAlign: 'center', padding: '0.5rem' }}>
                            <div onClick={() => setStatus(member.id, key)} style={{
                              cursor: 'pointer', display: 'inline-flex',
                              color: attendance[member.id]?.status === key ? cfg.color : 'rgba(255,255,255,0.1)',
                              opacity: attendance[member.id]?.status === key ? 1 : 0.4,
                              transition: 'all 0.15s',
                              transform: attendance[member.id]?.status === key ? 'scale(1.15)' : 'scale(1)'
                            }}>
                              {cfg.icon}
                            </div>
                          </td>
                        ))}
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                          <input type="time" className="glass-input" style={{ width: '100px', fontSize: '0.75rem', padding: '0.3rem', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                            value={attendance[member.id]?.check_in || ''} onChange={e => setAttendance(prev => ({ ...prev, [member.id]: { ...prev[member.id], check_in: e.target.value } }))} />
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                          <input type="time" className="glass-input" style={{ width: '100px', fontSize: '0.75rem', padding: '0.3rem', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                            value={attendance[member.id]?.check_out || ''} onChange={e => setAttendance(prev => ({ ...prev, [member.id]: { ...prev[member.id], check_out: e.target.value } }))} />
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                            <span title="IP Address">{attendance[member.id]?.ip_address || 'No IP'}</span>
                            {attendance[member.id]?.latitude && attendance[member.id]?.longitude ? (
                              <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${attendance[member.id].latitude},${attendance[member.id].longitude}`} 
                                target="_blank" 
                                rel="noreferrer"
                                style={{ color: 'var(--primary)', textDecoration: 'underline', fontSize: '0.65rem' }}
                              >
                                View Map
                              </a>
                            ) : (
                              <span style={{ fontSize: '0.65rem' }}>No GPS found</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                          <input type="text" placeholder="Reason (e.g. forgot punch out)" className="glass-input" style={{ width: '160px', fontSize: '0.75rem', padding: '0.4rem', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                            value={attendance[member.id]?.notes || ''} onChange={e => setAttendance(prev => ({ ...prev, [member.id]: { ...prev[member.id], notes: e.target.value } }))} />
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                           <button 
                              className="btn-primary" 
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                              onClick={async () => {
                                try {
                                  const data = attendance[member.id];
                                  await api.post('/hrm/attendance/mark', { 
                                    date, 
                                    attendance_data: [{ user_id: member.id, status: data.status, check_in: data.check_in || null, check_out: data.check_out || null, notes: data.notes || null }] 
                                  });
                                  toast.success(`Attendance logged for ${member.name}`);
                                } catch (e) {
                                  toast.error('Failed to log attendance');
                                }
                              }}
                            >
                             Save Log
                           </button>
                        </td>
                      </tr>
                    ))}
                    {staff.length === 0 && !loading && (
                      <tr style={{ borderBottom: 'none' }}>
                        <td colSpan="11" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                          <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No staff data returned by the backend.</p>
                          <p style={{ fontSize: '0.8rem' }}>Check backend logs or verify that staff members exist for this branch.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }} data-html2canvas-ignore="true">
              <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="glass-input" style={{ width: 'auto' }}>
                {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>)}
              </select>
              <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="glass-input" style={{ width: 'auto' }}>
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 size={40} className="animate-spin" color="var(--primary)" /></div>
            ) : (
              <div className="glass-morphism" style={{ padding: 0, overflow: 'hidden', overflowX: 'auto' }}>
                <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)', fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', position: 'sticky', left: 0, background: 'var(--bg)', zIndex: 1, minWidth: '150px' }}>Staff</th>
                      {Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => (
                        <th key={i} style={{ padding: '0.5rem', textAlign: 'center', minWidth: '35px' }}>{i + 1}</th>
                      ))}
                      <th style={{ padding: '1rem', textAlign: 'center', minWidth: '80px' }}>Total P</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '1rem', fontWeight: '600', fontSize: '0.8rem', position: 'sticky', left: 0, background: 'var(--bg)', zIndex: 1 }}>{row.user?.name}</td>
                        {Array.from({ length: new Date(year, month, 0).getDate() }, (_, day_idx) => {
                          const day = day_idx + 1;
                          const entry = row.entries && row.entries[day];
                          let code = '-';
                          let color = 'var(--text-dim)';
                          if (entry) {
                            if (entry.status === 'present') { code = 'P'; color = 'var(--success)'; }
                            if (entry.status === 'absent') { code = 'A'; color = 'var(--danger)'; }
                            if (entry.status === 'late') { code = 'L'; color = 'var(--warning)'; }
                            if (entry.status === 'half_day') { code = 'H'; color = '#FFB347'; }
                            if (entry.status === 'on_leave') { code = 'V'; color = '#9B6DFF'; }
                          }
                          
                          return (
                            <td key={day} style={{ textAlign: 'center', fontWeight: 'bold', color: color, fontSize: '0.75rem', position: 'relative' }}>
                              <span title={entry?.notes ? `Note: ${entry.notes}` : ''} style={{ cursor: entry?.notes ? 'help' : 'default', borderBottom: entry?.notes ? '1px dotted var(--primary)' : 'none' }}>
                                {code}
                                {entry?.notes && <span style={{ position: 'absolute', top: '2px', right: '4px', fontSize: '0.6rem', color: 'var(--primary)' }}>*</span>}
                              </span>
                            </td>
                          );
                        })}
                        <td style={{ textAlign: 'center', fontWeight: '700', fontSize: '0.85rem' }}>{row.present}</td>
                      </tr>
                    ))}
                    {summary.length === 0 && (
                      <tr style={{ borderBottom: 'none' }}>
                        <td colSpan={new Date(year, month, 0).getDate() + 2} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                          No attendance data found for this month.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StaffAttendancePage;
