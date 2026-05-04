import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Users, Target, Activity, Megaphone, BarChart2, Trophy, Globe, Hourglass, XCircle, CheckCircle, DollarSign, TrendingUp } from 'lucide-react';
import api from '../services/api';
import PipelineTab from '../components/crm/PipelineTab';
import ContactsTab from '../components/crm/ContactsTab';
import OpportunitiesTab from '../components/crm/OpportunitiesTab';
import ActivitiesTab from '../components/crm/ActivitiesTab';
import CampaignsTab from '../components/crm/CampaignsTab';
import AnalyticsTab from '../components/crm/AnalyticsTab';
import '../styles/GlobalStyles.css';

const TABS = [
  { id: 'pipeline', label: 'Pipeline', icon: <Target size={16} /> },
  { id: 'contacts', label: 'Contacts', icon: <Users size={16} /> },
  { id: 'deals', label: 'Deals', icon: <Trophy size={16} /> },
  { id: 'activities', label: 'Activities', icon: <Activity size={16} /> },
  { id: 'campaigns', label: 'Campaigns', icon: <Megaphone size={16} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={16} /> },
];

const CRMHub = () => {
  const [activeTab, setActiveTab] = useState('pipeline');
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [activities, setActivities] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [courses, setCourses] = useState([]);
  const [analytics, setAnalytics] = useState({ funnel: null, source: [], forecast: null, successResults: [], destinationCountries: [] });

  const fetchAll = useCallback(async () => {
    try {
      const [lRes, cRes, oRes, aRes, camRes, crRes, fRes, sRes, fcRes, srRes, dcRes] = await Promise.all([
        api.get('/crm/leads').catch(() => ({ data: [] })),
        api.get('/crm/contacts').catch(() => ({ data: [] })),
        api.get('/crm/opportunities').catch(() => ({ data: [] })),
        api.get('/crm/activities').catch(() => ({ data: [] })),
        api.get('/crm/campaigns').catch(() => ({ data: [] })),
        api.get('/crm/courses').catch(() => ({ data: [] })),
        api.get('/crm/analytics/funnel').catch(() => ({ data: null })),
        api.get('/crm/analytics/source').catch(() => ({ data: [] })),
        api.get('/crm/analytics/forecast').catch(() => ({ data: null })),
        api.get('/crm/analytics/success-results').catch(() => ({ data: [] })),
        api.get('/crm/analytics/destination-countries').catch(() => ({ data: [] })),
      ]);
      setLeads(lRes.data); setContacts(cRes.data); setOpportunities(oRes.data);
      setActivities(aRes.data); setCampaigns(camRes.data); setCourses(crRes.data);
      setAnalytics({ funnel: fRes.data, source: sRes.data, forecast: fcRes.data, successResults: srRes.data, destinationCountries: dcRes.data });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const totalPipeline = opportunities.filter(o => !['won','lost'].includes(o.stage)).reduce((s,o) => s + parseFloat(o.value||0), 0);
  const overdueAct = activities.filter(a => !a.is_done && a.due_date && new Date(a.due_date) < new Date()).length;
  const newCount = leads.filter(l => l.status === 'new').length;
  const pendingFees = leads.filter(l => l.status === 'fees_pending').length;
  const rejectedPayments = leads.filter(l => l.status === 'payment_rejected').length;
  const successCount = leads.filter(l => l.status === 'successful').length;
  const successRevenue = leads.filter(l => l.status === 'successful').reduce((s,l) => s + parseFloat(l.deal_value||0), 0);
  const openDeals = opportunities.filter(o => !['won','lost'].includes(o.stage)).length;
  const draftCampaigns = campaigns.filter(c => c.status === 'draft').length;

  if (loading) return (
    <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={48} className="animate-spin" color="var(--primary)" />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '0.3rem' }}>
            CRM <span style={{ fontSize: '0.7rem', fontWeight: '600', background: 'linear-gradient(135deg, var(--primary), #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginLeft: '0.5rem' }}>SALESFORCE ENGINE</span>
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Manage leads, deals, and revenue in one place</p>
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', background: 'var(--glass)', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Globe size={13} color="#10b981" /> Website Auto-Sync Active
        </div>
      </div>

      {/* KPI Strip — always visible */}
      <div className="pulse-grid pg-6" style={{ marginTop: 0 }}>
        {[
          { label: 'PIPELINE', value: `৳${totalPipeline.toLocaleString()}`, c: 'c-cyan', icon: <TrendingUp size={26} /> },
          { label: 'OPEN DEALS', value: openDeals, c: 'c-violet', icon: <Trophy size={26} /> },
          { label: 'CONTACTS', value: contacts.length, c: 'c-mint', icon: <Users size={26} /> },
          { label: 'NEW LEADS', value: newCount, c: 'c-cyan', icon: <Target size={26} /> },
          { label: 'PENDING FEES', value: pendingFees, c: 'c-amber', icon: <Hourglass size={26} /> },
          { label: 'REVENUE', value: `৳${successRevenue.toLocaleString()}`, c: 'c-violet', icon: <DollarSign size={26} /> },
        ].map(k => (
          <div key={k.label} className={`pulse-card ${k.c}`} style={{ padding: '16px 18px', minHeight: '96px' }}>
            <div className="pc-icon" style={{ top: '16px', right: '18px', opacity: 0.13 }}>{k.icon}</div>
            <p className="pc-label" style={{ fontSize: '0.62rem' }}>{k.label}</p>
            <h3 className="pc-value" style={{ fontSize: '1.55rem' }}>{k.value}</h3>
          </div>
        ))}
      </div>

      {/* Unified Tab Bar — scrollable on mobile */}
      <div style={{ display: 'flex', gap: '0.3rem', background: 'var(--glass)', padding: '0.35rem', borderRadius: '12px', maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', border: '1px solid var(--border)', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {TABS.map(tab => {
          const badge = tab.id === 'pipeline' && (pendingFees + rejectedPayments) > 0 ? { val: pendingFees + rejectedPayments, bg: '#f59e0b', fg: '#000' }
            : tab.id === 'activities' && overdueAct > 0 ? { val: overdueAct, bg: '#ef4444', fg: '#fff' }
            : tab.id === 'contacts' && contacts.length > 0 ? { val: contacts.length, bg: 'var(--border)', fg: 'var(--text-dim)' }
            : tab.id === 'deals' && openDeals > 0 ? { val: openDeals, bg: 'var(--border)', fg: 'var(--text-dim)' }
            : tab.id === 'campaigns' && draftCampaigns > 0 ? { val: draftCampaigns, bg: 'var(--border)', fg: 'var(--text-dim)' }
            : null;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem', border: 'none',
              borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600',
              background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
              color: activeTab === tab.id ? '#000' : 'var(--text-dim)',
              transition: 'all 0.2s ease', flexShrink: 0, whiteSpace: 'nowrap'
            }}>
              {tab.icon} {tab.label}
              {badge && <span style={{ background: badge.bg, color: badge.fg, borderRadius: '8px', padding: '1px 5px', fontSize: '0.55rem', fontWeight: '800', lineHeight: '1.4' }}>{badge.val}</span>}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'pipeline' && <PipelineTab leads={leads} courses={courses} onRefresh={fetchAll} />}
      {activeTab === 'contacts' && <ContactsTab contacts={contacts} onRefresh={fetchAll} />}
      {activeTab === 'deals' && <OpportunitiesTab opportunities={opportunities} onRefresh={fetchAll} />}
      {activeTab === 'activities' && <ActivitiesTab activities={activities} onRefresh={fetchAll} />}
      {activeTab === 'campaigns' && <CampaignsTab campaigns={campaigns} onRefresh={fetchAll} />}
      {activeTab === 'analytics' && <AnalyticsTab analytics={analytics} />}
    </div>
  );
};

export default CRMHub;
