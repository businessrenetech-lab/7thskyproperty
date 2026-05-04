import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Loader2,
  Mail,
  Phone,
  Calendar,
  Users,
  CheckCircle2,
  BookOpen,
  UserCircle,
  Send,
  SlidersHorizontal,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import AddStudentModal from '../components/AddStudentModal';
import '../styles/GlobalStyles.css';

const toDateOnly = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString();
};

const getDerivedState = (student) => {
  if (student.status === 'dropped') return 'dropped';
  if ((student.rejected_fees || []).length > 0) return 'payment_rejected';
  if (['pending', 'partial', 'overdue'].includes(student.fee_summary?.status) && Number(student.fee_summary?.due || 0) > 0) return 'fees_pending';
  if (!student.Batch) return 'unassigned';

  const end = toDateOnly(student.Batch.end_date);
  const today = toDateOnly(new Date());
  if (end && today && today >= end) return 'course_completed';
  return 'enrolled';
};

const stateLabel = {
  fees_pending: 'Fees Pending',
  payment_rejected: 'Rejected Payment',
  enrolled: 'Enrolled',
  course_completed: 'Course Completed',
  dropped: 'Dropped',
  unassigned: 'Unassigned'
};

const stateStyle = {
  fees_pending: { bg: 'rgba(249,115,22,0.16)', color: '#f97316', border: '#f97316' },
  payment_rejected: { bg: 'rgba(239,68,68,0.16)', color: '#ef4444', border: '#ef4444' },
  enrolled: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '#3b82f6' },
  course_completed: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: '#10b981' },
  dropped: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '#ef4444' },
  unassigned: { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', border: '#94a3b8' }
};

const StudentInfoRow = ({ label, value }) => (
  <div className="student-card-info-row">
    <span>{label}</span>
    <strong>{value || 'N/A'}</strong>
  </div>
);

const StudentMobileCard = ({
  student,
  mode,
  isAccountant,
  batches,
  batchDrafts,
  setBatchDrafts,
  rowSavingId,
  requestingAccessId,
  onSaveBatch,
  onStatusChange,
  onRequestPartnerAccess,
  onOpenSuccessRecord,
  onProfile,
  onCollectFee
}) => {
  const state = student.derivedState;
  const style = stateStyle[state] || stateStyle.unassigned;
  const busy = rowSavingId === student.id;

  return (
    <article className="student-mobile-card glass-morphism">
      <div className="student-card-head">
        <div className="student-avatar"><UserCircle size={22} /></div>
        <div className="student-card-title-block">
          <h3>{student.User?.name || 'Unnamed Student'}</h3>
          <p>STU-{student.id}</p>
        </div>
        <span className="student-state-pill" style={{ background: style.bg, color: style.color, borderColor: style.border }}>
          {stateLabel[state] || 'Unknown'}
        </span>
      </div>

      <div className="student-card-contact">
        <span><Mail size={13} /> {student.User?.email || 'No email'}</span>
        <span><Phone size={13} /> {student.mobile_no || 'No phone'}</span>
      </div>

      <div className="student-card-info-grid">
        <StudentInfoRow label="Course" value={student.Batch?.Course?.title} />
        <StudentInfoRow label="Batch" value={student.Batch?.code || (mode === 'all' ? 'Unassigned' : 'N/A')} />
        {mode !== 'success' && <StudentInfoRow label="Enrollment" value={formatDate(student.enrollment_date)} />}
        {mode !== 'success' && <StudentInfoRow label="Referred By" value={student.referred_by || 'None'} />}
        {mode === 'all' && <StudentInfoRow label="Completion" value={state === 'course_completed' ? formatDate(student.completionDate) : 'In Progress'} />}
        {mode === 'success' && <StudentInfoRow label="Completion" value={formatDate(student.course_completion_date || student.Batch?.end_date)} />}
        {mode === 'success' && <StudentInfoRow label="Final Result" value={student.final_course_result || 'Not recorded'} />}
        {mode === 'success' && <StudentInfoRow label="Target" value={student.target_country} />}
        {mode === 'success' && <StudentInfoRow label="Destination" value={student.success_destination_country || 'Not recorded'} />}
        {mode === 'success' && <StudentInfoRow label="English Level" value={student.english_level ? `${student.english_level.charAt(0).toUpperCase()}${student.english_level.slice(1)}` : 'N/A'} />}
      </div>

      {mode === 'all' && !isAccountant && (
        <div className="student-card-batch-row">
          <select
            className="glass-input"
            value={batchDrafts[student.id] || ''}
            onChange={(e) => setBatchDrafts({ ...batchDrafts, [student.id]: e.target.value })}
            style={{ appearance: 'auto' }}
          >
            <option value="">Unassign</option>
            {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.code}</option>)}
          </select>
          <button className="btn-secondary" onClick={() => onSaveBatch(student)} disabled={busy}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
          </button>
        </div>
      )}

      <div className="student-card-actions">
        {mode === 'enrolled' && (
          <button className="btn-secondary student-card-primary-action" onClick={() => onRequestPartnerAccess(student)} disabled={requestingAccessId === student.id}>
            {requestingAccessId === student.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {requestingAccessId === student.id ? 'Sending...' : 'Portal Access'}
          </button>
        )}
        {mode === 'success' && (
          <button className="btn-secondary student-card-primary-action" onClick={() => onOpenSuccessRecord(student)}>
            {student.has_success_record ? 'Edit Record' : 'Add Record'}
          </button>
        )}
        <button className="btn-secondary" onClick={() => onProfile(student)}>Profile</button>
        {mode === 'all' && student.derivedState === 'fees_pending' && (
          <button className="btn-secondary student-fee-action" onClick={() => onCollectFee(student)}>Collect Fee</button>
        )}
        {mode === 'all' && !isAccountant && (
          student.status === 'dropped' ? (
            <button className="btn-secondary student-reactivate-action" onClick={() => onStatusChange(student, 'active')}>Reactivate</button>
          ) : (
            <button className="btn-secondary student-drop-action" onClick={() => onStatusChange(student, 'dropped')}>Drop</button>
          )
        )}
      </div>
    </article>
  );
};

const Students = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAccountant = ['accounting', 'accounts'].includes(user?.role);
  const [activeTab, setActiveTab] = useState('all_students');
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [batchFilter, setBatchFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');


  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [requestingAccessId, setRequestingAccessId] = useState(null);
  const [newStudentData, setNewStudentData] = useState({ name: '', email: '', mobile_no: '', batch_id: '', course_id: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [rowSavingId, setRowSavingId] = useState(null);
  const [batchDrafts, setBatchDrafts] = useState({});
  const [successForm, setSuccessForm] = useState({ final_course_result: '', success_destination_country: '', success_notes: '' });
  const [showFilters, setShowFilters] = useState(false);
  const activeFilterCount = [batchFilter, courseFilter, stateFilter].filter(f => f !== 'all').length;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [studentsRes, batchesRes, coursesRes] = await Promise.all([
        api.get('/students'),
        api.get('/lms/batches'),
        api.get('/lms/courses')
      ]);
      setStudents(studentsRes.data || []);
      setBatches(batchesRes.data || []);
      setCourses(coursesRes.data || []);

      const drafts = {};
      (studentsRes.data || []).forEach((student) => {
        drafts[student.id] = student.batch_id || '';
      });
      setBatchDrafts(drafts);
    } catch (error) {
      console.error('Failed to fetch students data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const enrichedStudents = useMemo(() => {
    return students.map((student) => {
      const derivedState = student.derived_state || getDerivedState(student);
      const isPremium = (student.plan_type || '').toLowerCase() === 'premium';
      return {
        ...student,
        derivedState,
        isPremium,
        completionDate: derivedState === 'course_completed' ? student.Batch?.end_date : null
      };
    });
  }, [students]);

  const filteredStudents = useMemo(() => {
    return enrichedStudents.filter((student) => {
      // Accountants can only see enrolled / fees_pending / course_completed students
      if (isAccountant) {
        if (!['enrolled', 'fees_pending', 'course_completed'].includes(student.derivedState)) return false;
      }

      const query = searchTerm.toLowerCase();
      const matchSearch =
        (student.User?.name || '').toLowerCase().includes(query) ||
        (student.User?.email || '').toLowerCase().includes(query) ||
        (student.mobile_no || '').toLowerCase().includes(query);

      const matchBatch = batchFilter === 'all' ? true : String(student.batch_id || '') === batchFilter;
      const matchCourse = courseFilter === 'all' ? true : String(student.Batch?.course_id || '') === courseFilter;
      const matchState = stateFilter === 'all' ? true : student.derivedState === stateFilter;

      return matchSearch && matchBatch && matchCourse && matchState;
    });
  }, [enrichedStudents, searchTerm, batchFilter, courseFilter, stateFilter, isAccountant]);

  const enrolledStudents = useMemo(() => {
    return enrichedStudents.filter((student) => student.derivedState === 'enrolled');
  }, [enrichedStudents]);

  const successRecordStudents = useMemo(() => {
    return enrichedStudents.filter((student) => student.derivedState === 'course_completed' || student.has_success_record);
  }, [enrichedStudents]);

  const metrics = useMemo(() => ({
    total: enrichedStudents.length,
    feesPending: enrichedStudents.filter((s) => s.derivedState === 'fees_pending').length,
    enrolled: enrichedStudents.filter((s) => s.derivedState === 'enrolled').length,
    completed: enrichedStudents.filter((s) => s.derivedState === 'course_completed').length
  }), [enrichedStudents]);

  const handleRequestPartnerAccess = async (student) => {
    setRequestingAccessId(student.id);
    try {
      await api.post(`/students/${student.id}/request-partner-access`);
      alert(`✅ Portal access request email sent for ${student.User?.name || 'Student'}!`);
    } catch (error) {
      const errMsg = error.response?.data?.details || error.response?.data?.error || 'Failed to send partner access request';
      alert(`❌ ${errMsg}`);
    } finally {
      setRequestingAccessId(null);
    }
  };

  const handleSaveBatch = async (student) => {
    const batchId = batchDrafts[student.id] || null;
    setRowSavingId(student.id);
    try {
      const response = await api.patch(`/students/${student.id}/management`, { batch_id: batchId || null });
      setStudents((prev) => prev.map((item) => (item.id === student.id ? response.data : item)));
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to change batch');
    } finally {
      setRowSavingId(null);
    }
  };

  const handleStatusChange = async (student, status) => {
    setRowSavingId(student.id);
    try {
      const response = await api.patch(`/students/${student.id}/management`, { status });
      setStudents((prev) => prev.map((item) => (item.id === student.id ? response.data : item)));
      if (selectedStudent?.id === student.id) setSelectedStudent(response.data);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to change student status');
    } finally {
      setRowSavingId(null);
    }
  };

  const handleAddStudent = async (submissionData) => {
    setIsAdding(true);
    try {
      const response = await api.post('/students', submissionData);
      setStudents([response.data.student, ...students]);
      setIsAddModalOpen(false);
      if (response.data.invoice) {
        alert('Student added with Fees Pending. Collect the admission fee from POS & Fees to complete enrollment.');
      }
      fetchData(); // refresh to get enriched data
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to add student');
    } finally {
      setIsAdding(false);
    }
  };

  const openSuccessModal = (student) => {
    setSelectedStudent(student);
    setSuccessForm({
      final_course_result: student.final_course_result || '',
      success_destination_country: student.success_destination_country || '',
      success_notes: student.success_notes || ''
    });
    setIsSuccessModalOpen(true);
  };

  const handleSaveSuccessRecord = async () => {
    if (!selectedStudent) return;
    setRowSavingId(selectedStudent.id);
    try {
      const response = await api.patch(`/students/${selectedStudent.id}/success-record`, successForm);
      setStudents((prev) => prev.map((item) => (item.id === selectedStudent.id ? response.data : item)));
      setSelectedStudent(response.data);
      setIsSuccessModalOpen(false);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save success record');
    } finally {
      setRowSavingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={48} className="animate-spin" color="var(--primary)" />
      </div>
    );
  }

  return (
    <div className="students-page" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header — desktop only */}
      <div className="students-header-desktop" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', margin: 0 }}>
            {isAccountant ? 'Enrolled Students & Billing' : 'Detailed Student Management'}
          </h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>
            {isAccountant
              ? 'View enrolled students with fee status and billing information'
              : 'Batch-based progress tracking and profile-level management'}
          </p>
        </div>
      </div>

      {/* Tab bar + Add button — same row, scrollable on mobile */}
      {!isAccountant && (
      <div className="students-tab-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div className="students-tabs" style={{ display: 'flex', gap: '0.3rem', background: 'var(--glass)', padding: '0.35rem', borderRadius: '12px', border: '1px solid var(--border)', flex: 1, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {[
            { id: 'all_students', label: 'All Students' },
            { id: 'enrolled_students', label: `Enrolled (${enrolledStudents.length})` },
            { id: 'success_records', label: 'Success Records' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.5rem 0.9rem', border: 'none', borderRadius: '8px',
                cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600',
                background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                color: activeTab === tab.id ? '#000' : 'var(--text-dim)',
                flexShrink: 0, whiteSpace: 'nowrap', transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button className="btn-primary" onClick={() => setIsAddModalOpen(true)} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.55rem 0.9rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700 }}>
          <Plus size={15} /> Add
        </button>
      </div>
      )}

      <div className="students-metrics-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        <div className="glass-morphism" style={{ padding: '1rem' }}><Users size={16} /><h3 style={{ margin: '0.4rem 0 0 0' }}>{metrics.total}</h3><p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Total Students</p></div>
        <div className="glass-morphism" style={{ padding: '1rem' }}><Loader2 size={16} color="#f97316" /><h3 style={{ margin: '0.4rem 0 0 0' }}>{metrics.feesPending}</h3><p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Fees Pending</p></div>
        <div className="glass-morphism" style={{ padding: '1rem' }}><BookOpen size={16} /><h3 style={{ margin: '0.4rem 0 0 0' }}>{metrics.enrolled}</h3><p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Currently Enrolled</p></div>
        <div className="glass-morphism" style={{ padding: '1rem' }}><CheckCircle2 size={16} /><h3 style={{ margin: '0.4rem 0 0 0' }}>{metrics.completed}</h3><p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Course Completed</p></div>
      </div>

      {activeTab === 'all_students' && (
      <div className="students-filter-wrapper">
        {/* Search + Filter toggle row */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search name, email, phone"
              style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-main)', fontSize: '0.85rem' }}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.75rem 0.9rem',
              background: showFilters || activeFilterCount > 0 ? 'var(--primary)' : 'var(--glass)',
              color: showFilters || activeFilterCount > 0 ? '#000' : 'var(--text-dim)',
              border: '1px solid var(--border)', borderRadius: '10px', cursor: 'pointer',
              fontSize: '0.8rem', fontWeight: 600, flexShrink: 0, transition: 'all 0.2s'
            }}
          >
            <SlidersHorizontal size={15} />
            <span className="filter-btn-label">Filters</span>
            {activeFilterCount > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800 }}>{activeFilterCount}</span>}
          </button>
        </div>

        {/* Collapsible filter dropdowns */}
        {showFilters && (
          <div className="students-filter-dropdowns" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', marginTop: '0.6rem', animation: 'fadeIn 0.2s ease-out' }}>
            <select className="glass-input" value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)} style={{ appearance: 'auto', padding: '0.65rem', fontSize: '0.82rem', borderRadius: '8px' }}>
              <option value="all">All Batches</option>
              {batches.map((batch) => <option key={batch.id} value={String(batch.id)}>{batch.code}</option>)}
            </select>

            <select className="glass-input" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} style={{ appearance: 'auto', padding: '0.65rem', fontSize: '0.82rem', borderRadius: '8px' }}>
              <option value="all">All Courses</option>
              {courses.map((course) => <option key={course.id} value={String(course.id)}>{course.title}</option>)}
            </select>

            {isAccountant ? (
              <select className="glass-input" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} style={{ appearance: 'auto', padding: '0.65rem', fontSize: '0.82rem', borderRadius: '8px' }}>
                <option value="all">All States</option>
                <option value="fees_pending">Fees Pending</option>
                <option value="enrolled">Enrolled</option>
                <option value="course_completed">Course Completed</option>
              </select>
            ) : (
              <select className="glass-input" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} style={{ appearance: 'auto', padding: '0.65rem', fontSize: '0.82rem', borderRadius: '8px' }}>
                <option value="all">All States</option>
                <option value="fees_pending">Fees Pending</option>
                <option value="payment_rejected">Rejected Payment</option>
                <option value="enrolled">Enrolled</option>
                <option value="course_completed">Course Completed</option>
                <option value="dropped">Dropped</option>
                <option value="unassigned">Unassigned</option>
              </select>
            )}
          </div>
        )}
      </div>
      )}

      {activeTab === 'all_students' ? (
      <>
      <div className="glass-morphism desktop-data-table" style={{ padding: '0', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1200px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
              <th style={{ padding: '1rem' }}>Student</th>
              <th style={{ padding: '1rem' }}>Contact</th>
              <th style={{ padding: '1rem' }}>Course</th>
              <th style={{ padding: '1rem' }}>Batch</th>
              <th style={{ padding: '1rem' }}>Enrollment</th>
              <th style={{ padding: '1rem' }}>Referred By</th>
              <th style={{ padding: '1rem' }}>Completion</th>
              <th style={{ padding: '1rem' }}>State</th>
              <th style={{ padding: '1rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => {
              const state = student.derivedState;
              const style = stateStyle[state] || stateStyle.unassigned;
              return (
                <tr key={student.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600 }}>
                      {student.User?.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>ID: STU-{student.id}</div>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Mail size={13} />{student.User?.email || 'N/A'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}><Phone size={13} />{student.mobile_no || 'N/A'}</div>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.82rem' }}>{student.Batch?.Course?.title || 'N/A'}</td>
                  <td style={{ padding: '1rem', fontSize: '0.82rem' }}>{student.Batch?.code || 'Unassigned'}</td>
                  <td style={{ padding: '1rem', fontSize: '0.82rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Calendar size={13} />{formatDate(student.enrollment_date)}</div></td>
                  <td style={{ padding: '1rem', fontSize: '0.82rem' }}>
                    {student.referred_by ? (
                      <div>
                        <div>{student.referred_by}</div>
                        {student.referral_amount > 0 && <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 'bold' }}>৳{parseFloat(student.referral_amount).toLocaleString()}</span>}
                      </div>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.82rem' }}>{state === 'course_completed' ? formatDate(student.completionDate) : 'In Progress'}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '12px', background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
                      {stateLabel[state]}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'grid', gap: '0.45rem' }}>
                      {!isAccountant && (
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <select className="glass-input" value={batchDrafts[student.id] || ''} onChange={(e) => setBatchDrafts({ ...batchDrafts, [student.id]: e.target.value })} style={{ appearance: 'auto', padding: '0.4rem', minWidth: '140px' }}>
                          <option value="">Unassign</option>
                          {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.code}</option>)}
                        </select>
                        <button className="btn-secondary" onClick={() => handleSaveBatch(student)} disabled={rowSavingId === student.id} style={{ padding: '0.4rem 0.7rem' }}>
                          {rowSavingId === student.id ? <Loader2 size={14} className="animate-spin" /> : 'Save Batch'}
                        </button>
                      </div>
                      )}
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="btn-secondary" onClick={() => navigate(`/students/${student.id}`)} style={{ padding: '0.4rem 0.7rem' }}>Profile</button>
                        {!isAccountant && student.derivedState === 'fees_pending' && (
                          <button className="btn-secondary" onClick={() => navigate('/pos')} style={{ padding: '0.4rem 0.7rem', borderColor: '#f97316', color: '#f97316' }}>Collect Fee</button>
                        )}
                        {isAccountant && student.derivedState === 'fees_pending' && (
                          <button className="btn-secondary" onClick={() => navigate('/pos')} style={{ padding: '0.4rem 0.7rem', borderColor: '#f97316', color: '#f97316' }}>Collect Fee</button>
                        )}
                        {!isAccountant && (
                          student.status === 'dropped' ? (
                            <button className="btn-secondary" onClick={() => handleStatusChange(student, 'active')} style={{ padding: '0.4rem 0.7rem', borderColor: '#10b981', color: '#10b981' }}>Reactivate</button>
                          ) : (
                            <button className="btn-secondary" onClick={() => handleStatusChange(student, 'dropped')} style={{ padding: '0.4rem 0.7rem', borderColor: '#ef4444', color: '#ef4444' }}>Mark Dropped</button>
                          )
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mobile-card-list">
        {filteredStudents.map((student) => (
          <StudentMobileCard
            key={student.id}
            student={student}
            mode="all"
            isAccountant={isAccountant}
            batches={batches}
            batchDrafts={batchDrafts}
            setBatchDrafts={setBatchDrafts}
            rowSavingId={rowSavingId}
            requestingAccessId={requestingAccessId}
            onSaveBatch={handleSaveBatch}
            onStatusChange={handleStatusChange}
            onRequestPartnerAccess={handleRequestPartnerAccess}
            onOpenSuccessRecord={openSuccessModal}
            onProfile={(item) => navigate(`/students/${item.id}`)}
            onCollectFee={() => navigate('/pos')}
          />
        ))}
        {filteredStudents.length === 0 && <div className="mobile-empty-state glass-morphism">No students found.</div>}
      </div>
      </>
      ) : activeTab === 'enrolled_students' ? (
      <>
      <div className="glass-morphism desktop-data-table" style={{ padding: '0', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
              <th style={{ padding: '1rem' }}>Student</th>
              <th style={{ padding: '1rem' }}>Contact</th>
              <th style={{ padding: '1rem' }}>Course</th>
              <th style={{ padding: '1rem' }}>Batch</th>
              <th style={{ padding: '1rem' }}>Enrollment</th>
              <th style={{ padding: '1rem' }}>Referred By</th>
              <th style={{ padding: '1rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {enrolledStudents.map((student) => (
              <tr key={student.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 600 }}>
                    {student.User?.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>ID: STU-{student.id}</div>
                </td>
                <td style={{ padding: '1rem', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Mail size={13} />{student.User?.email || 'N/A'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}><Phone size={13} />{student.mobile_no || 'N/A'}</div>
                </td>
                <td style={{ padding: '1rem', fontSize: '0.82rem' }}>{student.Batch?.Course?.title || 'N/A'}</td>
                <td style={{ padding: '1rem', fontSize: '0.82rem' }}>{student.Batch?.code || 'N/A'}</td>
                <td style={{ padding: '1rem', fontSize: '0.82rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Calendar size={13} />{formatDate(student.enrollment_date)}</div></td>
                <td style={{ padding: '1rem', fontSize: '0.82rem' }}>
                  {student.referred_by ? (
                    <div>
                      <div>{student.referred_by}</div>
                      {student.referral_amount > 0 && <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 'bold' }}>৳{parseFloat(student.referral_amount).toLocaleString()}</span>}
                    </div>
                  ) : '—'}
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button
                      className="btn-secondary"
                      onClick={() => handleRequestPartnerAccess(student)}
                      disabled={requestingAccessId === student.id}
                      style={{
                        padding: '0.45rem 0.85rem',
                        borderColor: '#6366f1',
                        color: '#a78bfa',
                        background: requestingAccessId === student.id ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.78rem',
                        fontWeight: 600
                      }}
                    >
                      {requestingAccessId === student.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      {requestingAccessId === student.id ? 'Sending...' : 'Request Portal Access'}
                    </button>
                    <button className="btn-secondary" onClick={() => navigate(`/students/${student.id}`)} style={{ padding: '0.45rem 0.7rem' }}>Profile</button>
                  </div>
                </td>
              </tr>
            ))}
            {enrolledStudents.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: '1.5rem', color: 'var(--text-dim)', textAlign: 'center' }}>No enrolled students found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mobile-card-list">
        {enrolledStudents.map((student) => (
          <StudentMobileCard
            key={student.id}
            student={student}
            mode="enrolled"
            isAccountant={isAccountant}
            batches={batches}
            batchDrafts={batchDrafts}
            setBatchDrafts={setBatchDrafts}
            rowSavingId={rowSavingId}
            requestingAccessId={requestingAccessId}
            onSaveBatch={handleSaveBatch}
            onStatusChange={handleStatusChange}
            onRequestPartnerAccess={handleRequestPartnerAccess}
            onOpenSuccessRecord={openSuccessModal}
            onProfile={(item) => navigate(`/students/${item.id}`)}
            onCollectFee={() => navigate('/pos')}
          />
        ))}
        {enrolledStudents.length === 0 && <div className="mobile-empty-state glass-morphism">No enrolled students found.</div>}
      </div>
      </>
      ) : (
      <>
      <div className="glass-morphism desktop-data-table" style={{ padding: '0', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1200px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
              <th style={{ padding: '1rem' }}>Student</th>
              <th style={{ padding: '1rem' }}>Course</th>
              <th style={{ padding: '1rem' }}>Completion</th>
              <th style={{ padding: '1rem' }}>Final Result</th>
              <th style={{ padding: '1rem' }}>Target Country</th>
              <th style={{ padding: '1rem' }}>Destination Country</th>
              <th style={{ padding: '1rem' }}>English Level</th>
              <th style={{ padding: '1rem' }}>Recorded</th>
              <th style={{ padding: '1rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {successRecordStudents.map((student) => (
              <tr key={student.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 600 }}>{student.User?.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>ID: STU-{student.id}</div>
                </td>
                <td style={{ padding: '1rem', fontSize: '0.82rem' }}>{student.Batch?.Course?.title || 'N/A'}</td>
                <td style={{ padding: '1rem', fontSize: '0.82rem' }}>{formatDate(student.course_completion_date || student.Batch?.end_date)}</td>
                <td style={{ padding: '1rem', fontSize: '0.82rem' }}>{student.final_course_result || 'Not recorded'}</td>
                <td style={{ padding: '1rem', fontSize: '0.82rem' }}>{student.target_country || 'N/A'}</td>
                <td style={{ padding: '1rem', fontSize: '0.82rem' }}>{student.success_destination_country || 'Not recorded'}</td>
                <td style={{ padding: '1rem', fontSize: '0.82rem' }}>{student.english_level ? `${student.english_level.charAt(0).toUpperCase()}${student.english_level.slice(1)}` : 'N/A'}</td>
                <td style={{ padding: '1rem', fontSize: '0.82rem' }}>{formatDate(student.success_recorded_at)}</td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button className="btn-secondary" onClick={() => openSuccessModal(student)} style={{ padding: '0.4rem 0.7rem', borderColor: '#10b981', color: '#10b981' }}>
                      {student.has_success_record ? 'Edit Record' : 'Add Record'}
                    </button>
                    <button className="btn-secondary" onClick={() => navigate(`/students/${student.id}`)} style={{ padding: '0.4rem 0.7rem' }}>Profile</button>
                  </div>
                </td>
              </tr>
            ))}
            {successRecordStudents.length === 0 && (
              <tr>
                <td colSpan="9" style={{ padding: '1.5rem', color: 'var(--text-dim)', textAlign: 'center' }}>No completed or successful student records found yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mobile-card-list">
        {successRecordStudents.map((student) => (
          <StudentMobileCard
            key={student.id}
            student={student}
            mode="success"
            isAccountant={isAccountant}
            batches={batches}
            batchDrafts={batchDrafts}
            setBatchDrafts={setBatchDrafts}
            rowSavingId={rowSavingId}
            requestingAccessId={requestingAccessId}
            onSaveBatch={handleSaveBatch}
            onStatusChange={handleStatusChange}
            onRequestPartnerAccess={handleRequestPartnerAccess}
            onOpenSuccessRecord={openSuccessModal}
            onProfile={(item) => navigate(`/students/${item.id}`)}
            onCollectFee={() => navigate('/pos')}
          />
        ))}
        {successRecordStudents.length === 0 && <div className="mobile-empty-state glass-morphism">No completed or successful student records found yet.</div>}
      </div>
      </>
      )}

      {/* Add New Student Modal */}
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddStudent}
        courses={courses}
        batches={batches}
        isAdding={isAdding}
      />

      {/* Removed old Profile Modal logic here */}

      <Modal isOpen={isSuccessModalOpen} onClose={() => setIsSuccessModalOpen(false)} title="Success Record">
        {selectedStudent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="glass-morphism" style={{ padding: '1rem' }}>
              <h4 style={{ margin: 0 }}>{selectedStudent.User?.name}</h4>
              <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                {selectedStudent.Batch?.Course?.title || 'No course'} · Completed: {formatDate(selectedStudent.course_completion_date || selectedStudent.Batch?.end_date)}
              </p>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Final Course Result</label>
              <input className="glass-input" value={successForm.final_course_result} onChange={(e) => setSuccessForm((prev) => ({ ...prev, final_course_result: e.target.value }))} placeholder="e.g. PTE 79, IELTS 7.5, Completed Spoken English Advanced" style={{ width: '100%', padding: '0.7rem' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Successful Destination Country</label>
              <input className="glass-input" value={successForm.success_destination_country} onChange={(e) => setSuccessForm((prev) => ({ ...prev, success_destination_country: e.target.value }))} placeholder="e.g. Canada, Australia, UK" style={{ width: '100%', padding: '0.7rem' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Success Notes</label>
              <textarea className="glass-input" value={successForm.success_notes} onChange={(e) => setSuccessForm((prev) => ({ ...prev, success_notes: e.target.value }))} placeholder="Extra notes about the final outcome" style={{ width: '100%', padding: '0.7rem', minHeight: '100px' }} />
            </div>

            <div className="mobile-modal-actions" style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button type="button" className="btn-secondary" onClick={() => setIsSuccessModalOpen(false)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={handleSaveSuccessRecord} disabled={rowSavingId === selectedStudent.id}>
                {rowSavingId === selectedStudent.id ? <Loader2 size={16} className="animate-spin" /> : 'Save Success Record'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Students;
