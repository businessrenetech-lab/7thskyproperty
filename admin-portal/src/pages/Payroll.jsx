import React, { useState, useEffect } from 'react';
import { 
  Users, DollarSign, CreditCard, History, Plus, CheckCircle2, AlertCircle,
  Loader2, TrendingUp, Settings2, Banknote, Download, Mail, Phone, MapPin,
  Building2, Calendar, Wallet, Landmark, Search, BookOpen, Trash2
} from 'lucide-react';
import api from '../services/api';
import PayrollView from './PayrollView';
import Modal from '../components/Modal';
import '../styles/GlobalStyles.css';
import { useToast } from '../context/ToastContext';

const parseEntryLines = (value) => String(value || '')
  .split('\n')
  .map(line => line.trim())
  .filter(Boolean);

const Payroll = () => {
  const toast = useToast();
  const [staff, setStaff] = useState([]);
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [liquidAccounts, setLiquidAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  // Default to previous month (last closed month eligible for payroll)
  const [month, setMonth] = useState(() => { const m = new Date().getMonth(); return m === 0 ? 12 : m; });
  const [year, setYear] = useState(() => { const now = new Date(); return now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(); });
  const [activeTab, setActiveTab] = useState('staff');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [fundingSource, setFundingSource] = useState('cash');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [teacherSessions, setTeacherSessions] = useState([]);
  const [deductions, setDeductions] = useState([]);
  const [bonuses, setBonuses] = useState([]);
  const [sessionForm, setSessionForm] = useState({
    teacher_id: '', session_date: new Date().toISOString().split('T')[0],
    pay_basis: 'per_class', session_type: 'regular', duration_hours: '1',
    student_count: '0', rate: '', amount: '', notes: '', status: 'approved'
  });

  const [profileData, setProfileData] = useState({
    designation: '', joining_date: '', base_salary: '', bank_name: '', account_no: '',
    father_name: '', mother_name: '', address: '', contact_details: '',
    educational_background: '', work_experience: '',
    employment_status: 'active', exit_date: '', exit_reason: '', notice_start_date: '', notice_end_date: '',
    final_settlement_status: 'pending', final_settlement_notes: '',
    employment_type: 'full_time', salary_mode: 'fixed', work_shift: 'both',
    festival_bonus: '', conveyance_fee: '', other_allowance: '', deduction: '',
    class_rate: '', hourly_rate: '', is_payroll_active: true
  });

  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusForm, setStatusForm] = useState({
    employment_status: 'active', exit_date: '', exit_reason: '', notice_start_date: '', notice_end_date: '', final_settlement_notes: ''
  });
  const [deductionForm, setDeductionForm] = useState({
    staff_id: '', deduction_type: 'other', source: 'manual', amount: '', reason: '', status: 'approved'
  });
  const [bonusForm, setBonusForm] = useState({
    staff_id: '', bonus_type: 'performance_bonus', source: 'manual', amount: '', reason: '', status: 'approved'
  });
  const [newStaffData, setNewStaffData] = useState({
    name: '', email: '', joining_date: '', role: 'unassigned',
    designation: '', base_salary: '', bank_name: '', account_no: '',
    father_name: '', mother_name: '', address: '', contact_details: '',
    educational_background: '', work_experience: '',
    employment_type: 'full_time', salary_mode: 'fixed', work_shift: 'both',
    festival_bonus: '', conveyance_fee: '', other_allowance: '', deduction: '',
    class_rate: '', hourly_rate: ''
  });

  useEffect(() => { fetchData(); }, [month, year]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [staffRes, historyRes, accountsRes, sessionsRes, deductionsRes, bonusesRes] = await Promise.all([
        api.get('/payroll/staff'),
        api.get(`/payroll/history?month=${month}&year=${year}`),
        api.get('/finance/accounts/liquid').catch(() => ({ data: [] })),
        api.get(`/payroll/teacher-sessions?month=${month}&year=${year}`).catch(() => ({ data: [] })),
        api.get(`/payroll/deductions?month=${month}&year=${year}`).catch(() => ({ data: [] })),
        api.get(`/payroll/bonuses?month=${month}&year=${year}`).catch(() => ({ data: [] }))
      ]);
      setStaff(staffRes.data);
      setPayrollHistory(historyRes.data);
      setLiquidAccounts(accountsRes.data || []);
      setTeacherSessions(sessionsRes.data || []);
      setDeductions(deductionsRes.data || []);
      setBonuses(bonusesRes.data || []);
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
        educational_background: parseEntryLines(profileData.educational_background),
        work_experience: parseEntryLines(profileData.work_experience)
      };
      await api.post('/payroll/profiles', {
        user_id: selectedStaff.id,
        ...payload
      });
      setShowProfileModal(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to update staff profile.');
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
        employment_type: newStaffData.employment_type,
        salary_mode: newStaffData.salary_mode,
        work_shift: newStaffData.work_shift,
        class_rate: newStaffData.class_rate || 0,
        hourly_rate: newStaffData.hourly_rate || 0,
        festival_bonus: newStaffData.festival_bonus || 0,
        conveyance_fee: newStaffData.conveyance_fee || 0,
        other_allowance: newStaffData.other_allowance || 0,
        deduction: newStaffData.deduction || 0,
        bank_name: newStaffData.bank_name,
        account_no: newStaffData.account_no,
        father_name: newStaffData.father_name,
        mother_name: newStaffData.mother_name,
        address: newStaffData.address,
        contact_details: newStaffData.contact_details,
        joining_date: newStaffData.joining_date,
        educational_background: parseEntryLines(newStaffData.educational_background),
        work_experience: parseEntryLines(newStaffData.work_experience)
      };

      await api.post('/payroll/profiles', payload);

      setShowAddStaffModal(false);
      setNewStaffData({
        name: '', email: '', joining_date: '', role: 'unassigned',
        designation: '', base_salary: '', bank_name: '', account_no: '',
        father_name: '', mother_name: '', address: '', contact_details: '',
        educational_background: '', work_experience: '',
        employment_type: 'full_time', salary_mode: 'fixed', work_shift: 'both',
        festival_bonus: '', conveyance_fee: '', other_allowance: '', deduction: '',
        class_rate: '', hourly_rate: ''
      });
      fetchData();
      toast.success('Staff created successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create staff.');
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

  const openStatusModal = (member) => {
    const sp = member.StaffProfile || {};
    setStatusTarget(member);
    setStatusForm({
      employment_status: sp.employment_status || (member.status === 'inactive' ? 'inactive' : member.status === 'suspended' ? 'suspended' : 'active'),
      exit_date: sp.exit_date || '',
      exit_reason: sp.exit_reason || '',
      notice_start_date: sp.notice_start_date || '',
      notice_end_date: sp.notice_end_date || '',
      final_settlement_notes: sp.final_settlement_notes || ''
    });
    setShowStatusModal(true);
  };

  const handleUpdateStaffStatus = async (e) => {
    e.preventDefault();
    if (!statusTarget) return;
    try {
      await api.patch(`/payroll/staff/${statusTarget.id}/status`, statusForm);
      setShowStatusModal(false);
      setStatusTarget(null);
      fetchData();
      toast.success('Staff status updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update staff status');
    }
  };

  const handleCreateDeduction = async (e) => {
    e.preventDefault();
    try {
      await api.post('/payroll/deductions', { ...deductionForm, month, year });
      setDeductionForm({ staff_id: '', deduction_type: 'other', source: 'manual', amount: '', reason: '', status: 'approved' });
      fetchData();
      toast.success('Deduction added');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add deduction');
    }
  };

  const handleDeleteDeduction = async (id) => {
    if (!window.confirm('Remove this payroll deduction?')) return;
    try {
      await api.delete(`/payroll/deductions/${id}`);
      fetchData();
      toast.success('Deduction removed');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove deduction');
    }
  };

  const handleCreateBonus = async (e) => {
    e.preventDefault();
    try {
      await api.post('/payroll/bonuses', { ...bonusForm, month, year });
      setBonusForm({ staff_id: '', bonus_type: 'performance_bonus', source: 'manual', amount: '', reason: '', status: 'approved' });
      fetchData();
      toast.success('Bonus added');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add bonus');
    }
  };

  const handleDeleteBonus = async (id) => {
    if (!window.confirm('Remove this payroll bonus?')) return;
    try {
      await api.delete(`/payroll/bonuses/${id}`);
      fetchData();
      toast.success('Bonus removed');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove bonus');
    }
  };

  const handleCreateTeacherSession = async (e) => {
    e.preventDefault();
    try {
      await api.post('/payroll/teacher-sessions', sessionForm);
      setSessionForm({
        teacher_id: '', session_date: new Date().toISOString().split('T')[0],
        pay_basis: 'per_class', session_type: 'regular', duration_hours: '1',
        student_count: '0', rate: '', amount: '', notes: '', status: 'approved'
      });
      fetchData();
      toast.success('Teacher session added to payroll sheet');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add teacher session');
    }
  };

  const handleDeleteTeacherSession = async (id) => {
    if (!window.confirm('Remove this teacher session from payroll calculation?')) return;
    try {
      await api.delete(`/payroll/teacher-sessions/${id}`);
      fetchData();
      toast.success('Teacher session removed');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove teacher session');
    }
  };

  const openPayModal = (item) => {
    setPayTarget(item);
    setSelectedAccountId('');
    setShowPayModal(true);
  };

  const handleConfirmPay = async () => {
    if (!payTarget) return;
    try {
      await api.post(`/payroll/pay/${payTarget.id}`);
      setShowPayModal(false);
      setPayTarget(null);
      fetchData();
      toast.success('Salary request sent to Expense Manager');
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

  const teacherOptions = staff.filter(member => ['trainer', 'teacher'].includes(member.role));

  if (loading) return <div className="canvas"><Loader2 className="animate-spin" color="var(--primary)" size={48} /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <PayrollView
        staff={staff} payrollHistory={payrollHistory} liquidAccounts={liquidAccounts}
        teacherSessions={teacherSessions} teacherOptions={teacherOptions}
        deductions={deductions} deductionForm={deductionForm} setDeductionForm={setDeductionForm}
        bonuses={bonuses} bonusForm={bonusForm} setBonusForm={setBonusForm}
        month={month} setMonth={setMonth} year={year} setYear={setYear}
        activeTab={activeTab} setActiveTab={setActiveTab} searchTerm={searchTerm} setSearchTerm={setSearchTerm}
        showPayModal={showPayModal} setShowPayModal={setShowPayModal} payTarget={payTarget}
        fundingSource={fundingSource} setFundingSource={setFundingSource}
        selectedAccountId={selectedAccountId} setSelectedAccountId={setSelectedAccountId}
        openPayModal={openPayModal} handleConfirmPay={handleConfirmPay}
        handleGeneratePayroll={handleGeneratePayroll} exportPDF={exportPDF}
        setShowAddStaffModal={setShowAddStaffModal} setSelectedStaff={setSelectedStaff}
        setProfileData={setProfileData} setShowProfileModal={setShowProfileModal}
        openStatusModal={openStatusModal}
        sessionForm={sessionForm} setSessionForm={setSessionForm}
        handleCreateTeacherSession={handleCreateTeacherSession}
        handleDeleteTeacherSession={handleDeleteTeacherSession}
        handleCreateDeduction={handleCreateDeduction}
        handleDeleteDeduction={handleDeleteDeduction}
        handleCreateBonus={handleCreateBonus}
        handleDeleteBonus={handleDeleteBonus}
      />

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
              <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Joining Date</label>
              <input className="glass-input" type="date" value={profileData.joining_date} onChange={(e) => setProfileData({...profileData, joining_date: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Base / Fixed Salary (BDT)</label>
              <input className="glass-input" type="number" required={['fixed', 'manual'].includes(profileData.salary_mode)} value={profileData.base_salary} onChange={(e) => setProfileData({...profileData, base_salary: e.target.value})} placeholder="0.00" />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Employment Type</label>
              <select className="glass-input" value={profileData.employment_type} onChange={(e) => setProfileData({...profileData, employment_type: e.target.value})}>
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="guest">Guest</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Salary Mode</label>
              <select className="glass-input" value={profileData.salary_mode} onChange={(e) => setProfileData({...profileData, salary_mode: e.target.value})}>
                <option value="fixed">Fixed salary</option>
                <option value="session_class">Session / class-wise</option>
                <option value="hourly">Hourly</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Work Shift</label>
              <select className="glass-input" value={profileData.work_shift} onChange={(e) => setProfileData({...profileData, work_shift: e.target.value})}>
                <option value="morning">Morning</option>
                <option value="evening">Evening</option>
                <option value="both">Both</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            {profileData.salary_mode === 'session_class' && <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Class Rate</label>
              <input className="glass-input" type="number" value={profileData.class_rate} onChange={(e) => setProfileData({...profileData, class_rate: e.target.value})} placeholder="0.00" />
            </div>}
            {profileData.salary_mode === 'hourly' && <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Hourly Rate</label>
              <input className="glass-input" type="number" value={profileData.hourly_rate} onChange={(e) => setProfileData({...profileData, hourly_rate: e.target.value})} placeholder="0.00" />
            </div>}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Festival Bonus</label>
              <input className="glass-input" type="number" value={profileData.festival_bonus} onChange={(e) => setProfileData({...profileData, festival_bonus: e.target.value})} placeholder="0.00" />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Conveyance Fee</label>
              <input className="glass-input" type="number" value={profileData.conveyance_fee} onChange={(e) => setProfileData({...profileData, conveyance_fee: e.target.value})} placeholder="0.00" />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Other Allowance</label>
              <input className="glass-input" type="number" value={profileData.other_allowance} onChange={(e) => setProfileData({...profileData, other_allowance: e.target.value})} placeholder="0.00" />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Deduction</label>
              <input className="glass-input" type="number" value={profileData.deduction} onChange={(e) => setProfileData({...profileData, deduction: e.target.value})} placeholder="0.00" />
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
            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Educational Background</label>
            <textarea className="glass-input" rows="3" placeholder={'BSc in English, University of Dhaka, 2020\nIELTS Trainer Certification, 2022'} value={profileData.educational_background} onChange={e => setProfileData({...profileData, educational_background: e.target.value})} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Work Experience</label>
            <textarea className="glass-input" rows="3" placeholder={'Senior Trainer, ABC Academy, 2021-2023\nCounselor, XYZ Education, 2019-2021'} value={profileData.work_experience} onChange={e => setProfileData({...profileData, work_experience: e.target.value})} />
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
          <div className="form-group"><label>Role</label><select className="glass-input" value={newStaffData.role} onChange={e => setNewStaffData({...newStaffData, role: e.target.value})}><option value="unassigned">Unassigned</option><option value="branch_admin">Branch Admin</option><option value="counselor">Counselor / CRM</option><option value="trainer">Teacher / Trainer</option><option value="accounts">Accounts</option><option value="hr">HR</option><option value="staff">Staff</option></select></div>

          <div style={{ gridColumn: 'span 2', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginTop: '0.5rem' }}>
            <h4 style={{ fontSize: '1rem', color: 'var(--primary)', margin: 0 }}>HR & Payroll Info</h4>
          </div>
          <div className="form-group"><label>Designation</label><input required className="glass-input" value={newStaffData.designation} onChange={e => setNewStaffData({...newStaffData, designation: e.target.value})} /></div>
          <div className="form-group"><label>Base / Fixed Salary (BDT)</label><input type="number" required={['fixed', 'manual'].includes(newStaffData.salary_mode)} className="glass-input" value={newStaffData.base_salary} onChange={e => setNewStaffData({...newStaffData, base_salary: e.target.value})} /></div>
          <div className="form-group"><label>Employment Type</label><select className="glass-input" value={newStaffData.employment_type} onChange={e => setNewStaffData({...newStaffData, employment_type: e.target.value})}><option value="full_time">Full-time</option><option value="part_time">Part-time</option><option value="contract">Contract</option><option value="guest">Guest</option></select></div>
          <div className="form-group"><label>Salary Mode</label><select className="glass-input" value={newStaffData.salary_mode} onChange={e => setNewStaffData({...newStaffData, salary_mode: e.target.value})}><option value="fixed">Fixed salary</option><option value="session_class">Session / class-wise</option><option value="hourly">Hourly</option><option value="manual">Manual</option></select></div>
          <div className="form-group"><label>Work Shift</label><select className="glass-input" value={newStaffData.work_shift} onChange={e => setNewStaffData({...newStaffData, work_shift: e.target.value})}><option value="morning">Morning</option><option value="evening">Evening</option><option value="both">Both</option><option value="custom">Custom</option></select></div>
          {newStaffData.salary_mode === 'session_class' && <div className="form-group"><label>Class / Session Rate</label><input type="number" className="glass-input" value={newStaffData.class_rate} onChange={e => setNewStaffData({...newStaffData, class_rate: e.target.value})} /></div>}
          {newStaffData.salary_mode === 'hourly' && <div className="form-group"><label>Hourly Rate</label><input type="number" className="glass-input" value={newStaffData.hourly_rate} onChange={e => setNewStaffData({...newStaffData, hourly_rate: e.target.value})} /></div>}
          <div className="form-group"><label>Festival Bonus</label><input type="number" className="glass-input" value={newStaffData.festival_bonus} onChange={e => setNewStaffData({...newStaffData, festival_bonus: e.target.value})} /></div>
          <div className="form-group"><label>Conveyance Fee</label><input type="number" className="glass-input" value={newStaffData.conveyance_fee} onChange={e => setNewStaffData({...newStaffData, conveyance_fee: e.target.value})} /></div>
          <div className="form-group"><label>Other Allowance</label><input type="number" className="glass-input" value={newStaffData.other_allowance} onChange={e => setNewStaffData({...newStaffData, other_allowance: e.target.value})} /></div>
          <div className="form-group"><label>Deduction</label><input type="number" className="glass-input" value={newStaffData.deduction} onChange={e => setNewStaffData({...newStaffData, deduction: e.target.value})} /></div>
          <div className="form-group"><label>Father's Name</label><input className="glass-input" value={newStaffData.father_name} onChange={e => setNewStaffData({...newStaffData, father_name: e.target.value})} /></div>
          <div className="form-group"><label>Mother's Name</label><input className="glass-input" value={newStaffData.mother_name} onChange={e => setNewStaffData({...newStaffData, mother_name: e.target.value})} /></div>
          <div className="form-group"><label>Contact Details</label><input className="glass-input" value={newStaffData.contact_details} onChange={e => setNewStaffData({...newStaffData, contact_details: e.target.value})} /></div>
          <div className="form-group"><label>Address</label><input className="glass-input" value={newStaffData.address} onChange={e => setNewStaffData({...newStaffData, address: e.target.value})} /></div>
          
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label>Educational Background</label>
            <textarea className="glass-input" rows="2" placeholder={'One entry per line'} value={newStaffData.educational_background} onChange={e => setNewStaffData({...newStaffData, educational_background: e.target.value})} />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label>Work Experience</label>
            <textarea className="glass-input" rows="2" placeholder={'One entry per line'} value={newStaffData.work_experience} onChange={e => setNewStaffData({...newStaffData, work_experience: e.target.value})} />
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ gridColumn: 'span 2', marginTop: '1rem', padding: '1rem' }}>
            {loading ? 'Processing...' : 'Register Comprehensive Staff Profile'}
          </button>
        </form>
      </Modal>

      <Modal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} title={`Change Staff Status: ${statusTarget?.name || ''}`}>
        <form onSubmit={handleUpdateStaffStatus} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label>Employment Status</label>
            <select className="glass-input" value={statusForm.employment_status} onChange={e => setStatusForm({ ...statusForm, employment_status: e.target.value })}>
              <option value="active">Active</option>
              <option value="on_leave">On leave</option>
              <option value="notice_period">Notice period</option>
              <option value="resigned">Resigned</option>
              <option value="terminated">Terminated</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div className="form-group"><label>Exit Date</label><input type="date" className="glass-input" value={statusForm.exit_date} onChange={e => setStatusForm({ ...statusForm, exit_date: e.target.value })} /></div>
          <div className="form-group"><label>Notice Start</label><input type="date" className="glass-input" value={statusForm.notice_start_date} onChange={e => setStatusForm({ ...statusForm, notice_start_date: e.target.value })} /></div>
          <div className="form-group"><label>Notice End</label><input type="date" className="glass-input" value={statusForm.notice_end_date} onChange={e => setStatusForm({ ...statusForm, notice_end_date: e.target.value })} /></div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}><label>Exit Reason</label><textarea className="glass-input" rows="2" value={statusForm.exit_reason} onChange={e => setStatusForm({ ...statusForm, exit_reason: e.target.value })} /></div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}><label>Final Settlement Notes</label><textarea className="glass-input" rows="2" value={statusForm.final_settlement_notes} onChange={e => setStatusForm({ ...statusForm, final_settlement_notes: e.target.value })} /></div>
          <button className="btn-primary" type="submit" style={{ gridColumn: 'span 2', padding: '0.9rem' }}>Save Status</button>
        </form>
      </Modal>

    </div>
  );
};

export default Payroll;
