import React from 'react';
import {
  Users, History, Plus, CheckCircle2, Loader2, TrendingUp, Settings2,
  Download, Building2, Calendar, Wallet, Search, Trash2
} from 'lucide-react';
import Modal from '../components/Modal';

const money = (value) => `৳${parseFloat(value || 0).toLocaleString()}`;
const labelize = (value) => String(value || '').replace(/_/g, ' ');
const salaryModeLabel = (value) => ({
  fixed: 'Fixed salary',
  monthly: 'Fixed salary',
  session_class: 'Session / class',
  per_class: 'Session / class',
  hourly: 'Hourly',
  per_hour: 'Hourly',
  manual: 'Manual',
  per_student: 'Session / class'
}[value] || 'Fixed salary');
const employmentLabel = (value) => ({ permanent: 'Full time', full_time: 'Full time' }[value] || labelize(value || 'full_time'));
const entryText = (value) => {
  if (!value) return '';
  if (Array.isArray(value)) {
    return value.map(item => typeof item === 'string' ? item : Object.values(item || {}).filter(Boolean).join(', ')).filter(Boolean).join('\n');
  }
  return String(value);
};
const statusStyle = (status) => ({
  paid: { bg: 'rgba(76,175,80,0.12)', color: '#4caf50', label: 'Paid' },
  pending_admin: { bg: 'rgba(155,109,255,0.12)', color: '#9B6DFF', label: 'Admin source needed' },
  pending_accounting: { bg: 'rgba(50,97,154,0.12)', color: 'var(--primary)', label: 'Sent to accounting' },
  rejected: { bg: 'rgba(244,67,54,0.12)', color: '#f44336', label: 'Rejected' },
  draft: { bg: 'rgba(255,152,0,0.12)', color: '#ff9800', label: 'Draft' }
}[status] || { bg: 'rgba(255,152,0,0.12)', color: '#ff9800', label: status || 'Draft' });
const lifecycleStyle = (status) => ({
  active: { bg: 'rgba(76,175,80,0.12)', color: '#4caf50' },
  on_leave: { bg: 'rgba(50,97,154,0.12)', color: 'var(--primary)' },
  notice_period: { bg: 'rgba(255,152,0,0.12)', color: '#ff9800' },
  resigned: { bg: 'rgba(100,116,139,0.16)', color: '#64748b' },
  terminated: { bg: 'rgba(244,67,54,0.12)', color: '#f44336' },
  inactive: { bg: 'rgba(100,116,139,0.16)', color: '#64748b' },
  suspended: { bg: 'rgba(244,67,54,0.12)', color: '#f44336' }
}[status] || { bg: 'rgba(76,175,80,0.12)', color: '#4caf50' });

const PayrollView = ({
  staff, payrollHistory, teacherSessions, teacherOptions, deductions, deductionForm, setDeductionForm,
  bonuses, bonusForm, setBonusForm,
  month, setMonth, year, setYear, activeTab, setActiveTab, searchTerm, setSearchTerm,
  showPayModal, setShowPayModal, payTarget,
  openPayModal, handleConfirmPay, handleGeneratePayroll, exportPDF,
  setShowAddStaffModal, setSelectedStaff, setProfileData, setShowProfileModal, openStatusModal,
  sessionForm, setSessionForm, handleCreateTeacherSession, handleDeleteTeacherSession,
  handleCreateDeduction, handleDeleteDeduction, handleCreateBonus, handleDeleteBonus
}) => {
  const filteredStaff = staff.filter(m =>
    !searchTerm || m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.StaffProfile?.designation || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Payroll period status logic ──
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const selectedMonthStart = new Date(Number(year), Number(month) - 1, 1);
  const canGenerate = selectedMonthStart < currentMonthStart; // Only past months
  const allCompleted = payrollHistory.length > 0 && payrollHistory.every(p => ['paid', 'pending_accounting', 'pending_admin'].includes(p.status));
  const hasDrafts = payrollHistory.some(p => p.status === 'draft' || p.status === 'rejected');
  const paidCount = payrollHistory.filter(p => p.status === 'paid').length;
  const pendingCount = payrollHistory.filter(p => p.status === 'pending_accounting').length;
  const pendingAdminCount = payrollHistory.filter(p => p.status === 'pending_admin').length;
  const draftCount = payrollHistory.filter(p => p.status === 'draft').length;

  const runPayrollDisabled = !canGenerate || allCompleted;
  const runPayrollLabel = !canGenerate
    ? 'Month Not Closed'
    : allCompleted
        ? '✓ Payroll Submitted'
      : hasDrafts
        ? 'Re-Run Payroll'
        : 'Run Payroll';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Staff & Payroll</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', margin: '4px 0 0' }}>Staff profiles, salary management & disbursement</p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={() => setShowAddStaffModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Plus size={16} /> Add Staff</button>
          <button className="btn-secondary" onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Download size={16} /> Export PDF</button>
          <button
            className={runPayrollDisabled ? 'btn-secondary' : 'btn-primary'}
            onClick={handleGeneratePayroll}
            disabled={runPayrollDisabled}
            title={!canGenerate ? `Payroll for ${new Date(0, month - 1).toLocaleString('default', { month: 'long' })} ${year} cannot be generated until the month has ended.` : allCompleted ? `All ${payrollHistory.length} salary records for this month are already processed.` : ''}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: runPayrollDisabled ? 0.55 : 1, cursor: runPayrollDisabled ? 'not-allowed' : 'pointer' }}
          >
            {allCompleted ? <CheckCircle2 size={18} /> : <TrendingUp size={18} />} {runPayrollLabel}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border)' }}>
        {[{ id: 'staff', label: 'Staff Directory', icon: <Users size={16} /> }, { id: 'payroll', label: 'Payroll Sheet', icon: <History size={16} /> }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.5rem',
            background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '-2px', transition: 'all 0.2s',
            borderBottom: activeTab === tab.id ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-dim)',
            fontWeight: activeTab === tab.id ? '700' : '500'
          }}>{tab.icon} {tab.label}</button>
        ))}
      </div>

      {/* ═══ STAFF DIRECTORY TAB ═══ */}
      {activeTab === 'staff' && (
        <div className="glass-morphism" style={{ padding: '1.2rem', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)' }}>{staff.length} staff member{staff.length !== 1 ? 's' : ''}</p>
            <div style={{ position: 'relative', maxWidth: '240px', width: '100%' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input className="glass-input" placeholder="Search staff..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ paddingLeft: '30px', fontSize: '0.8rem', height: '34px' }} />
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                  {['Name', 'Role', 'Designation', 'Employment', 'Salary Mode', 'Shift', 'Salary & Allowances', 'Rates', 'Bank', 'Contact', 'Lifecycle', ''].map(h => (
                    <th key={h} style={{ padding: '0.65rem 0.5rem', fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map(member => {
                  const sp = member.StaffProfile;
                  const pr = member.StaffPayRule;
                  const lifecycle = sp?.employment_status || (member.status === 'inactive' ? 'inactive' : member.status === 'suspended' ? 'suspended' : 'active');
                  const lifeStyle = lifecycleStyle(lifecycle);
                  return (
                    <tr key={member.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                      onMouseOver={e => e.currentTarget.style.background = 'var(--glass)'}
                      onMouseOut={e => e.currentTarget.style.background = 'none'}>
                      <td style={{ padding: '0.7rem 0.5rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{ width: '30px', height: '30px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '0.7rem', flexShrink: 0 }}>{member.name?.[0]}</div>
                          <div>
                            <p style={{ fontWeight: '600', margin: 0 }}>{member.name}</p>
                            <p style={{ fontSize: '0.68rem', color: 'var(--text-dim)', margin: 0 }}>{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.7rem 0.5rem' }}>
                        <span style={{ background: 'var(--glass)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: '600', textTransform: 'capitalize', border: '1px solid var(--border)' }}>{member.role?.replace(/_/g, ' ')}</span>
                      </td>
                      <td style={{ padding: '0.7rem 0.5rem', color: sp?.designation ? 'inherit' : 'var(--text-dim)', fontStyle: sp?.designation ? 'normal' : 'italic' }}>{sp?.designation || '—'}</td>
                      <td style={{ padding: '0.7rem 0.5rem', textTransform: 'capitalize' }}>{employmentLabel(pr?.employment_type)}</td>
                      <td style={{ padding: '0.7rem 0.5rem' }}>
                        <span style={{ background: 'rgba(50,97,154,0.1)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '8px', fontSize: '0.68rem', fontWeight: '600' }}>{salaryModeLabel(pr?.salary_mode || pr?.pay_type)}</span>
                      </td>
                      <td style={{ padding: '0.7rem 0.5rem', textTransform: 'capitalize', color: 'var(--text-dim)' }}>{labelize(pr?.work_shift || 'both')}</td>
                      <td style={{ padding: '0.7rem 0.5rem', fontSize: '0.75rem' }}>
                        <strong style={{ color: 'var(--primary)' }}>{money(pr?.base_salary ?? sp?.base_salary)}</strong><br />
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.68rem' }}>Bonus {money(pr?.festival_bonus)} · Conv {money(pr?.conveyance_fee)}</span>
                      </td>
                      <td style={{ padding: '0.7rem 0.5rem', fontSize: '0.75rem' }}>
                        {parseFloat(pr?.class_rate || 0) > 0 && <div>Class {money(pr.class_rate)}</div>}
                        {parseFloat(pr?.hourly_rate || 0) > 0 && <div>Hour {money(pr.hourly_rate)}</div>}
                        {!parseFloat(pr?.class_rate || 0) && !parseFloat(pr?.hourly_rate || 0) && <span style={{ color: 'var(--text-dim)' }}>—</span>}
                      </td>
                      <td style={{ padding: '0.7rem 0.5rem', fontSize: '0.75rem' }}>
                        {sp?.bank_name ? (<>{sp.bank_name}<br /><span style={{ color: 'var(--text-dim)', fontSize: '0.68rem' }}>{sp.account_no || ''}</span></>) : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                      </td>
                      <td style={{ padding: '0.7rem 0.5rem', fontSize: '0.75rem' }}>{sp?.contact_details || <span style={{ color: 'var(--text-dim)' }}>—</span>}</td>
                      <td style={{ padding: '0.7rem 0.5rem' }}>
                        <span style={{ background: lifeStyle.bg, color: lifeStyle.color, padding: '2px 10px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: '600', textTransform: 'capitalize' }}>{labelize(lifecycle)}</span>
                        {sp?.exit_date && <div style={{ color: 'var(--text-dim)', fontSize: '0.62rem', marginTop: '3px' }}>Exit: {sp.exit_date}</div>}
                      </td>
                      <td style={{ padding: '0.7rem 0.5rem', whiteSpace: 'nowrap' }}>
                        <button onClick={() => {
                          setSelectedStaff(member);
                          setProfileData({
                            designation: sp?.designation || '', joining_date: sp?.joining_date || '', base_salary: sp?.base_salary || '',
                            bank_name: sp?.bank_name || '', account_no: sp?.account_no || '',
                            father_name: sp?.father_name || '', mother_name: sp?.mother_name || '',
                            address: sp?.address || '', contact_details: sp?.contact_details || '',
                            employment_type: pr?.employment_type === 'permanent' ? 'full_time' : (pr?.employment_type || 'full_time'),
                            salary_mode: pr?.salary_mode || (pr?.pay_type === 'per_class' ? 'session_class' : pr?.pay_type === 'per_hour' ? 'hourly' : pr?.pay_type === 'manual' ? 'manual' : 'fixed'),
                            work_shift: pr?.work_shift || 'both',
                            class_rate: pr?.class_rate || '', hourly_rate: pr?.hourly_rate || '',
                            festival_bonus: pr?.festival_bonus || '', conveyance_fee: pr?.conveyance_fee || '',
                            other_allowance: pr?.other_allowance || '', deduction: pr?.deduction || '',
                            is_payroll_active: pr?.is_payroll_active !== false,
                            employment_status: lifecycle,
                            exit_date: sp?.exit_date || '', exit_reason: sp?.exit_reason || '',
                            notice_start_date: sp?.notice_start_date || '', notice_end_date: sp?.notice_end_date || '',
                            final_settlement_status: sp?.final_settlement_status || 'pending',
                            final_settlement_notes: sp?.final_settlement_notes || '',
                            educational_background: entryText(sp?.educational_background),
                            work_experience: entryText(sp?.work_experience)
                          });
                          setShowProfileModal(true);
                        }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '4px' }}><Settings2 size={15} /></button>
                        <button onClick={() => openStatusModal(member)} style={{ background: 'none', border: 'none', color: lifeStyle.color, cursor: 'pointer', padding: '4px', fontSize: '0.68rem', fontWeight: 700 }}>Status</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ PAYROLL SHEET TAB ═══ */}
      {activeTab === 'payroll' && (
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', background: 'var(--glass)', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <Calendar size={14} color="var(--text-dim)" />
              <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="glass-morphism" style={{ border: 'none', background: 'none', color: 'var(--text-main)', fontSize: '0.85rem' }}>
                {[...Array(12)].map((_, i) => <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>)}
              </select>
              <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="glass-morphism" style={{ border: 'none', background: 'none', color: 'var(--text-main)', fontSize: '0.85rem' }}>
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {/* Period status badges */}
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {!canGenerate && (
                <span style={{ background: 'rgba(255,152,0,0.12)', color: '#ff9800', padding: '3px 10px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: '700' }}>⏳ Month not closed yet</span>
              )}
              {canGenerate && payrollHistory.length === 0 && (
                <span style={{ background: 'rgba(50,97,154,0.12)', color: 'var(--primary)', padding: '3px 10px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: '700' }}>Ready to generate</span>
              )}
              {allCompleted && (
                <span style={{ background: 'rgba(76,175,80,0.12)', color: '#4caf50', padding: '3px 10px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: '700' }}>✓ Payroll Submitted</span>
              )}
              {paidCount > 0 && <span style={{ fontSize: '0.72rem', color: '#4caf50', fontWeight: '600' }}>{paidCount} paid</span>}
              {pendingAdminCount > 0 && <span style={{ fontSize: '0.72rem', color: '#9B6DFF', fontWeight: '600' }}>{pendingAdminCount} source needed</span>}
              {pendingCount > 0 && <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: '600' }}>{pendingCount} pending</span>}
              {draftCount > 0 && <span style={{ fontSize: '0.72rem', color: '#ff9800', fontWeight: '600' }}>{draftCount} draft</span>}
              {payrollHistory.length > 0 && <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>· {payrollHistory.length} total</span>}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
            <div id="salary-sheet-container" className="glass-morphism" style={{ padding: '1.2rem', overflow: 'hidden' }}>
              {payrollHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                  <History size={36} style={{ opacity: 0.3, marginBottom: '0.6rem' }} /><br />No payroll records for this period. Click <strong>"Run Payroll"</strong> to generate drafts.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)' }}>
                        {['Staff', 'Type', 'Shift', 'Base', 'Bonus', 'Conveyance', 'Sessions / Hours', 'Deductions', 'Net Salary', 'Accounting', 'Action'].map(h => (
                          <th key={h} style={{ padding: '0.65rem 0.5rem', fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', textAlign: 'left' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {payrollHistory.map(item => {
                        const st = statusStyle(item.status);
                        const pr = item.pay_rule || {};
                        const sessions = item.session_summary || {};
                        const sessionPay = parseFloat(sessions.amount || 0);
                        const oneTimeBonus = parseFloat(item.bonuses_summary?.approved || 0) + parseFloat(item.bonuses_summary?.applied || 0);
                        return <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ width: '30px', height: '30px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '0.7rem' }}>{item.Staff?.name?.[0]}</div>
                              <span style={{ fontWeight: '600' }}>{item.Staff?.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.72rem' }}><strong>{salaryModeLabel(pr.salary_mode || pr.pay_type)}</strong><br /><span style={{ color: 'var(--text-dim)' }}>{employmentLabel(pr.employment_type)}</span></td>
                          <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-dim)', textTransform: 'capitalize' }}>{labelize(pr.work_shift || 'both')}</td>
                          <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-dim)' }}>{money(item.base_salary)}</td>
                          <td style={{ padding: '0.75rem 0.5rem', color: oneTimeBonus > 0 ? 'var(--success)' : 'var(--text-dim)' }}>{money(parseFloat(pr.festival_bonus || 0) + oneTimeBonus)}</td>
                          <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-dim)' }}>{money(pr.conveyance_fee)}</td>
                          <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.72rem' }}>
                            {sessionPay > 0 ? <><strong style={{ color: 'var(--success)' }}>{money(sessionPay)}</strong><br /><span style={{ color: 'var(--text-dim)' }}>{sessions.session_count || 0} classes · {parseFloat(sessions.total_hours || 0).toLocaleString()}h</span></> : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', color: parseFloat(item.deductions || 0) > 0 ? 'var(--danger)' : 'var(--text-dim)' }}>{money(item.deductions)}</td>
                          <td style={{ padding: '0.75rem 0.5rem', fontWeight: '700', color: 'var(--primary)', fontSize: '0.95rem' }}>{money(item.net_salary)}</td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <span style={{ background: st.bg, color: st.color, padding: '3px 12px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase' }}>{st.label}</span>
                            {item.accounting_expense?.status && <div style={{ marginTop: '3px', fontSize: '0.62rem', color: 'var(--text-dim)' }}>Expense: {labelize(item.accounting_expense.status)}</div>}
                            {item.rejection_reason && <div style={{ marginTop: '3px', fontSize: '0.62rem', color: 'var(--danger)' }}>{item.rejection_reason}</div>}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            {['draft', 'rejected'].includes(item.status) && <button onClick={() => openPayModal(item)} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem' }}><Wallet size={13} /> Submit</button>}
                            {item.status === 'pending_admin' && <span style={{ color: '#9B6DFF', fontSize: '0.72rem' }}>Expense Manager</span>}
                            {item.status === 'pending_accounting' && <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>Awaiting accounting</span>}
                             {item.status === 'paid' && <CheckCircle2 color="var(--success)" size={18} />}
                          </td>
                        </tr>;
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Teacher Session Pay sidebar */}
            <div className="glass-morphism" style={{ padding: '1.2rem', height: 'fit-content' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.95rem' }}><Building2 size={16} /> Teacher Session Pay</h3>
              <form onSubmit={handleCreateTeacherSession} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1rem' }}>
                <select className="glass-input" required value={sessionForm.teacher_id} onChange={e => setSessionForm({ ...sessionForm, teacher_id: e.target.value })}>
                  <option value="">Select teacher</option>
                  {teacherOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <input className="glass-input" type="date" required value={sessionForm.session_date} onChange={e => setSessionForm({ ...sessionForm, session_date: e.target.value })} />
                <select className="glass-input" value={sessionForm.pay_basis} onChange={e => setSessionForm({ ...sessionForm, pay_basis: e.target.value })}>
                  <option value="per_class">Per class / session</option><option value="per_hour">Per hour</option><option value="manual">Manual</option>
                </select>
                <input className="glass-input" type="number" min="0" step="0.01" placeholder="Rate" value={sessionForm.rate} onChange={e => setSessionForm({ ...sessionForm, rate: e.target.value })} />
                <input className="glass-input" type="number" min="0" step="0.25" placeholder="Hours" value={sessionForm.duration_hours} onChange={e => setSessionForm({ ...sessionForm, duration_hours: e.target.value })} />
                <input className="glass-input" type="number" min="0" placeholder="Students" value={sessionForm.student_count} onChange={e => setSessionForm({ ...sessionForm, student_count: e.target.value })} />
                {sessionForm.pay_basis === 'manual' && <input className="glass-input" type="number" min="0" step="0.01" placeholder="Amount" value={sessionForm.amount} onChange={e => setSessionForm({ ...sessionForm, amount: e.target.value })} />}
                <button type="submit" className="btn-primary" style={{ gridColumn: 'span 2', padding: '0.6rem', fontSize: '0.8rem' }}>Add Session</button>
              </form>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '240px', overflowY: 'auto' }}>
                {teacherSessions.length === 0 ? <p style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>No sessions this month.</p> : teacherSessions.map(session => (
                  <div key={session.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                    <div>
                      <p style={{ fontSize: '0.78rem', fontWeight: 700, margin: 0 }}>{session.Teacher?.name || 'Teacher'} · {session.session_date}</p>
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-dim)', margin: 0 }}>{session.pay_basis} · {session.duration_hours || 0}h · {session.student_count || 0} students</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <strong style={{ color: 'var(--primary)', fontSize: '0.8rem' }}>৳{parseFloat(session.amount || 0).toLocaleString()}</strong>
                      <button type="button" onClick={() => handleDeleteTeacherSession(session.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', marginTop: '1rem', paddingTop: '1rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.95rem' }}><TrendingUp size={16} /> Bonuses</h3>
                <form onSubmit={handleCreateBonus} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1rem' }}>
                  <select className="glass-input" required value={bonusForm.staff_id} onChange={e => setBonusForm({ ...bonusForm, staff_id: e.target.value })}>
                    <option value="">Select staff</option>
                    {staff.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
                  </select>
                  <select className="glass-input" value={bonusForm.bonus_type} onChange={e => setBonusForm({ ...bonusForm, bonus_type: e.target.value })}>
                    <option value="performance_bonus">Performance bonus</option><option value="festival_bonus">Festival bonus</option><option value="attendance_bonus">Attendance bonus</option><option value="sales_bonus">Sales bonus</option><option value="manual_adjustment">Manual adjustment</option><option value="other">Other</option>
                  </select>
                  <select className="glass-input" value={bonusForm.source} onChange={e => setBonusForm({ ...bonusForm, source: e.target.value })}>
                    <option value="manual">Manual</option><option value="performance">Performance</option><option value="festival">Festival</option><option value="attendance">Attendance</option><option value="sales">Sales</option>
                  </select>
                  <input className="glass-input" type="number" min="0" step="0.01" required placeholder="Amount" value={bonusForm.amount} onChange={e => setBonusForm({ ...bonusForm, amount: e.target.value })} />
                  <input className="glass-input" style={{ gridColumn: 'span 2' }} placeholder="Reason" value={bonusForm.reason} onChange={e => setBonusForm({ ...bonusForm, reason: e.target.value })} />
                  <button type="submit" className="btn-primary" style={{ gridColumn: 'span 2', padding: '0.6rem', fontSize: '0.8rem' }}>Add Bonus</button>
                </form>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto', marginBottom: '1rem' }}>
                  {!bonuses?.length ? <p style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>No bonuses this month.</p> : bonuses.map(bonus => (
                    <div key={bonus.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                      <div>
                        <p style={{ fontSize: '0.78rem', fontWeight: 700, margin: 0 }}>{bonus.Staff?.name || 'Staff'} · {labelize(bonus.bonus_type)}</p>
                        <p style={{ fontSize: '0.68rem', color: 'var(--text-dim)', margin: 0 }}>{labelize(bonus.source)} · {bonus.reason || 'No reason'} · {bonus.status}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <strong style={{ color: 'var(--success)', fontSize: '0.8rem' }}>{money(bonus.amount)}</strong>
                        {bonus.status !== 'applied' && <button type="button" onClick={() => handleDeleteBonus(bonus.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={14} /></button>}
                      </div>
                    </div>
                  ))}
                </div>

                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.95rem' }}><Wallet size={16} /> Deductions</h3>
                <form onSubmit={handleCreateDeduction} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1rem' }}>
                  <select className="glass-input" required value={deductionForm.staff_id} onChange={e => setDeductionForm({ ...deductionForm, staff_id: e.target.value })}>
                    <option value="">Select staff</option>
                    {staff.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
                  </select>
                  <select className="glass-input" value={deductionForm.deduction_type} onChange={e => setDeductionForm({ ...deductionForm, deduction_type: e.target.value })}>
                    <option value="loan_repayment">Loan repayment</option><option value="advance_recovery">Advance recovery</option><option value="unpaid_leave">Unpaid leave</option><option value="absence">Absence</option><option value="late_fine">Late fine</option><option value="disciplinary_fine">Disciplinary fine</option><option value="manual_adjustment">Manual adjustment</option><option value="tax">Tax</option><option value="other">Other</option>
                  </select>
                  <select className="glass-input" value={deductionForm.source} onChange={e => setDeductionForm({ ...deductionForm, source: e.target.value })}>
                    <option value="manual">Manual</option><option value="loan">Loan</option><option value="attendance">Attendance</option><option value="fine">Fine</option><option value="advance">Advance</option>
                  </select>
                  <input className="glass-input" type="number" min="0" step="0.01" required placeholder="Amount" value={deductionForm.amount} onChange={e => setDeductionForm({ ...deductionForm, amount: e.target.value })} />
                  <input className="glass-input" style={{ gridColumn: 'span 2' }} placeholder="Reason" value={deductionForm.reason} onChange={e => setDeductionForm({ ...deductionForm, reason: e.target.value })} />
                  <button type="submit" className="btn-primary" style={{ gridColumn: 'span 2', padding: '0.6rem', fontSize: '0.8rem' }}>Add Deduction</button>
                </form>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '220px', overflowY: 'auto' }}>
                  {!deductions?.length ? <p style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>No deductions this month.</p> : deductions.map(deduction => (
                    <div key={deduction.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                      <div>
                        <p style={{ fontSize: '0.78rem', fontWeight: 700, margin: 0 }}>{deduction.Staff?.name || 'Staff'} · {labelize(deduction.deduction_type)}</p>
                        <p style={{ fontSize: '0.68rem', color: 'var(--text-dim)', margin: 0 }}>{labelize(deduction.source)} · {deduction.reason || 'No reason'} · {deduction.status}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <strong style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{money(deduction.amount)}</strong>
                        {deduction.status !== 'applied' && <button type="button" onClick={() => handleDeleteDeduction(deduction.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={14} /></button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ PAYROLL REQUEST MODAL ═══ */}
      <Modal isOpen={showPayModal} onClose={() => setShowPayModal(false)} title={`Submit Payroll Request: ${payTarget?.Staff?.name || ''}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={{ background: 'var(--glass)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-dim)' }}>Net Salary</span>
            <span style={{ fontWeight: '800', fontSize: '1.1rem', color: 'var(--primary)' }}>৳{payTarget ? parseFloat(payTarget.net_salary).toLocaleString() : 0}</span>
          </div>
          <div style={{ background: 'rgba(155,109,255,0.08)', border: '1px solid rgba(155,109,255,0.22)', borderRadius: 'var(--radius)', padding: '0.9rem', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
            HR submits only the payroll amount. Admin will choose cash, bank, or mobile wallet from the pending payroll row in Expense Manager.
          </div>
          <button onClick={handleConfirmPay} className="btn-primary" style={{ padding: '0.9rem', marginTop: '0.5rem', fontSize: '0.9rem' }}>
            <CheckCircle2 size={18} /> Submit Request to Expense Manager
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default PayrollView;
