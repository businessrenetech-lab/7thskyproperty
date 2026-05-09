import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, Plus, Search, Filter, Trash2, Edit3, Wrench, 
  AlertTriangle, Calendar, DollarSign, Tag, Download,
  MapPin, Shield, ChevronDown, Eye, X, CheckCircle,
  Clock, TrendingDown, BarChart3, FileText, Upload, Image as ImageIcon
} from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import '../styles/GlobalStyles.css';
import { useToast } from '../context/ToastContext';

/* ─── Category icon map ─── */
const CATEGORY_MAP = {
  av_equipment: { icon: '📽', label: 'A/V' },
  electronics: { icon: '🖨', label: 'Electronics' },
  electrical: { icon: '❄', label: 'Electrical' },
  furniture: { icon: '📋', label: 'Furniture' },
  computers: { icon: '💻', label: 'Computers' },
  security: { icon: '📷', label: 'Security' },
  books: { icon: '📚', label: 'Books' },
  hardware: { icon: '🔧', label: 'Hardware' },
  appliance: { icon: '⚡', label: 'Appliance' },
  stationery: { icon: '✏️', label: 'Stationery' },
  other: { icon: '📦', label: 'Other' }
};

/* ─── Status → badge class map ─── */
const STATUS_BADGE = {
  active: { cls: 'sb2 sb2-mint', label: 'Good' },
  good: { cls: 'sb2 sb2-mint', label: 'Good' },
  maintenance: { cls: 'sb2 sb2-amber', label: 'Maintenance' },
  repair: { cls: 'sb2 sb2-amber', label: 'Repair' },
  retired: { cls: 'sb2 sb2-dim', label: 'Retired' },
  disposed: { cls: 'sb2 sb2-rose', label: 'Disposed' },
  lost: { cls: 'sb2 sb2-rose', label: 'Lost' }
};

/* ─── Format currency ─── */
const fmt = (v) => {
  const num = parseFloat(v) || 0;
  return '৳' + num.toLocaleString('en-IN');
};

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const getImagePreviewUrl = (value) => {
  const imageUrl = String(value || '').trim();
  if (!imageUrl) return '';
  if (/^(https?:)?\/\//i.test(imageUrl) || imageUrl.startsWith('data:')) return imageUrl;

  const apiBase = api.defaults.baseURL || '';
  const base = /^https?:\/\//i.test(apiBase) ? apiBase.replace(/\/api\/?$/, '').replace(/\/$/, '') : '';
  const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;

  if (path.startsWith('/uploads')) {
    let token = '';
    try { token = localStorage.getItem('token') || ''; } catch {}
    const tokenParam = token ? `${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : '';
    return `${base}${path}${tokenParam}`;
  }

  return `${base}${path}`;
};

/* ════════════════════════════════════════════
   ASSET REGISTRY PAGE
   ════════════════════════════════════════════ */
const AssetRegistry = () => {
  const toast = useToast();
  const [assets, setAssets] = useState([]);
  const [stats, setStats] = useState({ total: 0, good: 0, needsService: 0, disposed: 0, totalBookValue: 0, totalCost: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');

  const [formData, setFormData] = useState({
    name: '', type: 'hardware', category: '', serial_no: '',
    location: '', image_url: '', purchase_date: '', cost: '', book_value: '',
    depreciation_rate: '20', warranty_expiry: '', status: 'active',
    condition_notes: '', notes: ''
  });

  /* ── Fetch ── */
  const fetchAssets = async () => {
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (filterCategory) params.type = filterCategory;
      if (filterStatus) params.status = filterStatus;
      const [assetsRes, statsRes] = await Promise.all([
        api.get('/assets', { params }),
        api.get('/assets/stats')
      ]);
      setAssets(assetsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to fetch assets', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAssets(); }, [searchTerm, filterCategory, filterStatus]);

  /* ── Create / Update ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = selectedImage ? new FormData() : formData;
      if (selectedImage) {
        Object.entries(formData).forEach(([key, value]) => payload.append(key, value ?? ''));
        payload.append('image', selectedImage);
      }

      if (editMode && selectedAsset) {
        await api.put(`/assets/${selectedAsset.id}`, payload);
      } else {
        await api.post('/assets', payload);
      }
      setShowAddModal(false);
      setEditMode(false);
      setSelectedImage(null);
      setImagePreviewUrl('');
      resetForm();
      await fetchAssets();
      toast.success(editMode ? 'Asset updated successfully' : 'Asset registered successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save asset');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this asset record?')) return;
    try {
      await api.delete(`/assets/${id}`);
      setShowDetailModal(false);
      fetchAssets();
    } catch (err) {
      toast.error('Failed to delete asset');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', type: 'hardware', category: '', serial_no: '',
      location: '', image_url: '', purchase_date: '', cost: '', book_value: '',
      depreciation_rate: '20', warranty_expiry: '', status: 'active',
      condition_notes: '', notes: ''
    });
    setSelectedAsset(null);
    setSelectedImage(null);
    setImagePreviewUrl('');
  };

  const openEdit = (asset) => {
    setFormData({
      name: asset.name || '', type: asset.type || 'hardware',
      category: asset.category || '', serial_no: asset.serial_no || '',
      location: asset.location || '', image_url: asset.image_url || '', purchase_date: asset.purchase_date || '',
      cost: asset.cost || '', book_value: asset.book_value || '',
      depreciation_rate: asset.depreciation_rate || '20',
      warranty_expiry: asset.warranty_expiry || '', status: asset.status || 'active',
      condition_notes: asset.condition_notes || '', notes: asset.notes || ''
    });
    setSelectedImage(null);
    setImagePreviewUrl(getImagePreviewUrl(asset.image_url));
    setSelectedAsset(asset);
    setEditMode(true);
    setShowAddModal(true);
  };

  const openDetail = (asset) => {
    setSelectedAsset(asset);
    setShowDetailModal(true);
  };

  const handleImageSelect = (file) => {
    setSelectedImage(file || null);
    setImagePreviewUrl(file ? URL.createObjectURL(file) : getImagePreviewUrl(formData.image_url));
  };

  /* ── Good condition percentage ── */
  const goodPct = stats.total > 0 ? ((stats.good / stats.total) * 100).toFixed(1) : '0.0';

  /* ═══════════════════════════════
     RENDER
     ═══════════════════════════════ */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

      {/* ── View Header ── */}
      <div className="view-head">
        <div>
          <div className="view-title">Asset Registry</div>
          <div className="view-sub">
            {stats.total} assets · Depreciation · Maintenance history · Location tracking
          </div>
        </div>
        <div className="view-actions">
          <button className="btn-ghost">
            <Download size={14} /> Export
          </button>
          <button className="btn-stitch" onClick={() => { resetForm(); setEditMode(false); setShowAddModal(true); }}>
            ＋ Add Asset
          </button>
        </div>
      </div>

      {/* ── Pulse Cards ── */}
      <div className="pulse-grid pg-4 mb24">
        <div className="pulse-card c-cyan">
          <div className="pc-icon"><Package size={28} /></div>
          <div className="pc-label">Total Assets</div>
          <div className="pc-value">{stats.total}</div>
          <div className="pc-meta">{fmt(stats.totalBookValue)} book value</div>
        </div>
        <div className="pulse-card c-mint">
          <div className="pc-icon"><CheckCircle size={28} /></div>
          <div className="pc-label">Good Condition</div>
          <div className="pc-value">{stats.good}</div>
          <div className="pc-meta">{goodPct}% of fleet</div>
        </div>
        <div className="pulse-card c-amber">
          <div className="pc-icon"><Wrench size={28} /></div>
          <div className="pc-label">Needs Service</div>
          <div className="pc-value">{stats.needsService}</div>
        </div>
        <div className="pulse-card c-rose">
          <div className="pc-icon"><AlertTriangle size={28} /></div>
          <div className="pc-label">Disposed / Lost</div>
          <div className="pc-value">{stats.disposed}</div>
        </div>
      </div>

      {/* ── Asset Table Panel ── */}
      <div className="sc">
        <div className="sc-head">
          <div className="sc-title">Asset Register</div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                className="glass-input"
                style={{ paddingLeft: 32, width: 220, fontSize: '12px', padding: '6px 10px 6px 32px' }}
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {/* Category Filter */}
            <select
              className="glass-input"
              style={{ width: 'auto', fontSize: '12px', padding: '6px 10px' }}
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {Object.entries(CATEGORY_MAP).map(([key, val]) => (
                <option key={key} value={key}>{val.icon} {val.label}</option>
              ))}
            </select>
            {/* Status Filter */}
            <select
              className="glass-input"
              style={{ width: 'auto', fontSize: '12px', padding: '6px 10px' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="active">Active / Good</option>
              <option value="maintenance">Maintenance</option>
              <option value="repair">Repair</option>
              <option value="retired">Retired</option>
              <option value="disposed">Disposed</option>
              <option value="lost">Lost</option>
            </select>
          </div>
        </div>

        <div className="st-wrap">
          <table className="stitch">
            <thead>
              <tr>
                <th>Asset Tag</th>
                <th>Name</th>
                <th>Category</th>
                <th>Location</th>
                <th>Purchase Date</th>
                <th>Cost (৳)</th>
                <th>Book Value</th>
                <th>Condition</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '3rem' }}>
                    <Package className="animate-spin" size={32} style={{ display: 'inline-block', color: 'var(--primary)' }} />
                    <div style={{ marginTop: '0.8rem', color: 'var(--text-dim)', fontSize: '13px' }}>Loading assets...</div>
                  </td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                    No assets found. Click "＋ Add Asset" to register your first item.
                  </td>
                </tr>
              ) : assets.map(asset => {
                const cat = CATEGORY_MAP[asset.type] || CATEGORY_MAP.other;
                const statusBadge = STATUS_BADGE[asset.status] || STATUS_BADGE.active;
                return (
                  <tr key={asset.id}>
                    <td className="td-mono">{asset.asset_tag || `AST-${String(asset.id).padStart(3, '0')}`}</td>
                    <td className="td-name">{asset.name}</td>
                    <td><span className="exp-cat">{cat.icon} {asset.category || cat.label}</span></td>
                    <td>{asset.location || '—'}</td>
                    <td className="td-mono">{fmtDate(asset.purchase_date)}</td>
                    <td>{fmt(asset.cost)}</td>
                    <td className="running-bal bal-pos">{fmt(asset.book_value || asset.cost)}</td>
                    <td><span className={statusBadge.cls}>{statusBadge.label}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn-ghost"
                          style={{ fontSize: '11px', padding: '3px 8px' }}
                          onClick={() => openDetail(asset)}
                        >
                          <Eye size={12} /> Details
                        </button>
                        <button
                          className="btn-ghost"
                          style={{ fontSize: '11px', padding: '3px 8px' }}
                          onClick={() => openEdit(asset)}
                        >
                          <Edit3 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Depreciation Summary Panel ── */}
      {assets.length > 0 && (
        <div className="g2" style={{ marginTop: '16px' }}>
          <div className="sc">
            <div className="sc-head">
              <div className="sc-title">Depreciation Overview</div>
              <span className="sb2 sb2-cyan"><TrendingDown size={10} /> Annual</span>
            </div>
            <div className="sc-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="row-sb">
                  <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Total Purchase Cost</span>
                  <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{fmt(stats.totalCost)}</span>
                </div>
                <div className="row-sb">
                  <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Current Book Value</span>
                  <span className="running-bal bal-pos">{fmt(stats.totalBookValue)}</span>
                </div>
                <div className="divider" />
                <div className="row-sb">
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>Total Depreciation</span>
                  <span className="running-bal bal-neg">
                    {fmt(Math.max(0, (stats.totalCost || 0) - (stats.totalBookValue || 0)))}
                  </span>
                </div>
                <div className="pbar" style={{ marginTop: '8px' }}>
                  <div 
                    className="pbar-fill pf-cyan" 
                    style={{ width: stats.totalCost > 0 ? `${((stats.totalBookValue / stats.totalCost) * 100).toFixed(0)}%` : '0%' }} 
                  />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', textAlign: 'right' }}>
                  {stats.totalCost > 0 ? `${((stats.totalBookValue / stats.totalCost) * 100).toFixed(1)}%` : '0%'} value retained
                </div>
              </div>
            </div>
          </div>

          <div className="sc">
            <div className="sc-head">
              <div className="sc-title">Asset Condition Matrix</div>
              <span className="sb2 sb2-mint"><BarChart3 size={10} /> Live</span>
            </div>
            <div className="sc-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Good */}
              <div>
                <div className="row-sb" style={{ marginBottom: '5px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-main)' }}>Good / Active</span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#4DFFA8' }}>{stats.good} · {goodPct}%</span>
                </div>
                <div className="pbar"><div className="pbar-fill pf-mint" style={{ width: `${goodPct}%` }} /></div>
              </div>
              {/* Needs Service */}
              <div>
                <div className="row-sb" style={{ marginBottom: '5px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-main)' }}>Needs Service</span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#FFCA7A' }}>
                    {stats.needsService} · {stats.total > 0 ? ((stats.needsService / stats.total) * 100).toFixed(1) : '0'}%
                  </span>
                </div>
                <div className="pbar"><div className="pbar-fill pf-amber" style={{ width: stats.total > 0 ? `${(stats.needsService / stats.total) * 100}%` : '0%' }} /></div>
              </div>
              {/* Disposed */}
              <div>
                <div className="row-sb" style={{ marginBottom: '5px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-main)' }}>Disposed / Lost</span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#FF7088' }}>
                    {stats.disposed} · {stats.total > 0 ? ((stats.disposed / stats.total) * 100).toFixed(1) : '0'}%
                  </span>
                </div>
                <div className="pbar"><div className="pbar-fill pf-rose" style={{ width: stats.total > 0 ? `${(stats.disposed / stats.total) * 100}%` : '0%' }} /></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ ADD / EDIT ASSET MODAL ════ */}
      <Modal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditMode(false); resetForm(); }}
        title={editMode ? 'Edit Asset' : 'Register New Asset'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Name */}
          <div className="fgroup">
            <label className="flabel">Asset Name *</label>
            <input className="glass-input" required value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Epson EB-X51 Projector" />
          </div>

          <div className="fgrid2">
            {/* Type */}
            <div className="fgroup">
              <label className="flabel">Type</label>
              <select className="glass-input" value={formData.type}
                onChange={(e) => {
                  const cat = CATEGORY_MAP[e.target.value];
                  setFormData({ ...formData, type: e.target.value, category: cat?.label || '' });
                }}>
                {Object.entries(CATEGORY_MAP).map(([key, val]) => (
                  <option key={key} value={key}>{val.icon} {val.label}</option>
                ))}
              </select>
            </div>
            {/* Category Label Override */}
            <div className="fgroup">
              <label className="flabel">Category Label</label>
              <input className="glass-input" value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g. A/V Equipment" />
            </div>
          </div>

          <div className="fgroup">
            <label className="flabel">Asset Image</label>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', alignItems: 'center' }}>
              <div style={{
                width: '120px', height: '90px', borderRadius: '12px', border: '1px solid var(--border)',
                background: 'var(--glass)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)'
              }}>
                {imagePreviewUrl ? (
                  <img src={imagePreviewUrl} alt="Asset preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <ImageIcon size={28} />
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input
                  className="glass-input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageSelect(e.target.files?.[0])}
                  style={{ padding: '8px' }}
                />
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Upload size={12} /> JPG, PNG, WEBP, or GIF up to 5MB. New uploads replace the current asset image.
                </div>
              </div>
            </div>
          </div>

          <div className="fgrid2">
            {/* Serial */}
            <div className="fgroup">
              <label className="flabel">Serial Number</label>
              <input className="glass-input" value={formData.serial_no}
                onChange={(e) => setFormData({ ...formData, serial_no: e.target.value })}
                placeholder="S/N or Model #" />
            </div>
            {/* Location */}
            <div className="fgroup">
              <label className="flabel">Location</label>
              <input className="glass-input" value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Room 201, Hall A" />
            </div>
          </div>

          <div className="fgrid2">
            {/* Purchase Date */}
            <div className="fgroup">
              <label className="flabel">Purchase Date</label>
              <input className="glass-input" type="date" value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })} />
            </div>
            {/* Warranty Expiry */}
            <div className="fgroup">
              <label className="flabel">Warranty Expiry</label>
              <input className="glass-input" type="date" value={formData.warranty_expiry}
                onChange={(e) => setFormData({ ...formData, warranty_expiry: e.target.value })} />
            </div>
          </div>

          <div className="fgrid2">
            {/* Cost */}
            <div className="fgroup">
              <label className="flabel">Purchase Cost (৳)</label>
              <input className="glass-input" type="number" value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                placeholder="0.00" />
            </div>
            {/* Book Value */}
            <div className="fgroup">
              <label className="flabel">Current Book Value (৳)</label>
              <input className="glass-input" type="number" value={formData.book_value}
                onChange={(e) => setFormData({ ...formData, book_value: e.target.value })}
                placeholder="Auto from cost if empty" />
            </div>
          </div>

          <div className="fgrid2">
            {/* Depreciation Rate */}
            <div className="fgroup">
              <label className="flabel">Depreciation Rate (% / year)</label>
              <input className="glass-input" type="number" value={formData.depreciation_rate}
                onChange={(e) => setFormData({ ...formData, depreciation_rate: e.target.value })}
                placeholder="20" />
            </div>
            {/* Status */}
            <div className="fgroup">
              <label className="flabel">Condition Status</label>
              <select className="glass-input" value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                <option value="active">Active / Good</option>
                <option value="maintenance">In Maintenance</option>
                <option value="repair">Needs Repair</option>
                <option value="retired">Retired</option>
                <option value="disposed">Disposed</option>
                <option value="lost">Lost</option>
              </select>
            </div>
          </div>

          {/* Condition Notes */}
          <div className="fgroup">
            <label className="flabel">Condition Notes</label>
            <textarea className="glass-input" value={formData.condition_notes}
              onChange={(e) => setFormData({ ...formData, condition_notes: e.target.value })}
              placeholder="Describe current condition..." rows={3}
              style={{ resize: 'vertical', minHeight: '70px' }} />
          </div>

          <button type="submit" className="btn-stitch" style={{ marginTop: '0.5rem', padding: '12px', justifyContent: 'center' }}>
            {editMode ? '✓ Update Asset' : '＋ Register Asset'}
          </button>
        </form>
      </Modal>

      {/* ════ DETAIL DRAWER MODAL ════ */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Asset Details"
      >
        {selectedAsset && (() => {
          const a = selectedAsset;
          const cat = CATEGORY_MAP[a.type] || CATEGORY_MAP.other;
          const statusBadge = STATUS_BADGE[a.status] || STATUS_BADGE.active;
          const assetImageUrl = getImagePreviewUrl(a.image_url);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: assetImageUrl ? '140px 1fr' : '1fr', gap: '16px', alignItems: 'flex-start' }}>
                {assetImageUrl && (
                  <div style={{ width: '140px', height: '110px', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--glass)' }}>
                    <img src={assetImageUrl} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: 4 }}>{a.asset_tag || `AST-${String(a.id).padStart(3, '0')}`}</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>{a.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: 4 }}>
                    <span className="exp-cat">{cat.icon} {a.category || cat.label}</span>
                    <span style={{ margin: '0 8px' }}>·</span>
                    <span className={statusBadge.cls}>{statusBadge.label}</span>
                  </div>
                </div>
              </div>

              <div className="divider" />

              {/* Detail Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div className="flabel">Serial Number</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-main)', marginTop: 4 }}>{a.serial_no || '—'}</div>
                </div>
                <div>
                  <div className="flabel">Location</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-main)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={12} /> {a.location || 'Not assigned'}
                  </div>
                </div>
                <div>
                  <div className="flabel">Purchase Date</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-main)', marginTop: 4 }}>{fmtDate(a.purchase_date)}</div>
                </div>
                <div>
                  <div className="flabel">Warranty Expiry</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-main)', marginTop: 4 }}>{fmtDate(a.warranty_expiry)}</div>
                </div>
                <div>
                  <div className="flabel">Purchase Cost</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', marginTop: 4 }}>{fmt(a.cost)}</div>
                </div>
                <div>
                  <div className="flabel">Book Value</div>
                  <div className="running-bal bal-pos" style={{ fontSize: '16px', marginTop: 4 }}>{fmt(a.book_value || a.cost)}</div>
                </div>
                <div>
                  <div className="flabel">Depreciation Rate</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-main)', marginTop: 4 }}>{a.depreciation_rate || 20}% per year</div>
                </div>
                <div>
                  <div className="flabel">Last Maintained</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-main)', marginTop: 4 }}>{a.last_maintained ? new Date(a.last_maintained).toLocaleDateString() : 'Never'}</div>
                </div>
              </div>

              {/* Depreciation Bar */}
              {parseFloat(a.cost) > 0 && (
                <>
                  <div className="divider" />
                  <div>
                    <div className="flabel" style={{ marginBottom: 8 }}>Value Retention</div>
                    <div className="pbar" style={{ height: '8px' }}>
                      <div className="pbar-fill pf-mint" style={{ width: `${((parseFloat(a.book_value || a.cost) / parseFloat(a.cost)) * 100)}%` }} />
                    </div>
                    <div className="row-sb" style={{ marginTop: 6 }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Depreciated: {fmt(parseFloat(a.cost) - parseFloat(a.book_value || a.cost))}</span>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#4DFFA8' }}>
                        {((parseFloat(a.book_value || a.cost) / parseFloat(a.cost)) * 100).toFixed(1)}% retained
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Condition Notes */}
              {a.condition_notes && (
                <>
                  <div className="divider" />
                  <div>
                    <div className="flabel">Condition Notes</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: 6, lineHeight: 1.6 }}>{a.condition_notes}</div>
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="divider" />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setShowDetailModal(false); openEdit(a); }}>
                  <Edit3 size={14} /> Edit
                </button>
                <button className="btn-ghost" style={{ flex: 1, justifyContent: 'center', color: '#FF7088', borderColor: 'rgba(255,77,109,0.2)' }} onClick={() => handleDelete(a.id)}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

export default AssetRegistry;
