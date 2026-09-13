import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Truck, Plus, RefreshCw, Banknote, Search, X, Check, CheckCircle2,
  Clock, AlertCircle, AlertTriangle, FileText, Phone, Mail, MapPin, Building2,
  CreditCard, ChevronRight, ExternalLink, Filter, Ban, Edit2,
  Users, Wallet, Calendar, ArrowRight, Landmark
} from 'lucide-react';
import api from '../../services/api';
import {
  bdt, money, dateFmt, toast, errText, svcProfile, svcLabel, svcBase,
  WtDrawer, Pill, Loading, EmptyState
} from './common';

/*
 * Suppliers & Payables — procurement, trade contractor directory and firm-wide
 * accounts payable. Scoped dynamically to the active service console
 * (e.g. Residential Interior Design, Water Tank, Air Conditioning).
 */

const billTone = (s) => ({ paid: 'green', partial: 'amber', unpaid: 'blue', void: 'slate' }[String(s || '').toLowerCase()] || 'slate');

export default function WtSuppliers() {
  const profile = svcProfile();
  const accent = profile.accent || '#9333ea';
  const accentSoft = profile.accent_soft || '#f3e8ff';
  const accentInk = profile.accent_ink || '#6b21a8';

  const [tab, setTab] = useState('suppliers'); // 'suppliers' | 'payables'
  const [q, setQ] = useState('');

  // Suppliers state
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  // Bills state
  const [bills, setBills] = useState([]);
  const [billCategories, setBillCategories] = useState([]);
  const [billSummary, setBillSummary] = useState({ billed: 0, paid: 0, outstanding: 0 });
  const [loadingBills, setLoadingBills] = useState(true);

  // Projects cache for Bill modal
  const [projects, setProjects] = useState([]);

  // Modals & Drawers
  const [selectedSupplierCode, setSelectedSupplierCode] = useState(null);
  const [supplierDrawerData, setSupplierDrawerData] = useState(null);
  const [loadingDrawer, setLoadingDrawer] = useState(false);

  const [supplierModal, setSupplierModal] = useState(null); // { mode: 'create' } | { mode: 'edit', data }
  const [payModal, setPayModal] = useState(null); // bill object
  const [billModal, setBillModal] = useState(null); // { supplier_id, project_code }

  // Load suppliers
  const loadSuppliers = useCallback(async () => {
    setLoadingSuppliers(true);
    try {
      const { data } = await api.get('/wt-suppliers');
      setSuppliers(data.data || []);
      setCategories(data.categories || []);
    } catch (e) {
      toast.err(errText(e, 'Could not load suppliers'));
    } finally {
      setLoadingSuppliers(false);
    }
  }, []);

  // Load bills
  const loadBills = useCallback(async () => {
    setLoadingBills(true);
    try {
      const { data } = await api.get('/wt-supplier-bills');
      setBills(data.data || []);
      setBillCategories(data.categories || []);
      setBillSummary(data.summary || { billed: 0, paid: 0, outstanding: 0 });
    } catch (e) {
      toast.err(errText(e, 'Could not load bills'));
    } finally {
      setLoadingBills(false);
    }
  }, []);

  // Load projects for select dropdowns
  const loadProjects = useCallback(async () => {
    try {
      const { data } = await api.get('/wt-projects');
      setProjects(Array.isArray(data) ? data : (data.data || []));
    } catch {
      setProjects([]);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadSuppliers();
    loadBills();
    loadProjects();
  }, [loadSuppliers, loadBills, loadProjects]);

  // Load specific supplier details & statement when drawer opens
  const openSupplierStatement = useCallback(async (code) => {
    setSelectedSupplierCode(code);
    setLoadingDrawer(true);
    try {
      const { data } = await api.get(`/wt-suppliers/${code}`);
      setSupplierDrawerData(data);
    } catch (e) {
      toast.err(errText(e, 'Could not load vendor statement'));
      setSelectedSupplierCode(null);
    } finally {
      setLoadingDrawer(false);
    }
  }, []);

  const refreshAll = () => {
    loadSuppliers();
    loadBills();
    if (selectedSupplierCode) openSupplierStatement(selectedSupplierCode);
  };

  // Aggregated totals
  const totalPayableAcrossSuppliers = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + Number(s.payable || 0), 0);
  }, [suppliers]);

  const outstandingPayablesCount = useMemo(() => {
    return bills.filter((b) => b.status !== 'paid' && b.status !== 'void').length;
  }, [bills]);

  const activeSuppliersCount = useMemo(() => {
    return suppliers.filter((s) => s.is_active !== false).length;
  }, [suppliers]);

  const paidBillsCount = useMemo(() => {
    return bills.filter((b) => b.status === 'paid').length;
  }, [bills]);

  return (
    <div
      className="wt-scope"
      style={{
        '--wt-accent': accent,
        '--wt-accent-strong': accentInk,
        '--wt-accent-ink': accentInk,
        '--wt-accent-tint-2': accentSoft,
        padding: '20px 24px',
        minHeight: '100%',
      }}
    >
      {/* ── Compact Screen Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, color: 'var(--wt-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>{svcLabel()}</span>
            <span>·</span>
            <span>Procurement &amp; Payables</span>
          </div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 0', fontSize: 22, fontWeight: 800, color: 'var(--wt-ink)', letterSpacing: '-0.02em' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 9, background: accentSoft, color: accentInk }}>
              <Truck size={19} />
            </span>
            Suppliers &amp; Accounts Payable
          </h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--wt-muted)' }}>
            Trade contractors, vendor directories, invoices, and payment tracking.
          </p>
        </div>

        {/* Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: 220 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--wt-muted)' }} />
            <input
              className="wt-input"
              style={{ paddingLeft: 30, height: 34, fontSize: 12.5 }}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${tab === 'suppliers' ? 'vendors & trades…' : 'bills & projects…'}`}
            />
            {q && (
              <button
                onClick={() => setQ('')}
                style={{ position: 'absolute', right: 8, top: 9, border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--wt-muted)' }}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button className="wt-btn" style={{ height: 34, padding: '0 11px' }} onClick={refreshAll} title="Refresh data">
            <RefreshCw size={13} className={loadingSuppliers || loadingBills ? 'wt-spin' : ''} />
            <span style={{ fontSize: 12.5 }}>Refresh</span>
          </button>

          <button
            className="wt-btn"
            style={{ height: 34, padding: '0 12px', borderColor: 'var(--wt-line)' }}
            onClick={() => setBillModal({ supplier_id: '', project_code: '' })}
          >
            <Banknote size={14} style={{ color: 'var(--wt-green)' }} />
            <span style={{ fontSize: 12.5 }}>+ Record Bill</span>
          </button>

          <button
            className="wt-btn primary"
            style={{ height: 34, padding: '0 14px', background: accent, borderColor: accent }}
            onClick={() => setSupplierModal({ mode: 'create', data: {} })}
          >
            <Plus size={14} />
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>New Supplier</span>
          </button>
        </div>
      </div>

      {/* ── High-Density 4-KPI Metric Strip ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div className="wt-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: accentSoft, color: accentInk, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <Users size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--wt-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Vendors</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--wt-ink)', lineHeight: 1.2 }}>{suppliers.length}</div>
            <div style={{ fontSize: 11.5, color: 'var(--wt-muted)', marginTop: 2 }}>{activeSuppliersCount} active · {categories.length} trade types</div>
          </div>
        </div>

        <div className="wt-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <FileText size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--wt-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Invoiced</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--wt-ink)', lineHeight: 1.2 }}>{bdt(billSummary.billed)}</div>
            <div style={{ fontSize: 11.5, color: 'var(--wt-muted)', marginTop: 2 }}>{bills.length} total bills booked</div>
          </div>
        </div>

        <div className="wt-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ecfdf5', color: '#059669', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <CheckCircle2 size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--wt-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Settled / Paid</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--wt-green)', lineHeight: 1.2 }}>{bdt(billSummary.paid)}</div>
            <div style={{ fontSize: 11.5, color: 'var(--wt-muted)', marginTop: 2 }}>{paidBillsCount} bills fully settled</div>
          </div>
        </div>

        <div className="wt-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: (billSummary.outstanding || totalPayableAcrossSuppliers) > 0 ? '#fef3c7' : '#ecfdf5',
              color: (billSummary.outstanding || totalPayableAcrossSuppliers) > 0 ? '#d97706' : '#059669',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <Wallet size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--wt-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Outstanding Payables</div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: (billSummary.outstanding || totalPayableAcrossSuppliers) > 0 ? 'var(--wt-amber)' : 'var(--wt-green)',
                lineHeight: 1.2,
              }}
            >
              {bdt(billSummary.outstanding || totalPayableAcrossSuppliers)}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--wt-muted)', marginTop: 2 }}>
              {outstandingPayablesCount > 0 ? `${outstandingPayablesCount} bills awaiting payment` : 'All accounts settled'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Compact Tab Navigation ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, borderBottom: '1px solid var(--wt-line)', paddingBottom: 8 }}>
        <button
          type="button"
          onClick={() => setTab('suppliers')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 16px',
            borderRadius: 8,
            border: 0,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 700,
            background: tab === 'suppliers' ? accentSoft : 'transparent',
            color: tab === 'suppliers' ? accentInk : 'var(--wt-muted)',
            transition: 'all .12s ease',
          }}
        >
          <Truck size={15} />
          <span>Suppliers Directory</span>
          <span
            style={{
              padding: '1px 7px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              background: tab === 'suppliers' ? accent : 'rgba(0,0,0,0.06)',
              color: tab === 'suppliers' ? '#fff' : 'inherit',
            }}
          >
            {suppliers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTab('payables')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 16px',
            borderRadius: 8,
            border: 0,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 700,
            background: tab === 'payables' ? accentSoft : 'transparent',
            color: tab === 'payables' ? accentInk : 'var(--wt-muted)',
            transition: 'all .12s ease',
          }}
        >
          <Banknote size={15} />
          <span>Bills &amp; Payables</span>
          {outstandingPayablesCount > 0 ? (
            <span
              style={{
                padding: '1px 7px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                background: 'var(--wt-amber)',
                color: '#fff',
              }}
            >
              {outstandingPayablesCount} due
            </span>
          ) : (
            <span
              style={{
                padding: '1px 7px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                background: 'rgba(0,0,0,0.06)',
                color: 'inherit',
              }}
            >
              {bills.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Main Tab Content ── */}
      {tab === 'suppliers' ? (
        <SuppliersDirectory
          suppliers={suppliers}
          categories={categories}
          loading={loadingSuppliers}
          q={q}
          setQ={setQ}
          accent={accent}
          accentSoft={accentSoft}
          accentInk={accentInk}
          onOpenStatement={openSupplierStatement}
          onEditSupplier={(s) => setSupplierModal({ mode: 'edit', data: s })}
          onAddBillForSupplier={(s) => setBillModal({ supplier_id: s.id, project_code: '' })}
        />
      ) : (
        <BillsTable
          bills={bills}
          categories={billCategories}
          loading={loadingBills}
          q={q}
          setQ={setQ}
          accent={accent}
          onPayBill={(b) => setPayModal(b)}
          onOpenSupplierStatement={openSupplierStatement}
          onReloadBills={loadBills}
        />
      )}

      {/* ── Supplier Statement Drawer ── */}
      {selectedSupplierCode && (
        <SupplierStatementDrawer
          code={selectedSupplierCode}
          detail={supplierDrawerData}
          loading={loadingDrawer}
          accent={accent}
          accentSoft={accentSoft}
          accentInk={accentInk}
          onClose={() => {
            setSelectedSupplierCode(null);
            setSupplierDrawerData(null);
          }}
          onPayBill={(b) => setPayModal(b)}
          onAddBill={(s) => setBillModal({ supplier_id: s.id, project_code: '' })}
          onEditSupplier={(s) => setSupplierModal({ mode: 'edit', data: s })}
        />
      )}

      {/* ── Add / Edit Supplier Modal ── */}
      {supplierModal && (
        <SupplierFormModal
          mode={supplierModal.mode}
          initial={supplierModal.data}
          categories={categories}
          accent={accent}
          onClose={() => setSupplierModal(null)}
          onSaved={() => {
            setSupplierModal(null);
            loadSuppliers();
            if (selectedSupplierCode) openSupplierStatement(selectedSupplierCode);
          }}
        />
      )}

      {/* ── Record Payment Modal ── */}
      {payModal && (
        <RecordPaymentModal
          bill={payModal}
          projects={projects}
          accent={accent}
          onClose={() => setPayModal(null)}
          onSaved={() => {
            setPayModal(null);
            loadBills();
            loadSuppliers();
            loadProjects();
            if (selectedSupplierCode) openSupplierStatement(selectedSupplierCode);
          }}
        />
      )}

      {/* ── Record Bill Modal ── */}
      {billModal && (
        <RecordBillModal
          initial={billModal}
          suppliers={suppliers}
          projects={projects}
          categories={billCategories.length ? billCategories : categories}
          accent={accent}
          onClose={() => setBillModal(null)}
          onSaved={() => {
            setBillModal(null);
            loadBills();
            loadSuppliers();
            loadProjects();
            if (selectedSupplierCode) openSupplierStatement(selectedSupplierCode);
          }}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * 1. Suppliers Directory Component
 * ───────────────────────────────────────────────────────────── */
function SuppliersDirectory({
  suppliers,
  categories,
  loading,
  q,
  setQ,
  accent,
  accentSoft,
  accentInk,
  onOpenStatement,
  onEditSupplier,
  onAddBillForSupplier,
}) {
  const [tradeFilter, setTradeFilter] = useState('');
  const [balanceOnly, setBalanceOnly] = useState(false);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return suppliers.filter((s) => {
      if (tradeFilter && s.category !== tradeFilter) return false;
      if (balanceOnly && Number(s.payable || 0) <= 0) return false;
      if (!term) return true;
      return [
        s.code,
        s.name,
        s.category,
        s.contact_person,
        s.phone,
        s.email,
        s.address,
      ].some((val) => String(val || '').toLowerCase().includes(term));
    });
  }, [suppliers, q, tradeFilter, balanceOnly]);

  const initials = (name) => {
    const parts = String(name || '').trim().split(/\s+/);
    if (!parts.length || !parts[0]) return 'VN';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div>
      {/* Quick Filter Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={13} style={{ color: 'var(--wt-muted)' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--wt-muted)' }}>Trade:</span>
          <select
            className="wt-select"
            style={{ height: 30, fontSize: 12, padding: '2px 8px', minWidth: 160 }}
            value={tradeFilter}
            onChange={(e) => setTradeFilter(e.target.value)}
          >
            <option value="">All Trades ({suppliers.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setBalanceOnly(!balanceOnly)}
          style={{
            height: 30,
            padding: '0 10px',
            borderRadius: 6,
            border: `1px solid ${balanceOnly ? 'var(--wt-amber)' : 'var(--wt-line)'}`,
            background: balanceOnly ? '#fef3c7' : '#fff',
            color: balanceOnly ? '#b45309' : 'var(--wt-ink-2)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Clock size={12} />
          <span>With Outstanding Balance</span>
        </button>

        {(tradeFilter || balanceOnly || q) && (
          <button
            type="button"
            className="wt-btn sm ghost"
            style={{ fontSize: 12, padding: '2px 8px' }}
            onClick={() => {
              setTradeFilter('');
              setBalanceOnly(false);
              setQ('');
            }}
          >
            Clear filters
          </button>
        )}

        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--wt-muted)' }}>
          Showing <strong>{filtered.length}</strong> of <strong>{suppliers.length}</strong> vendors
        </div>
      </div>

      {/* Directory Table */}
      <div className="wt-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--wt-page)', display: 'grid', placeItems: 'center', margin: '0 auto 10px', color: 'var(--wt-muted)' }}>
              <Truck size={20} />
            </div>
            <div style={{ fontWeight: 700, color: 'var(--wt-ink)', fontSize: 14 }}>No suppliers match your filter</div>
            <div style={{ fontSize: 12.5, color: 'var(--wt-muted)', marginTop: 4 }}>Try clearing the trade filter or search query.</div>
          </div>
        ) : (
          <table className="wt-tbl" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ width: 280 }}>Vendor / Contractor</th>
                <th style={{ width: 170 }}>Trade Category</th>
                <th>Contact Coordinates</th>
                <th style={{ width: 140, textAlign: 'right' }}>Balance Owed</th>
                <th style={{ width: 110, textAlign: 'center' }}>Status</th>
                <th style={{ width: 160, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const payable = Number(s.payable || 0);
                return (
                  <tr key={s.code} style={{ verticalAlign: 'middle' }}>
                    {/* Vendor Name + Code + Avatar */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            background: accentSoft,
                            color: accentInk,
                            fontWeight: 700,
                            fontSize: 12.5,
                            display: 'grid',
                            placeItems: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {initials(s.name)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div
                            onClick={() => onOpenStatement(s.code)}
                            style={{
                              fontWeight: 700,
                              color: 'var(--wt-ink)',
                              fontSize: 13.5,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                            title="Click to view vendor ledger & statement"
                          >
                            <span>{s.name}</span>
                            <ChevronRight size={13} style={{ opacity: 0.5 }} />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--wt-muted)', background: '#f1f5f9', padding: '1px 5px', borderRadius: 4 }}>
                              {s.code}
                            </span>
                            {s.contact_person && (
                              <span style={{ fontSize: 11.5, color: 'var(--wt-muted)' }}>
                                · {s.contact_person}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Trade Category */}
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: 12,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: '#f1f5f9',
                          color: 'var(--wt-ink-2)',
                        }}
                      >
                        {s.category || 'General Trade'}
                      </span>
                    </td>

                    {/* Contact Info */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {s.phone ? (
                          <a
                            href={`tel:${s.phone}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              fontSize: 12,
                              color: 'var(--wt-ink-2)',
                              textDecoration: 'none',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone size={11} style={{ color: 'var(--wt-muted)' }} />
                            <span>{s.phone}</span>
                          </a>
                        ) : null}
                        {s.email ? (
                          <a
                            href={`mailto:${s.email}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              fontSize: 11.5,
                              color: 'var(--wt-muted)',
                              textDecoration: 'none',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Mail size={11} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 190 }}>
                              {s.email}
                            </span>
                          </a>
                        ) : null}
                        {!s.phone && !s.email && <span style={{ fontSize: 12, color: 'var(--wt-muted)' }}>—</span>}
                      </div>
                    </td>

                    {/* Balance Owed */}
                    <td style={{ textAlign: 'right' }}>
                      {payable > 0 ? (
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 800,
                              color: '#b45309',
                              background: '#fef3c7',
                              padding: '2px 7px',
                              borderRadius: 5,
                            }}
                          >
                            {bdt(payable)}
                          </span>
                          <span style={{ fontSize: 10.5, color: 'var(--wt-muted)', marginTop: 2 }}>due payment</span>
                        </div>
                      ) : (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: 'var(--wt-green)',
                            background: '#ecfdf5',
                            padding: '2px 7px',
                            borderRadius: 5,
                          }}
                        >
                          ৳0 · Settled
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: s.is_active !== false ? '#ecfdf5' : '#f1f5f9',
                          color: s.is_active !== false ? 'var(--wt-green)' : 'var(--wt-muted)',
                        }}
                      >
                        {s.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Quick Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="wt-btn sm"
                          style={{ padding: '4px 8px' }}
                          onClick={() => onOpenStatement(s.code)}
                          title="View statement & bills"
                        >
                          <FileText size={12} />
                          <span style={{ fontSize: 11.5 }}>Ledger</span>
                        </button>

                        <button
                          type="button"
                          className="wt-btn sm"
                          style={{ padding: '4px 7px' }}
                          onClick={() => onAddBillForSupplier(s)}
                          title="Book new bill for this supplier"
                        >
                          <Plus size={12} />
                          <span style={{ fontSize: 11.5 }}>Bill</span>
                        </button>

                        <button
                          type="button"
                          className="wt-btn sm ghost"
                          style={{ padding: '4px 6px', color: 'var(--wt-muted)' }}
                          onClick={() => onEditSupplier(s)}
                          title="Edit supplier profile"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * 2. Bills & Accounts Payable Component
 * ───────────────────────────────────────────────────────────── */
function BillsTable({
  bills,
  categories,
  loading,
  q,
  setQ,
  accent,
  onPayBill,
  onOpenSupplierStatement,
  onReloadBills,
}) {
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [voiding, setVoiding] = useState(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return bills.filter((b) => {
      if (statusFilter && b.status !== statusFilter) return false;
      if (categoryFilter && b.category !== categoryFilter) return false;
      if (!term) return true;
      return [
        b.bill_code,
        b.supplier_name,
        b.project_code,
        b.category,
        b.description,
      ].some((v) => String(v || '').toLowerCase().includes(term));
    });
  }, [bills, q, statusFilter, categoryFilter]);

  const doVoid = async (bill) => {
    if (!window.confirm(`Are you sure you want to void bill ${bill.bill_code}? This cannot be undone.`)) return;
    setVoiding(bill.bill_code);
    try {
      await api.post(`/wt-supplier-bills/${bill.bill_code}/void`);
      toast.ok(`Bill ${bill.bill_code} voided`);
      onReloadBills();
    } catch (e) {
      toast.err(errText(e, 'Could not void bill'));
    } finally {
      setVoiding(null);
    }
  };

  return (
    <div>
      {/* Filter Strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        {/* Status Pill Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fff', border: '1px solid var(--wt-line)', borderRadius: 7, padding: 2 }}>
          {[
            { id: '', label: 'All Bills' },
            { id: 'unpaid', label: 'Unpaid' },
            { id: 'partial', label: 'Partial' },
            { id: 'paid', label: 'Paid' },
            { id: 'void', label: 'Void' },
          ].map((st) => {
            const active = statusFilter === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                style={{
                  border: 0,
                  borderRadius: 5,
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  background: active ? accent : 'transparent',
                  color: active ? '#fff' : 'var(--wt-ink-2)',
                  transition: 'all .12s ease',
                }}
              >
                {st.label}
              </button>
            );
          })}
        </div>

        {/* Cost Category filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={13} style={{ color: 'var(--wt-muted)' }} />
          <select
            className="wt-select"
            style={{ height: 30, fontSize: 12, padding: '2px 8px', minWidth: 150 }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {(statusFilter || categoryFilter || q) && (
          <button
            type="button"
            className="wt-btn sm ghost"
            style={{ fontSize: 12, padding: '2px 8px' }}
            onClick={() => {
              setStatusFilter('');
              setCategoryFilter('');
              setQ('');
            }}
          >
            Clear filters
          </button>
        )}

        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--wt-muted)' }}>
          Showing <strong>{filtered.length}</strong> of <strong>{bills.length}</strong> bills
        </div>
      </div>

      {/* Bills Table */}
      <div className="wt-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--wt-page)', display: 'grid', placeItems: 'center', margin: '0 auto 10px', color: 'var(--wt-muted)' }}>
              <Banknote size={20} />
            </div>
            <div style={{ fontWeight: 700, color: 'var(--wt-ink)', fontSize: 14 }}>No supplier bills found</div>
            <div style={{ fontSize: 12.5, color: 'var(--wt-muted)', marginTop: 4 }}>
              Raise bills from the "+ Record Bill" button or from a project's costing tab.
            </div>
          </div>
        ) : (
          <table className="wt-tbl" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ width: 130 }}>Bill Code</th>
                <th style={{ width: 200 }}>Vendor</th>
                <th style={{ width: 140 }}>Project / Job</th>
                <th style={{ width: 130 }}>Category</th>
                <th>Description</th>
                <th style={{ width: 110, textAlign: 'right' }}>Total</th>
                <th style={{ width: 110, textAlign: 'right' }}>Balance</th>
                <th style={{ width: 95, textAlign: 'center' }}>Status</th>
                <th style={{ width: 100, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => {
                const balance = Number(b.balance || 0);
                const isPaid = b.status === 'paid';
                const isVoid = b.status === 'void';

                return (
                  <tr key={b.bill_code} style={{ verticalAlign: 'middle' }}>
                    {/* Bill Code + Date */}
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--wt-ink)', fontSize: 13, fontFamily: 'monospace' }}>
                        {b.bill_code}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--wt-muted)', marginTop: 1 }}>
                        {dateFmt(b.bill_date || b.createdAt)}
                      </div>
                    </td>

                    {/* Supplier */}
                    <td>
                      <div
                        style={{ fontWeight: 600, color: 'var(--wt-ink)', fontSize: 13 }}
                      >
                        {b.supplier_name}
                      </div>
                    </td>

                    {/* Project */}
                    <td>
                      {b.project_code ? (
                        <span style={{ fontSize: 11.5, fontFamily: 'monospace', fontWeight: 600, background: '#eff6ff', color: '#1d4ed8', padding: '2px 6px', borderRadius: 4 }}>
                          {b.project_code}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11.5, color: 'var(--wt-muted)' }}>Firm Wide</span>
                      )}
                    </td>

                    {/* Category */}
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--wt-ink-2)' }}>{b.category || 'General'}</span>
                    </td>

                    {/* Description */}
                    <td>
                      <span style={{ fontSize: 12.5, color: 'var(--wt-muted)' }}>
                        {b.description || '—'}
                      </span>
                    </td>

                    {/* Total Amount */}
                    <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13 }}>
                      {bdt(b.total)}
                    </td>

                    {/* Balance */}
                    <td style={{ textAlign: 'right' }}>
                      {balance > 0 ? (
                        <span style={{ fontWeight: 800, color: '#b45309', fontSize: 13 }}>
                          {bdt(balance)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--wt-green)', fontSize: 12, fontWeight: 600 }}>৳0</span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ textAlign: 'center' }}>
                      <span className={`wt-pill sm ${billTone(b.status)}`}>
                        {b.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      {!isPaid && !isVoid ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <button
                            type="button"
                            className="wt-btn sm primary"
                            style={{ height: 26, padding: '0 8px', fontSize: 11.5 }}
                            onClick={() => onPayBill(b)}
                          >
                            <Banknote size={12} />
                            <span>Pay</span>
                          </button>
                          <button
                            type="button"
                            className="wt-btn sm ghost"
                            style={{ height: 26, padding: '0 4px', color: 'var(--wt-muted)' }}
                            disabled={voiding === b.bill_code}
                            onClick={() => doVoid(b)}
                            title="Void bill"
                          >
                            <Ban size={12} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--wt-muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * 3. Supplier Statement & Ledger Slide-Over Drawer
 * ───────────────────────────────────────────────────────────── */
function SupplierStatementDrawer({
  code,
  detail,
  loading,
  accent,
  accentSoft,
  accentInk,
  onClose,
  onPayBill,
  onAddBill,
  onEditSupplier,
}) {
  const supplier = detail?.data;
  const bills = detail?.bills || [];
  const summary = detail?.summary || {};

  return (
    <WtDrawer
      wide
      title={supplier ? `${supplier.name} · Vendor Statement` : `Vendor ${code}`}
      subtitle={`Code: ${code} · ${supplier?.category || 'Trade Vendor'}`}
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <button
            type="button"
            className="wt-btn"
            onClick={() => onEditSupplier(supplier)}
            disabled={!supplier}
          >
            <Edit2 size={13} />
            <span>Edit Profile</span>
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="wt-btn" onClick={onClose}>
              Close
            </button>
            <button
              type="button"
              className="wt-btn primary"
              style={{ background: accent, borderColor: accent }}
              onClick={() => onAddBill(supplier)}
              disabled={!supplier}
            >
              <Plus size={13} />
              <span>+ Record Bill</span>
            </button>
          </div>
        </div>
      }
    >
      {loading ? (
        <Loading />
      ) : !supplier ? (
        <EmptyState eyebrow="Vendor" title="Supplier statement not found" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Top Profile Strip */}
          <div
            className="wt-card"
            style={{
              padding: '14px 16px',
              background: '#f8fafc',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: 'var(--wt-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Contact Person</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--wt-ink)', marginTop: 2 }}>{supplier.contact_person || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--wt-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Phone</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>
                {supplier.phone ? (
                  <a href={`tel:${supplier.phone}`} style={{ color: accentInk, textDecoration: 'none' }}>
                    {supplier.phone}
                  </a>
                ) : '—'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--wt-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Email</div>
              <div style={{ fontSize: 13, marginTop: 2 }}>
                {supplier.email ? (
                  <a href={`mailto:${supplier.email}`} style={{ color: 'var(--wt-ink)', textDecoration: 'none' }}>
                    {supplier.email}
                  </a>
                ) : '—'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--wt-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Workshop / Address</div>
              <div style={{ fontSize: 12.5, color: 'var(--wt-ink-2)', marginTop: 2 }}>{supplier.address || '—'}</div>
            </div>
          </div>

          {/* Mini Financial Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            <div className="wt-card" style={{ padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--wt-muted)' }}>Opening Owed</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--wt-ink)', marginTop: 2 }}>
                {bdt(summary.opening_balance)}
              </div>
            </div>
            <div className="wt-card" style={{ padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--wt-muted)' }}>Total Billed</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--wt-ink)', marginTop: 2 }}>
                {bdt(summary.billed)}
              </div>
            </div>
            <div className="wt-card" style={{ padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--wt-muted)' }}>Total Settled</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--wt-green)', marginTop: 2 }}>
                {bdt(summary.paid)}
              </div>
            </div>
            <div className="wt-card" style={{ padding: '10px 14px', background: summary.payable > 0 ? '#fef3c7' : '#fff' }}>
              <div style={{ fontSize: 11, color: summary.payable > 0 ? '#92400e' : 'var(--wt-muted)', fontWeight: 600 }}>Net Payable</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: summary.payable > 0 ? '#b45309' : 'var(--wt-green)', marginTop: 2 }}>
                {bdt(summary.payable)}
              </div>
            </div>
          </div>

          {/* Bank / Payment Details */}
          {supplier.bank_details && (
            <div className="wt-card" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--wt-ink)', marginBottom: 4 }}>
                <CreditCard size={14} style={{ color: accentInk }} />
                <span>Bank &amp; Disbursement Instructions</span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--wt-ink-2)', whiteSpace: 'pre-wrap' }}>
                {supplier.bank_details}
              </div>
            </div>
          )}

          {/* Bills & Invoices Ledger */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--wt-ink)' }}>
                Billing History &amp; Ledger ({bills.length})
              </h4>
              <button
                type="button"
                className="wt-btn sm"
                style={{ height: 26, fontSize: 11.5 }}
                onClick={() => onAddBill(supplier)}
              >
                <Plus size={12} />
                <span>Add Bill</span>
              </button>
            </div>

            <div className="wt-card" style={{ padding: 0, overflow: 'hidden' }}>
              {bills.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--wt-muted)', fontSize: 13 }}>
                  No bills recorded for this supplier yet.
                </div>
              ) : (
                <table className="wt-tbl" style={{ margin: 0, fontSize: 12.5 }}>
                  <thead>
                    <tr>
                      <th>Bill Code</th>
                      <th>Project</th>
                      <th>Description</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th style={{ textAlign: 'right' }}>Balance</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map((b) => (
                      <tr key={b.bill_code}>
                        <td>
                          <strong>{b.bill_code}</strong>
                          <div style={{ fontSize: 11, color: 'var(--wt-muted)' }}>{dateFmt(b.bill_date || b.createdAt)}</div>
                        </td>
                        <td>
                          {b.project_code ? (
                            <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600, background: '#eff6ff', color: '#1d4ed8', padding: '1px 5px', borderRadius: 4 }}>
                              {b.project_code}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ color: 'var(--wt-ink-2)' }}>{b.description || b.category || '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{bdt(b.total)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: b.balance > 0 ? 'var(--wt-amber)' : 'var(--wt-muted)' }}>
                          {bdt(b.balance)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`wt-pill sm ${billTone(b.status)}`}>{b.status}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {b.status !== 'paid' && b.status !== 'void' && (
                            <button
                              type="button"
                              className="wt-btn sm primary"
                              style={{ height: 24, padding: '0 8px', fontSize: 11 }}
                              onClick={() => onPayBill(b)}
                            >
                              Pay
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </WtDrawer>
  );
}

/* ─────────────────────────────────────────────────────────────
 * 4. Add / Edit Supplier Modal Form
 * ───────────────────────────────────────────────────────────── */
function SupplierFormModal({ mode, initial, categories, accent, onClose, onSaved }) {
  const isEdit = mode === 'edit';
  const [form, setForm] = useState({
    name: initial?.name || '',
    category: initial?.category || '',
    contact_person: initial?.contact_person || '',
    phone: initial?.phone || '',
    email: initial?.email || '',
    address: initial?.address || '',
    bank_details: initial?.bank_details || '',
    opening_balance: initial?.opening_balance || '',
    notes: initial?.notes || '',
    is_active: initial?.is_active !== undefined ? initial.is_active : true,
  });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!form.name.trim()) {
      toast.err('Vendor name is required.');
      return;
    }
    setBusy(true);
    try {
      if (isEdit) {
        await api.patch(`/wt-suppliers/${initial.code}`, form);
        toast.ok(`Supplier ${initial.code} updated`);
      } else {
        await api.post('/wt-suppliers', form);
        toast.ok('New supplier added');
      }
      onSaved();
    } catch (e) {
      toast.err(errText(e, `Could not ${isEdit ? 'update' : 'add'} supplier`));
    } finally {
      setBusy(false);
    }
  };

  return (
    <WtDrawer
      title={isEdit ? `Edit Supplier · ${initial.code}` : 'Add New Supplier'}
      subtitle="Register trade contractor, material supplier or service provider"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="wt-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="wt-btn primary"
            style={{ background: accent, borderColor: accent }}
            onClick={save}
            disabled={busy}
          >
            {busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Register Supplier'}
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--wt-ink-2)', marginBottom: 4 }}>
            Supplier / Company Name <span style={{ color: 'var(--wt-red)' }}>*</span>
          </label>
          <input
            className="wt-input"
            autoFocus
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Deshi Furniture Ltd / Artisan Carpentry Works"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--wt-ink-2)', marginBottom: 4 }}>
            Trade Category
          </label>
          <select
            className="wt-select"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          >
            <option value="">Select category…</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--wt-ink-2)', marginBottom: 4 }}>
            Contact Person
          </label>
          <input
            className="wt-input"
            value={form.contact_person}
            onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))}
            placeholder="e.g. Master Carpenter Rahim / Mr. Karim"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--wt-ink-2)', marginBottom: 4 }}>
            Phone Number
          </label>
          <input
            className="wt-input"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="e.g. 01711000111"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--wt-ink-2)', marginBottom: 4 }}>
            Email Address
          </label>
          <input
            className="wt-input"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="e.g. accounts@vendor.com"
          />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--wt-ink-2)', marginBottom: 4 }}>
            Workshop / Showroom / Office Address
          </label>
          <input
            className="wt-input"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="e.g. Plot 14, Badda Furniture Market, Dhaka"
          />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--wt-ink-2)', marginBottom: 4 }}>
            Bank &amp; Payment Details
          </label>
          <textarea
            className="wt-input"
            rows={2}
            value={form.bank_details}
            onChange={(e) => setForm((f) => ({ ...f, bank_details: e.target.value }))}
            placeholder="e.g. Bank: City Bank, A/C: 1102938491, Branch: Gulshan, or bKash Merchant: 0171..."
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--wt-ink-2)', marginBottom: 4 }}>
            Opening Balance (Owed ৳)
          </label>
          <input
            className="wt-input"
            type="number"
            disabled={isEdit}
            value={form.opening_balance}
            onChange={(e) => setForm((f) => ({ ...f, opening_balance: e.target.value }))}
            placeholder="0"
          />
          <span style={{ fontSize: 11, color: 'var(--wt-muted)' }}>Historical balance owed to vendor</span>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--wt-ink-2)', marginBottom: 4 }}>
            Account Status
          </label>
          <select
            className="wt-select"
            value={form.is_active ? 'true' : 'false'}
            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.value === 'true' }))}
          >
            <option value="true">Active Vendor</option>
            <option value="false">Inactive / Suspended</option>
          </select>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--wt-ink-2)', marginBottom: 4 }}>
            Internal Notes
          </label>
          <textarea
            className="wt-input"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Payment terms, quality rating, specialization notes…"
          />
        </div>
      </div>
    </WtDrawer>
  );
}

/* ─────────────────────────────────────────────────────────────
 * 5. Record Payment Modal
 * ───────────────────────────────────────────────────────────── */
function RecordPaymentModal({ bill, projects = [], accent, onClose, onSaved }) {
  const balance = Number(bill.balance || 0);
  const [amount, setAmount] = useState(String(balance));
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  const linkedProject = useMemo(() => {
    if (!bill.project_code) return null;
    return (projects || []).find((p) => p.code === bill.project_code);
  }, [bill.project_code, projects]);

  const projectFundsHolding = useMemo(() => {
    if (!linkedProject) return null;
    const f = linkedProject.financials;
    if (f?.funds_holding != null) return Number(f.funds_holding);
    return Number(f?.collected || 0) - Number(f?.disbursed || 0);
  }, [linkedProject]);

  const doPay = async () => {
    const numAmt = Number(amount);
    if (!numAmt || numAmt <= 0) {
      toast.err('Please enter a valid payment amount.');
      return;
    }
    if (numAmt > balance + 0.01) {
      toast.err(`Payment cannot exceed outstanding balance of ${bdt(balance)}.`);
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post(`/wt-supplier-bills/${bill.bill_code}/pay`, {
        amount: numAmt,
        method,
        reference,
        paid_on: paidOn,
      });
      toast.ok(data.message || 'Payment recorded successfully');
      onSaved();
    } catch (e) {
      toast.err(errText(e, 'Could not record payment'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <WtDrawer
      title={`Pay Bill · ${bill.bill_code}`}
      subtitle={`Vendor: ${bill.supplier_name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="wt-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="wt-btn primary"
            style={{ background: 'var(--wt-green)', borderColor: 'var(--wt-green)' }}
            onClick={doPay}
            disabled={busy}
          >
            {busy ? 'Recording…' : `Confirm Payment of ${bdt(amount || 0)}`}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Bill Overview Card */}
        <div className="wt-card" style={{ padding: '12px 16px', background: '#f8fafc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--wt-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Bill Details</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--wt-ink)' }}>{bill.bill_code}</div>
              <div style={{ fontSize: 12, color: 'var(--wt-muted)', marginTop: 2 }}>
                {bill.project_code ? `Project: ${bill.project_code}` : 'General / Firm-Wide'}
                {bill.category ? ` · ${bill.category}` : ''}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--wt-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Balance Due</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--wt-amber)' }}>{bdt(balance)}</div>
              <div style={{ fontSize: 11, color: 'var(--wt-muted)' }}>Total: {bdt(bill.total)}</div>
            </div>
          </div>
        </div>

        {/* Linked Project Funds Holding Card */}
        {linkedProject && projectFundsHolding != null && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: `1px solid ${projectFundsHolding >= 0 ? '#bbf7d0' : '#fecaca'}`,
              background: projectFundsHolding >= 0 ? '#f0fdf4' : '#fff1f2',
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Landmark size={16} style={{ color: projectFundsHolding >= 0 ? '#16a34a' : '#dc2626' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: projectFundsHolding >= 0 ? '#15803d' : '#b91c1c' }}>
                  Project Funds Holding: {bdt(projectFundsHolding)}
                </span>
              </div>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 10,
                  background: projectFundsHolding >= 0 ? '#dcfce7' : '#fee2e2',
                  color: projectFundsHolding >= 0 ? '#166534' : '#991b1b',
                }}
              >
                {projectFundsHolding >= 0 ? '✓ In Escrow' : '⚠ Deficit Position'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: projectFundsHolding >= 0 ? '#15803d' : '#b91c1c' }}>
              {projectFundsHolding < 0
                ? '⚠ Note: Project is in a deficit. Any negative balance will be adjusted automatically after client payments.'
                : `✓ ${bdt(projectFundsHolding)} client funds currently retained in escrow for ${bill.project_code}.`}
            </div>
          </div>
        )}

        {/* Payment Fields */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--wt-ink-2)' }}>
              Payment Amount (৳) <span style={{ color: 'var(--wt-red)' }}>*</span>
            </label>
            <button
              type="button"
              className="wt-btn sm ghost"
              style={{ fontSize: 11.5, padding: '1px 6px', color: accent }}
              onClick={() => setAmount(String(balance))}
            >
              Pay Full Balance ({bdt(balance)})
            </button>
          </div>
          <input
            className="wt-input"
            type="number"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--wt-ink-2)', marginBottom: 4 }}>
              Payment Method
            </label>
            <select
              className="wt-select"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
              <option value="cheque">Cheque</option>
              <option value="card">Card</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--wt-ink-2)', marginBottom: 4 }}>
              Payment Date
            </label>
            <input
              className="wt-input"
              type="date"
              value={paidOn}
              onChange={(e) => setPaidOn(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--wt-ink-2)', marginBottom: 4 }}>
            Reference / Transaction ID / Cheque No.
          </label>
          <input
            className="wt-input"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. TrxID 9K2840, Cheque #004928"
          />
        </div>
      </div>
    </WtDrawer>
  );
}

/* ─────────────────────────────────────────────────────────────
 * 6. Record Bill Modal Form
 * ───────────────────────────────────────────────────────────── */
function RecordBillModal({ initial, suppliers, projects = [], categories, accent, onClose, onSaved }) {
  const [form, setForm] = useState({
    supplier_id: initial?.supplier_id || (suppliers[0]?.id || ''),
    project_code: initial?.project_code || '',
    category: categories[0] || 'Furniture',
    total: '',
    bill_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    description: '',
    notes: '',
  });
  const [busy, setBusy] = useState(false);

  const selectedProject = useMemo(() => {
    if (!form.project_code) return null;
    return (projects || []).find((p) => p.code === form.project_code);
  }, [form.project_code, projects]);

  const currentFundsHolding = useMemo(() => {
    if (!selectedProject) return 0;
    const f = selectedProject.financials;
    if (f?.funds_holding != null) return Number(f.funds_holding);
    return Number(f?.collected || 0) - Number(f?.disbursed || 0);
  }, [selectedProject]);

  const billAmount = Number(form.total || 0);
  const projectedFundsHolding = currentFundsHolding - billAmount;

  const save = async () => {
    if (!form.supplier_id) {
      toast.err('Please select a supplier.');
      return;
    }
    const numTotal = Number(form.total);
    if (!numTotal || numTotal <= 0) {
      toast.err('Please enter a valid bill amount greater than 0.');
      return;
    }

    setBusy(true);
    try {
      const { data } = await api.post('/wt-supplier-bills', {
        ...form,
        total: numTotal,
      });
      toast.ok(data.message || 'Bill recorded successfully');
      onSaved();
    } catch (e) {
      toast.err(errText(e, 'Could not record bill'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <WtDrawer
      title="Record Supplier Bill"
      subtitle="Book a trade contractor invoice or material cost against a project"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="wt-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="wt-btn primary"
            style={{ background: accent, borderColor: accent }}
            onClick={save}
            disabled={busy}
          >
            {busy ? 'Saving…' : 'Record Bill'}
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--wt-ink-2)', marginBottom: 4 }}>
            Supplier / Contractor <span style={{ color: 'var(--wt-red)' }}>*</span>
          </label>
          <select
            className="wt-select"
            value={form.supplier_id}
            onChange={(e) => setForm((f) => ({ ...f, supplier_id: e.target.value }))}
          >
            <option value="">Select supplier…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code} · {s.category || 'General'})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--wt-ink-2)', marginBottom: 4 }}>
            Link to Project
          </label>
          <select
            className="wt-select"
            value={form.project_code}
            onChange={(e) => setForm((f) => ({ ...f, project_code: e.target.value }))}
          >
            <option value="">None (Firm-Wide / Overhead)</option>
            {projects.map((p) => (
              <option key={p.code} value={p.code}>
                {p.code} · {p.client_name || p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--wt-ink-2)', marginBottom: 4 }}>
            Cost Category
          </label>
          <select
            className="wt-select"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* ── Prominent Project Funds Holding Card ── */}
        {selectedProject && (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '12px 14px',
              borderRadius: 8,
              border: `1px solid ${currentFundsHolding >= 0 ? '#bbf7d0' : '#fecaca'}`,
              background: currentFundsHolding >= 0 ? '#f0fdf4' : '#fff1f2',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: currentFundsHolding >= 0 ? '#dcfce7' : '#fee2e2',
                  display: 'grid',
                  placeItems: 'center',
                  color: currentFundsHolding >= 0 ? '#16a34a' : '#dc2626'
                }}>
                  <Landmark size={18} />
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--wt-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Project Funds Holding ({selectedProject.code})
                  </span>
                  <div style={{ fontSize: 18, fontWeight: 800, color: currentFundsHolding >= 0 ? '#15803d' : '#b91c1c', lineHeight: 1.2 }}>
                    {bdt(currentFundsHolding)}
                  </div>
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 12,
                  background: currentFundsHolding >= 0 ? '#dcfce7' : '#fee2e2',
                  color: currentFundsHolding >= 0 ? '#166534' : '#991b1b',
                }}
              >
                {currentFundsHolding >= 0 ? '✓ Funds in Escrow' : '⚠ Deficit Balance'}
              </span>
            </div>

            {/* Financial metrics breakdown strip */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: 8,
              padding: '8px 10px',
              background: 'rgba(255,255,255,0.7)',
              borderRadius: 6,
              fontSize: 11.5,
              border: '1px solid rgba(0,0,0,0.04)'
            }}>
              <div>
                <span style={{ color: 'var(--wt-muted)', display: 'block', fontSize: 10.5 }}>Client Collected</span>
                <strong style={{ color: '#16a34a' }}>{bdt(selectedProject.financials?.collected || 0)}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--wt-muted)', display: 'block', fontSize: 10.5 }}>Disbursed / Spent</span>
                <strong style={{ color: '#d97706' }}>{bdt(selectedProject.financials?.disbursed || 0)}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--wt-muted)', display: 'block', fontSize: 10.5 }}>Contract Value</span>
                <strong style={{ color: 'var(--wt-ink)' }}>{bdt(selectedProject.financials?.contract_value || 0)}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--wt-muted)', display: 'block', fontSize: 10.5 }}>Client Receivable</span>
                <strong style={{ color: Number(selectedProject.financials?.receivable) > 0 ? '#dc2626' : 'var(--wt-muted)' }}>
                  {bdt(selectedProject.financials?.receivable || 0)}
                </strong>
              </div>
            </div>

            {/* Policy notice / Deficit guidance */}
            {currentFundsHolding < 0 ? (
              <div style={{ fontSize: 11.5, color: '#b91c1c', display: 'flex', alignItems: 'flex-start', gap: 6, lineHeight: 1.4 }}>
                <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  <strong>Negative funds holding:</strong> Disbursements exceed client payments received for this project by <strong>{bdt(Math.abs(currentFundsHolding))}</strong>. <em>This deficit will be adjusted automatically after client payments are received.</em>
                </span>
              </div>
            ) : (
              <div style={{ fontSize: 11.5, color: '#15803d', display: 'flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle2 size={14} />
                <span>
                  Client payments in hand exceed disbursements. Positive escrow balance available for contractor &amp; trade costs.
                </span>
              </div>
            )}

            {/* Dynamic projection when bill amount is entered */}
            {billAmount > 0 && (
              <div
                style={{
                  paddingTop: 8,
                  marginTop: 2,
                  borderTop: `1px dashed ${currentFundsHolding >= 0 ? '#86efac' : '#fca5a5'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 12,
                  flexWrap: 'wrap',
                  gap: 4,
                }}
              >
                <span style={{ color: 'var(--wt-ink-2)' }}>Estimated Balance After This Bill:</span>
                <span style={{ fontWeight: 800, color: projectedFundsHolding >= 0 ? '#15803d' : '#b91c1c' }}>
                  {bdt(projectedFundsHolding)}
                  {projectedFundsHolding < 0 && (
                    <span style={{ fontSize: 10.5, fontWeight: 500, marginLeft: 6, color: '#b91c1c' }}>
                      (Deficit to be adjusted after client payments)
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        )}

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--wt-ink-2)', marginBottom: 4 }}>
            Bill Amount (৳) <span style={{ color: 'var(--wt-red)' }}>*</span>
          </label>
          <input
            className="wt-input"
            type="number"
            value={form.total}
            onChange={(e) => setForm((f) => ({ ...f, total: e.target.value }))}
            placeholder="e.g. 75000"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--wt-ink-2)', marginBottom: 4 }}>
            Bill Date
          </label>
          <input
            className="wt-input"
            type="date"
            value={form.bill_date}
            onChange={(e) => setForm((f) => ({ ...f, bill_date: e.target.value }))}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--wt-ink-2)', marginBottom: 4 }}>
            Due Date
          </label>
          <input
            className="wt-input"
            type="date"
            value={form.due_date}
            onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
          />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--wt-ink-2)', marginBottom: 4 }}>
            Description / Items Covered
          </label>
          <textarea
            className="wt-input"
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="e.g. Living room oak wood media console fabrication & wall cladding"
          />
        </div>
      </div>
    </WtDrawer>
  );
}
