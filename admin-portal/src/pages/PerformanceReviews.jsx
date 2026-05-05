import React, { useState, useEffect } from 'react';
import { Award, Plus, Loader2, Star } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import '../styles/GlobalStyles.css';
import { useToast } from '../context/ToastContext';

const CRITERIA = ['Punctuality', 'Teamwork', 'Technical Skills', 'Communication', 'Initiative', 'Reliability'];

const PerformanceReviews = () => {
  const toast = useToast();
  const [reviews, setReviews] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ user_id: '', review_period: '', strengths: '', improvements: '', goals: '', ratings: {} });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [revRes, staffRes] = await Promise.all([api.get('/hrm/reviews'), api.get('/payroll/staff')]);
      setReviews(revRes.data);
      setStaff(staffRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const vals = Object.values(form.ratings);
    const overall = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 0;
    try {
      await api.post('/hrm/reviews', { ...form, overall_score: overall, status: 'submitted' });
      setShowModal(false);
      fetchData();
    } catch (err) { toast.error('Failed'); }
  };

  const setRating = (key, val) => setForm(p => ({ ...p, ratings: { ...p.ratings, [key]: val } }));

  const renderStars = (score) => {
    const s = parseFloat(score) || 0;
    return (
      <div style={{ display: 'flex', gap: '2px' }}>
        {[1,2,3,4,5].map(i => <Star key={i} size={14} fill={i <= s ? '#FFB347' : 'none'} color={i <= s ? '#FFB347' : 'var(--border)'} />)}
      </div>
    );
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 size={48} className="animate-spin" color="var(--primary)" /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Award size={24} /> Performance Reviews</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Evaluate and track staff performance</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> New Review</button>
      </div>

      <div className="glass-morphism" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              <th style={{ padding: '1rem', textAlign: 'left' }}>Employee</th>
              <th style={{ padding: '1rem' }}>Period</th>
              <th style={{ padding: '1rem' }}>Score</th>
              <th style={{ padding: '1rem' }}>Reviewer</th>
              <th style={{ padding: '1rem' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {reviews.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>No reviews yet</td></tr>
            ) : reviews.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '1rem', fontWeight: '600', fontSize: '0.85rem' }}>{r.Employee?.name}</td>
                <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem' }}>{r.review_period}</td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>{renderStars(r.overall_score)} <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{r.overall_score}/5</span></td>
                <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-dim)' }}>{r.Reviewer?.name}</td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <span style={{ padding: '0.2rem 0.6rem', borderRadius: '10px', fontSize: '0.7rem', fontWeight: '600', textTransform: 'uppercase',
                    background: r.status === 'submitted' ? 'rgba(0,255,148,0.1)' : 'rgba(255,179,71,0.1)',
                    color: r.status === 'submitted' ? '#00FF94' : '#FFB347'
                  }}>{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Performance Review">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '70vh', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Employee</label>
              <select className="glass-input" required value={form.user_id} onChange={e => setForm({ ...form, user_id: e.target.value })}>
                <option value="">Select...</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Review Period</label><input className="glass-input" required value={form.review_period} onChange={e => setForm({ ...form, review_period: e.target.value })} placeholder="e.g. Q1 2026" /></div>
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Ratings (1-5)</label>
            {CRITERIA.map(c => (
              <div key={c} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.85rem' }}>{c}</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[1,2,3,4,5].map(v => (
                    <Star key={v} size={18} onClick={() => setRating(c.toLowerCase().replace(/ /g, '_'), v)}
                      fill={(form.ratings[c.toLowerCase().replace(/ /g, '_')] || 0) >= v ? '#FFB347' : 'none'}
                      color={(form.ratings[c.toLowerCase().replace(/ /g, '_')] || 0) >= v ? '#FFB347' : 'var(--border)'}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="form-group"><label>Strengths</label><textarea className="glass-input" rows={2} value={form.strengths} onChange={e => setForm({ ...form, strengths: e.target.value })} /></div>
          <div className="form-group"><label>Areas for Improvement</label><textarea className="glass-input" rows={2} value={form.improvements} onChange={e => setForm({ ...form, improvements: e.target.value })} /></div>
          <div className="form-group"><label>Goals for Next Period</label><textarea className="glass-input" rows={2} value={form.goals} onChange={e => setForm({ ...form, goals: e.target.value })} /></div>
          <button type="submit" className="btn-primary" style={{ padding: '0.8rem' }}>Submit Review</button>
        </form>
      </Modal>
    </div>
  );
};

export default PerformanceReviews;
