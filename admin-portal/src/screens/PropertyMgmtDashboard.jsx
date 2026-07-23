import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { KeyRound, Wallet, AlertTriangle, Home, ArrowRight, Check, X, CreditCard, ChevronLeft, FileCheck2, Users, ListChecks, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { PageHead, StatCard, Button, Spinner, Drawer, Field, Input, Select, Textarea, SearchInput, Badge, StatusBadge } from '../ui/kit';
import { useToast } from '../context/ToastContext';
import { EnquiryBoard } from './RentalEnquiries';
import ActionCenter from './ActionCenter';

const money = (v) => 'BDT ' + Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// Compact BDT for tiles: ৳12.4L / ৳93k
const bdt = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1e7) return '৳' + (n / 1e7).toFixed(2) + 'Cr';
  if (Math.abs(n) >= 1e5) return '৳' + (n / 1e5).toFixed(1) + 'L';
  if (Math.abs(n) >= 1e3) return '৳' + Math.round(n / 1e3) + 'k';
  return '৳' + Math.round(n);
};
const initials = (name) => (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const AV_GRADS = ['linear-gradient(140deg,#f0663f,#c73b6a)', 'linear-gradient(140deg,#3aa0d8,#024b86)', 'linear-gradient(140deg,#12b6f3,#0a86c4)', 'linear-gradient(140deg,#7c5cff,#4a2fb8)', 'linear-gradient(140deg,#0ea371,#0a6b4c)'];
const avGrad = (seed) => AV_GRADS[Math.abs(String(seed || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % AV_GRADS.length];

// ── SVG chart primitives ──────────────────────────────────────────────────
function Spark({ points = [], color = 'var(--cyan)', dot = true }) {
  if (points.length < 2) return null;
  const min = Math.min(...points), max = Math.max(...points), rng = max - min || 1;
  const W = 120, H = 34, step = W / (points.length - 1);
  const pts = points.map((v, i) => `${(i * step).toFixed(1)},${(H - 4 - ((v - min) / rng) * (H - 8)).toFixed(1)}`);
  const last = pts[pts.length - 1].split(',');
  return (
    <svg className="pm-spark" viewBox="0 0 120 34" preserveAspectRatio="none">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {dot && <circle cx={last[0]} cy={last[1]} r="2.6" fill={color} />}
    </svg>
  );
}
function Ring({ pct = 0, color = 'var(--cyan)' }) {
  const C = 2 * Math.PI * 21;
  return (
    <svg className="pm-ring" viewBox="0 0 52 52">
      <circle cx="26" cy="26" r="21" fill="none" stroke="var(--surface-3)" strokeWidth="6" />
      <circle cx="26" cy="26" r="21" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(pct / 100 * C).toFixed(1)} ${C.toFixed(1)}`} transform="rotate(-90 26 26)" />
    </svg>
  );
}
function AreaChart({ data = [] }) {
  if (data.length < 2) return <div className="pm-empty" style={{ padding: 30 }}>Not enough history yet to chart.</div>;
  const W = 560, H = 156, PADX = 8, PADT = 20, PADB = 12;
  const collected = data.map((d) => d.collected);
  const billed = data.map((d) => d.billed);
  const max = Math.max(...collected, ...billed, 1) * 1.08, min = 0;
  const x = (i) => PADX + (i * (W - 2 * PADX)) / (data.length - 1);
  const y = (v) => PADT + (1 - (v - min) / (max - min)) * (H - PADT - PADB);
  const line = (arr) => arr.map((v, i) => `${x(i).toFixed(0)},${y(v).toFixed(0)}`).join(' ');
  const areaPts = collected.map((v, i) => `${x(i).toFixed(0)},${y(v).toFixed(0)}`);
  const area = `M${areaPts.join(' L')} L${x(data.length - 1).toFixed(0)},${H} L${x(0).toFixed(0)},${H} Z`;
  const lastX = x(data.length - 1), lastY = y(collected[collected.length - 1]);
  return (
    <>
      <svg viewBox={`0 0 560 ${H}`} width="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs><linearGradient id="pmfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--cyan)" stopOpacity=".26" /><stop offset="1" stopColor="var(--cyan)" stopOpacity="0" /></linearGradient></defs>
        {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={PADX} y1={PADT + f * (H - PADT - PADB)} x2={W - PADX} y2={PADT + f * (H - PADT - PADB)} stroke="var(--line-soft)" strokeWidth="1" />)}
        <polyline points={line(billed)} fill="none" stroke="var(--line)" strokeWidth="2" strokeDasharray="4 4" opacity=".7" />
        <path d={area} fill="url(#pmfill)" />
        <polyline points={line(collected)} fill="none" stroke="var(--cyan)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={lastX} cy={lastY} r="4.5" fill="var(--surface)" stroke="var(--cyan)" strokeWidth="2.6" />
      </svg>
      <div className="pm-axis">{data.map((d) => <span key={d.period}>{(d.period || '').slice(5)}</span>)}</div>
    </>
  );
}
function Donut({ occupied = 0, notice = 0, vacant = 0, rate = 0 }) {
  const total = occupied + notice + vacant || 1;
  const C = 2 * Math.PI * 54;
  const seg = (v) => (v / total) * C;
  const segs = [{ v: occupied, c: 'var(--good)' }, { v: notice, c: 'var(--warn)' }, { v: vacant, c: 'var(--muted-2)' }];
  let offset = 0;
  return (
    <div className="pm-donut">
      <svg viewBox="0 0 132 132" width="132" height="132">
        <circle cx="66" cy="66" r="54" fill="none" stroke="var(--surface-3)" strokeWidth="14" />
        {segs.map((s, i) => { const len = seg(s.v); const el = <circle key={i} cx="66" cy="66" r="54" fill="none" stroke={s.c} strokeWidth="14" strokeLinecap="round" strokeDasharray={`${len.toFixed(1)} ${(C - len).toFixed(1)}`} strokeDashoffset={(-offset).toFixed(1)} transform="rotate(-90 66 66)" opacity={s.c.includes('muted') ? 0.55 : 1} />; offset += len; return el; })}
      </svg>
      <div className="center"><div><div className="p pm-num">{rate}%</div><div className="l">Let</div></div></div>
    </div>
  );
}

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
  const [metrics, setMetrics] = useState(null);
  const [actions, setActions] = useState([]);
  
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
        const c = ac.cohorts || {};
        setPendingWos((c.work_orders_overdue?.top || []).slice(0, 5));
        const exp30 = c.leases_expiring_30d?.top || [];
        const exp60 = c.leases_expiring_60d?.top || [];
        setUpcomingRenewals([...exp30, ...exp60].sort((a, b) => (a.days_remaining || 0) - (b.days_remaining || 0)).slice(0, 5));
        // Build the "Today's actions" list from live cohorts (most urgent first).
        const cnt = (k) => c[k]?.count || 0;
        setActions([
          { label: 'Rent overdue', sub: `${cnt('overdue_rent')} tenant${cnt('overdue_rent') === 1 ? '' : 's'} behind`, count: cnt('overdue_rent'), sev: 'bad', icon: AlertTriangle, to: '/property-management/rentals?tab=arrears' },
          { label: 'Owner approval pending', sub: 'Tenant applications waiting', count: cnt('applications_awaiting_owner'), sev: 'warn', icon: FileCheck2, to: '/property-management/applications' },
          { label: 'Work orders overdue', sub: 'Past SLA target', count: cnt('work_orders_overdue'), sev: 'warn', icon: ListChecks, to: '/work-orders' },
          { label: 'Statements to send', sub: 'Owners awaiting statements', count: cnt('statements_not_sent'), sev: 'info', icon: FileCheck2, to: '/property-management/statements' },
          { label: 'Move-ins blocked', sub: 'Missing signed docs / bond', count: cnt('move_ins_blocked'), sev: 'bad', icon: KeyRound, to: '/property-management/applications' },
          { label: 'Missing bank / KYC', sub: 'Owner onboarding gaps', count: cnt('missing_bank') + cnt('kyc_incomplete'), sev: 'info', icon: Users, to: '/property-management/rentals' },
        ].filter((a) => a.count > 0).slice(0, 5));
      } catch { /* command centre optional */ }
      try { const { data: m } = await api.get('/property-management/dashboard-metrics'); setMetrics(m); } catch { /* metrics optional */ }
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

  const occ = metrics?.occupancy || { rate: s.total ? Math.round((s.active / s.total) * 100) : 0, occupied: s.active, under_notice: 0, vacant: Math.max(0, s.total - s.active), managed: s.total };
  const trend = metrics?.rent_trend || [];
  const collectedTrend = trend.map((t) => t.collected);
  const arrearsCount = tenancies.filter((t) => Number(t.outstanding || 0) > 0).length;
  const tm = metrics?.this_month || { billed: 0, collected: 0 };
  const collectedPct = tm.billed ? Math.min(100, Math.round((tm.collected / tm.billed) * 100)) : 0;
  const aging = metrics?.arrears_aging || { b0_30: 0, b31_60: 0, b61_90: 0, b90: 0 };
  const agingMax = Math.max(aging.b0_30, aging.b31_60, aging.b61_90, aging.b90, 1);
  const held = metrics?.held_for_owners ?? 0;
  const income = metrics?.income_total ?? 0;

  return (
    <div className="pm-scope">
      {/* ── Cockpit head ── */}
      <div className="pm-head">
        <div>
          <div className="pm-eyebrow">Portfolio Cockpit</div>
          <h1>Rental portfolio overview</h1>
          <div className="pm-meta">{occ.managed} managed {occ.managed === 1 ? 'property' : 'properties'} · {s.active} active {s.active === 1 ? 'tenancy' : 'tenancies'} · {occ.rate}% occupancy</div>
        </div>
        <div className="pm-head-actions">
          <button className="pm-btn" onClick={() => setShowBulkDrawer(true)}><KeyRound size={15} /> Bulk invoices</button>
          <button className="pm-btn" onClick={() => nav('/property-management/disbursements')}><CreditCard size={15} /> Disbursements</button>
          <button className="pm-btn primary" onClick={() => { setShowPaymentDrawer(true); setSelectedTenancy(null); }}><Wallet size={15} /> Receive payment</button>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="pm-kpis">
        <div className="pm-kpi">
          <div className="top"><span className="lab">Occupancy</span><span className="pm-delta up">{s.active} let</span></div>
          <div className="val pm-num">{occ.rate}<small>%</small></div>
          <div className="foot"><div style={{ fontSize: 12, color: 'var(--muted)' }}>{occ.occupied} of {occ.managed} let</div><Ring pct={occ.rate} /></div>
        </div>
        <div className="pm-kpi">
          <div className="top"><span className="lab">Monthly rent roll</span><span className="pm-delta flat">/ month</span></div>
          <div className="val pm-num">{bdt(s.rent)}</div>
          <div className="foot">{collectedTrend.length > 1 ? <Spark points={collectedTrend} /> : <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.total} properties</div>}</div>
        </div>
        <div className="pm-kpi">
          <div className="top"><span className="lab">Collected this month</span><span className="pm-delta flat">{collectedPct}% of due</span></div>
          <div className="val pm-num">{bdt(tm.collected)}</div>
          <div className="pm-progress"><i style={{ width: `${collectedPct}%` }} /></div>
        </div>
        <div className="pm-kpi">
          <div className="top"><span className="lab">Arrears outstanding</span><span className={`pm-delta ${s.arrears > 0 ? 'down' : 'up'}`}>{arrearsCount} due</span></div>
          <div className="val pm-num" style={{ color: s.arrears > 0 ? 'var(--bad)' : 'var(--ink)' }}>{bdt(s.arrears)}</div>
          <div className="foot"><div style={{ fontSize: 12, color: 'var(--muted)' }}>across {arrearsCount} tenant{arrearsCount === 1 ? '' : 's'}</div><Spark points={collectedTrend.length > 1 ? collectedTrend.map((v) => -v) : []} color="var(--bad)" dot={false} /></div>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="pm-main" style={{ marginTop: 16 }}>
        {/* LEFT */}
        <div className="pm-col">
          {/* Rent collection chart */}
          <div className="pm-card">
            <div className="pm-card-h">
              <div className="ic"><TrendingUp size={17} /></div>
              <div><h3>Rent collection</h3><div className="hsub">Collected vs. billed · last {trend.length || 0} months</div></div>
              <div className="sp" />
              <div className="pm-legend"><span><b style={{ background: 'var(--cyan)' }} />Collected</span><span><b style={{ background: 'var(--line)' }} />Billed</span></div>
            </div>
            <div style={{ padding: '4px 12px 14px' }}><AreaChart data={trend} /></div>
          </div>

          {/* Rent roll */}
          <div className="pm-card">
            <div className="pm-card-h" style={{ flexWrap: 'wrap' }}>
              <div className="ic"><Wallet size={17} /></div>
              <div><h3>Rent roll &amp; arrears</h3><div className="hsub">Collect rent and clear outstanding</div></div>
              <div className="sp" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tenant, property..." />
                <button className={`pm-pill ${arrearsOnly ? 'active' : ''}`} onClick={() => setArrearsOnly((v) => !v)}><AlertTriangle size={13} /> Arrears only</button>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="pm-tbl">
                <thead><tr><th>Tenant</th><th>Property</th><th>Rent</th><th>Arrears</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {filteredTenancies.length ? filteredTenancies.map((t) => (
                    <tr key={t.id} onClick={() => handleSelectTenancy(t)}>
                      <td><div className="pm-who"><div className="av" style={{ background: avGrad(t.tenant?.full_name) }}>{initials(t.tenant?.full_name)}</div><div><div className="nm">{t.tenant?.full_name || '—'}</div><div className="ph">{t.tenant?.primary_phone || '—'}</div></div></div></td>
                      <td><div style={{ fontWeight: 650 }}>{t.Property?.title || '—'}</div><div className="ph" style={{ color: 'var(--muted)', fontSize: 11.5 }}>{t.tenancy_code}</div></td>
                      <td className="pm-num" style={{ fontWeight: 700 }}>{money(t.monthly_rent)}</td>
                      <td>{Number(t.outstanding || 0) > 0 ? <span className="pm-money-out pm-num">{money(t.outstanding)}</span> : <span className="pm-chip good"><span className="d" />Clear</span>}</td>
                      <td><StatusBadge status={t.status} /></td>
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <Button size="sm" onClick={() => handleSelectTenancy(t)}>Collect</Button>
                          <Button size="sm" variant="ghost" onClick={() => handleSingleRaiseInvoice(t.id)}>Invoice</Button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="6"><div className="pm-empty"><div className="ic"><Home size={22} /></div>No matching tenancy records.</div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="pm-col">
          {/* Occupancy donut */}
          <div className="pm-card">
            <div className="pm-card-h"><div className="ic"><Home size={17} /></div><div><h3>Occupancy</h3></div></div>
            <div className="pm-card-body"><div className="pm-donut-wrap">
              <Donut occupied={occ.occupied} notice={occ.under_notice} vacant={occ.vacant} rate={occ.rate} />
              <div className="pm-leg">
                <div className="pm-leg-row"><b style={{ background: 'var(--good)' }} /><span className="lname">Occupied</span><span className="lval pm-num">{occ.occupied}</span></div>
                <div className="pm-leg-row"><b style={{ background: 'var(--warn)' }} /><span className="lname">Under notice</span><span className="lval pm-num">{occ.under_notice}</span></div>
                <div className="pm-leg-row"><b style={{ background: 'var(--muted-2)' }} /><span className="lname">Vacant</span><span className="lval pm-num">{occ.vacant}</span></div>
              </div>
            </div></div>
          </div>

          {/* Today's actions */}
          <div className="pm-card">
            <div className="pm-card-h"><div className="ic"><AlertTriangle size={16} /></div><div><h3>Today's actions</h3><div className="hsub">{actions.reduce((a, x) => a + x.count, 0)} items need attention</div></div></div>
            <div style={{ padding: '4px 0 8px' }}>
              {actions.length ? actions.map((a, i) => { const Ic = a.icon; return (
                <div key={i} className={`pm-act sev-${a.sev}`} onClick={() => nav(a.to)}>
                  <div className="ai"><Ic size={16} /></div>
                  <div className="grow"><div className="at">{a.label}</div><div className="as">{a.sub}</div></div>
                  <div className="cnt pm-num">{a.count}</div>
                </div>
              ); }) : <div className="pm-empty" style={{ padding: 28 }}><div className="ic"><Check size={20} /></div>All clear — nothing needs attention.</div>}
            </div>
          </div>

          {/* Owner disbursements + aging */}
          <div className="pm-card">
            <div className="pm-card-h"><div className="ic"><CreditCard size={17} /></div><div><h3>Owner disbursements</h3></div></div>
            <div style={{ padding: '2px 18px 16px' }}>
              <div className="pm-disb">
                <div className="l">Held for owners · net of fees</div>
                <div className="v pm-num">{money(held)}</div>
                <div className="sub2">{metrics?.owner_folios || 0} owner folios · management fees already deducted</div>
                <div className="row"><button className="pay" onClick={() => nav('/property-management/disbursements')}>Run payouts</button><button className="ghost" onClick={() => nav('/property-management/disbursements')}>Our income · {bdt(income)}</button></div>
              </div>
              <div className="pm-aging" style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted-2)', fontWeight: 700 }}>Arrears aging</div>
                {[['0–30d', aging.b0_30, 'var(--warn)'], ['31–60d', aging.b31_60, '#e08a2b'], ['61–90d', aging.b61_90, 'var(--bad)'], ['90d+', aging.b90, '#b3272c']].map(([lbl, val, col]) => (
                  <div className="pm-aging-row" key={lbl}><span className="lbl">{lbl}</span><span className="bar"><i style={{ width: `${Math.round((val / agingMax) * 100)}%`, background: col }} /></span><span className="amt pm-num">{bdt(val)}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Applications funnel ── */}
      <div className="pm-card" style={{ marginTop: 16 }}>
        <div className="pm-card-h">
          <div className="ic"><FileCheck2 size={17} /></div>
          <div><h3>Tenant applications</h3><div className="hsub">Pipeline from submission to signed tenancy</div></div>
          <div className="sp" />
          <button className="pm-link" onClick={() => nav('/property-management/applications')}>View all →</button>
        </div>
        <div className="pm-card-body">
          <div className="pm-minis">
            {[
              { key: 'submitted', label: 'Submitted', color: 'var(--cyan)' },
              { key: 'screening', label: 'Screening', color: 'var(--warn)' },
              { key: 'verification', label: 'Verification', color: 'var(--warn)' },
              { key: 'awaiting_owner_approval', label: 'Owner approval', color: 'var(--warn)' },
              { key: 'approved', label: 'Approved', color: 'var(--good)' },
              { key: 'converted', label: 'Converted', color: 'var(--good)' },
            ].map((b) => (
              <div key={b.key} className="pm-mini" onClick={() => nav('/property-management/applications')}>
                <div className="n pm-num">{appCounts[b.key] || 0}</div>
                <div className="t"><span className="dot" style={{ background: b.color }} />{b.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Enquiries + Renewals ── */}
      <div className="pm-grid" style={{ gridTemplateColumns: '1.62fr 1fr', marginTop: 16 }}>
        <div className="pm-card">
          <div className="pm-card-h"><div className="ic"><Users size={17} /></div><div><h3>Tenant enquiries pipeline</h3></div><div className="sp" /><button className="pm-link" onClick={() => nav('/property-management/enquiries')}>Full board →</button></div>
          <div className="pm-card-body"><EnquiryBoard compact /></div>
        </div>
        <div className="pm-card">
          <div className="pm-card-h"><div className="ic" style={{ background: 'var(--warn-bg)', color: 'var(--warn)' }}><FileCheck2 size={16} /></div><div><h3>Upcoming renewals</h3></div><div className="sp" /><Badge tone={upcomingRenewals.length ? 'amber' : 'green'}>60 days</Badge></div>
          <div>
            {upcomingRenewals.length ? upcomingRenewals.map((rn) => (
              <div key={rn.id} className="pm-row"><div className="grow"><div className="title">{rn.tenant_name || '—'}</div><div className="sub">{rn.property_title || '—'}</div></div><div style={{ fontSize: 12.5, color: rn.days_remaining <= 30 ? 'var(--bad)' : 'var(--warn)', fontWeight: 700 }}>{rn.days_remaining}d</div></div>
            )) : <div className="pm-empty" style={{ padding: 28 }}><div className="ic"><Check size={20} /></div>No leases expiring soon.</div>}
          </div>
        </div>
      </div>

      {/* ── Quick links ── */}
      <div className="pm-card" style={{ marginTop: 16 }}>
        <div className="pm-card-h"><div className="ic"><ArrowRight size={17} /></div><div><h3>Quick links</h3></div></div>
        <div className="pm-card-body" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            ['Rentals list', '/property-management/rentals'], ['Tenant Applications', '/property-management/applications'],
            ['Onboarding & Workflow', '/property-management/rentals?detailTab=onboarding'], ['Rental Enquiries', '/property-management/enquiries'],
            ['Rental Assessments', '/property-management/assessments'], ['Disbursements', '/property-management/disbursements'],
            ['Tenant Invoices', '/invoices'], ['Rental Receipts', '/rental-receipts'], ['Landlord Bills', '/landlord-bills'],
            ['Folios', '/folios'], ['Work Orders', '/work-orders'], ['Inspections', '/inspections'],
          ].map(([label, to]) => (
            <button key={to} className="pm-pill" onClick={() => nav(to)}>{label}</button>
          ))}
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
    </div>
  );
}
