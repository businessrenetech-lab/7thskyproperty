import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Mail,
  Phone,
  Calendar,
  Star,
  Download,
  Upload,
  Camera,
  Activity,
  Award,
  Save,
  Plus,
  Trash2
} from 'lucide-react';
import api from '../services/api';
import StudentBookingFormPDF from '../components/pdf/StudentBookingFormPDF';
import CertificatePDF from '../components/pdf/CertificatePDF';
import '../styles/GlobalStyles.css';

const formatDate = (value) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString();
};

const StudentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  // Form State
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [newActivity, setNewActivity] = useState({ subject: '', description: '', type: 'note' });
  const [activitySaving, setActivitySaving] = useState(false);

  const fileInputRef = useRef(null);
  const bookingFormRef = useRef(null);
  const certificateRef = useRef(null);

  /* Safely parse educational_details — API may return a JSON string instead of an array */
  const safeParseEducation = (raw) => {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
    }
    return [];
  };

  const fetchStudentData = async () => {
    try {
      const [studentRes, activitiesRes] = await Promise.all([
        api.get(`/students/${id}`),
        api.get(`/students/${id}/activities`)
      ]);

      // Normalize educational_details on the student object itself (used by PDF components)
      const stu = { ...studentRes.data };
      stu.educational_details = safeParseEducation(stu.educational_details);

      setStudent(stu);
      setActivities(Array.isArray(activitiesRes.data) ? activitiesRes.data : []);
      
      const edDetails = stu.educational_details.length
        ? stu.educational_details
        : [{ exam_name: 'SSC', institution_name: '', passing_year: '', result: '' }, { exam_name: 'HSC', institution_name: '', passing_year: '', result: '' }];

      setFormData({
        first_name: stu.first_name || '',
        last_name: stu.last_name || '',
        father_name: stu.father_name || '',
        mother_name: stu.mother_name || '',
        mobile_no: stu.mobile_no || '',
        nid_birth_cert: stu.nid_birth_cert || '',
        date_of_birth: stu.date_of_birth || '',
        religion: stu.religion || '',
        nationality: stu.nationality || 'Bangladeshi',
        gender: stu.gender || '',
        blood_group: stu.blood_group || '',
        marital_status: stu.marital_status || '',
        emergency_contact_name: stu.emergency_contact_name || '',
        emergency_contact_relation: stu.emergency_contact_relation || '',
        emergency_contact_phone: stu.emergency_contact_phone || '',
        current_address: stu.current_address || '',
        permanent_address: stu.permanent_address || '',
        passport_no: stu.passport_no || '',
        passport_expiry: stu.passport_expiry || '',
        visa_status: stu.visa_status || '',
        profession: stu.profession || '',
        lead_source: stu.lead_source || '',
        english_level: stu.english_level || '',
        post_course_goal_type: stu.post_course_goal_type || '',
        target_country: stu.target_country || '',
        educational_details: edDetails
      });
    } catch (error) {
      console.error('Error fetching student:', error);
      alert('Failed to load student data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEducationChange = (index, field, value) => {
    const newEd = [...formData.educational_details];
    newEd[index][field] = value;
    setFormData(prev => ({ ...prev, educational_details: newEd }));
  };

  const addEducationRow = () => {
    setFormData(prev => ({
      ...prev,
      educational_details: [...prev.educational_details, { exam_name: '', institution_name: '', passing_year: '', result: '' }]
    }));
  };

  const removeEducationRow = (index) => {
    const newEd = [...formData.educational_details];
    newEd.splice(index, 1);
    setFormData(prev => ({ ...prev, educational_details: newEd }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await api.put(`/students/${id}`, formData);
      setStudent(response.data);
      alert('Profile updated successfully');
    } catch (error) {
      console.error('Update error:', error);
      alert(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const data = new FormData();
    data.append('photo', file);

    setPhotoUploading(true);
    try {
      const response = await api.put(`/students/${id}/photo`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setStudent((prev) => ({ ...prev, photograph_url: response.data.photograph_url }));
      alert('Photo uploaded successfully');
    } catch (error) {
      console.error('Photo upload error:', error);
      alert(error.response?.data?.error || 'Failed to upload photo');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleCreateActivity = async (e) => {
    e.preventDefault();
    if (!newActivity.subject) return;

    setActivitySaving(true);
    try {
      const response = await api.post(`/students/${id}/activities`, newActivity);
      setActivities([response.data, ...activities]);
      setNewActivity({ subject: '', description: '', type: 'note' });
    } catch (error) {
      console.error('Activity creation error:', error);
      alert(error.response?.data?.error || 'Failed to save activity');
    } finally {
      setActivitySaving(false);
    }
  };

  const generatePDF = async (elementRef, filename) => {
    if (!elementRef.current) return;
    const html2pdf = (await import('html2pdf.js')).default;
    const opt = {
      margin: 0,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'px', format: [elementRef.current.offsetWidth, elementRef.current.offsetHeight], orientation: elementRef.current.offsetWidth > elementRef.current.offsetHeight ? 'landscape' : 'portrait' }
    };
    html2pdf().set(opt).from(elementRef.current).save();
  };

  if (loading) {
    return (
      <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={48} className="animate-spin" color="var(--primary)" />
      </div>
    );
  }

  if (!student) {
    return <div style={{ color: 'white' }}>Student not found.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
      
      {/* Hidden PDF Templates */}
      <StudentBookingFormPDF ref={bookingFormRef} student={student} />
      <CertificatePDF ref={certificateRef} student={student} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/students')} style={{ background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: '50%', padding: '0.6rem', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 style={{ fontSize: '1.6rem', margin: 0 }}>
              {student.User?.name}
            </h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', margin: '0.2rem 0 0 0' }}>
              STU-{student.id} | {student.Batch?.Course?.title || 'No Course'}
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <button className="btn-secondary" onClick={() => generatePDF(bookingFormRef, `booking_form_${student.id}.pdf`)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} /> Booking Form
          </button>
          {student.is_course_completed && (
            <button className="btn-secondary" onClick={() => generatePDF(certificateRef, `certificate_${student.id}.pdf`)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: '#10b981', color: '#10b981' }}>
              <Award size={16} /> Certificate
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2.5fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Column: Quick Profile & Photo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="glass-morphism" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--primary)', marginBottom: '1rem', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {photoUploading ? (
                <Loader2 size={30} className="animate-spin" color="var(--primary)" />
              ) : student.photograph_url ? (
                <img src={`http://localhost:5000${student.photograph_url}`} alt="Student" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Camera size={40} color="var(--text-dim)" opacity={0.5} />
              )}
              
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept="image/*"
                onChange={handlePhotoUpload}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', padding: '0.3rem', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(4px)' }}
                disabled={photoUploading}
              >
                Upload Photo
              </button>
            </div>

            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{student.User?.name}</h3>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center', marginTop: '0.5rem' }}>
              <Mail size={13} /> {student.User?.email || 'N/A'}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center', marginTop: '0.3rem' }}>
              <Phone size={13} /> {student.mobile_no || 'N/A'}
            </div>
          </div>

          <div className="glass-morphism" style={{ padding: '1.2rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary)' }}>Enrollment Info</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-dim)' }}>Enroll Date:</span> <span>{formatDate(student.enrollment_date)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-dim)' }}>Batch:</span> <span>{student.Batch?.code || 'N/A'}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-dim)' }}>Batch Ends:</span> <span>{formatDate(student.Batch?.end_date)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-dim)' }}>State:</span> <span>{student.derived_state || 'Unknown'}</span></div>
            </div>
          </div>
        </div>

        {/* Right Column: Tabs (Edit Profile / Timeline) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--glass)', padding: '0.35rem', borderRadius: '12px', width: 'fit-content', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setActiveTab('profile')}
              style={{ padding: '0.55rem 1.1rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600', background: activeTab === 'profile' ? 'var(--primary)' : 'transparent', color: activeTab === 'profile' ? '#000' : 'var(--text-dim)' }}
            >
              Edit Profile
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              style={{ padding: '0.55rem 1.1rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600', background: activeTab === 'timeline' ? 'var(--primary)' : 'transparent', color: activeTab === 'timeline' ? '#000' : 'var(--text-dim)' }}
            >
              Activity Timeline
            </button>
          </div>

          {activeTab === 'profile' && (
            <div className="glass-morphism" style={{ padding: '1.5rem' }}>
              <form onSubmit={handleUpdateProfile}>
                <h4 style={{ margin: '0 0 1rem 0', color: 'white', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Personal Details</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>First Name</label>
                    <input className="glass-input" name="first_name" value={formData.first_name} onChange={handleInputChange} style={{ width: '100%', padding: '0.7rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>Last Name</label>
                    <input className="glass-input" name="last_name" value={formData.last_name} onChange={handleInputChange} style={{ width: '100%', padding: '0.7rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>Father's Name</label>
                    <input className="glass-input" name="father_name" value={formData.father_name} onChange={handleInputChange} style={{ width: '100%', padding: '0.7rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>Mother's Name</label>
                    <input className="glass-input" name="mother_name" value={formData.mother_name} onChange={handleInputChange} style={{ width: '100%', padding: '0.7rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>Mobile No.</label>
                    <input className="glass-input" name="mobile_no" value={formData.mobile_no} onChange={handleInputChange} style={{ width: '100%', padding: '0.7rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>NID / Birth Certificate</label>
                    <input className="glass-input" name="nid_birth_cert" value={formData.nid_birth_cert} onChange={handleInputChange} style={{ width: '100%', padding: '0.7rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>Birthdate</label>
                    <input type="date" className="glass-input" name="date_of_birth" value={formData.date_of_birth} onChange={handleInputChange} style={{ width: '100%', padding: '0.7rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>Religion</label>
                    <input className="glass-input" name="religion" value={formData.religion} onChange={handleInputChange} style={{ width: '100%', padding: '0.7rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>Nationality</label>
                    <input className="glass-input" name="nationality" value={formData.nationality} onChange={handleInputChange} style={{ width: '100%', padding: '0.7rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>Gender</label>
                    <select className="glass-input" name="gender" value={formData.gender} onChange={handleInputChange} style={{ width: '100%', padding: '0.7rem', appearance: 'auto' }}>
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>Blood Group</label>
                    <select className="glass-input" name="blood_group" value={formData.blood_group} onChange={handleInputChange} style={{ width: '100%', padding: '0.7rem', appearance: 'auto' }}>
                      <option value="">Select</option>
                      <option value="A+">A+</option><option value="A-">A-</option>
                      <option value="B+">B+</option><option value="B-">B-</option>
                      <option value="AB+">AB+</option><option value="AB-">AB-</option>
                      <option value="O+">O+</option><option value="O-">O-</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>Marital Status</label>
                    <select className="glass-input" name="marital_status" value={formData.marital_status} onChange={handleInputChange} style={{ width: '100%', padding: '0.7rem', appearance: 'auto' }}>
                      <option value="">Select</option>
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                      <option value="divorced">Divorced</option>
                      <option value="widowed">Widowed</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>Lead Source</label>
                    <select className="glass-input" name="lead_source" value={formData.lead_source} onChange={handleInputChange} style={{ width: '100%', padding: '0.7rem', appearance: 'auto' }}>
                      <option value="">Select Source</option>
                      <option value="facebook">Facebook</option>
                      <option value="instagram">Instagram</option>
                      <option value="google">Google</option>
                      <option value="referral">Referral</option>
                      <option value="walk_in">Walk-in</option>
                      <option value="website">Website</option>
                      <option value="newspaper">Newspaper</option>
                      <option value="event">Event</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <h4 style={{ margin: '0 0 1rem 0', color: 'white', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Educational Information</h4>
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                    <button type="button" onClick={addEducationRow} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.85rem' }}><Plus size={14} /> Add Row</button>
                  </div>
                  {formData.educational_details && formData.educational_details.map((ed, index) => (
                    <div key={index} style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 1fr) 2fr 1fr 1fr auto', gap: '0.8rem', marginBottom: '0.8rem', alignItems: 'center' }}>
                      <input placeholder="Exam (e.g. SSC)" className="glass-input" value={ed.exam_name} onChange={(e) => handleEducationChange(index, 'exam_name', e.target.value)} style={{ width: '100%', padding: '0.6rem', fontSize: '0.85rem' }} />
                      <input placeholder="Institution Name" className="glass-input" value={ed.institution_name} onChange={(e) => handleEducationChange(index, 'institution_name', e.target.value)} style={{ width: '100%', padding: '0.6rem', fontSize: '0.85rem' }} />
                      <input placeholder="Year" className="glass-input" value={ed.passing_year} onChange={(e) => handleEducationChange(index, 'passing_year', e.target.value)} style={{ width: '100%', padding: '0.6rem', fontSize: '0.85rem' }} />
                      <input placeholder="Result" className="glass-input" value={ed.result} onChange={(e) => handleEducationChange(index, 'result', e.target.value)} style={{ width: '100%', padding: '0.6rem', fontSize: '0.85rem' }} />
                      <button type="button" onClick={() => removeEducationRow(index)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.4rem' }}><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>

                <h4 style={{ margin: '0 0 1rem 0', color: 'white', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Address</h4>
                <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>Present Address</label>
                    <textarea className="glass-input" name="current_address" value={formData.current_address} onChange={handleInputChange} style={{ width: '100%', padding: '0.7rem', minHeight: '60px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>Permanent Address</label>
                    <textarea className="glass-input" name="permanent_address" value={formData.permanent_address} onChange={handleInputChange} style={{ width: '100%', padding: '0.7rem', minHeight: '60px' }} />
                  </div>
                </div>

                <h4 style={{ margin: '0 0 1rem 0', color: 'white', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Emergency Contact</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>Contact Person Name</label>
                    <input className="glass-input" name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleInputChange} style={{ width: '100%', padding: '0.7rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>Relation</label>
                    <input className="glass-input" name="emergency_contact_relation" value={formData.emergency_contact_relation} onChange={handleInputChange} placeholder="e.g. Father, Spouse, Sibling" style={{ width: '100%', padding: '0.7rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>Phone Number</label>
                    <input className="glass-input" name="emergency_contact_phone" value={formData.emergency_contact_phone} onChange={handleInputChange} style={{ width: '100%', padding: '0.7rem' }} />
                  </div>
                </div>

                <h4 style={{ margin: '0 0 1rem 0', color: 'white', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Passport & Visa</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>Passport Number</label>
                    <input className="glass-input" name="passport_no" value={formData.passport_no} onChange={handleInputChange} style={{ width: '100%', padding: '0.7rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>Passport Expiry</label>
                    <input type="date" className="glass-input" name="passport_expiry" value={formData.passport_expiry} onChange={handleInputChange} style={{ width: '100%', padding: '0.7rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>Visa Status</label>
                    <input className="glass-input" name="visa_status" value={formData.visa_status} onChange={handleInputChange} placeholder="e.g. Applied, Approved, Pending" style={{ width: '100%', padding: '0.7rem' }} />
                  </div>
                </div>

                <h4 style={{ margin: '0 0 1rem 0', color: 'white', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Employment & Profession</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>Profession / Job Title</label>
                    <input className="glass-input" name="profession" value={formData.profession} onChange={handleInputChange} placeholder="e.g. Software Engineer, Teacher" style={{ width: '100%', padding: '0.7rem' }} />
                  </div>
                </div>

                <h4 style={{ margin: '0 0 1rem 0', color: 'white', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Preferences & Language Focus</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>English Level</label>
                    <select className="glass-input" name="english_level" value={formData.english_level} onChange={handleInputChange} style={{ width: '100%', padding: '0.7rem', appearance: 'auto' }}>
                      <option value="">Select Level</option>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>Post Course Goal</label>
                    <select className="glass-input" name="post_course_goal_type" value={formData.post_course_goal_type} onChange={handleInputChange} style={{ width: '100%', padding: '0.7rem', appearance: 'auto' }}>
                      <option value="">Select Option</option>
                      <option value="specific_country">Specific Country</option>
                      <option value="another_purpose">Another Purpose</option>
                    </select>
                  </div>
                  {formData.post_course_goal_type === 'specific_country' && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>Target Country</label>
                      <input className="glass-input" name="target_country" value={formData.target_country} onChange={handleInputChange} style={{ width: '100%', padding: '0.7rem' }} placeholder="e.g. Canada, UK, Australia" />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
                  <button type="submit" className="btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="glass-morphism" style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                <h4 style={{ margin: '0 0 1rem 0' }}>Add Activity Log</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) 3fr', gap: '1rem', alignItems: 'start' }}>
                  <select 
                    className="glass-input" 
                    value={newActivity.type} 
                    onChange={(e) => setNewActivity({...newActivity, type: e.target.value})} 
                    style={{ padding: '0.7rem', appearance: 'auto' }}
                  >
                    <option value="note">Note</option>
                    <option value="call">Call</option>
                    <option value="meeting">Meeting</option>
                    <option value="task">Milestone/Task</option>
                  </select>
                  <input 
                    className="glass-input" 
                    placeholder="Subject (e.g. Consulted regarding university admission)" 
                    value={newActivity.subject} 
                    onChange={(e) => setNewActivity({...newActivity, subject: e.target.value})} 
                    style={{ padding: '0.7rem', width: '100%' }} 
                  />
                </div>
                <textarea 
                  className="glass-input" 
                  placeholder="Detailed description..." 
                  value={newActivity.description} 
                  onChange={(e) => setNewActivity({...newActivity, description: e.target.value})} 
                  style={{ padding: '0.7rem', width: '100%', minHeight: '80px', marginTop: '1rem' }} 
                />
                <button 
                  className="btn-primary" 
                  onClick={handleCreateActivity} 
                  disabled={!newActivity.subject || activitySaving} 
                  style={{ marginTop: '1rem' }}
                >
                  {activitySaving ? <Loader2 size={16} className="animate-spin" /> : 'Log Activity'}
                </button>
              </div>

              <h4 style={{ margin: '0 0 1rem 0' }}>Timeline History</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {activities.map((act) => (
                  <div key={act.id} style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                        <Activity size={16} color={act.type === 'task' ? '#10b981' : 'var(--primary)'} />
                      </div>
                      <div style={{ flex: 1, width: '2px', background: 'var(--border)', margin: '0.3rem 0' }}></div>
                    </div>
                    
                    <div style={{ flex: 1, paddingBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <strong style={{ fontSize: '0.95rem' }}>{act.subject}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{formatDate(act.created_at)}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '0.4rem', textTransform: 'capitalize' }}>
                        {act.type} • Logged by: {act.Creator?.name || 'System'}
                      </div>
                      {act.description && (
                        <div style={{ fontSize: '0.85rem', color: '#cbd5e1', background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '8px' }}>
                          {act.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {activities.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                    No activities recorded yet.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default StudentDetails;
