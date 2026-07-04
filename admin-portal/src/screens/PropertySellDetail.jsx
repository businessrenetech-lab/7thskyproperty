import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft, Phone, Mail, BadgeCheck, Plus, Trash2, UserCheck,
  FileText, Upload, Calendar, DollarSign, CheckCircle2, MessageSquare,
  Eye, Share2, ClipboardCheck, Users, ShieldAlert, Paperclip, PlusCircle,
  Building2, HardHat, FileSignature, Wallet, Handshake, Info, ShieldCheck, Play
} from 'lucide-react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import {
  PageHead, Button, DataTable, StatusBadge, Badge, Drawer, Field,
  Input, Textarea, Select, KV, Spinner, SearchInput
} from '../ui/kit';
import { Combo } from '../ui/pickers';

const money = (v) => (v == null ? '৳0.00' : '৳' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

export default function PropertySellDetail({ propertyId, onBack }) {
  const toast = useToast();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState(null);
  const [communications, setCommunications] = useState([]);
  const [registerEntries, setRegisterEntries] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [deals, setDeals] = useState([]);
  const [defs, setDefs] = useState([]);

  // Project Stage-Gate workflow link
  const [project, setProject] = useState(null);
  const [projectLoading, setProjectLoading] = useState(false);
  const [expandedStageItem, setExpandedStageItem] = useState(null);

  // Tab states
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | listing_details | property_details | media | inspections | compliance | workflow | social_ads
  const [dashboardSubTab, setDashboardSubTab] = useState('activity'); // activity | marketing | buyers | vendor_report | contracts | advertising
  const [activityFilter, setActivityFilter] = useState('all'); // all | communication | contact_activity | team_activity | updates | tasks | aml

  // Drawer states
  const [activeDrawer, setActiveDrawer] = useState(null); // add_note | log_enquiry | log_inspection | log_offer | add_task | create_aml | edit_details
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Load property details
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/properties/${propertyId}`);
      setProperty(data.data);
      setCommunications(data.communications || []);
      setRegisterEntries(data.registerEntries || []);
      setDeals(data.deals || []);

      // Load inspections for this property
      const insRes = await api.get(`/inspections?property_id=${propertyId}`);
      setInspections(insRes.data.data || []);

      // Load associated workflow project
      setProjectLoading(true);
      const projRes = await api.get(`/projects?property_id=${propertyId}`);
      const matchedProject = projRes.data.data?.find(p => p.property_id === Number(propertyId));
      if (matchedProject) {
        // Fetch detailed stages for the project
        const stageRes = await api.get(`/projects/${matchedProject.id}`);
        setProject(stageRes.data.data);
      } else {
        setProject(null);
      }
    } catch (e) {
      toast.error('Failed to load property details');
    } finally {
      setLoading(false);
      setProjectLoading(false);
    }
  }, [propertyId, toast]);

  useEffect(() => {
    load();
    // Load register definitions
    api.get('/registers/definitions')
      .then(({ data }) => setDefs(data.data || []))
      .catch(() => {});
  }, [load]);

  // Find definitions
  const shortlistDef = defs.find(d => d.register_key === 'property_shortlist_and_compare' || d.register_key === 'property_shortlist_compare');
  const offerDef = defs.find(d => d.register_key === 'offer_approval_checklist' || d.register_key === 'offer_register');
  const amlDef = defs.find(d => d.register_key === 'risk_assessment_register');

  // Find entries
  const buyerEnquiries = shortlistDef ? registerEntries.filter(r => r.register_definition_id === shortlistDef.id) : [];
  const offerEntries = offerDef ? registerEntries.filter(r => r.register_definition_id === offerDef.id) : [];

  // Start checklist project
  const startWorkflowProject = async () => {
    setSaving(true);
    try {
      let vk = 'properties'; // Residential Sell default
      if (property.category === 'commercial') vk = 'commercial_sale';
      if (property.category === 'rural') vk = 'rural_sale';

      const payload = {
        title: `${property.title} - Sales Process`,
        vertical_key: vk,
        property_id: property.id,
        client_id: property.owner_contact_id ? (await resolveClientId(property.owner_contact_id)) : null,
        priority: 'medium',
        status: 'lead'
      };
      await api.post('/projects', payload);
      toast.success('Sale process workflow initialized');
      load();
    } catch (e) {
      toast.error('Failed to initialize workflow');
    } finally {
      setSaving(false);
    }
  };

  // Helper to resolve client id from contact
  const resolveClientId = async (contactId) => {
    try {
      const res = await api.get(`/contacts/${contactId}`);
      return res.data.data?.Clients?.[0]?.id || null;
    } catch {
      return null;
    }
  };

  // Stage gate actions (checklists)
  const patchStage = async (stage, body) => {
    if (!project) return;
    try {
      const { data } = await api.patch(`/projects/${project.id}/stages/${stage.id}`, body);
      setProject(data.data);
      toast.success('Workflow updated');
    } catch {
      toast.error('Update failed');
    }
  };

  const toggleCheck = (stage, idx) => {
    const checklist = stage.checklist.map((c, i) => i === idx ? { ...c, done: !c.done } : c);
    patchStage(stage, { checklist });
  };

  const handleEvidenceUpload = async (e, stage, idx) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      toast.info('Uploading evidence file...');
      const { data } = await api.post('/projects/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const checklist = stage.checklist.map((c, i) => i === idx ? { ...c, evidence_url: data.file_url, evidence_name: data.file_name } : c);
      await patchStage(stage, { checklist });
      toast.success('Evidence uploaded');
    } catch {
      toast.error('Upload failed');
    }
  };

  // Clone Listing
  const cloneListing = async () => {
    if (!window.confirm('Clone this listing into a new draft listing?')) return;
    setSaving(true);
    try {
      const payload = {
        ...property,
        title: `${property.title} (Cloned)`,
        status: 'draft',
        property_code: undefined,
        id: undefined,
        created_at: undefined,
        updated_at: undefined
      };
      const { data } = await api.post('/properties', payload);
      toast.success('Listing cloned successfully!');
      onBack();
    } catch {
      toast.error('Cloning failed');
    } finally {
      setSaving(false);
    }
  };

  // Add ownership button handler
  const handleAddOwnership = async (e) => {
    e.preventDefault();
    if (!form.owner_contact_id) return toast.error('Please select an owner');
    setSaving(true);
    try {
      await api.put(`/properties/${propertyId}`, { owner_contact_id: form.owner_contact_id });
      toast.success('Ownership updated');
      setActiveDrawer(null);
      load();
    } catch {
      toast.error('Failed to update ownership');
    } finally {
      setSaving(false);
    }
  };

  // Save changes to property details
  const handleSaveDetails = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/properties/${propertyId}`, form);
      toast.success('Listing details saved');
      setActiveDrawer(null);
      load();
    } catch {
      toast.error('Failed to update details');
    } finally {
      setSaving(false);
    }
  };

  // Log Note
  const saveNote = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        channel: 'note',
        direction: 'internal',
        subject: form.subject || 'Internal Note',
        body: form.body,
        occurred_at: new Date().toISOString()
      };
      await api.post(`/properties/${propertyId}/communications`, payload);
      toast.success('Note added');
      setActiveDrawer(null);
      load();
    } catch {
      toast.error('Failed to add note');
    } finally {
      setSaving(false);
    }
  };

  // Log Enquiry (links Contact and Property in shortlist register)
  const saveEnquiry = async (e) => {
    e.preventDefault();
    if (!form.contact_id) return toast.error('Please select a contact');
    if (!shortlistDef) return toast.error('Shortlist register definition not found');
    setSaving(true);
    try {
      const contactRes = await api.get(`/contacts/${form.contact_id}`);
      const contact = contactRes.data.data;
      let clientId = contact?.Clients?.[0]?.id;

      if (!clientId) {
        // Automatically promote contact to client role Buyer if they aren't one yet
        const promoteRes = await api.post(`/contacts/${form.contact_id}/convert`, {
          is_buyer: true,
          client_segment: 'standard',
          notes: 'Auto-promoted during enquiry logging'
        });
        clientId = promoteRes.data.contact?.Clients?.[0]?.id || promoteRes.data.opportunity?.buyer_client_id;
      }

      const clientCode = contact?.Clients?.[0]?.client_code || `SSPC-C-${form.contact_id}`;
      const shortlistPayload = {
        shortlist_id: `SL-${Date.now().toString().slice(-4)}`,
        buyer_id: clientCode,
        property_ref: property.property_code,
        location: [property.area, property.district || property.city].filter(Boolean).join(', '),
        property_type: property.property_type || 'Apartment',
        asking_price: money(property.price),
        estimated_market_fit: form.market_fit || 'Good',
        budget_fit: form.budget_fit || property.price,
        buyer_decision: 'Inspect',
        notes: form.notes || 'Buyer logged enquiry.'
      };

      // 1. Create Register Entry for shortlist/enquiry
      await api.post('/registers/entries', {
        register_definition_id: shortlistDef.id,
        vertical_key: 'properties',
        client_id: clientId,
        property_id: property.id,
        data: shortlistPayload
      });

      // 2. Create property communication timeline entry
      await api.post(`/properties/${propertyId}/communications`, {
        channel: 'call',
        direction: 'inbound',
        subject: `Enquiry from ${contact.full_name}`,
        body: `Logged buyer enquiry. Notes: ${form.notes || 'No notes.'}`,
        occurred_at: new Date().toISOString()
      });

      toast.success('Enquiry logged and buyer connected');
      setActiveDrawer(null);
      load();
    } catch (err) {
      toast.error('Failed to log enquiry');
    } finally {
      setSaving(false);
    }
  };

  // Log Offer (links to negotiation register)
  const saveOffer = async (e) => {
    e.preventDefault();
    if (!form.contact_id) return toast.error('Please select a contact');
    if (!offerDef) return toast.error('Offer register definition not found');
    setSaving(true);
    try {
      const contactRes = await api.get(`/contacts/${form.contact_id}`);
      const contact = contactRes.data.data;
      let clientId = contact?.Clients?.[0]?.id;

      if (!clientId) {
        const promoteRes = await api.post(`/contacts/${form.contact_id}/convert`, {
          is_buyer: true,
          client_segment: 'standard',
          notes: 'Auto-promoted during offer logging'
        });
        clientId = promoteRes.data.contact?.Clients?.[0]?.id || promoteRes.data.opportunity?.buyer_client_id;
      }

      const clientCode = contact?.Clients?.[0]?.client_code || `SSPC-C-${form.contact_id}`;
      const offerPayload = {
        offer_id: `OFF-${Date.now().toString().slice(-4)}`,
        buyer_id: clientCode,
        buyer_name: contact.full_name,
        property_ref: property.property_code,
        asking_price: money(property.price),
        offer_amount: form.offer_amount,
        offer_date: form.offer_date || new Date().toISOString().slice(0, 10),
        status: form.status || 'Pending',
        notes: form.notes || 'Buyer submitted offer.'
      };

      // 1. Create Register Entry for offer
      await api.post('/registers/entries', {
        register_definition_id: offerDef.id,
        vertical_key: 'properties',
        client_id: clientId,
        property_id: property.id,
        data: offerPayload
      });

      // 2. Create property communication timeline entry
      await api.post(`/properties/${propertyId}/communications`, {
        channel: 'meeting',
        direction: 'inbound',
        subject: `Offer BDT ${Number(form.offer_amount).toLocaleString()} from ${contact.full_name}`,
        body: `Logged buy offer. Status: ${form.status || 'Pending'}. Terms: ${form.notes || 'No terms.'}`,
        occurred_at: new Date().toISOString()
      });

      toast.success('Offer logged and recorded');
      setActiveDrawer(null);
      load();
    } catch {
      toast.error('Failed to log offer');
    } finally {
      setSaving(false);
    }
  };

  // Add Task
  const saveTask = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        channel: 'note',
        direction: 'internal',
        subject: `[TASK] ${form.title} (Priority: ${form.priority || 'Medium'})`,
        body: `Task details: ${form.body || ''}\nDue: ${form.due_date ? new Date(form.due_date).toLocaleDateString() : 'No due date'}`,
        occurred_at: new Date().toISOString(),
        follow_up_at: form.due_date || null
      };
      await api.post(`/properties/${propertyId}/communications`, payload);
      toast.success('Task logged');
      setActiveDrawer(null);
      load();
    } catch {
      toast.error('Failed to log task');
    } finally {
      setSaving(false);
    }
  };

  // Log Inspection
  const saveInspection = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        property_id: propertyId,
        inspection_type: form.inspection_type || 'routine',
        status: form.status || 'scheduled',
        scheduled_date: form.scheduled_date || new Date().toISOString(),
        inspector_id: property.manager_id || null,
        summary: form.summary || 'Scheduled physical inspection.'
      };
      await api.post('/inspections', payload);

      // Create communication timeline entry
      await api.post(`/properties/${propertyId}/communications`, {
        channel: 'meeting',
        direction: 'internal',
        subject: `Inspection Scheduled (${form.inspection_type || 'Routine'})`,
        body: `Scheduled inspection. Summary: ${form.summary || ''}`,
        occurred_at: new Date().toISOString()
      });

      toast.success('Inspection logged');
      setActiveDrawer(null);
      load();
    } catch {
      toast.error('Failed to schedule inspection');
    } finally {
      setSaving(false);
    }
  };

  // Create AML Check
  const saveAml = async (e) => {
    e.preventDefault();
    if (!form.contact_id) return toast.error('Please select contact to check');
    setSaving(true);
    try {
      const contactRes = await api.get(`/contacts/${form.contact_id}`);
      const contact = contactRes.data.data;

      // Log the AML check as a secure communication log on the timeline
      await api.post(`/properties/${propertyId}/communications`, {
        channel: 'note',
        direction: 'internal',
        subject: `[AML CHECK] ${form.status === 'Passed' ? 'Passed' : 'Flagged'} - ${contact.full_name}`,
        body: `Verification Date: ${new Date().toLocaleDateString()}\nStatus: ${form.status}\nVerifier Notes: ${form.notes || 'Passed AML checks successfully.'}`,
        occurred_at: new Date().toISOString()
      });

      toast.success('AML check logged on property timeline');
      setActiveDrawer(null);
      load();
    } catch {
      toast.error('Failed to log AML check');
    } finally {
      setSaving(false);
    }
  };

  // Remove register entry
  const removeRegisterEntry = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    try {
      await api.delete(`/registers/entries/${id}`);
      toast.success('Entry removed');
      load();
    } catch {
      toast.error('Delete failed');
    }
  };

  if (loading || !property) return <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>;

  // Compile full activity feed
  const fullTimeline = [
    ...communications.map(c => ({
      id: `comm-${c.id}`,
      type: 'communication',
      channel: c.channel,
      direction: c.direction,
      title: c.subject || `${c.channel.toUpperCase()} (${c.direction})`,
      body: c.body,
      date: new Date(c.occurred_at || c.created_at)
    })),
    ...inspections.map(i => ({
      id: `ins-${i.id}`,
      type: 'inspection',
      channel: 'meeting',
      direction: 'internal',
      title: `Inspection ${i.inspection_code} (${i.inspection_type.replace(/_/g, ' ')})`,
      body: i.summary || `Status: ${i.status}`,
      date: new Date(i.scheduled_date || i.created_at)
    }))
  ].sort((a, b) => b.date - a.date);

  // Filters timeline by category sub-sub tabs
  const filteredTimeline = fullTimeline.filter(item => {
    if (activityFilter === 'all') return true;
    if (activityFilter === 'communication') {
      return item.type === 'communication' && ['call', 'email', 'sms', 'whatsapp'].includes(item.channel);
    }
    if (activityFilter === 'tasks') {
      return item.title.startsWith('[TASK]');
    }
    if (activityFilter === 'aml') {
      return item.title.startsWith('[AML CHECK]');
    }
    if (activityFilter === 'contact_activity') {
      return item.title.includes('Enquiry') || item.title.includes('Offer');
    }
    return true;
  });

  // Calculate days on market
  const createdDate = new Date(property.created_at);
  const diffTime = Math.abs(new Date() - createdDate);
  const daysOnMarket = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return (
    <div className="property-dashboard-wrapper">
      
      {/* HEADER BREADCRUMB ROW */}
      <div className="breadcrumb-row between" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          <button className="btn btn-ghost btn-sm" style={{ paddingLeft: 0 }} onClick={onBack}>
            <ArrowLeft size={14} style={{ marginRight: 6 }} /> Back
          </button>
          <span>Home</span> &gt; <span>Properties</span> &gt; <span style={{ fontWeight: 600 }}>{property.title} Property Details</span>
        </div>
        <Button size="sm" variant="outline" icon={Share2} onClick={cloneListing}>
          Clone Listing
        </Button>
      </div>

      {/* PROPERTY TITLE BLOCK */}
      <div className="property-header-card card card-pad" style={{ marginBottom: 20, borderLeft: '4px solid var(--primary)' }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{
            width: 72, height: 72, background: 'var(--surface-3)', borderRadius: 8,
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {property.featured_image_url ? (
              <img src={property.featured_image_url} alt="Property" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Building2 size={28} color="var(--muted-2)" />
            )}
          </div>
          <div>
            <div className="row" style={{ gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{property.title}</h2>
              <span className="code-chip">{property.property_code}</span>
            </div>
            <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <Badge tone="green">{property.status.toUpperCase()}</Badge>
              <Badge tone="blue">For Sale</Badge>
              <Badge tone="amber">{property.category.toUpperCase()} SALE</Badge>
              {property.property_type && <Badge tone="grey">{property.property_type}</Badge>}
              {property.bedrooms > 0 && <span style={{ fontSize: 13, color: 'var(--muted)' }}>🛏️ {property.bedrooms} Bed</span>}
              {property.bathrooms > 0 && <span style={{ fontSize: 13, color: 'var(--muted)' }}>🚿 {property.bathrooms} Bath</span>}
              {property.parking > 0 && <span style={{ fontSize: 13, color: 'var(--muted)' }}>🚗 {property.parking} Parking</span>}
            </div>
          </div>
        </div>
      </div>

      {/* DASHBOARD GRID split 75/25 */}
      <div className="grid" style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 20 }}>
        
        {/* LEFT COLUMN - NAV TABS & SHEETS */}
        <div>
          <div className="tabs" style={{ marginBottom: 16 }}>
            <div className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Dashboard</div>
            <div className={`tab ${activeTab === 'listing_details' ? 'active' : ''}`} onClick={() => setActiveTab('listing_details')}>Listing Details</div>
            <div className={`tab ${activeTab === 'property_details' ? 'active' : ''}`} onClick={() => setActiveTab('property_details')}>Property Details</div>
            <div className={`tab ${activeTab === 'media' ? 'active' : ''}`} onClick={() => setActiveTab('media')}>Images, Docs & Copy</div>
            <div className={`tab ${activeTab === 'inspections' ? 'active' : ''}`} onClick={() => setActiveTab('inspections')}>Inspections ({inspections.length})</div>
            <div className={`tab ${activeTab === 'compliance' ? 'active' : ''}`} onClick={() => setActiveTab('compliance')}>Compliance</div>
            <div className={`tab ${activeTab === 'workflow' ? 'active' : ''}`} onClick={() => setActiveTab('workflow')}>Workflow</div>
          </div>

          <div style={{ minHeight: 450 }}>
            {/* 1. DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
              <>
                {/* SUB TABS */}
                <div className="tabs-sub" style={{ display: 'flex', gap: 16, borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 16 }}>
                  {['activity', 'marketing', 'buyers', 'vendor_report', 'contracts'].map(sub => (
                    <div key={sub}
                      style={{
                        cursor: 'pointer', fontSize: 13, fontWeight: 600,
                        color: dashboardSubTab === sub ? 'var(--primary)' : 'var(--muted)',
                        borderBottom: dashboardSubTab === sub ? '2px solid var(--primary)' : 'none',
                        paddingBottom: 4
                      }}
                      onClick={() => setDashboardSubTab(sub)}>
                      {sub.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </div>
                  ))}
                </div>

                {/* Sub Tab Activity */}
                {dashboardSubTab === 'activity' && (
                  <>
                    {/* Action buttons row */}
                    <div className="row" style={{ gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                      <Button size="sm" onClick={() => { setForm({}); setActiveDrawer('add_note'); }}>Add note</Button>
                      <Button size="sm" onClick={() => { setForm({}); setActiveDrawer('log_enquiry'); }}>Log an Enquiry</Button>
                      <Button size="sm" onClick={() => { setForm({}); setActiveDrawer('log_inspection'); }}>Log an Inspection</Button>
                      <Button size="sm" onClick={() => { setForm({}); setActiveDrawer('log_offer'); }}>Log an Offer</Button>
                      <Button size="sm" onClick={() => { setForm({}); setActiveDrawer('add_task'); }}>Add a task</Button>
                      <Button size="sm" onClick={() => { setForm({}); setActiveDrawer('create_aml'); }}>Create AML Check</Button>
                    </div>

                    {/* Sub-sub tabs filter bar */}
                    <div className="row" style={{ gap: 14, background: 'var(--surface-2)', padding: '6px 12px', borderRadius: 8, marginBottom: 16 }}>
                      {['all', 'communication', 'contact_activity', 'tasks', 'aml'].map(f => (
                        <span key={f}
                          style={{
                            fontSize: 12, cursor: 'pointer', fontWeight: 600,
                            color: activityFilter === f ? 'var(--primary)' : 'var(--muted)',
                          }}
                          onClick={() => setActivityFilter(f)}>
                          {f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                      ))}
                    </div>

                    {/* Chronological Timeline */}
                    <div className="timeline-panel card card-pad">
                      {filteredTimeline.length > 0 ? (
                        <div className="timeline" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          {filteredTimeline.map((c) => (
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
                                  <strong style={{ fontSize: 13.5 }}>{c.title}</strong>
                                  <span className="cell-sub" style={{ fontSize: 11 }}>{c.date.toLocaleString()}</span>
                                </div>
                                <p style={{ margin: '4px 0 0 0', color: 'var(--muted)', fontSize: 13, whiteSpace: 'pre-wrap' }}>{c.body}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="cell-sub" style={{ textAlign: 'center', padding: 20 }}>No activity matching filter found.</p>
                      )}
                    </div>
                  </>
                )}

                {/* Sub Tab Buyers */}
                {dashboardSubTab === 'buyers' && (
                  <div className="card card-pad">
                    <h3 style={{ margin: '0 0 12px 0', fontSize: 15 }}>Enquiries & Interested Buyers</h3>
                    <DataTable
                      columns={[
                        { key: 'buyer_id', header: 'Buyer Ref', render: (r) => <span className="code-chip">{r.data.buyer_id}</span> },
                        { key: 'location', header: 'Asking Budget', render: (r) => r.data.asking_price || '—' },
                        { key: 'budget_fit', header: 'Offer / Fit', render: (r) => r.data.budget_fit ? money(r.data.budget_fit) : '—' },
                        { key: 'fit', header: 'Fit Score', render: (r) => r.data.score___100 ? `${r.data.score___100}/100` : '—' },
                        { key: 'decision', header: 'Status/Decision', render: (r) => <Badge tone="blue">{r.data.buyer_decision || 'Pending'}</Badge> },
                        { key: 'notes', header: 'Enquiry Notes', render: (r) => r.data.notes || '—' },
                        { key: '_x', header: '', render: (r) => (
                          <button className="btn btn-danger btn-icon" onClick={() => removeRegisterEntry(r.id)}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      ]}
                      rows={buyerEnquiries}
                      empty={<p className="cell-sub" style={{ textAlign: 'center', padding: 20 }}>No buyer enquiries logged yet. Log an Enquiry above.</p>}
                    />
                  </div>
                )}

                {/* Sub Tab Contracts */}
                {dashboardSubTab === 'contracts' && (
                  <div className="card card-pad">
                    <h3 style={{ margin: '0 0 12px 0', fontSize: 15 }}>Property Sale Contracts & Deals</h3>
                    <DataTable
                      columns={[
                        { key: 'deal_code', header: 'Deal Code', render: (r) => <span className="code-chip">{r.deal_code}</span> },
                        { key: 'buyer', header: 'Buyer Name', render: (r) => r.buyer?.Contact?.full_name || '—' },
                        { key: 'sale_price', header: 'Contract Value', render: (r) => money(r.sale_price) },
                        { key: 'commission', header: 'Commission (BDT)', render: (r) => money(r.commission_amount) },
                        { key: 'status', header: 'Deal Status', render: (r) => <StatusBadge status={r.status} /> }
                      ]}
                      rows={deals}
                      empty={<p className="cell-sub" style={{ textAlign: 'center', padding: 20 }}>No active sale contracts linked yet.</p>}
                    />
                  </div>
                )}

                {/* Placeholders */}
                {['marketing', 'vendor_report'].includes(dashboardSubTab) && (
                  <div className="card card-pad" style={{ textAlign: 'center', padding: 40 }}>
                    <Info size={28} style={{ color: 'var(--muted-2)', marginBottom: 10 }} />
                    <p style={{ color: 'var(--muted)', fontSize: 13 }}>Marketing statistics and vendor report generation tools are loading...</p>
                  </div>
                )}
              </>
            )}

            {/* 2. LISTING DETAILS TAB */}
            {activeTab === 'listing_details' && (
              <div className="card card-pad">
                <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 16 }}>Listing & Marketing Details</h3>
                <form onSubmit={handleSaveDetails}>
                  <div className="form-grid">
                    <Field label="Marketing Title" required full><Input value={form.title || property.title} onChange={e => setForm({...form, title: e.target.value})} /></Field>
                    <Field label="Listing Status"><Select value={form.status || property.status} onChange={e => setForm({...form, status: e.target.value})}>{['draft', 'available', 'reserved', 'sold', 'inactive'].map(st => <option key={st}>{st}</option>)}</Select></Field>
                    <Field label="Property Type"><Input value={form.property_type || property.property_type || ''} onChange={e => setForm({...form, property_type: e.target.value})} /></Field>
                    <Field label="Asking Price (BDT)"><Input type="number" value={form.price || property.price || ''} onChange={e => setForm({...form, price: e.target.value})} /></Field>
                    <Field label="Listing Agent"><Combo endpoint="/contacts" labelFn={c => c.full_name} value={form.manager_id || property.manager_id} onChange={v => setForm({...form, manager_id: v})} /></Field>
                  </div>
                  <Field label="Description / Marketing Copy" full><Textarea value={form.description || property.description || ''} onChange={e => setForm({...form, description: e.target.value})} rows={6} /></Field>
                  <Button type="submit" disabled={saving}>{saving ? <Spinner /> : 'Save Details'}</Button>
                </form>
              </div>
            )}

            {/* 3. PROPERTY DETAILS TAB */}
            {activeTab === 'property_details' && (
              <div className="card card-pad">
                <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 16 }}>Property Structural Specifications</h3>
                <form onSubmit={handleSaveDetails}>
                  <div className="form-grid">
                    <Field label="Bedrooms"><Input type="number" value={form.bedrooms || property.bedrooms || ''} onChange={e => setForm({...form, bedrooms: e.target.value})} /></Field>
                    <Field label="Bathrooms"><Input type="number" value={form.bathrooms || property.bathrooms || ''} onChange={e => setForm({...form, bathrooms: e.target.value})} /></Field>
                    <Field label="Parking Space"><Input type="number" value={form.parking || property.parking || ''} onChange={e => setForm({...form, parking: e.target.value})} /></Field>
                    <Field label="Building Size (sqft)"><Input value={form.building_size || property.building_size || ''} onChange={e => setForm({...form, building_size: e.target.value})} /></Field>
                    <Field label="Land Size (decimal)"><Input value={form.land_size || property.land_size || ''} onChange={e => setForm({...form, land_size: e.target.value})} /></Field>
                    <Field label="Year Built"><Input value={form.year_built || property.year_built || ''} onChange={e => setForm({...form, year_built: e.target.value})} /></Field>
                    <Field label="Area"><Input value={form.area || property.area || ''} onChange={e => setForm({...form, area: e.target.value})} /></Field>
                    <Field label="District"><Input value={form.district || property.district || ''} onChange={e => setForm({...form, district: e.target.value})} /></Field>
                  </div>
                  <Field label="Property Address" full><Textarea value={form.address || property.address || ''} onChange={e => setForm({...form, address: e.target.value})} rows={2} /></Field>
                  <Button type="submit" disabled={saving}>{saving ? <Spinner /> : 'Save Specifications'}</Button>
                </form>
              </div>
            )}

            {/* 4. IMAGES, DOCS & COPY TAB */}
            {activeTab === 'media' && (
              <div className="grid-2">
                {/* Images */}
                <div className="card card-pad">
                  <h3>Property Images / Media</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                    {(property.media || []).map(m => (
                      <div key={m.id} style={{ position: 'relative', borderRadius: 4, overflow: 'hidden', height: 80, border: '1px solid var(--border)' }}>
                        <img src={m.media_url} alt="Media" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ border: '2px dashed var(--border)', borderRadius: 8, padding: 20, textAlign: 'center', color: 'var(--muted)' }}>
                    <Upload size={20} style={{ margin: '0 auto 8px auto' }} />
                    <span style={{ fontSize: 13 }}>Upload Property Images</span>
                  </div>
                </div>

                {/* Documents */}
                <div className="card card-pad">
                  <h3>Legal & Listing Documents</h3>
                  <DataTable
                    columns={[
                      { key: 'title', header: 'Title', render: (r) => r.title },
                      { key: 'type', header: 'Type', render: (r) => <Badge tone="blue">{r.doc_type.toUpperCase()}</Badge> },
                      { key: 'actions', header: '', render: (r) => <a className="btn btn-ghost btn-sm" href={r.file_url} target="_blank" rel="noreferrer"><Eye size={12} /></a> }
                    ]}
                    rows={property.documents || []}
                    empty={<p className="cell-sub" style={{ textAlign: 'center' }}>No documents uploaded. Upload Deeds, mutation copies or tax clearings.</p>}
                  />
                </div>
              </div>
            )}

            {/* 5. INSPECTIONS TAB */}
            {activeTab === 'inspections' && (
              <div className="card card-pad">
                <DataTable
                  columns={[
                    { key: 'inspection_code', header: 'Code', render: (r) => <span className="code-chip">{r.inspection_code}</span> },
                    { key: 'type', header: 'Type', render: (r) => r.inspection_type.replace(/_/g, ' ').toUpperCase() },
                    { key: 'scheduled_date', header: 'Scheduled Date', render: (r) => new Date(r.scheduled_date).toLocaleString() },
                    { key: 'summary', header: 'Inspection Summary', render: (r) => r.summary || '—' },
                    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> }
                  ]}
                  rows={inspections}
                  empty={<p className="cell-sub" style={{ textAlign: 'center', padding: 20 }}>No inspections scheduled or logged for this property.</p>}
                />
              </div>
            )}

            {/* 6. COMPLIANCE TAB */}
            {activeTab === 'compliance' && (
              <div className="card card-pad">
                <div className="between" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 12 }}>
                  <h3 style={{ margin: 0 }}>Property Compliance Checks</h3>
                  <Badge tone="amber">Pending Audit</Badge>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                  {[
                    { label: 'Verify Land Title Deed (Original)', status: 'Approved' },
                    { label: 'Check Mutation Registration Certificate', status: 'Pending' },
                    { label: 'Confirm Land Tax Receipt Clearances', status: 'Pending' },
                    { label: 'Verify Building Rajuk/Local Authority Approvals', status: 'N/A' },
                    { label: 'Verify Owner Identity KYC Check (AML Clearance)', status: 'Approved' },
                  ].map((chk, i) => (
                    <div key={i} className="between" style={{ padding: 10, background: 'var(--surface-2)', borderRadius: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{chk.label}</span>
                      <Badge tone={chk.status === 'Approved' ? 'green' : chk.status === 'Pending' ? 'amber' : 'grey'}>{chk.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. WORKFLOW TAB */}
            {activeTab === 'workflow' && (
              <div className="card card-pad">
                {projectLoading ? <Spinner /> : !project ? (
                  <div style={{ textAlign: 'center', padding: 45 }}>
                    <ShieldCheck size={36} color="var(--muted-2)" style={{ margin: '0 auto 12px auto' }} />
                    <h3 style={{ margin: '0 0 8px 0' }}>No Active Sale Process Workflow</h3>
                    <p className="cell-sub" style={{ marginBottom: 16 }}>Initialize the stage-gate sales process tracker (Consultation, Sourcing, Verification, Offer, Settlement) for this property.</p>
                    <Button icon={Play} onClick={startWorkflowProject} disabled={saving}>
                      Start Sale Process Workflow
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="between" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 12 }}>
                      <div>
                        <h3 style={{ margin: 0 }}>{project.title}</h3>
                        <div className="cell-sub" style={{ marginTop: 4 }}>Workflow run code: <span className="code-chip">{project.project_code}</span></div>
                      </div>
                      <StatusBadge status={project.status} />
                    </div>

                    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {(project.stages || []).map((s) => {
                        const total = (s.checklist || []).length;
                        const done = (s.checklist || []).filter(c => c.done).length;
                        const active = s.status === 'in_progress';
                        return (
                          <div key={s.id} className="card" style={{ marginBottom: 4, borderLeft: `3px solid ${s.status === 'done' ? 'var(--success)' : active ? 'var(--primary)' : 'var(--border)'}` }}>
                            <div className="card-pad" style={{ padding: 12 }}>
                              <div className="between">
                                <div className="row" style={{ cursor: 'pointer' }} onClick={() => setExpandedStageItem(expandedStageItem === s.id ? null : s.id)}>
                                  {s.status === 'done' ? <CheckCircle2 size={16} color="var(--success)" /> : <ChevronRightIcon size={16} color="var(--muted)" />}
                                  <b style={{ fontSize: 13.5, marginLeft: 8 }}>{s.sort_order}. {s.stage_name}</b>
                                </div>
                                <div className="row" style={{ gap: 8 }}>
                                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{done}/{total} Done</span>
                                  <StatusBadge status={s.status} />
                                </div>
                              </div>

                              {(active || expandedStageItem === s.id) && total > 0 && (
                                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {s.checklist.map((c, idx) => (
                                    <div key={idx} style={{ padding: 8, background: 'var(--surface-2)', borderRadius: 6 }} className="between">
                                      <div className="row" style={{ gap: 8 }} onClick={() => active && toggleCheck(s, idx)}>
                                        {c.done ? <CheckCircle2 size={15} color="var(--success)" /> : <span style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid var(--border)' }} />}
                                        <span style={{ textDecoration: c.done ? 'line-through' : 'none', color: c.done ? 'var(--muted)' : 'var(--text)', fontSize: 12.5 }}>
                                          {c.label}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN - LISTING INFO & OWNERSHIP */}
        <div>
          {/* Listing Information Card */}
          <div className="card card-pad" style={{ marginBottom: 20 }}>
            <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 12, fontSize: 14, textTransform: 'uppercase', tracking: 1 }}>Listing Information</h3>
            <p style={{ fontWeight: 800, margin: '0 0 10px 0', fontSize: 14 }}>{property.description?.split('\n')[0]?.substring(0, 50) || 'BRAND NEW LUXURY LISTING'}</p>
            <KV k="Marketing Price" v={money(property.price)} />
            <KV k="Listing Agent" v={property.manager?.full_name} />
            <KV k="Authority" v="Exclusive Authority" />
            <KV k="Days on Market" v={`${daysOnMarket} days`} />
            <KV k="Created At" v={createdDate.toLocaleDateString()} />
            <KV k="Last Updated" v={new Date(property.updated_at).toLocaleDateString()} />
          </div>

          {/* Ownership Card */}
          <div className="card card-pad">
            <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 12, fontSize: 14, textTransform: 'uppercase', tracking: 1 }}>Ownership</h3>
            {property.owner ? (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{property.owner.full_name}</div>
                {property.owner.email && <div className="cell-sub" style={{ fontSize: 11, marginTop: 2 }}><Mail size={10} style={{ marginRight: 4 }} />{property.owner.email}</div>}
                {property.owner.primary_phone && <div className="cell-sub" style={{ fontSize: 11, marginTop: 2 }}><Phone size={10} style={{ marginRight: 4 }} />{property.owner.primary_phone}</div>}
              </div>
            ) : (
              <p className="cell-sub" style={{ marginBottom: 14 }}>No ownership profile linked.</p>
            )}
            <div className="row" style={{ gap: 8 }}>
              <Button size="sm" variant="ghost" style={{ width: '100%', fontSize: 11 }} onClick={() => { setForm({ owner_contact_id: property.owner_contact_id }); setActiveDrawer('add_ownership'); }}>Add/Edit Owner</Button>
            </div>
            <Button size="sm" variant="ghost" icon={FileSignature} style={{ width: '100%', fontSize: 11, marginTop: 8 }} onClick={() => nav('/role-onboarding')}>
              Role Onboarding
            </Button>
          </div>
        </div>
      </div>

      {/* DRAWERS */}

      {/* 1. Add Note Drawer */}
      {activeDrawer === 'add_note' && (
        <Drawer title="Add Note to Listing" onClose={() => setActiveDrawer(null)}
          footer={<><Button variant="ghost" onClick={() => setActiveDrawer(null)}>Cancel</Button><Button onClick={saveNote} disabled={saving}>{saving ? <Spinner /> : 'Save note'}</Button></>}>
          <form onSubmit={saveNote} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Subject" required><Input value={form.subject || ''} onChange={e => setForm({...form, subject: e.target.value})} placeholder="e.g. Call notes with vendor" /></Field>
            <Field label="Details / Note Description" required full><Textarea value={form.body || ''} onChange={e => setForm({...form, body: e.target.value})} rows={6} /></Field>
          </form>
        </Drawer>
      )}

      {/* 2. Log Enquiry Drawer */}
      {activeDrawer === 'log_enquiry' && (
        <Drawer title="Log Buyer Enquiry" onClose={() => setActiveDrawer(null)}
          footer={<><Button variant="ghost" onClick={() => setActiveDrawer(null)}>Cancel</Button><Button onClick={saveEnquiry} disabled={saving}>{saving ? <Spinner /> : 'Save Enquiry'}</Button></>}>
          <form onSubmit={saveEnquiry} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Select Buyer (Contact)" required><Combo endpoint="/contacts" labelFn={c => c.full_name} value={form.contact_id} onChange={v => setForm({...form, contact_id: v})} placeholder="Search buyers..." /></Field>
            <Field label="Market Suitability"><Select value={form.market_fit || 'Good'} onChange={e => setForm({...form, market_fit: e.target.value})}><option>Excellent</option><option>Good</option><option>Fair</option></Select></Field>
            <Field label="Budget Suitability"><Input type="number" value={form.budget_fit || ''} onChange={e => setForm({...form, budget_fit: e.target.value})} placeholder="e.g. 15000000" /></Field>
            <Field label="Enquiry Remarks / Notes" required full><Textarea value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} rows={4} /></Field></form>
        </Drawer>
      )}

      {/* 3. Log Inspection Drawer */}
      {activeDrawer === 'log_inspection' && (
        <Drawer title="Log Property Inspection" onClose={() => setActiveDrawer(null)}
          footer={<><Button variant="ghost" onClick={() => setActiveDrawer(null)}>Cancel</Button><Button onClick={saveInspection} disabled={saving}>{saving ? <Spinner /> : 'Schedule'}</Button></>}>
          <form onSubmit={saveInspection} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Inspection Type"><Select value={form.inspection_type || 'routine'} onChange={e => setForm({...form, inspection_type: e.target.value})}><option value="routine">Routine Inspection</option><option value="entry">Entry Condition</option><option value="exit">Exit Condition</option><option value="site_assessment">Site Assessment</option></Select></Field>
            <Field label="Scheduled Time" required><Input type="datetime-local" value={form.scheduled_date || ''} onChange={e => setForm({...form, scheduled_date: e.target.value})} /></Field>
            <Field label="Status"><Select value={form.status || 'scheduled'} onChange={e => setForm({...form, status: e.target.value})}><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></Select></Field>
            <Field label="Details / Summary" full><Textarea value={form.summary || ''} onChange={e => setForm({...form, summary: e.target.value})} rows={3} /></Field></form>
        </Drawer>
      )}

      {/* 4. Log Offer Drawer */}
      {activeDrawer === 'log_offer' && (
        <Drawer title="Log Purchase Offer" onClose={() => setActiveDrawer(null)}
          footer={<><Button variant="ghost" onClick={() => setActiveDrawer(null)}>Cancel</Button><Button onClick={saveOffer} disabled={saving}>{saving ? <Spinner /> : 'Log Offer'}</Button></>}>
          <form onSubmit={saveOffer} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Select Buyer (Contact)" required><Combo endpoint="/contacts" labelFn={c => c.full_name} value={form.contact_id} onChange={v => setForm({...form, contact_id: v})} placeholder="Search buyers..." /></Field>
            <Field label="Offer Amount (BDT)" required><Input type="number" value={form.offer_amount || ''} onChange={e => setForm({...form, offer_amount: e.target.value})} placeholder="e.g. 12000000" /></Field>
            <Field label="Offer Date" required><Input type="date" value={form.offer_date || ''} onChange={e => setForm({...form, offer_date: e.target.value})} /></Field>
            <Field label="Offer Terms / Notes" full><Textarea value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} rows={3} /></Field></form>
        </Drawer>
      )}

      {/* 5. Add Task Drawer */}
      {activeDrawer === 'add_task' && (
        <Drawer title="Add Action Task" onClose={() => setActiveDrawer(null)}
          footer={<><Button variant="ghost" onClick={() => setActiveDrawer(null)}>Cancel</Button><Button onClick={saveTask} disabled={saving}>{saving ? <Spinner /> : 'Log Task'}</Button></>}>
          <form onSubmit={saveTask} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Task Subject" required><Input value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Verify original deed copies" /></Field>
            <Field label="Priority"><Select value={form.priority || 'medium'} onChange={e => setForm({...form, priority: e.target.value})}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></Select></Field>
            <Field label="Due Date" required><Input type="date" value={form.due_date || ''} onChange={e => setForm({...form, due_date: e.target.value})} /></Field>
            <Field label="Task Instructions" full><Textarea value={form.body || ''} onChange={e => setForm({...form, body: e.target.value})} rows={4} /></Field></form>
        </Drawer>
      )}

      {/* 6. Create AML Check Drawer */}
      {activeDrawer === 'create_aml' && (
        <Drawer title="Verify AML Status" onClose={() => setActiveDrawer(null)}
          footer={<><Button variant="ghost" onClick={() => setActiveDrawer(null)}>Cancel</Button><Button onClick={saveAml} disabled={saving}>{saving ? <Spinner /> : 'Verify'}</Button></>}>
          <form onSubmit={saveAml} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Select Party (Contact)" required><Combo endpoint="/contacts" labelFn={c => c.full_name} value={form.contact_id} onChange={v => setForm({...form, contact_id: v})} placeholder="Search party..." /></Field>
            <Field label="Status"><Select value={form.status || 'Passed'} onChange={e => setForm({...form, status: e.target.value})}><option>Passed</option><option>Flagged</option><option>Under Audit</option></Select></Field>
            <Field label="Remarks / Verification Details" full><Textarea value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} rows={3} /></Field></form>
        </Drawer>
      )}

      {/* 7. Add Ownership Drawer */}
      {activeDrawer === 'add_ownership' && (
        <Drawer title="Update Listing Owner" onClose={() => setActiveDrawer(null)}
          footer={<><Button variant="ghost" onClick={() => setActiveDrawer(null)}>Cancel</Button><Button onClick={handleAddOwnership} disabled={saving}>{saving ? <Spinner /> : 'Save'}</Button></>}>
          <form onSubmit={handleAddOwnership} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Select Owner (Contact)" required><Combo endpoint="/contacts" labelFn={c => c.full_name} value={form.owner_contact_id} onChange={v => setForm({...form, owner_contact_id: v})} placeholder="Search owner contact..." /></Field>
          </form>
        </Drawer>
      )}
    </div>
  );
}

// Simple Helper chevron icon since Lucide is fully available
function ChevronRightIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
