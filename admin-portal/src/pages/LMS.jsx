import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Clock,
  Calendar,
  ArrowRight,
  Loader2,
  BookOpen,
  Globe,
  Search,
  Filter,
  Upload
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import '../styles/GlobalStyles.css';
import { useToast } from '../context/ToastContext';

const initialBatchData = {
  course_id: '',
  code: '',
  trainer_id: '',
  name: '',
  schedule: {
    days: [],
    start_time: '',
    duration_minutes: 120,
    end_time: ''
  },
  start_date: '',
  end_date: '',
  capacity: 20
};

const initialCourseData = {
  id: null,
  title: '',
  description: '',
  short_description: '',
  category: '',
  level: 'beginner',
  base_fee: '',
  duration_weeks: '',
  slug: '',
  image_url: '',
  instructor_name: '',
  instructor_video_url: '',
  is_published: true,
  status: 'active',
  what_you_will_learn: [],
  modules: []
};

const readableSchedule = (schedule) => {
  const toast = useToast();
  if (!schedule) return 'Not set';

  if (typeof schedule === 'string') return schedule;

  if (schedule.days && schedule.start_time && schedule.end_time) {
    const labelMap = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
    const days = schedule.days.map((day) => labelMap[day] || day).join(', ');
    return `${days} • ${schedule.start_time}-${schedule.end_time}`;
  }

  try {
    return JSON.stringify(schedule);
  } catch (_error) {
    return String(schedule);
  }
};

const toMinutes = (time) => {
  if (!time || !time.includes(':')) return null;
  const [hour, minute] = time.split(':').map((part) => Number(part));
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  return (hour * 60) + minute;
};

const toHHMM = (minutes) => {
  const hour = Math.floor(minutes / 60).toString().padStart(2, '0');
  const minute = (minutes % 60).toString().padStart(2, '0');
  return `${hour}:${minute}`;
};

const withComputedEndTime = (schedule) => {
  const startMinutes = toMinutes(schedule.start_time);
  const duration = Number(schedule.duration_minutes || 120);
  if (startMinutes === null || !Number.isInteger(duration) || startMinutes + duration > (24 * 60)) {
    return { ...schedule, end_time: '' };
  }
  return { ...schedule, end_time: toHHMM(startMinutes + duration) };
};

const normalizeScheduleFromBatch = (schedule) => {
  if (schedule && typeof schedule === 'object' && !Array.isArray(schedule)) {
    return withComputedEndTime({
      days: Array.isArray(schedule.days) ? schedule.days : [],
      start_time: schedule.start_time || '',
      duration_minutes: schedule.duration_minutes || 120,
      end_time: schedule.end_time || ''
    });
  }

  return {
    days: [],
    start_time: '',
    duration_minutes: 120,
    end_time: ''
  };
};

const formatDate = (dateValue) => {
  if (!dateValue) return 'Not set';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleDateString();
};

const toBatchFormData = (batch) => ({
  id: batch.id,
  course_id: batch.course_id || '',
  code: batch.code || '',
  trainer_id: batch.trainer_id || '',
  name: batch.name || '',
  schedule: normalizeScheduleFromBatch(batch.schedule),
  start_date: batch.start_date || '',
  end_date: batch.end_date || '',
  capacity: batch.capacity || 20,
  status: batch.status || 'enrolling'
});

const BatchCard = ({ batch, onManage, readOnly }) => {
  return (
    <div
      className="glass-morphism"
      style={{
        padding: '1.5rem',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        position: 'relative',
        minWidth: '320px',
        flex: '1'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
        <div>
          <span
            style={{
              fontSize: '0.7rem',
              background: 'var(--primary-glow)',
              color: 'var(--primary)',
              padding: '2px 8px',
              borderRadius: '10px',
              fontWeight: '600',
              textTransform: 'uppercase'
            }}
          >
            {batch.status || 'Unknown'}
          </span>
          <h3 style={{ marginTop: '0.5rem', fontSize: '1.1rem' }}>{batch.code}</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{batch.Course?.title || 'N/A'}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Trainer</p>
          <p style={{ fontSize: '0.85rem', fontWeight: '500' }}>{batch.Trainer?.name || 'N/A'}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
          <Calendar size={14} />
          <span>{readableSchedule(batch.schedule)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
          <Clock size={14} />
          <span>{formatDate(batch.start_date)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
          <Users size={14} />
          <span>{batch.enrolled_count || 0}/{batch.capacity || 0} Students</span>
        </div>
      </div>

      {!!batch.enrolled_students_preview?.length && (
        <div style={{ marginBottom: '1rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          <strong style={{ color: 'var(--text-main)' }}>Enrolled:</strong> {batch.enrolled_students_preview.join(', ')}
        </div>
      )}

      <button
        onClick={() => onManage(batch)}
        className={readOnly ? 'btn-secondary' : 'btn-primary'}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
      >
        View Batch Details <ArrowRight size={16} />
      </button>
    </div>
  );
};

const CourseCard = ({ course, onEdit, readOnly }) => {
  return (
    <div
      className="glass-morphism"
      style={{
        padding: '1.5rem',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        position: 'relative',
        minWidth: '320px',
        flex: '1'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
        <div>
          <span
            style={{
              fontSize: '0.7rem',
              background: course.is_published ? '#dcfce7' : '#f1f5f9',
              color: course.is_published ? '#166534' : '#64748b',
              padding: '2px 8px',
              borderRadius: '10px',
              fontWeight: '600',
              textTransform: 'uppercase'
            }}
          >
            {course.is_published ? 'Published to Web' : 'Backend Only'}
          </span>
          <h3 style={{ marginTop: '0.5rem', fontSize: '1.1rem' }}>{course.title}</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{course.category} • {course.level}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Base Fee</p>
          <p style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--primary)' }}>৳{course.base_fee}</p>
        </div>
      </div>

      <p
        style={{
          fontSize: '0.85rem',
          color: 'var(--text-dim)',
          marginBottom: '1.5rem',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}
      >
        {course.short_description || course.description || 'No description provided.'}
      </p>

      {!readOnly && (
        <button
          onClick={() => onEdit(course)}
          className="btn-secondary"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          Edit Metadata <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
};

const LMS = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAccountant = ['accounting', 'accounts'].includes(user?.role);
  const [activeTab, setActiveTab] = useState('courses');
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isManageBatchModalOpen, setIsManageBatchModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [manageSubmitting, setManageSubmitting] = useState(false);
  const [batchStudentsLoading, setBatchStudentsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [batchData, setBatchData] = useState(initialBatchData);
  const [courseData, setCourseData] = useState(initialCourseData);

  const [batchSearchTerm, setBatchSearchTerm] = useState('');
  const [batchStatusFilter, setBatchStatusFilter] = useState('all');

  const [selectedBatch, setSelectedBatch] = useState(null);
  const [manageBatchData, setManageBatchData] = useState(null);
  const [batchStudents, setBatchStudents] = useState([]);
  const scheduleDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const dayLabels = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [batchesRes, coursesRes, staffRes] = await Promise.all([
        api.get('/lms/batches'),
        api.get('/lms/courses'),
        api.get('/auth/staff')
      ]);
      setBatches(batchesRes.data);
      setCourses(coursesRes.data);
      setTrainers(staffRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchBatchStudents = async (batchId) => {
    setBatchStudentsLoading(true);
    try {
      const response = await api.get(`/lms/batches/${batchId}/students`);
      setBatchStudents(response.data || []);
    } catch (error) {
      console.error('Failed to fetch batch students:', error);
      setBatchStudents([]);
    } finally {
      setBatchStudentsLoading(false);
    }
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...batchData,
        schedule: withComputedEndTime(batchData.schedule)
      };
      await api.post('/lms/batches', payload);
      setIsBatchModalOpen(false);
      setBatchData(initialBatchData);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create batch');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (courseData.id) {
        await api.put(`/lms/courses/${courseData.id}`, courseData);
      } else {
        await api.post('/lms/courses', courseData);
      }
      setIsCourseModalOpen(false);
      setCourseData(initialCourseData);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save course');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveBatchUpdates = async (e) => {
    e.preventDefault();
    if (!manageBatchData?.id) return;

    setManageSubmitting(true);
    try {
      const payload = {
        course_id: manageBatchData.course_id,
        code: manageBatchData.code,
        trainer_id: manageBatchData.trainer_id || null,
        name: manageBatchData.name,
        schedule: withComputedEndTime(manageBatchData.schedule),
        start_date: manageBatchData.start_date,
        end_date: manageBatchData.end_date,
        capacity: manageBatchData.capacity,
        status: manageBatchData.status
      };

      const response = await api.put(`/lms/batches/${manageBatchData.id}`, payload);
      const updated = response.data;

      setBatches((prev) => prev.map((batch) => (batch.id === updated.id ? updated : batch)));
      setSelectedBatch(updated);
      setManageBatchData(toBatchFormData(updated));
      toast.success('Batch updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update batch');
    } finally {
      setManageSubmitting(false);
    }
  };

  const openEditCourse = (course) => {
    let parsedOutcomes = [];
    if (typeof course.what_you_will_learn === 'string') {
      try { parsedOutcomes = JSON.parse(course.what_you_will_learn); } catch {}
    } else {
      parsedOutcomes = course.what_you_will_learn || [];
    }

    let parsedModules = [];
    if (typeof course.modules === 'string') {
      try { parsedModules = JSON.parse(course.modules); } catch {}
    } else {
      parsedModules = course.modules || [];
    }

    setCourseData({ 
      ...course, 
      what_you_will_learn: Array.isArray(parsedOutcomes) ? parsedOutcomes : [],
      modules: Array.isArray(parsedModules) ? parsedModules : []
    });
    setIsCourseModalOpen(true);
  };

  const openManageBatch = (batch) => {
    navigate(`/lms/batch/${batch.id}`);
  };

  const filteredBatches = batches.filter((batch) => {
    const query = batchSearchTerm.toLowerCase();
    const matchesSearch =
      (batch.code || '').toLowerCase().includes(query) ||
      (batch.name || '').toLowerCase().includes(query) ||
      (batch.Course?.title || '').toLowerCase().includes(query) ||
      (batch.Trainer?.name || '').toLowerCase().includes(query);
    const matchesStatus = batchStatusFilter === 'all' ? true : batch.status === batchStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleScheduleDay = (data, setData, day) => {
    const days = data.schedule.days || [];
    const nextDays = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
    setData({ ...data, schedule: withComputedEndTime({ ...data.schedule, days: nextDays }) });
  };

  const updateScheduleField = (data, setData, field, value) => {
    setData({
      ...data,
      schedule: withComputedEndTime({
        ...data.schedule,
        [field]: field === 'duration_minutes' ? Number(value) : value
      })
    });
  };

  const handleAddOutcome = () => {
    setCourseData({ ...courseData, what_you_will_learn: [...(courseData.what_you_will_learn || []), ''] });
  };

  const handleRemoveOutcome = (index) => {
    const updated = [...courseData.what_you_will_learn];
    updated.splice(index, 1);
    setCourseData({ ...courseData, what_you_will_learn: updated });
  };

  const handleUpdateOutcome = (index, value) => {
    const updated = [...courseData.what_you_will_learn];
    updated[index] = value;
    setCourseData({ ...courseData, what_you_will_learn: updated });
  };

  const handleAddModule = () => {
    setCourseData({
      ...courseData, 
      modules: [...(courseData.modules || []), { title: '', lessons: [] }]
    });
  };

  const handleRemoveModule = (modIndex) => {
    const updated = [...courseData.modules];
    updated.splice(modIndex, 1);
    setCourseData({ ...courseData, modules: updated });
  };

  const handleUpdateModuleTitle = (modIndex, value) => {
    const updated = [...courseData.modules];
    updated[modIndex].title = value;
    setCourseData({ ...courseData, modules: updated });
  };

  const handleAddLesson = (modIndex) => {
    const updated = [...courseData.modules];
    updated[modIndex].lessons.push({ title: '', duration: '' });
    setCourseData({ ...courseData, modules: updated });
  };

  const handleRemoveLesson = (modIndex, lessonIndex) => {
    const updated = [...courseData.modules];
    updated[modIndex].lessons.splice(lessonIndex, 1);
    setCourseData({ ...courseData, modules: updated });
  };

  const handleUpdateLesson = (modIndex, lessonIndex, field, value) => {
    const updated = [...courseData.modules];
    updated[modIndex].lessons[lessonIndex][field] = value;
    setCourseData({ ...courseData, modules: updated });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);
    setIsUploadingImage(true);

    try {
      const response = await api.post('/lms/courses/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setCourseData({ ...courseData, image_url: response.data.url });
      toast.success('Image uploaded successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to upload image. Please try again.');
    } finally {
      setIsUploadingImage(false);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem' }}>Learning Management System</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            Manage course catalog, website publishing, and detailed batch operations
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className={`btn-${activeTab === 'courses' ? 'primary' : 'secondary'}`} onClick={() => setActiveTab('courses')}>
            <BookOpen size={16} /> Courses
          </button>
          <button className={`btn-${activeTab === 'batches' ? 'primary' : 'secondary'}`} onClick={() => setActiveTab('batches')}>
            <Users size={16} /> Batches
          </button>
        </div>
      </div>

      {activeTab === 'courses' && (
        <>
          {!isAccountant && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn-primary"
              onClick={() => {
                setCourseData(initialCourseData);
                setIsCourseModalOpen(true);
              }}
            >
              + Add New Course
            </button>
          </div>
          )}
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} onEdit={isAccountant ? () => {} : openEditCourse} readOnly={isAccountant} />
            ))}
          </div>
        </>
      )}

      {activeTab === 'batches' && (
        <>
          <div className="glass-morphism" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                value={batchSearchTerm}
                onChange={(e) => setBatchSearchTerm(e.target.value)}
                placeholder="Search by code, title, trainer, or name"
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem 0.8rem 2.5rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'white'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} color="var(--text-dim)" />
              <select
                className="glass-input"
                value={batchStatusFilter}
                onChange={(e) => setBatchStatusFilter(e.target.value)}
                style={{ appearance: 'auto', padding: '0.7rem 0.9rem' }}
              >
                <option value="all">All Status</option>
                <option value="enrolling">Enrolling</option>
                <option value="starting_soon">Starting Soon</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {!isAccountant && (
            <button className="btn-primary" onClick={() => setIsBatchModalOpen(true)}>
              + Create New Batch
            </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            {filteredBatches.map((batch) => (
              <BatchCard key={batch.id} batch={batch} onManage={openManageBatch} readOnly={isAccountant} />
            ))}
          </div>

          {filteredBatches.length === 0 && (
            <div className="glass-morphism" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>
              No batches matched your filters.
            </div>
          )}
        </>
      )}

      <Modal isOpen={isBatchModalOpen} onClose={() => setIsBatchModalOpen(false)} title="Create New Batch">
        <form onSubmit={handleCreateBatch} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', maxHeight: '75vh', overflowY: 'auto', paddingRight: '1rem' }}>
          <div style={{ gridColumn: 'span 2', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
            <h4 style={{ color: 'var(--primary)', margin: 0 }}>Batch Configuration</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: '0.2rem 0 0 0' }}>
              Assign a course, trainer, and define the batch parameters.
            </p>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label>Master Course</label>
            <select className="glass-input" required value={batchData.course_id} onChange={(e) => setBatchData({ ...batchData, course_id: e.target.value })} style={{ appearance: 'auto', padding: '1rem' }}>
              <option value="">-- Select a Course --</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.title} (৳{course.base_fee})</option>
              ))}
            </select>
          </div>

          <div className="form-group"><label>Batch Code Identifier</label><input className="glass-input" required placeholder="e.g. PTE-2401" value={batchData.code} onChange={(e) => setBatchData({ ...batchData, code: e.target.value })} /></div>
          <div className="form-group"><label>Batch Display Name</label><input className="glass-input" required placeholder="e.g. PTE Morning Express" value={batchData.name} onChange={(e) => setBatchData({ ...batchData, name: e.target.value })} /></div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label>Assigned Lead Trainer</label>
            <select className="glass-input" required value={batchData.trainer_id} onChange={(e) => setBatchData({ ...batchData, trainer_id: e.target.value })} style={{ appearance: 'auto', padding: '1rem' }}>
              <option value="">-- Select a Trainer --</option>
              {trainers.map((trainer) => (
                <option key={trainer.id} value={trainer.id}>{trainer.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label>Batch Days</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {scheduleDays.map((day) => {
                const active = batchData.schedule.days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    className={active ? 'btn-primary' : 'btn-secondary'}
                    onClick={() => toggleScheduleDay(batchData, setBatchData, day)}
                    style={{ padding: '0.5rem 0.8rem' }}
                  >
                    {dayLabels[day]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-group"><label>Class Start Time</label><input type="time" className="glass-input" required value={batchData.schedule.start_time} onChange={(e) => updateScheduleField(batchData, setBatchData, 'start_time', e.target.value)} /></div>
          <div className="form-group"><label>Duration (Minutes)</label>
            <select className="glass-input" value={batchData.schedule.duration_minutes} onChange={(e) => updateScheduleField(batchData, setBatchData, 'duration_minutes', e.target.value)} style={{ appearance: 'auto', padding: '1rem' }}>
              <option value={60}>60 minutes</option>
              <option value={90}>90 minutes</option>
              <option value={120}>120 minutes (Recommended)</option>
              <option value={150}>150 minutes</option>
              <option value={180}>180 minutes</option>
            </select>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label>Calculated End Time</label>
            <input className="glass-input" disabled value={batchData.schedule.end_time || 'Select start time and duration'} />
          </div>

          <div className="form-group"><label>Commencement Date</label><input type="date" className="glass-input" required value={batchData.start_date} onChange={(e) => setBatchData({ ...batchData, start_date: e.target.value })} /></div>
          <div className="form-group"><label>Expected End Date</label><input type="date" className="glass-input" required value={batchData.end_date} onChange={(e) => setBatchData({ ...batchData, end_date: e.target.value })} /></div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}><label>Maximum Student Capacity</label><input type="number" className="glass-input" required value={batchData.capacity} onChange={(e) => setBatchData({ ...batchData, capacity: e.target.value })} /></div>

          <div className="form-group" style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
            <button type="submit" className="btn-primary" disabled={submitting} style={{ padding: '1rem', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {submitting ? <Loader2 size={20} className="animate-spin" /> : 'Create Batch Profile'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isManageBatchModalOpen} onClose={() => setIsManageBatchModalOpen(false)} title={isAccountant ? 'Batch Details' : 'Batch Management'}>
        {manageBatchData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '75vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
            <div className="glass-morphism" style={{ padding: '1rem', border: '1px solid var(--border)' }}>
              <h4 style={{ margin: 0, marginBottom: '0.5rem', color: 'var(--primary)' }}>{manageBatchData.code} - {manageBatchData.name || 'Untitled Batch'}</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                Course: {selectedBatch?.Course?.title || 'N/A'} | Trainer: {selectedBatch?.Trainer?.name || 'N/A'}
              </p>
            </div>

            {isAccountant ? (
              /* ── Read-only batch info for accountants ── */
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div><p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', margin: '0 0 2px 0', textTransform: 'uppercase' }}>Course</p><p style={{ margin: 0, fontSize: '0.85rem' }}>{selectedBatch?.Course?.title || 'N/A'}</p></div>
                <div><p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', margin: '0 0 2px 0', textTransform: 'uppercase' }}>Batch Code</p><p style={{ margin: 0, fontSize: '0.85rem' }}>{manageBatchData.code}</p></div>
                <div><p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', margin: '0 0 2px 0', textTransform: 'uppercase' }}>Batch Name</p><p style={{ margin: 0, fontSize: '0.85rem' }}>{manageBatchData.name || 'N/A'}</p></div>
                <div><p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', margin: '0 0 2px 0', textTransform: 'uppercase' }}>Trainer</p><p style={{ margin: 0, fontSize: '0.85rem' }}>{selectedBatch?.Trainer?.name || 'N/A'}</p></div>
                <div><p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', margin: '0 0 2px 0', textTransform: 'uppercase' }}>Schedule</p><p style={{ margin: 0, fontSize: '0.85rem' }}>{readableSchedule(manageBatchData.schedule)}</p></div>
                <div><p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', margin: '0 0 2px 0', textTransform: 'uppercase' }}>Status</p><p style={{ margin: 0, fontSize: '0.85rem', textTransform: 'capitalize' }}>{manageBatchData.status}</p></div>
                <div><p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', margin: '0 0 2px 0', textTransform: 'uppercase' }}>Start Date</p><p style={{ margin: 0, fontSize: '0.85rem' }}>{formatDate(manageBatchData.start_date)}</p></div>
                <div><p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', margin: '0 0 2px 0', textTransform: 'uppercase' }}>End Date</p><p style={{ margin: 0, fontSize: '0.85rem' }}>{formatDate(manageBatchData.end_date)}</p></div>
                <div><p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', margin: '0 0 2px 0', textTransform: 'uppercase' }}>Capacity</p><p style={{ margin: 0, fontSize: '0.85rem' }}>{manageBatchData.capacity}</p></div>
              </div>
            ) : (
            <form onSubmit={handleSaveBatchUpdates} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Master Course</label>
                <select className="glass-input" required value={manageBatchData.course_id} onChange={(e) => setManageBatchData({ ...manageBatchData, course_id: e.target.value })} style={{ appearance: 'auto', padding: '1rem' }}>
                  <option value="">-- Select a Course --</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
              </div>

              <div className="form-group"><label>Batch Code</label><input className="glass-input" required value={manageBatchData.code} onChange={(e) => setManageBatchData({ ...manageBatchData, code: e.target.value })} /></div>
              <div className="form-group"><label>Batch Name</label><input className="glass-input" required value={manageBatchData.name} onChange={(e) => setManageBatchData({ ...manageBatchData, name: e.target.value })} /></div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Batch Instructor</label>
                <select className="glass-input" required value={manageBatchData.trainer_id} onChange={(e) => setManageBatchData({ ...manageBatchData, trainer_id: e.target.value })} style={{ appearance: 'auto', padding: '1rem' }}>
                  <option value="">-- Select Instructor --</option>
                  {trainers.map((trainer) => (
                    <option key={trainer.id} value={trainer.id}>{trainer.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Batch Days</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {scheduleDays.map((day) => {
                    const active = manageBatchData.schedule.days.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        className={active ? 'btn-primary' : 'btn-secondary'}
                        onClick={() => toggleScheduleDay(manageBatchData, setManageBatchData, day)}
                        style={{ padding: '0.5rem 0.8rem' }}
                      >
                        {dayLabels[day]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-group"><label>Class Start Time</label><input type="time" className="glass-input" required value={manageBatchData.schedule.start_time} onChange={(e) => updateScheduleField(manageBatchData, setManageBatchData, 'start_time', e.target.value)} /></div>
              <div className="form-group"><label>Duration (Minutes)</label>
                <select className="glass-input" value={manageBatchData.schedule.duration_minutes} onChange={(e) => updateScheduleField(manageBatchData, setManageBatchData, 'duration_minutes', e.target.value)} style={{ appearance: 'auto', padding: '1rem' }}>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                  <option value={120}>120 minutes (Recommended)</option>
                  <option value={150}>150 minutes</option>
                  <option value={180}>180 minutes</option>
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Calculated End Time</label>
                <input className="glass-input" disabled value={manageBatchData.schedule.end_time || 'Select start time and duration'} />
              </div>
              <div className="form-group"><label>Start Date</label><input type="date" className="glass-input" required value={manageBatchData.start_date} onChange={(e) => setManageBatchData({ ...manageBatchData, start_date: e.target.value })} /></div>
              <div className="form-group"><label>End Date</label><input type="date" className="glass-input" required value={manageBatchData.end_date} onChange={(e) => setManageBatchData({ ...manageBatchData, end_date: e.target.value })} /></div>
              <div className="form-group"><label>Capacity</label><input type="number" className="glass-input" required value={manageBatchData.capacity} onChange={(e) => setManageBatchData({ ...manageBatchData, capacity: e.target.value })} /></div>
              <div className="form-group">
                <label>Batch Status</label>
                <select className="glass-input" required value={manageBatchData.status} onChange={(e) => setManageBatchData({ ...manageBatchData, status: e.target.value })} style={{ appearance: 'auto', padding: '1rem' }}>
                  <option value="enrolling">Enrolling</option>
                  <option value="starting_soon">Starting Soon</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2', marginTop: '0.2rem' }}>
                <button type="submit" className="btn-primary" disabled={manageSubmitting} style={{ width: '100%', padding: '1rem' }}>
                  {manageSubmitting ? <Loader2 size={20} className="animate-spin" /> : 'Save Batch Changes'}
                </button>
              </div>
            </form>
            )}

            <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.5rem', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <h4 style={{ margin: 0, color: 'var(--primary)' }}>Enrolled Students</h4>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{batchStudents.length} student(s)</span>
              </div>

              {batchStudentsLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
                  <Loader2 size={24} className="animate-spin" color="var(--primary)" />
                </div>
              ) : batchStudents.length === 0 ? (
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-dim)' }}>No students assigned to this batch yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: '0.8rem', textAlign: 'left' }}>
                        <th style={{ padding: '0.7rem' }}>Student</th>
                        <th style={{ padding: '0.7rem' }}>Email</th>
                        <th style={{ padding: '0.7rem' }}>Mobile</th>
                        <th style={{ padding: '0.7rem' }}>Enrollment Date</th>
                        <th style={{ padding: '0.7rem' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchStudents.map((student) => (
                        <tr key={student.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.7rem', fontSize: '0.85rem' }}>{student.name || 'N/A'}</td>
                          <td style={{ padding: '0.7rem', fontSize: '0.85rem' }}>{student.email || 'N/A'}</td>
                          <td style={{ padding: '0.7rem', fontSize: '0.85rem' }}>{student.mobile_no || 'N/A'}</td>
                          <td style={{ padding: '0.7rem', fontSize: '0.85rem' }}>{formatDate(student.enrollment_date)}</td>
                          <td style={{ padding: '0.7rem', fontSize: '0.85rem' }}>{(student.status || 'active').toUpperCase()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isCourseModalOpen} onClose={() => setIsCourseModalOpen(false)} title={courseData.id ? 'Edit Course Metadata' : 'Create New Course'}>
        <form onSubmit={handleSaveCourse} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', maxHeight: '75vh', overflowY: 'auto', paddingRight: '1rem' }}>
          <div style={{ gridColumn: 'span 2', background: 'var(--primary-glow)', padding: '1.2rem', borderRadius: 'var(--radius)', border: '1px solid var(--primary)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Globe size={28} style={{ color: 'var(--primary)' }} />
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: '1rem' }}>Publish to Public Website</h4>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-main)', opacity: 0.8 }}>
                Allow this course to be visible and purchasable by students on the external marketing site.
              </p>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '28px' }}>
              <input type="checkbox" checked={courseData.is_published} onChange={(e) => setCourseData({ ...courseData, is_published: e.target.checked })} style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: courseData.is_published ? 'var(--primary)' : 'rgba(255,255,255,0.2)', transition: '.4s', borderRadius: '34px' }}>
                <span style={{ position: 'absolute', content: '""', height: '20px', width: '20px', left: courseData.is_published ? '26px' : '4px', bottom: '4px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }} />
              </span>
            </label>
          </div>

          <div style={{ gridColumn: 'span 2', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginTop: '0.5rem' }}>
            <h4 style={{ color: 'var(--primary)', margin: 0 }}>Core Identity</h4>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}><label>Course Title</label><input className="glass-input" required placeholder="e.g. Master IELTS Preparation" value={courseData.title} onChange={(e) => setCourseData({ ...courseData, title: e.target.value, slug: e.target.value.toLowerCase().replace(/ /g, '-') })} /></div>
          <div className="form-group"><label>URL Slug Identifier</label><input className="glass-input" required placeholder="e.g. master-ielts" value={courseData.slug} onChange={(e) => setCourseData({ ...courseData, slug: e.target.value })} /></div>
          <div className="form-group"><label>Major Category</label><input className="glass-input" required placeholder="e.g. IELTS, PTE, Spoken" value={courseData.category} onChange={(e) => setCourseData({ ...courseData, category: e.target.value })} /></div>

          <div style={{ gridColumn: 'span 2', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginTop: '0.5rem' }}>
            <h4 style={{ color: 'var(--primary)', margin: 0 }}>Logistics & Financials</h4>
          </div>

          <div className="form-group"><label>Base Tuition Fee (BDT)</label><input className="glass-input" type="number" required placeholder="e.g. 15000" value={courseData.base_fee} onChange={(e) => setCourseData({ ...courseData, base_fee: e.target.value })} /></div>
          <div className="form-group"><label>Program Duration (Weeks)</label><input className="glass-input" type="number" required placeholder="e.g. 12" value={courseData.duration_weeks} onChange={(e) => setCourseData({ ...courseData, duration_weeks: e.target.value })} /></div>

          <div style={{ gridColumn: 'span 2', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginTop: '0.5rem' }}>
            <h4 style={{ color: 'var(--primary)', margin: 0 }}>Marketing Materials</h4>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label>Thumbnail / Marketing Image URL</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                className="glass-input" 
                style={{ flex: 1 }} 
                placeholder="https://example.com/assets/banner.jpg" 
                value={courseData.image_url} 
                onChange={(e) => setCourseData({ ...courseData, image_url: e.target.value })} 
              />
              <div style={{ position: 'relative', overflow: 'hidden' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  disabled={isUploadingImage}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', height: '100%' }}
                >
                  {isUploadingImage ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  {isUploadingImage ? 'Uploading...' : 'Upload File'}
                </button>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload}
                  disabled={isUploadingImage}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} 
                />
              </div>
            </div>
            {courseData.image_url && (
              <div style={{ marginTop: '0.8rem', borderRadius: 'var(--radius)', overflow: 'hidden', width: '200px', border: '1px solid var(--border)' }}>
                <img src={courseData.image_url} alt="Course preview" style={{ width: '100%', height: 'auto', display: 'block' }} />
              </div>
            )}
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}><label>Short Promotional Description (Website Tagline)</label><textarea className="glass-input" rows="3" placeholder="A compelling 1-2 sentence description explaining the value proposition of the course." value={courseData.short_description} onChange={(e) => setCourseData({ ...courseData, short_description: e.target.value })} /></div>

          <div className="form-group"><label>Featured Instructor Name</label><input className="glass-input" placeholder="e.g. John Doe, M.A." value={courseData.instructor_name} onChange={(e) => setCourseData({ ...courseData, instructor_name: e.target.value })} /></div>
          <div className="form-group"><label>Promo Video Embed (URL)</label><input className="glass-input" placeholder="e.g. YouTube / Vimeo link" value={courseData.instructor_video_url} onChange={(e) => setCourseData({ ...courseData, instructor_video_url: e.target.value })} /></div>

          <div style={{ gridColumn: 'span 2', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginTop: '0.5rem' }}>
            <h4 style={{ color: 'var(--primary)', margin: 0 }}>Detailed Course Information</h4>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label>Long Course Description</label>
            <textarea className="glass-input" rows="5" placeholder="Comprehensive detailing of the course structure, target audience, and benefits." value={courseData.description || ''} onChange={(e) => setCourseData({ ...courseData, description: e.target.value })} />
          </div>

          {/* Learning Outcomes Builder */}
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ margin: 0 }}>Learning Outcomes (What you'll achieve)</label>
              <button type="button" onClick={handleAddOutcome} style={{ background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' }}>+ Add Outcome</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(!courseData.what_you_will_learn || courseData.what_you_will_learn.length === 0) && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0 }}>No learning outcomes defined. Defaults will be shown on the website.</p>
              )}
              {courseData.what_you_will_learn?.map((outcome, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input className="glass-input" style={{ flex: 1 }} value={outcome} onChange={(e) => handleUpdateOutcome(idx, e.target.value)} placeholder={`e.g. Master targeted skill drills`} />
                  <button type="button" onClick={() => handleRemoveOutcome(idx)} style={{ padding: '0 0.8rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius)', cursor: 'pointer' }}>X</button>
                </div>
              ))}
            </div>
          </div>

          {/* Curriculum Builder */}
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <label style={{ margin: 0 }}>Course Curriculum (Modules & Lessons)</label>
              <button type="button" onClick={handleAddModule} style={{ background: 'var(--primary)', border: 'none', color: 'white', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' }}>+ Add Module</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(!courseData.modules || courseData.modules.length === 0) && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0 }}>No curriculum defined. Default curriculum will be shown on the website.</p>
              )}
              {courseData.modules?.map((module, mIdx) => (
                <div key={mIdx} style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'var(--primary-glow)', color: 'var(--primary)', borderRadius: '8px', fontWeight: 'bold' }}>{mIdx + 1}</div>
                    <input className="glass-input" style={{ flex: 1 }} value={module.title} onChange={(e) => handleUpdateModuleTitle(mIdx, e.target.value)} placeholder="Module Title (e.g. Orientation & Foundation)" />
                    <button type="button" onClick={() => handleRemoveModule(mIdx)} style={{ padding: '0 0.8rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius)', cursor: 'pointer' }}>Remove Module</button>
                  </div>
                  
                  <div style={{ paddingLeft: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {module.lessons?.map((lesson, lIdx) => (
                      <div key={lIdx} style={{ display: 'flex', gap: '0.5rem' }}>
                        <input className="glass-input" style={{ flex: 2, padding: '0.5rem 1rem' }} value={lesson.title} onChange={(e) => handleUpdateLesson(mIdx, lIdx, 'title', e.target.value)} placeholder="Lesson Title" />
                        <input className="glass-input" style={{ flex: 1, padding: '0.5rem 1rem' }} value={lesson.duration} onChange={(e) => handleUpdateLesson(mIdx, lIdx, 'duration', e.target.value)} placeholder="Duration (e.g. 45m)" />
                        <button type="button" onClick={() => handleRemoveLesson(mIdx, lIdx)} style={{ padding: '0 0.6rem', background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer' }}>X</button>
                      </div>
                    ))}
                    <button type="button" onClick={() => handleAddLesson(mIdx)} style={{ width: 'fit-content', background: 'transparent', border: '1px dashed var(--border)', color: 'var(--text-dim)', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', marginTop: '0.5rem' }}>+ Add Lesson</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2', marginTop: '1.5rem' }}>
            <button type="submit" className="btn-primary" disabled={submitting} style={{ width: '100%', padding: '1rem', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {submitting ? <Loader2 size={20} className="animate-spin" /> : 'Save Course Identity'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LMS;
