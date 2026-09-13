// admin-portal/src/screens/sales/SalesMarketingHub.jsx
//
// Enterprise Marketing & Campaigns Console for Residential Real Estate.
// Includes 20 prebuilt responsive templates, live HTML builder with desktop/mobile preview,
// bulk email, bulk SMS, WhatsApp broadcast queue, and audience segmentation.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Megaphone, Mail, MessageSquare, Send, Plus, Search, Filter,
  Eye, Smartphone, Monitor, Copy, Check, ExternalLink, RefreshCw,
  Users, Sparkles, CheckCircle2, AlertCircle, Clock, BarChart3,
  FileText, ArrowUpRight, ChevronRight, X, Play, RotateCcw,
  Building2, Phone, ShieldCheck, Tag, Info, Trash2, Edit3, Code2
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button, Badge, StatusBadge, Drawer, Field, Input, Select, Textarea, Spinner } from '../../ui/kit';

const CATEGORIES = [
  { id: 'all', label: 'All Templates (20)' },
  { id: 'new_listing', label: 'New Listings (5)' },
  { id: 'sales_update', label: 'Sales Updates (5)' },
  { id: 'sold_update', label: 'Sold Updates (4)' },
  { id: 'buyer_nurture', label: 'Buyer Nurture (3)' },
  { id: 'seller_engagement', label: 'Seller Engagement (3)' },
  { id: 'general', label: 'Custom / General' },
];

const CHANNELS = [
  { id: 'all', label: 'All Channels' },
  { id: 'email', label: 'Email' },
  { id: 'sms', label: 'SMS' },
  { id: 'whatsapp', label: 'WhatsApp' },
];

const MERGE_TAGS = [
  { tag: '{{name}}', desc: 'Recipient Full Name' },
  { tag: '{{first_name}}', desc: 'First Name' },
  { tag: '{{property_title}}', desc: 'Linked Property Title' },
  { tag: '{{property_price}}', desc: 'Property Price (৳)' },
  { tag: '{{property_area}}', desc: 'Property Area/Location' },
  { tag: '{{agent_name}}', desc: 'Current Advisor Name' },
  { tag: '{{agent_phone}}', desc: 'Advisor Phone' },
  { tag: '{{agent_email}}', desc: 'Advisor Email' },
  { tag: '{{view_link}}', desc: 'Property Link' },
  { tag: '{{unsubscribe_link}}', desc: 'Unsubscribe URL' }
];

export default function SalesMarketingHub({ scope }) {
  const { user } = useAuth();
  const toast = useToast();
  const location = useLocation();

  // Active Tab: 'templates' | 'campaigns' | 'broadcast' | 'segments' | 'logs'
  const [activeTab, setActiveTab] = useState(location.state?.initialTab || 'templates');

  // Global State
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [segments, setSegments] = useState([]);
  const [properties, setProperties] = useState([]);

  // Filtering
  const [tplCategory, setTplCategory] = useState('all');
  const [tplChannel, setTplChannel] = useState('all');
  const [tplSearch, setTplSearch] = useState('');

  // Modals & Drawers
  const [builderModal, setBuilderModal] = useState(null); // Template object or null
  const [builderTab, setBuilderTab] = useState('code'); // 'code' | 'visual'
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile'
  const [testSendDest, setTestSendDest] = useState('');
  const [testSending, setTestSending] = useState(false);

  // Campaign Wizard State
  const [campaignModal, setCampaignModal] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    channel: 'email',
    campaign_type: 'new_listing',
    template_id: '',
    property_id: '',
    subject: '',
    preheader: '',
    body_html: '',
    body_text: '',
    target_type: 'all_contacts',
    target_filter: {},
  });
  const [campaignAudience, setCampaignAudience] = useState({ total: 0, reachable: 0 });
  const [campaignSaving, setCampaignSaving] = useState(false);

  // Quick Direct Broadcast State
  const [broadcastChannel, setBroadcastChannel] = useState(location.state?.channel || 'email');
  const [broadcastTarget, setBroadcastTarget] = useState(
    location.state?.target_type || (location.state?.contact_ids?.length ? 'selected_contacts' : 'all_contacts')
  );
  const [selectedContactIds, setSelectedContactIds] = useState(location.state?.contact_ids || []);
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [waQueue, setWaQueue] = useState([]);

  useEffect(() => {
    if (location.state?.initialTab) {
      setActiveTab(location.state.initialTab);
    }
    if (location.state?.channel) {
      setBroadcastChannel(location.state.channel);
    }
    if (location.state?.contact_ids?.length) {
      setSelectedContactIds(location.state.contact_ids);
      setBroadcastTarget('selected_contacts');
    }
  }, [location.state]);

  // Campaign Details Drawer
  const [campaignDrawer, setCampaignDrawer] = useState(null);
  const [campaignDetailRecipients, setCampaignDetailRecipients] = useState([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Auto-Draft Modal State
  const [autoDraftModal, setAutoDraftModal] = useState(false);
  const [selectedPropId, setSelectedPropId] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [forceRegen, setForceRegen] = useState(false);

  // ────────────────────────────────────────────────────────────
  //  DATA FETCHING
  // ────────────────────────────────────────────────────────────

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [tplRes, cmpRes, anaRes, segRes, propRes] = await Promise.all([
        api.get('/marketing/templates').catch(() => ({ data: [] })),
        api.get('/marketing/campaigns').catch(() => ({ data: [] })),
        api.get('/marketing/analytics').catch(() => ({ data: null })),
        api.get('/marketing/segments').catch(() => ({ data: [] })),
        api.get('/properties', { params: { limit: 50 } }).catch(() => ({ data: { rows: [] } })),
      ]);

      setTemplates(Array.isArray(tplRes.data) ? tplRes.data : []);
      setCampaigns(Array.isArray(cmpRes.data) ? cmpRes.data : []);
      setAnalytics(anaRes.data);
      setSegments(Array.isArray(segRes.data) ? segRes.data : []);
      setProperties(propRes.data?.rows || (Array.isArray(propRes.data) ? propRes.data : []));
    } catch (err) {
      console.error('Error fetching marketing data:', err);
      toast.error('Failed to load marketing information');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Check audience count when campaign target changes
  const checkAudience = useCallback(async (targetType, channel) => {
    try {
      const res = await api.post('/marketing/audience-count', {
        target_type: targetType,
        channel: channel || 'email'
      });
      setCampaignAudience(res.data);
    } catch {
      setCampaignAudience({ total: 0, reachable: 0 });
    }
  }, []);

  useEffect(() => {
    if (campaignModal) {
      checkAudience(campaignForm.target_type, campaignForm.channel);
    }
  }, [campaignModal, campaignForm.target_type, campaignForm.channel, checkAudience]);

  // ────────────────────────────────────────────────────────────
  //  TEMPLATE BUILDER ACTIONS
  // ────────────────────────────────────────────────────────────

  const handleOpenBuilder = (template) => {
    setBuilderModal({
      ...template,
      temp_subject: template.subject || '',
      temp_preheader: template.preheader || '',
      temp_body_html: template.body_html || '',
      temp_body_text: template.body_text || '',
    });
    setTestSendDest(user?.email || '');
    setBuilderTab('code');
  };

  const handleInsertTag = (tag) => {
    if (!builderModal) return;
    setBuilderModal(prev => ({
      ...prev,
      temp_body_html: (prev.temp_body_html || '') + ' ' + tag,
      temp_body_text: (prev.temp_body_text || '') + ' ' + tag,
    }));
    toast.success(`Inserted ${tag}`);
  };

  const handleSaveTemplate = async () => {
    if (!builderModal) return;
    try {
      const payload = {
        subject: builderModal.temp_subject,
        preheader: builderModal.temp_preheader,
        body_html: builderModal.temp_body_html,
        body_text: builderModal.temp_body_text,
        name: builderModal.name,
      };

      if (builderModal.id) {
        await api.put(`/marketing/templates/${builderModal.id}`, payload);
        toast.success('Template updated successfully');
      } else {
        await api.post('/marketing/templates', payload);
        toast.success('New template created');
      }
      setBuilderModal(null);
      fetchAllData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save template');
    }
  };

  const handleTestSend = async () => {
    if (!testSendDest) {
      toast.error('Please enter a destination email or phone number');
      return;
    }
    setTestSending(true);
    try {
      const channel = builderModal?.channel === 'sms' ? 'sms' : 'email';
      const res = await api.post('/marketing/test-send', {
        channel,
        destination: testSendDest,
        subject: builderModal?.temp_subject || 'Test Subject',
        body_html: builderModal?.temp_body_html,
        body_text: builderModal?.temp_body_text,
      });
      toast.success(res.data?.message || `Test dispatch sent to ${testSendDest}!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Test send failed');
    } finally {
      setTestSending(false);
    }
  };

  // ────────────────────────────────────────────────────────────
  //  CAMPAIGN WIZARD ACTIONS
  // ────────────────────────────────────────────────────────────

  const handleLaunchCampaignFromTemplate = (tpl) => {
    setCampaignForm({
      name: `Campaign: ${tpl.name}`,
      channel: tpl.channel === 'any' ? 'email' : tpl.channel,
      campaign_type: tpl.category || 'new_listing',
      template_id: tpl.id,
      property_id: '',
      subject: tpl.subject || '',
      preheader: tpl.preheader || '',
      body_html: tpl.body_html || '',
      body_text: tpl.body_text || '',
      target_type: 'all_contacts',
      target_filter: {},
    });
    setCampaignModal(true);
  };

  const handleSaveAndSendCampaign = async (isSendNow = false) => {
    if (!campaignForm.name) {
      toast.error('Campaign Name is required');
      return;
    }
    setCampaignSaving(true);
    try {
      const createRes = await api.post('/marketing/campaigns', campaignForm);
      const campaignId = createRes.data?.id;

      if (isSendNow && campaignId) {
        await api.post(`/marketing/campaigns/${campaignId}/send`);
        toast.success(`Campaign "${campaignForm.name}" dispatched to recipients!`);
      } else {
        toast.success(`Campaign "${campaignForm.name}" saved as draft.`);
      }

      setCampaignModal(false);
      fetchAllData();
      setActiveTab('campaigns');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to process campaign');
    } finally {
      setCampaignSaving(false);
    }
  };

  const handleOpenCampaignDetails = async (campaign) => {
    setCampaignDrawer(campaign);
    setDrawerLoading(true);
    try {
      const res = await api.get(`/marketing/campaigns/${campaign.id}`);
      setCampaignDrawer(prev => ({ ...prev, ...res.data }));
      setCampaignDetailRecipients(res.data?.recipients || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load campaign recipients');
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleAutoDraftForProperty = async () => {
    if (!selectedPropId) {
      toast.error('Please select a property to auto-draft campaign.');
      return;
    }
    setDrafting(true);
    try {
      const res = await api.post(`/marketing/campaigns/auto-draft/${selectedPropId}`, { force: forceRegen });
      toast.success(res.data?.message || 'Luxury campaign drafted!');
      setAutoDraftModal(false);
      await fetchAllData();
      setActiveTab('campaigns');
      if (res.data?.campaign) {
        handleOpenCampaignDetails(res.data.campaign);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to auto-draft campaign');
    } finally {
      setDrafting(false);
    }
  };

  // ────────────────────────────────────────────────────────────
  //  QUICK BROADCAST ACTIONS
  // ────────────────────────────────────────────────────────────

  const handleExecuteQuickBroadcast = async () => {
    if (!broadcastBody) {
      toast.error('Please enter the broadcast message body.');
      return;
    }
    if (broadcastChannel === 'email' && !broadcastSubject) {
      toast.error('Email subject is required.');
      return;
    }

    setBroadcastSending(true);
    try {
      const payload = {
        channel: broadcastChannel,
        target_type: broadcastTarget,
        subject: broadcastSubject,
        body_html: broadcastBody,
        body_text: broadcastBody,
      };

      if (broadcastTarget === 'selected_contacts') {
        payload.contact_ids = selectedContactIds;
      }

      const res = await api.post('/marketing/broadcast', payload);

      if (res.data?.whatsapp_queue?.length > 0) {
        setWaQueue(res.data.whatsapp_queue);
        toast.success(`WhatsApp queue generated for ${res.data.whatsapp_queue.length} contacts!`);
      } else {
        toast.success(res.data?.message || 'Broadcast initiated!');
      }

      setBroadcastBody('');
      setBroadcastSubject('');
      fetchAllData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Broadcast failed');
    } finally {
      setBroadcastSending(false);
    }
  };

  // Filtered Templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      if (tplCategory !== 'all' && t.category !== tplCategory) return false;
      if (tplChannel !== 'all' && t.channel !== tplChannel && t.channel !== 'any') return false;
      if (tplSearch) {
        const q = tplSearch.toLowerCase();
        const matchName = t.name?.toLowerCase().includes(q);
        const matchSub = t.subject?.toLowerCase().includes(q);
        const matchCode = t.template_code?.toLowerCase().includes(q);
        if (!matchName && !matchSub && !matchCode) return false;
      }
      return true;
    });
  }, [templates, tplCategory, tplChannel, tplSearch]);

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1600, margin: '0 auto', fontFamily: 'inherit' }}>
      
      {/* ── 1. Top Executive Banner ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #003768, #0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Megaphone size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#012a4e', margin: 0, letterSpacing: -0.3 }}>
                Residential Marketing &amp; Campaigns
              </h1>
              <p style={{ margin: '3px 0 0 0', color: '#64748b', fontSize: 13.5 }}>
                Multi-channel marketing automation — 20 prebuilt responsive templates, bulk email, bulk SMS, WhatsApp queues &amp; CRM audience delivery.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Button
            variant="outline"
            onClick={() => {
              setCampaignForm({
                name: 'New Custom Campaign',
                channel: 'email',
                campaign_type: 'new_listing',
                template_id: '',
                property_id: '',
                subject: '',
                preheader: '',
                body_html: '',
                body_text: '',
                target_type: 'all_contacts',
                target_filter: {},
              });
              setCampaignModal(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
          >
            <Plus size={16} /> New Campaign
          </Button>

          <Button
            variant="primary"
            onClick={() => setActiveTab('broadcast')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#003768', borderColor: '#003768', color: '#fff', fontWeight: 600 }}
          >
            <Send size={15} /> Quick Broadcast
          </Button>
        </div>
      </div>

      {/* ── 2. KPI Summary Bar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Prebuilt Templates</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#003768', marginTop: 4 }}>{templates.length}</div>
          <div style={{ fontSize: 11.5, color: '#0284c7', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Sparkles size={12} /> 20 Luxury BD / NRB Ready
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Campaigns Dispatched</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#012a4e', marginTop: 4 }}>{campaigns.length}</div>
          <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
            {campaigns.filter(c => c.status === 'completed').length} Completed
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Messages Sent</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{analytics?.total_sent || 0}</div>
          <div style={{ fontSize: 11.5, color: '#16a34a', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={12} /> {analytics?.delivery_rate || '100'}% Delivery Rate
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Channel Reach</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0284c7', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Mail size={13} /> {analytics?.channel_distribution?.email || 0} Email
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#d97706', display: 'flex', alignItems: 'center', gap: 4 }}>
              <MessageSquare size={13} /> {analytics?.channel_distribution?.sms || 0} SMS
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Phone size={13} /> {analytics?.channel_distribution?.whatsapp || 0} WA
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. Primary Navigation Tabs ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: 24, gap: 24 }}>
        {[
          { id: 'templates', label: 'Template Library (20)', icon: FileText },
          { id: 'campaigns', label: 'Campaigns & Performance', icon: BarChart3 },
          { id: 'broadcast', label: 'Bulk Direct Broadcast', icon: Send },
          { id: 'segments', label: 'Audience Segments', icon: Users },
          { id: 'logs', label: 'Outbox & Delivery Logs', icon: Clock },
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 4px',
                border: 'none',
                background: 'transparent',
                borderBottom: active ? '3px solid #003768' : '3px solid transparent',
                color: active ? '#003768' : '#64748b',
                fontWeight: active ? 700 : 500,
                fontSize: 14,
                cursor: 'pointer',
                marginBottom: -1,
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={16} color={active ? '#003768' : '#64748b'} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── 4. Tab 1: Template Library & HTML Builder ── */}
      {activeTab === 'templates' && (
        <div>
          {/* Controls Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
            {/* Category Pills */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setTplCategory(cat.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: 12.5,
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: tplCategory === cat.id ? '#003768' : '#cbd5e1',
                    background: tplCategory === cat.id ? '#003768' : '#fff',
                    color: tplCategory === cat.id ? '#fff' : '#475569',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Channel and Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative', width: 220 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={tplSearch}
                  onChange={(e) => setTplSearch(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px 7px 32px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <select
                value={tplChannel}
                onChange={(e) => setTplChannel(e.target.value)}
                style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}
              >
                {CHANNELS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>

              <Button
                variant="outline"
                onClick={() => handleOpenBuilder({
                  name: 'Custom Template',
                  category: 'general',
                  channel: 'email',
                  subject: 'Special Update from Seventh Sky Property Care',
                  preheader: 'Important real estate announcement for our valued clients.',
                  body_html: `<div style="font-family:Arial,sans-serif;padding:24px;color:#1e293b;">
  <h2 style="color:#003768;">Exclusive Real Estate Update</h2>
  <p>Dear {{name}},</p>
  <p>We are delighted to share our latest opportunities in Dhaka.</p>
</div>`,
                  body_text: 'Dear {{name}}, We are delighted to share our latest opportunities in Dhaka. Contact: {{agent_phone}}',
                  is_system: false,
                })}
                style={{ fontSize: 12.5 }}
              >
                <Plus size={14} /> New Custom Template
              </Button>
            </div>
          </div>

          {/* Templates Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 18 }}>
            {filteredTemplates.map(tpl => (
              <div
                key={tpl.id || tpl.template_code}
                style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  transition: 'box-shadow 0.15s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: 4, letterSpacing: 0.5 }}>
                      {tpl.template_code}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                      {tpl.category?.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#012a4e', margin: '6px 0' }}>
                    {tpl.name}
                  </h3>

                  <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 12px 0', lineHeight: 1.45 }}>
                    <b>Subject:</b> {tpl.subject}
                  </p>

                  {tpl.preheader && (
                    <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 12px 0', fontStyle: 'italic' }}>
                      &ldquo;{tpl.preheader}&rdquo;
                    </p>
                  )}

                  {/* Tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14 }}>
                    {(tpl.tags || []).slice(0, 3).map((tag, idx) => (
                      <span key={idx} style={{ background: '#f1f5f9', color: '#475569', fontSize: 10.5, padding: '2px 6px', borderRadius: 3 }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Actions */}
                <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                  <Button
                    variant="outline"
                    onClick={() => handleOpenBuilder(tpl)}
                    style={{ flex: 1, fontSize: 12.5, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4 }}
                  >
                    <Eye size={13} /> Edit / Preview
                  </Button>

                  <Button
                    variant="primary"
                    onClick={() => handleLaunchCampaignFromTemplate(tpl)}
                    style={{ flex: 1, fontSize: 12.5, background: '#003768', borderColor: '#003768', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4 }}
                  >
                    <Send size={13} /> Launch Campaign
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 5. Tab 2: Campaigns & Performance ── */}
      {activeTab === 'campaigns' && (
        <div>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#012a4e' }}>Campaign History &amp; Dispatch Desk</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Manage marketing campaigns, review auto-drafted listings, and track real-time delivery.</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  variant="outline"
                  onClick={() => setAutoDraftModal(true)}
                  style={{ fontSize: 12.5, borderColor: '#0284c7', color: '#0284c7', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 650 }}
                >
                  <Sparkles size={14} color="#0284c7" /> Auto-Draft for Property
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setCampaignModal(true)}
                  style={{ fontSize: 12.5, background: '#003768', color: '#fff' }}
                >
                  <Plus size={14} /> Create Campaign
                </Button>
              </div>
            </div>

            {campaigns.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
                <Megaphone size={36} style={{ margin: '0 auto 12px auto', color: '#94a3b8' }} />
                <div style={{ fontWeight: 600, fontSize: 15, color: '#334155' }}>No marketing campaigns launched yet</div>
                <p style={{ fontSize: 13, color: '#64748b', maxWidth: 420, margin: '6px auto 16px auto' }}>
                  Choose one of the 20 prebuilt templates or start an ad-hoc broadcast to your contact list.
                </p>
                <Button variant="primary" onClick={() => setActiveTab('templates')} style={{ background: '#003768', color: '#fff' }}>
                  Browse 20 Prebuilt Templates
                </Button>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13.5 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <th style={{ padding: '12px 16px' }}>Campaign</th>
                    <th style={{ padding: '12px 16px' }}>Channel</th>
                    <th style={{ padding: '12px 16px' }}>Target Audience</th>
                    <th style={{ padding: '12px 16px' }}>Recipients</th>
                    <th style={{ padding: '12px 16px' }}>Delivery Progress</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Date</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(c => {
                    const pct = c.recipient_count > 0 ? Math.round((c.delivered_count / c.recipient_count) * 100) : 0;
                    const isAutoDraft = c.campaign_type === 'new_listing' || c.name?.includes('Auto-Draft');
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, color: '#012a4e' }}>{c.name}</span>
                            {isAutoDraft && (
                              <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: 4, padding: '1px 6px', fontWeight: 750, textTransform: 'uppercase' }}>
                                ✦ Auto-Drafted
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11.5, color: '#64748b' }}>{c.campaign_code} {c.subject ? `· ${c.subject}` : ''}</div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textTransform: 'capitalize', fontWeight: 600, fontSize: 12, color: c.channel === 'email' ? '#0284c7' : (c.channel === 'whatsapp' ? '#16a34a' : '#d97706') }}>
                            {c.channel === 'email' && <Mail size={13} />}
                            {c.channel === 'sms' && <MessageSquare size={13} />}
                            {c.channel === 'whatsapp' && <Phone size={13} />}
                            {c.channel}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#475569', textTransform: 'capitalize' }}>
                          {c.target_type?.replace('_', ' ')}
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>
                          {c.recipient_count}
                        </td>
                        <td style={{ padding: '14px 16px', minWidth: 140 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                            <span>{c.delivered_count} delivered</span>
                            <span>{pct}%</span>
                          </div>
                          <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#16a34a' : '#0284c7', transition: 'width 0.3s ease' }} />
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                            background: c.status === 'completed' ? '#dcfce7' : (c.status === 'sending' ? '#e0f2fe' : (c.status === 'draft' ? '#fef3c7' : '#f1f5f9')),
                            color: c.status === 'completed' ? '#15803d' : (c.status === 'sending' ? '#0369a1' : (c.status === 'draft' ? '#b45309' : '#475569')),
                          }}>
                            {c.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 12, color: '#64748b' }}>
                          {new Date(c.created_at).toLocaleDateString('en-GB')}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                            {c.status === 'draft' && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={async () => {
                                  if (window.confirm(`Dispatch campaign "${c.name}" to all recipients now?`)) {
                                    try {
                                      await api.post(`/marketing/campaigns/${c.id}/send`);
                                      toast.success(`Campaign "${c.name}" dispatched!`);
                                      fetchAllData();
                                    } catch (err) {
                                      toast.error(err.response?.data?.error || 'Failed to dispatch');
                                    }
                                  }
                                }}
                                style={{ fontSize: 11.5, background: '#16a34a', borderColor: '#16a34a', color: '#fff', padding: '4px 8px' }}
                              >
                                <Send size={11} /> Launch
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenCampaignDetails(c)}
                              style={{ fontSize: 12 }}
                            >
                              Preview &rarr;
                            </Button>
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
      )}

      {/* ── 6. Tab 3: Bulk Direct Broadcast Desk ── */}
      {activeTab === 'broadcast' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'flex-start' }}>
          {/* Left Compose Box */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#012a4e', margin: '0 0 4px 0' }}>
              Direct Broadcast Dispatcher
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px 0' }}>
              Instantly broadcast personalized marketing messages to contacts, buyers, or sellers.
            </p>

            {/* Channel Selection */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>
                Broadcast Channel
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { id: 'email', label: 'Bulk Email', icon: Mail, color: '#0284c7' },
                  { id: 'sms', label: 'Bulk SMS', icon: MessageSquare, color: '#d97706' },
                  { id: 'whatsapp', label: 'WhatsApp Broadcast', icon: Phone, color: '#16a34a' }
                ].map(ch => {
                  const Icon = ch.icon;
                  const active = broadcastChannel === ch.id;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => setBroadcastChannel(ch.id)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: '12px 14px',
                        borderRadius: 8,
                        border: '2px solid',
                        borderColor: active ? ch.color : '#e2e8f0',
                        background: active ? '#f8fafc' : '#fff',
                        color: active ? ch.color : '#475569',
                        fontWeight: 700,
                        fontSize: 13.5,
                        cursor: 'pointer'
                      }}
                    >
                      <Icon size={16} />
                      {ch.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Audience */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Target Recipients
                </label>
                {selectedContactIds?.length > 0 && (
                  <span style={{ fontSize: 11.5, color: '#0284c7', fontWeight: 600 }}>
                    {selectedContactIds.length} contact{selectedContactIds.length > 1 ? 's' : ''} chosen from Contacts
                  </span>
                )}
              </div>
              <select
                value={broadcastTarget}
                onChange={(e) => setBroadcastTarget(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13.5, background: '#fff' }}
              >
                {selectedContactIds?.length > 0 && (
                  <option value="selected_contacts">
                    Selected Contacts ({selectedContactIds.length} from Contacts list)
                  </option>
                )}
                <option value="all_contacts">All Active Contacts</option>
                <option value="buyers">Qualified Residential Buyers</option>
                <option value="sellers">Property Sellers &amp; Owners</option>
                <option value="nrb_investors">NRB Diaspora Investors</option>
                <option value="leads">All Web &amp; Portal Leads</option>
              </select>
            </div>

            {/* Email Subject (If Email) */}
            {broadcastChannel === 'email' && (
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>
                  Email Subject Line
                </label>
                <input
                  type="text"
                  placeholder="e.g. Exclusive Weekend Viewing: Lakefront Apartment in Dhanmondi"
                  value={broadcastSubject}
                  onChange={(e) => setBroadcastSubject(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13.5 }}
                />
              </div>
            )}

            {/* Message Body */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Message Content (Personalized via Variables)
                </label>
                {broadcastChannel === 'sms' && (
                  <span style={{ fontSize: 11.5, color: broadcastBody.length > 160 ? '#dc2626' : '#64748b' }}>
                    {broadcastBody.length} chars ({Math.ceil(broadcastBody.length / 160) || 1} SMS part)
                  </span>
                )}
              </div>
              <textarea
                rows={8}
                placeholder={broadcastChannel === 'email' ? 'Dear {{name}},\n\nWe have an exclusive new property update...' : 'Dear {{name}}, Seventh Sky has listed a rare property in Gulshan. Explore: {{view_link}} Call: {{agent_phone}}'}
                value={broadcastBody}
                onChange={(e) => setBroadcastBody(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13.5, fontFamily: 'monospace', lineHeight: 1.5 }}
              />
            </div>

            {/* Merge Tag Chips */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Click to insert merge tag:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {MERGE_TAGS.map(t => (
                  <button
                    key={t.tag}
                    onClick={() => setBroadcastBody(prev => prev + ' ' + t.tag)}
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 4, padding: '3px 8px', fontSize: 11.5, color: '#0369a1', cursor: 'pointer', fontFamily: 'monospace' }}
                  >
                    {t.tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Dispatch Button */}
            <Button
              variant="primary"
              disabled={broadcastSending}
              onClick={handleExecuteQuickBroadcast}
              style={{ width: '100%', padding: '12px', background: '#003768', borderColor: '#003768', color: '#fff', fontSize: 15, fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
            >
              {broadcastSending ? <Spinner size={16} /> : <Send size={16} />}
              Launch {broadcastChannel.toUpperCase()} Broadcast
            </Button>
          </div>

          {/* Right Live Device Preview */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#012a4e', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Live Recipient Simulation
            </h3>

            {broadcastChannel === 'whatsapp' ? (
              <div style={{ background: '#e5ddd5', borderRadius: 10, padding: 14, minHeight: 280, position: 'relative' }}>
                <div style={{ background: '#fff', borderRadius: '7px 7px 7px 0', padding: '10px 12px', maxWidth: '85%', fontSize: 13, lineHeight: 1.45, boxShadow: '0 1px 1px rgba(0,0,0,0.1)' }}>
                  <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {(broadcastBody || 'Type your message on the left to see live WhatsApp preview...').replace(/\{\{name\}\}/gi, 'Rahim Uddin')}
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 10, color: '#8696a0', marginTop: 4 }}>
                    11:45 AM &nbsp;✓✓
                  </div>
                </div>
              </div>
            ) : broadcastChannel === 'sms' ? (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, minHeight: 240 }}>
                <div style={{ background: '#0284c7', color: '#fff', borderRadius: '12px 12px 0 12px', padding: '10px 14px', maxWidth: '90%', fontSize: 13, marginLeft: 'auto', lineHeight: 1.45 }}>
                  <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {(broadcastBody || 'Type SMS body to preview...').replace(/\{\{name\}\}/gi, 'Rahim Uddin')}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, minHeight: 240 }}>
                <div style={{ fontSize: 12, color: '#64748b', borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 8 }}>
                  <b>Subject:</b> {broadcastSubject || 'Your Subject'}
                </div>
                <div style={{ fontSize: 13, color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                  {(broadcastBody || 'Type email content...').replace(/\{\{name\}\}/gi, 'Rahim Uddin')}
                </div>
              </div>
            )}

            {/* WhatsApp Web Fast Dispatcher Queue (If active) */}
            {waQueue.length > 0 && (
              <div style={{ marginTop: 20, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Phone size={14} /> WhatsApp Web Fast Queue ({waQueue.length})
                </h4>
                <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {waQueue.map((item, idx) => (
                    <div key={idx} style={{ padding: '8px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{item.phone}</div>
                      </div>
                      {item.whatsapp_url && (
                        <a
                          href={item.whatsapp_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ background: '#16a34a', color: '#fff', padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          Send <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 7. Tab 4: Audience Segments ── */}
      {activeTab === 'segments' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#012a4e', margin: 0 }}>
                Audience Lists &amp; Segmentation
              </h2>
              <p style={{ fontSize: 12.5, color: '#64748b', margin: '2px 0 0 0' }}>
                Pre-filtered lists for targeted property marketing campaigns.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {[
              { name: 'All Active Contacts', desc: 'Every registered contact with active status', count: 'All', icon: Users },
              { name: 'Qualified Residential Buyers', desc: 'Contacts tagged as buyers, investors, or verified clients', count: 'Buyers', icon: Building2 },
              { name: 'Property Sellers & Vendors', desc: 'Owners with sale listings or prospective valuation requests', count: 'Sellers', icon: Tag },
              { name: 'NRB Expatriate Investors', desc: 'Non-Resident Bangladeshis seeking luxury capital assets', count: 'NRB', icon: ShieldCheck },
              { name: 'Active Portal & Web Leads', desc: 'Leads received from online forms, phone enquiries, and ads', count: 'Leads', icon: Sparkles },
            ].map((seg, idx) => {
              const Icon = seg.icon;
              return (
                <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, background: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={15} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#012a4e' }}>{seg.name}</div>
                  </div>
                  <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                    {seg.desc}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setBroadcastTarget(seg.name.toLowerCase().includes('buyer') ? 'buyers' : (seg.name.toLowerCase().includes('seller') ? 'sellers' : 'all_contacts'));
                      setActiveTab('broadcast');
                    }}
                    style={{ width: '100%', fontSize: 12 }}
                  >
                    Broadcast to this Segment &rarr;
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 8. Tab 5: Outbox & Delivery Logs ── */}
      {activeTab === 'logs' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#012a4e', margin: '0 0 12px 0' }}>
            Communication Outbox &amp; Audit Trail
          </h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px 0' }}>
            Real-time delivery verification across email SMTP, SMS gateways, and WhatsApp dispatches.
          </p>
          <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, fontSize: 13, color: '#475569' }}>
            All outbound marketing activities are cryptographically linked to the respective contact dossier and logged under CRM timeline activities.
          </div>
        </div>
      )}

      {/* ── 9. LIVE TEMPLATE BUILDER & HTML EDITOR MODAL ── */}
      {builderModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(3px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div style={{
            background: '#fff', borderRadius: 14, width: '100%', maxWidth: 1280, height: '90vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: 4 }}>
                  {builderModal.template_code}
                </span>
                <span style={{ fontSize: 17, fontWeight: 800, color: '#012a4e' }}>
                  {builderModal.name}
                </span>
              </div>

              {/* Center Device Switcher */}
              <div style={{ display: 'flex', alignItems: 'center', background: '#e2e8f0', borderRadius: 8, padding: 2 }}>
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 6,
                    border: 'none', background: previewDevice === 'desktop' ? '#fff' : 'transparent',
                    color: previewDevice === 'desktop' ? '#003768' : '#64748b', fontWeight: 600, fontSize: 12, cursor: 'pointer'
                  }}
                >
                  <Monitor size={14} /> Desktop
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 6,
                    border: 'none', background: previewDevice === 'mobile' ? '#fff' : 'transparent',
                    color: previewDevice === 'mobile' ? '#003768' : '#64748b', fontWeight: 600, fontSize: 12, cursor: 'pointer'
                  }}
                >
                  <Smartphone size={14} /> Mobile
                </button>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setBuilderModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: Left Editor + Right Device Preview */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>
              
              {/* Left Column: Form & Code Editor */}
              <div style={{ padding: 24, overflowY: 'auto', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, textTransform: 'uppercase' }}>
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={builderModal.temp_subject}
                    onChange={(e) => setBuilderModal(prev => ({ ...prev, temp_subject: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, textTransform: 'uppercase' }}>
                    Preheader Text (Inbox preview line)
                  </label>
                  <input
                    type="text"
                    value={builderModal.temp_preheader}
                    onChange={(e) => setBuilderModal(prev => ({ ...prev, temp_preheader: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5 }}
                  />
                </div>

                {/* Merge Tags Insertion Bar */}
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>
                    Click variable to insert into template:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {MERGE_TAGS.map(t => (
                      <button
                        key={t.tag}
                        onClick={() => handleInsertTag(t.tag)}
                        style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 4, padding: '2px 7px', fontSize: 11, color: '#0369a1', cursor: 'pointer', fontFamily: 'monospace' }}
                      >
                        {t.tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* HTML Source Code */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, textTransform: 'uppercase' }}>
                    Responsive HTML Code Editor
                  </label>
                  <textarea
                    value={builderModal.temp_body_html}
                    onChange={(e) => setBuilderModal(prev => ({ ...prev, temp_body_html: e.target.value }))}
                    style={{
                      width: '100%', flex: 1, minHeight: 280, padding: 12, borderRadius: 6,
                      border: '1px solid #cbd5e1', fontFamily: 'Consolas, monospace', fontSize: 12,
                      lineHeight: 1.45, background: '#0f172a', color: '#f8fafc', tabSize: 2
                    }}
                  />
                </div>

                {/* Plain Text / SMS Equivalent */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, textTransform: 'uppercase' }}>
                    SMS / Plain Text Fallback Copy
                  </label>
                  <textarea
                    rows={3}
                    value={builderModal.temp_body_text}
                    onChange={(e) => setBuilderModal(prev => ({ ...prev, temp_body_text: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                  />
                </div>
              </div>

              {/* Right Column: Real-time Device Viewport */}
              <div style={{ background: '#e2e8f0', padding: 24, overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
                <div style={{
                  width: previewDevice === 'mobile' ? 375 : '100%',
                  maxWidth: previewDevice === 'mobile' ? 375 : 620,
                  background: '#fff',
                  borderRadius: previewDevice === 'mobile' ? 24 : 8,
                  border: previewDevice === 'mobile' ? '8px solid #334155' : '1px solid #cbd5e1',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  overflow: 'hidden',
                  height: 'fit-content'
                }}>
                  {/* Fake Device Top Bar for Mobile */}
                  {previewDevice === 'mobile' && (
                    <div style={{ background: '#334155', height: 20, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <div style={{ width: 40, height: 4, background: '#64748b', borderRadius: 2 }} />
                    </div>
                  )}

                  {/* Rendered HTML */}
                  <div
                    dangerouslySetInnerHTML={{
                      __html: (builderModal.temp_body_html || '')
                        .replace(/\{\{name\}\}/gi, 'Farhan Ahmed')
                        .replace(/\{\{property_title\}\}/gi, 'The Sky Residence · Road 71, Gulshan 2')
                        .replace(/\{\{agent_name\}\}/gi, user?.name || 'Farhan Rahman')
                        .replace(/\{\{agent_phone\}\}/gi, '+880 1711-223344')
                        .replace(/\{\{agent_email\}\}/gi, 'sales@seventhskyproperty.com')
                        .replace(/\{\{view_link\}\}/gi, '#')
                    }}
                  />
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {/* Test Dispatch Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Test Dispatch To:</span>
                <input
                  type="text"
                  placeholder="Email or phone..."
                  value={testSendDest}
                  onChange={(e) => setTestSendDest(e.target.value)}
                  style={{ width: 220, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                />
                <Button
                  variant="outline"
                  disabled={testSending}
                  onClick={handleTestSend}
                  style={{ fontSize: 12 }}
                >
                  {testSending ? <Spinner size={12} /> : <Send size={12} />} Send Test
                </Button>
              </div>

              {/* Main Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="outline" onClick={() => setBuilderModal(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveTemplate}
                  style={{ background: '#003768', color: '#fff' }}
                >
                  Save Template Changes
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── 10. CAMPAIGN CREATION WIZARD MODAL ── */}
      {campaignModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(3px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div style={{
            background: '#fff', borderRadius: 14, width: '100%', maxWidth: 720, maxHeight: '90vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 17, color: '#012a4e' }}>Create Marketing Campaign</div>
              <button onClick={() => setCampaignModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, textTransform: 'uppercase' }}>Campaign Name</label>
                <input
                  type="text"
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Gulshan Penthouse VIP Broadcast"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, textTransform: 'uppercase' }}>Channel</label>
                  <select
                    value={campaignForm.channel}
                    onChange={(e) => setCampaignForm(p => ({ ...p, channel: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5, background: '#fff' }}
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="multi_channel">Multi-Channel (Email + SMS)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, textTransform: 'uppercase' }}>Target Audience</label>
                  <select
                    value={campaignForm.target_type}
                    onChange={(e) => setCampaignForm(p => ({ ...p, target_type: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5, background: '#fff' }}
                  >
                    <option value="all_contacts">All Active Contacts</option>
                    <option value="buyers">Qualified Buyers</option>
                    <option value="sellers">Property Sellers &amp; Owners</option>
                    <option value="nrb_investors">NRB Expatriate Investors</option>
                    <option value="leads">Web &amp; Enquiry Leads</option>
                  </select>
                </div>
              </div>

              {/* Audience Count Callout */}
              <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 12.5, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={15} />
                <b>Estimated Audience Reach:</b> {campaignAudience.reachable} verified recipients reachable via {campaignForm.channel}.
              </div>

              {/* Template Selector */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, textTransform: 'uppercase' }}>Use Template (Optional)</label>
                <select
                  value={campaignForm.template_id}
                  onChange={(e) => {
                    const tpl = templates.find(t => String(t.id) === e.target.value);
                    if (tpl) {
                      setCampaignForm(p => ({
                        ...p,
                        template_id: tpl.id,
                        subject: tpl.subject || p.subject,
                        preheader: tpl.preheader || p.preheader,
                        body_html: tpl.body_html || p.body_html,
                        body_text: tpl.body_text || p.body_text
                      }));
                    } else {
                      setCampaignForm(p => ({ ...p, template_id: '' }));
                    }
                  }}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5, background: '#fff' }}
                >
                  <option value="">-- Start from blank message --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.template_code} · {t.name}</option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, textTransform: 'uppercase' }}>Subject Line</label>
                <input
                  type="text"
                  value={campaignForm.subject}
                  onChange={(e) => setCampaignForm(p => ({ ...p, subject: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5 }}
                />
              </div>

              {/* Message Body */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, textTransform: 'uppercase' }}>Message Body</label>
                <textarea
                  rows={6}
                  value={campaignForm.body_html || campaignForm.body_text}
                  onChange={(e) => setCampaignForm(p => ({ ...p, body_html: e.target.value, body_text: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>
            </div>

            <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="outline" onClick={() => setCampaignModal(false)}>Cancel</Button>
              <Button
                variant="outline"
                disabled={campaignSaving}
                onClick={() => handleSaveAndSendCampaign(false)}
              >
                Save as Draft
              </Button>
              <Button
                variant="primary"
                disabled={campaignSaving}
                onClick={() => handleSaveAndSendCampaign(true)}
                style={{ background: '#003768', color: '#fff' }}
              >
                {campaignSaving ? <Spinner size={14} /> : <Send size={14} />} Dispatch Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── 11. CAMPAIGN DETAILS DRAWER ── */}
      {campaignDrawer && (
        <Drawer
          isOpen={!!campaignDrawer}
          onClose={() => setCampaignDrawer(null)}
          title={`Campaign: ${campaignDrawer.campaign_code}`}
        >
          <div style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: '#012a4e', margin: '0 0 4px 0' }}>
                  {campaignDrawer.name}
                </h3>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Channel: <b style={{ textTransform: 'uppercase' }}>{campaignDrawer.channel}</b> &nbsp;|&nbsp; Target: <b style={{ textTransform: 'capitalize' }}>{campaignDrawer.target_type?.replace('_', ' ')}</b>
                </div>
              </div>
              <span style={{
                padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                background: campaignDrawer.status === 'completed' ? '#dcfce7' : (campaignDrawer.status === 'sending' ? '#e0f2fe' : (campaignDrawer.status === 'draft' ? '#fef3c7' : '#f1f5f9')),
                color: campaignDrawer.status === 'completed' ? '#15803d' : (campaignDrawer.status === 'sending' ? '#0369a1' : (campaignDrawer.status === 'draft' ? '#b45309' : '#475569')),
              }}>
                {campaignDrawer.status}
              </span>
            </div>

            {campaignDrawer.status === 'draft' && (
              <Button
                variant="primary"
                onClick={async () => {
                  if (window.confirm(`Dispatch campaign "${campaignDrawer.name}" to all ${campaignDrawer.recipient_count} recipients now?`)) {
                    try {
                      await api.post(`/marketing/campaigns/${campaignDrawer.id}/send`);
                      toast.success(`Campaign "${campaignDrawer.name}" dispatched!`);
                      setCampaignDrawer(null);
                      fetchAllData();
                    } catch (err) {
                      toast.error(err.response?.data?.error || 'Failed to dispatch');
                    }
                  }
                }}
                style={{ background: '#16a34a', borderColor: '#16a34a', color: '#fff', width: '100%', marginBottom: 16, fontWeight: 750, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, padding: '10px' }}
              >
                <Send size={14} /> Launch Campaign ({campaignDrawer.recipient_count} Recipients)
              </Button>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>TOTAL AUDIENCE</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#003768' }}>{campaignDrawer.recipient_count}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>DELIVERED</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#16a34a' }}>{campaignDrawer.delivered_count || 0}</div>
              </div>
            </div>

            {/* Email Template Preview Box */}
            {campaignDrawer.body_html && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', margin: 0 }}>
                    Campaign Email Template Preview
                  </h4>
                  <span style={{ fontSize: 11, color: '#0284c7', fontWeight: 600 }}>Luxury Responsive Layout</span>
                </div>
                <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, overflow: 'hidden', height: 280, background: '#f1f5f9' }}>
                  <iframe
                    title="Email Preview"
                    srcDoc={campaignDrawer.body_html}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                </div>
              </div>
            )}

            <h4 style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', margin: '0 0 8px 0' }}>
              Target Recipient List ({campaignDetailRecipients.length})
            </h4>

            {drawerLoading ? (
              <div style={{ padding: 20, textAlign: 'center' }}><Spinner /></div>
            ) : campaignDetailRecipients.length === 0 ? (
              <div style={{ padding: 14, background: '#f8fafc', borderRadius: 6, fontSize: 12.5, color: '#64748b', textAlign: 'center' }}>
                Recipients will be materialised and queued upon campaign launch.
              </div>
            ) : (
              <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {campaignDetailRecipients.map(r => (
                  <div key={r.id} style={{ padding: '8px 10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{r.recipient_name || 'Client'}</div>
                      <div style={{ color: '#64748b', fontSize: 11 }}>{r.recipient_destination}</div>
                    </div>
                    <span style={{
                      padding: '2px 6px', borderRadius: 4, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
                      background: r.status === 'delivered' ? '#dcfce7' : (r.status === 'queued' ? '#e0f2fe' : '#f1f5f9'),
                      color: r.status === 'delivered' ? '#15803d' : (r.status === 'queued' ? '#0369a1' : '#475569')
                    }}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Drawer>
      )}

      {/* ── 12. AUTO-DRAFT FOR PROPERTY MODAL ── */}
      {autoDraftModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(3px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div style={{
            background: '#fff', borderRadius: 14, width: '100%', maxWidth: 540,
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)', overflow: 'hidden'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: '#012a4e' }}>Auto-Draft Listing Campaign</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Generate luxury responsive showcase email for any listed property</div>
                </div>
              </div>
              <button onClick={() => setAutoDraftModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>
                  Select Property Listing
                </label>
                <select
                  value={selectedPropId}
                  onChange={(e) => setSelectedPropId(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13.5, background: '#fff' }}
                >
                  <option value="">-- Choose an active property listing --</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.property_code || `#${p.id}`} · {p.title} ({p.area || 'Dhaka'}) — {p.listing_type === 'sale' ? 'Sale' : 'Rent'}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12.5, color: '#475569', lineHeight: 1.5 }}>
                <p style={{ margin: 0 }}>
                  ✨ <b>What gets generated:</b> A luxury HTML showcase with Seventh Sky branding, hero property photography, architectural spec pills, price banner, customized highlights, and direct inspection booking buttons.
                </p>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={forceRegen}
                  onChange={(e) => setForceRegen(e.target.checked)}
                />
                <span>Force re-generate fresh template even if a draft exists</span>
              </label>
            </div>

            <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="outline" onClick={() => setAutoDraftModal(false)}>Cancel</Button>
              <Button
                variant="primary"
                disabled={drafting || !selectedPropId}
                onClick={handleAutoDraftForProperty}
                style={{ background: '#003768', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {drafting ? <Spinner size={14} /> : <Sparkles size={14} />} Draft Campaign Now
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
