import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Mic, 
  FileText, 
  ChevronRight, 
  ChevronLeft, 
  Send, 
  CheckCircle, 
  Loader2, 
  BarChart3, 
  Users,
  Search,
  Calendar
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/GlobalStyles.css';
import { useToast } from '../context/ToastContext';

const PTEEngine = () => {
  const toast = useToast();
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  
  // Teacher/Admin Specific State
  const [viewMode, setViewMode] = useState('inventory'); // 'inventory' or 'performance'
  const [performance, setPerformance] = useState([]);
  const [fetchingPerf, setFetchingPerf] = useState(false);

  const isTrainer = ['super_admin', 'branch_admin', 'trainer'].includes(user?.role);

  useEffect(() => {
    fetchTasks();
    if (isTrainer) fetchBranchPerformance();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await api.get('/pte/tasks');
      setTasks(res.data);
    } catch (err) {
      console.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchBranchPerformance = async () => {
    setFetchingPerf(true);
    try {
      const res = await api.get('/pte/performance/branch');
      setPerformance(res.data);
    } catch (err) {
      console.error('Failed to fetch performance data');
    } finally {
      setFetchingPerf(false);
    }
  };

  const currentTask = tasks[currentIdx];

  const handleSubmit = async () => {
    if (!response) return;
    setSubmitting(true);
    try {
      const res = await api.post('/pte/attempts', {
        task_id: currentTask.id,
        response: response,
        is_mock_test: false
      });
      setResult(res.data);
      if (isTrainer) fetchBranchPerformance(); // Refresh performance if trainer is testing
    } catch (err) {
      toast.error('Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="canvas"><Loader2 className="animate-spin" color="var(--primary)" size={48} /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: 'calc(100vh - 180px)' }}>
      {/* View Switcher for Trainers */}
      {isTrainer && (
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => setViewMode('inventory')}
            className={viewMode === 'inventory' ? 'btn-primary' : 'btn-secondary'}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem' }}
          >
            <Play size={16} /> Practice Engine
          </button>
          <button 
            onClick={() => setViewMode('performance')}
            className={viewMode === 'performance' ? 'btn-primary' : 'btn-secondary'}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem' }}
          >
            <BarChart3 size={16} /> Student Performance
          </button>
        </div>
      )}

      {viewMode === 'inventory' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 350px) 1fr', gap: '2rem', flex: 1, overflow: 'hidden' }}>
          {/* Task List Sidebar */}
          <div className="glass-morphism" style={{ overflowY: 'auto' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '1rem' }}>Task Inventory</h3>
            </div>
            <div>
              {tasks.map((task, i) => (
                <div 
                  key={task.id}
                  onClick={() => { setCurrentIdx(i); setResult(null); setResponse(''); }}
                  style={{
                    padding: '1.2rem 1.5rem',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: currentIdx === i ? 'var(--primary-glow)' : 'transparent',
                    borderLeft: currentIdx === i ? '4px solid var(--primary)' : 'none'
                  }}
                >
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '800' }}>{task.type}</p>
                  <p style={{ fontSize: '0.85rem', marginTop: '0.4rem', color: currentIdx === i ? 'var(--primary)' : 'white' }}>Task #{i + 1}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Workspace */}
          <div className="glass-morphism" style={{ padding: '2.5rem', position: 'relative', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            {currentTask ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: '800' }}>SECTION: {currentTask.section.toUpperCase()}</span>
                    <h2 style={{ fontSize: '1.5rem' }}>{currentTask.type}</h2>
                  </div>
                  <div className="glass-morphism" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Time: </span>
                    <span style={{ fontWeight: '700', color: 'var(--warning)' }}>04:59</span>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '2rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '2rem', fontSize: '1.1rem', lineHeight: '1.8' }}>
                  {currentTask.content}
                </div>

                <div style={{ flex: 1 }}>
                  <textarea 
                      className="glass-morphism"
                      placeholder={currentTask.section === 'speaking' ? "Speaking simulation..." : "Type your response here..."}
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      style={{ width: '100%', height: '150px', padding: '1.5rem', background: 'none', border: '1px solid var(--border)', color: 'white' }}
                  />
                  
                  {result && (
                    <div className="glass-morphism" style={{ marginTop: '1.5rem', padding: '1rem', borderLeft: '4px solid var(--success)', background: 'rgba(16, 185, 129, 0.05)' }}>
                        <p style={{ color: 'var(--success)', fontWeight: '700' }}>Score: {result.score} / {currentTask.max_score}</p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{result.evaluation}</p>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '2rem' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="glass-morphism" onClick={() => setCurrentIdx(p => Math.max(0, p-1))} style={{ padding: '0.8rem', borderRadius: '50%' }}><ChevronLeft /></button>
                    <button className="glass-morphism" onClick={() => setCurrentIdx(p => Math.min(tasks.length-1, p+1))} style={{ padding: '0.8rem', borderRadius: '50%' }}><ChevronRight /></button>
                  </div>
                  <button className="btn-primary" onClick={handleSubmit} disabled={submitting || !response} style={{ padding: '0.8rem 2.5rem' }}>
                    {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Submit Attempt'}
                  </button>
                </div>
              </>
            ) : <p>Select a task to begin.</p>}
          </div>
        </div>
      ) : (
        /* Performance View */
        <div className="glass-morphism" style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <h3>Student PTE Progress Dashboard</h3>
            <div style={{ display: 'flex', gap: '1rem' }}>
               <div className="glass-input" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
                 <Search size={16} color="var(--text-dim)" />
                 <input type="text" placeholder="Search student..." style={{ background: 'none', border: 'none', color: 'white', outline: 'none' }} />
               </div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                <th style={{ padding: '1rem' }}>STUDENT</th>
                <th style={{ padding: '1rem' }}>TASK TYPE</th>
                <th style={{ padding: '1rem' }}>SCORE</th>
                <th style={{ padding: '1rem' }}>DATE</th>
                <th style={{ padding: '1rem' }}>MOCK?</th>
                <th style={{ padding: '1rem' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {fetchingPerf ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '5rem' }}><Loader2 className="animate-spin" size={32} /></td></tr>
              ) : performance.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-dim)' }}>No practice records found.</td></tr>
              ) : performance.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      <div style={{ width: '32px', height: '32px', background: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>{item.Student?.User?.name[0]}</div>
                      {item.Student?.User?.name}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}><span style={{ color: 'var(--primary)', fontWeight: '600' }}>{item.PteTask?.type}</span></td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: '12px', 
                      background: item.score >= 70 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: item.score >= 70 ? 'var(--success)' : 'var(--danger)',
                      fontWeight: '700'
                    }}>
                      {item.score} / {item.PteTask?.max_score}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>{new Date(item.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '1rem' }}>{item.is_mock_test ? '✅' : '❌'}</td>
                  <td style={{ padding: '1rem' }}>
                    <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>Review Response</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PTEEngine;
