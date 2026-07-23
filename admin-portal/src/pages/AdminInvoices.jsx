import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, Tag, Book, Edit2, X, Save, Search, Download } from 'lucide-react';
import api from '../services/api';
import { downloadInvoicePdf } from '../utils/pdfUtils';
import '../styles/GlobalStyles.css';
import { useToast } from '../context/ToastContext';

const Invoices = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({});
  const [aging, setAging] = useState({ aging: [], totalReceivable: 0 });
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [activeTab, setActiveTab] = useState('invoices'); // invoices | categories | customers
  const [activeFilter, setActiveFilter] = useState('all');

  // Invoice modal
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceStep, setInvoiceStep] = useState(1);
  const [invoiceData, setInvoiceData] = useState({
    invoice_type: 'custom', income_category_id: '', customer_id: '',
    customer_name: '', customer_phone: '', customer_email: '', customer_company: '', customer_address: '',
    amount: '', due_date: '', notes: '', save_customer: false
  });

  // Edit invoice modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editInvoiceData, setEditInvoiceData] = useState({ id: null, amount: '', due_date: '', notes: '', income_category_id: '' });

  // Customer modal
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', email: '', company: '', address: '' });

  // Category modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryName, setCategoryName] = useState('');

  // Customer search & dropdown
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [invRes, statsRes, agingRes, catRes, custRes] = await Promise.all([
        api.get('/invoices'),
        api.get('/invoices/stats'),
        api.get('/invoices/aging'),
        api.get('/invoices/categories/flat').catch(() => ({ data: [] })),
        api.get('/invoices/customers').catch(() => ({ data: [] }))
      ]);
      setInvoices(invRes.data);
      setStats(statsRes.data);
      setAging(agingRes.data);
      setCategories(catRes.data || []);
      setCustomers(custRes.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // ── Customer CRUD
  const openCustomerModal = (cust = null) => {
    setEditingCustomer(cust);
    setCustomerForm(cust ? { name: cust.name, phone: cust.phone || '', email: cust.email || '', company: cust.company || '', address: cust.address || '' } : { name: '', phone: '', email: '', company: '', address: '' });
    setShowCustomerModal(true);
  };

  const saveCustomer = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await api.put(`/invoices/customers/${editingCustomer.id}`, customerForm);
      } else {
        await api.post('/invoices/customers', customerForm);
      }
      setShowCustomerModal(false);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const deleteCustomer = async (id) => {
    if (window.confirm('Remove this customer?')) {
      await api.delete(`/invoices/customers/${id}`);
      fetchAll();
    }
  };

  // ── Category CRUD
  const saveCategory = async (e) => {
    e.preventDefault();
    try {
      await api.post('/invoices/categories', { name: categoryName });
      setShowCategoryModal(false);
      setCategoryName('');
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create category'); }
  };

  const deleteCategory = async (id) => {
    if (window.confirm('Delete this category?')) {
      await api.delete(`/invoices/categories/${id}`);
      fetchAll();
    }
  };

  // ── Invoice
  const selectExistingCustomer = (cust) => {
    setInvoiceData({
      ...invoiceData,
      customer_id: cust.id,
      customer_name: cust.name,
      customer_phone: cust.phone || '',
      customer_email: cust.email || '',
      customer_company: cust.company || '',
      customer_address: cust.address || '',
      save_customer: false
    });
    setInvoiceStep(2);
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    try {
      await api.post('/invoices', invoiceData);
      setShowInvoiceModal(false);
      setInvoiceStep(1);
      setInvoiceData({ invoice_type: 'custom', income_category_id: '', customer_id: '', customer_name: '', customer_phone: '', customer_email: '', customer_company: '', customer_address: '', amount: '', due_date: '', notes: '', save_customer: false });
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create invoice'); }
  };

  // ── Edit Invoice
  const openEditModal = (inv) => {
    setEditInvoiceData({
      id: inv.id,
      amount: inv.amount,
      due_date: inv.due_date ? inv.due_date.split('T')[0] : '',
      notes: inv.notes || '',
      income_category_id: inv.income_category_id || ''
    });
    setShowEditModal(true);
  };

  const handleEditInvoice = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/invoices/${editInvoiceData.id}`, {
        amount: editInvoiceData.amount,
        due_date: editInvoiceData.due_date,
        notes: editInvoiceData.notes,
        income_category_id: editInvoiceData.income_category_id || undefined
      });
      setShowEditModal(false);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to update invoice'); }
  };

  const filteredInvoices = activeFilter === 'all' ? invoices : invoices.filter(inv => inv.status === activeFilter);
  const statusColor = (s) => ({ paid: '#10b981', pending: '#f59e0b', overdue: '#ef4444', partial: '#3b82f6', draft: '#64748b' }[s] || '#666');
  const filteredCustomers = customerSearch ? customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || (c.phone || '').includes(customerSearch)) : customers;

  if (loading) return <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={48} className="animate-spin" color="var(--primary)" /></div>;

  const inputStyle = { width: '100%', padding: '0.7rem 1rem', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '0.85rem', outline: 'none', transition: 'border 0.2s' };
  const labelStyle = { fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'block' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Finance &gt; Billing & Invoices</p>
          <h2 style={{ fontSize: '1.5rem', marginTop: '0.3rem' }}>Billing Center</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Manage student tuitions and custom incomes</p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          {['invoices', 'categories', 'customers'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer',
              background: activeTab === tab ? 'var(--primary)' : 'transparent', color: activeTab === tab ? '#000' : 'var(--text-dim)'
            }}>
              {tab === 'invoices' ? 'Invoices' : tab === 'categories' ? 'Income Types' : 'Customers'}
            </button>
          ))}
          <button onClick={() => { setShowInvoiceModal(true); setInvoiceStep(1); }} className="btn-primary" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={16} /> Create Invoice
          </button>
        </div>
      </div>

      {/* ════════ INVOICES TAB ════════ */}
      {activeTab === 'invoices' && (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {[
              { label: 'TOTAL INVOICED', value: stats.totalInvoiced, sub: `${stats.totalCount || 0} invoices`, color: '#06b6d4' },
              { label: 'COLLECTED', value: stats.totalPaid, sub: `${stats.collectionRate || 0}% rate`, color: '#10b981' },
              { label: 'PENDING', value: stats.pendingAmount, sub: `${stats.pendingCount || 0} invoices`, color: '#f59e0b' },
              { label: 'OVERDUE', value: stats.overdueAmount, sub: `${stats.overdueCount || 0} invoices`, color: '#ef4444' }
            ].map((card, i) => (
              <div key={i} className="glass-morphism" style={{ padding: '1.2rem', borderTop: `3px solid ${card.color}` }}>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{card.label}</p>
                <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: card.color }}>৳{(card.value || 0).toLocaleString()}</h3>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Filter + List */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
            <div className="glass-morphism" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {['all', 'paid', 'pending', 'overdue', 'partial'].map(f => (
                  <button key={f} onClick={() => setActiveFilter(f)} style={{
                    padding: '0.45rem 0.9rem', borderRadius: '8px', border: 'none', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer',
                    background: activeFilter === f ? 'var(--primary)' : 'var(--glass)', color: activeFilter === f ? '#000' : 'var(--text-dim)'
                  }}>
                    {f.charAt(0).toUpperCase() + f.slice(1)} ({f === 'all' ? invoices.length : invoices.filter(i => i.status === f).length})
                  </button>
                ))}
              </div>

              {filteredInvoices.length === 0 ? (
                <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>No invoices found.</p>
              ) : filteredInvoices.map((inv, i) => (
                <div key={i} className="glass-morphism" style={{ padding: '1.1rem', marginBottom: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ padding: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px' }}>
                      {inv.invoice_type === 'custom' ? <Tag size={20} color="#06b6d4" /> : <Book size={20} color="#8b5cf6" />}
                    </div>
                    <div>
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: '600' }}>{inv.invoice_no}</p>
                      <p style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                        {inv.invoice_type === 'custom' ? `${inv.customer_name || 'Customer'}${inv.customer_company ? ` · ${inv.customer_company}` : ''}` : inv.Student?.User?.name || 'Student'}
                      </p>
                      <p style={{ fontSize: '0.73rem', color: 'var(--text-dim)' }}>
                        {inv.invoice_type === 'custom' ? `${inv.IncomeCategory?.name || 'Revenue'}` : `Tuition: ${inv.Enrollment?.Batch?.Course?.title || 'Course'}`}
                        {' · Due '}{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                    <p style={{ fontSize: '1.15rem', fontWeight: '800' }}>৳{parseFloat(inv.amount).toLocaleString()}</p>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.63rem', fontWeight: '700', background: `${statusColor(inv.status)}20`, color: statusColor(inv.status), textTransform: 'capitalize' }}>{inv.status}</span>
                      <button onClick={() => downloadInvoicePdf(inv)} style={{ padding: '3px 10px', fontSize: '0.68rem', borderRadius: '6px', background: 'rgba(0,55,104,0.1)', color: '#003768', border: '1px solid rgba(0,55,104,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}><Download size={12} /> Export</button>
                      {inv.status !== 'paid' && (
                        <button onClick={() => openEditModal(inv)} style={{ padding: '3px 10px', fontSize: '0.68rem', borderRadius: '6px', background: 'rgba(27,189,241,0.1)', color: '#1bbdf1', border: '1px solid rgba(27,189,241,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}><Edit2 size={12} /> Edit</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Aging */}
            <div className="glass-morphism" style={{ padding: '1.5rem', alignSelf: 'start' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>Aging Analysis</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {aging.aging?.map((range, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', background: 'var(--glass)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.82rem', color: i === 0 ? '#10b981' : i === 3 ? '#ef4444' : 'var(--text)' }}>{range.label}</span>
                    <span style={{ fontWeight: '700', color: i === 0 ? '#10b981' : i === 3 ? '#ef4444' : 'var(--text)' }}>৳{range.amount.toLocaleString()}</span>
                  </div>
                ))}
                <div style={{ padding: '1rem', background: 'rgba(6,182,212,0.1)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', border: '1px solid rgba(6,182,212,0.3)' }}>
                  <span style={{ fontWeight: '600' }}>Total Receivable</span>
                  <span style={{ fontWeight: '800', color: '#06b6d4' }}>৳{(aging.totalReceivable || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ════════ INCOME CATEGORIES TAB ════════ */}
      {activeTab === 'categories' && (
        <div className="glass-morphism" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.2rem' }}>Income Categories</h3>
            <button onClick={() => { setCategoryName(''); setShowCategoryModal(true); }} className="btn-primary" style={{ fontSize: '0.8rem' }}>+ Add Category</button>
          </div>
          <div style={{ display: 'grid', gap: '0.8rem' }}>
            {categories.map(cat => (
              <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--glass)', borderRadius: '10px' }}>
                <div>
                  <h4 style={{ fontSize: '1rem', margin: 0 }}>{cat.name}</h4>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0 }}>ID #{cat.id}</p>
                </div>
                <button onClick={() => deleteCategory(cat.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={18} /></button>
              </div>
            ))}
            {categories.length === 0 && <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '2rem' }}>No income categories. Create one to start issuing custom invoices.</p>}
          </div>
        </div>
      )}

      {/* ════════ CUSTOMERS TAB ════════ */}
      {activeTab === 'customers' && (
        <div className="glass-morphism" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem' }}>Saved Customers</h3>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input placeholder="Search customers..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} style={{ ...inputStyle, paddingLeft: '2rem', width: '220px' }} />
              </div>
              <button onClick={() => openCustomerModal()} className="btn-primary" style={{ fontSize: '0.8rem' }}>+ Add Customer</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {filteredCustomers.map(cust => (
              <div key={cust.id} className="glass-morphism" style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem' }}>{cust.name}</h4>
                  {cust.company && <p style={{ fontSize: '0.78rem', color: 'var(--primary)', margin: '2px 0' }}>{cust.company}</p>}
                  {cust.phone && <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0 }}>📱 {cust.phone}</p>}
                  {cust.email && <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0 }}>✉ {cust.email}</p>}
                  {cust.address && <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: '4px 0 0', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cust.address}</p>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button onClick={() => openCustomerModal(cust)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}><Edit2 size={16} /></button>
                  <button onClick={() => deleteCustomer(cust.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
            {filteredCustomers.length === 0 && <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '2rem', gridColumn: '1/-1' }}>No customers saved. They can be added here or while creating an invoice.</p>}
          </div>
        </div>
      )}

      {/* ═══════════════ CREATE INVOICE MODAL ═══════════════ */}
      {showInvoiceModal && (
        <div className="modal-overlay">
          <div className="glass-morphism" style={{ width: '520px', maxHeight: '85vh', overflowY: 'auto', padding: '0', borderRadius: '16px' }}>
            {/* Modal Header */}
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Create Custom Invoice</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: '4px 0 0' }}>Step {invoiceStep} of 2</p>
              </div>
              <button onClick={() => setShowInvoiceModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {/* Step Bar */}
            <div style={{ padding: '0 2rem', marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              <div style={{ flex: 1, height: '3px', borderRadius: '3px', background: 'var(--primary)' }}></div>
              <div style={{ flex: 1, height: '3px', borderRadius: '3px', background: invoiceStep >= 2 ? 'var(--primary)' : 'var(--border)' }}></div>
            </div>

            <div style={{ padding: '1.5rem 2rem 2rem' }}>
              {/* ── STEP 1: Select / Create Customer ── */}
              {invoiceStep === 1 && (
                <div>
                  <p style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '1rem' }}>Select or add a customer</p>

                  {/* Searchable Customer Dropdown */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={labelStyle}>Select Existing Customer</label>
                    <div style={{ position: 'relative' }}>
                      {/* Selected customer display / Search input */}
                      {invoiceData.customer_id ? (
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '0.7rem 0.9rem', borderRadius: '8px', border: '1px solid var(--primary)',
                          background: 'rgba(27,189,241,0.08)', cursor: 'pointer'
                        }} onClick={() => { setCustomerDropdownOpen(!customerDropdownOpen); setCustomerSearch(''); }}>
                          <div>
                            <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{invoiceData.customer_name}</span>
                            {invoiceData.customer_company && <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginLeft: '6px' }}>· {invoiceData.customer_company}</span>}
                            {invoiceData.customer_phone && <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>{invoiceData.customer_phone}</div>}
                          </div>
                          <button type="button" onClick={(e) => {
                            e.stopPropagation();
                            setInvoiceData({ ...invoiceData, customer_id: '', customer_name: '', customer_phone: '', customer_email: '', customer_company: '', customer_address: '' });
                            setCustomerDropdownOpen(false);
                          }} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '2px' }}><X size={16} /></button>
                        </div>
                      ) : (
                        <div style={{ position: 'relative' }}>
                          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                          <input
                            style={{ ...inputStyle, paddingLeft: '32px' }}
                            placeholder="Search customers by name or phone..."
                            value={customerSearch}
                            onChange={e => { setCustomerSearch(e.target.value); setCustomerDropdownOpen(true); }}
                            onFocus={() => setCustomerDropdownOpen(true)}
                          />
                        </div>
                      )}

                      {/* Dropdown results */}
                      {customerDropdownOpen && !invoiceData.customer_id && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                          background: 'var(--bg-card, #1e293b)', border: '1px solid var(--border)',
                          borderRadius: '0 0 8px 8px', maxHeight: '200px', overflowY: 'auto',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                        }}>
                          {customers.filter(c =>
                            !customerSearch ||
                            c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                            (c.phone || '').includes(customerSearch)
                          ).length === 0 ? (
                            <div style={{ padding: '0.8rem 1rem', fontSize: '0.8rem', color: 'var(--text-dim)', textAlign: 'center' }}>No customers found</div>
                          ) : (
                            customers.filter(c =>
                              !customerSearch ||
                              c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                              (c.phone || '').includes(customerSearch)
                            ).map(c => (
                              <div key={c.id} onClick={() => {
                                selectExistingCustomer(c);
                                setCustomerDropdownOpen(false);
                                setCustomerSearch('');
                              }} style={{
                                padding: '0.6rem 1rem', cursor: 'pointer',
                                borderBottom: '1px solid var(--border)',
                                transition: 'background 0.15s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(27,189,241,0.1)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              >
                                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.name} {c.company ? <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>· {c.company}</span> : ''}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{c.phone || ''} {c.email ? `· ${c.email}` : ''}</div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1rem 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>OR ENTER NEW</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                  </div>

                  {/* New customer fields */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                      <div>
                        <label style={labelStyle}>Full Name *</label>
                        <input style={inputStyle} required placeholder="e.g. Farhan Ahmed" value={invoiceData.customer_name} onChange={e => setInvoiceData({ ...invoiceData, customer_name: e.target.value, customer_id: '' })} />
                      </div>
                      <div>
                        <label style={labelStyle}>Phone</label>
                        <input style={inputStyle} placeholder="+880 1XXXXXXXXX" value={invoiceData.customer_phone} onChange={e => setInvoiceData({ ...invoiceData, customer_phone: e.target.value })} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                      <div>
                        <label style={labelStyle}>Email</label>
                        <input style={inputStyle} type="email" placeholder="customer@email.com" value={invoiceData.customer_email} onChange={e => setInvoiceData({ ...invoiceData, customer_email: e.target.value })} />
                      </div>
                      <div>
                        <label style={labelStyle}>Company Name</label>
                        <input style={inputStyle} placeholder="Optional" value={invoiceData.customer_company} onChange={e => setInvoiceData({ ...invoiceData, customer_company: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Address</label>
                      <input style={inputStyle} placeholder="Street, City" value={invoiceData.customer_address} onChange={e => setInvoiceData({ ...invoiceData, customer_address: e.target.value })} />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-dim)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={invoiceData.save_customer} onChange={e => setInvoiceData({ ...invoiceData, save_customer: e.target.checked })} />
                      Save this customer for future invoices
                    </label>
                  </div>

                  <button onClick={() => { if (invoiceData.customer_name || invoiceData.customer_id) setInvoiceStep(2); else toast.info('Please select or enter a customer name'); }}
                    className="btn-primary" style={{ width: '100%', marginTop: '1.5rem', padding: '0.8rem' }}>
                    Continue to Invoice Details →
                  </button>
                </div>
              )}

              {/* ── STEP 2: Invoice Details ── */}
              {invoiceStep === 2 && (
                <form onSubmit={handleCreateInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ padding: '0.8rem', background: 'rgba(27,189,241,0.08)', borderRadius: '8px', border: '1px solid rgba(27,189,241,0.2)' }}>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0 }}>BILLING TO</p>
                    <p style={{ fontWeight: '700', margin: '2px 0 0', fontSize: '0.95rem' }}>{invoiceData.customer_name}{invoiceData.customer_company ? ` · ${invoiceData.customer_company}` : ''}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0 }}>{[invoiceData.customer_phone, invoiceData.customer_email].filter(Boolean).join(' · ')}</p>
                  </div>

                  <div>
                    <label style={labelStyle}>Income Category *</label>
                    <select style={inputStyle} required value={invoiceData.income_category_id} onChange={e => setInvoiceData({ ...invoiceData, income_category_id: e.target.value })}>
                      <option value="">-- Select Category --</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                    <div>
                      <label style={labelStyle}>Amount (৳) *</label>
                      <input type="number" style={inputStyle} required placeholder="0.00" value={invoiceData.amount} onChange={e => setInvoiceData({ ...invoiceData, amount: e.target.value })} />
                    </div>
                    <div>
                      <label style={labelStyle}>Due Date *</label>
                      <input type="date" style={inputStyle} required value={invoiceData.due_date} onChange={e => setInvoiceData({ ...invoiceData, due_date: e.target.value })} />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Notes / Description</label>
                    <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} placeholder="What is this invoice for?" value={invoiceData.notes} onChange={e => setInvoiceData({ ...invoiceData, notes: e.target.value })}></textarea>
                  </div>

                  <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
                    <button type="button" onClick={() => setInvoiceStep(1)} className="btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>← Back</button>
                    <button type="submit" className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}><Save size={16} /> Generate Invoice</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ EDIT INVOICE MODAL ═══════════════ */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="glass-morphism" style={{ width: '440px', padding: '2rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem' }}>Edit Invoice</h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleEditInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>
                  <label style={labelStyle}>Amount (৳) *</label>
                  <input type="number" style={inputStyle} required value={editInvoiceData.amount} onChange={e => setEditInvoiceData({ ...editInvoiceData, amount: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Due Date *</label>
                  <input type="date" style={inputStyle} required value={editInvoiceData.due_date} onChange={e => setEditInvoiceData({ ...editInvoiceData, due_date: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Income Category</label>
                <select style={inputStyle} value={editInvoiceData.income_category_id} onChange={e => setEditInvoiceData({ ...editInvoiceData, income_category_id: e.target.value })}>
                  <option value="">-- Select Category --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Notes / Description</label>
                <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={editInvoiceData.notes} onChange={e => setEditInvoiceData({ ...editInvoiceData, notes: e.target.value })}></textarea>
              </div>
              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}><Save size={16} /> Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════ CUSTOMER MODAL ═══════════════ */}
      {showCustomerModal && (
        <div className="modal-overlay">
          <div className="glass-morphism" style={{ width: '440px', padding: '2rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem' }}>{editingCustomer ? 'Edit Customer' : 'Add Customer'}</h3>
              <button onClick={() => setShowCustomerModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={saveCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div><label style={labelStyle}>Full Name *</label><input style={inputStyle} required value={customerForm.name} onChange={e => setCustomerForm({ ...customerForm, name: e.target.value })} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div><label style={labelStyle}>Phone</label><input style={inputStyle} value={customerForm.phone} onChange={e => setCustomerForm({ ...customerForm, phone: e.target.value })} /></div>
                <div><label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={customerForm.email} onChange={e => setCustomerForm({ ...customerForm, email: e.target.value })} /></div>
              </div>
              <div><label style={labelStyle}>Company</label><input style={inputStyle} value={customerForm.company} onChange={e => setCustomerForm({ ...customerForm, company: e.target.value })} /></div>
              <div><label style={labelStyle}>Address</label><input style={inputStyle} value={customerForm.address} onChange={e => setCustomerForm({ ...customerForm, address: e.target.value })} /></div>
              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowCustomerModal(false)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>{editingCustomer ? 'Update' : 'Save Customer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════ CATEGORY MODAL ═══════════════ */}
      {showCategoryModal && (
        <div className="modal-overlay">
          <div className="glass-morphism" style={{ width: '380px', padding: '2rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem' }}>Add Income Category</h3>
              <button onClick={() => setShowCategoryModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={saveCategory} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div><label style={labelStyle}>Category Name *</label><input style={inputStyle} required placeholder="e.g. Consultation Fee" value={categoryName} onChange={e => setCategoryName(e.target.value)} /></div>
              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <button type="button" onClick={() => setShowCategoryModal(false)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Invoices;
