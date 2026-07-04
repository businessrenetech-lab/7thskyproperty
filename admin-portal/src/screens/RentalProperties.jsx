import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Home, User, Users, CalendarClock, Wallet, FileText, Activity, 
  ArrowLeft, Plus, Trash2, Edit, Check, Upload, PlusCircle, 
  Settings, Phone, Mail, File, ShieldAlert, Award, Search, Info, PlusSquare
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, DataTable, StatusBadge, Drawer, SearchInput, KV, Spinner, Badge, Button, Field, Input, Select, Textarea } from '../ui/kit';
import { Combo } from '../ui/pickers';
import TenantApplications from './TenantApplications';
import { PropertyAssessmentPanel } from './RentalAssessments';
import PropertyOnboarding from './PropertyOnboarding';
import { LifecycleChip, FinancialStrip, NextActionBanner, BlockersStrip, CountsRow } from './PropertyStateHeader';
import { CommunicationsTab, AuditLogTab } from './PropertyTimeline';
import OwnerStatements from './OwnerStatements';
import PropertyRoleStrip from './PropertyRoleStrip';

const money = (v) => (v == null ? '৳0.00' : '৳' + Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

export default function RentalProperties() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [tabCounts, setTabCounts] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState('details'); // 'details' | 'tenants' | 'owner'
  const [sidebarTab, setSidebarTab] = useState('documents'); // 'documents' | 'activity'

  // Drawers
  const [showKycDrawer, setShowKycDrawer] = useState(false);
  const [showTenancyDrawer, setShowTenancyDrawer] = useState(false);
  const [showDocDrawer, setShowDocDrawer] = useState(false);

  // New Property Creation Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '', category: 'residential', listing_type: 'rent', status: 'available', price: '',
    bedrooms: '', bathrooms: '', parking: '', building_size: '', floor_number: '', furnishing: 'unfurnished',
    address: '', area: '', city: '', district: '', description: '',
    owner_contact_id: null, occupancy_status: 'vacant', utilities_active: false,
    market_rent_min: '', market_rent_max: '', approved_monthly_rent: '', rent_due_day: 5,
    management_fee_pct: 5, lease_min_period_months: 6, property_condition: '', access_contact: '',
    listing_status: 'not_listed', remarks: ''
  });

  // Form states
  const [kycForm, setKycForm] = useState({
    contact_id: null, nid_number: '', tin_number: '', passport_number: '',
    nid_front_url: '', nid_back_url: '', bank_name: '', bank_branch: '',
    bank_account_name: '', bank_account_number: '', bank_routing_number: '',
    bkash_number: '', nagad_number: '', preferred_payment: 'bank_transfer',
    disbursement_frequency: 'monthly', disbursement_day: 1, opening_balance: 0, notes: '',
    fees: []
  });
  const [tenancyForm, setTenancyForm] = useState({
    tenant_contact_id: null, owner_contact_id: null, lease_start: '', move_in_date: '',
    lease_end: '', move_out_date: '', security_deposit: '', monthly_rent: '',
    service_charge: '', rent_due_day: 1, payment_frequency: 'monthly', status: 'active', notes: ''
  });
  const [docForm, setDocForm] = useState({
    title: '', file_url: '', file_name: '', doc_type: 'other', is_private: true
  });
  const [saving, setSaving] = useState(false);

  // Load properties list
  const loadProperties = useCallback(async () => {
    setLoading(true);
    try {
      const q = search ? `&search=${encodeURIComponent(search)}` : '';
      const { data } = await api.get(`/properties?tab=${activeTab}&include_counts=true${q}&limit=100`);
      setRows(data.data || []);
      if (data.tab_counts) setTabCounts(data.tab_counts);
    } catch (e) {
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, toast]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  // Load property details
  const loadDetail = useCallback(async (id) => {
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/properties/${id}`);
      setDetail(data);
    } catch (e) {
      toast.error('Failed to load property details');
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (selectedId) {
      loadDetail(selectedId);
    } else {
      setDetail(null);
    }
  }, [selectedId, loadDetail]);

  const handleRowClick = (property) => {
    setSelectedId(property.id);
    setDetailTab(searchParams.get('detailTab') || 'details');
  };

  const handleBackToList = () => {
    setSelectedId(null);
    loadProperties();
  };

  // Open KYC Drawer and populate form
  const openKycDrawer = () => {
    if (detail?.ownerProfile) {
      setKycForm({
        ...detail.ownerProfile,
        fees: detail.fees || []
      });
    } else {
      setKycForm({
        contact_id: detail?.data?.owner_contact_id || null, nid_number: '', tin_number: '', passport_number: '',
        nid_front_url: '', nid_back_url: '', bank_name: '', bank_branch: '',
        bank_account_name: '', bank_account_number: '', bank_routing_number: '',
        bkash_number: '', nagad_number: '', preferred_payment: 'bank_transfer',
        disbursement_frequency: 'monthly', disbursement_day: 1, opening_balance: 0, notes: '',
        fees: [
          { fee_name: 'Management Fee', fee_category: 'Management fee', fee_trigger: 'rental_receipt', amount_type: 'percentage', amount_value: 5 },
          { fee_name: 'Leasing Fee', fee_category: 'Letting fee', fee_trigger: 'first_rent', amount_type: 'percentage', amount_value: 110 },
          { fee_name: 'Lease Renewal Fee', fee_category: 'Lease renewal fee', fee_trigger: 'renewal', amount_type: 'percentage', amount_value: 55 },
          { fee_name: 'Maintenance Fee', fee_category: 'Maintenance fee', fee_trigger: 'invoice_receipt', amount_type: 'percentage', amount_value: 2 },
          { fee_name: 'Advertising Fee', fee_category: 'Advertising fee', fee_trigger: 'manual', amount_type: 'fixed', amount_value: 200 },
          { fee_name: 'Statement Fee', fee_category: 'Admin fee', fee_trigger: 'statement_period', amount_type: 'fixed', amount_value: 3 }
        ]
      });
    }
    setShowKycDrawer(true);
  };

  // Save KYC profile + fees
  const saveOwnerProfile = async () => {
    if (!kycForm.contact_id) return toast.error('Owner contact is required');
    setSaving(true);
    try {
      const { data } = await api.post(`/properties/${selectedId}/owner-profile`, kycForm);
      toast.success(data.message || 'Owner profile and charges updated');
      loadDetail(selectedId);
      setShowKycDrawer(false);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Open Tenancy Drawer
  const openTenancyDrawer = () => {
    setTenancyForm({
      tenant_contact_id: null,
      owner_contact_id: detail?.data?.owner_contact_id || null,
      lease_start: '', move_in_date: '', lease_end: '', move_out_date: '',
      security_deposit: '', monthly_rent: detail?.data?.price || '',
      service_charge: '', rent_due_day: 1, payment_frequency: 'monthly', status: 'active', notes: ''
    });
    setShowTenancyDrawer(true);
  };

  // Save Tenancy
  const saveTenancy = async () => {
    if (!tenancyForm.tenant_contact_id) return toast.error('Tenant contact is required');
    if (!tenancyForm.monthly_rent) return toast.error('Monthly rent is required');
    setSaving(true);
    try {
      const { data } = await api.post(`/properties/${selectedId}/tenancies`, tenancyForm);
      toast.success(data.message || 'Tenancy agreement created');
      loadDetail(selectedId);
      setShowTenancyDrawer(false);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Create tenancy failed');
    } finally {
      setSaving(false);
    }
  };

  // Save Document Link/Upload
  const saveDocument = async () => {
    if (!docForm.file_url) return toast.error('Document URL is required');
    if (!docForm.title) return toast.error('Document title is required');
    setSaving(true);
    try {
      const { data } = await api.post(`/properties/${selectedId}/documents`, docForm);
      toast.success(data.message || 'Document uploaded');
      loadDetail(selectedId);
      setShowDocDrawer(false);
      setDocForm({ title: '', file_url: '', file_name: '', doc_type: 'other', is_private: true });
    } catch (e) {
      toast.error(e.response?.data?.error || 'Upload failed');
    } finally {
      setSaving(false);
    }
  };

  // Raise invoice action
  const handleRaiseInvoice = async (tenancyId) => {
    try {
      const { data } = await api.post(`/tenancies/${tenancyId}/raise-invoice`, {});
      toast.success(data.message || 'Rent invoice raised successfully');
      loadDetail(selectedId);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to raise invoice');
    }
  };

  // Send the prefilled tenancy agreement for signing (tenant + Seventh Sky,
  // owner CC'd). The tenancy activates automatically when fully signed.
  const handleStartTenancyAgreement = async (tenancyId) => {
    try {
      const { data } = await api.post(`/tenancies/${tenancyId}/send-agreement`, { signer_mode: 'sspc' });
      toast.success(data.message || 'Tenancy agreement sent for signing');
      loadDetail(selectedId);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to send tenancy agreement');
    }
  };

  // Remove fee
  const handleRemoveFee = async (feeId) => {
    if (!window.confirm('Are you sure you want to remove this fee from schedule?')) return;
    try {
      await api.delete(`/properties/${selectedId}/fees/${feeId}`);
      toast.success('Fee removed');
      loadDetail(selectedId);
    } catch (e) {
      toast.error('Failed to remove fee');
    }
  };

  // Helper selectors
  const contactLabel = (c) => `${c.full_name}${c.primary_phone ? ' · ' + c.primary_phone : ''}`;

  // Save new property
  const saveProperty = async (e) => {
    if (e) e.preventDefault();
    if (!createForm.title) return toast.error('Property title is required');
    if (!createForm.category) return toast.error('Category is required');
    setSaving(true);
    try {
      const { data } = await api.post('/properties', createForm);
      toast.success(data.message || 'Property registered successfully');
      setShowCreateModal(false);
      // Reset form
      setCreateForm({
        title: '', category: 'residential', listing_type: 'rent', status: 'available', price: '',
        bedrooms: '', bathrooms: '', parking: '', building_size: '', floor_number: '',
        address: '', area: '', city: '', district: '', description: ''
      });
      // Refresh list
      loadProperties();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Registration failed');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { key: 'active', label: `Properties (${tabCounts.active ?? 0})` },
    { key: 'rentals', label: `Rentals (${tabCounts.rentals ?? 0})` },
    { key: 'arrears', label: `Arrears (${tabCounts.arrears ?? 0})` },
    { key: 'vacancies', label: `Vacancies (${tabCounts.vacancies ?? 0})` },
    { key: 'expiring', label: `Expiring (${tabCounts.expiring ?? 0})` },
    { key: 'archived', label: `Archived (${tabCounts.archived ?? 0})` },
  ];

  const columns = [
    { key: 'property_code', header: 'Code', render: (r) => <span className="code-chip">{r.property_code}</span> },
    { key: 'title', header: 'Reference / Title', render: (r) => (
      <div>
        <div className="cell-strong">{r.title}</div>
        <div className="cell-sub">{[r.area, r.city].filter(Boolean).join(', ')}</div>
      </div>
    )},
    { key: 'category', header: 'Category', render: (r) => <span className="cell-sub" style={{ textTransform: 'capitalize' }}>{r.category}</span> },
    { key: 'property_type', header: 'Type', render: (r) => <span className="cell-sub">{r.property_type || '—'}</span> },
    { key: 'owner', header: 'Owner', render: (r) => r.owner ? <span className="cell-strong">{r.owner.full_name}</span> : <span className="cell-sub">—</span> },
    { key: 'tenant', header: 'Tenant', render: (r) => r.tenant ? <span className="cell-strong">{r.tenant.full_name}</span> : <span className="cell-sub">—</span> },
    { key: 'manager', header: 'Manager', render: (r) => r.manager ? <span className="cell-sub">{r.manager.full_name}</span> : <span className="cell-sub">—</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  if (selectedId) {
    if (detailLoading || !detail) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
          <Spinner />
          <div style={{ marginTop: 12, color: 'var(--muted)' }}>Loading property file...</div>
        </div>
      );
    }

    const { data: prop = {}, tenancies = [], ownerProfile, fees = [], financials = {}, activity = [], state = null, communications = [], auditLog = [] } = detail;

    return (
      <div className="property-detail-layout" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Detail Header — title + lifecycle + back + actions */}
        <div className="page-head" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Button variant="ghost" className="btn-icon" onClick={handleBackToList}><ArrowLeft size={16} /></Button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 className="title" style={{ fontSize: 20, marginRight: 4 }}>{prop.title}</h1>
                <span className="code-chip">{prop.property_code}</span>
                {state && <LifecycleChip state={state.lifecycle_state} />}
              </div>
              <div className="desc" style={{ fontSize: 13, marginTop: 6 }}>
                {[prop.address, prop.area, prop.city].filter(Boolean).join(', ') || 'No address set'}
                {prop.manager && <> · Manager: <strong>{prop.manager.full_name}</strong></>}
                {prop.owner && <> · Owner: <strong>{prop.owner.full_name}</strong></>}
                {prop.tenant && <> · Tenant: <strong>{prop.tenant.full_name}</strong></>}
              </div>
              {state && <div style={{ marginTop: 8 }}><CountsRow counts={state.counts} /></div>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button icon={Plus} onClick={openTenancyDrawer}>Add Tenant</Button>
            <Button variant="ghost" icon={Edit} onClick={openKycDrawer}>Edit Owner KYC</Button>
            <Button variant="ghost" icon={Upload} onClick={() => setShowDocDrawer(true)}>Upload Document</Button>
          </div>
        </div>

        {/* Next Action banner — the primary CTA for the current lifecycle state */}
        {state?.next_action && (
          <NextActionBanner nextAction={state.next_action} onCta={(tab) => setDetailTab(tab)} />
        )}

        {/* Blockers strip — clickable, jumps to the tab that fixes each blocker */}
        {state?.blockers?.length > 0 && (
          <BlockersStrip blockers={state.blockers} onFix={(tab) => setDetailTab(tab)} />
        )}

        {/* Parties strip — who is legally attached + their agreement state */}
        <PropertyRoleStrip propertyId={selectedId} />

        {/* Financial strip — six key numbers, computed from live folio + invoice + rental ledger */}
        {state ? (
          <FinancialStrip state={state} financial={state.financial} />
        ) : (
          /* Fallback for properties without state (unmanaged): show legacy financial strip */
        <div className="card" style={{ background: 'var(--surface-2)' }}>
          <div className="card-pad" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, padding: '16px 20px' }}>
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>Money In (Revenue)</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--success)', marginTop: 4 }}>{money(financials.money_in)}</div>
            </div>
            <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 16 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>Money Out (Paid)</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>{money(financials.money_out)}</div>
            </div>
            <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 16 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>Pending Bills</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--danger)', marginTop: 4 }}>{money(financials.bills_pending)}</div>
            </div>
            <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 16 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>Pending Invoices</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--warning)', marginTop: 4 }}>{money(financials.invoices_pending)}</div>
            </div>
            <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 16, background: 'var(--surface)', padding: '6px 12px', borderRadius: 8 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--primary-700)', fontWeight: 800 }}>Owner Balance</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-600)', marginTop: 4 }}>{money(financials.balance)}</div>
            </div>
          </div>
        </div>
        )}

        {/* Two-Column Detail Container */}
        <div style={{ display: 'grid', gridTemplateColumns: '7fr 4fr', gap: 20, alignItems: 'start' }}>
          
          {/* Left Column — Detailed Information Tabs */}
          <div className="card">
            <div className="tabs" style={{ padding: '0 20px', marginBottom: 0 }}>
              <button className={`tab ${detailTab === 'details' ? 'active' : ''}`} onClick={() => setDetailTab('details')}>Property Details</button>
              <button className={`tab ${detailTab === 'tenants' ? 'active' : ''}`} onClick={() => setDetailTab('tenants')}>Active Tenants</button>
              <button className={`tab ${detailTab === 'owner' ? 'active' : ''}`} onClick={() => setDetailTab('owner')}>Owners & KYC</button>
              <button className={`tab ${detailTab === 'applications' ? 'active' : ''}`} onClick={() => setDetailTab('applications')}>Tenant Applications</button>
              <button className={`tab ${detailTab === 'assessment' ? 'active' : ''}`} onClick={() => setDetailTab('assessment')}>Rental Assessment</button>
              <button className={`tab ${detailTab === 'onboarding' ? 'active' : ''}`} onClick={() => setDetailTab('onboarding')}>Onboarding & Workflow</button>
              <button className={`tab ${detailTab === 'statements' ? 'active' : ''}`} onClick={() => setDetailTab('statements')}>Owner Statements</button>
              <button className={`tab ${detailTab === 'communications' ? 'active' : ''}`} onClick={() => setDetailTab('communications')}>Communications{communications?.length ? ` (${communications.length})` : ''}</button>
              <button className={`tab ${detailTab === 'audit' ? 'active' : ''}`} onClick={() => setDetailTab('audit')}>Audit Log{auditLog?.length ? ` (${auditLog.length})` : ''}</button>
            </div>
            <div className="card-pad" style={{ minHeight: 320 }}>
              
              {/* Tab 1: Property Details */}
              {detailTab === 'details' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                    <div>
                      <h4 className="form-section-title" style={{ marginTop: 0 }}>Basic Attributes</h4>
                      <KV k="Category" v={<span style={{ textTransform: 'capitalize' }}>{prop.category}</span>} />
                      <KV k="Property Type" v={prop.property_type} />
                      <KV k="Listing Type" v={<span style={{ textTransform: 'capitalize' }}>{prop.listing_type}</span>} />
                      <KV k="Standard Price" v={money(prop.price)} />
                      <KV k="Negotiable" v={prop.is_negotiable ? 'Yes' : 'No'} />
                    </div>
                    <div>
                      <h4 className="form-section-title" style={{ marginTop: 0 }}>Structure & Manager</h4>
                      <KV k="Bedrooms" v={prop.bedrooms || '—'} />
                      <KV k="Bathrooms" v={prop.bathrooms || '—'} />
                      <KV k="Parking" v={prop.parking || '—'} />
                      <KV k="Building Size" v={prop.building_size || '—'} />
                      <KV k="Floor Number" v={prop.floor_number || '—'} />
                      <KV k="Assigned Manager" v={prop.manager?.full_name || 'Unassigned'} />
                    </div>
                  </div>

                  {prop.description && (
                    <div>
                      <h4 className="form-section-title">Property Description</h4>
                      <p style={{ margin: 0, fontSize: 13, lineHeight: '1.6', color: 'var(--muted)' }}>{prop.description}</p>
                    </div>
                  )}

                  {/* Media Grid */}
                  <div>
                    <h4 className="form-section-title">Media & Visual Assets</h4>
                    {prop.media?.length ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12, marginTop: 8 }}>
                        {prop.media.map((med) => (
                          <div key={med.id} className="card" style={{ overflow: 'hidden', height: 90, position: 'relative' }}>
                            <img src={med.file_url} alt={med.caption || 'Property asset'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <span className="code-chip" style={{ position: 'absolute', bottom: 4, left: 4, right: 4, fontSize: 9, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', padding: '1px 4px', background: 'rgba(255,255,255,0.85)' }}>
                              {med.media_type}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="cell-sub" style={{ margin: 0 }}>No photos or virtual tours uploaded yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Active Tenants */}
              {detailTab === 'tenants' && (
                <div>
                  <div className="between" style={{ marginBottom: 14 }}>
                    <h4 className="form-section-title" style={{ margin: 0, border: 'none', padding: 0 }}>Lease Agreements</h4>
                    <Button size="sm" icon={Plus} onClick={openTenancyDrawer}>Add Tenant</Button>
                  </div>

                  {tenancies?.length ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {tenancies.map((t) => (
                        <div key={t.id} className="card" style={{ border: '1px solid var(--border-strong)' }}>
                          <div className="card-head" style={{ padding: '12px 16px', background: 'var(--surface-2)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                              <span className="code-chip">{t.tenancy_code}</span>
                              <StatusBadge status={t.status} />
                              {t.lease_status && (
                                <Badge tone={t.lease_status === 'active' ? 'green' : t.lease_status === 'sent_for_signature' ? 'blue' : t.lease_status === 'signed' ? 'green' : 'amber'} dot>
                                  Agreement: {t.lease_status.replace(/_/g, ' ')}
                                </Badge>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {t.status === 'active' && (
                                <Button size="sm" variant="ghost" icon={Wallet} onClick={() => handleRaiseInvoice(t.id)}>
                                  Raise Rent Invoice
                                </Button>
                              )}
                              {t.lease_status !== 'active' && t.lease_status !== 'signed' && (
                                <Button size="sm" icon={FileSignatureIcon} onClick={() => handleStartTenancyAgreement(t.id)}>
                                  {t.lease_status === 'sent_for_signature' ? 'Resend Agreement' : 'Send Tenancy Agreement'}
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="card-pad" style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
                            <KV k="Tenant Name" v={t.tenant?.full_name || '—'} />
                            <KV k="Contact Phone" v={t.tenant?.primary_phone || '—'} />
                            <KV k="Lease Start" v={t.lease_start || '—'} />
                            <KV k="Lease End" v={t.lease_end || '—'} />
                            <KV k="Agreement Status" v={<StatusBadge status={t.lease_status || 'draft'} />} />
                            <KV k="Monthly Rent" v={money(t.monthly_rent)} />
                            <KV k="Service Charge" v={money(t.service_charge)} />
                            <KV k="Security Money (Advance)" v={money(t.security_deposit)} />
                            <KV k="Outstanding Balance" v={t.outstanding > 0 ? <Badge tone="red">{money(t.outstanding)}</Badge> : <Badge tone="green">Paid Clear</Badge>} />
                            {t.notes && <div style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                              <strong>Notes:</strong> {t.notes}
                            </div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '40px 0', textAlign: 'center' }}>
                      <Users size={24} style={{ color: 'var(--muted-2)', marginBottom: 8 }} />
                      <p className="cell-sub" style={{ margin: 0 }}>No active or past tenancies found. Register a tenant to start rental tracking.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Owners & KYC */}
              {detailTab === 'owner' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {/* Owner basic card */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                    <div>
                      <h4 className="form-section-title" style={{ marginTop: 0 }}>KYC Profile</h4>
                      <KV k="Owner Contact" v={prop.owner?.full_name || '—'} />
                      <KV k="NID Number" v={ownerProfile?.nid_number || '—'} />
                      <KV k="TIN Number" v={ownerProfile?.tin_number || '—'} />
                      <KV k="Passport" v={ownerProfile?.passport_number || '—'} />
                      <div className="kv" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                        <span className="k">NID Document Uploads</span>
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                          {ownerProfile?.nid_front_url ? (
                            <a href={ownerProfile.nid_front_url} target="_blank" rel="noreferrer" className="code-chip" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <File size={12} /> Front side
                            </a>
                          ) : <span className="cell-sub">No NID front file</span>}
                          {ownerProfile?.nid_back_url ? (
                            <a href={ownerProfile.nid_back_url} target="_blank" rel="noreferrer" className="code-chip" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <File size={12} /> Back side
                            </a>
                          ) : <span className="cell-sub">No NID back file</span>}
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="form-section-title" style={{ marginTop: 0 }}>Banking & Mobile Financials</h4>
                      <KV k="Bank Name" v={ownerProfile?.bank_name || '—'} />
                      <KV k="Branch" v={ownerProfile?.bank_branch || '—'} />
                      <KV k="Account Name" v={ownerProfile?.bank_account_name || '—'} />
                      <KV k="Account Number" v={ownerProfile?.bank_account_number || '—'} />
                      <KV k="Routing Code" v={ownerProfile?.bank_routing_number || '—'} />
                      <KV k="bKash Personal" v={ownerProfile?.bkash_number || '—'} />
                      <KV k="Nagad Personal" v={ownerProfile?.nagad_number || '—'} />
                      <KV k="Preferred Transfer Method" v={
                        <span style={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 700 }}>
                          {ownerProfile?.preferred_payment?.replace('_', ' ') || '—'}
                        </span>
                      } />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                    <div>
                      <h4 className="form-section-title">Disbursement Settings</h4>
                      <KV k="Frequency" v={ownerProfile?.disbursement_frequency || 'monthly'} />
                      <KV k="Disbursement Day" v={ownerProfile?.disbursement_day ? `Day ${ownerProfile.disbursement_day}` : 'Day 1'} />
                      <KV k="Opening Balance" v={money(ownerProfile?.opening_balance)} />
                    </div>
                    <div>
                      <h4 className="form-section-title">Folio Notes</h4>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>{ownerProfile?.notes || 'No owner notes recorded.'}</p>
                    </div>
                  </div>

                  {/* Fee schedule template charges */}
                  <div>
                    <div className="between" style={{ marginBottom: 10 }}>
                      <h4 className="form-section-title" style={{ margin: 0, border: 'none', padding: 0 }}>Agency Charges (Our Fees)</h4>
                      <Button size="sm" variant="ghost" icon={Settings} onClick={openKycDrawer}>Manage Fees</Button>
                    </div>
                    {fees?.length ? (
                      <table className="tbl" style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
                        <thead>
                          <tr>
                            <th>Fee Item</th>
                            <th>Trigger Event</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fees.map((fee) => (
                            <tr key={fee.id}>
                              <td className="cell-strong">{fee.fee_name}</td>
                              <td><span className="cell-sub" style={{ textTransform: 'capitalize' }}>{fee.fee_trigger?.replace('_', ' ') || ''}</span></td>
                              <td>{fee.amount_type === 'percentage' ? `${fee.amount_value}%` : money(fee.amount_value)}</td>
                              <td><span className={`badge badge-${fee.is_active ? 'green' : 'grey'}`}>{fee.is_active ? 'Active' : 'Inactive'}</span></td>
                              <td>
                                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleRemoveFee(fee.id)} style={{ color: 'var(--danger)' }}>
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="cell-sub">No fee schedules mapped to this folio. Set up owner profile to configure fees.</p>
                    )}
                  </div>

                </div>
              )}

              {detailTab === 'applications' && (
                <TenantApplications propertyId={selectedId} embedded />
              )}

              {detailTab === 'assessment' && (
                <PropertyAssessmentPanel propertyId={selectedId} ownerContactId={prop.owner_contact_id} />
              )}

              {detailTab === 'onboarding' && (
                <PropertyOnboarding propertyId={selectedId} onChanged={() => loadDetail(selectedId)} />
              )}

              {detailTab === 'statements' && (
                <OwnerStatements propertyId={selectedId} ownerContactId={prop.owner_contact_id} embedded />
              )}

              {detailTab === 'communications' && (
                <CommunicationsTab propertyId={selectedId} communications={communications} onReload={() => loadDetail(selectedId)} />
              )}

              {detailTab === 'audit' && (
                <AuditLogTab auditLog={auditLog} />
              )}

            </div>
          </div>

          {/* Right Sidebar — Documents & Activity Logs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card">
              <div className="tabs" style={{ padding: '0 16px', marginBottom: 0 }}>
                <button className={`tab ${sidebarTab === 'documents' ? 'active' : ''}`} onClick={() => setSidebarTab('documents')}>Documents Feed</button>
                <button className={`tab ${sidebarTab === 'activity' ? 'active' : ''}`} onClick={() => setSidebarTab('activity')}>Activity</button>
              </div>
              <div className="card-pad" style={{ maxHeight: 520, overflowY: 'auto', padding: 16 }}>
                
                {/* Sidebar 1: Documents Feed */}
                {sidebarTab === 'documents' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <Button size="sm" style={{ width: '100%' }} icon={Upload} onClick={() => setShowDocDrawer(true)}>Upload File</Button>
                    </div>

                    {detail.documents?.length ? (
                      detail.documents.map((doc, idx) => (
                        <div key={doc.id || idx} className="nav-item" style={{ margin: 0, padding: 10, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                          <div style={{ color: doc.icon_type === 'receipt' ? 'var(--success)' : doc.icon_type === 'invoice' ? 'var(--warning)' : 'var(--primary)' }}>
                            <FileText size={18} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {doc.title}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                              <span>{doc.date ? new Date(doc.date).toLocaleDateString() : '—'}</span>
                              {doc.amount && <strong>{money(doc.amount)}</strong>}
                            </div>
                          </div>
                          {doc.file_url && (
                            <a href={doc.file_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm btn-icon" title="View document">
                              <ExternalLinkIcon size={12} />
                            </a>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="cell-sub" style={{ textAlign: 'center', padding: '20px 0' }}>No property-related documents or statements found.</p>
                    )}
                  </div>
                )}

                {/* Sidebar 2: Activity Log */}
                {sidebarTab === 'activity' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {activity?.length ? (
                      activity.map((act, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: 10, fontSize: 12.5 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{
                              width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center',
                              background: act.type === 'payment' ? 'var(--success-bg)' : act.type === 'invoice' ? 'var(--warning-bg)' : 'var(--primary-50)',
                              color: act.type === 'payment' ? 'var(--success)' : act.type === 'invoice' ? 'var(--warning)' : 'var(--primary)'
                            }}>
                              <Activity size={12} />
                            </div>
                            <div style={{ flex: 1, width: 1, background: 'var(--border)', margin: '4px 0' }} />
                          </div>
                          <div style={{ flex: 1, paddingBottom: 10 }}>
                            <div style={{ fontWeight: 700 }}>{act.title}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
                              <span>Code: {act.code || '—'} · Status: {act.status}</span>
                              <span>{act.date ? new Date(act.date).toLocaleDateString() : ''}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="cell-sub" style={{ textAlign: 'center', padding: '20px 0' }}>No recorded operational activities.</p>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>

        </div>

        {/* ── DRAWERS & DIALOGS ── */}

        {/* 1. Owner KYC & Fee Settings Drawer */}
        {showKycDrawer && (
          <Drawer title="Configure Property Owner & Charges" onClose={() => setShowKycDrawer(false)} width={680}
            footer={
              <>
                <Button variant="ghost" onClick={() => setShowKycDrawer(false)}>Cancel</Button>
                <Button onClick={saveOwnerProfile} disabled={saving}>{saving ? <Spinner /> : 'Save Profile & Settings'}</Button>
              </>
            }>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              <h4 className="form-section-title" style={{ marginTop: 0 }}>KYC Profile Registry</h4>
              <Field label="Owner Contact" required>
                <Combo endpoint="/contacts" labelFn={contactLabel} value={kycForm.contact_id} onChange={(v) => setKycForm(s => ({ ...s, contact_id: v }))} placeholder="Select matching contact..." />
              </Field>

              <div className="form-grid">
                <Field label="NID Number (Bangladesh)"><Input value={kycForm.nid_number} onChange={(e) => setKycForm(s => ({ ...s, nid_number: e.target.value }))} /></Field>
                <Field label="TIN Number"><Input value={kycForm.tin_number} onChange={(e) => setKycForm(s => ({ ...s, tin_number: e.target.value }))} /></Field>
                <Field label="Passport Number"><Input value={kycForm.passport_number} onChange={(e) => setKycForm(s => ({ ...s, passport_number: e.target.value }))} /></Field>
                <Field label="Opening Balance (৳)"><Input type="number" value={kycForm.opening_balance} onChange={(e) => setKycForm(s => ({ ...s, opening_balance: e.target.value }))} /></Field>
              </div>

              <div className="form-grid">
                <Field label="NID Front URL"><Input value={kycForm.nid_front_url} onChange={(e) => setKycForm(s => ({ ...s, nid_front_url: e.target.value }))} placeholder="Paste document url or file-url..." /></Field>
                <Field label="NID Back URL"><Input value={kycForm.nid_back_url} onChange={(e) => setKycForm(s => ({ ...s, nid_back_url: e.target.value }))} placeholder="Paste document url or file-url..." /></Field>
              </div>

              <h4 className="form-section-title">Disbursement & Settlements</h4>
              <div className="form-grid">
                <Field label="Frequency">
                  <Select value={kycForm.disbursement_frequency} onChange={(e) => setKycForm(s => ({ ...s, disbursement_frequency: e.target.value }))}>
                    <option value="weekly">Weekly</option>
                    <option value="fortnightly">Fortnightly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </Select>
                </Field>
                <Field label="Day of Month (1-28)">
                  <Input type="number" value={kycForm.disbursement_day} min="1" max="28" onChange={(e) => setKycForm(s => ({ ...s, disbursement_day: parseInt(e.target.value, 10) }))} />
                </Field>
                <Field label="Preferred Transfer">
                  <Select value={kycForm.preferred_payment} onChange={(e) => setKycForm(s => ({ ...s, preferred_payment: e.target.value }))}>
                    <option value="bank_transfer">Bank Wire</option>
                    <option value="bkash">bKash Mobile</option>
                    <option value="nagad">Nagad Mobile</option>
                    <option value="cash">Cash Settlement</option>
                    <option value="cheque">Bank Cheque</option>
                  </Select>
                </Field>
              </div>

              <h4 className="form-section-title">Owner Bank details</h4>
              <div className="form-grid">
                <Field label="Bank Name"><Input value={kycForm.bank_name} onChange={(e) => setKycForm(s => ({ ...s, bank_name: e.target.value }))} /></Field>
                <Field label="Branch Name"><Input value={kycForm.bank_branch} onChange={(e) => setKycForm(s => ({ ...s, bank_branch: e.target.value }))} /></Field>
                <Field label="Account Holder Name"><Input value={kycForm.bank_account_name} onChange={(e) => setKycForm(s => ({ ...s, bank_account_name: e.target.value }))} /></Field>
                <Field label="Account Number"><Input value={kycForm.bank_account_number} onChange={(e) => setKycForm(s => ({ ...s, bank_account_number: e.target.value }))} /></Field>
                <Field label="Routing Code"><Input value={kycForm.bank_routing_number} onChange={(e) => setKycForm(s => ({ ...s, bank_routing_number: e.target.value }))} /></Field>
              </div>

              <div className="form-grid">
                <Field label="bKash Phone Number"><Input value={kycForm.bkash_number} onChange={(e) => setKycForm(s => ({ ...s, bkash_number: e.target.value }))} placeholder="01XXX-XXXXXX" /></Field>
                <Field label="Nagad Phone Number"><Input value={kycForm.nagad_number} onChange={(e) => setKycForm(s => ({ ...s, nagad_number: e.target.value }))} placeholder="01XXX-XXXXXX" /></Field>
              </div>

              <Field label="Folio Notes"><Textarea value={kycForm.notes} onChange={(e) => setKycForm(s => ({ ...s, notes: e.target.value }))} /></Field>

              {/* Fee Schedule Inline List */}
              <h4 className="form-section-title">Configure Charges (Folio Fees)</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {kycForm.fees.map((fee, idx) => (
                  <div key={idx} className="card" style={{ padding: 12, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ flex: 2 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)' }}>Fee Name</label>
                        <Input value={fee.fee_name} onChange={(e) => {
                          const list = [...kycForm.fees]; list[idx].fee_name = e.target.value;
                          setKycForm(s => ({ ...s, fees: list }));
                        }} />
                      </div>
                      <div style={{ flex: 2 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)' }}>Trigger</label>
                        <Select value={fee.fee_trigger} onChange={(e) => {
                          const list = [...kycForm.fees]; list[idx].fee_trigger = e.target.value;
                          setKycForm(s => ({ ...s, fees: list }));
                        }}>
                          <option value="manual">Manual</option>
                          <option value="first_rent">First Rent Receipt</option>
                          <option value="rental_receipt">Rental Receipt</option>
                          <option value="invoice_receipt">Invoice Receipt</option>
                          <option value="renewal">Agreement Renewal</option>
                          <option value="statement_period">Statement Period</option>
                        </Select>
                      </div>
                      <div style={{ flex: 1.5 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)' }}>Type</label>
                        <Select value={fee.amount_type} onChange={(e) => {
                          const list = [...kycForm.fees]; list[idx].amount_type = e.target.value;
                          setKycForm(s => ({ ...s, fees: list }));
                        }}>
                          <option value="percentage">% Percent</option>
                          <option value="fixed">৳ Fixed Amount</option>
                        </Select>
                      </div>
                      <div style={{ flex: 1.5 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)' }}>Amount</label>
                        <Input type="number" value={fee.amount_value} onChange={(e) => {
                          const list = [...kycForm.fees]; list[idx].amount_value = parseFloat(e.target.value) || 0;
                          setKycForm(s => ({ ...s, fees: list }));
                        }} />
                      </div>
                      <div style={{ alignSelf: 'flex-end', paddingBottom: 4 }}>
                        <button type="button" className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => {
                          setKycForm(s => ({ ...s, fees: s.fees.filter((_, i) => i !== idx) }));
                        }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" size="sm" variant="ghost" icon={PlusCircle} onClick={() => {
                  setKycForm(s => ({
                    ...s,
                    fees: [...s.fees, { fee_name: 'New Fee Charge', fee_category: 'Agency fee', fee_trigger: 'manual', amount_type: 'percentage', amount_value: 0 }]
                  }));
                }}>
                  Add Custom Fee Template
                </Button>
              </div>

            </div>
          </Drawer>
        )}

        {/* 2. Register New Tenant Agreement Drawer */}
        {showTenancyDrawer && (
          <Drawer title="New Rental Tenancy Agreement" onClose={() => setShowTenancyDrawer(false)}
            footer={
              <>
                <Button variant="ghost" onClick={() => setShowTenancyDrawer(false)}>Cancel</Button>
                <Button onClick={saveTenancy} disabled={saving}>{saving ? <Spinner /> : 'Register Agreement'}</Button>
              </>
            }>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Property Title" full>
                <Input value={prop.title} disabled />
              </Field>

              <Field label="Tenant Profile Contact" required>
                <Combo endpoint="/contacts" labelFn={contactLabel} value={tenancyForm.tenant_contact_id} onChange={(v) => setTenancyForm(s => ({ ...s, tenant_contact_id: v }))} placeholder="Search contact name..." />
              </Field>

              <div className="form-grid">
                <Field label="Lease Start"><Input type="date" value={tenancyForm.lease_start} onChange={(e) => setTenancyForm(s => ({ ...s, lease_start: e.target.value }))} /></Field>
                <Field label="Move In Date"><Input type="date" value={tenancyForm.move_in_date} onChange={(e) => setTenancyForm(s => ({ ...s, move_in_date: e.target.value }))} /></Field>
                <Field label="Lease End Date"><Input type="date" value={tenancyForm.lease_end} onChange={(e) => setTenancyForm(s => ({ ...s, lease_end: e.target.value }))} /></Field>
                <Field label="Move Out Date"><Input type="date" value={tenancyForm.move_out_date} onChange={(e) => setTenancyForm(s => ({ ...s, move_out_date: e.target.value }))} /></Field>
              </div>

              <div className="form-grid">
                <Field label="Security Deposit (Advance) (৳)" required>
                  <Input type="number" value={tenancyForm.security_deposit} onChange={(e) => setTenancyForm(s => ({ ...s, security_deposit: e.target.value }))} placeholder="Advance security money..." />
                </Field>
                <Field label="Monthly Rent Amount (৳)" required>
                  <Input type="number" value={tenancyForm.monthly_rent} onChange={(e) => setTenancyForm(s => ({ ...s, monthly_rent: e.target.value }))} />
                </Field>
                <Field label="Service Charge (৳)">
                  <Input type="number" value={tenancyForm.service_charge} onChange={(e) => setTenancyForm(s => ({ ...s, service_charge: e.target.value }))} />
                </Field>
                <Field label="Rent Due Day of Month">
                  <Input type="number" min="1" max="28" value={tenancyForm.rent_due_day} onChange={(e) => setTenancyForm(s => ({ ...s, rent_due_day: parseInt(e.target.value, 10) }))} />
                </Field>
              </div>

              <Field label="Payment Frequency">
                <Select value={tenancyForm.payment_frequency} onChange={(e) => setTenancyForm(s => ({ ...s, payment_frequency: e.target.value }))}>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="half_yearly">Half Yearly</option>
                  <option value="yearly">Yearly</option>
                </Select>
              </Field>

              <Field label="Internal Tenancy Notes"><Textarea value={tenancyForm.notes} onChange={(e) => setTenancyForm(s => ({ ...s, notes: e.target.value }))} /></Field>
            </div>
          </Drawer>
        )}

        {/* 3. Document Link / Upload Dialog Drawer */}
        {showDocDrawer && (
          <Drawer title="Upload Document File" onClose={() => setShowDocDrawer(false)}
            footer={
              <>
                <Button variant="ghost" onClick={() => setShowDocDrawer(false)}>Cancel</Button>
                <Button onClick={saveDocument} disabled={saving}>{saving ? <Spinner /> : 'Save Document'}</Button>
              </>
            }>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Document Name / Title" required>
                <Input value={docForm.title} onChange={(e) => setDocForm(s => ({ ...s, title: e.target.value }))} placeholder="e.g. Utility Bills, Tenancy Payslips, Agreement scan..." />
              </Field>

              <Field label="File Name">
                <Input value={docForm.file_name} onChange={(e) => setDocForm(s => ({ ...s, file_name: e.target.value }))} placeholder="e.g. rent-receipt.pdf" />
              </Field>

              <Field label="Document File URL" required>
                <Input value={docForm.file_url} onChange={(e) => setDocForm(s => ({ ...s, file_url: e.target.value }))} placeholder="Paste hosted file URL (pdf, png, jpg)..." />
              </Field>

              <div className="form-grid">
                <Field label="Document Category">
                  <Select value={docForm.doc_type} onChange={(e) => setDocForm(s => ({ ...s, doc_type: e.target.value }))}>
                    <option value="agreement">Lease Agreement</option>
                    <option value="invoice">Invoice Receipt</option>
                    <option value="statement">Financial Statement</option>
                    <option value="payslip">Tenant Payslip</option>
                    <option value="bill">Utility Bill</option>
                    <option value="other">Other Document</option>
                  </Select>
                </Field>
                <Field label="Access Level">
                  <Select value={docForm.is_private ? 'private' : 'public'} onChange={(e) => setDocForm(s => ({ ...s, is_private: e.target.value === 'private' }))}>
                    <option value="private">Private (Staff only)</option>
                    <option value="public">Shared (Show to Owner/Tenant)</option>
                  </Select>
                </Field>
              </div>
            </div>
          </Drawer>
        )}

      </div>
    );
  }

  return (
    <>
      <PageHead 
        title="Rental Properties" 
        desc="Bangladesh property care & rental folios. Track advanced security deposits, automate owner commissions, and manage tenancy ledgers." 
        actions={
          <Button icon={Plus} onClick={() => setShowCreateModal(true)}>New Rental Property</Button>
        }
      />

      {/* Tabs list with counts */}
      <div className="tabs">
        {tabs.map((tab) => (
          <button 
            key={tab.key} 
            className={`tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-pad" style={{ padding: 14 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <SearchInput 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Search by code, title, area, district..." 
            />
          </div>
        </div>
      </div>

      {/* Properties Table */}
      <div className="card">
        <DataTable 
          columns={columns} 
          rows={rows} 
          loading={loading} 
          onRowClick={handleRowClick} 
        />
      </div>
      {/* 4. New Rental Property Register Modal */}
      {showCreateModal && (
        <Drawer 
          title="Register New Rental Property" 
          onClose={() => setShowCreateModal(false)}
          width={720}
          footer={
            <>
              <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button onClick={saveProperty} disabled={saving}>
                {saving ? <Spinner /> : 'Register Property'}
              </Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-grid">
              <Field label="Property Title" required>
                <Input 
                  value={createForm.title} 
                  onChange={(e) => setCreateForm(s => ({ ...s, title: e.target.value }))} 
                  placeholder="e.g. Gulshan Deluxe Apt 4B" 
                />
              </Field>
              <Field label="Property Category" required>
                <Select 
                  value={createForm.category} 
                  onChange={(e) => setCreateForm(s => ({ ...s, category: e.target.value }))}
                >
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="rural">Rural</option>
                  <option value="business">Business</option>
                </Select>
              </Field>
            </div>

            <div className="form-grid">
              <Field label="Standard Monthly Rent (৳)">
                <Input 
                  type="number" 
                  value={createForm.price} 
                  onChange={(e) => setCreateForm(s => ({ ...s, price: e.target.value }))} 
                  placeholder="e.g. 45000" 
                />
              </Field>
              <Field label="Furnishing State">
                <Select 
                  value={createForm.furnishing} 
                  onChange={(e) => setCreateForm(s => ({ ...s, furnishing: e.target.value }))}
                >
                  <option value="unfurnished">Unfurnished</option>
                  <option value="semi_furnished">Semi Furnished</option>
                  <option value="furnished">Furnished</option>
                </Select>
              </Field>
            </div>

            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <Field label="Bedrooms">
                <Input 
                  type="number" 
                  value={createForm.bedrooms} 
                  onChange={(e) => setCreateForm(s => ({ ...s, bedrooms: e.target.value }))} 
                />
              </Field>
              <Field label="Bathrooms">
                <Input 
                  type="number" 
                  value={createForm.bathrooms} 
                  onChange={(e) => setCreateForm(s => ({ ...s, bathrooms: e.target.value }))} 
                />
              </Field>
              <Field label="Parking Spaces">
                <Input 
                  type="number" 
                  value={createForm.parking} 
                  onChange={(e) => setCreateForm(s => ({ ...s, parking: e.target.value }))} 
                />
              </Field>
            </div>

            <div className="form-grid">
              <Field label="Building Size (sqft)">
                <Input 
                  value={createForm.building_size} 
                  onChange={(e) => setCreateForm(s => ({ ...s, building_size: e.target.value }))} 
                  placeholder="e.g. 1650" 
                />
              </Field>
              <Field label="Floor Level">
                <Input 
                  value={createForm.floor_number} 
                  onChange={(e) => setCreateForm(s => ({ ...s, floor_number: e.target.value }))} 
                  placeholder="e.g. 4th" 
                />
              </Field>
            </div>

            <Field label="Address / Street Details">
              <Input 
                value={createForm.address} 
                onChange={(e) => setCreateForm(s => ({ ...s, address: e.target.value }))} 
                placeholder="Road 12, House 45..." 
              />
            </Field>

            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <Field label="Area">
                <Input 
                  value={createForm.area} 
                  onChange={(e) => setCreateForm(s => ({ ...s, area: e.target.value }))} 
                  placeholder="e.g. Gulshan 2" 
                />
              </Field>
              <Field label="City">
                <Input 
                  value={createForm.city} 
                  onChange={(e) => setCreateForm(s => ({ ...s, city: e.target.value }))} 
                  placeholder="e.g. Dhaka" 
                />
              </Field>
              <Field label="District">
                <Input 
                  value={createForm.district} 
                  onChange={(e) => setCreateForm(s => ({ ...s, district: e.target.value }))} 
                  placeholder="e.g. Dhaka" 
                />
              </Field>
            </div>

            <Field label="Owner / Landlord">
              <Combo endpoint="/contacts" labelFn={contactLabel} value={createForm.owner_contact_id} onChange={(v) => setCreateForm(s => ({ ...s, owner_contact_id: v }))} placeholder="Link owner contact (optional)…" />
            </Field>

            <h4 className="form-section-title">Rental Management Setup</h4>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <Field label="Occupancy Status">
                <Select value={createForm.occupancy_status} onChange={(e) => setCreateForm(s => ({ ...s, occupancy_status: e.target.value }))}>
                  <option value="vacant">Vacant</option>
                  <option value="occupied">Occupied</option>
                  <option value="caretaker">Caretaker</option>
                  <option value="notice_period">Notice Period</option>
                </Select>
              </Field>
              <Field label="Utilities Active?">
                <Select value={createForm.utilities_active ? 'yes' : 'no'} onChange={(e) => setCreateForm(s => ({ ...s, utilities_active: e.target.value === 'yes' }))}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </Select>
              </Field>
              <Field label="Property Condition">
                <Input value={createForm.property_condition} onChange={(e) => setCreateForm(s => ({ ...s, property_condition: e.target.value }))} placeholder="Good / Needs cleaning…" />
              </Field>
            </div>

            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <Field label="Market Rent Min (৳)"><Input type="number" value={createForm.market_rent_min} onChange={(e) => setCreateForm(s => ({ ...s, market_rent_min: e.target.value }))} /></Field>
              <Field label="Market Rent Max (৳)"><Input type="number" value={createForm.market_rent_max} onChange={(e) => setCreateForm(s => ({ ...s, market_rent_max: e.target.value }))} /></Field>
              <Field label="Approved Monthly Rent (৳)"><Input type="number" value={createForm.approved_monthly_rent} onChange={(e) => setCreateForm(s => ({ ...s, approved_monthly_rent: e.target.value }))} /></Field>
            </div>

            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <Field label="Rent Due Day"><Input type="number" min="1" max="28" value={createForm.rent_due_day} onChange={(e) => setCreateForm(s => ({ ...s, rent_due_day: e.target.value }))} /></Field>
              <Field label="Management Fee %"><Input type="number" step="0.5" value={createForm.management_fee_pct} onChange={(e) => setCreateForm(s => ({ ...s, management_fee_pct: e.target.value }))} /></Field>
              <Field label="Min Lease (months)"><Input type="number" value={createForm.lease_min_period_months} onChange={(e) => setCreateForm(s => ({ ...s, lease_min_period_months: e.target.value }))} /></Field>
            </div>

            <div className="form-grid">
              <Field label="Access Contact"><Input value={createForm.access_contact} onChange={(e) => setCreateForm(s => ({ ...s, access_contact: e.target.value }))} placeholder="Owner / caretaker / key holder" /></Field>
              <Field label="Listing Status">
                <Select value={createForm.listing_status} onChange={(e) => setCreateForm(s => ({ ...s, listing_status: e.target.value }))}>
                  <option value="not_listed">Not Listed</option>
                  <option value="drafting">Drafting</option>
                  <option value="live">Live</option>
                  <option value="paused">Paused</option>
                  <option value="let">Let</option>
                </Select>
              </Field>
            </div>

            <Field label="Property Description">
              <Textarea
                value={createForm.description}
                onChange={(e) => setCreateForm(s => ({ ...s, description: e.target.value }))}
                placeholder="Describe the property condition, key features, availability details..."
                rows={3}
              />
            </Field>

            <Field label="Remarks (internal)">
              <Textarea value={createForm.remarks} onChange={(e) => setCreateForm(s => ({ ...s, remarks: e.target.value }))} rows={2} placeholder="Internal remarks / preparation notes…" />
            </Field>

            <div className="card-pad" style={{ background: 'var(--primary-50)', border: '1px solid var(--primary-100)', borderRadius: 8, padding: '10px 14px', fontSize: 12.5, color: 'var(--primary-900)' }}>
              <Info size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              On save, a rental-management workflow (18 SOP stages) and owner onboarding checklist are generated automatically for this property.
            </div>
          </div>
        </Drawer>
      )}
    </>
  );
}

// Simple missing Lucide icon fallback
function ExternalLinkIcon({ size = 16 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-external-link">
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

function FileSignatureIcon({ size = 16 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-signature">
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 18l2-2 2 2 4-4" />
      <path d="M20 10.5V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8l6 6" />
    </svg>
  );
}
