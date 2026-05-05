import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, Users, Star, ArrowRight, Loader2, Trash2 } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import '../styles/GlobalStyles.css';
import { useToast } from '../context/ToastContext';

const STAGES = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];
const STAGE_COLORS = { applied: '#00D4FF', screening: '#FFB347', interview: '#9B6DFF', offer: '#00FF94', hired: '#38E8FF', rejected: '#FF4D6D' };

const Recruitment = () => {
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showAppModal, setShowAppModal] = useState(false);
  const [jobForm, setJobForm] = useState({ title: '', department: '', description: '', requirements: '', salary_range: '', deadline: '' });
  const [appForm, setAppForm] = useState({ name: '', email: '', phone: '', cover_letter: '' });

  useEffect(() => { fetchJobs(); }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hrm/jobs');
      setJobs(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchApplicants = async (jobId) => {
    try {
      const res = await api.get(`/hrm/applicants?job_id=${jobId}`);
      setApplicants(res.data);
    } catch (err) { console.error(err); }
  };

  const selectJob = (job) => { setSelectedJob(job); fetchApplicants(job.id); };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    try {
      await api.post('/hrm/jobs', jobForm);
      setShowJobModal(false);
      setJobForm({ title: '', department: '', description: '', requirements: '', salary_range: '', deadline: '' });
      fetchJobs();
    } catch (err) { toast.error('Failed'); }
  };

  const handleAddApplicant = async (e) => {
    e.preventDefault();
    try {
      await api.post('/hrm/applicants', { ...appForm, job_posting_id: selectedJob.id });
      setShowAppModal(false);
      setAppForm({ name: '', email: '', phone: '', cover_letter: '' });
      fetchApplicants(selectedJob.id);
    } catch (err) { toast.error('Failed'); }
  };

  const moveStage = async (appId, newStage) => {
    try {
      await api.patch(`/hrm/applicants/${appId}`, { stage: newStage });
      fetchApplicants(selectedJob.id);
    } catch (err) { toast.error('Failed'); }
  };

  const hireApplicant = async (appId) => {
    if (!window.confirm('Convert this applicant into a staff member?')) return;
    try {
      await api.post(`/hrm/applicants/${appId}/hire`);
      fetchApplicants(selectedJob.id);
      toast.success('Applicant hired and staff account created!');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Briefcase size={24} /> Recruitment Pipeline</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Job postings, applicant tracking, and hiring</p>
        </div>
        <button className="btn-primary" onClick={() => setShowJobModal(true)}><Plus size={16} /> Post New Job</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem' }}>
        {/* Job List */}
        <div className="glass-morphism" style={{ padding: '1rem', height: 'fit-content' }}>
          <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>Open Positions</h3>
          {loading ? <Loader2 size={24} className="animate-spin" color="var(--primary)" /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {jobs.map(job => (
                <div key={job.id} onClick={() => selectJob(job)} style={{
                  padding: '0.8rem', borderRadius: '8px', cursor: 'pointer',
                  background: selectedJob?.id === job.id ? 'rgba(0,212,255,0.1)' : 'rgba(255,255,255,0.02)',
                  border: selectedJob?.id === job.id ? '1px solid rgba(0,212,255,0.3)' : '1px solid var(--border)',
                  transition: 'all 0.15s',
                }}>
                  <p style={{ fontWeight: '600', fontSize: '0.85rem' }}>{job.title}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{job.department || 'General'}</span>
                    <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem', borderRadius: '10px',
                      background: job.status === 'open' ? 'rgba(0,255,148,0.1)' : 'rgba(255,77,109,0.1)',
                      color: job.status === 'open' ? '#00FF94' : '#FF4D6D',
                    }}>{job.status}</span>
                  </div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>{job.Applicants?.length || 0} applicants</p>
                </div>
              ))}
              {jobs.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>No positions posted</p>}
            </div>
          )}
        </div>

        {/* Applicant Pipeline */}
        <div className="glass-morphism" style={{ padding: '1.5rem' }}>
          {!selectedJob ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>Select a job to view applicants</div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem' }}>{selectedJob.title}</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{selectedJob.salary_range || 'Salary TBD'} · Deadline: {selectedJob.deadline || 'Open'}</p>
                </div>
                <button className="btn-secondary" onClick={() => setShowAppModal(true)} style={{ fontSize: '0.8rem' }}><Plus size={14} /> Add Applicant</button>
              </div>

              {/* Kanban-style stages */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STAGES.length}, 1fr)`, gap: '0.5rem', overflowX: 'auto', minWidth: '800px' }}>
                {STAGES.map(stage => {
                  const stageApps = applicants.filter(a => a.stage === stage);
                  return (
                    <div key={stage} style={{ borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', padding: '0.5rem' }}>
                      <div style={{ textAlign: 'center', padding: '0.5rem', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', color: STAGE_COLORS[stage], borderBottom: `2px solid ${STAGE_COLORS[stage]}`, marginBottom: '0.5rem' }}>
                        {stage} ({stageApps.length})
                      </div>
                      {stageApps.map(app => (
                        <div key={app.id} style={{ padding: '0.6rem', marginBottom: '0.4rem', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', fontSize: '0.75rem' }}>
                          <p style={{ fontWeight: '600' }}>{app.name}</p>
                          <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{app.email}</p>
                          <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                            {stage !== 'hired' && stage !== 'rejected' && (
                              <>
                                {STAGES.indexOf(stage) < STAGES.length - 2 && (
                                  <button onClick={() => moveStage(app.id, STAGES[STAGES.indexOf(stage) + 1])} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                    <ArrowRight size={10} /> Next
                                  </button>
                                )}
                                {stage === 'offer' && (
                                  <button onClick={() => hireApplicant(app.id)} style={{ background: 'none', border: 'none', color: '#00FF94', cursor: 'pointer', fontSize: '0.6rem' }}>Hire</button>
                                )}
                                <button onClick={() => moveStage(app.id, 'rejected')} style={{ background: 'none', border: 'none', color: '#FF4D6D', cursor: 'pointer', fontSize: '0.6rem' }}>Reject</button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Job Modal */}
      <Modal isOpen={showJobModal} onClose={() => setShowJobModal(false)} title="Post New Job">
        <form onSubmit={handleCreateJob} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group"><label>Job Title</label><input required className="glass-input" value={jobForm.title} onChange={e => setJobForm({ ...jobForm, title: e.target.value })} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group"><label>Department</label><input className="glass-input" value={jobForm.department} onChange={e => setJobForm({ ...jobForm, department: e.target.value })} /></div>
            <div className="form-group"><label>Salary Range</label><input className="glass-input" value={jobForm.salary_range} onChange={e => setJobForm({ ...jobForm, salary_range: e.target.value })} placeholder="e.g. 25000-35000 BDT" /></div>
          </div>
          <div className="form-group"><label>Description</label><textarea className="glass-input" rows={3} value={jobForm.description} onChange={e => setJobForm({ ...jobForm, description: e.target.value })} /></div>
          <div className="form-group"><label>Requirements</label><textarea className="glass-input" rows={2} value={jobForm.requirements} onChange={e => setJobForm({ ...jobForm, requirements: e.target.value })} /></div>
          <div className="form-group"><label>Deadline</label><input type="date" className="glass-input" value={jobForm.deadline} onChange={e => setJobForm({ ...jobForm, deadline: e.target.value })} /></div>
          <button type="submit" className="btn-primary" style={{ padding: '0.8rem' }}>Post Job</button>
        </form>
      </Modal>

      {/* Applicant Modal */}
      <Modal isOpen={showAppModal} onClose={() => setShowAppModal(false)} title="Add Applicant">
        <form onSubmit={handleAddApplicant} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group"><label>Full Name</label><input required className="glass-input" value={appForm.name} onChange={e => setAppForm({ ...appForm, name: e.target.value })} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group"><label>Email</label><input type="email" className="glass-input" value={appForm.email} onChange={e => setAppForm({ ...appForm, email: e.target.value })} /></div>
            <div className="form-group"><label>Phone</label><input className="glass-input" value={appForm.phone} onChange={e => setAppForm({ ...appForm, phone: e.target.value })} /></div>
          </div>
          <div className="form-group"><label>Cover Letter</label><textarea className="glass-input" rows={3} value={appForm.cover_letter} onChange={e => setAppForm({ ...appForm, cover_letter: e.target.value })} /></div>
          <button type="submit" className="btn-primary" style={{ padding: '0.8rem' }}>Add Applicant</button>
        </form>
      </Modal>
    </div>
  );
};

export default Recruitment;
