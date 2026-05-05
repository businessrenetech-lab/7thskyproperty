import React, { useState, useEffect } from 'react';
import { 
  Users, 
  DollarSign, 
  CreditCard, 
  History, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  TrendingUp,
  Settings2,
  Banknote,
  Download
} from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import '../styles/GlobalStyles.css';
import { useToast } from '../context/ToastContext';

const Payroll = () => {
  const toast = useToast();
  const [staff, setStaff] = useState([]);
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const [profileData, setProfileData] = useState({
    designation: '',
    base_salary: '',
    bank_name: '',
    account_no: '',
    father_name: '',
    mother_name: '',
    address: '',
    contact_details: '',
    educational_background: '[]',
    work_experience: '[]'
  });

  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffData, setNewStaffData] = useState({
    name: '', email: '', joining_date: '', role: 'unassigned',
    designation: '', base_salary: '', bank_name: '', account_no: '',
    father_name: '', mother_name: '', address: '', contact_details: '',
    educational_background: '', work_experience: ''
  });

  useEffect(() => {
    fetchData();
  }, [month, year]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [staffRes, historyRes] = await Promise.all([
        api.get('/payroll/staff'),
        api.get(`/payroll/history?month=${month}&year=${year}`)
      ]);
      setStaff(staffRes.data);
      setPayrollHistory(historyRes.data);
    } catch (err) {
      console.error('Failed to fetch payroll data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...profileData,
        educational_background: profileData.educational_background ? JSON.parse(profileData.educational_background) : [],
        work_experience: profileData.work_experience ? JSON.parse(profileData.work_experience) : []
      };
      await api.post('/payroll/profiles', {
        user_id: selectedStaff.id,
        ...payload
      });
      setShowProfileModal(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to update staff profile or invalid JSON format.');
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Create User Account
      const authRes = await api.post('/auth/register', {
        name: newStaffData.name,
        email: newStaffData.email,
        role: newStaffData.role,
        branch_id: 1 // Managed by superadmin logic or current branch context
      });
      
      const newUserId = authRes.data.user.id;

      // 2. Create Staff Profile
      const payload = {
        user_id: newUserId,
        designation: newStaffData.designation,
        base_salary: newStaffData.base_salary || 0,
        bank_name: newStaffData.bank_name,
        account_no: newStaffData.account_no,
        father_name: newStaffData.father_name,
        mother_name: newStaffData.mother_name,
        address: newStaffData.address,
        contact_details: newStaffData.contact_details,
        joining_date: newStaffData.joining_date,
        educational_background: newStaffData.educational_background ? JSON.parse(newStaffData.educational_background) : [],
        work_experience: newStaffData.work_experience ? JSON.parse(newStaffData.work_experience) : []
      };

      await api.post('/payroll/profiles', payload);

      setShowAddStaffModal(false);
      setNewStaffData({
        name: '', email: '', joining_date: '', role: 'unassigned',
        designation: '', base_salary: '', bank_name: '', account_no: '',
        father_name: '', mother_name: '', address: '', contact_details: '',
        educational_background: '', work_experience: ''
      });
      fetchData();
      toast.success('Staff created successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create staff or invalid JSON.');
      setLoading(false);
    }
  };

  const handleGeneratePayroll = async () => {
    if (!window.confirm(`Generate draft payroll for ${month}/${year}?`)) return;
    try {
      await api.post('/payroll/generate', { month, year });
      fetchData();
      toast.success('Draft payroll generated successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Generation failed');
    }
  };

  const handlePay = async (id, method) => {
    try {
      await api.post(`/payroll/pay/${id}`, { payment_method: method });
      fetchData();
      toast.success('Salary processed successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Payment failed');
    }
  };

  const exportPDF = async () => {
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.getElementById('salary-sheet-container');
      const opt = {
        margin: 0.5,
        filename: `Salary_Sheet_${month}_${year}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      html2pdf().set(opt).from(element).save();
    } catch(err) {
      toast.error(`Failed to export PDF! ${err.message}`);
    }
  };

  if (loading) return <div className="canvas"><Loader2 className="animate-spin" color="var(--primary)" size={48} /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem' }}>Staff & Automated Payroll</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Monthly salary disbursement and accounting integration</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--glass)', padding: '0.5rem 1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="glass-morphism" style={{ border: 'none', background: 'none', color: 'white' }}>
              {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>)}
            </select>
            <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="glass-morphism" style={{ border: 'none', background: 'none', color: 'white' }}>
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button className="btn-secondary" onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
             <Download size={16} /> Export PDF
          </button>
          <button className="btn-primary" onClick={handleGeneratePayroll}>
            <TrendingUp size={18} /> Run Payroll
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Payroll Processing */}
        <div id="salary-sheet-container" className="glass-morphism" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <History size={18} /> {new Date(0, month-1).toLocaleString('default', { month: 'long' })} {year} Payroll Sheet
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {payrollHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                No payroll records found for this period. Click "Run Payroll" to generate drafts.
              </div>
            ) : payrollHistory.map(item => (
              <div key={item.id} className="glass-morphism" style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {item.Staff?.name[0]}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem' }}>{item.Staff?.name}</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Base: ৳{parseFloat(item.base_salary).toLocaleString()}</p>
                  </div>
                </div>
                
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '2rem' }}>
                  <div>
                    <p style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--primary)' }}>৳{parseFloat(item.net_salary).toLocaleString()}</p>
                    <span style={{ fontSize: '0.65rem', color: item.status === 'paid' ? 'var(--success)' : 'var(--warning)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase' }}>
                      {item.status}
                    </span>
                  </div>
                  
                  {item.status === 'draft' && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handlePay(item.id, 'bank')} className="btn-secondary" style={{ padding: '0.5rem', fontSize: '0.7rem' }}>Bank Pay</button>
                      <button onClick={() => handlePay(item.id, 'cash')} className="btn-secondary" style={{ padding: '0.5rem', fontSize: '0.7rem' }}>Cash Pay</button>
                    </div>
                  )}
                  {item.status === 'paid' && <CheckCircle2 color="var(--success)" size={24} />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Staff Salary Management */}
        <div className="glass-morphism" style={{ padding: '1.5rem', height: 'fit-content' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
               <Users size={18} /> Staff Directory
            </h3>
            <button className="btn-secondary" onClick={() => setShowAddStaffModal(true)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
              <Plus size={14} /> Add Staff
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {staff.map(member => (
              <div key={member.id} style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: '600', fontSize: '0.85rem' }}>{member.name}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{member.role.toUpperCase()} | {member.StaffProfile?.designation || 'No Designation'}</p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedStaff(member);
                    setProfileData({
                      designation: member.StaffProfile?.designation || '',
                      base_salary: member.StaffProfile?.base_salary || '',
                      bank_name: member.StaffProfile?.bank_name || '',
                      account_no: member.StaffProfile?.account_no || '',
                      father_name: member.StaffProfile?.father_name || '',
                      mother_name: member.StaffProfile?.mother_name || '',
                      address: member.StaffProfile?.address || '',
                      contact_details: member.StaffProfile?.contact_details || '',
                      educational_background: member.StaffProfile?.educational_background ? JSON.stringify(member.StaffProfile.educational_background, null, 2) : '[]',
                      work_experience: member.StaffProfile?.work_experience ? JSON.stringify(member.StaffProfile.work_experience, null, 2) : '[]'
                    });
                    setShowProfileModal(true);
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
                >
                  <Settings2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Salary Profile Modal */}
      <Modal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} title={`Salary Setup: ${selectedStaff?.name}`}>
        <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={{ gridColumn: 'span 2' }}><h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>Payroll Info</h4></div>
          <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Designation</label>
              <input className="glass-input" type="text" required value={profileData.designation} onChange={(e) => setProfileData({...profileData, designation: e.target.value})} placeholder="e.g. Senior Counselor" />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Monthly Base Salary (BDT)</label>
              <input className="glass-input" type="number" required value={profileData.base_salary} onChange={(e) => setProfileData({...profileData, base_salary: e.target.value})} placeholder="0.00" />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Bank Name</label>
              <input className="glass-input" type="text" value={profileData.bank_name} onChange={(e) => setProfileData({...profileData, bank_name: e.target.value})} placeholder="e.g. Dutch Bangla" />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Account No</label>
              <input className="glass-input" type="text" value={profileData.account_no} onChange={(e) => setProfileData({...profileData, account_no: e.target.value})} placeholder="000-000-000" />
            </div>
          </div>

          <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}><h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>HR Profile Info</h4></div>
          <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div><label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Father's Name</label><input className="glass-input" value={profileData.father_name} onChange={e => setProfileData({...profileData, father_name: e.target.value})} /></div>
            <div><label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Mother's Name</label><input className="glass-input" value={profileData.mother_name} onChange={e => setProfileData({...profileData, mother_name: e.target.value})} /></div>
            <div><label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Contact Details (Alt Phone/Email)</label><input className="glass-input" value={profileData.contact_details} onChange={e => setProfileData({...profileData, contact_details: e.target.value})} /></div>
            <div><label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Address</label><input className="glass-input" value={profileData.address} onChange={e => setProfileData({...profileData, address: e.target.value})} /></div>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Educational Background (JSON Array)</label>
            <textarea className="glass-input" rows="3" placeholder='[{"degree": "BSc", "institution": "DU", "year": "2020"}]' value={profileData.educational_background} onChange={e => setProfileData({...profileData, educational_background: e.target.value})} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Work Experience (JSON Array)</label>
            <textarea className="glass-input" rows="3" placeholder='[{"company": "Google", "role": "Dev", "years": "2021-2023"}]' value={profileData.work_experience} onChange={e => setProfileData({...profileData, work_experience: e.target.value})} />
          </div>

          <button type="submit" className="btn-primary" style={{ gridColumn: 'span 2', marginTop: '1rem', padding: '1rem' }}>
            Save Comprehensive Profile
          </button>
        </form>
      </Modal>

      {/* Add Staff Modal */}
      <Modal isOpen={showAddStaffModal} onClose={() => setShowAddStaffModal(false)} title="Register New Staff / Teacher">
        <form onSubmit={handleCreateStaff} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem', maxHeight: '70vh', overflowY: 'auto', paddingRight: '1rem' }}>
          
          <div style={{ gridColumn: 'span 2', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
            <h4 style={{ fontSize: '1rem', color: 'var(--primary)', margin: 0 }}>Account Setup</h4>
          </div>
          <div className="form-group"><label>Full Name</label><input required className="glass-input" value={newStaffData.name} onChange={e => setNewStaffData({...newStaffData, name: e.target.value})} /></div>
          <div className="form-group"><label>Email</label><input required type="email" className="glass-input" value={newStaffData.email} onChange={e => setNewStaffData({...newStaffData, email: e.target.value})} /></div>
          <div className="form-group"><label>Joining Date</label><input type="date" className="glass-input" value={newStaffData.joining_date} onChange={e => setNewStaffData({...newStaffData, joining_date: e.target.value})} /></div>

          <div style={{ gridColumn: 'span 2', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginTop: '0.5rem' }}>
            <h4 style={{ fontSize: '1rem', color: 'var(--primary)', margin: 0 }}>HR & Payroll Info</h4>
          </div>
          <div className="form-group"><label>Designation</label><input required className="glass-input" value={newStaffData.designation} onChange={e => setNewStaffData({...newStaffData, designation: e.target.value})} /></div>
          <div className="form-group"><label>Base Salary (BDT)</label><input type="number" required className="glass-input" value={newStaffData.base_salary} onChange={e => setNewStaffData({...newStaffData, base_salary: e.target.value})} /></div>
          <div className="form-group"><label>Father's Name</label><input className="glass-input" value={newStaffData.father_name} onChange={e => setNewStaffData({...newStaffData, father_name: e.target.value})} /></div>
          <div className="form-group"><label>Mother's Name</label><input className="glass-input" value={newStaffData.mother_name} onChange={e => setNewStaffData({...newStaffData, mother_name: e.target.value})} /></div>
          <div className="form-group"><label>Contact Details</label><input className="glass-input" value={newStaffData.contact_details} onChange={e => setNewStaffData({...newStaffData, contact_details: e.target.value})} /></div>
          <div className="form-group"><label>Address</label><input className="glass-input" value={newStaffData.address} onChange={e => setNewStaffData({...newStaffData, address: e.target.value})} /></div>
          
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label>Educational Background (JSON Array)</label>
            <textarea className="glass-input" rows="2" placeholder='[{"degree": "BSc", "institution": "DU", "year": "2020"}]' value={newStaffData.educational_background} onChange={e => setNewStaffData({...newStaffData, educational_background: e.target.value})} />
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ gridColumn: 'span 2', marginTop: '1rem', padding: '1rem' }}>
            {loading ? 'Processing...' : 'Register Comprehensive Staff Profile'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Payroll;
