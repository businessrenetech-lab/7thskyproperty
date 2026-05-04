import React, { useState } from 'react';
import { Loader2, X, Plus, Trash2 } from 'lucide-react';
import Modal from './Modal';
import '../styles/GlobalStyles.css';

const AddStudentModal = ({ isOpen, onClose, onSubmit, courses, batches, isAdding }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    course_id: '',
    batch_id: '',
    first_name: '',
    last_name: '',
    mobile_no: '',
    email: '',
    date_of_birth: '',
    father_name: '',
    mother_name: '',
    current_address: '',
    permanent_address: '',
    nid_birth_cert: '',
    post_course_goal_type: '',
    target_country: '',
    english_level: '',
    referred_by: '',
    referral_amount: '',
    educational_details: [
      { exam_name: 'SSC', institution_name: '', passing_year: '', result: '' },
      { exam_name: 'HSC', institution_name: '', passing_year: '', result: '' }
    ],
    employment_details: ''
  });

  React.useEffect(() => {
    if (isOpen) {
      setStep(1);
      setFormData({
        course_id: '',
        batch_id: '',
        first_name: '',
        last_name: '',
        mobile_no: '',
        email: '',
        date_of_birth: '',
        father_name: '',
        mother_name: '',
        current_address: '',
        permanent_address: '',
        nid_birth_cert: '',
        post_course_goal_type: '',
        target_country: '',
        english_level: '',
        referred_by: '',
        referral_amount: '',
        educational_details: [
          { exam_name: 'SSC', institution_name: '', passing_year: '', result: '' },
          { exam_name: 'HSC', institution_name: '', passing_year: '', result: '' }
        ],
        employment_details: ''
      });
    }
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'post_course_goal_type' && value !== 'specific_country' ? { target_country: '' } : {})
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

  const handleSkipAndSave = (e) => {
    e.preventDefault();
    // Combine name for backend compatibility
    const submissionData = { ...formData, name: `${formData.first_name} ${formData.last_name}`.trim() };
    onSubmit(submissionData);
  };

  const handleContinue = (e) => {
    e.preventDefault();
    setStep(2);
  };

  const handleFinalSubmit = (e) => {
    e.preventDefault();
    const submissionData = { ...formData, name: `${formData.first_name} ${formData.last_name}`.trim() };
    onSubmit(submissionData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={step === 1 ? "Add New Student (Step 1 of 2)" : "Student Additional Info (Step 2 of 2)"}>
      {step === 1 ? (
        <form onSubmit={handleContinue} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="mobile-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Course *</label>
              <select required className="glass-input" name="course_id" value={formData.course_id} onChange={handleInputChange} style={{ width: '100%', padding: '0.6rem', appearance: 'auto' }}>
                <option value="">Select Course</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Batch *</label>
              <select required className="glass-input" name="batch_id" value={formData.batch_id} onChange={handleInputChange} style={{ width: '100%', padding: '0.6rem', appearance: 'auto' }}>
                <option value="">Select Batch</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.code}</option>)}
              </select>
            </div>
          </div>

          <div className="mobile-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem' }}>First Name *</label>
              <input required className="glass-input" name="first_name" value={formData.first_name} onChange={handleInputChange} style={{ width: '100%', padding: '0.6rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Last Name *</label>
              <input required className="glass-input" name="last_name" value={formData.last_name} onChange={handleInputChange} style={{ width: '100%', padding: '0.6rem' }} />
            </div>
          </div>

          <div className="mobile-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Mobile Number *</label>
              <input required className="glass-input" name="mobile_no" value={formData.mobile_no} onChange={handleInputChange} style={{ width: '100%', padding: '0.6rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Email Address *</label>
              <input required type="email" className="glass-input" name="email" value={formData.email} onChange={handleInputChange} style={{ width: '100%', padding: '0.6rem' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Birthday</label>
            <input type="date" className="glass-input" name="date_of_birth" value={formData.date_of_birth} onChange={handleInputChange} style={{ width: '100%', padding: '0.6rem' }} />
          </div>

          <div className="mobile-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Father's Name</label>
              <input className="glass-input" name="father_name" value={formData.father_name} onChange={handleInputChange} style={{ width: '100%', padding: '0.6rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Mother's Name</label>
              <input className="glass-input" name="mother_name" value={formData.mother_name} onChange={handleInputChange} style={{ width: '100%', padding: '0.6rem' }} />
            </div>
          </div>

          <div className="mobile-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem' }}>After course, where would they like to go?</label>
              <select className="glass-input" name="post_course_goal_type" value={formData.post_course_goal_type} onChange={handleInputChange} style={{ width: '100%', padding: '0.6rem', appearance: 'auto' }}>
                <option value="">Select Option</option>
                <option value="specific_country">Specific Country</option>
                <option value="another_purpose">Another Purpose</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem' }}>English Level</label>
              <select className="glass-input" name="english_level" value={formData.english_level} onChange={handleInputChange} style={{ width: '100%', padding: '0.6rem', appearance: 'auto' }}>
                <option value="">Select Level</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="expert">Expert</option>
              </select>
            </div>
          </div>

          {formData.post_course_goal_type === 'specific_country' && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Country Name</label>
              <input className="glass-input" name="target_country" value={formData.target_country} onChange={handleInputChange} placeholder="e.g. Australia, Canada, UK" style={{ width: '100%', padding: '0.6rem' }} />
            </div>
          )}

          <div className="mobile-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(59, 130, 246, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Referred By</label>
              <input className="glass-input" name="referred_by" value={formData.referred_by} onChange={handleInputChange} placeholder="Name of referrer" style={{ width: '100%', padding: '0.6rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Referral Amount (Expense)</label>
              <input type="number" step="0.01" className="glass-input" name="referral_amount" value={formData.referral_amount} onChange={handleInputChange} placeholder="0.00" style={{ width: '100%', padding: '0.6rem' }} />
            </div>
          </div>

          <div className="mobile-modal-actions" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <div className="mobile-modal-actions-group" style={{ display: 'flex', gap: '1rem' }}>
              <button type="button" className="btn-secondary" onClick={handleSkipAndSave} disabled={isAdding} style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }}>
                {isAdding ? <Loader2 size={16} className="animate-spin" /> : 'Skip & Save Student'}
              </button>
              <button type="submit" className="btn-primary" disabled={isAdding}>
                Continue
              </button>
            </div>
          </div>
        </form>
      ) : (
        <form onSubmit={handleFinalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', maxHeight: '70vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Current Address</label>
            <textarea className="glass-input" name="current_address" value={formData.current_address} onChange={handleInputChange} style={{ width: '100%', padding: '0.6rem', minHeight: '60px' }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Permanent Address</label>
            <textarea className="glass-input" name="permanent_address" value={formData.permanent_address} onChange={handleInputChange} style={{ width: '100%', padding: '0.6rem', minHeight: '60px' }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem' }}>NID / Birth Certificate No</label>
            <input className="glass-input" name="nid_birth_cert" value={formData.nid_birth_cert} onChange={handleInputChange} style={{ width: '100%', padding: '0.6rem' }} />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Education Information</label>
              <button type="button" onClick={addEducationRow} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.8rem' }}><Plus size={14} /> Add Row</button>
            </div>
            
            {formData.educational_details.map((ed, index) => (
              <div key={index} className="mobile-education-row" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr auto', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                <input placeholder="Exam (e.g. SSC)" className="glass-input" value={ed.exam_name} onChange={(e) => handleEducationChange(index, 'exam_name', e.target.value)} style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem' }} />
                <input placeholder="Institution Name" className="glass-input" value={ed.institution_name} onChange={(e) => handleEducationChange(index, 'institution_name', e.target.value)} style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem' }} />
                <input placeholder="Year" className="glass-input" value={ed.passing_year} onChange={(e) => handleEducationChange(index, 'passing_year', e.target.value)} style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem' }} />
                <input placeholder="Result" className="glass-input" value={ed.result} onChange={(e) => handleEducationChange(index, 'result', e.target.value)} style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem' }} />
                <button type="button" onClick={() => removeEducationRow(index)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}><Trash2 size={16} /></button>
              </div>
            ))}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', fontWeight: 600 }}>Employment Details</label>
            <textarea placeholder="Job title, company, duration, etc." className="glass-input" name="employment_details" value={formData.employment_details} onChange={handleInputChange} style={{ width: '100%', padding: '0.6rem', minHeight: '60px' }} />
          </div>

          <div className="mobile-modal-actions" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <button type="button" className="btn-secondary" onClick={() => setStep(1)}>Back</button>
            <button type="submit" className="btn-primary" disabled={isAdding}>
              {isAdding ? <Loader2 size={16} className="animate-spin" /> : 'Save Student Details'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default AddStudentModal;
