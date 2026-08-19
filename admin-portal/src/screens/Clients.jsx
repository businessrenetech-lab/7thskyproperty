import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Activity, ArrowLeft, Building2, Calendar, CheckCircle2, ChevronRight, Crown,
  DollarSign, ExternalLink, FileCheck2, FileText, Globe2, Mail, MapPin, MessageSquare,
  Pencil, Phone, Plus, Receipt, ShieldCheck, Sparkles, Trash2, User, UserCheck,
  UserPlus, Users, WalletCards, Wrench, CreditCard, Send, Lock, Shield
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Badge, Button, DataTable, Drawer, EmptyState, Field, Input, PageHead,
  SearchInput, Select, Spinner, StatusBadge, Textarea
} from '../ui/kit';
import FileUpload, { fileSrc } from '../ui/FileUpload';

const ROLE_TABS = [
  { key: '', label: 'All Clients' },
  { key: 'buyer', label: 'Buyers' },
  { key: 'seller', label: 'Sellers' },
  { key: 'landlord', label: 'Landlords' },
  { key: 'tenant', label: 'Tenants' },
  { key: 'service', label: 'Service Care' },
  { key: 'nrb', label: 'NRB Clients' },
];

const ROLE_FIELDS = [
  ['is_buyer', 'Buyer'],
  ['is_seller', 'Seller'],
  ['is_landlord', 'Landlord'],
  ['is_tenant', 'Tenant'],
  ['is_service_client', 'Service Care'],
  ['is_nrb_client', 'NRB Client'],
];

const money = (value) => `৳${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (value) => (value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

const getInitials = (name) => {
  if (!name) return 'CL';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

// Executive High-Density KPI Card
const CompactKpi = ({ icon: Icon, label, value, tone = 'blue', sub }) => {
  const tones = {
    blue: { bg: 'linear-gradient(135deg, #f0f7ff 0%, #e0f2fe 100%)', border: '#bae6fd', iconBg: '#0284c7', text: '#0369a1' },
    green: { bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '#bbf7d0', iconBg: '#16a34a', text: '#15803d' },
    amber: { bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '#fde68a', iconBg: '#d97706', text: '#b45309' },
    sky: { bg: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', border: '#e2e8f0', iconBg: '#475569', text: '#334155' },
  }[tone] || tones.blue;

  return (
    <div style={{
      background: tones.bg,
      border: `1px solid ${tones.border}`,
      borderRadius: 12,
      padding: '10px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      boxShadow: '0 1px 3px rgba(13,27,47,0.04)',
    }}>
      <div style={{
        width: 36,
        height: 36,
        borderRadius: 9,
        background: tones.iconBg,
        color: '#ffffff',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
      }}>
        <Icon size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)' }}>
          {label}
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.2, marginTop: 1, fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>}
      </div>
    </div>
  );
};

// Compact Key-Value Row with Lucide Icon
const InfoRow = ({ icon: Icon, label, value, isCode }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderRadius: 8,
    background: 'var(--surface-2)',
    border: '1px solid var(--line-soft)',
    fontSize: 12.5
  }}>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: 'var(--muted)', fontWeight: 600 }}>
      {Icon && <Icon size={14} style={{ color: 'var(--cyan)' }} />}
      {label}
    </span>
    <span style={{ fontWeight: 700, color: 'var(--ink)', textAlign: 'right' }}>
      {isCode ? <span className="code-chip" style={{ fontSize: 11, padding: '2px 7px' }}>{value}</span> : (value || '—')}
    </span>
  </div>
);

const roleBadges = (client) => (
  <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
    {ROLE_FIELDS.filter(([key]) => client[key]).map(([key, label]) => (
      <Badge
        key={key}
        tone={
          key === 'is_landlord' ? 'green' :
          key === 'is_tenant' ? 'amber' :
          key === 'is_service_client' ? 'sky' :
          key === 'is_nrb_client' ? 'blue' : 'grey'
        }
      >
        {label}
      </Badge>
    ))}
  </div>
);

export default function Clients() {
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('');
  const [segment, setSegment] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [createDrawer, setCreateDrawer] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (role) params.set('role', role);
      if (segment) params.set('segment', segment);
      if (search) params.set('search', search);
      const { data } = await api.get(`/clients?${params}`);
      setRows(data.data || []);
      setTotal(data.pagination?.total || 0);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load clients list');
    } finally {
      setLoading(false);
    }
  }, [role, segment, search, toast]);

  const loadDetail = useCallback(async (id) => {
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/clients/${id}`);
      setDetail(data);
      setSelectedId(Number(id));
      return data;
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load client profile');
      return null;
    } finally {
      setDetailLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Deep link handling: /clients?client=<id> or /clients?contact=<contact_id>
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const clientId = params.get('client') || params.get('id');
    const contactId = params.get('contact');
    if (clientId) {
      loadDetail(clientId);
    } else if (contactId) {
      api.get(`/clients?contact_id=${contactId}`).then(({ data }) => {
        if (data.data && data.data.length > 0) {
          loadDetail(data.data[0].id);
        } else {
          toast.error('No client profile found for this contact');
        }
      }).catch(() => {});
    }
  }, [location.search, loadDetail, toast]);

  const stats = useMemo(() => ({
    active: rows.filter((row) => row.status === 'active').length,
    vip: rows.filter((row) => row.client_segment === 'vip').length,
    priority: rows.filter((row) => row.client_segment === 'priority').length,
    portal: rows.filter((row) => row.portal_enabled).length,
  }), [rows]);

  if (selectedId) {
    return (
      <ClientWorkspace
        detail={detail}
        loading={detailLoading}
        onBack={() => {
          setSelectedId(null);
          setDetail(null);
          navigate('/clients', { replace: true });
          load();
        }}
        reload={() => loadDetail(selectedId)}
      />
    );
  }

  const columns = [
    {
      key: 'client_info',
      header: 'Client Profile',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="pm-avatar" style={{
            width: 32, height: 32, borderRadius: 8, fontSize: 11, fontWeight: 800,
            background: 'linear-gradient(135deg, #0ea5e9, #0284c7)'
          }}>
            {getInitials(row.Contact?.full_name)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="code-chip" style={{ fontSize: 11, padding: '1px 6px' }}>{row.client_code}</span>
              {row.Contact?.company_name && (
                <span className="cell-sub" style={{ fontSize: 11 }}>({row.Contact.company_name})</span>
              )}
            </div>
            <div className="cell-strong" style={{ marginTop: 2, fontSize: 13.5 }}>
              {row.Contact?.full_name || '—'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact Details',
      render: (row) => (
        <div style={{ fontSize: 12.5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Phone size={12} style={{ color: 'var(--cyan)' }} />
            <span>{row.Contact?.primary_phone || '—'}</span>
            {row.Contact?.whatsapp && <Badge tone="green" style={{ fontSize: 9, padding: '0px 4px' }}>WA</Badge>}
          </div>
          <div className="cell-sub" style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
            <Mail size={11} />
            <span>{row.Contact?.email || 'No email registered'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'roles',
      header: 'Roles & Relationships',
      render: roleBadges,
    },
    {
      key: 'segment',
      header: 'Segment',
      render: (row) => (
        <Badge tone={row.client_segment === 'vip' ? 'amber' : row.client_segment === 'priority' ? 'blue' : 'grey'}>
          {row.client_segment === 'vip' && <Crown size={11} style={{ marginRight: 3 }} />}
          {String(row.client_segment || 'standard').toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'location',
      header: 'District / Region',
      render: (row) => row.Contact?.district || row.Contact?.city || '—',
    },
    {
      key: 'portal',
      header: 'Portal Access',
      render: (row) => (
        row.portal_enabled ? (
          <Badge tone="green" dot>Active Login</Badge>
        ) : (
          <span className="cell-sub" style={{ fontSize: 12 }}>Not enabled</span>
        )
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div className="pm-scope">
      <div className="pm-head" style={{ marginBottom: 14 }}>
        <div>
          <div className="pm-eyebrow">Client Intelligence &amp; Care</div>
          <h1 style={{ fontSize: 22 }}>Client Directory</h1>
          <div className="pm-meta" style={{ fontSize: 12.5 }}>
            Unified 360° portfolio, legal agreements, property care history &amp; financials.
          </div>
        </div>
        <div className="pm-head-actions">
          <Button icon={UserPlus} className="btn-primary" size="sm" onClick={() => setCreateDrawer(true)}>
            Add New Client
          </Button>
        </div>
      </div>

      {/* High Density KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 14 }}>
        <CompactKpi icon={Users} label="Total Clients" value={total} tone="blue" />
        <CompactKpi icon={UserCheck} label="Active Clients" value={stats.active} tone="green" />
        <CompactKpi icon={Crown} label="VIP & Priority" value={stats.vip + stats.priority} tone="amber" />
        <CompactKpi icon={Globe2} label="Portal Users" value={stats.portal} tone="sky" />
      </div>

      {/* Filter & Search Toolbar */}
      <div className="card" style={{ marginBottom: 12, padding: '10px 14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 180px', gap: 10 }}>
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client name, phone, email, code or district…"
          />
          <Select value={segment} onChange={(e) => setSegment(e.target.value)} style={{ padding: '6px 10px', fontSize: 12.5 }}>
            <option value="">All Segments</option>
            <option value="vip">VIP Clients</option>
            <option value="priority">Priority Clients</option>
            <option value="standard">Standard Clients</option>
          </Select>
          <Select value={role} onChange={(e) => setRole(e.target.value)} style={{ padding: '6px 10px', fontSize: 12.5 }}>
            <option value="">All Roles</option>
            <option value="buyer">Buyers</option>
            <option value="seller">Sellers</option>
            <option value="landlord">Landlords</option>
            <option value="tenant">Tenants</option>
            <option value="service">Service Care</option>
            <option value="nrb">NRB</option>
          </Select>
        </div>
      </div>

      {/* Pill Filter Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, overflowX: 'auto' }}>
        {ROLE_TABS.map((tab) => (
          <button
            type="button"
            key={tab.key}
            onClick={() => setRole(tab.key)}
            style={{
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: role === tab.key ? 700 : 600,
              borderRadius: 20,
              border: role === tab.key ? '1px solid var(--cyan)' : '1px solid var(--line)',
              background: role === tab.key ? 'var(--cyan-weak)' : 'var(--surface)',
              color: role === tab.key ? 'var(--navy)' : 'var(--muted)',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          onRowClick={(row) => loadDetail(row.id)}
        />
        <div className="pagination" style={{ padding: '10px 16px', fontSize: 12 }}>
          <span>Showing {rows.length} of {total} client records</span>
          <span className="cell-sub">Click any row to open full 360° client workspace</span>
        </div>
      </div>

      {createDrawer && (
        <CreateClientDrawer
          onClose={() => setCreateDrawer(false)}
          onSuccess={async (newId) => {
            setCreateDrawer(false);
            await load();
            if (newId) await loadDetail(newId);
          }}
        />
      )}
    </div>
  );
}

function CreateClientDrawer({ onClose, onSuccess }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    primary_phone: '',
    company_name: '',
    district: 'Dhaka',
    client_segment: 'standard',
    is_buyer: false,
    is_seller: false,
    is_landlord: false,
    is_tenant: false,
    is_service_client: false,
    is_nrb_client: false,
    notes: '',
  });

  const save = async () => {
    if (!form.full_name.trim()) return toast.error('Client full name is required');
    setBusy(true);
    try {
      const { data } = await api.post('/clients', form);
      toast.success(data.message || 'New client added');
      onSuccess(data.data?.id);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create client profile');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      title="Add New Client Profile"
      width={640}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy} size="sm" className="btn-primary">
            {busy ? <Spinner /> : 'Create Client Profile'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Full Name" required>
          <Input
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            placeholder="e.g. Sayem Ahmed"
          />
        </Field>
        <Field label="Company / Business Name">
          <Input
            value={form.company_name}
            onChange={(e) => setForm({ ...form, company_name: e.target.value })}
            placeholder="e.g. Apex Holdings Ltd"
          />
        </Field>
        <Field label="Primary Phone">
          <Input
            value={form.primary_phone}
            onChange={(e) => setForm({ ...form, primary_phone: e.target.value })}
            placeholder="+8801700000000"
          />
        </Field>
        <Field label="Email Address">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="client@example.com"
          />
        </Field>
        <Field label="District / Region">
          <Input
            value={form.district}
            onChange={(e) => setForm({ ...form, district: e.target.value })}
            placeholder="Dhaka"
          />
        </Field>
        <Field label="Client Segment">
          <Select
            value={form.client_segment}
            onChange={(e) => setForm({ ...form, client_segment: e.target.value })}
          >
            <option value="standard">Standard</option>
            <option value="priority">Priority</option>
            <option value="vip">VIP</option>
          </Select>
        </Field>
      </div>

      <div className="form-section-title" style={{ margin: '14px 0 8px', fontSize: 13, fontWeight: 700 }}>Client Role Relationships</div>
      <div className="wrap-gap" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {ROLE_FIELDS.map(([key, label]) => (
          <label key={key} className="card" style={{ padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
            <input
              type="checkbox"
              checked={!!form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
            />
            <span style={{ fontWeight: 600 }}>{label}</span>
          </label>
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        <Field label="Initial Relationship Notes">
          <Textarea
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Record client preferences, property requirements or background info…"
          />
        </Field>
      </div>
    </Drawer>
  );
}

function ClientWorkspace({ detail, loading, onBack, reload }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [drawer, setDrawer] = useState('');
  const [busy, setBusy] = useState(false);

  const client = detail?.data;
  const contact = client?.Contact;
  const summary = detail?.summary || {};

  const [edit, setEdit] = useState({});
  const [message, setMessage] = useState({ channel: 'email', subject: '', body: '', send_now: true });
  const [document, setDocument] = useState({ doc_type: 'national_id', title: '', file_url: '', expiry_date: '' });
  const [portal, setPortal] = useState({ email: '', password: '', role: 'buyer' });

  useEffect(() => {
    if (!client) return;
    setEdit({
      full_name: contact?.full_name || '',
      company_name: contact?.company_name || '',
      email: contact?.email || '',
      primary_phone: contact?.primary_phone || '',
      whatsapp: contact?.whatsapp || '',
      address_line1: contact?.address_line1 || '',
      area: contact?.area || '',
      city: contact?.city || '',
      district: contact?.district || '',
      national_id: contact?.national_id || '',
      passport_no: contact?.passport_no || '',
      tin: contact?.tin || '',
      preferred_contact_method: contact?.preferred_contact_method || 'phone',
      client_segment: client.client_segment,
      status: client.status,
      notes: client.notes || '',
      ...Object.fromEntries(ROLE_FIELDS.map(([key]) => [key, !!client[key]])),
    });
    setPortal((curr) => ({ ...curr, email: contact?.email || '' }));
  }, [client, contact]);

  if (loading || !detail) {
    return (
      <div className="pm-scope" style={{ padding: 60, textAlign: 'center' }}>
        <Spinner />
        <div style={{ marginTop: 10, color: 'var(--muted)', fontSize: 13 }}>Loading 360° Client Workspace…</div>
      </div>
    );
  }

  const contactDocs = contact?.documents || [];
  const kycDocs = detail?.kycDocuments || [];
  const allDocuments = [...contactDocs, ...kycDocs];
  const tenancies = detail?.tenancies || [];
  const careWorkOrders = detail?.careWorkOrders || [];
  const amcContracts = detail?.amcContracts || [];
  const careEnquiries = detail?.careEnquiries || [];
  const invoices = detail?.invoices || [];
  const payments = detail?.payments || [];
  const communications = detail?.communications || [];

  const saveProfile = async () => {
    setBusy(true);
    try {
      await Promise.all([
        api.put(`/contacts/${contact.id}`, {
          full_name: edit.full_name,
          company_name: edit.company_name,
          email: edit.email,
          primary_phone: edit.primary_phone,
          whatsapp: edit.whatsapp,
          address_line1: edit.address_line1,
          area: edit.area,
          city: edit.city,
          district: edit.district,
          national_id: edit.national_id,
          passport_no: edit.passport_no,
          tin: edit.tin,
          preferred_contact_method: edit.preferred_contact_method,
        }),
        api.put(`/clients/${client.id}`, {
          client_segment: edit.client_segment,
          status: edit.status,
          notes: edit.notes,
          ...Object.fromEntries(ROLE_FIELDS.map(([key]) => [key, !!edit[key]])),
        }),
      ]);
      toast.success('Client profile & KYC details updated');
      setDrawer('');
      await reload();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Profile update failed');
    } finally {
      setBusy(false);
    }
  };

  const sendMessage = async () => {
    if (!message.body.trim() && !message.subject.trim()) {
      return toast.error('Please enter a subject or message');
    }
    setBusy(true);
    try {
      const { data } = await api.post(`/clients/${client.id}/communications`, message);
      toast.success(data.message || 'Activity logged');
      setMessage({ channel: 'email', subject: '', body: '', send_now: true });
      setDrawer('');
      await reload();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to log communication');
    } finally {
      setBusy(false);
    }
  };

  const addDocument = async () => {
    if (!document.file_url) return toast.error('Please upload a document file');
    setBusy(true);
    try {
      await api.post(`/contacts/${contact.id}/documents`, document);
      toast.success('Client document saved');
      setDocument({ doc_type: 'national_id', title: '', file_url: '', expiry_date: '' });
      setDrawer('');
      await reload();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Document save failed');
    } finally {
      setBusy(false);
    }
  };

  const removeDocument = async (id) => {
    try {
      await api.delete(`/contacts/${contact.id}/documents/${id}`);
      toast.success('Document deleted');
      await reload();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not delete document');
    }
  };

  const enablePortal = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/clients/${client.id}/portal-access`, {
        ...portal,
        name: contact?.full_name,
      });
      toast.success(data.message || 'Portal access enabled');
      setDrawer('');
      await reload();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not enable portal access');
    } finally {
      setBusy(false);
    }
  };

  const invoiceColumns = [
    { key: 'invoice_code', header: 'Invoice Code', render: (row) => <span className="code-chip">{row.invoice_code}</span> },
    {
      key: 'title',
      header: 'Description',
      render: (row) => (
        <div>
          <div className="cell-strong" style={{ fontSize: 13 }}>{row.title || row.invoice_type || 'Property Invoice'}</div>
          <div className="cell-sub" style={{ fontSize: 11 }}>Issued {date(row.issue_date)} · Due {date(row.due_date)}</div>
        </div>
      ),
    },
    { key: 'total', header: 'Total Invoiced', render: (row) => money(row.total) },
    { key: 'balance', header: 'Balance Due', render: (row) => <b>{money(row.balance)}</b> },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  const paymentColumns = [
    { key: 'payment_code', header: 'Payment Ref', render: (row) => <span className="code-chip">{row.payment_code}</span> },
    { key: 'paid_at', header: 'Date', render: (row) => date(row.paid_at) },
    {
      key: 'direction',
      header: 'Direction',
      render: (row) => <Badge tone={row.direction === 'incoming' ? 'green' : 'amber'}>{row.direction}</Badge>,
    },
    { key: 'method', header: 'Payment Method', render: (row) => String(row.method || '—').replace('_', ' ') },
    { key: 'amount', header: 'Amount', render: (row) => <b style={{ color: 'var(--good)' }}>{money(row.amount)}</b> },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <div className="pm-scope">
      <div style={{ marginBottom: 10 }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 8,
            border: '1px solid var(--line)',
            background: 'var(--surface)',
            color: 'var(--muted)',
            fontSize: 12,
            fontWeight: 650,
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={13} /> Back to Directory
        </button>
      </div>

      {/* Executive Command Header Banner */}
      <div className="card" style={{
        padding: '14px 18px',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        border: '1px solid var(--line)',
        borderLeft: '5px solid var(--cyan)',
        borderRadius: 14,
        boxShadow: '0 2px 8px rgba(13,27,47,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="pm-avatar" style={{
              width: 44, height: 44, borderRadius: 12, fontSize: 16, fontWeight: 800,
              background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', boxShadow: '0 3px 10px rgba(14,165,233,0.3)'
            }}>
              {getInitials(contact?.full_name)}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span className="code-chip" style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px' }}>{client.client_code}</span>
                <StatusBadge status={client.status} />
                {client.client_segment === 'vip' && <Badge tone="amber"><Crown size={11} style={{ marginRight: 3 }} /> VIP</Badge>}
                {client.client_segment === 'priority' && <Badge tone="blue">Priority</Badge>}
                {contact?.is_nrb && <Badge tone="sky">NRB</Badge>}
                {roleBadges(client)}
              </div>

              <h2 style={{ margin: '4px 0 2px', fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>
                {contact?.full_name || 'Client Workspace'}
                {contact?.company_name && (
                  <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500, marginLeft: 6 }}>
                    ({contact.company_name})
                  </span>
                )}
              </h2>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap' }}>
                {contact?.primary_phone && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Phone size={12} style={{ color: 'var(--cyan)' }} /> {contact.primary_phone}
                  </span>
                )}
                {contact?.email && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Mail size={12} style={{ color: 'var(--cyan)' }} /> {contact.email}
                  </span>
                )}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={12} style={{ color: 'var(--muted)' }} /> {[contact?.area, contact?.city, contact?.district].filter(Boolean).join(', ') || 'Dhaka'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="ghost" size="sm" icon={Pencil} onClick={() => setDrawer('edit')}>
              Edit Profile
            </Button>
            <Button variant="ghost" size="sm" icon={Mail} onClick={() => setDrawer('message')}>
              Contact
            </Button>
            {!client.portal_enabled && (
              <Button size="sm" icon={Globe2} className="btn-primary" onClick={() => setDrawer('portal')}>
                Enable Portal
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 4-Column Executive KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, margin: '12px 0' }}>
        <CompactKpi
          icon={Receipt}
          label="Total Invoiced"
          value={money(summary.invoice_total)}
          tone="blue"
        />
        <CompactKpi
          icon={WalletCards}
          label="Outstanding Balance"
          value={money(summary.outstanding_total)}
          tone={Number(summary.outstanding_total) > 0 ? 'amber' : 'green'}
        />
        <CompactKpi
          icon={UserCheck}
          label="Payments Received"
          value={money(summary.received_total)}
          tone="green"
        />
        <CompactKpi
          icon={Building2}
          label="Holdings &amp; Care"
          value={`${summary.tenancies || 0} Leases`}
          sub={`${summary.work_orders || 0} Work Orders`}
          tone="sky"
        />
      </div>

      {/* Modern Segmented Navigation Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: 4,
        background: 'var(--surface-3)',
        borderRadius: 12,
        border: '1px solid var(--line)',
        marginBottom: 14,
        overflowX: 'auto'
      }}>
        {[
          { key: 'overview', label: 'Overview', icon: Activity },
          { key: 'properties', label: 'Properties & Leases', icon: Building2, count: tenancies.length + amcContracts.length },
          { key: 'care', label: 'Work Orders & Care', icon: Wrench, count: careWorkOrders.length + careEnquiries.length },
          { key: 'accounting', label: 'Financials & Invoices', icon: Receipt, count: invoices.length },
          { key: 'kyc', label: 'Agreements & KYC', icon: FileCheck2, count: allDocuments.length },
          { key: 'activity', label: 'Timeline & History', icon: MessageSquare, count: communications.length },
          { key: 'portal', label: 'Portal & Security', icon: ShieldCheck },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: active ? 700 : 600,
                color: active ? 'var(--navy)' : 'var(--muted)',
                background: active ? '#ffffff' : 'transparent',
                borderRadius: 8,
                border: 'none',
                boxShadow: active ? '0 1px 3px rgba(13,27,47,0.08)' : 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={14} color={active ? 'var(--cyan)' : 'currentColor'} />
              <span>{t.label}</span>
              {t.count > 0 && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 10,
                  background: active ? 'var(--cyan-weak)' : 'var(--surface-2)',
                  color: active ? 'var(--navy)' : 'var(--muted-2)'
                }}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {tab === 'overview' && (
        <div className="pm-grid" style={{ gridTemplateColumns: '1.1fr 0.9fr', gap: 12 }}>
          <div className="pm-col">
            <section className="pm-card">
              <div className="pm-card-h" style={{ padding: '12px 16px' }}>
                <div className="ic" style={{ width: 28, height: 28 }}><UserCheck size={16} /></div>
                <div>
                  <h3 style={{ fontSize: 13.5 }}>Identity &amp; Profile Summary</h3>
                  <div className="hsub" style={{ fontSize: 11 }}>Personal details, contact numbers &amp; tax KYC</div>
                </div>
              </div>
              <div className="pm-card-body" style={{ padding: '0 16px 14px', display: 'grid', gap: 6 }}>
                <InfoRow icon={User} label="Full Name" value={contact?.full_name} />
                <InfoRow icon={Building2} label="Company Name" value={contact?.company_name} />
                <InfoRow icon={Phone} label="Primary Phone" value={contact?.primary_phone} />
                <InfoRow icon={MessageSquare} label="WhatsApp" value={contact?.whatsapp} />
                <InfoRow icon={Mail} label="Email Address" value={contact?.email} />
                <InfoRow icon={Send} label="Preferred Channel" value={contact?.preferred_contact_method} />
                <InfoRow icon={MapPin} label="Registered Address" value={[contact?.address_line1, contact?.area, contact?.city, contact?.district].filter(Boolean).join(', ')} />
                <InfoRow icon={CreditCard} label="National ID (NID)" value={contact?.national_id} isCode />
                <InfoRow icon={FileText} label="Passport No." value={contact?.passport_no} isCode />
                <InfoRow icon={Receipt} label="TIN Number" value={contact?.tin} isCode />
              </div>
            </section>
          </div>

          <div className="pm-col" style={{ gap: 12 }}>
            <section className="pm-card">
              <div className="pm-card-h" style={{ padding: '12px 16px' }}>
                <div className="ic" style={{ width: 28, height: 28 }}><Building2 size={16} /></div>
                <div>
                  <h3 style={{ fontSize: 13.5 }}>Onboarding Role Profiles</h3>
                  <div className="hsub" style={{ fontSize: 11 }}>Active relationship roles &amp; agreements</div>
                </div>
              </div>
              <div className="pm-card-body" style={{ padding: '0 16px 14px' }}>
                {(detail.roleProfiles || []).length ? (
                  detail.roleProfiles.map((profile) => (
                    <div
                      key={profile.id}
                      onClick={() => navigate(`/role-onboarding?profile_id=${profile.id}`)}
                      style={{
                        padding: '10px 12px',
                        marginBottom: 6,
                        border: '1px solid var(--line)',
                        borderRadius: 8,
                        background: 'var(--surface-2)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <b style={{ textTransform: 'capitalize', fontSize: 13 }}>
                          {(profile.role_type || '').replace('_', ' ')}
                        </b>
                        <div className="cell-sub" style={{ fontSize: 11 }}>{profile.property?.title || 'General client relationship'}</div>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', gap: 4 }}>
                        <StatusBadge status={profile.status} />
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    icon={Building2}
                    title="No Role Profiles Yet"
                    sub="Role profiles created during onboarding will appear here."
                  />
                )}
              </div>
            </section>

            <section className="pm-card">
              <div className="pm-card-h" style={{ padding: '12px 16px' }}>
                <div className="ic" style={{ width: 28, height: 28 }}><Activity size={16} /></div>
                <div>
                  <h3 style={{ fontSize: 13.5 }}>Recent Timeline History</h3>
                  <div className="hsub" style={{ fontSize: 11 }}>Last recorded communications</div>
                </div>
              </div>
              <div className="pm-card-body" style={{ padding: '0 16px 14px' }}>
                {communications.slice(0, 4).length ? (
                  communications.slice(0, 4).map((item) => (
                    <div key={item.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--line-soft)', fontSize: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <b>{item.subject || item.channel}</b>
                        <span className="cell-sub" style={{ fontSize: 11 }}>{date(item.occurred_at)}</span>
                      </div>
                      <div className="cell-sub" style={{ marginTop: 2, fontSize: 11.5 }}>
                        {item.body ? (item.body.length > 70 ? item.body.slice(0, 70) + '…' : item.body) : 'No notes'}
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState icon={MessageSquare} title="No recent activity logged" />
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Tab 2: Properties & Tenancies */}
      {tab === 'properties' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <section className="pm-card">
            <div className="pm-card-h" style={{ padding: '12px 16px' }}>
              <div className="ic" style={{ width: 28, height: 28 }}><Building2 size={16} /></div>
              <div>
                <h3 style={{ fontSize: 14 }}>Tenancies &amp; Lease Holdings</h3>
                <div className="hsub" style={{ fontSize: 11 }}>Active and past property leases where client is tenant or landlord</div>
              </div>
            </div>
            {tenancies.length ? (
              <div className="pm-card-body" style={{ padding: '0 16px 14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                  {tenancies.map((ten) => (
                    <div key={ten.id} className="card" style={{ padding: 12, borderLeft: '4px solid var(--navy)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="code-chip" style={{ fontSize: 11 }}>{ten.tenancy_code}</span>
                        <StatusBadge status={ten.status} />
                      </div>
                      <h4 style={{ margin: '6px 0 2px', fontSize: 14, fontWeight: 700 }}>{ten.Property?.title || 'Property Lease'}</h4>
                      <div className="cell-sub" style={{ fontSize: 11.5 }}>{ten.Property?.address}, {ten.Property?.city}</div>
                      <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
                        <div>
                          <div className="cell-sub" style={{ fontSize: 11 }}>Monthly Rent</div>
                          <b>{money(ten.monthly_rent)}</b>
                        </div>
                        <div>
                          <div className="cell-sub" style={{ fontSize: 11 }}>Service Charge</div>
                          <b>{money(ten.service_charge)}</b>
                        </div>
                        <div>
                          <div className="cell-sub" style={{ fontSize: 11 }}>Lease Start</div>
                          <div>{date(ten.lease_start)}</div>
                        </div>
                        <div>
                          <div className="cell-sub" style={{ fontSize: 11 }}>Lease End</div>
                          <div>{date(ten.lease_end)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState icon={Building2} title="No tenancies found" sub="This client is not linked to any active lease records." />
            )}
          </section>

          <section className="pm-card">
            <div className="pm-card-h" style={{ padding: '12px 16px' }}>
              <div className="ic" style={{ width: 28, height: 28 }}><Wrench size={16} /></div>
              <div>
                <h3 style={{ fontSize: 14 }}>Annual Property Care (AMC) Contracts</h3>
                <div className="hsub" style={{ fontSize: 11 }}>Subscribed maintenance &amp; inspection packages</div>
              </div>
            </div>
            {amcContracts.length ? (
              <div className="pm-card-body" style={{ padding: '0 16px 14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                  {amcContracts.map((amc) => (
                    <div key={amc.id} className="card" style={{ padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="code-chip" style={{ fontSize: 11 }}>{amc.contract_code}</span>
                        <StatusBadge status={amc.status} />
                      </div>
                      <h4 style={{ margin: '6px 0 2px', fontSize: 13.5 }}>{amc.service_name || 'Property Maintenance Package'}</h4>
                      <div className="cell-sub" style={{ fontSize: 11.5 }}>{amc.site_address}</div>
                      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span>Annual: <b>{money(amc.annual_value)}</b></span>
                        <span>Visits: <b>{amc.visits_done} / {amc.visits_per_year}</b></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState icon={Wrench} title="No AMC contracts" sub="No property care packages registered for this client." />
            )}
          </section>
        </div>
      )}

      {/* Tab 3: Care & Work Orders */}
      {tab === 'care' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <section className="pm-card">
            <div className="pm-card-h" style={{ padding: '12px 16px' }}>
              <div className="ic" style={{ width: 28, height: 28 }}><Wrench size={16} /></div>
              <div>
                <h3 style={{ fontSize: 14 }}>Maintenance &amp; Service Work Orders</h3>
                <div className="hsub" style={{ fontSize: 11 }}>All property care service requests and execution orders</div>
              </div>
            </div>
            {careWorkOrders.length ? (
              <div className="pm-card-body" style={{ padding: '0 16px 14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
                  {careWorkOrders.map((wo) => (
                    <div key={wo.id} className="card" style={{ padding: 12, borderLeft: '4px solid var(--cyan)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="code-chip" style={{ fontSize: 11 }}>{wo.work_order_code}</span>
                        <StatusBadge status={wo.status} />
                      </div>
                      <h4 style={{ margin: '6px 0 2px', fontSize: 14 }}>{wo.service?.name || wo.service_name || 'Service Order'}</h4>
                      <div className="cell-sub" style={{ fontSize: 11.5 }}>{wo.site_address || 'No site address'}</div>
                      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div className="cell-sub" style={{ fontSize: 11 }}>Value</div>
                          <b>{money(wo.service_value)}</b>
                        </div>
                        <Badge tone={wo.payment_status === 'paid' ? 'green' : 'amber'}>
                          Payment: {wo.payment_status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState icon={Wrench} title="No work orders" sub="No care work orders requested or assigned to this client." />
            )}
          </section>

          <section className="pm-card">
            <div className="pm-card-h" style={{ padding: '12px 16px' }}>
              <div className="ic" style={{ width: 28, height: 28 }}><MessageSquare size={16} /></div>
              <div>
                <h3 style={{ fontSize: 14 }}>Care Enquiries &amp; Service Requests</h3>
                <div className="hsub" style={{ fontSize: 11 }}>Initial support requests and quotes</div>
              </div>
            </div>
            {careEnquiries.length ? (
              <div className="pm-card-body" style={{ padding: '0 16px 14px' }}>
                {careEnquiries.map((enq) => (
                  <div key={enq.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line-soft)', fontSize: 12.5 }}>
                    <div>
                      <span className="code-chip" style={{ fontSize: 11 }}>{enq.enquiry_code}</span>
                      <span style={{ fontWeight: 600, marginLeft: 8 }}>{enq.service_interest || 'Property Service'}</span>
                      <div className="cell-sub" style={{ fontSize: 11.5 }}>{enq.message}</div>
                    </div>
                    <Badge tone={enq.stage === 'won' ? 'green' : 'blue'}>{enq.stage}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={MessageSquare} title="No enquiries" sub="No support or service enquiries recorded." />
            )}
          </section>
        </div>
      )}

      {/* Tab 4: Financials & Invoices */}
      {tab === 'accounting' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <section className="pm-card">
            <div className="pm-card-h" style={{ padding: '12px 16px' }}>
              <div className="ic" style={{ width: 28, height: 28 }}><Receipt size={16} /></div>
              <div>
                <h3 style={{ fontSize: 14 }}>Client Invoices</h3>
                <div className="hsub" style={{ fontSize: 11 }}>All property management and service invoices</div>
              </div>
            </div>
            <DataTable columns={invoiceColumns} rows={invoices} />
          </section>

          <section className="pm-card">
            <div className="pm-card-h" style={{ padding: '12px 16px' }}>
              <div className="ic" style={{ width: 28, height: 28 }}><WalletCards size={16} /></div>
              <div>
                <h3 style={{ fontSize: 14 }}>Payments Ledger</h3>
                <div className="hsub" style={{ fontSize: 11 }}>Incoming and outgoing payment history</div>
              </div>
            </div>
            <DataTable columns={paymentColumns} rows={payments} />
          </section>
        </div>
      )}

      {/* Tab 5: Agreements & KYC */}
      {tab === 'kyc' && (
        <section className="pm-card">
          <div className="pm-card-h" style={{ padding: '12px 16px' }}>
            <div className="ic" style={{ width: 28, height: 28 }}><FileCheck2 size={16} /></div>
            <div>
              <h3 style={{ fontSize: 14 }}>Private Client Documents &amp; KYC Verification</h3>
              <div className="hsub" style={{ fontSize: 11 }}>Identity documents, NID, Passport, TIN and legal files</div>
            </div>
            <div style={{ flex: 1 }} />
            <Button size="sm" icon={Plus} onClick={() => setDrawer('document')}>
              Upload Document
            </Button>
            <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setDrawer('edit')}>
              Edit Identification
            </Button>
          </div>

          <div className="pm-card-body" style={{ padding: '0 16px 14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 14 }}>
              <CompactKpi
                icon={ShieldCheck}
                label="National ID (NID)"
                value={contact?.national_id || 'Not Provided'}
                tone={contact?.national_id ? 'green' : 'amber'}
              />
              <CompactKpi
                icon={FileCheck2}
                label="Passport No."
                value={contact?.passport_no || 'Not Provided'}
                tone={contact?.passport_no ? 'green' : 'amber'}
              />
              <CompactKpi
                icon={Receipt}
                label="TIN Number"
                value={contact?.tin || 'Not Provided'}
                tone={contact?.tin ? 'green' : 'amber'}
              />
            </div>

            {allDocuments.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                {allDocuments.map((doc) => (
                  <div key={`${doc.party_role_profile_id ? 'kyc' : 'contact'}-${doc.id}`} className="card" style={{ padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <b style={{ fontSize: 13 }}>{doc.title || doc.doc_type || doc.document_type}</b>
                        <div className="cell-sub" style={{ textTransform: 'capitalize', fontSize: 11 }}>
                          {(doc.doc_type || doc.document_type || '').replace('_', ' ')}
                        </div>
                      </div>
                      {!doc.party_role_profile_id && (
                        <button
                          type="button"
                          onClick={() => removeDocument(doc.id)}
                          style={{ border: 'none', background: 'transparent', color: 'var(--bad)', cursor: 'pointer', padding: 2 }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    {(doc.file_url || doc.file_url_back) && (
                      <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {doc.file_url && (
                          <a className="btn btn-ghost btn-sm" href={fileSrc(doc.file_url)} target="_blank" rel="noreferrer" style={{ fontSize: 11, padding: '3px 8px' }}>
                            <ExternalLink size={11} /> View Document
                          </a>
                        )}
                        {doc.file_url_back && (
                          <a className="btn btn-ghost btn-sm" href={fileSrc(doc.file_url_back)} target="_blank" rel="noreferrer" style={{ fontSize: 11, padding: '3px 8px' }}>
                            <ExternalLink size={11} /> View Back Page
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={FileCheck2}
                title="No Identity Documents Uploaded"
                sub="Upload NID front/back, Passport copy, TIN certificate or trade licences."
              />
            )}
          </div>
        </section>
      )}

      {/* Tab 6: Timeline & Activity */}
      {tab === 'activity' && (
        <section className="pm-card">
          <div className="pm-card-h" style={{ padding: '12px 16px' }}>
            <div className="ic" style={{ width: 28, height: 28 }}><MessageSquare size={16} /></div>
            <div>
              <h3 style={{ fontSize: 14 }}>Communication &amp; Interaction History</h3>
              <div className="hsub" style={{ fontSize: 11 }}>Emails, phone calls, WhatsApp messages and internal notes</div>
            </div>
            <div style={{ flex: 1 }} />
            <Button size="sm" icon={Plus} onClick={() => setDrawer('message')}>
              Log Activity / Send Message
            </Button>
          </div>
          <div className="pm-card-body" style={{ padding: '0 16px 14px' }}>
            {communications.length ? (
              communications.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '36px 1fr auto',
                    gap: 10,
                    padding: '10px 0',
                    borderBottom: '1px solid var(--line-soft)',
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: 'var(--cyan-weak)',
                      color: 'var(--navy)',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    {item.channel === 'email' ? <Mail size={15} /> :
                     item.channel === 'call' ? <Phone size={15} /> :
                     <MessageSquare size={15} />}
                  </div>
                  <div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <b style={{ fontSize: 13 }}>{item.subject || item.channel}</b>
                      <Badge tone="grey" style={{ fontSize: 10 }}>{item.channel}</Badge>
                      <Badge tone={item.direction === 'inbound' ? 'green' : 'blue'} style={{ fontSize: 10 }}>{item.direction}</Badge>
                    </div>
                    <div style={{ marginTop: 4, whiteSpace: 'pre-wrap', fontSize: 12.5, color: 'var(--ink)' }}>{item.body}</div>
                  </div>
                  <div className="cell-sub" style={{ fontSize: 11 }}>{date(item.occurred_at)}</div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={Activity}
                title="No Activity History Recorded"
                sub="Log calls, internal notes or send email communications."
              />
            )}
          </div>
        </section>
      )}

      {/* Tab 7: Portal & Security */}
      {tab === 'portal' && (
        <div className="pm-grid" style={{ gridTemplateColumns: '1.1fr 0.9fr', gap: 12 }}>
          <section className="pm-card">
            <div className="pm-card-h" style={{ padding: '12px 16px' }}>
              <div className="ic" style={{ width: 28, height: 28 }}><Globe2 size={16} /></div>
              <div>
                <h3 style={{ fontSize: 14 }}>Client Self-Service Portal Access</h3>
                <div className="hsub" style={{ fontSize: 11 }}>Give client online login to view invoices, properties and agreements</div>
              </div>
            </div>
            <div className="pm-card-body" style={{ padding: '16px' }}>
              {client.portal_enabled ? (
                <div style={{ padding: 20, textAlign: 'center', background: 'var(--good-bg)', borderRadius: 10 }}>
                  <ShieldCheck size={32} color="var(--good)" style={{ margin: '0 auto 6px' }} />
                  <h3 style={{ margin: 0, color: 'var(--good)', fontSize: 16 }}>Portal Login Active</h3>
                  <div className="cell-sub" style={{ marginTop: 4, fontSize: 12.5 }}>
                    This client can log in using their email <b>{contact?.email}</b>.
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={Globe2}
                  title="Client Portal Disabled"
                  sub="Create a password and enable self-service login access for this client."
                  action={<Button size="sm" onClick={() => setDrawer('portal')}>Enable Portal Access</Button>}
                />
              )}
            </div>
          </section>
        </div>
      )}

      {/* Drawers */}
      {drawer === 'edit' && (
        <Drawer
          title="Edit Client Profile &amp; KYC"
          width={700}
          onClose={() => setDrawer('')}
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setDrawer('')}>Cancel</Button>
              <Button onClick={saveProfile} disabled={busy} size="sm" className="btn-primary">
                {busy ? <Spinner /> : 'Save Profile Changes'}
              </Button>
            </>
          }
        >
          <div className="form-grid">
            <Field label="Full Name" required>
              <Input value={edit.full_name || ''} onChange={(e) => setEdit({ ...edit, full_name: e.target.value })} />
            </Field>
            <Field label="Company / Business Name">
              <Input value={edit.company_name || ''} onChange={(e) => setEdit({ ...edit, company_name: e.target.value })} />
            </Field>
            <Field label="Email Address">
              <Input type="email" value={edit.email || ''} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
            </Field>
            <Field label="Primary Phone">
              <Input value={edit.primary_phone || ''} onChange={(e) => setEdit({ ...edit, primary_phone: e.target.value })} />
            </Field>
            <Field label="WhatsApp Number">
              <Input value={edit.whatsapp || ''} onChange={(e) => setEdit({ ...edit, whatsapp: e.target.value })} />
            </Field>
            <Field label="National ID (NID)">
              <Input value={edit.national_id || ''} onChange={(e) => setEdit({ ...edit, national_id: e.target.value })} />
            </Field>
            <Field label="Passport Number">
              <Input value={edit.passport_no || ''} onChange={(e) => setEdit({ ...edit, passport_no: e.target.value })} />
            </Field>
            <Field label="TIN Number">
              <Input value={edit.tin || ''} onChange={(e) => setEdit({ ...edit, tin: e.target.value })} />
            </Field>
            <Field label="Client Segment">
              <Select value={edit.client_segment || 'standard'} onChange={(e) => setEdit({ ...edit, client_segment: e.target.value })}>
                <option value="standard">Standard</option>
                <option value="priority">Priority</option>
                <option value="vip">VIP</option>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={edit.status || 'active'} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="prospect">Prospect</option>
                <option value="dormant">Dormant</option>
                <option value="closed">Closed</option>
              </Select>
            </Field>
            <Field label="Address Line 1">
              <Input value={edit.address_line1 || ''} onChange={(e) => setEdit({ ...edit, address_line1: e.target.value })} />
            </Field>
            <Field label="Area">
              <Input value={edit.area || ''} onChange={(e) => setEdit({ ...edit, area: e.target.value })} />
            </Field>
            <Field label="City">
              <Input value={edit.city || ''} onChange={(e) => setEdit({ ...edit, city: e.target.value })} />
            </Field>
            <Field label="District">
              <Input value={edit.district || ''} onChange={(e) => setEdit({ ...edit, district: e.target.value })} />
            </Field>
          </div>

          <div className="form-section-title" style={{ margin: '14px 0 8px', fontSize: 13, fontWeight: 700 }}>Active Client Relationships</div>
          <div className="wrap-gap" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {ROLE_FIELDS.map(([key, label]) => (
              <label key={key} className="card" style={{ padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                <input
                  type="checkbox"
                  checked={!!edit[key]}
                  onChange={(e) => setEdit({ ...edit, [key]: e.target.checked })}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>

          <div style={{ marginTop: 14 }}>
            <Field label="Internal Relationship &amp; Care Notes">
              <Textarea rows={3} value={edit.notes || ''} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
            </Field>
          </div>
        </Drawer>
      )}

      {drawer === 'message' && (
        <Drawer
          title="Contact Client / Log Communication"
          width={600}
          onClose={() => setDrawer('')}
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setDrawer('')}>Cancel</Button>
              <Button onClick={sendMessage} disabled={busy} size="sm" className="btn-primary">
                {busy ? <Spinner /> : message.send_now && ['email', 'sms', 'whatsapp'].includes(message.channel) ? 'Send & Log' : 'Log Activity'}
              </Button>
            </>
          }
        >
          <div style={{ display: 'grid', gap: 12 }}>
            <Field label="Communication Channel">
              <Select
                value={message.channel}
                onChange={(e) => setMessage({
                  ...message,
                  channel: e.target.value,
                  send_now: ['email', 'sms', 'whatsapp'].includes(e.target.value),
                })}
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="call">Phone Call</option>
                <option value="meeting">Meeting</option>
                <option value="note">Internal Note</option>
              </Select>
            </Field>
            <Field label="Subject / Topic">
              <Input
                value={message.subject}
                onChange={(e) => setMessage({ ...message, subject: e.target.value })}
                placeholder="Purpose of interaction"
              />
            </Field>
            <Field label="Message / Log Notes">
              <Textarea
                rows={6}
                value={message.body}
                onChange={(e) => setMessage({ ...message, body: e.target.value })}
                placeholder="Type message content or interaction notes…"
              />
            </Field>
            {['email', 'sms', 'whatsapp'].includes(message.channel) && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={message.send_now}
                  onChange={(e) => setMessage({ ...message, send_now: e.target.checked })}
                />
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>Send now to client &amp; record to timeline</span>
              </label>
            )}
          </div>
        </Drawer>
      )}

      {drawer === 'document' && (
        <Drawer
          title="Upload Private Client Document"
          width={560}
          onClose={() => setDrawer('')}
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setDrawer('')}>Cancel</Button>
              <Button onClick={addDocument} disabled={busy} size="sm" className="btn-primary">
                {busy ? <Spinner /> : 'Save Document'}
              </Button>
            </>
          }
        >
          <div style={{ display: 'grid', gap: 12 }}>
            <Field label="Document Category">
              <Select
                value={document.doc_type}
                onChange={(e) => setDocument({ ...document, doc_type: e.target.value })}
              >
                <option value="national_id">National ID (NID)</option>
                <option value="passport">Passport Copy</option>
                <option value="tin">TIN Certificate</option>
                <option value="trade_licence">Trade Licence</option>
                <option value="ownership">Ownership Document</option>
                <option value="agreement">Agreement / Contract</option>
                <option value="other">Other File</option>
              </Select>
            </Field>
            <Field label="Document Title">
              <Input
                value={document.title}
                onChange={(e) => setDocument({ ...document, title: e.target.value })}
                placeholder="e.g. Sayem NID Front Copy"
              />
            </Field>
            <Field label="Expiry Date (if applicable)">
              <Input
                type="date"
                value={document.expiry_date}
                onChange={(e) => setDocument({ ...document, expiry_date: e.target.value })}
              />
            </Field>
            <Field label="Document File" required>
              <FileUpload
                folder="documents"
                value={document.file_url}
                onChange={(file_url) => setDocument({ ...document, file_url })}
              />
            </Field>
          </div>
        </Drawer>
      )}

      {drawer === 'portal' && (
        <Drawer
          title="Enable Client Portal Login"
          width={520}
          onClose={() => setDrawer('')}
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setDrawer('')}>Cancel</Button>
              <Button onClick={enablePortal} disabled={busy} size="sm" className="btn-primary">
                {busy ? <Spinner /> : 'Create Credentials &amp; Enable'}
              </Button>
            </>
          }
        >
          <div style={{ display: 'grid', gap: 12 }}>
            <Field label="Login Email" required>
              <Input
                type="email"
                value={portal.email}
                onChange={(e) => setPortal({ ...portal, email: e.target.value })}
              />
            </Field>
            <Field label="Temporary Password" required>
              <Input
                type="password"
                value={portal.password}
                onChange={(e) => setPortal({ ...portal, password: e.target.value })}
                placeholder="Minimum 6 characters"
              />
            </Field>
            <Field label="Portal Access Role">
              <Select
                value={portal.role}
                onChange={(e) => setPortal({ ...portal, role: e.target.value })}
              >
                <option value="buyer">Buyer Portal</option>
                <option value="tenant">Tenant Portal</option>
                <option value="owner">Owner / Landlord Portal</option>
              </Select>
            </Field>
          </div>
        </Drawer>
      )}
    </div>
  );
}
