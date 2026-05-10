import React, { useState, useEffect } from 'react';
import { Loader2, ChevronRight, Trash2, Download, FileText, Filter, Calendar, AlertTriangle, CheckCircle, Clock, XCircle, FolderOpen, Edit2 } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import { downloadVoucherPdf, downloadExpenseListPdf, numberToWords } from '../utils/pdfUtils';
import '../styles/GlobalStyles.css';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const AUTO_THRESHOLD = 5000;

const catColors = ['#275fa7', '#7bc62e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const statusConfig = {
  approved: { label: 'Approved', cls: 'sb2-mint', icon: <CheckCircle size={12} /> },
  pending: { label: 'Pending Approval', cls: 'sb2-amber', icon: <Clock size={12} /> },
  verified: { label: 'Verified', cls: 'sb2-cyan', icon: <CheckCircle size={12} /> },
  rejected: { label: 'Rejected', cls: 'sb2-rose', icon: <XCircle size={12} /> },
  deleted: { label: 'Deleted', cls: 'sb2-dim', icon: <Trash2 size={12} /> }
};

const formatDateLocal = (d) => {
  const dt = new Date(d);
  return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
};

const getTodayLocal = () => formatDateLocal(new Date());

const ExpenseManager = () => {
  const toast = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [liquidAccounts, setLiquidAccounts] = useState([]);
  const [flatCategories, setFlatCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [split, setSplit] = useState({ split: [], grandTotal: 0 });
  const [activeTab, setActiveTab] = useState('expenses');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ account_id: '', amount: '', description: '', category: '', payment_method: 'cash', date: '' });
  const [catForm, setCatForm] = useState({ name: '', parent_id: '', description: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [rejectionModal, setRejectionModal] = useState({ isOpen: false, id: null, reason: '' });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, reason: '', status: '' });
  const [sourceModal, setSourceModal] = useState({ isOpen: false, id: null, account_id: '' });
  const [editModal, setEditModal] = useState({ isOpen: false, id: null, existingReceipt: '' });
  const [editForm, setEditForm] = useState({ account_id: '', amount: '', description: '', category: '', payment_method: 'cash', date: '' });
  const [editSelectedFile, setEditSelectedFile] = useState(null);

  // Date filter state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [datePreset, setDatePreset] = useState('all');
  const mountedRef = React.useRef(false);

  const buildDateQuery = () => {
    if (datePreset === 'today') {
      const today = getTodayLocal();
      return { from: today, to: today };
    }
    if (datePreset === 'week') {
      const now = new Date();
      return { from: formatDateLocal(new Date(now.getTime() - 6 * 86400000)), to: getTodayLocal() };
    }
    if (datePreset === 'month') {
      const now = new Date();
      return { from: formatDateLocal(new Date(now.getFullYear(), now.getMonth(), 1)), to: getTodayLocal() };
    }
    if (datePreset === 'custom' && dateFrom && dateTo) {
      return { from: dateFrom, to: dateTo };
    }
    return {};
  };

  const fetchData = async () => {
    try {
      const dateQ = buildDateQuery();
      const params = new URLSearchParams(dateQ).toString();
      const qStr = params ? `?${params}` : '';

      const [expRes, liquidRes, splitRes, catRes, flatRes] = await Promise.all([
        api.get(`/expenses${qStr}`).catch(() => ({ data: [] })),
        api.get('/finance/accounts/liquid').catch(() => ({ data: [] })),
        api.get(`/expenses/split${qStr}`).catch(() => ({ data: { split: [], grandTotal: 0 } })),
        api.get('/expenses/categories').catch(() => ({ data: [] })),
        api.get('/expenses/categories/flat').catch(() => ({ data: [] }))
      ]);
      setExpenses(expRes.data);
      setLiquidAccounts(liquidRes.data);
      if (liquidRes.data.length > 0) {
        setForm(prev => ({ ...prev, account_id: liquidRes.data[0].id, payment_method: liquidRes.data[0].sub_type }));
      }
      setSplit(splitRes.data);
      setCategories(catRes.data);
      setFlatCategories(flatRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // Initial fetch on mount
  useEffect(() => { fetchData(); }, []);

  // Re-fetch only when date filters change AFTER initial mount
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    setLoading(true);
    fetchData();
  }, [datePreset, dateFrom, dateTo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.keys(form).forEach(key => formData.append(key, form[key]));
      if (selectedFile) formData.append('receipt', selectedFile);

      const res = await api.post('/expenses', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setIsModalOpen(false);
      setSelectedFile(null);
      setForm({ account_id: liquidAccounts[0]?.id || '', amount: '', description: '', category: '', payment_method: liquidAccounts[0]?.sub_type || 'cash', date: '' });

      toast.success(res.data?.message || (res.data?.auto_approved
        ? '✓ Expense auto-approved (below BDT 5,000). Journal entry created.'
        : 'Expense submitted for branch admin approval.'));
      fetchData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to submit expense'); }
    finally { setSubmitting(false); }
  };

  const handleVerify = async (id) => {
    try { await api.put(`/expenses/${id}/verify`); fetchData(); }
    catch (err) { toast.error(err.response?.data?.error || 'Verification failed'); }
  };

  const handleApprove = async (id) => {
    try { await api.put(`/expenses/${id}/approve`); fetchData(); }
    catch (err) { toast.error(err.response?.data?.error || 'Approval failed'); }
  };

  const openEditModal = (expense) => {
    setEditModal({ isOpen: true, id: expense.id, existingReceipt: expense.receipt_url || '' });
    setEditForm({
      account_id: expense.account_id || liquidAccounts[0]?.id || '',
      amount: expense.amount || '',
      description: expense.description || '',
      category: expense.category || '',
      payment_method: expense.payment_method || 'cash',
      date: expense.date || '',
    });
    setEditSelectedFile(null);
  };

  const closeEditModal = () => {
    setEditModal({ isOpen: false, id: null, existingReceipt: '' });
    setEditSelectedFile(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.keys(editForm).forEach(key => formData.append(key, editForm[key]));
      if (editSelectedFile) formData.append('receipt', editSelectedFile);

      await api.put(`/expenses/${editModal.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      closeEditModal();
      toast.success('Expense updated. If it was verified, it was sent back to pending for review.');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to update expense'); }
    finally { setSubmitting(false); }
  };

  const handleReject = async () => {
    try {
      await api.put(`/expenses/${rejectionModal.id}/reject`, { rejection_reason: rejectionModal.reason });
      setRejectionModal({ isOpen: false, id: null, reason: '' });
      fetchData();
    } catch (err) { toast.error('Rejection failed'); }
  };

  const openSourceModal = (expense) => {
    setSourceModal({ isOpen: true, id: expense.id, account_id: expense.account_id || liquidAccounts[0]?.id || '' });
  };

  const handleSelectPaymentSource = async () => {
    if (!sourceModal.account_id) {
      toast.error('Choose a cash, bank, or mobile wallet account');
      return;
    }
    try {
      await api.put(`/expenses/${sourceModal.id}/payment-source`, { account_id: parseInt(sourceModal.account_id) });
      setSourceModal({ isOpen: false, id: null, account_id: '' });
      fetchData();
      toast.success('Payroll payment source selected');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to select payment source');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/expenses/${deleteModal.id}`, { data: { deletion_reason: deleteModal.reason } });
      setDeleteModal({ isOpen: false, id: null, reason: '', status: '' });
      fetchData();
      toast.success(`Expense deleted successfully.${deleteModal.status === 'approved' ? ' Journal entries reversed.' : ''}`);
    } catch (err) { toast.error(err.response?.data?.error || 'Deletion failed'); }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/expenses/categories', catForm);
      setCatForm({ name: '', parent_id: '', description: '' });
      setShowCatForm(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Deactivate this category and all sub-categories?')) return;
    try { await api.delete(`/expenses/categories/${id}`); fetchData(); } catch (err) { toast.error('Failed'); }
  };

  const filteredExpenses = expenses.filter(e => filterStatus === 'all' || e.status === filterStatus);
  const pendingCount = expenses.filter(e => e.status === 'pending').length;
  const approvedCount = expenses.filter(e => e.status === 'approved').length;



  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── View Header ── */}
      <div className="view-head">
        <div>
          <div className="view-title">Expense Manager</div>
          <div className="view-sub">Track, categorize, approve & export expenses with smart auto-approval</div>
        </div>
        <div className="view-actions">
          <button className="btn-ghost" onClick={() => setActiveTab(activeTab === 'categories' ? 'expenses' : 'categories')} style={{ color: '#275fa7', borderColor: 'rgba(39,95,167,0.3)' }}>
            <FolderOpen size={14} />
            {activeTab === 'categories' ? 'Expenses' : 'Categories'}
          </button>
          {activeTab === 'expenses' && (
            <>
              <button className="btn-ghost" onClick={() => downloadExpenseListPdf(filteredExpenses, buildDateQuery())} style={{ color: '#275fa7', borderColor: 'rgba(39,95,167,0.3)' }}>
                <Download size={14} /> Export PDF
              </button>
              <button className="btn-stitch" onClick={() => setIsModalOpen(true)} style={{ background: '#7bc62e' }}>
                + Record Expense
              </button>
            </>
          )}
          {activeTab === 'categories' && (
            <button className="btn-stitch" onClick={() => setShowCatForm(!showCatForm)} style={{ background: '#7bc62e' }}>
              + Add Category
            </button>
          )}
        </div>
      </div>

      <div className="pulse-grid pg-4">
        <div className="pulse-card c-amber" style={{ background: 'linear-gradient(135deg, rgba(39,95,167,0.1), rgba(39,95,167,0.05))', border: '1px solid rgba(39,95,167,0.2)' }}>
          <div className="pc-label" style={{ color: '#275fa7' }}>Total Expenses</div>
          <div className="pc-value" style={{ color: '#275fa7' }}>৳{(split.grandTotal || 0).toLocaleString()}</div>
          <div className="pc-meta">{expenses.length} transactions</div>
        </div>
        <div className="pulse-card c-mint" style={{ background: 'linear-gradient(135deg, rgba(123,198,46,0.1), rgba(123,198,46,0.05))', border: '1px solid rgba(123,198,46,0.2)' }}>
          <div className="pc-label" style={{ color: '#7bc62e' }}>Approved</div>
          <div className="pc-value" style={{ color: '#7bc62e' }}>{approvedCount}</div>
          <div className="pc-meta">
            <span className="pc-change up" style={{ color: '#7bc62e' }}>✓</span> entries recorded
          </div>
        </div>
        <div className="pulse-card c-amber">
          <div className="pc-label">Pending Approval</div>
          <div className="pc-value">{pendingCount}</div>
          <div className="pc-meta">
            {pendingCount > 0 ? <><AlertTriangle size={12} color="#FFB347" /> BDT 5,000+ awaiting</> : 'All clear'}
          </div>
        </div>
        <div className="pulse-card c-violet" style={{ background: 'linear-gradient(135deg, rgba(71,85,105,0.1), rgba(71,85,105,0.05))', border: '1px solid rgba(71,85,105,0.2)' }}>
          <div className="pc-label" style={{ color: '#475569' }}>Categories</div>
          <div className="pc-value" style={{ color: '#475569' }}>{categories.length}</div>
          <div className="pc-meta">{flatCategories.length} total entries</div>
        </div>
      </div>

      {/* ═══ EXPENSES TAB ═══ */}
      {activeTab === 'expenses' && (
        <>
          {/* Date Filter Bar */}
          <div className="sc">
            <div className="sc-head">
              <div className="row">
                <Filter size={14} style={{ color: 'var(--text-dim)' }} />
                <span className="sc-title">Filters</span>
              </div>
              <div className="row" style={{ gap: '6px' }}>
                {['all', 'today', 'week', 'month', 'custom'].map(p => (
                  <button key={p} onClick={() => setDatePreset(p)} className={datePreset === p ? 'btn-stitch' : 'btn-ghost'} style={{ padding: '5px 12px', fontSize: '11px', background: datePreset === p ? '#275fa7' : 'var(--glass)', color: datePreset === p ? '#fff' : 'var(--text-dim)' }}>
                    {p === 'all' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
                {datePreset === 'custom' && (
                  <>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="glass-input" style={{ width: '140px', padding: '5px 10px', fontSize: '12px' }} />
                    <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>→</span>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="glass-input" style={{ width: '140px', padding: '5px 10px', fontSize: '12px' }} />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Split + Table Grid */}
          <div className="g65">
            {/* Expense Table */}
            <div className="sc">
              <div className="sc-head">
                <span className="sc-title">Expense Records</span>
                <div className="row" style={{ gap: '4px' }}>
                  {['all', 'pending', 'verified', 'approved', 'rejected', 'deleted'].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)} className={filterStatus === s ? 'btn-stitch' : 'btn-ghost'} style={{ padding: '4px 10px', fontSize: '10px', background: filterStatus === s ? '#7bc62e' : 'var(--glass)', color: filterStatus === s ? '#fff' : 'var(--text-dim)' }}>
                      {s === 'deleted' ? 'REVERSED' : s.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="st-wrap">
                <table className="stitch">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}><Loader2 size={24} className="animate-spin" color="var(--primary)" style={{ margin: '0 auto' }} /></td></tr>
                    ) : filteredExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                          No expense records for this period
                        </td>
                      </tr>
                    ) : filteredExpenses.map((exp) => {
                      const amt = parseFloat(exp.amount);
                      const needsApproval = amt >= AUTO_THRESHOLD;
                      const sc = statusConfig[exp.status] || statusConfig.pending;
                      const isPayroll = exp.expense_origin === 'payroll';
                      const sourceSelected = !isPayroll || exp.payment_source_selected;
                      const canEditBeforeApproval = ['pending', 'verified'].includes(exp.status) && !isPayroll;
                      const canApproveExpense = !(user?.role === 'accounts' && needsApproval);
                      return (
                        <tr key={exp.id}>
                          <td>
                            <div style={{ fontSize: '13px' }}>{new Date(exp.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                            {exp.receipt_url && <a href={exp.receipt_url} target="_blank" rel="noreferrer" style={{ fontSize: '10px', color: '#275fa7', textDecoration: 'none' }}>📎 Receipt</a>}
                          </td>
                          <td className="td-name">
                            {isPayroll && <span style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: '999px', background: 'rgba(39,95,167,0.12)', color: '#275fa7', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', marginRight: '6px' }}>Payroll</span>}
                            {exp.status === 'deleted' ? (
                              <span style={{ textDecoration: 'line-through', color: '#64748b' }}>{exp.description || '-'}</span>
                            ) : (
                              exp.description || '-'
                            )}
                            {isPayroll && <div style={{ fontSize: '11px', color: '#275fa7', marginTop: '4px' }}>Salary payment request · Payroll #{exp.payroll_id || 'N/A'}</div>}
                            {isPayroll && !sourceSelected && <div style={{ fontSize: '11px', color: '#9B6DFF', marginTop: '4px', fontWeight: 700 }}>Admin must choose cash, bank, or mobile wallet before accounting action.</div>}
                            {exp.status === 'deleted' && <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>Reversal Reason: {exp.deletion_reason || 'N/A'}</div>}
                          </td>
                          <td><span className="exp-cat">{exp.category || 'Uncategorized'}</span></td>
                          <td>
                            <span style={{ fontWeight: 700, color: exp.status === 'deleted' ? '#94a3b8' : '#275fa7', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', textDecoration: exp.status === 'deleted' ? 'line-through' : 'none' }}>
                              ৳{amt.toLocaleString()}
                            </span>
                            {needsApproval && exp.status === 'approved' && (
                              <div style={{ fontSize: '9px', color: '#275fa7', marginTop: '2px' }}>Admin Approved</div>
                            )}
                            {!needsApproval && exp.status === 'approved' && (
                              <div style={{ fontSize: '9px', color: '#7bc62e', marginTop: '2px' }}>Auto-Approved</div>
                            )}
                          </td>
                          <td style={{ fontSize: '12px', textTransform: 'capitalize' }}>
                            {sourceSelected ? (exp.payment_method || '').replace(/_/g, ' ') : <span style={{ color: '#9B6DFF', fontWeight: 700 }}>Not selected</span>}
                            {exp.Account?.name && <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>{exp.Account.name}</div>}
                          </td>
                          <td>
                            <span className={`sb2 ${sc.cls}`}>
                              {sc.icon} {sc.label}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {exp.status === 'pending' && (
                                <>
                                  {canEditBeforeApproval && <button onClick={() => openEditModal(exp)} className="btn-ghost" style={{ padding: '3px 8px', fontSize: '10px', borderColor: 'rgba(245,158,11,0.3)', color: '#FFB347' }}><Edit2 size={10} /> Edit</button>}
                                  {isPayroll && !sourceSelected && <button onClick={() => openSourceModal(exp)} className="btn-ghost" style={{ padding: '3px 8px', fontSize: '10px', borderColor: 'rgba(155,109,255,0.3)', color: '#B896FF' }}>Choose Source</button>}
                                  {sourceSelected && <button onClick={() => handleVerify(exp.id)} className="btn-ghost" style={{ padding: '3px 8px', fontSize: '10px', borderColor: 'rgba(0,212,255,0.3)', color: '#38E8FF' }}>Verify</button>}
                                  <button onClick={() => setRejectionModal({ isOpen: true, id: exp.id, reason: '' })} className="btn-ghost" style={{ padding: '3px 8px', fontSize: '10px', borderColor: 'rgba(255,77,109,0.3)', color: '#FF7088' }}>Reject</button>
                                </>
                              )}
                              {exp.status === 'verified' && (
                                <>
                                  {canEditBeforeApproval && <button onClick={() => openEditModal(exp)} className="btn-ghost" style={{ padding: '3px 8px', fontSize: '10px', borderColor: 'rgba(245,158,11,0.3)', color: '#FFB347' }}><Edit2 size={10} /> Edit</button>}
                                  {isPayroll && !sourceSelected && <button onClick={() => openSourceModal(exp)} className="btn-ghost" style={{ padding: '3px 8px', fontSize: '10px', borderColor: 'rgba(155,109,255,0.3)', color: '#B896FF' }}>Choose Source</button>}
                                  {sourceSelected && canApproveExpense && <button onClick={() => handleApprove(exp.id)} className="btn-ghost" style={{ padding: '3px 8px', fontSize: '10px', borderColor: 'rgba(0,255,148,0.3)', color: '#4DFFA8' }}>Approve</button>}
                                  {sourceSelected && !canApproveExpense && <span className="sb2 sb2-amber" style={{ fontSize: '9px' }}>Admin approval required</span>}
                                  <button onClick={() => setRejectionModal({ isOpen: true, id: exp.id, reason: '' })} className="btn-ghost" style={{ padding: '3px 8px', fontSize: '10px', borderColor: 'rgba(255,77,109,0.3)', color: '#FF7088' }}>Reject</button>
                                </>
                              )}
                              {exp.status === 'approved' && (
                                <button onClick={() => downloadVoucherPdf(exp)} className="btn-ghost" style={{ padding: '3px 8px', fontSize: '10px', borderColor: 'rgba(155,109,255,0.3)', color: '#B896FF' }}>
                                  <FileText size={10} /> Voucher
                                </button>
                              )}
                              {exp.status !== 'deleted' && (
                                <button onClick={() => setDeleteModal({ isOpen: true, id: exp.id, reason: '', status: exp.status })} className="btn-ghost" style={{ padding: '3px 8px', fontSize: '10px', borderColor: 'rgba(255,77,109,0.2)', color: '#FF7088' }}>
                                  <Trash2 size={10} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Category Breakdown Sidebar */}
            <div className="sc">
              <div className="sc-head">
                <span className="sc-title">Category Breakdown</span>
              </div>
              <div className="sc-body">
                {split.split?.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem', fontSize: '13px' }}>No expense data yet</p>
                ) : split.split?.map((item, i) => (
                  <div key={i} style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-main)' }}>{item.category}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: catColors[i % catColors.length] }}>
                        ৳{item.total.toLocaleString()} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="pbar">
                      <div className="pbar-fill" style={{ width: `${item.percentage}%`, background: catColors[i % catColors.length] }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══ CATEGORIES TAB ═══ */}
      {activeTab === 'categories' && (
        <>
          {showCatForm && (
            <div className="sc">
              <div className="sc-head">
                <span className="sc-title">Add Expense Category</span>
              </div>
              <div className="sc-body">
                <form onSubmit={handleCreateCategory} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr auto', gap: '12px', alignItems: 'end' }}>
                  <div className="fgroup">
                    <label className="flabel">Category Name</label>
                    <input required value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} placeholder="e.g. Office Rent" className="glass-input" />
                  </div>
                  <div className="fgroup">
                    <label className="flabel">Parent (Head)</label>
                    <select value={catForm.parent_id} onChange={e => setCatForm({...catForm, parent_id: e.target.value})} className="glass-input">
                      <option value="">— None (Expense Head) —</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="fgroup">
                    <label className="flabel">Description</label>
                    <input value={catForm.description} onChange={e => setCatForm({...catForm, description: e.target.value})} placeholder="Optional" className="glass-input" />
                  </div>
                  <button type="submit" className="btn-stitch" disabled={submitting} style={{ height: '42px' }}>
                    {submitting ? 'Saving...' : 'Add'}
                  </button>
                </form>
              </div>
            </div>
          )}

          <div className="sc">
            <div className="sc-head">
              <span className="sc-title">Expense Category Tree</span>
              <span className="sb2 sb2-dim">{categories.length} heads</span>
            </div>
            <div className="sc-body">
              {categories.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem', fontSize: '13px' }}>
                  No categories yet. Click "+ Add Category" to create your first Expense Head.
                </p>
              ) : categories.map((head, i) => (
                <div key={head.id} style={{ marginBottom: '16px' }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', background: `${catColors[i % catColors.length]}10`,
                    borderRadius: '10px', borderLeft: `4px solid ${catColors[i % catColors.length]}`
                  }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px', color: 'var(--text-main)' }}>
                        <FolderOpen size={14} style={{ verticalAlign: 'middle', marginRight: '6px', color: catColors[i % catColors.length] }} />
                        {head.name}
                      </p>
                      {head.description && <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: 0 }}>{head.description}</p>}
                      <span className="sb2 sb2-violet" style={{ marginTop: '4px' }}>HEAD</span>
                    </div>
                    <button onClick={() => handleDeleteCategory(head.id)} className="btn-ghost" style={{ padding: '4px 8px', borderColor: 'rgba(255,77,109,0.2)', color: '#FF7088' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                  {head.Children?.map(sub => (
                    <div key={sub.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 16px 10px 36px', borderBottom: '1px solid var(--border)'
                    }}>
                      <div className="row">
                        <ChevronRight size={13} color="var(--text-dim)" />
                        <span style={{ fontSize: '13px', color: 'var(--text-main)' }}>{sub.name}</span>
                        <span className="sb2 sb2-cyan">SUB</span>
                      </div>
                      <button onClick={() => handleDeleteCategory(sub.id)} className="btn-ghost" style={{ padding: '3px 6px', borderColor: 'rgba(255,77,109,0.15)', color: '#FF7088' }}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ═══ RECORD EXPENSE MODAL ═══ */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record New Expense">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Auto-approval hint */}
          <div style={{
            background: 'rgba(123,198,46,0.08)', border: '1px solid rgba(123,198,46,0.2)',
            borderRadius: '10px', padding: '10px 14px', fontSize: '11px', color: '#7bc62e'
          }}>
            <CheckCircle size={12} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
            Expenses below <strong>BDT 5,000</strong> are auto-approved. Above BDT 5,000 requires receipt upload + branch admin approval.
          </div>

          <div className="fgroup">
            <label className="flabel">Expense Category / Head</label>
            <select required value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="glass-input">
              <option value="">Select Expense Category</option>
              {flatCategories.map(cat => (
                <option key={cat.id} value={cat.name}>
                  {cat.Parent ? `${cat.Parent.name} > ${cat.name}` : cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="fgroup">
            <label className="flabel">Paid From (Bank/Cash Ledger)</label>
            <select required value={form.account_id} onChange={e => {
              const acc = liquidAccounts.find(a => a.id.toString() === e.target.value);
              setForm({...form, account_id: e.target.value, payment_method: acc?.sub_type || 'cash'});
            }} className="glass-input">
              {liquidAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} ({acc.sub_type.toUpperCase()})</option>
              ))}
              {liquidAccounts.length === 0 && <option value="">No Accounts Found</option>}
            </select>
          </div>

          <div className="fgroup">
            <label className="flabel">Amount (BDT)</label>
            <input required type="number" step="0.01" placeholder="Amount precisely" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="glass-input" />
            {parseFloat(form.amount) >= AUTO_THRESHOLD && (
              <div style={{ fontSize: '10px', color: '#FFB347', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={11} /> BDT 5,000+: Receipt upload required. Needs branch admin approval.
              </div>
            )}
          </div>

          <div className="fgroup">
            <label className="flabel">
              Receipt Upload (PDF/Image)
              {parseFloat(form.amount) >= AUTO_THRESHOLD && <span style={{ color: '#FF7088', marginLeft: '4px' }}>* Required</span>}
            </label>
            <input type="file" accept="image/*,.pdf" onChange={e => setSelectedFile(e.target.files[0])} className="glass-input" style={{ padding: '8px' }} />
          </div>

          <div className="fgroup">
            <label className="flabel">Description / Payee Notes</label>
            <textarea placeholder="Specific description or payee notes" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="glass-input" style={{ height: '70px', resize: 'vertical' }} />
          </div>

          <div className="fgroup">
            <label className="flabel">Date</label>
            <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="glass-input" />
          </div>

          <button type="submit" className="btn-stitch" disabled={submitting} style={{ padding: '12px', justifyContent: 'center', fontSize: '14px' }}>
            {submitting ? 'Processing...' : parseFloat(form.amount) >= AUTO_THRESHOLD ? 'Submit for Approval' : 'Record & Auto-Approve'}
          </button>
        </form>
      </Modal>

      {/* ═══ EDIT EXPENSE MODAL ═══ */}
      <Modal isOpen={editModal.isOpen} onClose={closeEditModal} title="Edit Expense Before Approval">
        <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: '10px', padding: '10px 14px', fontSize: '11px', color: '#FFB347'
          }}>
            <AlertTriangle size={12} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
            Edits are allowed only before approval. Verified expenses return to pending if key details change.
          </div>

          <div className="fgroup">
            <label className="flabel">Expense Category / Head</label>
            <select required value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} className="glass-input">
              <option value="">Select Expense Category</option>
              {flatCategories.map(cat => (
                <option key={cat.id} value={cat.name}>
                  {cat.Parent ? `${cat.Parent.name} > ${cat.name}` : cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="fgroup">
            <label className="flabel">Paid From (Bank/Cash Ledger)</label>
            <select required value={editForm.account_id} onChange={e => {
              const acc = liquidAccounts.find(a => a.id.toString() === e.target.value);
              setEditForm({...editForm, account_id: e.target.value, payment_method: acc?.sub_type || 'cash'});
            }} className="glass-input">
              {liquidAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} ({String(acc.sub_type || 'cash').toUpperCase()})</option>
              ))}
              {liquidAccounts.length === 0 && <option value="">No Accounts Found</option>}
            </select>
          </div>

          <div className="fgroup">
            <label className="flabel">Amount (BDT)</label>
            <input required type="number" step="0.01" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: e.target.value})} className="glass-input" />
            {parseFloat(editForm.amount) >= AUTO_THRESHOLD && (
              <div style={{ fontSize: '10px', color: '#FFB347', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={11} /> BDT 5,000+: Receipt required. Branch/super admin approval required.
              </div>
            )}
          </div>

          <div className="fgroup">
            <label className="flabel">
              Receipt Upload (PDF/Image)
              {parseFloat(editForm.amount) >= AUTO_THRESHOLD && !editModal.existingReceipt && <span style={{ color: '#FF7088', marginLeft: '4px' }}>* Required</span>}
            </label>
            {editModal.existingReceipt && <div style={{ fontSize: '10px', color: '#7bc62e', marginBottom: '6px' }}>Existing receipt attached. Upload a new file only if replacing it.</div>}
            <input type="file" accept="image/*,.pdf" onChange={e => setEditSelectedFile(e.target.files[0])} className="glass-input" style={{ padding: '8px' }} />
          </div>

          <div className="fgroup">
            <label className="flabel">Description / Payee Notes</label>
            <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="glass-input" style={{ height: '70px', resize: 'vertical' }} />
          </div>

          <div className="fgroup">
            <label className="flabel">Date</label>
            <input type="date" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} className="glass-input" />
          </div>

          <div className="row" style={{ gap: '8px' }}>
            <button type="button" className="btn-ghost" onClick={closeEditModal} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
            <button type="submit" className="btn-stitch" disabled={submitting} style={{ flex: 1, justifyContent: 'center', background: '#FFB347' }}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ═══ PAYROLL PAYMENT SOURCE MODAL ═══ */}
      <Modal isOpen={sourceModal.isOpen} onClose={() => setSourceModal({ isOpen: false, id: null, account_id: '' })} title="Choose Payroll Payment Source">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{
            background: 'rgba(155,109,255,0.08)', border: '1px solid rgba(155,109,255,0.2)',
            borderRadius: '10px', padding: '10px 14px', fontSize: '11px', color: '#B896FF'
          }}>
            Select the actual cash, bank, or mobile wallet account for this payroll request. Accounting approval will deduct this source and reconciliation will pick it up after approval.
          </div>
          <div className="fgroup">
            <label className="flabel">Payment Source</label>
            <select value={sourceModal.account_id} onChange={e => setSourceModal({ ...sourceModal, account_id: e.target.value })} className="glass-input">
              <option value="">Select cash, bank, or mobile wallet</option>
              {liquidAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} ({String(acc.sub_type || 'cash').toUpperCase()}) · ৳{parseFloat(acc.balance || 0).toLocaleString()}</option>
              ))}
            </select>
          </div>
          <div className="row" style={{ gap: '8px' }}>
            <button className="btn-ghost" onClick={() => setSourceModal({ isOpen: false, id: null, account_id: '' })} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
            <button className="btn-stitch" onClick={handleSelectPaymentSource} disabled={!sourceModal.account_id} style={{ flex: 1, justifyContent: 'center', background: '#9B6DFF', opacity: sourceModal.account_id ? 1 : 0.5 }}>Confirm Source</button>
          </div>
        </div>
      </Modal>

      {/* ═══ REJECTION MODAL ═══ */}
      <Modal isOpen={rejectionModal.isOpen} onClose={() => setRejectionModal({ isOpen: false, id: null, reason: '' })} title="Reject Expense">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="fgroup">
            <label className="flabel">Rejection Reason</label>
            <textarea placeholder="Enter rejection reason..." value={rejectionModal.reason} onChange={e => setRejectionModal({...rejectionModal, reason: e.target.value})} className="glass-input" style={{ height: '100px', resize: 'vertical' }} />
          </div>
          <div className="row" style={{ gap: '8px' }}>
            <button className="btn-ghost" onClick={() => setRejectionModal({ isOpen: false, id: null, reason: '' })} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
            <button className="btn-stitch" onClick={handleReject} style={{ flex: 1, justifyContent: 'center', background: 'linear-gradient(135deg, #FF4D6D, #FF7088)' }}>Confirm Reject</button>
          </div>
        </div>
      </Modal>

      {/* ═══ DELETE MODAL ═══ */}
      <Modal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, id: null, reason: '', status: '' })} title="Delete Expense Entry">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {deleteModal.status === 'approved' && (
            <div style={{
              background: 'rgba(255,77,109,0.08)', border: '1px solid rgba(255,77,109,0.2)',
              borderRadius: '10px', padding: '10px 14px', fontSize: '11px', color: '#FF7088'
            }}>
              <AlertTriangle size={12} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
              This expense was approved. Deleting it will <strong>automatically reverse the journal entries</strong>.
            </div>
          )}
          <div className="fgroup">
            <label className="flabel">Deletion Reason *</label>
            <textarea required placeholder="Explain why this expense entry is being removed..." value={deleteModal.reason} onChange={e => setDeleteModal({...deleteModal, reason: e.target.value})} className="glass-input" style={{ height: '100px', resize: 'vertical' }} />
          </div>
          <div className="row" style={{ gap: '8px' }}>
            <button className="btn-ghost" onClick={() => setDeleteModal({ isOpen: false, id: null, reason: '', status: '' })} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
            <button className="btn-stitch" onClick={handleDelete} disabled={!deleteModal.reason.trim()} style={{ flex: 1, justifyContent: 'center', background: 'linear-gradient(135deg, #FF4D6D, #9B6DFF)', opacity: deleteModal.reason.trim() ? 1 : 0.5 }}>
              <Trash2 size={14} /> Delete {deleteModal.status === 'approved' ? '& Reverse' : 'Entry'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ExpenseManager;
