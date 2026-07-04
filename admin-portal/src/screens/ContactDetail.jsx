import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft, Phone, Mail, Globe2, BadgeCheck, Plus, Trash2, UserCheck,
  FileText, Upload, Calendar, DollarSign, CheckCircle2, MessageSquare,
  Eye, Share2, ClipboardCheck, Users, ShieldAlert, Paperclip, PlusCircle
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  PageHead, Button, DataTable, StatusBadge, Badge, Drawer, Field,
  Input, Textarea, Select, KV, Spinner, SearchInput
} from '../ui/kit';

export default function ContactDetail({ contactId, onBack }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState(null);
  const [client, setClient] = useState(null);
  const [communications, setCommunications] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [registerEntries, setRegisterEntries] = useState([]);
  const [properties, setProperties] = useState([]); // properties owned/leased by this contact
  const [allProperties, setAllProperties] = useState([]); // catalog for shortlisting
  const [defs, setDefs] = useState([]);
  
  // Tab states
  const [activeTab, setActiveTab] = useState('overview');
  
  // Modal / Drawer states
  const [activeDrawer, setActiveDrawer] = useState(null); // 'edit_contact' | 'add_comm' | 'add_invoice' | 'add_payment' | 'add_requirement' | 'add_shortlist' | 'add_third_party'
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Load everything
  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Get contact detail
      const res = await api.get(`/contacts/${contactId}`);
      setContact(res.data.data);
      setCommunications(res.data.communications || []);
      setInvoices(res.data.invoices || []);
      setPayments(res.data.payments || []);
      setRegisterEntries(res.data.registerEntries || []);
      
      const clientProfile = res.data.data.Clients && res.data.data.Clients[0];
      setClient(clientProfile);

      // 2. Fetch properties owned or leased by this contact
      const pRes = await api.get(`/properties?limit=100`);
      const props = pRes.data.data || [];
      setAllProperties(props);

      if (res.data.data.is_client) {
        // Filter properties where contact is owner or tenant
        const ownedOrLeased = props.filter(p => p.owner_contact_id === res.data.data.id || p.tenant_contact_id === res.data.data.id);
        setProperties(ownedOrLeased);
      }
    } catch (e) {
      toast.error('Failed to load contact dashboard details');
    } finally {
      setLoading(false);
    }
  }, [contactId, toast]);

  useEffect(() => {
    load();
    // Load register definitions
    api.get('/registers/definitions')
      .then(({ data }) => setDefs(data.data || []))
      .catch(() => {});
  }, [load]);

  // Find definitions
  const buyerMasterDef = defs.find(d => d.register_key === 'buyer_master_register');
  const requirementDef = defs.find(d => d.register_key === 'buyer_requirement_form');
  const shortlistDef = defs.find(d => d.register_key === 'property_shortlist_and_compare');

  // Find entries
  const buyerMasterEntry = buyerMasterDef ? registerEntries.find(r => r.register_definition_id === buyerMasterDef.id) : null;
  const requirementEntries = requirementDef ? registerEntries.filter(r => r.register_definition_id === requirementDef.id) : [];
  const shortlistEntries = shortlistDef ? registerEntries.filter(r => r.register_definition_id === shortlistDef.id) : [];

  // Convert contact to Client with role
  const convertToClient = async (roleName) => {
    try {
      const payload = {
        is_buyer: roleName === 'buyer',
        is_seller: roleName === 'seller',
        is_landlord: roleName === 'landlord',
        is_tenant: roleName === 'tenant',
        client_segment: 'standard',
        notes: 'Converted from contact'
      };
      await api.post(`/contacts/${contactId}/convert`, payload);
      toast.success(`Promoted to Client (${roleName})`);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to convert to client');
    }
  };

  // Add a new role flag to client profile
  const toggleRoleFlag = async (flagName, val) => {
    if (!client) return;
    try {
      const payload = {
        is_buyer: flagName === 'is_buyer' ? val : client.is_buyer,
        is_seller: flagName === 'is_seller' ? val : client.is_seller,
        is_landlord: flagName === 'is_landlord' ? val : client.is_landlord,
        is_tenant: flagName === 'is_tenant' ? val : client.is_tenant,
        is_service_client: flagName === 'is_service_client' ? val : client.is_service_client,
        is_nrb_client: flagName === 'is_nrb_client' ? val : client.is_nrb_client,
      };
      await api.put(`/clients/${client.id}`, payload);
      toast.success('Client roles updated');
      load();
    } catch (e) {
      toast.error('Failed to update roles');
    }
  };

  // Save Buyer Master Preference Profile (single entry)
  const saveBuyerMaster = async (e) => {
    e.preventDefault();
    if (!buyerMasterDef) return;
    setSaving(true);
    try {
      const payload = {
        register_definition_id: buyerMasterDef.id,
        vertical_key: 'properties',
        client_id: client.id,
        data: form,
        status: form.current_status || 'New Lead'
      };

      if (buyerMasterEntry) {
        await api.put(`/registers/entries/${buyerMasterEntry.id}`, { data: form, status: form.current_status || 'New Lead' });
        toast.success('Buyer preferences updated');
      } else {
        await api.post('/registers/entries', payload);
        toast.success('Buyer preferences initialized');
      }
      setActiveDrawer(null);
      load();
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  // Add detailed buyer requirement item
  const saveRequirement = async (e) => {
    e.preventDefault();
    if (!requirementDef) return;
    setSaving(true);
    try {
      const reqId = `REQ-${Date.now().toString().slice(-4)}`;
      const data = {
        requirement_id: reqId,
        buyer_id: client.client_code,
        requirement_area: form.requirement_area,
        requirement_details: form.requirement_details,
        priority: form.priority || 'Medium',
        mandatory: form.mandatory || 'Yes',
        buyer_confirmation: 'Pending',
        notes: form.notes || ''
      };
      await api.post('/registers/entries', {
        register_definition_id: requirementDef.id,
        vertical_key: 'properties',
        client_id: client.id,
        data
      });
      toast.success('Requirement added');
      setActiveDrawer(null);
      load();
    } catch {
      toast.error('Failed to add requirement');
    } finally {
      setSaving(false);
    }
  };

  // Add property to shortlist
  const saveShortlist = async (e) => {
    e.preventDefault();
    if (!shortlistDef) return;
    const prop = allProperties.find(p => p.id === Number(form.property_id));
    if (!prop) return toast.error('Please select a property');
    
    setSaving(true);
    try {
      const data = {
        shortlist_id: `SL-${Date.now().toString().slice(-4)}`,
        buyer_id: client.client_code,
        property_ref: prop.property_code,
        location: prop.area || prop.city || '—',
        property_type: prop.property_type || '—',
        asking_price: `${prop.price ? Number(prop.price).toLocaleString('en-US') : '—'} ${prop.currency || 'BDT'}`,
        estimated_market_fit: form.estimated_market_fit || 'Good',
        budget_fit: form.budget_fit || prop.price,
        legal_risk: form.legal_risk || 'Low',
        physical_condition: form.physical_condition || 'Good',
        finance_suitability: form.finance_suitability || 'Suitable',
        score___100: form.score || '85',
        buyer_decision: form.buyer_decision || 'Inspect',
        notes: form.notes || ''
      };

      await api.post('/registers/entries', {
        register_definition_id: shortlistDef.id,
        vertical_key: 'properties',
        client_id: client.id,
        property_id: prop.id,
        data
      });

      toast.success('Added to property shortlist');
      setActiveDrawer(null);
      load();
    } catch {
      toast.error('Failed to add property');
    } finally {
      setSaving(false);
    }
  };

  // Remove register entry
  const removeRegisterEntry = async (id, msg = 'Entry removed') => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await api.delete(`/registers/entries/${id}`);
      toast.success(msg);
      load();
    } catch {
      toast.error('Failed to remove entry');
    }
  };

  // Save communications log
  const saveCommunication = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/contacts/${contactId}/communications`, form);
      toast.success('Communication logged');
      setActiveDrawer(null);
      load();
    } catch {
      toast.error('Failed to log communication');
    } finally {
      setSaving(false);
    }
  };

  // Save document upload
  const handleDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    try {
      toast.info('Uploading document file...');
      const uploadRes = await api.post('/projects/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      
      const payload = {
        doc_type: form.doc_type || 'kyc_proof',
        title: form.title || file.name,
        file_url: uploadRes.data.file_url,
        file_name: uploadRes.data.file_name,
        mime_type: file.type,
      };

      await api.post(`/contacts/${contactId}/documents`, payload);
      toast.success('Document uploaded');
      setActiveDrawer(null);
      load();
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Save Client Invoice
  const saveInvoice = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        contact_id: contact.id,
        client_id: client?.id || null,
        invoice_kind: 'client',
        title: form.title,
        total: Number(form.total),
        balance: Number(form.total),
        issue_date: form.issue_date || new Date().toISOString().slice(0,10),
        due_date: form.due_date || new Date().toISOString().slice(0,10),
        notes: form.notes
      };
      await api.post('/invoices', payload);
      toast.success('Invoice created');
      setActiveDrawer(null);
      load();
    } catch {
      toast.error('Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  // Save Client Payment Receipt
  const savePayment = async (e) => {
    e.preventDefault();
    if (!form.invoice_id) return toast.error('Please select an invoice');
    setSaving(true);
    try {
      const payload = {
        invoice_id: Number(form.invoice_id),
        client_id: client?.id || null,
        amount: Number(form.amount),
        direction: 'incoming',
        method: form.method || 'cash',
        reference: form.reference,
        notes: form.notes,
        paid_at: form.paid_at || new Date().toISOString()
      };
      await api.post('/payments', payload);
      toast.success('Payment recorded');
      setActiveDrawer(null);
      load();
    } catch {
      toast.error('Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  // Add 3rd Party Aligned Contact
  const saveThirdParty = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const party = {
        name: form.name,
        role: form.role || 'Lawyer',
        phone: form.phone,
        email: form.email,
        notes: form.notes
      };
      const currentParties = contact.tags || [];
      const updatedTags = [...currentParties, JSON.stringify(party)];
      await api.put(`/contacts/${contact.id}`, { tags: updatedTags });
      toast.success('Aligned 3rd party added');
      setActiveDrawer(null);
      load();
    } catch {
      toast.error('Failed to add aligned party');
    } finally {
      setSaving(false);
    }
  };

  const removeThirdParty = async (idx) => {
    if (!window.confirm('Remove this connection?')) return;
    try {
      const currentParties = contact.tags || [];
      const updated = currentParties.filter((_, i) => i !== idx);
      await api.put(`/contacts/${contact.id}`, { tags: updated });
      toast.success('Connection removed');
      load();
    } catch {
      toast.error('Failed to remove connection');
    }
  };

  if (loading || !contact) return <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>;

  // Aligned 3rd Parties list parsed from tags
  const thirdParties = (contact.tags || []).map(t => {
    try {
      return typeof t === 'string' ? JSON.parse(t) : t;
    } catch {
      return null;
    }
  }).filter(Boolean);

  return (
    <div className="contact-dashboard-wrapper">
      <div className="contact-header card card-pad" style={{ marginBottom: 20, borderLeft: '4px solid var(--primary)' }}>
        <div className="between" style={{ alignItems: 'flex-start' }}>
          <div>
            <button className="btn btn-ghost btn-sm" style={{ paddingLeft: 0, marginBottom: 8 }} onClick={onBack}>
              <ArrowLeft size={14} style={{ marginRight: 6 }} /> Back to Contacts
            </button>
            <div className="row" style={{ gap: 12 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{contact.full_name}</h2>
              <span className="code-chip">{contact.contact_code}</span>
              <StatusBadge status={contact.status} />
            </div>
            
            <div className="row" style={{ marginTop: 8, gap: 16 }}>
              {contact.primary_phone && <span className="cell-sub"><Phone size={12} /> {contact.primary_phone}</span>}
              {contact.email && <span className="cell-sub"><Mail size={12} /> {contact.email}</span>}
              {contact.is_nrb && <Badge tone="blue"><Globe2 size={10} /> NRB ({contact.nrb_country || 'Overseas'})</Badge>}
            </div>
          </div>
          
          <div className="row" style={{ gap: 8 }}>
            {!contact.is_client ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <Button size="sm" variant="outline" onClick={() => convertToClient('buyer')}>As Buyer</Button>
                <Button size="sm" variant="outline" onClick={() => convertToClient('seller')}>As Seller</Button>
                <Button size="sm" variant="outline" onClick={() => convertToClient('landlord')}>As Landlord</Button>
                <Button size="sm" variant="outline" onClick={() => convertToClient('tenant')}>As Tenant</Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxWidth: 350, justifyContent: 'flex-end' }}>
                <span className="cell-sub" style={{ width: '100%', textAlign: 'right', fontWeight: 600, fontSize: 11, marginBottom: 2 }}>Client Roles:</span>
                <button className={`btn btn-xs ${client?.is_buyer ? 'btn-primary' : 'btn-ghost'}`} onClick={() => toggleRoleFlag('is_buyer', !client?.is_buyer)}>Buyer</button>
                <button className={`btn btn-xs ${client?.is_seller ? 'btn-primary' : 'btn-ghost'}`} onClick={() => toggleRoleFlag('is_seller', !client?.is_seller)}>Seller</button>
                <button className={`btn btn-xs ${client?.is_landlord ? 'btn-primary' : 'btn-ghost'}`} onClick={() => toggleRoleFlag('is_landlord', !client?.is_landlord)}>Landlord</button>
                <button className={`btn btn-xs ${client?.is_tenant ? 'btn-primary' : 'btn-ghost'}`} onClick={() => toggleRoleFlag('is_tenant', !client?.is_tenant)}>Tenant</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 16 }}>
        <div className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview & KYC</div>
        {client?.is_buyer && <div className={`tab ${activeTab === 'buyer' ? 'active' : ''}`} onClick={() => setActiveTab('buyer')}>Buyer Requirement & Shortlist</div>}
        {(client?.is_seller || client?.is_landlord) && <div className={`tab ${activeTab === 'properties' ? 'active' : ''}`} onClick={() => setActiveTab('properties')}>Owned / Listed Properties</div>}
        {client?.is_tenant && <div className={`tab ${activeTab === 'tenant' ? 'active' : ''}`} onClick={() => setActiveTab('tenant')}>Tenant Lease & Rent</div>}
        <div className={`tab ${activeTab === 'financials' ? 'active' : ''}`} onClick={() => setActiveTab('financials')}>Invoices & Payments</div>
        <div className={`tab ${activeTab === 'communications' ? 'active' : ''}`} onClick={() => setActiveTab('communications')}>Communications</div>
        <div className={`tab ${activeTab === 'thirdparties' ? 'active' : ''}`} onClick={() => setActiveTab('thirdparties')}>Aligned 3rd Parties ({thirdParties.length})</div>
        <div className={`tab ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>KYC Documents ({contact.documents?.length || 0})</div>
      </div>

      {/* TAB CONTENTS */}
      <main style={{ minHeight: 400 }}>
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid-2">
            <div className="card card-pad">
              <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>Identity details</h3>
              <KV k="Full Name" v={contact.full_name} />
              <KV k="Salutation" v={contact.salutation} />
              <KV k="Company Name" v={contact.company_name} />
              <KV k="Designation" v={contact.designation} />
              <KV k="Gender" v={contact.gender} />
              <KV k="Date of Birth" v={contact.date_of_birth} />
              <KV k="Nationality" v={contact.nationality} />
              
              <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8, marginTop: 20 }}>KYC Profile</h3>
              <KV k="National ID (NID)" v={contact.national_id} />
              <KV k="Passport No." v={contact.passport_no} />
              <KV k="TIN Number" v={contact.tin} />
              <KV k="Trade Licence" v={contact.trade_licence_no} />
            </div>

            <div className="card card-pad">
              <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>Address & Channels</h3>
              <KV k="Preferred channel" v={contact.preferred_contact_method} />
              <KV k="Preferred Language" v={contact.preferred_language} />
              <KV k="WhatsApp" v={contact.whatsapp} />
              <KV k="Alt. Phone" v={contact.alt_phone} />
              <KV k="Alt. Email" v={contact.alt_email} />
              <KV k="Website" v={contact.website} />
              <KV k="Address" v={[contact.address_line1, contact.address_line2, contact.area, contact.city, contact.district, contact.postal_code, contact.country].filter(Boolean).join(', ')} />
              
              <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8, marginTop: 20 }}>Internal Notes</h3>
              <p style={{ whiteSpace: 'pre-wrap', color: 'var(--muted)', fontSize: 13 }}>{contact.notes || 'No notes added.'}</p>
            </div>
          </div>
        )}

        {/* BUYER PROFILE TAB */}
        {activeTab === 'buyer' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* 1. Buyer Master Register preferences */}
            <div className="card card-pad">
              <div className="between" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>Buyer Preference Profile</h3>
                <Button size="sm" variant="outline" onClick={() => {
                  setForm(buyerMasterEntry?.data || {
                    buyer_id: client.client_code,
                    buyer_name: contact.full_name,
                    mobile: contact.primary_phone,
                    email: contact.email,
                    nid_passport: contact.national_id || contact.passport_no || ''
                  });
                  setActiveDrawer('edit_buyer_master');
                }}>Edit Profile</Button>
              </div>
              
              {buyerMasterEntry ? (
                <div className="grid-3" style={{ gap: 16 }}>
                  <KV k="Preferred Location(s)" v={buyerMasterEntry.data.preferred_locations} />
                  <KV k="Property Type" v={buyerMasterEntry.data.preferred_property_type} />
                  <KV k="Budget Range" v={buyerMasterEntry.data.budget_range ? `৳ ${Number(buyerMasterEntry.data.budget_range).toLocaleString('en-US')}` : '—'} />
                  <KV k="Source of Funds" v={buyerMasterEntry.data.finance_source} />
                  <KV k="Purchase Purpose" v={buyerMasterEntry.data.purchase_purpose} />
                  <KV k="Assigned Officer" v={buyerMasterEntry.data.assigned_officer} />
                  <KV k="Current Status" v={buyerMasterEntry.status || buyerMasterEntry.data.current_status} />
                  <KV k="Next Action" v={buyerMasterEntry.data.next_action} />
                  <KV k="Next Follow-up" v={buyerMasterEntry.data.next_followup} />
                  <KV k="Officer Notes" v={buyerMasterEntry.data.notes} full />
                </div>
              ) : (
                <div className="empty-state" style={{ padding: 24, textAlign: 'center' }}>
                  <p className="cell-sub" style={{ marginBottom: 10 }}>Buyer preference details are not initialized yet.</p>
                  <Button size="sm" onClick={() => {
                    setForm({
                      buyer_id: client.client_code,
                      buyer_name: contact.full_name,
                      mobile: contact.primary_phone,
                      email: contact.email,
                      nid_passport: contact.national_id || contact.passport_no || ''
                    });
                    setActiveDrawer('edit_buyer_master');
                  }}>Initialize Buyer Profile</Button>
                </div>
              )}
            </div>

            {/* 2. Detailed Checklist Requirements */}
            <div className="card card-pad">
              <div className="between" style={{ marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>Detailed Requirements</h3>
                <Button size="sm" icon={Plus} onClick={() => { setForm({}); setActiveDrawer('add_requirement'); }}>Add Requirement</Button>
              </div>
              
              <DataTable
                columns={[
                  { key: 'requirement_area', header: 'Area', render: (r) => <b style={{ fontSize: 13 }}>{r.data.requirement_area}</b> },
                  { key: 'requirement_details', header: 'Requirement Details', render: (r) => r.data.requirement_details },
                  { key: 'priority', header: 'Priority', render: (r) => <Badge tone={r.data.priority === 'High' ? 'red' : r.data.priority === 'Low' ? 'grey' : 'blue'}>{r.data.priority}</Badge> },
                  { key: 'mandatory', header: 'Mandatory', render: (r) => <Badge tone={r.data.mandatory === 'Yes' ? 'amber' : 'grey'}>{r.data.mandatory}</Badge> },
                  { key: '_x', header: '', render: (r) => (
                    <button className="btn btn-danger btn-icon" onClick={() => removeRegisterEntry(r.id, 'Requirement deleted')}>
                      <Trash2 size={12} />
                    </button>
                  )}
                ]}
                rows={requirementEntries}
                empty={<p className="cell-sub" style={{ textAlign: 'center', padding: 20 }}>No specific requirements logged. Add rooms, size, and layout specs.</p>}
              />
            </div>

            {/* 3. Shortlisted Properties */}
            <div className="card card-pad">
              <div className="between" style={{ marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>Shortlisted Properties</h3>
                <Button size="sm" icon={PlusCircle} onClick={() => { setForm({}); setActiveDrawer('add_shortlist'); }}>Shortlist Property</Button>
              </div>
              
              <DataTable
                columns={[
                  { key: 'property_ref', header: 'Property Reference', render: (r) => <span className="code-chip">{r.data.property_ref}</span> },
                  { key: 'location', header: 'Location / Type', render: (r) => <div><div className="cell-strong">{r.data.location}</div><div className="cell-sub">{r.data.property_type}</div></div> },
                  { key: 'asking_price', header: 'Asking Price', render: (r) => r.data.asking_price },
                  { key: 'budget_fit', header: 'Budget Fit / Offer', render: (r) => r.data.budget_fit ? `৳ ${Number(r.data.budget_fit).toLocaleString('en-US')}` : '—' },
                  { key: 'buyer_decision', header: 'Decision', render: (r) => <Badge tone={r.data.buyer_decision === 'Inspect' ? 'amber' : 'green'}>{r.data.buyer_decision}</Badge> },
                  { key: 'score', header: 'Score/100', render: (r) => r.data.score___100 || '—' },
                  { key: 'notes', header: 'Evaluation Notes', render: (r) => r.data.notes || '—' },
                  { key: '_x', header: '', render: (r) => (
                    <button className="btn btn-danger btn-icon" onClick={() => removeRegisterEntry(r.id, 'Property removed from shortlist')}>
                      <Trash2 size={12} />
                    </button>
                  )}
                ]}
                rows={shortlistEntries}
                empty={<p className="cell-sub" style={{ textAlign: 'center', padding: 20 }}>No shortlisted properties yet.</p>}
              />
            </div>
          </div>
        )}

        {/* OWNER / SELLER PROPERTIES TAB */}
        {(activeTab === 'properties') && (
          <div className="card card-pad">
            <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 12 }}>Owned / Listed Properties</h3>
            
            <DataTable
              columns={[
                { key: 'property_code', header: 'Code', render: (r) => <span className="code-chip">{r.property_code}</span> },
                { key: 'title', header: 'Property Title', render: (r) => <div className="cell-strong">{r.title}</div> },
                { key: 'type', header: 'Category / Type', render: (r) => `${r.category.toUpperCase()} · ${r.property_type || '—'}` },
                { key: 'price', header: 'Price / Rent', render: (r) => `৳ ${Number(r.price).toLocaleString('en-US')} (${r.listing_type})` },
                { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> }
              ]}
              rows={properties}
              empty={<p className="cell-sub" style={{ textAlign: 'center', padding: 20 }}>No properties listed or owned by this contact.</p>}
            />
          </div>
        )}

        {/* TENANT LEASE TAB */}
        {activeTab === 'tenant' && (
          <div className="card card-pad">
            <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 12 }}>Tenant Lease & Rentals</h3>
            <DataTable
              columns={[
                { key: 'property_code', header: 'Property Code', render: (r) => <span className="code-chip">{r.property_code}</span> },
                { key: 'title', header: 'Property Address', render: (r) => <div className="cell-strong">{r.title}</div> },
                { key: 'rent', header: 'Monthly Rent', render: (r) => `৳ ${Number(r.price).toLocaleString('en-US')}` },
                { key: 'status', header: 'Property Status', render: (r) => <StatusBadge status={r.status} /> }
              ]}
              rows={properties}
              empty={<p className="cell-sub" style={{ textAlign: 'center', padding: 20 }}>No active tenancy leases associated.</p>}
            />
          </div>
        )}

        {/* FINANCIALS TAB */}
        {activeTab === 'financials' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Invoices List */}
            <div className="card card-pad">
              <div className="between" style={{ marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>Invoices</h3>
                <Button size="sm" icon={Plus} onClick={() => { setForm({ title: '', total: '', issue_date: new Date().toISOString().slice(0,10) }); setActiveDrawer('add_invoice'); }}>Create Invoice</Button>
              </div>
              
              <DataTable
                columns={[
                  { key: 'invoice_code', header: 'Code', render: (r) => <span className="code-chip">{r.invoice_code}</span> },
                  { key: 'title', header: 'Description', render: (r) => r.title },
                  { key: 'total', header: 'Total Amount', render: (r) => <b>৳ {Number(r.total).toLocaleString('en-US')}</b> },
                  { key: 'balance', header: 'Balance Due', render: (r) => <span style={{ color: Number(r.balance) > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>৳ {Number(r.balance).toLocaleString('en-US')}</span> },
                  { key: 'issue_date', header: 'Dates', render: (r) => <div className="cell-sub">Issued: {r.issue_date}<br/>Due: {r.due_date}</div> },
                  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> }
                ]}
                rows={invoices}
                empty={<p className="cell-sub" style={{ textAlign: 'center', padding: 20 }}>No invoices generated yet.</p>}
              />
            </div>

            {/* Payments List */}
            <div className="card card-pad">
              <div className="between" style={{ marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>Payments & Receipts</h3>
                <Button size="sm" icon={Plus} onClick={() => { setForm({ amount: '', invoice_id: invoices[0]?.id || '', paid_at: new Date().toISOString().slice(0,16), method: 'cash' }); setActiveDrawer('add_payment'); }} disabled={!invoices.length}>Record Receipt</Button>
              </div>
              
              <DataTable
                columns={[
                  { key: 'payment_code', header: 'Receipt Code', render: (r) => <span className="code-chip">{r.payment_code}</span> },
                  { key: 'amount', header: 'Amount Received', render: (r) => <b>৳ {Number(r.amount).toLocaleString('en-US')}</b> },
                  { key: 'method', header: 'Method', render: (r) => <Badge tone="blue">{r.method.toUpperCase()}</Badge> },
                  { key: 'reference', header: 'Reference', render: (r) => r.reference || '—' },
                  { key: 'paid_at', header: 'Paid At', render: (r) => r.paid_at ? new Date(r.paid_at).toLocaleString() : '—' },
                  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> }
                ]}
                rows={payments}
                empty={<p className="cell-sub" style={{ textAlign: 'center', padding: 20 }}>No payments recorded yet.</p>}
              />
            </div>
          </div>
        )}

        {/* COMMUNICATIONS TAB */}
        {activeTab === 'communications' && (
          <div className="card card-pad">
            <div className="between" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Interaction Log History</h3>
              <Button size="sm" icon={Plus} onClick={() => { setForm({ channel: 'call', direction: 'outbound', subject: '', body: '', occurred_at: new Date().toISOString().slice(0, 16) }); setActiveDrawer('add_comm'); }}>Log Communication</Button>
            </div>
            
            {communications.length ? (
              <div className="timeline" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {communications.map((c) => (
                  <div key={c.id} style={{ display: 'flex', gap: 14, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: c.direction === 'inbound' ? 'var(--success-bg)' : 'var(--primary-bg)',
                      color: c.direction === 'inbound' ? 'var(--success)' : 'var(--primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <MessageSquare size={14} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="between">
                        <strong style={{ fontSize: 14 }}>{c.subject || `${c.channel.toUpperCase()} (${c.direction})`}</strong>
                        <span className="cell-sub">{new Date(c.occurred_at || c.created_at).toLocaleString()}</span>
                      </div>
                      <p style={{ margin: '4px 0 0 0', color: 'var(--muted)', fontSize: 13 }}>{c.body}</p>
                      {c.follow_up_at && (
                        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--amber)', fontWeight: 600 }}>
                          ⏰ Next Follow-up Scheduled: {new Date(c.follow_up_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="cell-sub" style={{ textAlign: 'center', padding: 20 }}>No communications logged. Log calls, emails, and meetings here.</p>
            )}
          </div>
        )}

        {/* ALIGNED 3RD PARTIES TAB */}
        {activeTab === 'thirdparties' && (
          <div className="card card-pad">
            <div className="between" style={{ marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Aligned 3rd Parties (Lawyers, Banks, Agents)</h3>
              <Button size="sm" icon={Plus} onClick={() => { setForm({ name: '', role: 'Lawyer', phone: '', email: '', notes: '' }); setActiveDrawer('add_third_party'); }}>Align 3rd Party</Button>
            </div>
            
            <DataTable
              columns={[
                { key: 'name', header: 'Name', render: (r) => <b style={{ fontSize: 13 }}>{r.name}</b> },
                { key: 'role', header: 'Role Connection', render: (r) => <Badge tone="blue">{r.role}</Badge> },
                { key: 'phone', header: 'Phone', render: (r) => r.phone || '—' },
                { key: 'email', header: 'Email', render: (r) => r.email || '—' },
                { key: 'notes', header: 'Details / Notes', render: (r) => r.notes || '—' },
                { key: '_x', header: '', render: (r, idx) => (
                  <button className="btn btn-danger btn-icon" onClick={() => removeThirdParty(idx)}>
                    <Trash2 size={12} />
                  </button>
                )}
              ]}
              rows={thirdParties}
              empty={<p className="cell-sub" style={{ textAlign: 'center', padding: 20 }}>No aligned 3rd parties registered for this buyer/client.</p>}
            />
          </div>
        )}

        {/* DOCUMENTS TAB */}
        {activeTab === 'documents' && (
          <div className="card card-pad">
            <div className="between" style={{ marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Documents & KYC Uploads</h3>
              <Button size="sm" icon={Upload} onClick={() => { setForm({ title: '', doc_type: 'kyc_proof' }); setActiveDrawer('upload_doc'); }}>Upload Document</Button>
            </div>
            
            <DataTable
              columns={[
                { key: 'doc_type', header: 'Type', render: (r) => <Badge tone="blue">{r.doc_type.toUpperCase()}</Badge> },
                { key: 'title', header: 'Document Title', render: (r) => <div className="cell-strong">{r.title}</div> },
                { key: 'file_name', header: 'File Name', render: (r) => r.file_name || '—' },
                { key: 'uploaded_by', header: 'Uploaded At', render: (r) => new Date(r.created_at || r.updated_at).toLocaleString() },
                { key: 'action', header: '', render: (r) => (
                  <div className="row" style={{ gap: 4 }}>
                    <a className="btn btn-ghost btn-sm" href={r.file_url} target="_blank" rel="noreferrer" title="View Document">
                      <Eye size={13} />
                    </a>
                  </div>
                )}
              ]}
              rows={contact.documents || []}
              empty={<p className="cell-sub" style={{ textAlign: 'center', padding: 20 }}>No documents uploaded yet. Upload NID or Agreement copies.</p>}
            />
          </div>
        )}
      </main>

      {/* DRAWERS & MODALS */}

      {/* 1. Buyer Master Register Drawer */}
      {activeDrawer === 'edit_buyer_master' && (
        <Drawer title="Buyer Preference Profile" onClose={() => setActiveDrawer(null)}
          footer={<><Button variant="ghost" onClick={() => setActiveDrawer(null)}>Cancel</Button><Button onClick={saveBuyerMaster} disabled={saving}>{saving ? <Spinner /> : 'Save Profile'}</Button></>}>
          <form onSubmit={saveBuyerMaster} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Preferred Locations" required><Input value={form.preferred_locations || ''} onChange={(e) => setForm({ ...form, preferred_locations: e.target.value })} placeholder="Gulshan, Banani, Dhanmondi..." /></Field>
            <Field label="Preferred Property Type" required><Select value={form.preferred_property_type || ''} onChange={(e) => setForm({ ...form, preferred_property_type: e.target.value })}><option value="">— Select Type —</option><option value="Apartment">Apartment</option><option value="Duplex">Duplex</option><option value="Commercial Floor">Commercial Floor</option><option value="Plot of Land">Plot of Land</option></Select></Field>
            <Field label="Budget Range (BDT)" required><Input type="number" value={form.budget_range || ''} onChange={(e) => setForm({ ...form, budget_range: e.target.value })} placeholder="e.g. 15000000" /></Field>
            <Field label="Source of Finance"><Select value={form.finance_source || ''} onChange={(e) => setForm({ ...form, finance_source: e.target.value })}><option value="Self Funded / Cash">Self Funded / Cash</option><option value="Bank Loan">Bank Loan</option><option value="NRB Remittance">NRB Remittance</option><option value="Joint Venture">Joint Venture</option></Select></Field>
            <Field label="Purchase Purpose"><Select value={form.purchase_purpose || ''} onChange={(e) => setForm({ ...form, purchase_purpose: e.target.value })}><option value="Self Residence">Self Residence</option><option value="Investment / Rental">Investment / Rental</option><option value="Business Office">Business Office</option></Select></Field>
            <Field label="Assigned Officer"><Select value={form.assigned_officer || ''} onChange={(e) => setForm({ ...form, assigned_officer: e.target.value })}><option value="Buyer Support Coordinator">Buyer Support Coordinator</option><option value="Residential Services Manager">Residential Services Manager</option></Select></Field>
            <Field label="Current Status"><Select value={form.current_status || ''} onChange={(e) => setForm({ ...form, current_status: e.target.value })}><option value="New Lead">New Lead</option><option value="Consultation Scheduled">Consultation Scheduled</option><option value="Property Shortlisted">Property Shortlisted</option><option value="Offer Stage">Offer Stage</option><option value="Phase 1 Completed">Phase 1 Completed</option></Select></Field>
            <Field label="Next Follow-Up Date"><Input type="date" value={form.next_followup || ''} onChange={(e) => setForm({ ...form, next_followup: e.target.value })} /></Field>
            <Field label="Next Action Task"><Input value={form.next_action || ''} onChange={(e) => setForm({ ...form, next_action: e.target.value })} placeholder="e.g. Schedule physical site visit" /></Field>
            <Field label="Officer Notes" full><Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          </form>
        </Drawer>
      )}

      {/* 2. Add Detailed Requirement Drawer */}
      {activeDrawer === 'add_requirement' && (
        <Drawer title="Add Buyer Sizing Requirement" onClose={() => setActiveDrawer(null)}
          footer={<><Button variant="ghost" onClick={() => setActiveDrawer(null)}>Cancel</Button><Button onClick={saveRequirement} disabled={saving}>{saving ? <Spinner /> : 'Save'}</Button></>}>
          <form onSubmit={saveRequirement} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Requirement Area" required><Select value={form.requirement_area || ''} onChange={(e) => setForm({ ...form, requirement_area: e.target.value })}><option value="">— Select Specs —</option><option value="Size (Min Sqft)">Size (Min Sqft)</option><option value="Bedrooms">Bedrooms</option><option value="Bathrooms">Bathrooms</option><option value="Parking Slots">Parking Slots</option><option value="Facing Preference">Facing Preference</option><option value="Floor Preference">Floor Preference</option></Select></Field>
            <Field label="Details / Specification" required><Input value={form.requirement_details || ''} onChange={(e) => setForm({ ...form, requirement_details: e.target.value })} placeholder="e.g. Min 3 beds, East-facing, Mid floor" /></Field>
            <Field label="Priority"><Select value={form.priority || 'Medium'} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option value="High">High Priority</option><option value="Medium">Medium Priority</option><option value="Low">Low Priority</option></Select></Field>
            <Field label="Mandatory?"><Select value={form.mandatory || 'Yes'} onChange={(e) => setForm({ ...form, mandatory: e.target.value })}><option value="Yes">Yes (Must Have)</option><option value="No">No (Good to Have)</option></Select></Field>
            <Field label="Additional Notes" full><Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          </form>
        </Drawer>
      )}

      {/* 3. Shortlist Property Drawer */}
      {activeDrawer === 'add_shortlist' && (
        <Drawer title="Shortlist Property" onClose={() => setActiveDrawer(null)}
          footer={<><Button variant="ghost" onClick={() => setActiveDrawer(null)}>Cancel</Button><Button onClick={saveShortlist} disabled={saving}>{saving ? <Spinner /> : 'Add to Shortlist'}</Button></>}>
          <form onSubmit={saveShortlist} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Select Catalog Property" required>
              <Select value={form.property_id || ''} onChange={(e) => setForm({ ...form, property_id: e.target.value })}>
                <option value="">— Select Available Property —</option>
                {allProperties.map(p => (
                  <option key={p.id} value={p.id}>{p.title} ({p.property_code}) - ৳{Number(p.price).toLocaleString()}</option>
                ))}
              </Select>
            </Field>
            <Field label="Offer Fit / Budget Fit (BDT)"><Input type="number" value={form.budget_fit || ''} onChange={(e) => setForm({ ...form, budget_fit: e.target.value })} placeholder="Enter proposed offer amount" /></Field>
            <Field label="Estimated Market Fit"><Select value={form.estimated_market_fit || 'Excellent'} onChange={(e) => setForm({ ...form, estimated_market_fit: e.target.value })}><option value="Excellent">Excellent Fit</option><option value="Good">Good Fit</option><option value="Fair">Fair Fit</option><option value="Poor">Poor Fit</option></Select></Field>
            <Field label="Legal Risk Assessment"><Select value={form.legal_risk || 'Low'} onChange={(e) => setForm({ ...form, legal_risk: e.target.value })}><option value="Low">Low Risk (Deed Verified)</option><option value="Medium">Medium Risk (Awaiting Mutation)</option><option value="High">High Risk (Disputed)</option></Select></Field>
            <Field label="Score / 100"><Input type="number" max="100" min="0" value={form.score || ''} onChange={(e) => setForm({ ...form, score: e.target.value })} placeholder="e.g. 85" /></Field>
            <Field label="Buyer Decision Status"><Select value={form.buyer_decision || 'Inspect'} onChange={(e) => setForm({ ...form, buyer_decision: e.target.value })}><option value="Hold">Hold / Reject</option><option value="Inspect">Schedule Inspection</option><option value="Offer Sent">Offer Sent</option></Select></Field>
            <Field label="Officer Evaluation Notes" full><Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          </form>
        </Drawer>
      )}

      {/* 4. Log Communication Drawer */}
      {activeDrawer === 'add_comm' && (
        <Drawer title="Log Communication" onClose={() => setActiveDrawer(null)}
          footer={<><Button variant="ghost" onClick={() => setActiveDrawer(null)}>Cancel</Button><Button onClick={saveCommunication} disabled={saving}>{saving ? <Spinner /> : 'Save Log'}</Button></>}>
          <form onSubmit={saveCommunication} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Interaction Channel"><Select value={form.channel || 'call'} onChange={(e) => setForm({ ...form, channel: e.target.value })}><option value="call">Call</option><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="meeting">In-Person Meeting</option></Select></Field>
            <Field label="Direction"><Select value={form.direction || 'outbound'} onChange={(e) => setForm({ ...form, direction: e.target.value })}><option value="outbound">Outbound (We contacted them)</option><option value="inbound">Inbound (They contacted us)</option></Select></Field>
            <Field label="Subject / Summary" required><Input value={form.subject || ''} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Followed up on Gulshan 2BHK inspection" /></Field>
            <Field label="Conversation Details" required full><Textarea value={form.body || ''} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Describe details, concerns raised, and outcome..." /></Field>
            <Field label="Occurred At"><Input type="datetime-local" value={form.occurred_at || ''} onChange={(e) => setForm({ ...form, occurred_at: e.target.value })} /></Field>
            <Field label="Next Follow-up Date/Time"><Input type="datetime-local" value={form.follow_up_at || ''} onChange={(e) => setForm({ ...form, follow_up_at: e.target.value })} /></Field>
          </form>
        </Drawer>
      )}

      {/* 5. Create Invoice Drawer */}
      {activeDrawer === 'add_invoice' && (
        <Drawer title="Create Client Invoice" onClose={() => setActiveDrawer(null)}
          footer={<><Button variant="ghost" onClick={() => setActiveDrawer(null)}>Cancel</Button><Button onClick={saveInvoice} disabled={saving}>{saving ? <Spinner /> : 'Create'}</Button></>}>
          <form onSubmit={saveInvoice} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Invoice Title / Service Charge" required><Input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Consultation Phase 1 Retainer fee" /></Field>
            <Field label="Amount (BDT)" required><Input type="number" value={form.total || ''} onChange={(e) => setForm({ ...form, total: e.target.value })} placeholder="e.g. 50000" /></Field>
            <Field label="Issue Date"><Input type="date" value={form.issue_date || ''} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} /></Field>
            <Field label="Due Date"><Input type="date" value={form.due_date || ''} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
            <Field label="Description & Terms" full><Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          </form>
        </Drawer>
      )}

      {/* 6. Record Payment Drawer */}
      {activeDrawer === 'add_payment' && (
        <Drawer title="Record Client Payment" onClose={() => setActiveDrawer(null)}
          footer={<><Button variant="ghost" onClick={() => setActiveDrawer(null)}>Cancel</Button><Button onClick={savePayment} disabled={saving}>{saving ? <Spinner /> : 'Save'}</Button></>}>
          <form onSubmit={savePayment} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Select Client Invoice" required>
              <Select value={form.invoice_id || ''} onChange={(e) => setForm({ ...form, invoice_id: e.target.value })}>
                <option value="">— Select Invoice —</option>
                {invoices.map(inv => (
                  <option key={inv.id} value={inv.id}>{inv.invoice_code} — {inv.title} (Due: ৳{Number(inv.balance).toLocaleString()})</option>
                ))}
              </Select>
            </Field>
            <Field label="Amount Received (BDT)" required><Input type="number" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="e.g. 50000" /></Field>
            <Field label="Payment Method"><Select value={form.method || 'cash'} onChange={(e) => setForm({ ...form, method: e.target.value })}><option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="card">Credit Card</option><option value="cheque">Bank Cheque</option></Select></Field>
            <Field label="Transaction Reference"><Input value={form.reference || ''} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Bank transaction ID, bKash TRX ID..." /></Field>
            <Field label="Payment Received At"><Input type="datetime-local" value={form.paid_at || ''} onChange={(e) => setForm({ ...form, paid_at: e.target.value })} /></Field>
            <Field label="Notes" full><Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          </form>
        </Drawer>
      )}

      {/* 7. Align 3rd Party Drawer */}
      {activeDrawer === 'add_third_party' && (
        <Drawer title="Align 3rd Party Connection" onClose={() => setActiveDrawer(null)}
          footer={<><Button variant="ghost" onClick={() => setActiveDrawer(null)}>Cancel</Button><Button onClick={saveThirdParty} disabled={saving}>{saving ? <Spinner /> : 'Align Connection'}</Button></>}>
          <form onSubmit={saveThirdParty} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Contact Name" required><Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Adv. Sayem Rahman" /></Field>
            <Field label="Connection Role / Capacity"><Select value={form.role || 'Lawyer'} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="Lawyer">Lawyer / Deed Writer</option><option value="Bank Loan Officer">Bank Loan Officer</option><option value="Listing Sales Agent">Listing Sales Agent</option><option value="Biometric Installer">Biometric Installer</option></Select></Field>
            <Field label="Contact Phone"><Input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Contact Email"><Input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Notes" full><Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Describe alignment context, e.g. Handles deed verification for this Gulshan deal." /></Field>
          </form>
        </Drawer>
      )}

      {/* 8. Upload KYC Document Drawer */}
      {activeDrawer === 'upload_doc' && (
        <Drawer title="Upload KYC Document" onClose={() => setActiveDrawer(null)}
          footer={<><Button variant="ghost" onClick={() => setActiveDrawer(null)}>Cancel</Button></>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Document Category" required><Select value={form.doc_type || 'kyc_proof'} onChange={(e) => setForm({ ...form, doc_type: e.target.value })}><option value="nid_copy">National ID (NID) Copy</option><option value="passport_copy">Passport Copy</option><option value="tin_certificate">TIN Certificate</option><option value="trade_licence">Trade Licence Copy</option><option value="holding_tax_receipt">Holding Tax Receipt</option><option value="deed_of_agreement">Signed Deed / Agreement</option><option value="kyc_proof">General KYC Proof</option></Select></Field>
            <Field label="Document Title" required><Input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Owner NID Front Scan" /></Field>
            
            <div style={{ padding: 20, border: '2px dashed var(--border)', borderRadius: 8, textAlign: 'center', background: 'var(--surface-2)', cursor: 'pointer', position: 'relative' }} onClick={() => document.getElementById('dashboard-file-upload').click()}>
              {uploading ? (
                <div style={{ padding: 10 }}><Spinner /><p style={{ margin: '8px 0 0 0', fontSize: 13 }}>Uploading and registering file...</p></div>
              ) : (
                <>
                  <Upload size={24} style={{ color: 'var(--muted)', marginBottom: 8 }} />
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>Click to browse and upload proof file</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: 11, color: 'var(--muted)' }}>Supports PDF, PNG, JPG scans up to 5MB</p>
                </>
              )}
              <input type="file" id="dashboard-file-upload" style={{ display: 'none' }} onChange={handleDocUpload} disabled={uploading} />
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
}
