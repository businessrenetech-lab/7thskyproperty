import React, { useState, useEffect } from 'react';
import { 
  Search, DollarSign, CreditCard, CheckCircle, Loader2, User, FileText, AlertCircle 
} from 'lucide-react';
import api from '../services/api';
import '../styles/GlobalStyles.css';
import { useToast } from '../context/ToastContext';

const POS = () => {
  const toast = useToast();
  const [enrollments, setEnrollments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [ref, setRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [stats, setStats] = useState({ totalCollected: 0, pending: 0, overdue: 0 });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [enrRes, statsRes] = await Promise.all([
        api.get('/enrollments'),
        api.get('/finance/overview').catch(() => ({ data: {} }))
      ]);
      setEnrollments(enrRes.data);
      setStats({
        totalCollected: statsRes.data.feeCollected || 0,
        pending: statsRes.data.receivablesDue || 0,
        overdue: statsRes.data.overdueReceivables || 0
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filteredEnrollments = enrollments.filter(e => 
    e.Student?.User?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.Student?.id?.toString().includes(searchTerm)
  );

  const handleCollect = async (e) => {
    e.preventDefault();
    if (!selectedEnrollment || !amount) return;
    setSubmitting(true);
    try {
      await api.post('/pos/collect-fee', {
        enrollment_id: selectedEnrollment.id, amount, method, transaction_ref: ref,
        notes: `Fee collection for ${selectedEnrollment.Batch?.name}`
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false); setSelectedEnrollment(null); setAmount(''); setRef(''); fetchData();
      }, 3000);
    } catch (err) { toast.error(err.response?.data?.error || 'Payment failed'); }
    finally { setSubmitting(false); }
  };

  const methodColors = { bkash: '#e2136e', nagad: '#f6921e', card: '#3b82f6', cash: '#10b981', bank_transfer: '#8b5cf6' };

  if (loading) return <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={48} className="animate-spin" color="var(--primary)" /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Fee Collection</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>POS terminal · Dynamic invoicing · Auto journal entry</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        <div className="glass-morphism" style={{ padding: '1.5rem', borderTop: '3px solid #10b981' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>TOTAL COLLECTED</p>
          <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#10b981' }}>৳{stats.totalCollected.toLocaleString()}</h2>
        </div>
        <div className="glass-morphism" style={{ padding: '1.5rem', borderTop: '3px solid #f59e0b' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>PENDING DUES</p>
          <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#f59e0b' }}>৳{stats.pending.toLocaleString()}</h2>
        </div>
        <div className="glass-morphism" style={{ padding: '1.5rem', borderTop: '3px solid #ef4444' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>OVERDUE 30D+</p>
          <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#ef4444' }}>৳{stats.overdue.toLocaleString()}</h2>
        </div>
      </div>

      {/* POS Terminal Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) 1fr', gap: '1.5rem' }}>
        {/* Search & Select Panel */}
        <div className="glass-morphism" style={{ padding: '1.5rem', maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <Search size={16} color="var(--primary)" /> Find Enrollment
          </h3>
          <input type="text" placeholder="Search student name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.8rem', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', marginBottom: '1rem', fontSize: '0.85rem' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {filteredEnrollments.map(e => {
              const due = e.total_fee - e.paid_amount;
              return (
                <div key={e.id} onClick={() => setSelectedEnrollment(e)}
                  style={{
                    padding: '1rem', borderRadius: '10px', cursor: 'pointer',
                    background: selectedEnrollment?.id === e.id ? 'rgba(56,189,248,0.1)' : 'var(--glass)',
                    border: `1px solid ${selectedEnrollment?.id === e.id ? 'var(--primary)' : 'var(--border)'}`,
                    transition: 'all 0.2s'
                  }}>
                  <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{e.Student?.User?.name}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{e.Batch?.name}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '8px', fontWeight: '600',
                      background: e.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                      color: e.status === 'active' ? '#10b981' : '#f59e0b'
                    }}>{e.status}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: due > 0 ? '#ef4444' : '#10b981' }}>Due: ৳{due.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* POS Terminal */}
        <div className="glass-morphism" style={{ padding: '2rem' }}>
          {!selectedEnrollment ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
              <AlertCircle size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
              <p>Select an enrollment from the left to start payment.</p>
            </div>
          ) : success ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <CheckCircle size={40} color="#10b981" />
              </div>
              <h2 style={{ color: '#10b981' }}>Payment Successful!</h2>
              <p style={{ color: 'var(--text-dim)' }}>Journal entry posted · Receipt generated</p>
            </div>
          ) : (
            <form onSubmit={handleCollect}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Collect Payment</h2>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Student: <strong>{selectedEnrollment.Student?.User?.name}</strong></p>
                </div>
                <div className="glass-morphism" style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Balance Due</p>
                  <p style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ef4444' }}>৳{(selectedEnrollment.total_fee - selectedEnrollment.paid_amount).toLocaleString()}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Amount (BDT)</label>
                  <div style={{ position: 'relative' }}>
                    <DollarSign size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
                    <input type="number" required max={selectedEnrollment.total_fee - selectedEnrollment.paid_amount} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount"
                      style={{ width: '100%', padding: '1rem 1rem 1rem 2.2rem', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text)', fontSize: '1.1rem', fontWeight: '700' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Payment Method</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                    {['cash', 'bkash', 'nagad', 'bank_transfer', 'card'].map(m => (
                      <button key={m} type="button" onClick={() => setMethod(m)}
                        style={{
                          padding: '0.6rem', borderRadius: '8px', border: `1px solid ${method === m ? methodColors[m] : 'var(--border)'}`,
                          background: method === m ? `${methodColors[m]}20` : 'var(--glass)',
                          color: method === m ? methodColors[m] : 'var(--text-dim)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: '600', textTransform: 'capitalize'
                        }}>
                        {m.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Reference / Receipt No</label>
                <input type="text" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="bKash TRX ID / Receipt #"
                  style={{ width: '100%', padding: '0.8rem', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text)' }}
                />
              </div>

              <button type="submit" className="btn-primary" disabled={submitting || !amount}
                style={{ width: '100%', padding: '1.2rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem' }}>
                {submitting ? <Loader2 className="animate-spin" size={20} /> : <>Complete Payment <CheckCircle size={18} /></>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default POS;
