import React, { useState, useEffect } from 'react';
import { 
  Search, 
  DollarSign, 
  CreditCard, 
  CheckCircle, 
  Loader2, 
  User, 
  FileText,
  AlertCircle 
} from 'lucide-react';
import api from '../services/api';
import '../styles/GlobalStyles.css';
import { useToast } from '../context/ToastContext';

const FeeCollection = () => {
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

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    try {
      const res = await api.get('/enrollments');
      setEnrollments(res.data);
    } catch (err) {
      console.error('Failed to fetch enrollments');
    } finally {
      setLoading(false);
    }
  };

  const filteredEnrollments = enrollments.filter(e => 
    e.Student?.User?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.Student?.id.toString().includes(searchTerm)
  );

  const handleCollect = async (e) => {
    e.preventDefault();
    if (!selectedEnrollment || !amount) return;

    setSubmitting(true);
    try {
      await api.post('/pos/collect-fee', {
        enrollment_id: selectedEnrollment.id,
        amount,
        method,
        transaction_ref: ref,
        notes: `Fee collection for ${selectedEnrollment.Batch?.name}`
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSelectedEnrollment(null);
        setAmount('');
        setRef('');
        fetchEnrollments();
      }, 3000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="canvas"><Loader2 className="animate-spin" color="var(--primary)" size={48} /></div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 400px) 1fr', gap: '2rem' }}>
      {/* Search & Select Panel */}
      <div className="glass-morphism" style={{ padding: '1.5rem', height: 'calc(100vh - 120px)', overflowY: 'auto' }}>
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Search size={18} color="var(--primary)" /> Find Enrollment
        </h3>
        <input 
          type="text" 
          placeholder="Search student name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '0.8rem', 
            background: 'var(--glass)', 
            border: '1px solid var(--border)', 
            borderRadius: '8px', 
            color: 'white',
            marginBottom: '1rem'
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {filteredEnrollments.map(e => (
            <div 
              key={e.id}
              onClick={() => setSelectedEnrollment(e)}
              style={{
                padding: '1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                background: selectedEnrollment?.id === e.id ? 'var(--primary-glow)' : 'var(--glass)',
                border: `1px solid ${selectedEnrollment?.id === e.id ? 'var(--primary)' : 'var(--border)'}`,
                transition: 'all 0.2s'
              }}
            >
              <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{e.Student?.User?.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{e.Batch?.name}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--primary)' }}>{e.status}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>Due: {e.total_fee - e.paid_amount} BDT</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* POS Terminal Panel */}
      <div className="glass-morphism" style={{ padding: '2rem' }}>
        {!selectedEnrollment ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
            <AlertCircle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>Select an enrollment from the left to start payment.</p>
          </div>
        ) : success ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
            <CheckCircle size={64} style={{ marginBottom: '1rem' }} />
            <h2>Payment Successful!</h2>
            <p style={{ color: 'var(--text-dim)' }}>Journal entry has been posted to ledger.</p>
          </div>
        ) : (
          <form onSubmit={handleCollect}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Point of Sale</h2>
                <p style={{ color: 'var(--text-dim)' }}>Collecting fee for <strong>{selectedEnrollment.Student?.User?.name}</strong></p>
              </div>
              <div className="glass-morphism" style={{ padding: '1rem 2rem', textAlign: 'right', background: 'rgba(56, 189, 248, 0.05)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Remaining Balance</p>
                <p style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--primary)' }}>{selectedEnrollment.total_fee - selectedEnrollment.paid_amount} BDT</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Amount to Pay</label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
                  <input 
                    type="number" 
                    required
                    max={selectedEnrollment.total_fee - selectedEnrollment.paid_amount}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount..."
                    style={{ width: '100%', padding: '1rem 1rem 1rem 2.5rem', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: '10px', color: 'white', fontSize: '1.2rem', fontWeight: '700' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Payment Method</label>
                <select 
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  style={{ width: '100%', padding: '1rem', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: '10px', color: 'white' }}
                >
                  <option value="cash">Cash</option>
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Debit/Credit Card</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '3rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.8rem' }}>Transaction Reference / Receipt No</label>
              <div style={{ position: 'relative' }}>
                <FileText size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input 
                  type="text" 
                  value={ref}
                  onChange={(e) => setRef(e.target.value)}
                  placeholder="Internal or provider ref..."
                  style={{ width: '100%', padding: '1rem 1rem 1rem 2.5rem', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: '10px', color: 'white' }}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={submitting || !amount}
              style={{ width: '100%', padding: '1.2rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}
            >
              {submitting ? <Loader2 className="animate-spin" /> : <>Complete Payment <CheckCircle size={20} /></>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default FeeCollection;
