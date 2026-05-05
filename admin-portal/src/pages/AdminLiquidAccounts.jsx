import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Wallet, Search, Landmark, Smartphone, Banknote } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import '../styles/GlobalStyles.css';
import { useToast } from '../context/ToastContext';

const AdminLiquidAccounts = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [selectedAcc, setSelectedAcc] = useState(null);
  
  const [newAccData, setNewAccData] = useState({ name: '', sub_type: 'bank' });
  const [reconcileData, setReconcileData] = useState({ date: new Date().toISOString().split('T')[0], startBalance: '', endBalance: '', notes: '' });
  
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/finance/accounts/liquid');
      setAccounts(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/finance/accounts/liquid', newAccData);
      setShowAddModal(false);
      setNewAccData({ name: '', sub_type: 'bank' });
      fetchData();
    } catch (err) {
      toast.error('Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

  const totals = {
    bank: accounts.filter(a => a.sub_type === 'bank').reduce((sum, a) => sum + parseFloat(a.balance || 0), 0),
    mfs: accounts.filter(a => a.sub_type === 'mfs').reduce((sum, a) => sum + parseFloat(a.balance || 0), 0),
    cash: accounts.filter(a => a.sub_type === 'cash').reduce((sum, a) => sum + parseFloat(a.balance || 0), 0)
  };

  if (loading) return <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={48} className="animate-spin" color="var(--primary)" /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Bank & Cash Accounts</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Manage liquid assets, MFS wallets, and physical cash drawers</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
          <Plus size={16} /> Add Account
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        <div className="glass-morphism" style={{ padding: '1.5rem', borderTop: '3px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>TOTAL IN BANKS</p>
            <Landmark size={18} color="#3b82f6" opacity={0.5} />
          </div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#3b82f6', marginTop: '0.5rem' }}>৳{totals.bank.toLocaleString()}</h2>
        </div>
        <div className="glass-morphism" style={{ padding: '1.5rem', borderTop: '3px solid #e2136e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>MFS WALLETS (bKash/Nagad)</p>
            <Smartphone size={18} color="#e2136e" opacity={0.5} />
          </div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#e2136e', marginTop: '0.5rem' }}>৳{totals.mfs.toLocaleString()}</h2>
        </div>
        <div className="glass-morphism" style={{ padding: '1.5rem', borderTop: '3px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>CASH IN HAND</p>
            <Banknote size={18} color="#10b981" opacity={0.5} />
          </div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#10b981', marginTop: '0.5rem' }}>৳{totals.cash.toLocaleString()}</h2>
        </div>
      </div>

      {/* Accounts List */}
      <div className="glass-morphism" style={{ padding: '0' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>Registered Accounts</h3>
          <div style={{ position: 'relative', width: '250px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input type="text" placeholder="Search accounts..." className="glass-input" style={{ width: '100%', paddingLeft: '2rem', padding: '0.4rem 2rem', fontSize: '0.8rem' }} />
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              <th style={{ padding: '1rem 1.5rem' }}>Account Name</th>
              <th style={{ padding: '1rem 1.5rem' }}>Code</th>
              <th style={{ padding: '1rem 1.5rem' }}>Category</th>
              <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Current Balance</th>
              <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map(acc => (
              <tr key={acc.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <div style={{ padding: '0.4rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                      {acc.sub_type === 'bank' && <Landmark size={16} color="#3b82f6" />}
                      {acc.sub_type === 'mfs' && <Smartphone size={16} color="#e2136e" />}
                      {acc.sub_type === 'cash' && <Banknote size={16} color="#10b981" />}
                    </div>
                    {acc.name}
                  </div>
                </td>
                <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', color: 'var(--text-dim)' }}>{acc.code}</td>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <span style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                    {acc.sub_type}
                  </span>
                </td>
                <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '700', color: acc.balance < 0 ? 'var(--danger)' : 'var(--text)' }}>
                  ৳{parseFloat(acc.balance).toLocaleString()}
                </td>
                <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                  <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={() => { setSelectedAcc(acc); setShowReconcileModal(true); }}>
                    Reconcile
                  </button>
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>No liquid accounts found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Register Liquid Account">
        <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div className="form-group">
            <label>Account Type (Category)</label>
            <select required className="glass-input" value={newAccData.sub_type} onChange={e => setNewAccData({...newAccData, sub_type: e.target.value})} style={{ appearance: 'auto', padding: '1rem' }}>
              <option value="bank">Traditional Bank Account</option>
              <option value="mfs">Mobile Financial Service (bKash/Nagad)</option>
              <option value="cash">Physical Cash Drawer</option>
            </select>
          </div>

          <div className="form-group">
            <label>Legal Account Identity (Name)</label>
            <input required className="glass-input" placeholder="e.g. Brac Bank - Main Branch" value={newAccData.name} onChange={e => setNewAccData({...newAccData, name: e.target.value})} />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary" style={{ padding: '1rem', marginTop: '0.5rem' }}>
            {submitting ? <Loader2 size={18} className="animate-spin" style={{ margin: '0 auto' }} /> : 'Provision Ledger Route'}
          </button>
        </form>
      </Modal>

      <Modal isOpen={showReconcileModal} onClose={() => setShowReconcileModal(false)} title={`Reconcile: ${selectedAcc?.name}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)' }}>System Calculated Balance</p>
            <h3 style={{ margin: '0.3rem 0 0 0', color: 'var(--primary)' }}>৳{parseFloat(selectedAcc?.balance || 0).toLocaleString()}</h3>
          </div>
          <div className="form-group">
            <label>Verification Date</label>
            <input type="date" required className="glass-input" value={reconcileData.date} onChange={e => setReconcileData({...reconcileData, date: e.target.value})} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Opening Day Balance (Optional)</label>
              <input type="number" className="glass-input" placeholder="0.00" value={reconcileData.startBalance} onChange={e => setReconcileData({...reconcileData, startBalance: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Actual Closing Count (Physical/Bank)</label>
              <input type="number" required className="glass-input" placeholder="0.00" value={reconcileData.endBalance} onChange={e => setReconcileData({...reconcileData, endBalance: e.target.value})} />
            </div>
          </div>
          <div className="form-group">
            <label>Reconciliation Notes (Discrepancy reason)</label>
            <input type="text" className="glass-input" placeholder="e.g. Found 50tk extra in drawer" value={reconcileData.notes} onChange={e => setReconcileData({...reconcileData, notes: e.target.value})} />
          </div>
          <button type="button" onClick={() => { toast.success('Reconciliation Saved! Journal variance posted (simulated)'); setShowReconcileModal(false); }} className="btn-primary" style={{ padding: '1rem', marginTop: '0.5rem' }}>
            Lock End of Day Balance
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminLiquidAccounts;
