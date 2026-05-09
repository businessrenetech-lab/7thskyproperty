import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2, MapPin, Phone, Mail, ShieldCheck, Plus, X, Loader2, ChevronLeft,
  Users, GraduationCap, BookOpen, Layers, Package, DollarSign, TrendingUp,
  Wallet, Receipt, Scale, Search, Edit3, Power, MoreVertical, Eye,
  UserPlus, ArrowUpRight, ArrowDownRight, FileText, Clock, Briefcase,
  CheckCircle2, XCircle, AlertTriangle, BarChart3, Upload, Image as ImageIcon
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/GlobalStyles.css';
import { useToast } from '../context/ToastContext';

/* ─── Helper Components ────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, color = 'var(--primary)', sub }) => (
  <div className="glass-morphism" style={{ padding: '1.2rem 1.4rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
    <div style={{ background: `${color}15`, padding: '0.7rem', borderRadius: '12px', display: 'flex' }}>
      <Icon size={20} color={color} />
    </div>
    <div>
      <p style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0 }}>{value ?? '—'}</p>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0 }}>{label}</p>
      {sub && <p style={{ fontSize: '0.65rem', color, margin: 0 }}>{sub}</p>}
    </div>
  </div>
);

const DataTable = ({ columns, data, emptyText = 'No data found' }) => (
  <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border)' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
      <thead>
        <tr style={{ background: 'var(--glass)', borderBottom: '1px solid var(--border)' }}>
          {columns.map((col, i) => (
            <th key={i} style={{ padding: '0.8rem 1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-dim)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr><td colSpan={columns.length} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>{emptyText}</td></tr>
        ) : data.map((row, ri) => (
          <tr key={ri} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}
              onMouseOver={e => e.currentTarget.style.background = 'var(--glass)'}
              onMouseOut={e => e.currentTarget.style.background = 'none'}>
            {columns.map((col, ci) => (
              <td key={ci} style={{ padding: '0.7rem 1rem', whiteSpace: 'nowrap' }}>{col.render ? col.render(row) : row[col.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Badge = ({ children, color = 'var(--primary)' }) => (
  <span style={{ fontSize: '0.68rem', background: `${color}15`, color, padding: '3px 10px', borderRadius: '10px', fontWeight: '600', textTransform: 'uppercase' }}>{children}</span>
);

const TabButton = ({ active, onClick, icon: Icon, label, count }) => (
  <button onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', transition: 'all 0.2s',
    background: active ? 'var(--primary)' : 'var(--glass)', color: active ? '#fff' : 'var(--text-dim)',
  }}>
    <Icon size={15} /> {label} {count !== undefined && <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>({count})</span>}
  </button>
);

const slugify = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .replace(/-{2,}/g, '-');

const emptyCreateForm = {
  name: '', code: '', slug: '', address: '', phone: '', email: '',
  admin_name: '', admin_email: '', admin_password: '',
  public_title: '', public_description: '', seo_title: '', seo_description: '',
  hero_image_url: '', opening_hours: '', map_url: '', coming_soon_message: ''
};

const getImagePreviewUrl = (value) => {
  const imageUrl = String(value || '').trim();
  if (!imageUrl) return '';
  if (/^(https?:)?\/\//i.test(imageUrl) || imageUrl.startsWith('data:')) return imageUrl;
  const apiBase = api.defaults.baseURL || '';
  if (imageUrl.startsWith('/uploads') && /^https?:\/\//i.test(apiBase)) {
    return `${apiBase.replace(/\/api\/?$/, '').replace(/\/$/, '')}${imageUrl}`;
  }
  return imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
};

/* ─── MAIN COMPONENT ─────────────────────────────────────────── */
const BranchManagement = () => {
  const toast = useToast();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  // ── State ──
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editBranch, setEditBranch] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [createForm, setCreateForm] = useState(emptyCreateForm);

  // ── Drill-down State ──
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [branchSummary, setBranchSummary] = useState(null);
  const [branchStudents, setBranchStudents] = useState([]);
  const [branchStaff, setBranchStaff] = useState([]);
  const [branchCourses, setBranchCourses] = useState([]);
  const [branchContacts, setBranchContacts] = useState({ contacts: [], leads: [] });
  const [branchAssets, setBranchAssets] = useState([]);
  const [branchAccounting, setBranchAccounting] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => { fetchBranches(); }, []);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      setBranches(res.data);
    } catch (err) { console.error('Failed to fetch branches'); }
    finally { setLoading(false); }
  };

  // ── CREATE / EDIT / DEACTIVATE ──
  const handleCreate = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await api.post('/branches', createForm);
      setShowCreateModal(false);
      setCreateForm(emptyCreateForm);
      fetchBranches();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create branch'); }
    finally { setFormLoading(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await api.put(`/branches/${editBranch.id}`, editBranch);
      setShowEditModal(false);
      setEditBranch(null);
      fetchBranches();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to update branch'); }
    finally { setFormLoading(false); }
  };

  const handleBranchImageUpload = async (file) => {
    if (!file || !editBranch?.id) return;
    const formData = new FormData();
    formData.append('image', file);
    setImageUploading(true);
    try {
      const res = await api.post(`/branches/${editBranch.id}/upload-image`, formData);
      const updatedBranch = res.data.branch;
      setEditBranch(updatedBranch);
      setBranches(prev => prev.map(branch => branch.id === updatedBranch.id ? { ...branch, ...updatedBranch } : branch));
      toast.success('Branch image uploaded');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload branch image');
    } finally {
      setImageUploading(false);
    }
  };

  const handleToggleStatus = async (id) => {
    if (!confirm('Toggle this branch active/inactive?')) return;
    try {
      await api.patch(`/branches/${id}/status`);
      fetchBranches();
    } catch (err) { toast.error('Failed to toggle status'); }
  };

  const handleDeactivate = async (id) => {
    if (!confirm('Deactivate this branch? Student data will be preserved.')) return;
    try {
      await api.delete(`/branches/${id}`);
      fetchBranches();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to deactivate'); }
  };

  // ── DRILL-DOWN ──
  const openBranchDetail = async (branch) => {
    setSelectedBranch(branch);
    setActiveTab('overview');
    setDetailLoading(true);
    try {
      const res = await api.get(`/branches/${branch.id}/summary`);
      setBranchSummary(res.data);
    } catch (e) { console.error(e); }
    finally { setDetailLoading(false); }
  };

  const loadTabData = async (tab) => {
    setActiveTab(tab);
    setDetailLoading(true);
    try {
      switch (tab) {
        case 'students':
          const s = await api.get(`/branches/${selectedBranch.id}/students`);
          setBranchStudents(s.data);
          break;
        case 'staff':
          const st = await api.get(`/branches/${selectedBranch.id}/staff`);
          setBranchStaff(st.data);
          break;
        case 'courses':
          const c = await api.get(`/branches/${selectedBranch.id}/courses`);
          setBranchCourses(c.data);
          break;
        case 'contacts':
          const ct = await api.get(`/branches/${selectedBranch.id}/contacts`);
          setBranchContacts(ct.data);
          break;
        case 'assets':
          const a = await api.get(`/branches/${selectedBranch.id}/assets`);
          setBranchAssets(a.data);
          break;
        case 'accounting':
          const ac = await api.get(`/branches/${selectedBranch.id}/accounting`);
          setBranchAccounting(ac.data);
          break;
      }
    } catch (e) { console.error(e); }
    finally { setDetailLoading(false); }
  };

  const goBack = () => {
    setSelectedBranch(null);
    setBranchSummary(null);
    setActiveTab('overview');
  };

  const filteredBranches = useMemo(() =>
    branches.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.code.toLowerCase().includes(searchQuery.toLowerCase())),
    [branches, searchQuery]
  );

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 className="animate-spin" color="var(--primary)" size={48} /></div>;

  /* ═══════════════════════════════════════════════════════════════
     BRANCH DETAIL VIEW
     ═══════════════════════════════════════════════════════════════ */
  if (selectedBranch) {
    const stats = branchSummary?.stats || {};
    const branch = branchSummary?.branch || selectedBranch;
    const publicSlug = branch.slug || branch.id;
    const websiteOrigin = typeof window !== 'undefined' ? window.location.origin : '';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={goBack} className="glass-morphism" style={{ padding: '0.6rem', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-dim)' }}>
            <ChevronLeft size={20} />
          </button>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.5rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Building2 size={22} color="var(--primary)" />
              Language Academy — {branch.name}
            </h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <MapPin size={13} /> {branch.address || 'No address set'}
              {branch.Manager && <span style={{ marginLeft: '1rem' }}>• Manager: <strong>{branch.Manager.name}</strong></span>}
            </p>
          </div>
          <Badge color={branch.is_active ? 'var(--success)' : 'var(--danger)'}>{branch.is_active ? 'ACTIVE' : 'INACTIVE'}</Badge>
        </div>

        <div className="glass-morphism" style={{ padding: '1rem 1.2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.8rem', fontSize: '0.8rem' }}>
          <div>
            <p style={{ margin: '0 0 0.2rem', color: 'var(--text-dim)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Public Branch Page</p>
            <a href={`${websiteOrigin}/branches/${publicSlug}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 700 }}>{`/branches/${publicSlug}`}</a>
          </div>
          <div>
            <p style={{ margin: '0 0 0.2rem', color: 'var(--text-dim)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Kiosk Booking Link</p>
            <a href={`${websiteOrigin}/student-booking?branch=${branch.id}&source=walk_in&channel=kiosk`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 700 }}>{`/student-booking?branch=${branch.id}&channel=kiosk`}</a>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', background: 'var(--glass)', padding: '0.5rem', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <TabButton active={activeTab === 'overview'} onClick={() => { setActiveTab('overview'); }} icon={BarChart3} label="Overview" />
          <TabButton active={activeTab === 'students'} onClick={() => loadTabData('students')} icon={GraduationCap} label="Students" count={stats.studentCount} />
          <TabButton active={activeTab === 'courses'} onClick={() => loadTabData('courses')} icon={BookOpen} label="Courses" count={stats.courseCount} />
          <TabButton active={activeTab === 'staff'} onClick={() => loadTabData('staff')} icon={Users} label="Staff" count={stats.staffCount} />
          <TabButton active={activeTab === 'assets'} onClick={() => loadTabData('assets')} icon={Package} label="Assets" count={stats.assetCount} />
          <TabButton active={activeTab === 'contacts'} onClick={() => loadTabData('contacts')} icon={Layers} label="Contacts" count={(stats.contactCount || 0) + (stats.leadCount || 0)} />
          <TabButton active={activeTab === 'accounting'} onClick={() => loadTabData('accounting')} icon={DollarSign} label="Accounting" />
        </div>

        {detailLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 className="animate-spin" color="var(--primary)" size={32} /></div>
        ) : (
          <>
            {/* ── OVERVIEW TAB ── */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                  <StatCard icon={GraduationCap} label="Total Students" value={stats.studentCount} color="var(--primary)" sub={`${stats.activeStudents || 0} active`} />
                  <StatCard icon={Users} label="Staff Members" value={stats.staffCount} color="#8b5cf6" />
                  <StatCard icon={BookOpen} label="Courses" value={stats.courseCount} color="#06b6d4" />
                  <StatCard icon={Layers} label="Active Batches" value={stats.batchCount} color="#f59e0b" />
                  <StatCard icon={Briefcase} label="Leads" value={stats.leadCount} color="#10b981" />
                  <StatCard icon={Package} label="Assets" value={stats.assetCount} color="#ef4444" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                  <StatCard icon={ArrowUpRight} label="Total Revenue" value={`৳${(stats.revenue || 0).toLocaleString()}`} color="#10b981" />
                  <StatCard icon={ArrowDownRight} label="Total Expenses" value={`৳${(stats.expenses || 0).toLocaleString()}`} color="#ef4444" />
                  <StatCard icon={TrendingUp} label="Net Profit" value={`৳${(stats.netProfit || 0).toLocaleString()}`} color={stats.netProfit >= 0 ? '#10b981' : '#ef4444'} />
                  <StatCard icon={Wallet} label="Bank Balance" value={`৳${(stats.bankBalance || 0).toLocaleString()}`} color="#3b82f6" />
                </div>
              </div>
            )}

            {/* ── STUDENTS TAB ── */}
            {activeTab === 'students' && (
              <DataTable
                emptyText="No students enrolled in this branch"
                columns={[
                  { header: 'Name', render: r => <span style={{ fontWeight: '600' }}>{r.first_name} {r.last_name}</span> },
                  { header: 'Email', render: r => r.User?.email || '—' },
                  { header: 'Phone', key: 'mobile_no' },
                  { header: 'Batch', render: r => r.Batch?.name || '—' },
                  { header: 'Status', render: r => <Badge color={r.status === 'active' ? 'var(--success)' : 'var(--danger)'}>{r.status}</Badge> },
                  { header: 'Enrolled', render: r => r.enrollment_date ? new Date(r.enrollment_date).toLocaleDateString() : '—' },
                ]}
                data={branchStudents}
              />
            )}

            {/* ── COURSES TAB ── */}
            {activeTab === 'courses' && (
              <DataTable
                emptyText="No courses in this branch"
                columns={[
                  { header: 'Course', render: r => <span style={{ fontWeight: '600' }}>{r.title}</span> },
                  { header: 'Category', key: 'category' },
                  { header: 'Level', key: 'level' },
                  { header: 'Fee', render: r => `৳${(r.base_fee || 0).toLocaleString()}` },
                  { header: 'Batches', render: r => r.Batches?.length || 0 },
                  { header: 'Duration', render: r => r.duration_weeks ? `${r.duration_weeks} weeks` : '—' },
                ]}
                data={branchCourses}
              />
            )}

            {/* ── STAFF TAB ── */}
            {activeTab === 'staff' && (
              <DataTable
                emptyText="No staff in this branch"
                columns={[
                  { header: 'Name', render: r => <span style={{ fontWeight: '600' }}>{r.User?.name || '—'}</span> },
                  { header: 'Email', render: r => r.User?.email || '—' },
                  { header: 'Role', render: r => <Badge>{r.User?.role || '—'}</Badge> },
                  { header: 'Designation', key: 'designation' },
                  { header: 'Phone', key: 'phone' },
                  { header: 'Salary', render: r => `৳${parseFloat(r.base_salary || 0).toLocaleString()}` },
                  { header: 'Status', render: r => <Badge color={r.User?.status === 'active' ? 'var(--success)' : 'var(--danger)'}>{r.User?.status}</Badge> },
                  { header: 'Joined', render: r => r.joining_date ? new Date(r.joining_date).toLocaleDateString() : '—' },
                ]}
                data={branchStaff}
              />
            )}

            {/* ── ASSETS TAB ── */}
            {activeTab === 'assets' && (
              <DataTable
                emptyText="No assets registered for this branch"
                columns={[
                  { header: 'Name', render: r => <span style={{ fontWeight: '600' }}>{r.name}</span> },
                  { header: 'Category', key: 'category' },
                  { header: 'Serial No', key: 'serial_number' },
                  { header: 'Purchase Date', render: r => r.purchase_date ? new Date(r.purchase_date).toLocaleDateString() : '—' },
                  { header: 'Value', render: r => `৳${parseFloat(r.purchase_cost || 0).toLocaleString()}` },
                  { header: 'Status', render: r => <Badge color={r.status === 'active' ? 'var(--success)' : 'var(--danger)'}>{r.status}</Badge> },
                  { header: 'Location', key: 'location' },
                ]}
                data={branchAssets}
              />
            )}

            {/* ── CONTACTS TAB ── */}
            {activeTab === 'contacts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Briefcase size={16} color="var(--primary)" /> Leads ({branchContacts.leads?.length || 0})
                </h3>
                <DataTable
                  emptyText="No leads for this branch"
                  columns={[
                    { header: 'Name', key: 'name' },
                    { header: 'Phone', key: 'phone' },
                    { header: 'Email', key: 'email' },
                    { header: 'Source', render: r => <Badge>{r.source || '—'}</Badge> },
                    { header: 'Status', render: r => <Badge color={r.status === 'converted' ? 'var(--success)' : r.status === 'lost' ? 'var(--danger)' : 'var(--primary)'}>{r.status}</Badge> },
                    { header: 'Interest', key: 'batch_interest' },
                    { header: 'Date', render: r => { const d = new Date(r.createdAt || r.created_at); return isNaN(d) ? '—' : d.toLocaleDateString(); } },
                  ]}
                  data={branchContacts.leads || []}
                />

                <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                  <Users size={16} color="#06b6d4" /> Contacts ({branchContacts.contacts?.length || 0})
                </h3>
                <DataTable
                  emptyText="No contacts for this branch"
                  columns={[
                    { header: 'Name', key: 'name' },
                    { header: 'Phone', key: 'phone' },
                    { header: 'Email', key: 'email' },
                    { header: 'Type', key: 'type' },
                    { header: 'Date', render: r => { const d = new Date(r.createdAt || r.created_at); return isNaN(d) ? '—' : d.toLocaleDateString(); } },
                  ]}
                  data={branchContacts.contacts || []}
                />
              </div>
            )}

            {/* ── ACCOUNTING TAB ── */}
            {activeTab === 'accounting' && branchAccounting && (
              <AccountingSection data={branchAccounting} />
            )}
          </>
        )}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     BRANCH OVERVIEW (ALL BRANCHES)
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', margin: 0 }}>Branch Network</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem', margin: '4px 0 0' }}>
            {isSuperAdmin ? 'Manage all branches, view drill-down data, and provision new locations' : 'Your assigned branch overview'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-dim)' }} />
            <input
              type="text" placeholder="Search branches..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="glass-morphism"
              style={{ padding: '0.6rem 0.8rem 0.6rem 2.2rem', border: '1px solid var(--border)', color: 'var(--text-main)', background: 'none', width: '220px', fontSize: '0.82rem' }}
            />
          </div>
          {isSuperAdmin && (
            <button className="btn-primary" onClick={() => setShowCreateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={16} /> Create Branch
            </button>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
        <StatCard icon={Building2} label="Total Branches" value={branches.length} color="var(--primary)" />
        <StatCard icon={CheckCircle2} label="Active" value={branches.filter(b => b.is_active).length} color="var(--success)" />
        <StatCard icon={GraduationCap} label="Total Students" value={branches.reduce((s, b) => s + (b.studentCount || 0), 0)} color="#8b5cf6" />
        <StatCard icon={Users} label="Total Staff" value={branches.reduce((s, b) => s + (b.staffCount || 0), 0)} color="#06b6d4" />
      </div>

      {/* Branch Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.2rem' }}>
        {filteredBranches.map(branch => (
          <div key={branch.id} className="glass-morphism" style={{
            padding: '1.5rem', position: 'relative', cursor: 'pointer',
            transition: 'all 0.3s', border: '1px solid var(--border)',
          }}
          onClick={() => openBranchDetail(branch)}
          onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
          >
            {/* Top row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <div style={{ background: 'var(--primary-glow)', padding: '0.7rem', borderRadius: '12px' }}>
                  <Building2 color="var(--primary)" size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', margin: 0 }}>{branch.name}</h3>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0 }}>
                    Code: <span style={{ color: 'var(--primary)', fontWeight: '600' }}>{branch.code}</span>
                    {branch.type === 'head' && <Badge color="var(--accent)" style={{ marginLeft: '0.5rem' }}>HQ</Badge>}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <Badge color={branch.is_active ? 'var(--success)' : 'var(--danger)'}>{branch.is_active ? 'ACTIVE' : 'INACTIVE'}</Badge>
                {isSuperAdmin && (
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button onClick={(e) => { e.stopPropagation(); setEditBranch({...branch}); setShowEditModal(true); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: '4px' }}>
                      <Edit3 size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleToggleStatus(branch.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: '4px' }}>
                      <Power size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.8rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                <MapPin size={14} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{branch.address || 'No address'}</span>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                {branch.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-dim)', fontSize: '0.78rem' }}><Phone size={13} />{branch.phone}</span>}
                {branch.email && <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-dim)', fontSize: '0.78rem' }}><Mail size={13} />{branch.email}</span>}
              </div>
              {branch.Manager && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.78rem', marginTop: '0.3rem' }}>
                  <ShieldCheck size={14} /> Manager: {branch.Manager.name}
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', background: 'var(--glass)', borderRadius: '10px', padding: '0.8rem' }}>
              {[
                { label: 'Students', value: branch.studentCount, icon: GraduationCap },
                { label: 'Staff', value: branch.staffCount, icon: Users },
                { label: 'Courses', value: branch.courseCount, icon: BookOpen },
                { label: 'Leads', value: branch.leadCount, icon: Layers },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, color: 'var(--primary)' }}>{s.value || 0}</p>
                  <p style={{ fontSize: '0.62rem', color: 'var(--text-dim)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* View Details Link */}
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                <Eye size={13} /> View Full Branch Dashboard
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredBranches.length === 0 && !loading && (
        <div className="glass-morphism" style={{ padding: '3rem', textAlign: 'center' }}>
          <Building2 size={40} color="var(--text-dim)" style={{ marginBottom: '1rem', opacity: 0.4 }} />
          <h3 style={{ margin: '0 0 0.5rem' }}>No Branches Found</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            {searchQuery ? 'No branches match your search.' : 'Create your first branch to get started.'}
          </p>
        </div>
      )}

      {/* ═══ CREATE BRANCH MODAL ═══ */}
      {showCreateModal && (
        <Modal title="Create New Branch" subtitle="Provision a new branch with its administrator credentials" onClose={() => setShowCreateModal(false)}>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <FormField label="Branch Name" value={createForm.name} onChange={v => setCreateForm({...createForm, name: v, slug: createForm.slug || slugify(v)})} placeholder="e.g. Uttara Branch" required />
              <FormField label="Branch Code" value={createForm.code} onChange={v => setCreateForm({...createForm, code: v})} placeholder="e.g. UTR-01" required />
            </div>
            <FormField label="Public URL Slug" value={createForm.slug} onChange={v => setCreateForm({...createForm, slug: slugify(v)})} placeholder="e.g. uttara-branch" />
            <FormField label="Full Address" value={createForm.address} onChange={v => setCreateForm({...createForm, address: v})} placeholder="Street, Area, City" required />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <FormField label="Phone" value={createForm.phone} onChange={v => setCreateForm({...createForm, phone: v})} placeholder="+880..." required />
              <FormField label="Branch Email" value={createForm.email} onChange={v => setCreateForm({...createForm, email: v})} placeholder="branch@la.com.bd" type="email" required />
            </div>
            <div style={{ marginTop: '0.5rem', padding: '1.2rem', background: 'var(--glass)', borderRadius: 'var(--radius)', border: '1px dashed var(--border)' }}>
              <h4 style={{ fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--primary)' }}>Public Website Content</h4>
              <FormField label="Public Title" value={createForm.public_title} onChange={v => setCreateForm({...createForm, public_title: v})} placeholder="Language Academy Mirpur-1" />
              <FormField label="Public Description" value={createForm.public_description} onChange={v => setCreateForm({...createForm, public_description: v})} multiline rows={3} placeholder="Short branch-specific overview for the branch page" />
              <FormField label="SEO Title" value={createForm.seo_title} onChange={v => setCreateForm({...createForm, seo_title: v})} placeholder="PTE Courses in Mirpur-1 - Language Academy" />
              <FormField label="SEO Description" value={createForm.seo_description} onChange={v => setCreateForm({...createForm, seo_description: v})} multiline rows={2} placeholder="Search-friendly description for Google results" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <FormField label="Hero Image URL" value={createForm.hero_image_url} onChange={v => setCreateForm({...createForm, hero_image_url: v})} />
                <FormField label="Opening Hours" value={createForm.opening_hours} onChange={v => setCreateForm({...createForm, opening_hours: v})} placeholder="Sat-Thu: 9:00 AM - 8:00 PM" />
              </div>
              <FormField label="Map URL" value={createForm.map_url} onChange={v => setCreateForm({...createForm, map_url: v})} placeholder="Google Maps share or embed URL" />
              <FormField label="Coming Soon Message" value={createForm.coming_soon_message} onChange={v => setCreateForm({...createForm, coming_soon_message: v})} placeholder="Admissions opening soon at this branch" />
            </div>
            <div style={{ marginTop: '0.5rem', padding: '1.2rem', background: 'var(--glass)', borderRadius: 'var(--radius)', border: '1px dashed var(--primary)' }}>
              <h4 style={{ fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--primary)' }}>Branch Admin Credentials</h4>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>This admin can manage staff, students, courses, and all operations for this branch. They can assign any role (teacher, counselor, accountant, etc.) to staff within their branch.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <FormField label="Admin Name" value={createForm.admin_name} onChange={v => setCreateForm({...createForm, admin_name: v})} placeholder="Branch Manager Name" required />
                <FormField label="Admin Email" value={createForm.admin_email} onChange={v => setCreateForm({...createForm, admin_email: v})} placeholder="admin@branch.com" type="email" required />
              </div>
              <div style={{ marginTop: '1rem' }}>
                <FormField label="Initial Password" value={createForm.admin_password} onChange={v => setCreateForm({...createForm, admin_password: v})} placeholder="Min 8 characters" type="password" required />
              </div>
            </div>
            <button type="submit" disabled={formLoading} className="btn-primary" style={{ marginTop: '0.5rem', padding: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem' }}>
              {formLoading ? <Loader2 className="animate-spin" size={18} /> : <><Plus size={16} /> Create Branch</>}
            </button>
          </form>
        </Modal>
      )}

      {/* ═══ EDIT BRANCH MODAL ═══ */}
      {showEditModal && editBranch && (
        <Modal title="Edit Branch" subtitle={`Update details for ${editBranch.name}`} onClose={() => { setShowEditModal(false); setEditBranch(null); }}>
          <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <FormField label="Branch Name" value={editBranch.name} onChange={v => setEditBranch({...editBranch, name: v})} required />
            <FormField label="Public URL Slug" value={editBranch.slug || ''} onChange={v => setEditBranch({...editBranch, slug: slugify(v)})} placeholder="e.g. mirpur-1" />
            <FormField label="Full Address" value={editBranch.address || ''} onChange={v => setEditBranch({...editBranch, address: v})} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <FormField label="Phone" value={editBranch.phone || ''} onChange={v => setEditBranch({...editBranch, phone: v})} />
              <FormField label="Email" value={editBranch.email || ''} onChange={v => setEditBranch({...editBranch, email: v})} type="email" />
            </div>
            <div style={{ padding: '1.2rem', background: 'var(--glass)', borderRadius: 'var(--radius)', border: '1px dashed var(--border)' }}>
              <h4 style={{ fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--primary)' }}>Public Website Content</h4>
              <FormField label="Public Title" value={editBranch.public_title || ''} onChange={v => setEditBranch({...editBranch, public_title: v})} />
              <FormField label="Public Description" value={editBranch.public_description || ''} onChange={v => setEditBranch({...editBranch, public_description: v})} multiline rows={3} />
              <FormField label="SEO Title" value={editBranch.seo_title || ''} onChange={v => setEditBranch({...editBranch, seo_title: v})} />
              <FormField label="SEO Description" value={editBranch.seo_description || ''} onChange={v => setEditBranch({...editBranch, seo_description: v})} multiline rows={2} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <FormField label="Hero Image URL" value={editBranch.hero_image_url || ''} onChange={v => setEditBranch({...editBranch, hero_image_url: v})} />
                <FormField label="Opening Hours" value={editBranch.opening_hours || ''} onChange={v => setEditBranch({...editBranch, opening_hours: v})} />
              </div>
              <BranchImageUploadField
                imageUrl={editBranch.hero_image_url}
                uploading={imageUploading}
                onUpload={handleBranchImageUpload}
              />
              <FormField label="Map URL" value={editBranch.map_url || ''} onChange={v => setEditBranch({...editBranch, map_url: v})} />
              <FormField label="Coming Soon Message" value={editBranch.coming_soon_message || ''} onChange={v => setEditBranch({...editBranch, coming_soon_message: v})} />
            </div>
            <button type="submit" disabled={formLoading} className="btn-primary" style={{ marginTop: '0.5rem', padding: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem' }}>
              {formLoading ? <Loader2 className="animate-spin" size={18} /> : <><Edit3 size={16} /> Save Changes</>}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
};

/* ─── ACCOUNTING SECTION (sub-component) ──────────────────────── */
const AccountingSection = ({ data }) => {
  const [subTab, setSubTab] = useState('bankCash');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {[
          { id: 'bankCash', label: 'Bank & Cash', icon: Wallet },
          { id: 'income', label: 'Income', icon: ArrowUpRight },
          { id: 'expenses', label: 'Expenses', icon: ArrowDownRight },
          { id: 'journals', label: 'Journals', icon: Receipt },
          { id: 'invoices', label: 'Invoices', icon: FileText },
        ].map(t => (
          <TabButton key={t.id} active={subTab === t.id} onClick={() => setSubTab(t.id)} icon={t.icon} label={t.label} />
        ))}
      </div>

      {subTab === 'bankCash' && (
        <DataTable
          emptyText="No bank/cash accounts"
          columns={[
            { header: 'Account', render: r => <span style={{ fontWeight: '600' }}>{r.name}</span> },
            { header: 'Type', render: r => <Badge>{r.sub_type}</Badge> },
            { header: 'Balance', render: r => <span style={{ fontWeight: '700', color: parseFloat(r.balance) >= 0 ? 'var(--success)' : 'var(--danger)' }}>৳{parseFloat(r.balance || 0).toLocaleString()}</span> },
          ]}
          data={data.bankCash || []}
        />
      )}

      {subTab === 'income' && (
        <DataTable
          emptyText="No income accounts"
          columns={[
            { header: 'Account', render: r => <span style={{ fontWeight: '600' }}>{r.name}</span> },
            { header: 'Balance', render: r => `৳${parseFloat(r.balance || 0).toLocaleString()}` },
          ]}
          data={data.incomeAccounts || []}
        />
      )}

      {subTab === 'expenses' && (
        <DataTable
          emptyText="No expenses recorded"
          columns={[
            { header: 'Description', render: r => <span style={{ fontWeight: '600' }}>{r.description || r.category}</span> },
            { header: 'Category', key: 'category' },
            { header: 'Amount', render: r => `৳${parseFloat(r.amount || 0).toLocaleString()}` },
            { header: 'Status', render: r => <Badge color={r.status === 'approved' ? 'var(--success)' : r.status === 'verified' ? 'var(--success)' : 'var(--primary)'}>{r.status}</Badge> },
            { header: 'Date', render: r => r.date ? new Date(r.date).toLocaleDateString() : '—' },
          ]}
          data={data.expenses || []}
        />
      )}

      {subTab === 'journals' && (
        <DataTable
          emptyText="No journal entries"
          columns={[
            { header: 'Ref', render: r => <span style={{ fontWeight: '600', fontFamily: 'monospace', fontSize: '0.78rem' }}>{r.ref_no || `#${r.id}`}</span> },
            { header: 'Description', key: 'description' },
            { header: 'Lines', render: r => r.JournalLines?.length || 0 },
            { header: 'Date', render: r => r.date ? new Date(r.date).toLocaleDateString() : '—' },
          ]}
          data={data.journals || []}
        />
      )}

      {subTab === 'invoices' && (
        <DataTable
          emptyText="No invoices"
          columns={[
            { header: 'Invoice #', render: r => <span style={{ fontWeight: '600' }}>{r.invoice_no || `INV-${r.id}`}</span> },
            { header: 'Amount', render: r => `৳${parseFloat(r.amount || 0).toLocaleString()}` },
            { header: 'Paid', render: r => `৳${parseFloat(r.paid || 0).toLocaleString()}` },
            { header: 'Due', render: r => <span style={{ color: (r.amount - r.paid) > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: '600' }}>৳{Math.max(parseFloat(r.amount || 0) - parseFloat(r.paid || 0), 0).toLocaleString()}</span> },
            { header: 'Status', render: r => <Badge color={r.status === 'paid' ? 'var(--success)' : r.status === 'overdue' ? 'var(--danger)' : 'var(--primary)'}>{r.status}</Badge> },
            { header: 'Date', render: r => r.issued_at ? new Date(r.issued_at).toLocaleDateString() : '—' },
          ]}
          data={data.invoices || []}
        />
      )}
    </div>
  );
};

/* ─── REUSABLE COMPONENTS ─────────────────────────────────────── */
const Modal = ({ title, subtitle, onClose, children }) => (
  <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
    <div className="glass-morphism" style={{ width: '100%', maxWidth: '650px', padding: '2rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
      <X size={22} style={{ position: 'absolute', top: '1.2rem', right: '1.2rem', cursor: 'pointer', color: 'var(--text-dim)' }} onClick={onClose} />
      <h2 style={{ margin: '0 0 0.3rem', fontSize: '1.2rem' }}>{title}</h2>
      {subtitle && <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem', margin: '0 0 1.5rem' }}>{subtitle}</p>}
      {children}
    </div>
  </div>
);

const BranchImageUploadField = ({ imageUrl, uploading, onUpload }) => {
  const previewUrl = getImagePreviewUrl(imageUrl);

  return (
    <div style={{ marginTop: '1rem', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', background: 'var(--glass)' }}>
      <div style={{ height: '180px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {previewUrl ? (
          <img src={previewUrl} alt="Branch hero preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
            <ImageIcon size={28} />
            <span>No branch image uploaded</span>
          </div>
        )}
      </div>
      <div style={{ padding: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700 }}>Branch Website Image</p>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.68rem', color: 'var(--text-dim)' }}>Shown on branch cards, branch detail hero, and social previews.</p>
        </div>
        <label className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.65 : 1 }}>
          {uploading ? <Loader2 className="animate-spin" size={15} /> : <Upload size={15} />}
          {uploading ? 'Uploading...' : 'Upload Image'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={uploading}
            onChange={e => {
              const file = e.target.files?.[0];
              e.target.value = '';
              onUpload(file);
            }}
            style={{ display: 'none' }}
          />
        </label>
      </div>
    </div>
  );
};

const FormField = ({ label, value, onChange, placeholder, type = 'text', required, multiline = false, rows = 3 }) => (
  <div>
    <label style={{ fontSize: '0.78rem', display: 'block', marginBottom: '0.4rem', fontWeight: '500' }}>{label}</label>
    {multiline ? (
      <textarea
        className="glass-morphism"
        rows={rows}
        style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid var(--border)', color: 'var(--text-main)', background: 'none', fontSize: '0.85rem', resize: 'vertical' }}
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
      />
    ) : (
      <input
        className="glass-morphism"
        style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid var(--border)', color: 'var(--text-main)', background: 'none', fontSize: '0.85rem' }}
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type} required={required}
      />
    )}
  </div>
);

export default BranchManagement;
