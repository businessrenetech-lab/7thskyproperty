import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Globe, ExternalLink, RefreshCw, CheckCircle2, AlertCircle, Clock,
  FileText, Home, Hotel, KeyRound, Wrench, Sparkles, Filter, Search,
  ArrowRight, Eye, Star, Check, X, ShieldAlert, Users, Phone, Mail, Edit3
} from 'lucide-react';
import {
  PageHead, Button, Badge, StatusBadge, StatCard, EmptyState,
  SearchInput, Spinner, Drawer, KV
} from '../ui/kit';

export default function WebsiteManagement() {
  const toast = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('inquiries');
  const [inquiryType, setInquiryType] = useState('all');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [editingPriceProperty, setEditingPriceProperty] = useState(null);
  const [newPriceValue, setNewPriceValue] = useState('');

  const websiteUrl = 'http://localhost:3050';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/public-website/admin/summary');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load website management data:', err);
      toast.error('Could not load website statistics. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle toggling property published status
  const handleTogglePublish = async (property) => {
    const nextPublished = !property.is_published;
    setUpdatingId(property.id);
    try {
      await api.patch(`/public-website/admin/properties/${property.id}/publish`, {
        is_published: nextPublished,
      });
      toast.success(nextPublished ? `"${property.title || property.property_code}" is now LIVE on website.` : `Listing unpublished from website.`);
      loadData();
    } catch (err) {
      toast.error('Failed to update publishing status');
    } finally {
      setUpdatingId(null);
    }
  };

  // Handle toggling property featured flag
  const handleToggleFeatured = async (property) => {
    const nextFeatured = !property.is_featured;
    setUpdatingId(property.id);
    try {
      await api.patch(`/public-website/admin/properties/${property.id}/publish`, {
        is_featured: nextFeatured,
      });
      toast.success(nextFeatured ? `Marked as Featured on website homepage.` : `Removed from featured listings.`);
      loadData();
    } catch (err) {
      toast.error('Failed to update featured status');
    } finally {
      setUpdatingId(null);
    }
  };

  // Handle price update directly from website management
  const handleSavePrice = async (property, newPrice) => {
    const numPrice = Number(newPrice);
    if (isNaN(numPrice) || numPrice < 0) {
      toast.error('Please enter a valid price amount.');
      return;
    }
    setUpdatingId(property.id);
    try {
      await api.patch(`/public-website/admin/properties/${property.id}/publish`, {
        price: numPrice,
      });
      toast.success(`Price for "${property.title || property.property_code}" updated to ৳${numPrice.toLocaleString()} and live on website.`);
      setEditingPriceProperty(null);
      loadData();
    } catch (err) {
      toast.error('Failed to update price.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Flattened unified inquiries list
  const unifiedInquiries = useMemo(() => {
    if (!data?.inquiries) return [];
    const list = [];

    (data.inquiries.buyer || []).forEach(item => {
      list.push({
        ...item,
        _type: 'buyer',
        _typeLabel: 'Buyer Enquiry',
        _typeName: item.enquirer_name,
        _typePhone: item.phone,
        _typeEmail: item.email,
        _typeProperty: item.property?.title || item.property?.property_code || item.preferred_area || 'General Sale',
        _typeCode: item.enquiry_code,
        _typeDate: item.created_at,
        _typeStatus: item.stage,
        _deskUrl: '/residential/enquiry',
      });
    });

    (data.inquiries.rental || []).forEach(item => {
      list.push({
        ...item,
        _type: 'rental',
        _typeLabel: 'Rental Enquiry',
        _typeName: item.enquirer_name,
        _typePhone: item.phone,
        _typeEmail: item.email,
        _typeProperty: item.property?.title || item.property?.property_code || 'Rental Property',
        _typeCode: item.enquiry_code,
        _typeDate: item.created_at,
        _typeStatus: item.stage,
        _deskUrl: '/property-management/enquiries',
      });
    });

    (data.inquiries.applications || []).forEach(item => {
      list.push({
        ...item,
        _type: 'application',
        _typeLabel: 'Tenant Application',
        _typeName: item.applicant_name,
        _typePhone: item.mobile,
        _typeEmail: item.email,
        _typeProperty: item.property?.title || item.property?.property_code || 'Tenancy Application',
        _typeCode: item.application_code,
        _typeDate: item.created_at || item.submitted_at,
        _typeStatus: item.status,
        _deskUrl: '/property-management/applications',
      });
    });

    (data.inquiries.care || []).forEach(item => {
      list.push({
        ...item,
        _type: 'care',
        _typeLabel: 'Care Service Request',
        _typeName: item.customer_name,
        _typePhone: item.mobile,
        _typeEmail: item.email,
        _typeProperty: item.service_interest || item.service_category || 'Property Care',
        _typeCode: item.enquiry_code,
        _typeDate: item.created_at,
        _typeStatus: item.stage,
        _deskUrl: '/property-care/enquiries',
      });
    });

    (data.inquiries.leads || []).forEach(item => {
      const isAppraisal = item.source === 'website_appraisal';
      list.push({
        ...item,
        _type: isAppraisal ? 'appraisal' : 'contact',
        _typeLabel: isAppraisal ? 'Appraisal Request' : 'Website Contact',
        _typeName: item.name,
        _typePhone: item.phone,
        _typeEmail: item.email,
        _typeProperty: item.requirement || 'Valuation / Enquiry',
        _typeCode: item.lead_code,
        _typeDate: item.created_at,
        _typeStatus: item.status,
        _deskUrl: '/leads',
      });
    });

    return list.sort((a, b) => new Date(b._typeDate || 0) - new Date(a._typeDate || 0));
  }, [data]);

  // Filtered inquiries
  const filteredInquiries = useMemo(() => {
    return unifiedInquiries.filter(item => {
      if (inquiryType !== 'all' && item._type !== inquiryType) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = item._typeName?.toLowerCase().includes(q);
        const matchCode = item._typeCode?.toLowerCase().includes(q);
        const matchPhone = item._typePhone?.includes(q);
        const matchProp = item._typeProperty?.toLowerCase().includes(q);
        return matchName || matchCode || matchPhone || matchProp;
      }
      return true;
    });
  }, [unifiedInquiries, inquiryType, searchQuery]);

  // Filtered properties
  const filteredProperties = useMemo(() => {
    if (!data?.properties) return [];
    return data.properties.filter(p => {
      if (propertyFilter === 'published' && !p.is_published) return false;
      if (propertyFilter === 'unpublished' && p.is_published) return false;
      if (propertyFilter === 'featured' && !p.is_featured) return false;
      if (propertyFilter === 'sales' && p.listing_type !== 'sale') return false;
      if (propertyFilter === 'rentals' && !['rent', 'lease'].includes(p.listing_type)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          p.title?.toLowerCase().includes(q) ||
          p.property_code?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data?.properties, propertyFilter, searchQuery]);

  const stats = data?.stats || {};

  return (
    <div className="pm-scope" style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header */}
      <PageHead
        title="Website Management"
        desc="Control live public listings, oversee website enquiries, and monitor inbound visitor traffic."
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Button variant="ghost" icon={RefreshCw} onClick={loadData} disabled={loading}>
              Refresh
            </Button>
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
            >
              <Globe size={16} />
              <span>Open Public Website</span>
              <ExternalLink size={14} />
            </a>
          </div>
        }
      />

      {/* KPI Cards Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard
          icon={Globe}
          label="Total Website Inquiries"
          value={stats.total_inquiries ?? '—'}
          tone="sky"
        />
        <StatCard
          icon={FileText}
          label="Tenant Applications"
          value={stats.tenant_applications?.total ?? '—'}
          tone="blue"
        />
        <StatCard
          icon={KeyRound}
          label="Rental Inquiries"
          value={stats.rental_enquiries?.total ?? '—'}
          tone="green"
        />
        <StatCard
          icon={Home}
          label="Buyer Inquiries"
          value={stats.buyer_enquiries?.total ?? '—'}
          tone="amber"
        />
        <StatCard
          icon={Wrench}
          label="Care Service Requests"
          value={stats.care_enquiries?.total ?? '—'}
          tone="blue"
        />
        <StatCard
          icon={Hotel}
          label="Published On Website"
          value={stats.inventory?.total_properties ?? '—'}
          tone="green"
        />
      </div>

      {/* Navigation Tabs */}
      <div style={{ borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', gap: '1.5rem' }}>
        <button
          onClick={() => { setActiveTab('inquiries'); setSearchQuery(''); }}
          style={{
            padding: '0.75rem 0.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'inquiries' ? '2px solid #00AEEF' : '2px solid transparent',
            color: activeTab === 'inquiries' ? '#012a4e' : '#64748b',
            fontWeight: activeTab === 'inquiries' ? 700 : 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>Website Enquiries & Applications</span>
          <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', background: activeTab === 'inquiries' ? '#e0f2fe' : '#f1f5f9', color: activeTab === 'inquiries' ? '#0284c7' : '#64748b' }}>
            {unifiedInquiries.length}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('listings'); setSearchQuery(''); }}
          style={{
            padding: '0.75rem 0.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'listings' ? '2px solid #00AEEF' : '2px solid transparent',
            color: activeTab === 'listings' ? '#012a4e' : '#64748b',
            fontWeight: activeTab === 'listings' ? 700 : 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>Website Listings & Publishing Matrix</span>
          <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', background: activeTab === 'listings' ? '#e0f2fe' : '#f1f5f9', color: activeTab === 'listings' ? '#0284c7' : '#64748b' }}>
            {data?.properties?.length || 0}
          </span>
        </button>
      </div>

      {/* ─── TAB 1: UNIFIED INQUIRIES DESK ───────────────────────────────────── */}
      {activeTab === 'inquiries' && (
        <div>
          {/* Sub-Filter Bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {[
                { id: 'all', label: 'All Inquiries' },
                { id: 'application', label: 'Tenant Applications' },
                { id: 'rental', label: 'Rental Inquiries' },
                { id: 'buyer', label: 'Buyer Inquiries' },
                { id: 'care', label: 'Service Requests' },
                { id: 'appraisal', label: 'Appraisals' },
                { id: 'contact', label: 'Contact Messages' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setInquiryType(t.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: inquiryType === t.id ? '#012a4e' : '#e2e8f0',
                    background: inquiryType === t.id ? '#012a4e' : '#ffffff',
                    color: inquiryType === t.id ? '#ffffff' : '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ minWidth: '240px' }}>
              <SearchInput
                placeholder="Search by name, code, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Inquiries Table */}
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <Spinner />
              <p style={{ marginTop: '0.5rem', color: '#64748b', fontSize: '0.9rem' }}>Loading website inquiries...</p>
            </div>
          ) : filteredInquiries.length === 0 ? (
            <div className="pm-card">
              <EmptyState
                icon={Globe}
                title="No website inquiries found"
                hint="New inquiries submitted from the website forms will appear here automatically."
              />
            </div>
          ) : (
            <div className="pm-card" style={{ overflowX: 'auto', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                    <th style={{ padding: '12px 16px' }}>Date</th>
                    <th style={{ padding: '12px 16px' }}>Code</th>
                    <th style={{ padding: '12px 16px' }}>Channel / Type</th>
                    <th style={{ padding: '12px 16px' }}>Applicant / Enquirer</th>
                    <th style={{ padding: '12px 16px' }}>Property / Requirement</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInquiries.map((item, idx) => (
                    <tr
                      key={item._typeCode || idx}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.1s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {item._typeDate ? new Date(item._typeDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#012a4e', whiteSpace: 'nowrap' }}>
                        <span className="code-chip" style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontSize: '11px' }}>
                          {item._typeCode}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: item._type === 'application' ? '#fef3c7' : item._type === 'rental' ? '#e0f2fe' : item._type === 'buyer' ? '#dcfce7' : '#f3e8ff',
                          color: item._type === 'application' ? '#b45309' : item._type === 'rental' ? '#0369a1' : item._type === 'buyer' ? '#15803d' : '#7e22ce',
                        }}>
                          {item._typeLabel}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{item._typeName}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {item._typePhone && <span><Phone size={11} style={{ verticalAlign: 'middle' }} /> {item._typePhone}</span>}
                          {item._typeEmail && <span><Mail size={11} style={{ verticalAlign: 'middle' }} /> {item._typeEmail}</span>}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: '300px' }}>
                        <div style={{ fontWeight: 500, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item._typeProperty}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <StatusBadge status={item._typeStatus || 'new'} />
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            onClick={() => setSelectedInquiry(item)}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '4px 8px' }}
                            title="View Quick Details"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => navigate(item._deskUrl)}
                            className="btn btn-primary btn-sm"
                            style={{ padding: '4px 10px', fontSize: '11px', gap: '4px' }}
                          >
                            <span>Open Desk</span>
                            <ArrowRight size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: WEBSITE PROPERTY LISTINGS MATRIX ─────────────────────────── */}
      {activeTab === 'listings' && (
        <div>
          {/* Sub-Filter Bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {[
                { id: 'all', label: 'All Inventory' },
                { id: 'published', label: 'Live On Website' },
                { id: 'unpublished', label: 'Unlisted / Draft' },
                { id: 'featured', label: 'Featured on Homepage' },
                { id: 'sales', label: 'For Sale' },
                { id: 'rentals', label: 'For Rent' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setPropertyFilter(t.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: propertyFilter === t.id ? '#012a4e' : '#e2e8f0',
                    background: propertyFilter === t.id ? '#012a4e' : '#ffffff',
                    color: propertyFilter === t.id ? '#ffffff' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ minWidth: '240px' }}>
              <SearchInput
                placeholder="Search properties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Properties Matrix Table */}
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <Spinner />
              <p style={{ marginTop: '0.5rem', color: '#64748b' }}>Loading listings matrix...</p>
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="pm-card">
              <EmptyState
                icon={Home}
                title="No matching properties found"
                hint="Add properties in Property Management to make them visible for website publishing."
              />
            </div>
          ) : (
            <div className="pm-card" style={{ overflowX: 'auto', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                    <th style={{ padding: '12px 16px' }}>Photo</th>
                    <th style={{ padding: '12px 16px' }}>Code</th>
                    <th style={{ padding: '12px 16px' }}>Title & Category</th>
                    <th style={{ padding: '12px 16px' }}>Type</th>
                    <th style={{ padding: '12px 16px' }}>Price</th>
                    <th style={{ padding: '12px 16px' }}>Listing Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Live on Website</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Featured</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProperties.map((p) => {
                    const isUpdating = updatingId === p.id;
                    return (
                      <tr
                        key={p.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.1s ease',
                          opacity: isUpdating ? 0.6 : 1,
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            background: '#f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            {p.featured_image_url ? (
                              <img src={p.featured_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <Home size={18} color="#94a3b8" />
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: '#012a4e', whiteSpace: 'nowrap' }}>
                          <span className="code-chip" style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontSize: '11px' }}>
                            {p.property_code}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.title || 'Untitled Property'}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'capitalize' }}>
                            {p.category}
                          </div>
                        </td>
                        <td style={{ padding: '10px 16px', textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                          {p.listing_type}
                        </td>
                        <td style={{ padding: '10px 16px', fontWeight: 600, color: '#012a4e', whiteSpace: 'nowrap' }}>
                          {editingPriceProperty?.id === p.id ? (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleSavePrice(p, newPriceValue);
                              }}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <input
                                type="number"
                                autoFocus
                                value={newPriceValue}
                                onChange={(e) => setNewPriceValue(e.target.value)}
                                style={{
                                  width: '90px',
                                  padding: '4px 6px',
                                  fontSize: '12px',
                                  borderRadius: '6px',
                                  border: '1px solid #00AEEF',
                                  outline: 'none',
                                }}
                              />
                              <button
                                type="submit"
                                className="btn btn-primary btn-sm"
                                style={{ padding: '3px 7px', fontSize: '11px' }}
                                disabled={isUpdating}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                style={{ padding: '3px 5px', fontSize: '11px' }}
                                onClick={() => setEditingPriceProperty(null)}
                              >
                                ✕
                              </button>
                            </form>
                          ) : (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <span>{p.price ? `৳${Number(p.price).toLocaleString()}` : '—'}</span>
                              <button
                                onClick={() => {
                                  setEditingPriceProperty(p);
                                  setNewPriceValue(p.price || '');
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '2px',
                                  color: '#64748b',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                }}
                                title="Quick Edit Price"
                              >
                                <Edit3 size={13} />
                              </button>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <StatusBadge status={p.listing_status || p.status} />
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleTogglePublish(p)}
                            disabled={isUpdating}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '16px',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              background: p.is_published ? '#dcfce7' : '#f1f5f9',
                              color: p.is_published ? '#166534' : '#64748b',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            {p.is_published ? <Check size={12} /> : <X size={12} />}
                            <span>{p.is_published ? 'Published' : 'Draft'}</span>
                          </button>
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleToggleFeatured(p)}
                            disabled={isUpdating}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: p.is_featured ? '#eab308' : '#cbd5e1',
                              padding: '4px',
                            }}
                            title={p.is_featured ? 'Featured on Homepage' : 'Mark as Featured'}
                          >
                            <Star size={18} fill={p.is_featured ? '#eab308' : 'none'} />
                          </button>
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <a
                              href={`http://localhost:3050/properties/${p.slug || p.property_code || p.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: '11px', gap: '4px', textDecoration: 'none' }}
                              title="View Live Listing on Website"
                            >
                              <ExternalLink size={12} />
                              <span>Live</span>
                            </a>
                            <button
                              onClick={() => {
                                if (p.listing_type === 'short_term') {
                                  navigate(`/short-stay/properties/${p.id}/edit`);
                                } else if (p.listing_type === 'sale') {
                                  navigate(`/residential/properties/new/${p.id}`);
                                } else {
                                  navigate(`/property-management/rentals/new/${p.id}`);
                                }
                              }}
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: '11px' }}
                            >
                              <span>Edit & Photos</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── DETAIL DRAWER ───────────────────────────────────────────────────── */}
      {selectedInquiry && (
        <Drawer
          title={`${selectedInquiry._typeLabel}: ${selectedInquiry._typeCode}`}
          onClose={() => setSelectedInquiry(null)}
          width={520}
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <Button variant="ghost" onClick={() => setSelectedInquiry(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const url = selectedInquiry._deskUrl;
                  setSelectedInquiry(null);
                  navigate(url);
                }}
              >
                <span>Jump to Operational Desk</span>
                <ArrowRight size={14} />
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Inquiry Source</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#012a4e', marginTop: '2px' }}>Public Website ({selectedInquiry._typeLabel})</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Submitted on: {new Date(selectedInquiry._typeDate).toLocaleString('en-GB')}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '13px', textTransform: 'uppercase', color: '#475569', fontWeight: 700 }}>Contact Information</h4>
              <KV k="Full Name" v={selectedInquiry._typeName} />
              <KV k="Phone / Mobile" v={selectedInquiry._typePhone} />
              <KV k="Email Address" v={selectedInquiry._typeEmail} />
              {selectedInquiry.occupation && <KV k="Occupation" v={selectedInquiry.occupation} />}
              {selectedInquiry.employer && <KV k="Employer" v={selectedInquiry.employer} />}
              {selectedInquiry.monthly_income && <KV k="Monthly Income" v={`৳${Number(selectedInquiry.monthly_income).toLocaleString()}`} />}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '13px', textTransform: 'uppercase', color: '#475569', fontWeight: 700 }}>Requirement & Details</h4>
              <KV k="Property / Service" v={selectedInquiry._typeProperty} />
              {selectedInquiry.budget && <KV k="Budget / Offer" v={`৳${Number(selectedInquiry.budget).toLocaleString()}`} />}
              {selectedInquiry.preferred_move_in && <KV k="Preferred Move-in" v={selectedInquiry.preferred_move_in} />}
              {selectedInquiry.lease_period && <KV k="Lease Period" v={selectedInquiry.lease_period} />}
              {selectedInquiry.notes && <KV k="Message / Notes" v={selectedInquiry.notes} />}
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
}
