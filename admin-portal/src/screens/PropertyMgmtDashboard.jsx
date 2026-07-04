import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { KeyRound, Wallet, AlertTriangle, Home, ArrowRight, Check, X, CreditCard, ChevronLeft, FileCheck2, Users, ListChecks } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { PageHead, StatCard, Button, Spinner, Drawer, Field, Input, Select, Textarea, SearchInput, Badge, StatusBadge } from '../ui/kit';
import { useToast } from '../context/ToastContext';
import { EnquiryBoard } from './RentalEnquiries';
import ActionCenter from './ActionCenter';

const money = (v) => 'BDT ' + Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PropertyMgmtDashboard() {
  const nav = useNavigate();
  const toast = useToast();
  
  // Dashboard stats and data
  const [loading, setLoading] = useState(true);
  const [s, setS] = useState({ active: 0, total: 0, rent: 0, arrears: 0 });
  const [tenancies, setTenancies] = useState([]);
  const [appCounts, setAppCounts] = useState({});
  const [pendingWos, setPendingWos] = useState([]);
  const [upcomingRenewals, setUpcomingRenewals] = useState([]);
  
  // Filters & grid states
  const [search, setSearch] = useState('');
  const [arrearsOnly, setArrearsOnly] = useState(false);
  
  // Drawers states
  const [showPaymentDrawer, setShowPaymentDrawer] = useState(false);
  const [showBulkDrawer, setShowBulkDrawer] = useState(false);
  
  // Bulk Invoices form
  const [bulkPeriod, setBulkPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [bulkLoading, setBulkLoading] = useState(false);
  
  // Payment collection drawer states
  const [selectedTenancy, setSelectedTenancy] = useState(null);
  const [unpaidInvoices, setUnpaidInvoices] = useState([]);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'cash',
    reference: '',
    notes: '',
    paidAt: new Date().toISOString().split('T')[0]
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/tenancies?limit=500');
      const rows = data.data || [];
      setTenancies(rows);
      setS({
        total: rows.length,
        active: rows.filter((r) => r.status === 'active').length,
        rent: rows.reduce((a, r) => a + Number(r.monthly_rent || 0), 0),
        arrears: rows.reduce((a, r) => a + Number(r.outstanding || 0), 0),
      });
      try {
        const { data: appData } = await api.get('/tenant-applications?include_counts=true&limit=1');
        setAppCounts(appData.status_counts || {});
      } catch { /* applications module optional */ }
      try {
        const { data: ac } = await api.get('/property-management/action-center');
        setPendingWos((ac.cohorts?.work_orders_overdue?.top || []).slice(0, 5));
        // Merge 30d + 60d expiring leases (chronological) for the renewals card
        const exp30 = ac.cohorts?.leases_expiring_30d?.top || [];
        const exp60 = ac.cohorts?.leases_expiring_60d?.top || [];
        const merged = [...exp30, ...exp60]
          .sort((a, b) => (a.days_remaining || 0) - (b.days_remaining || 0))
          .slice(0, 5);
        setUpcomingRenewals(merged);
      } catch { /* command centre optional */ }
    } catch (e) {
      toast.error('Failed to load tenancies');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load unpaid invoices for a specific tenancy
  const loadUnpaidInvoices = async (tenancy) => {
    setInvoicesLoading(true);
    setUnpaidInvoices([]);
    setSelectedInvoices([]);
    try {
      const { data } = await api.get(`/invoices?kind=client&tenancy_id=${tenancy.id}`);
      const unpaid = (data.data || []).filter(
        (inv) => inv.status !== 'paid' && inv.status !== 'cancelled' && inv.status !== 'refunded'
      );
      setUnpaidInvoices(unpaid);
      const defaultSelected = unpaid.map(inv => inv.id);
      setSelectedInvoices(defaultSelected);
      const totalDue = unpaid.reduce((sum, inv) => sum + Number(inv.balance || 0), 0);
      setPaymentForm(form => ({ ...form, amount: totalDue > 0 ? String(totalDue) : '' }));
    } catch (err) {
      toast.error("Failed to load unpaid invoices.");
    } finally {
      setInvoicesLoading(false);
    }
  };

  // Select tenancy to collect rent
  const handleSelectTenancy = (tenancy) => {
    setSelectedTenancy(tenancy);
    loadUnpaidInvoices(tenancy);
    setShowPaymentDrawer(true);
  };

  // Helper to raise this month's rent invoice for a single tenancy
  const handleSingleRaiseInvoice = async (tenancyId) => {
    try {
      const { data } = await api.post(`/tenancies/${tenancyId}/raise-invoice`, {});
      toast.success(data.message || 'Rent invoice raised successfully');
      if (selectedTenancy && selectedTenancy.id === tenancyId) {
        await loadUnpaidInvoices(selectedTenancy);
      }
      await loadData();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to raise invoice');
    }
  };

  // Trigger Bulk Invoices
  const handleBulkRaiseInvoices = async () => {
    setBulkLoading(true);
    try {
      const { data } = await api.post('/tenancies/bulk-raise-invoices', { period_label: bulkPeriod });
      toast.success(data.message || 'Bulk invoices raised successfully');
      setShowBulkDrawer(false);
      await loadData();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to raise bulk invoices');
    } finally {
      setBulkLoading(false);
    }
  };

  // FIFO Allocation calculations
  const allocatedInvoices = useMemo(() => {
    if (!unpaidInvoices || !unpaidInvoices.length) return [];
    const selectedList = unpaidInvoices.filter(inv => selectedInvoices.includes(inv.id));
    let remaining = Number(paymentForm.amount || 0);

    const sorted = [...selectedList].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

    return unpaidInvoices.map(inv => {
      const isSelected = selectedInvoices.includes(inv.id);
      if (!isSelected) {
        return { ...inv, allocated: 0, newBalance: Number(inv.balance) };
      }
      // find in sorted
      const itemInSorted = sorted.find(s => s.id === inv.id);
      if (!itemInSorted) {
        return { ...inv, allocated: 0, newBalance: Number(inv.balance) };
      }
      
      // Calculate FIFO in order
      let allocated = 0;
      let tempRemaining = Number(paymentForm.amount || 0);
      for (const s of sorted) {
        const dueAmount = Number(s.balance || 0);
        const currentAlloc = Math.min(dueAmount, tempRemaining);
        tempRemaining -= currentAlloc;
        if (s.id === inv.id) {
          allocated = currentAlloc;
          break;
        }
      }

      return {
        ...inv,
        allocated,
        newBalance: Number(inv.balance) - allocated
      };
    });
  }, [unpaidInvoices, selectedInvoices, paymentForm.amount]);

  // Record sequential payments (FIFO)
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const amountVal = Number(paymentForm.amount);
    if (!amountVal || amountVal <= 0) {
      toast.error("Please enter a valid payment amount.");
      return;
    }

    const selectedList = unpaidInvoices.filter(inv => selectedInvoices.includes(inv.id));
    if (!selectedList.length) {
      toast.error("Please select at least one invoice to pay.");
      return;
    }

    setIsRecordingPayment(true);
    try {
      let remaining = amountVal;
      const sorted = [...selectedList].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

      for (const inv of sorted) {
        if (remaining <= 0) break;
        const due = Number(inv.balance || 0);
        const allocated = Math.min(due, remaining);
        if (allocated <= 0) continue;

        await api.post(`/invoices/${inv.id}/payments`, {
          amount: allocated,
          method: paymentForm.method,
          reference: paymentForm.reference,
          notes: paymentForm.notes || `Allocated from bulk payment to ${selectedTenancy.tenant?.full_name}`,
          paid_at: paymentForm.paidAt
        });

        remaining -= allocated;
      }

      toast.success("Payment recorded successfully!");
      await loadData();
      setSelectedTenancy(null);
      setUnpaidInvoices([]);
      setPaymentForm({
        amount: '',
        method: 'cash',
        reference: '',
        notes: '',
        paidAt: new Date().toISOString().split('T')[0]
      });
      setShowPaymentDrawer(false);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to record payment.");
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const handleToggleInvoice = (invId) => {
    setSelectedInvoices(prev => {
      const next = prev.includes(invId) ? prev.filter(id => id !== invId) : [...prev, invId];
      const selectedList = unpaidInvoices.filter(inv => next.includes(inv.id));
      const totalDue = selectedList.reduce((sum, inv) => sum + Number(inv.balance || 0), 0);
      setPaymentForm(form => ({ ...form, amount: totalDue > 0 ? String(totalDue) : '' }));
      return next;
    });
  };

  const handleSelectAllInvoices = () => {
    if (selectedInvoices.length === unpaidInvoices.length) {
      setSelectedInvoices([]);
      setPaymentForm(form => ({ ...form, amount: '' }));
    } else {
      const allIds = unpaidInvoices.map(inv => inv.id);
      setSelectedInvoices(allIds);
      const totalDue = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.balance || 0), 0);
      setPaymentForm(form => ({ ...form, amount: String(totalDue) }));
    }
  };

  // Filter tenancies for the table
  const filteredTenancies = useMemo(() => {
    return tenancies.filter(t => {
      const matchesSearch = !search || 
        t.tenant?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        t.Property?.title?.toLowerCase().includes(search.toLowerCase()) ||
        t.tenancy_code?.toLowerCase().includes(search.toLowerCase());
      
      const matchesArrears = !arrearsOnly || Number(t.outstanding || 0) > 0;
      
      return matchesSearch && matchesArrears;
    });
  }, [tenancies, search, arrearsOnly]);

  if (loading) return <div style={{ padding: 48 }}><Spinner /></div>;

  return (
    <>
      <PageHead 
        title="Property Management" 
        desc="Rental portfolio overview — occupancy, monthly rent roll and arrears."
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <Button icon={Wallet} variant="secondary" onClick={() => { setShowPaymentDrawer(true); setSelectedTenancy(null); }}>Receive Payments</Button>
            <Button icon={KeyRound} variant="secondary" onClick={() => setShowBulkDrawer(true)}>Bulk Invoices</Button>
            <Button icon={ListChecks} variant="secondary" onClick={() => nav('/property-management/rentals?detailTab=onboarding')}>Onboarding</Button>
            <Button icon={ArrowRight} onClick={() => nav('/property-management/rentals')}>View Rentals</Button>
          </div>
        } 
      />

      <ActionCenter />

      <div className="grid grid-4">
        <StatCard icon={KeyRound} label="Active tenancies" value={s.active} tone="green" />
        <StatCard icon={Home} label="Total managed" value={s.total} tone="blue" />
        <StatCard icon={Wallet} label="Monthly rent roll" value={money(s.rent)} tone="sky" />
        <StatCard icon={AlertTriangle} label="Arrears outstanding" value={money(s.arrears)} tone={s.arrears > 0 ? 'red' : 'green'} />
      </div>

      {/* Tenancy & Arrears Grid */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-head" style={{ flexWrap: 'wrap', gap: 12 }}>
          <h3>Tenancy Arrears & Rent roll</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tenant, property..." />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
              <input type="checkbox" checked={arrearsOnly} onChange={(e) => setArrearsOnly(e.target.checked)} style={{ width: 15, height: 15 }} />
              Arrears Only
            </label>
          </div>
        </div>
        
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Property</th>
                <th>Monthly Rent</th>
                <th>Service Charge</th>
                <th>Arrears Outstanding</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenancies.length ? filteredTenancies.map(t => (
                <tr key={t.id} onClick={() => handleSelectTenancy(t)}>
                  <td>
                    <div className="cell-strong">{t.tenant?.full_name || '—'}</div>
                    <div className="cell-sub">{t.tenant?.primary_phone || '—'}</div>
                  </td>
                  <td>
                    <div className="cell-strong">{t.Property?.title || '—'}</div>
                    <div className="cell-sub">{t.tenancy_code}</div>
                  </td>
                  <td className="cell-strong">{money(t.monthly_rent)}</td>
                  <td>{money(t.service_charge)}</td>
                  <td>
                    {Number(t.outstanding || 0) > 0 ? (
                      <Badge tone="red" dot>{money(t.outstanding)}</Badge>
                    ) : (
                      <Badge tone="green" dot>Clear</Badge>
                    )}
                  </td>
                  <td><StatusBadge status={t.status} /></td>
                  <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <Button size="sm" variant="ghost" onClick={() => handleSelectTenancy(t)}>
                        Collect
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleSingleRaiseInvoice(t.id)} title="Raise invoice for this month">
                        Raise Invoice
                      </Button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: 36, color: 'var(--muted)' }}>
                    No matching tenancy records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tenant Applications summary */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-head">
          <h3>Tenant Applications</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" variant="ghost" icon={FileCheck2} onClick={() => nav('/property-management/applications')}>View all</Button>
          </div>
        </div>
        <div className="card-pad" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: 16 }}>
          {[
            { key: 'submitted', label: 'Submitted', tone: 'blue' },
            { key: 'screening', label: 'Screening', tone: 'amber' },
            { key: 'verification', label: 'Verification', tone: 'amber' },
            { key: 'awaiting_owner_approval', label: 'Owner Approval', tone: 'amber' },
            { key: 'approved', label: 'Approved', tone: 'green' },
            { key: 'converted', label: 'Converted', tone: 'green' },
          ].map((b) => (
            <div key={b.key} onClick={() => nav('/property-management/applications')} style={{ cursor: 'pointer', minWidth: 130, flex: '1 1 130px', padding: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{appCounts[b.key] || 0}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}><Badge tone={b.tone} dot>{b.label}</Badge></div>
            </div>
          ))}
        </div>
      </div>

      {/* Enquiries Kanban pipeline */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-head">
          <h3>Tenant Enquiries Pipeline</h3>
          <Button size="sm" variant="ghost" icon={Users} onClick={() => nav('/property-management/enquiries')}>Open full board</Button>
        </div>
        <div className="card-pad" style={{ padding: 14 }}>
          <EnquiryBoard compact />
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-head"><h3>Quick links</h3></div>
        <div className="card-pad" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="ghost" onClick={() => nav('/property-management/rentals')}>Rentals list</Button>
          <Button variant="ghost" onClick={() => nav('/property-management/applications')}>Tenant Applications</Button>
          <Button variant="ghost" onClick={() => nav('/property-management/rentals?detailTab=onboarding')}>Onboarding & Workflow</Button>
          <Button variant="ghost" onClick={() => nav('/property-management/enquiries')}>Rental Enquiries</Button>
          <Button variant="ghost" onClick={() => nav('/property-management/assessments')}>Rental Assessments</Button>
          <Button variant="ghost" onClick={() => nav('/invoices')}>Tenant Invoices</Button>
          <Button variant="ghost" onClick={() => nav('/rental-receipts')}>Rental Receipts</Button>
          <Button variant="ghost" onClick={() => nav('/landlord-bills')}>Landlord Bills</Button>
          <Button variant="ghost" onClick={() => nav('/folios')}>Folios</Button>
          <Button variant="ghost" onClick={() => nav('/work-orders')}>Work Orders</Button>
          <Button variant="ghost" onClick={() => nav('/inspections')}>Inspections</Button>
        </div>
      </div>

      {/* Additional Dashboard Content — live data, no more hardcoded rows */}
      <div className="grid grid-2" style={{ marginTop: 20 }}>
        {/* Pending Maintenance — real overdue work orders */}
        <div className="card">
          <div className="card-head">
            <h3>Pending Maintenance</h3>
            <Badge tone={pendingWos.length ? 'red' : 'green'}>{pendingWos.length} Overdue</Badge>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {pendingWos.length ? pendingWos.map((wo) => (
              <div key={wo.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{wo.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{wo.property_title || '—'} · {wo.days_overdue}d overdue</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => nav('/work-orders')}>Open</Button>
              </div>
            )) : (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                No overdue work orders — nice.
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Lease Renewals — real leases expiring in 60 days */}
        <div className="card">
          <div className="card-head">
            <h3>Upcoming Renewals</h3>
            <Badge tone={upcomingRenewals.length ? 'amber' : 'green'}>Next 60 Days</Badge>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {upcomingRenewals.length ? upcomingRenewals.map((rn) => (
              <div key={rn.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rn.tenant_name || '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{rn.property_title || '—'}</div>
                </div>
                <div style={{ fontSize: 12, color: rn.days_remaining <= 30 ? 'var(--danger)' : 'var(--warning)', fontWeight: 600 }}>
                  {rn.days_remaining}d left
                </div>
              </div>
            )) : (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                No leases expiring in the next 60 days.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── BULK INVOICES DIALOG ── */}
      {showBulkDrawer && (
        <Drawer 
          title="Raise Bulk Rent Invoices" 
          onClose={() => setShowBulkDrawer(false)}
          width={420}
          footer={
            <>
              <Button variant="ghost" onClick={() => setShowBulkDrawer(false)}>Cancel</Button>
              <Button onClick={handleBulkRaiseInvoices} disabled={bulkLoading}>
                {bulkLoading ? <Spinner /> : "Raise Invoices"}
              </Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
              This will automatically raise rent and service charge invoices for all active tenancies for the selected period.
            </p>
            <Field label="Billing Month (YYYY-MM)" required>
              <Input type="month" value={bulkPeriod} onChange={(e) => setBulkPeriod(e.target.value)} />
            </Field>
          </div>
        </Drawer>
      )}

      {/* ── RECEIVE PAYMENTS / RENT COLLECTION DRAWER ── */}
      {showPaymentDrawer && (
        <Drawer 
          title="Global Rent Collection" 
          onClose={() => setShowPaymentDrawer(false)} 
          width={640}
        >
          {!selectedTenancy ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ marginBottom: 8 }}>
                <SearchInput 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                  placeholder="Filter tenants..." 
                />
              </div>
              <div className="form-section-title">Select Tenant to Record Payment</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '60vh', overflowY: 'auto' }}>
                {tenancies.filter(t => !search || t.tenant?.full_name?.toLowerCase().includes(search.toLowerCase()) || t.Property?.title?.toLowerCase().includes(search.toLowerCase())).map(t => {
                  const hasArrears = Number(t.outstanding || 0) > 0;
                  return (
                    <div 
                      key={t.id} 
                      className="nav-item" 
                      style={{ 
                        margin: 0, 
                        padding: '12px 16px', 
                        background: 'var(--surface-2)', 
                        border: '1px solid var(--border)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{t.tenant?.full_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                          {t.Property?.title} · Rent: {money(t.monthly_rent)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {hasArrears ? (
                          <Badge tone="red">{money(t.outstanding)} Due</Badge>
                        ) : (
                          <Badge tone="green">Paid Up</Badge>
                        )}
                        <Button size="sm" onClick={() => handleSelectTenancy(t)}>Collect</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Back Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--primary)', fontWeight: 600, fontSize: 13, marginBottom: 4 }} onClick={() => setSelectedTenancy(null)}>
                <ChevronLeft size={16} /> Back to Tenants List
              </div>

              {/* Tenancy Overview */}
              <div className="card" style={{ background: 'var(--primary-50)', borderColor: 'var(--primary-100)', padding: 14 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--primary-700)' }}>{selectedTenancy.tenant?.full_name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>
                  <strong>Property:</strong> {selectedTenancy.Property?.title}
                </div>
                <div style={{ display: 'flex', gap: 20, marginTop: 8, fontSize: 13 }}>
                  <div><strong>Rent:</strong> {money(selectedTenancy.monthly_rent)}/mo</div>
                  <div><strong>Service Charge:</strong> {money(selectedTenancy.service_charge)}/mo</div>
                  <div><strong>Current Arrears:</strong> <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{money(selectedTenancy.outstanding)}</span></div>
                </div>
              </div>

              <div className="form-section-title">Due Invoices & Statements</div>

              {/* Invoices List */}
              {invoicesLoading ? <div style={{ padding: 16, textAlign: 'center' }}><Spinner /></div> : (
                <>
                  {unpaidInvoices.length ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 10, maxHeight: 180, overflowY: 'auto', background: 'var(--surface-2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 4, fontWeight: 700, fontSize: 12, color: 'var(--muted)' }}>
                        <input type="checkbox" checked={selectedInvoices.length === unpaidInvoices.length} onChange={handleSelectAllInvoices} />
                        <span>Select All Due Invoices ({unpaidInvoices.length})</span>
                      </div>
                      {allocatedInvoices.map(inv => (
                        <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 13, padding: '4px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                            <input type="checkbox" checked={selectedInvoices.includes(inv.id)} onChange={() => handleToggleInvoice(inv.id)} />
                            <div style={{ minWidth: 0 }}>
                              <span className="code-chip">{inv.invoice_code}</span>
                              <span style={{ marginLeft: 6, fontWeight: 600 }}>{inv.title}</span>
                              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>Due Date: {inv.due_date} · Bal: {money(inv.balance)}</div>
                            </div>
                          </div>
                          
                          {/* Live allocation feedback */}
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            {inv.allocated > 0 && (
                              <div style={{ color: 'var(--success)', fontWeight: 700, fontSize: 12 }}>
                                + {money(inv.allocated)}
                              </div>
                            )}
                            <div style={{ fontSize: 11, color: inv.newBalance === 0 ? 'var(--success)' : 'var(--muted)' }}>
                              {inv.newBalance === 0 ? "Fully Paid" : `${money(inv.newBalance)} due`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: 16, textAlign: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                      <p style={{ margin: '0 0 10px 0', color: 'var(--muted)', fontSize: 13 }}>No outstanding invoices found for this tenancy.</p>
                      <Button type="button" size="sm" onClick={() => handleSingleRaiseInvoice(selectedTenancy.id)}>Raise current month rent invoice</Button>
                    </div>
                  )}
                </>
              )}

              {/* Payment Details form */}
              <div className="form-grid">
                <Field label="Amount to Collect (BDT)" required>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={paymentForm.amount} 
                    onChange={(e) => setPaymentForm(form => ({ ...form, amount: e.target.value }))} 
                    placeholder="Enter collected amount" 
                    style={{ fontSize: 16, fontWeight: 700 }}
                  />
                </Field>

                <Field label="Payment Date" required>
                  <Input 
                    type="date" 
                    value={paymentForm.paidAt} 
                    onChange={(e) => setPaymentForm(form => ({ ...form, paidAt: e.target.value }))} 
                  />
                </Field>
              </div>

              <div className="form-grid">
                <Field label="Payment Method" required>
                  <Select value={paymentForm.method} onChange={(e) => setPaymentForm(form => ({ ...form, method: e.target.value }))}>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="bkash">bKash</option>
                    <option value="nagad">Nagad</option>
                    <option value="card">Credit/Debit Card</option>
                    <option value="cheque">Bank Cheque</option>
                    <option value="sslcommerz">SSLCommerz Gateway</option>
                    <option value="other">Other Payment Mode</option>
                  </Select>
                </Field>

                <Field label="Reference / Txn ID">
                  <Input 
                    value={paymentForm.reference} 
                    onChange={(e) => setPaymentForm(form => ({ ...form, reference: e.target.value }))} 
                    placeholder="e.g. Bank slip, Txn hash" 
                  />
                </Field>
              </div>

              <Field label="Collector Notes">
                <Textarea 
                  value={paymentForm.notes} 
                  onChange={(e) => setPaymentForm(form => ({ ...form, notes: e.target.value }))} 
                  placeholder="Optional collection notes..." 
                  rows={2}
                />
              </Field>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <Button type="button" variant="ghost" onClick={() => setSelectedTenancy(null)}>Cancel</Button>
                <Button type="submit" disabled={isRecordingPayment || !paymentForm.amount || !selectedInvoices.length}>
                  {isRecordingPayment ? <Spinner /> : `Record Payment · ${money(paymentForm.amount || 0)}`}
                </Button>
              </div>
            </form>
          )}
        </Drawer>
      )}
    </>
  );
}
