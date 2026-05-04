import React, { useEffect, useState } from 'react';
import { Search, Plus, Phone, Mail, X, ChevronRight, Trash2, Book, DollarSign, Link, Calendar, FileSignature, Hourglass, Trophy, XCircle, Circle, ClipboardEdit, Copy, MessageCircle, ExternalLink } from 'lucide-react';
import api from '../../services/api';
import { ScoreBadge, PriorityBadge, stageColors, stageLabels, stageIcons, actIcons, inputStyle } from './CRMComponents';
import { useAuth } from '../../context/AuthContext';

const parseLeadTags = (lead) => {
  if (!lead?.tags) return {};
  if (typeof lead.tags === 'object') return lead.tags;
  try {
    return JSON.parse(lead.tags);
  } catch {
    return {};
  }
};

const getBookingDetails = (lead) => parseLeadTags(lead).student_details || {};

const pteReasonOptions = [
  { value: 'study_abroad', label: 'Study abroad' },
  { value: 'work', label: 'Work' },
  { value: 'migration_visa', label: 'Migration and visa applications' },
  { value: 'professional_registration', label: 'Professional registration' },
  { value: 'build_confidence', label: 'Build confidence in English' },
  { value: 'others', label: 'Others' },
];

const countryReasonValues = ['study_abroad', 'work', 'migration_visa'];

const deriveLegacyGoalType = (reason, country) => {
  if (!reason) return '';
  return countryReasonValues.includes(reason) && country ? 'specific_country' : 'another_purpose';
};

const LeadPanel = ({ lead, onClose, onRefresh, courses }) => {
  const createEnrollmentForm = (sourceLead, batchId = '') => ({
    ...(() => {
      const booking = getBookingDetails(sourceLead);
      return {
        course_id: sourceLead?.course_id || '',
        batch_id: batchId || '',
        first_name: booking.first_name || sourceLead?.name?.split(' ')[0] || '',
        middle_name: booking.middle_name || '',
        last_name: booking.last_name || sourceLead?.name?.split(' ').slice(1).join(' ') || '',
        mobile_no: booking.mobile_no || sourceLead?.phone || '',
        email: booking.email || sourceLead?.email || '',
        date_of_birth: booking.date_of_birth || sourceLead?.date_of_birth || '',
        password: '',
        father_name: booking.father_name || '',
        mother_name: booking.mother_name || '',
        current_address: booking.current_address || '',
        permanent_address: booking.permanent_address || '',
        nid_birth_cert: booking.nid_birth_cert || '',
        profession: booking.profession || '',
        course_reason: booking.course_reason || '',
        preferred_country: booking.preferred_country || booking.target_country || sourceLead?.destination_country || '',
        other_reason: booking.other_reason || '',
        post_course_goal_type: booking.post_course_goal_type || '',
        target_country: booking.target_country || '',
        english_level: booking.english_level || '',
        educational_details: booking.educational_details?.length ? booking.educational_details : [
          { exam_name: 'SSC', institution_name: '', passing_year: '', result: '' },
          { exam_name: 'HSC', institution_name: '', passing_year: '', result: '' }
        ],
        employment_details: booking.employment_details || '',
        referred_by: booking.referred_by || sourceLead?.referred_by || '',
        referral_amount: booking.referral_amount || sourceLead?.referral_amount || ''
      };
    })()
  });

  const [activities, setActivities] = useState([]);
  const [actForm, setActForm] = useState({ type: 'call', subject: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [loadedActs, setLoadedActs] = useState(false);
  const [showEnrollForm, setShowEnrollForm] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [enrollForm, setEnrollForm] = useState(createEnrollmentForm(lead));

  if (!loadedActs && lead) {
    api.get(`/crm/activities?lead_id=${lead.id}`).then(r => setActivities(r.data)).catch(() => {});
    setLoadedActs(true);
  }

  const logActivity = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/crm/activities', { ...actForm, lead_id: lead.id });
      setActForm({ type: 'call', subject: '', description: '' });
      const r = await api.get(`/crm/activities?lead_id=${lead.id}`);
      setActivities(r.data); onRefresh();
    } catch { alert('Failed'); } finally { setSaving(false); }
  };

  const updateStatus = async (status) => {
    try { await api.patch(`/crm/leads/${lead.id}/status`, { status }); onRefresh(); onClose(); }
    catch { alert('Failed'); }
  };

  useEffect(() => {
    setSelectedBatch(lead?.batch_id || '');
    setShowEnrollForm(false);
    setEnrollForm(createEnrollmentForm(lead, lead?.batch_id || ''));
  }, [lead?.id]);

  useEffect(() => {
    setEnrollForm(prev => ({
      ...prev,
      course_id: lead?.course_id || '',
      batch_id: selectedBatch || prev.batch_id || ''
    }));
  }, [lead?.course_id, selectedBatch]);

  if (!lead) return null;
  const leadTags = parseLeadTags(lead);
  const bookingChannel = leadTags.booking_type === 'student_booking' ? leadTags.booking_channel || 'manual' : null;

  const handleEnrollInputChange = (e) => {
    const { name, value } = e.target;
    setEnrollForm(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'course_reason' && !countryReasonValues.includes(value) ? { preferred_country: '', target_country: '' } : {}),
      ...(name === 'course_reason' && value !== 'others' ? { other_reason: '' } : {}),
      ...(name === 'post_course_goal_type' && value !== 'specific_country' ? { target_country: '' } : {})
    }));
  };

  const handleEducationChange = (index, field, value) => {
    setEnrollForm(prev => ({
      ...prev,
      educational_details: prev.educational_details.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      ))
    }));
  };

  const addEducationRow = () => {
    setEnrollForm(prev => ({
      ...prev,
      educational_details: [...prev.educational_details, { exam_name: '', institution_name: '', passing_year: '', result: '' }]
    }));
  };

  const removeEducationRow = (index) => {
    setEnrollForm(prev => ({
      ...prev,
      educational_details: prev.educational_details.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const handleEnroll = async (e) => {
    e?.preventDefault();
    if (!lead.course_id) return alert('Please select a course for this lead first.');
    setEnrolling(true);
    try {
      const payload = {
        ...enrollForm,
        course_id: lead.course_id,
        batch_id: selectedBatch || enrollForm.batch_id || undefined,
        post_course_goal_type: deriveLegacyGoalType(enrollForm.course_reason, enrollForm.preferred_country) || enrollForm.post_course_goal_type,
        target_country: countryReasonValues.includes(enrollForm.course_reason) ? enrollForm.preferred_country : '',
        name: `${enrollForm.first_name} ${enrollForm.last_name}`.trim() || lead.name
      };
      const r = await api.post(`/crm/leads/${lead.id}/enroll`, payload);
      alert(`Success: ${r.data.message}`);
      onRefresh(); onClose();
    } catch (err) { alert(err.response?.data?.error || 'Failed to enroll'); }
    finally { setEnrolling(false); }
  };

  const changeCourse = async (courseId) => {
    try { await api.put(`/crm/leads/${lead.id}`, { course_id: parseInt(courseId) }); onRefresh(); }
    catch { alert('Failed to update course'); }
  };

  const changeBatch = async (batchId) => {
    try { await api.put(`/crm/leads/${lead.id}`, { batch_id: batchId ? parseInt(batchId) : null }); onRefresh(); }
    catch { alert('Failed to update batch'); }
  };

  const selectedCourse = courses.find(c => c.id === lead.course_id);

  const statusFlow = ['new', 'contacted', 'interested', 'trial', 'enrolled', 'fees_pending', 'payment_rejected', 'successful'];
  const daysAge = Math.floor((Date.now() - new Date(lead.createdAt || lead.created_at)) / 86400000);

  const copyLeadDetails = async () => {
    const text = `${lead.name}\nPhone: ${lead.phone || 'N/A'}\nEmail: ${lead.email || 'N/A'}\nCourse: ${lead.Course?.title || lead.batch_interest || 'N/A'}\nValue: ৳${parseFloat(lead.deal_value || 0).toLocaleString()}`;
    try { await navigator.clipboard.writeText(text); } catch { window.prompt('Copy:', text); }
  };

  return (
    <>
    {/* Backdrop */}
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 499, backdropFilter: 'blur(2px)' }} />
    <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 'min(440px, 100vw)', background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', zIndex: 500, overflowY: 'auto', boxShadow: '-10px 0 40px rgba(0,0,0,0.4)' }}>
      {/* Header */}
      <div style={{ padding: '1.2rem 1.5rem', background: `linear-gradient(135deg, ${stageColors[lead.status]}15, transparent)`, borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800' }}>{lead.name}</h3>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.4rem', flexWrap: 'wrap' }}>
              <ScoreBadge score={lead.score || 0} />
              <PriorityBadge priority={lead.priority} />
              <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '10px', background: `${stageColors[lead.status]}20`, color: stageColors[lead.status], fontWeight: '700' }}>{stageIcons[lead.status]} {stageLabels[lead.status]}</span>
              {bookingChannel && <span style={{ fontSize: '0.58rem', padding: '2px 8px', borderRadius: '10px', background: '#06b6d420', color: '#06b6d4', fontWeight: '800', border: '1px solid #06b6d440', textTransform: 'uppercase' }}>{bookingChannel} booking</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex' }}><X size={16} /></button>
        </div>
        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.8rem' }}>
          {lead.phone && <a href={`tel:${lead.phone}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '0.45rem', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.68rem', fontWeight: '700', color: 'var(--text)', textDecoration: 'none', cursor: 'pointer' }}><Phone size={12} /> Call</a>}
          {lead.email && <a href={`mailto:${lead.email}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '0.45rem', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.68rem', fontWeight: '700', color: 'var(--text)', textDecoration: 'none', cursor: 'pointer' }}><Mail size={12} /> Email</a>}
          {lead.phone && <a href={`https://wa.me/${(lead.phone || '').replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '0.45rem', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.68rem', fontWeight: '700', color: 'var(--text)', textDecoration: 'none', cursor: 'pointer' }}><MessageCircle size={12} /> WhatsApp</a>}
          <button onClick={copyLeadDetails} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '0.45rem', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.68rem', fontWeight: '700', color: 'var(--text)', cursor: 'pointer' }}><Copy size={12} /> Copy</button>
        </div>
      </div>

      {/* Contact Info */}
      <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}><Phone size={13} color="var(--text-dim)" />{lead.phone || '—'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}><Mail size={13} color="var(--text-dim)" />{lead.email || '—'}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginTop: '0.8rem', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Book size={13} /> {lead.batch_interest || lead.Course?.title || '—'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><DollarSign size={13} /> ৳{parseFloat(lead.deal_value || 0).toLocaleString()}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Link size={13} /> {lead.source}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={13} /> {daysAge}d ago</div>
        </div>
        {lead.notes && <div style={{ marginTop: '0.8rem', padding: '0.6rem', background: 'var(--glass)', borderRadius: '8px', fontSize: '0.78rem', color: 'var(--text-dim)', borderLeft: '3px solid var(--border)' }}>{lead.notes}</div>}
      </div>

      {/* Course & Batch Picker */}
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
        <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem', fontWeight: '700' }}>Course & Batch Assignment</p>
        <select value={lead.course_id || ''} onChange={e => changeCourse(e.target.value)} style={{ ...inputStyle, fontSize: '0.82rem', marginBottom: '0.5rem' }}>
          <option value="">— Select Course —</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.title} — ৳{parseFloat(c.base_fee).toLocaleString()}</option>)}
        </select>
        {selectedCourse && selectedCourse.Batches && selectedCourse.Batches.length > 0 && (
          <select value={selectedBatch} onChange={e => { setSelectedBatch(e.target.value); changeBatch(e.target.value); }} style={{ ...inputStyle, fontSize: '0.82rem' }}>
            <option value="">— Select Batch (optional) —</option>
            {selectedCourse.Batches.map(b => <option key={b.id} value={b.id}>{b.name || b.code} · {b.status} · Starts {b.start_date || 'TBD'}</option>)}
          </select>
        )}
        {selectedCourse && (!selectedCourse.Batches || selectedCourse.Batches.length === 0) && (
          <p style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '4px' }}><XCircle size={12} /> No active batches for this course</p>
        )}
      </div>

      {/* Stage Flow + Actions */}
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
        <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700', marginBottom: '0.6rem' }}>Pipeline Stage</p>
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
          {statusFlow.map(s => (
            <button key={s} onClick={() => updateStatus(s)} style={{ padding: '4px 10px', fontSize: '0.6rem', border: `1px solid ${stageColors[s]}`, background: lead.status === s ? stageColors[s] : 'transparent', color: lead.status === s ? '#fff' : stageColors[s], borderRadius: '12px', cursor: 'pointer', fontWeight: '700', transition: 'all 0.15s' }}>
              {stageIcons[s]} {s}
            </button>
          ))}
        </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexDirection: 'column' }}>
            {!['fees_pending', 'payment_rejected', 'successful', 'lost'].includes(lead.status) && (
              <button onClick={() => setShowEnrollForm(prev => !prev)} disabled={!lead.course_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '0.6rem', background: lead.course_id ? '#06b6d4' : '#6b7280', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.8rem', cursor: lead.course_id ? 'pointer' : 'not-allowed', opacity: lead.course_id ? 1 : 0.6 }}>
                {showEnrollForm ? 'Hide Enrollment Form' : <><ClipboardEdit size={16} /> Enroll → Add Student Details</>}
              </button>
            )}
            {showEnrollForm && !['fees_pending', 'payment_rejected', 'successful', 'lost'].includes(lead.status) && (
              <form onSubmit={handleEnroll} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '1rem', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                {/* Essential Info — always visible */}
                <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>Essential Info</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div><label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.72rem', color: 'var(--text-dim)' }}>First Name *</label><input required name="first_name" value={enrollForm.first_name} onChange={handleEnrollInputChange} style={inputStyle} /></div>
                  <div><label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.72rem', color: 'var(--text-dim)' }}>Last Name *</label><input required name="last_name" value={enrollForm.last_name} onChange={handleEnrollInputChange} style={inputStyle} /></div>
                  <div><label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.72rem', color: 'var(--text-dim)' }}>Mobile *</label><input required name="mobile_no" value={enrollForm.mobile_no} onChange={handleEnrollInputChange} style={inputStyle} /></div>
                  <div><label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.72rem', color: 'var(--text-dim)' }}>Email</label><input type="email" name="email" value={enrollForm.email} onChange={handleEnrollInputChange} style={inputStyle} placeholder="Optional" /></div>
                  <div><label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.72rem', color: 'var(--text-dim)' }}>Password</label><input type="password" name="password" value={enrollForm.password} onChange={handleEnrollInputChange} style={inputStyle} placeholder="Default if blank" /></div>
                  <div><label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.72rem', color: 'var(--text-dim)' }}>English Level</label><select name="english_level" value={enrollForm.english_level || ''} onChange={handleEnrollInputChange} style={inputStyle}><option value="">Select</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="expert">Expert</option></select></div>
                </div>
                {/* Course Goal — collapsible */}
                <details style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                  <summary style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text)', cursor: 'pointer', padding: '0.3rem 0' }}>Course Goal & Reason</summary>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <div><label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.72rem', color: 'var(--text-dim)' }}>Reason for PTE</label><select name="course_reason" value={enrollForm.course_reason || ''} onChange={handleEnrollInputChange} style={inputStyle}><option value="">Select Reason</option>{pteReasonOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
                    <div><label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.72rem', color: 'var(--text-dim)' }}>{enrollForm.course_reason === 'study_abroad' ? 'Desired Country' : 'Preferred Country'}</label><input name="preferred_country" value={enrollForm.preferred_country || ''} onChange={handleEnrollInputChange} style={inputStyle} disabled={!countryReasonValues.includes(enrollForm.course_reason)} placeholder={countryReasonValues.includes(enrollForm.course_reason) ? 'e.g. Australia' : 'N/A'} /></div>
                  </div>
                  {enrollForm.course_reason === 'others' && <div style={{ marginTop: '0.5rem' }}><label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.72rem', color: 'var(--text-dim)' }}>Other Reason</label><input name="other_reason" value={enrollForm.other_reason || ''} onChange={handleEnrollInputChange} style={inputStyle} /></div>}
                </details>
                {/* Personal Details — collapsible */}
                <details style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                  <summary style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text)', cursor: 'pointer', padding: '0.3rem 0' }}>Personal Details</summary>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <div><label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.72rem', color: 'var(--text-dim)' }}>Birthday</label><input type="date" name="date_of_birth" value={enrollForm.date_of_birth || ''} onChange={handleEnrollInputChange} style={inputStyle} /></div>
                    <div><label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.72rem', color: 'var(--text-dim)' }}>NID / Birth Cert</label><input name="nid_birth_cert" value={enrollForm.nid_birth_cert} onChange={handleEnrollInputChange} style={inputStyle} /></div>
                    <div><label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.72rem', color: 'var(--text-dim)' }}>Profession</label><input name="profession" value={enrollForm.profession || ''} onChange={handleEnrollInputChange} style={inputStyle} /></div>
                    <div><label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.72rem', color: 'var(--text-dim)' }}>Father's Name</label><input name="father_name" value={enrollForm.father_name} onChange={handleEnrollInputChange} style={inputStyle} /></div>
                    <div><label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.72rem', color: 'var(--text-dim)' }}>Mother's Name</label><input name="mother_name" value={enrollForm.mother_name} onChange={handleEnrollInputChange} style={inputStyle} /></div>
                  </div>
                </details>
                {/* Addresses — collapsible */}
                <details style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                  <summary style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text)', cursor: 'pointer', padding: '0.3rem 0' }}>Addresses</summary>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <div><label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.72rem', color: 'var(--text-dim)' }}>Current Address</label><textarea name="current_address" value={enrollForm.current_address} onChange={handleEnrollInputChange} style={{ ...inputStyle, minHeight: '48px', resize: 'vertical' }} /></div>
                    <div><label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.72rem', color: 'var(--text-dim)' }}>Permanent Address</label><textarea name="permanent_address" value={enrollForm.permanent_address} onChange={handleEnrollInputChange} style={{ ...inputStyle, minHeight: '48px', resize: 'vertical' }} /></div>
                  </div>
                </details>
                {/* Education — collapsible */}
                <details style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                  <summary style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text)', cursor: 'pointer', padding: '0.3rem 0' }}>Education Details</summary>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                    {enrollForm.educational_details.map((row, index) => (
                      <div key={`${row.exam_name || 'ed'}-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 0.8fr 0.8fr auto', gap: '0.3rem', alignItems: 'center' }}>
                        <input value={row.exam_name} onChange={(e) => handleEducationChange(index, 'exam_name', e.target.value)} placeholder="Exam" style={inputStyle} />
                        <input value={row.institution_name} onChange={(e) => handleEducationChange(index, 'institution_name', e.target.value)} placeholder="Institution" style={inputStyle} />
                        <input value={row.passing_year} onChange={(e) => handleEducationChange(index, 'passing_year', e.target.value)} placeholder="Year" style={inputStyle} />
                        <input value={row.result} onChange={(e) => handleEducationChange(index, 'result', e.target.value)} placeholder="Result" style={inputStyle} />
                        <button type="button" onClick={() => removeEducationRow(index)} disabled={enrollForm.educational_details.length === 1} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: enrollForm.educational_details.length === 1 ? 'not-allowed' : 'pointer', opacity: enrollForm.educational_details.length === 1 ? 0.4 : 1 }}><Trash2 size={14} /></button>
                      </div>
                    ))}
                    <button type="button" onClick={addEducationRow} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.72rem', textAlign: 'left' }}>+ Add Row</button>
                  </div>
                </details>
                {/* Employment & Referral — collapsible */}
                <details style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                  <summary style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text)', cursor: 'pointer', padding: '0.3rem 0' }}>Employment & Referral</summary>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <div><label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.72rem', color: 'var(--text-dim)' }}>Employment Details</label><textarea name="employment_details" value={enrollForm.employment_details} onChange={handleEnrollInputChange} style={{ ...inputStyle, minHeight: '48px', resize: 'vertical' }} placeholder="Job title, company, duration" /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'rgba(59, 130, 246, 0.05)', padding: '0.5rem', borderRadius: '8px' }}>
                      <div><label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.72rem', color: 'var(--text-dim)' }}>Referred By</label><input name="referred_by" value={enrollForm.referred_by} onChange={handleEnrollInputChange} style={inputStyle} placeholder="Referrer Name" /></div>
                      <div><label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.72rem', color: 'var(--text-dim)' }}>Referral Amount</label><input type="number" step="0.01" name="referral_amount" value={enrollForm.referral_amount} onChange={handleEnrollInputChange} style={inputStyle} placeholder="Amount" /></div>
                    </div>
                  </div>
                </details>
                <button type="submit" disabled={enrolling} style={{ padding: '0.7rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: enrolling ? 'wait' : 'pointer', marginTop: '0.3rem' }}>
                  {enrolling ? 'Creating student and invoice...' : 'Create Student + Enrollment + POS Invoice'}
                </button>
              </form>
            )}
            {lead.status === 'fees_pending' && (
              <div style={{ padding: '0.8rem', background: '#f59e0b10', border: '1px solid #f59e0b30', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: '700', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Hourglass size={14} /> Waiting for Fee Collection</p>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Go to <strong>Finance → POS</strong> to collect fees. Student profile is already created and the lead will move to successful once the invoice is fully paid.</p>
              </div>
            )}
            {lead.status === 'payment_rejected' && (
              <div style={{ padding: '0.8rem', background: '#ef444410', border: '1px solid #ef444430', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '700', marginBottom: '0.3rem' }}>Payment Rejected</p>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>This lead was rejected during fee collection and the enrollment has been cancelled.</p>
              </div>
            )}
            {lead.status === 'successful' && (
            <div style={{ padding: '0.8rem', background: '#10b98110', border: '1px solid #10b98130', borderRadius: '8px' }}>
              <p style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}><Trophy size={14} color="#10b981" /> Sale Complete — Student Created & Fees Collected</p>
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!['lost', 'successful'].includes(lead.status) && (
              <button onClick={() => updateStatus('lost')} style={{ flex: 1, padding: '0.5rem', background: '#ef444415', color: '#ef4444', border: '1px solid #ef444430', borderRadius: '8px', fontWeight: '700', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <XCircle size={14} /> Mark Lost
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Log Activity */}
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
        <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700', marginBottom: '0.6rem' }}>Log Activity</p>
        <form onSubmit={logActivity} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {['call', 'email', 'meeting', 'whatsapp', 'demo', 'note'].map(t => (
              <button key={t} type="button" onClick={() => setActForm(f => ({ ...f, type: t }))} style={{ padding: '4px 8px', fontSize: '0.65rem', border: '1px solid var(--border)', background: actForm.type === t ? 'var(--primary)' : 'transparent', color: actForm.type === t ? '#000' : 'var(--text-dim)', borderRadius: '6px', cursor: 'pointer' }}>{actIcons[t]}</button>
            ))}
          </div>
          <input required placeholder="Subject" value={actForm.subject} onChange={e => setActForm(f => ({ ...f, subject: e.target.value }))} style={inputStyle} />
          <textarea placeholder="Notes..." value={actForm.description} onChange={e => setActForm(f => ({ ...f, description: e.target.value }))} style={{ ...inputStyle, height: '50px', resize: 'none' }} />
          <button type="submit" disabled={saving} style={{ padding: '0.5rem', background: 'var(--primary)', border: 'none', borderRadius: '6px', color: '#000', fontWeight: '700', cursor: 'pointer', fontSize: '0.8rem' }}>{saving ? '...' : '+ Log'}</button>
        </form>
      </div>

      {/* Timeline */}
      <div style={{ padding: '1rem 1.5rem' }}>
        <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.6rem', fontWeight: '700' }}>Activity Timeline</p>
        {activities.length === 0 ? <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', opacity: 0.5 }}>No activities yet</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {activities.map(a => (
              <div key={a.id} style={{ padding: '0.6rem 0.8rem', background: 'var(--glass)', borderRadius: '8px', borderLeft: `3px solid ${a.is_done ? '#10b981' : 'var(--primary)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: '600' }}>{actIcons[a.type]} {a.subject}</span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>{new Date(a.createdAt || a.created_at).toLocaleDateString()}</span>
                </div>
                {a.description && <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>{a.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
};

const LeadCard = ({ lead, onClick }) => {
  const daysSince = lead.last_activity_at ? Math.floor((Date.now() - new Date(lead.last_activity_at)) / 86400000) : null;
  const daysAge = Math.floor((Date.now() - new Date(lead.createdAt || lead.created_at)) / 86400000);

  return (
    <div onClick={() => onClick(lead)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.9rem', marginBottom: '0.5rem', cursor: 'pointer', transition: 'all 0.15s', borderLeft: `3px solid ${stageColors[lead.status]}` }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
          <ScoreBadge score={lead.score || 0} />
          <PriorityBadge priority={lead.priority} />
        </div>
        {daysSince !== null && <span style={{ fontSize: '0.55rem', color: daysSince > 3 ? '#ef4444' : 'var(--text-dim)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '2px' }}>{daysSince === 0 ? <><Circle size={6} fill="#10b981" color="#10b981" /> Today</> : `${daysSince}d`}</span>}
      </div>
      <p style={{ fontWeight: '700', fontSize: '0.88rem', marginBottom: '0.2rem' }}>{lead.name}</p>
      {(lead.batch_interest || lead.Course?.title) && <p style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Book size={12} /> {lead.Course?.title || lead.batch_interest}</p>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {lead.deal_value > 0 && <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#10b981' }}>৳{parseFloat(lead.deal_value).toLocaleString()}</span>}
        <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', background: 'var(--glass)', padding: '1px 6px', borderRadius: '6px' }}>{lead.source || '—'}</span>
      </div>
    </div>
  );
};

const PipelineTab = ({ leads, courses, onRefresh }) => {
  const { user, branch } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', date_of_birth: '', source: 'Walk-in', course_id: '', priority: 'medium', referred_by: '', referral_amount: '' });
  const [saving, setSaving] = useState(false);

  const getActiveBranchId = () => {
    const selectedBranch = localStorage.getItem('selectedBranch');
    if (branch && branch !== 'all') return branch;
    if (selectedBranch && selectedBranch !== 'all') return selectedBranch;
    return user?.branch_id || '';
  };

  const buildBookingLink = (channel) => {
    const branchId = getActiveBranchId();
    if (!branchId) return '';
    const baseUrl = (import.meta.env.VITE_WEBSITE_URL || window.location.origin).replace(/\/$/, '');
    return `${baseUrl}/student-booking?branch=${encodeURIComponent(branchId)}&source=walk_in&channel=${channel}`;
  };

  const copyBookingLink = async (channel) => {
    const url = buildBookingLink(channel);
    if (!url) return alert('Select a specific branch before copying a booking link.');
    try {
      await navigator.clipboard.writeText(url);
      alert(`${channel === 'kiosk' ? 'Kiosk QR' : 'Manual'} booking link copied.`);
    } catch {
      window.prompt('Copy booking link:', url);
    }
  };

  useEffect(() => {
    if (selectedLead) {
      const updatedLead = leads.find(l => l.id === selectedLead.id);
      if (updatedLead) setSelectedLead(updatedLead);
    }
  }, [leads]);

  const stages = [
    { key: 'new', label: 'New Leads', desc: 'Fresh enquiries' },
    { key: 'contacted', label: 'Contacted', desc: 'First touchpoint done' },
    { key: 'interested', label: 'Interested', desc: 'Showing intent' },
    { key: 'trial', label: 'Trial Class', desc: 'Demo/trial booked' },
    { key: 'enrolled', label: 'Enrolled', desc: 'Course & batch selected' },
    { key: 'fees_pending', label: 'Fees Pending', desc: 'Collect via POS' },
    { key: 'payment_rejected', label: 'Payment Rejected', desc: 'Rejected at payment step' },
    { key: 'successful', label: 'Successful', desc: 'Fees collected · Student created' },
  ];

  const sourceOptions = [...new Set(leads.map(l => l.source).filter(Boolean))];
  const filtered = leads.filter(l => {
    if (l.status === 'lost') return false;
    if (statusFilter && l.status !== statusFilter) return false;
    if (sourceFilter && l.source !== sourceFilter) return false;
    if (search && !l.name?.toLowerCase().includes(search.toLowerCase()) && !l.batch_interest?.toLowerCase().includes(search.toLowerCase()) && !l.phone?.includes(search)) return false;
    return true;
  });
  const lostCount = leads.filter(l => l.status === 'lost').length;

  const handleAdd = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/crm/leads', form);
      setShowForm(false); setForm({ name: '', phone: '', email: '', date_of_birth: '', source: 'Walk-in', course_id: '', priority: 'medium', referred_by: '', referral_amount: '' });
      onRefresh();
    } catch { alert('Failed'); } finally { setSaving(false); }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem', padding: '0.65rem', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: '12px' }}>
        <div style={{ display: 'flex', gap: '0.55rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, paddingLeft: '2rem', width: '100%' }} />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: '150px', fontSize: '0.75rem' }}>
            <option value="">All stages</option>
            {stages.map(stage => <option key={stage.key} value={stage.key}>{stage.label}</option>)}
          </select>
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} style={{ ...inputStyle, width: '145px', fontSize: '0.75rem' }}>
            <option value="">All sources</option>
            {sourceOptions.map(source => <option key={source} value={source}>{source}</option>)}
          </select>
          {lostCount > 0 && <span style={{ fontSize: '0.7rem', color: '#ef4444', background: '#ef444410', padding: '4px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}><XCircle size={12} /> {lostCount} lost</span>}
        </div>
        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => copyBookingLink('kiosk')} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 0.7rem', borderRadius: '8px', border: '1px solid rgba(6,182,212,0.35)', background: 'rgba(6,182,212,0.1)', color: '#06b6d4', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}>
            <Copy size={13} /> Kiosk Link
          </button>
          <button type="button" onClick={() => copyBookingLink('manual')} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 0.7rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}>
            <Copy size={13} /> Manual Link
          </button>
          <button className="btn-primary" onClick={() => setShowForm(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', padding: '0.52rem 0.85rem' }}>
            <Plus size={15} /> New Lead
          </button>
        </div>
      </div>

      {showForm && (
        <div style={{ marginBottom: '1.2rem', padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }}>
          <h4 style={{ marginBottom: '1rem', fontSize: '0.95rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={16} color="var(--primary)" /> New Lead</h4>
          <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.7rem' }}>
            <input required placeholder="Full Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
            <input placeholder="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle} />
            <input placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} />
            <input type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} style={inputStyle} title="Lead Birthday" />
            <select value={form.course_id} onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))} style={inputStyle}>
              <option value="">Select Course (auto-fills ৳)</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title} — ৳{parseFloat(c.base_fee).toLocaleString()}</option>)}
            </select>
            <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} style={inputStyle}>
              {['Walk-in', 'Facebook', 'Instagram', 'WhatsApp', 'Referral', 'Website Enquiry', 'Other'].map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={inputStyle}>
              {['low', 'medium', 'high', 'hot'].map(p => <option key={p}>{p}</option>)}
            </select>
            <input placeholder="Referred By" value={form.referred_by} onChange={e => setForm(f => ({ ...f, referred_by: e.target.value }))} style={inputStyle} />
            <input type="number" step="0.01" placeholder="Referral Amount" value={form.referral_amount} onChange={e => setForm(f => ({ ...f, referral_amount: e.target.value }))} style={inputStyle} />
            
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '0.6rem 1.2rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary" style={{ padding: '0.6rem 1.5rem', fontSize: '0.82rem' }}>{saving ? '...' : 'Create Lead'}</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.8rem', overflowX: 'auto', paddingBottom: '1rem' }}>
        {stages.map(stage => {
          const stageLeads = filtered.filter(l => l.status === stage.key);
          const totalVal = stageLeads.reduce((s, l) => s + parseFloat(l.deal_value || 0), 0);
          return (
            <div key={stage.key} style={{ flex: '0 0 230px', borderRadius: '12px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border)' }}>
              <div style={{ padding: '0.8rem 1rem', borderBottom: '1px solid var(--border)', background: `${stageColors[stage.key]}08` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.85rem' }}>{stageIcons[stage.key]}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.3px', color: stageColors[stage.key] }}>{stage.label}</span>
                  </div>
                  <span style={{ fontSize: '0.65rem', fontWeight: '800', background: `${stageColors[stage.key]}20`, color: stageColors[stage.key], padding: '2px 7px', borderRadius: '8px' }}>{stageLeads.length}</span>
                </div>
                <p style={{ fontSize: '0.6rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>{stage.desc}</p>
                {totalVal > 0 && <p style={{ fontSize: '0.62rem', color: '#10b981', fontWeight: '700', marginTop: '0.2rem' }}>৳{totalVal.toLocaleString()}</p>}
              </div>
              <div style={{ padding: '0.5rem', maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
                {stageLeads.length === 0
                  ? <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textAlign: 'center', padding: '1.5rem 0', opacity: 0.4 }}>Empty</p>
                  : stageLeads.map(l => <LeadCard key={l.id} lead={l} onClick={setSelectedLead} />)
                }
              </div>
            </div>
          );
        })}
      </div>

      {selectedLead && <LeadPanel lead={selectedLead} onClose={() => setSelectedLead(null)} onRefresh={onRefresh} courses={courses} />}
    </>
  );
};

export default PipelineTab;
