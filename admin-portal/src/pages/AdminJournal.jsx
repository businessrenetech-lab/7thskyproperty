import React, { useState, useEffect } from 'react';
import { Loader2, Search, Plus, Trash2 } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import '../styles/GlobalStyles.css';

const Journal = () => {
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [datePreset, setDatePreset] = useState('all');
  const [accountsList, setAccountsList] = useState([]);

  // Modal State
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    ref_no: '',
    description: '',
    lines: [
      { account_id: '', debit: '', credit: '', notes: '' },
      { account_id: '', debit: '', credit: '', notes: '' }
    ]
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { 
    fetchAccounts();
    fetchJournal(); 
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/accounting/accounts');
      setAccountsList(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchJournal = async () => {
    try {
      const params = { search, type: typeFilter, account_id: accountFilter };
      
      const today = new Date();
      if (datePreset === 'daily') {
        params.from = today.toISOString().split('T')[0];
        params.to = today.toISOString().split('T')[0];
      } else if (datePreset === 'weekly') {
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);
        params.from = lastWeek.toISOString().split('T')[0];
        params.to = today.toISOString().split('T')[0];
      } else if (datePreset === 'monthly') {
        const lastMonth = new Date(today);
        lastMonth.setMonth(today.getMonth() - 1);
        params.from = lastMonth.toISOString().split('T')[0];
        params.to = today.toISOString().split('T')[0];
      } else if (datePreset === 'custom') {
        if (dateFrom) params.from = dateFrom;
        if (dateTo) params.to = dateTo;
      }

      const res = await api.get('/accounting/journal', { params });
      setLines(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (datePreset === 'custom' && (!dateFrom || !dateTo)) return; // wait for full custom range
    const timer = setTimeout(() => fetchJournal(), 300);
    return () => clearTimeout(timer);
  }, [search, typeFilter, accountFilter, datePreset, dateFrom, dateTo]);

  // Modal Handlers
  const handleAddLine = () => setNewEntry(prev => ({ ...prev, lines: [...prev.lines, { account_id: '', debit: '', credit: '', notes: '' }] }));
  const handleRemoveLine = (index) => setNewEntry(prev => ({ ...prev, lines: prev.lines.filter((_, i) => i !== index) }));
  const handleLineChange = (index, field, value) => {
    const newLines = [...newEntry.lines];
    newLines[index][field] = value;
    if (field === 'debit' && value) newLines[index].credit = '';
    if (field === 'credit' && value) newLines[index].debit = '';
    setNewEntry({ ...newEntry, lines: newLines });
  };
  const calculateTotals = () => {
    let totalDebit = 0; let totalCredit = 0;
    newEntry.lines.forEach(l => {
      totalDebit += parseFloat(l.debit || 0);
      totalCredit += parseFloat(l.credit || 0);
    });
    return { totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 };
  };

  const submitEntry = async (e) => {
    e.preventDefault();
    const { totalDebit, totalCredit, balanced } = calculateTotals();
    if (!balanced || totalDebit === 0) return alert('Debits and Credits must be equal and greater than 0.');
    if (newEntry.lines.some(l => !l.account_id)) return alert('All lines must have an account selected.');

    setSubmitting(true);
    try {
      await api.post('/accounting/journal-entries', newEntry);
      setShowEntryModal(false);
      setNewEntry({
        date: new Date().toISOString().split('T')[0],
        ref_no: '', description: '',
        lines: [{ account_id: '', debit: '', credit: '', notes: '' }, { account_id: '', debit: '', credit: '', notes: '' }]
      });
      fetchJournal();
    } catch (err) { alert(err?.response?.data?.error || 'Failed to submit'); }
    finally { setSubmitting(false); }
  };



  // Build running balance PER ACCOUNT (not a global mix)
  const accountBalances = {};
  const enriched = [...lines].reverse().map(line => {
    const accId = line.account_id || line.Account?.id || 'unknown';
    const accType = line.Account?.type || 'asset';
    if (!accountBalances[accId]) accountBalances[accId] = 0;
    const debit = parseFloat(line.debit || 0);
    const credit = parseFloat(line.credit || 0);
    // Assets & expenses: normal debit balance. Liabilities, equity, revenue: normal credit balance.
    if (accType === 'asset' || accType === 'expense') {
      accountBalances[accId] += debit - credit;
    } else {
      accountBalances[accId] += credit - debit;
    }
    return { ...line, balance: accountBalances[accId] };
  }).reverse();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 800 }}>Transaction Journal</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', margin: '4px 0 0 0' }}>Review and log general ledger entries</p>
          </div>
          <button onClick={() => setShowEntryModal(true)} className="btn-primary" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem' }}>
            <Plus size={16} /> Manual Entry
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap', background: 'var(--glass)', padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {['all', 'daily', 'weekly', 'monthly', 'custom'].map(p => (
              <button key={p} onClick={() => setDatePreset(p)} className={datePreset === p ? 'btn-stitch' : 'btn-ghost'} style={{ padding: '0.6rem 0.8rem', fontSize: '0.75rem', background: datePreset === p ? '#7bc62e' : 'transparent', color: datePreset === p ? '#fff' : 'var(--text-dim)', border: datePreset !== p ? '1px solid var(--border)' : 'none' }}>
                {p.toUpperCase()}
              </button>
            ))}
            {datePreset === 'custom' && (
              <div style={{ display: 'flex', gap: '4px' }}>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: '0.6rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '0.8rem' }} />
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: '0.6rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '0.8rem' }} />
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}></div>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search journal..." style={{ padding: '0.6rem 0.6rem 0.6rem 2.2rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '0.8rem', width: '220px' }} />
          </div>
          <select value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)} style={{ padding: '0.6rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '0.8rem', maxWidth: '180px', textOverflow: 'ellipsis' }}>
            <option value="all">All Accounts</option>
            {accountsList.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ padding: '0.6rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '0.8rem' }}>
            <option value="all">All Types</option>
            <option value="asset">Asset</option>
            <option value="liability">Liability</option>
            <option value="revenue">Revenue</option>
            <option value="expense">Expense</option>
          </select>
        </div>
      </div>

      {/* Journal Table */}
      <div className="glass-morphism" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '0.7fr 0.7fr 2fr 1.2fr 1fr 1fr 1fr 0.8fr', gap: '0.5rem', padding: '0.8rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          <span>DATE</span><span>REF #</span><span>DESCRIPTION</span><span>ACCOUNT</span><span>DEBIT (DR)</span><span>CREDIT (CR)</span><span>BALANCE</span><span>POSTED BY</span>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}><Loader2 size={32} className="animate-spin" color="#7bc62e" style={{ margin: '0 auto' }}/></div>
        ) : enriched.length === 0 ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>No journal entries found. Create your first entry to see transactions here.</p>
        ) : enriched.map((line, i) => {
          const isReversal = line.JournalEntry?.description?.includes('Reversal') || line.notes?.includes('Reversal');
          return (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '0.7fr 0.7fr 2fr 1.2fr 1fr 1fr 1fr 0.8fr', gap: '0.5rem', padding: '0.9rem 0', borderBottom: '1px solid var(--border)', alignItems: 'center', fontSize: '0.85rem', background: isReversal ? 'rgba(71, 85, 105, 0.1)' : 'transparent', color: isReversal ? '#475569' : 'inherit' }}>
            <span style={{ color: isReversal ? '#475569' : 'var(--text-dim)', fontSize: '0.8rem' }}>{line.JournalEntry?.date ? new Date(line.JournalEntry.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) : '—'}</span>
            <span style={{ color: isReversal ? '#475569' : 'var(--text-dim)', fontSize: '0.8rem' }}>{line.JournalEntry?.ref_no || '—'}</span>
            <div>
              <span style={{ fontWeight: '500', color: isReversal ? '#475569' : 'inherit' }}>{line.JournalEntry?.description || '—'}</span>
              {line.notes && <p style={{ fontSize: '0.7rem', color: isReversal ? '#64748b' : 'var(--text-dim)', margin: '2px 0 0' }}>{line.notes}</p>}
            </div>
            <span style={{ color: isReversal ? '#475569' : '#275fa7', fontSize: '0.8rem' }}>{line.Account?.name || '—'}</span>
            <span style={{ fontWeight: '600', color: isReversal ? '#475569' : parseFloat(line.debit) > 0 ? '#06b6d4' : 'var(--text-dim)' }}>{parseFloat(line.debit) > 0 ? `৳${parseFloat(line.debit).toLocaleString()}` : '—'}</span>
            <span style={{ fontWeight: '600', color: isReversal ? '#475569' : parseFloat(line.credit) > 0 ? '#10b981' : 'var(--text-dim)' }}>{parseFloat(line.credit) > 0 ? `৳${parseFloat(line.credit).toLocaleString()}` : '—'}</span>
            <span style={{ fontWeight: '700', fontSize: '0.85rem', color: isReversal ? '#475569' : 'inherit' }}>৳{Math.abs(line.balance).toLocaleString()}</span>
            <span style={{ fontSize: '0.75rem', color: isReversal ? '#475569' : 'var(--text-dim)' }}>{line.JournalEntry?.Poster?.name || 'System'}</span>
          </div>
        )})}
      </div>

      {/* Manual Journal Entry Modal */}
      <Modal isOpen={showEntryModal} onClose={() => setShowEntryModal(false)} title="Manual Journal Entry">
          <div style={{ width: '800px', maxWidth: '90vw' }}>
            <form onSubmit={submitEntry} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Posting Date *</label>
                  <input type="date" required className="glass-input" value={newEntry.date} onChange={e => setNewEntry({...newEntry, date: e.target.value})} style={{ padding: '0.8rem' }} />
                </div>
                <div className="form-group">
                  <label>Reference No. (Optional)</label>
                  <input type="text" className="glass-input" placeholder="e.g. ADJ-2026-001" value={newEntry.ref_no} onChange={e => setNewEntry({...newEntry, ref_no: e.target.value})} style={{ padding: '0.8rem' }} />
                </div>
              </div>
              <div className="form-group">
                <label>Journal Description *</label>
                <input type="text" required className="glass-input" placeholder="Description for the entire entry..." value={newEntry.description} onChange={e => setNewEntry({...newEntry, description: e.target.value})} style={{ padding: '0.8rem' }} />
              </div>

              {/* Line Items Table */}
              <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', marginTop: '0.5rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)' }}>
                    <tr>
                      <th style={{ padding: '0.8rem 1rem', textAlign: 'left', fontWeight: 600 }}>Account *</th>
                      <th style={{ padding: '0.8rem 1rem', textAlign: 'left', fontWeight: 600 }}>Notes</th>
                      <th style={{ padding: '0.8rem 1rem', textAlign: 'right', width: '120px', fontWeight: 600 }}>Debit (DR)</th>
                      <th style={{ padding: '0.8rem 1rem', textAlign: 'right', width: '120px', fontWeight: 600 }}>Credit (CR)</th>
                      <th style={{ padding: '0.8rem 0.5rem', width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {newEntry.lines.map((line, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.5rem' }}>
                          <select required className="glass-input" value={line.account_id} onChange={e => handleLineChange(i, 'account_id', e.target.value)} style={{ width: '100%', padding: '0.6rem', border: 'none', background: 'transparent' }}>
                            <option value="">Select Account...</option>
                            {accountsList.map(a => <option key={a.id} value={a.id} style={{ color: 'black' }}>{a.code} - {a.name}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <input type="text" className="glass-input" placeholder="Line notes..." value={line.notes} onChange={e => handleLineChange(i, 'notes', e.target.value)} style={{ width: '100%', padding: '0.6rem', border: 'none', background: 'transparent' }} />
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <input type="number" className="glass-input" placeholder="0.00" step="0.01" value={line.debit} onChange={e => handleLineChange(i, 'debit', e.target.value)} style={{ width: '100%', padding: '0.6rem', textAlign: 'right', border: 'none', background: 'transparent' }} disabled={!!line.credit} />
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <input type="number" className="glass-input" placeholder="0.00" step="0.01" value={line.credit} onChange={e => handleLineChange(i, 'credit', e.target.value)} style={{ width: '100%', padding: '0.6rem', textAlign: 'right', border: 'none', background: 'transparent' }} disabled={!!line.debit} />
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                          <button type="button" onClick={() => handleRemoveLine(i)} disabled={newEntry.lines.length <= 2} style={{ background: 'none', border: 'none', color: newEntry.lines.length <= 2 ? 'var(--text-dim)' : 'var(--danger)', cursor: newEntry.lines.length <= 2 ? 'not-allowed' : 'pointer' }}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding: '0.8rem', background: 'rgba(0,0,0,0.1)', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                  <button type="button" onClick={handleAddLine} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Plus size={14} /> Add Additional Line
                  </button>
                </div>
              </div>

              {/* Totals */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(123, 198, 46, 0.05)', border: '1px solid rgba(123, 198, 46, 0.2)', borderRadius: '8px', fontWeight: 'bold' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: calculateTotals().balanced ? '#7bc62e' : 'var(--danger)' }}>
                  {calculateTotals().balanced ? '✔ Journal balances correctly' : '✖ Debit and Credit amounts must match'}
                </div>
                <div style={{ display: 'flex', gap: '2rem', fontSize: '1.1rem' }}>
                  <div>DR: <span style={{ color: 'var(--text)' }}>৳{calculateTotals().totalDebit.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                  <div>CR: <span style={{ color: 'var(--text)' }}>৳{calculateTotals().totalCredit.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowEntryModal(false)} className="btn-ghost">Discard</button>
                <button type="submit" className="btn-primary" disabled={submitting || !calculateTotals().balanced || calculateTotals().totalDebit === 0}>
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : 'Post to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
    </div>
  );
};

export default Journal;
