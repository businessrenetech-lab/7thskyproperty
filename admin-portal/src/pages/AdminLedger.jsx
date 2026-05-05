import React, { useState, useEffect } from 'react';
import { Loader2, BookOpen, CheckCircle, XCircle, Search, Download } from 'lucide-react';
import api from '../services/api';
import '../styles/GlobalStyles.css';
import { useToast } from '../context/ToastContext';

const typeBadge = (type) => {
  const toast = useToast();
  const colors = { asset: '#3b82f6', liability: '#f59e0b', equity: '#8b5cf6', revenue: '#10b981', expense: '#ef4444' };
  return (
    <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: '700', textTransform: 'capitalize', background: `${colors[type] || '#666'}20`, color: colors[type] || '#666' }}>{type}</span>
  );
};

const Ledger = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState([]);
  const [trialBalance, setTrialBalance] = useState({ totalDebits: 0, totalCredits: 0, difference: 0, isBalanced: true });
  
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [accountDetails, setAccountDetails] = useState({ account: null, history: [] });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [ledgerRes, tbRes] = await Promise.all([
        api.get('/accounting/ledger-summary'),
        api.get('/finance/trial-balance')
      ]);
      setSummary(ledgerRes.data.accounts || ledgerRes.data || []);
      setTrialBalance(tbRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openAccountDetails = async (id) => {
    setShowDetailModal(true);
    setDetailLoading(true);
    try {
      const res = await api.get(`/accounting/ledger/${id}`);
      setAccountDetails(res.data);
    } catch (err) {
      toast.error('Failed to load ledger details');
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) return <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={48} className="animate-spin" color="var(--primary)" /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Finance &gt; General Ledger</p>
          <h2 style={{ fontSize: '1.5rem', marginTop: '0.3rem' }}>General Ledger</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Double-entry bookkeeping · All transactions with debit/credit/balance</p>
        </div>
        <button onClick={() => window.print()} className="btn-secondary" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Download size={16} /> Export Trial Balance
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '1.5rem' }}>
        {/* Account Summary */}
        <div className="glass-morphism" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>Account Summary (Click to view history)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 1fr 1fr 1fr', gap: '0.5rem', padding: '0.8rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            <span>ACCOUNT</span><span>TYPE</span><span>DEBIT TOTAL</span><span>CREDIT TOTAL</span><span>BALANCE</span>
          </div>
          {summary.map((acc, i) => (
            <div 
              key={i} 
              onClick={() => openAccountDetails(acc.id)}
              style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 1fr 1fr 1fr', gap: '0.5rem', padding: '1rem 0', borderBottom: '1px solid var(--border)', alignItems: 'center', fontSize: '0.85rem', cursor: 'pointer', transition: 'background 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontWeight: '600', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Search size={14} color="var(--primary)" /> {acc.name}
              </span>
              {typeBadge(acc.type)}
              <span>৳{acc.debitTotal?.toLocaleString() || 0}</span>
              <span>৳{acc.creditTotal?.toLocaleString() || 0}</span>
              <span style={{ fontWeight: '700', color: acc.balance >= 0 ? '#10b981' : '#ef4444' }}>৳{Math.abs(acc.balance || 0).toLocaleString()}</span>
            </div>
          ))}
        </div>

        {/* Trial Balance Check */}
        <div className="glass-morphism" style={{ padding: '1.5rem', alignSelf: 'start' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1rem' }}>Trial Balance Check</h3>
            <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '700',
              background: trialBalance.isBalanced ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              color: trialBalance.isBalanced ? '#10b981' : '#ef4444'
            }}>
              {trialBalance.isBalanced ? '✓ Balanced' : '✗ Unbalanced'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '1.2rem', background: 'rgba(6,182,212,0.08)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-dim)' }}>Total Debits</span>
              <span style={{ fontWeight: '800', fontSize: '1.2rem', color: '#06b6d4' }}>৳{trialBalance.totalDebits.toLocaleString()}</span>
            </div>
            <div style={{ padding: '1.2rem', background: 'rgba(16,185,129,0.08)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-dim)' }}>Total Credits</span>
              <span style={{ fontWeight: '800', fontSize: '1.2rem', color: '#10b981' }}>৳{trialBalance.totalCredits.toLocaleString()}</span>
            </div>
            <div style={{ padding: '1.2rem', background: 'var(--glass)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-dim)' }}>Difference</span>
              <span style={{ fontWeight: '800', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ৳{trialBalance.difference} {trialBalance.isBalanced && <CheckCircle size={18} color="#10b981" />}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {showDetailModal && (
        <div className="modal-overlay">
          <div className="glass-morphism" style={{ width: '800px', maxWidth: '90vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: '0' }}>
            
            {detailLoading ? (
               <div style={{ padding: '4rem', display: 'flex', justifyContent: 'center' }}><Loader2 className="animate-spin" /></div>
            ) : accountDetails.account && (
              <>
                <div style={{ padding: '2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1.4rem' }}>{accountDetails.account.name} Ledger</h3>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '5px' }}>Acct Code: {accountDetails.account.code} · Type: {accountDetails.account.type.toUpperCase()}</p>
                  </div>
                  <button onClick={() => setShowDetailModal(false)} className="btn-secondary">Close</button>
                </div>
                
                <div style={{ overflowY: 'auto', padding: '0 2rem 2rem 2rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-dim)', borderBottom: '1px solid var(--border)' }}>DATE</th>
                        <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-dim)', borderBottom: '1px solid var(--border)' }}>REFERENCE</th>
                        <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-dim)', borderBottom: '1px solid var(--border)' }}>DESCRIPTION</th>
                        <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-dim)', borderBottom: '1px solid var(--border)' }}>DEBIT</th>
                        <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-dim)', borderBottom: '1px solid var(--border)' }}>CREDIT</th>
                        <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-dim)', borderBottom: '1px solid var(--border)' }}>BALANCE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountDetails.history.length === 0 ? (
                        <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>No journal lines recorded for this account.</td></tr>
                      ) : accountDetails.history.map((line, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '1rem' }}>{new Date(line.date).toLocaleDateString()}</td>
                          <td style={{ padding: '1rem', fontWeight: '600', color: 'var(--primary)' }}>{line.ref_no}</td>
                          <td style={{ padding: '1rem' }}>{line.description}</td>
                          <td style={{ padding: '1rem', textAlign: 'right', color: '#10b981' }}>{line.debit > 0 ? `৳${line.debit.toLocaleString()}` : '-'}</td>
                          <td style={{ padding: '1rem', textAlign: 'right', color: '#ef4444' }}>{line.credit > 0 ? `৳${line.credit.toLocaleString()}` : '-'}</td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '800' }}>৳{line.running_balance.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Ledger;
