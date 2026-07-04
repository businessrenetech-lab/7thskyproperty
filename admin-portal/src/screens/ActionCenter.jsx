import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Wallet, CalendarClock, KeyRound, FileWarning, ShieldAlert,
  Wrench, Mail, Building2, UserCheck, Landmark, RefreshCw, ArrowRight,
} from 'lucide-react';
import api from '../services/api';
import { Badge, Spinner, Button } from '../ui/kit';

const money = (v) => '৳' + Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

// Cohort definition drives every card — no per-card component boilerplate.
// { key, title, tone, icon, group, rowLabel, rowSub, navTo }
const COHORTS = [
  { key: 'overdue_rent',                 title: 'Overdue Rent',                tone: 'red',   group: 'urgent',   icon: Wallet,       navTo: '/property-management',
    rowLabel: (r) => r.tenant_name || r.property_title, rowSub: (r) => `${r.days_overdue}d late · ${money(r.outstanding)} · ${r.period_label}` },
  { key: 'work_orders_overdue',          title: 'Work Orders Overdue',         tone: 'red',   group: 'urgent',   icon: Wrench,       navTo: '/work-orders',
    rowLabel: (r) => r.title, rowSub: (r) => `${r.property_title} · ${r.days_overdue}d late` },
  { key: 'applications_awaiting_owner',  title: 'Awaiting Owner Approval',     tone: 'amber', group: 'urgent',   icon: UserCheck,    navTo: '/property-management/applications',
    rowLabel: (r) => r.applicant_name, rowSub: (r) => `${r.property_title || '—'} · ${r.recommendation || 'pending'}` },
  { key: 'statements_not_sent',          title: 'Statements Not Sent',         tone: 'amber', group: 'urgent',   icon: Mail,         navTo: '/property-management/statements?status=ready',
    rowLabel: (r) => `${r.property_title} · ${r.period}`, rowSub: (r) => money(r.net_disbursement) },

  { key: 'rent_due_7d',                  title: 'Rent Due · Next 7 Days',      tone: 'blue',  group: 'upcoming', icon: CalendarClock, navTo: '/property-management',
    rowLabel: (r) => r.tenant_name || r.property_title, rowSub: (r) => `Due ${r.due_date} · ${money(r.rent_due)}` },
  { key: 'leases_expiring_30d',          title: 'Leases Expiring · 30d',       tone: 'amber', group: 'upcoming', icon: KeyRound,      navTo: '/property-management/rentals',
    rowLabel: (r) => r.tenant_name || r.property_title, rowSub: (r) => `${r.property_title} · ${r.days_remaining}d left` },
  { key: 'leases_expiring_60d',          title: 'Leases Expiring · 60d',       tone: 'blue',  group: 'upcoming', icon: KeyRound,      navTo: '/property-management/rentals',
    rowLabel: (r) => r.tenant_name || r.property_title, rowSub: (r) => `${r.property_title} · ${r.days_remaining}d left` },
  { key: 'leases_expiring_90d',          title: 'Leases Expiring · 90d',       tone: 'grey',  group: 'upcoming', icon: KeyRound,      navTo: '/property-management/rentals',
    rowLabel: (r) => r.tenant_name || r.property_title, rowSub: (r) => `${r.property_title} · ${r.days_remaining}d left` },

  { key: 'applications_awaiting_docs',   title: 'Applications · Missing Docs', tone: 'amber', group: 'pipeline', icon: FileWarning,  navTo: '/property-management/applications',
    rowLabel: (r) => r.applicant_name, rowSub: (r) => r.property_title || '—' },
  { key: 'properties_blocked_marketing', title: 'Blocked From Marketing',      tone: 'amber', group: 'pipeline', icon: Building2,    navTo: '/property-management/assessments',
    rowLabel: (r) => r.title, rowSub: (r) => `${r.property_code} · ${(r.rental_readiness_status || 'not_ready').replace(/_/g, ' ')}` },

  { key: 'kyc_incomplete',               title: 'Owner KYC Incomplete',        tone: 'red',   group: 'setup',    icon: ShieldAlert,   navTo: '/property-management/rentals',
    rowLabel: (r) => r.title, rowSub: (r) => `${r.owner_name || 'No owner linked'}` },
  { key: 'missing_agreement',            title: 'No Signed Agreement',         tone: 'red',   group: 'setup',    icon: FileWarning,   navTo: '/property-management/rentals',
    rowLabel: (r) => r.title, rowSub: (r) => `${r.owner_name || 'No owner'} · ${r.agreement_status || 'not_started'}` },
  { key: 'missing_bank',                 title: 'Owner Bank Missing',          tone: 'amber', group: 'setup',    icon: Landmark,      navTo: '/property-management/rentals',
    rowLabel: (r) => r.title, rowSub: (r) => r.owner_name || 'No owner' },
  { key: 'missing_access',               title: 'Access Contact Missing',      tone: 'amber', group: 'setup',    icon: KeyRound,      navTo: '/property-management/rentals',
    rowLabel: (r) => r.title, rowSub: (r) => (r.pm_status || '').replace(/_/g, ' ') },
];

const GROUPS = [
  { key: 'urgent',   title: 'Act Today',        tone: 'red' },
  { key: 'upcoming', title: 'Coming Up',        tone: 'blue' },
  { key: 'pipeline', title: 'Pipeline Blockers', tone: 'amber' },
  { key: 'setup',    title: 'Setup Gaps',       tone: 'grey' },
];

export default function ActionCenter() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const nav = useNavigate();

  const load = useCallback(async () => {
    try {
      const { data: r } = await api.get('/property-management/action-center');
      setData(r);
    } catch (e) { /* silent — dashboard still usable */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="card" style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>;
  if (!data) return null;

  const h = data.headline;
  const c = data.cohorts;

  return (
    <div className="card" style={{ marginBottom: 20, overflow: 'hidden' }}>
      {/* Headline strip */}
      <div style={{ display: 'flex', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} color="var(--danger)" /> Rental Action Center
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>What needs your attention right now — live from operations.</div>
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Metric label="Open actions" value={h.open_action_count} tone={h.open_action_count > 0 ? 'red' : 'green'} />
          <Metric label="Setup blockers" value={h.setup_blocker_count} tone={h.setup_blocker_count > 0 ? 'amber' : 'green'} />
          <Metric label="Overdue rent" value={money(h.overdue_rent_amount)} tone={h.overdue_rent_amount > 0 ? 'red' : 'green'} />
          <Metric label="Expiring soon" value={h.expiring_all_count} tone={h.expiring_all_count > 0 ? 'amber' : 'green'} />
          <button className="btn btn-ghost btn-icon btn-sm" title="Refresh" onClick={() => { setRefreshing(true); load(); }}>
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Grouped cohort cards */}
      <div style={{ padding: 14 }}>
        {GROUPS.map((g) => {
          const cards = COHORTS.filter((k) => k.group === g.key).filter((k) => (c[k.key]?.count || 0) > 0);
          if (!cards.length) return null;
          return (
            <div key={g.key} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 4px 8px' }}>
                <div style={{ width: 3, height: 14, background: `var(--${g.tone === 'grey' ? 'muted-2' : g.tone === 'red' ? 'danger' : g.tone === 'amber' ? 'warning' : 'primary'})`, borderRadius: 2 }} />
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--muted)' }}>{g.title}</span>
                <span style={{ fontSize: 11, color: 'var(--muted-2)' }}>{cards.length} card{cards.length === 1 ? '' : 's'}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
                {cards.map((k) => <CohortCard key={k.key} def={k} cohort={c[k.key]} onNav={() => nav(k.navTo)} />)}
              </div>
            </div>
          );
        })}
        {!COHORTS.some((k) => (c[k.key]?.count || 0) > 0) && (
          <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--muted)' }}>
            All clear — no outstanding actions. Excellent operational hygiene.
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, tone }) {
  const color = { red: 'var(--danger)', amber: 'var(--warning)', green: 'var(--success)', blue: 'var(--primary)' }[tone] || 'var(--text)';
  return (
    <div style={{ minWidth: 90 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 3, fontWeight: 700 }}>{label}</div>
    </div>
  );
}

function CohortCard({ def, cohort, onNav }) {
  const Icon = def.icon;
  const border = { red: 'var(--danger)', amber: 'var(--warning)', blue: 'var(--primary)', green: 'var(--success)', grey: 'var(--border-strong)' }[def.tone] || 'var(--border)';
  return (
    <div style={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderLeft: `3px solid ${border}`, borderRadius: 8, padding: 12, cursor: 'pointer' }} onClick={onNav}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={15} style={{ color: border }} />
          <span style={{ fontWeight: 700, fontSize: 13 }}>{def.title}</span>
        </div>
        <Badge tone={def.tone}>{cohort.count}</Badge>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {cohort.top.slice(0, 3).map((r, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', padding: '4px 0', borderTop: i > 0 ? '1px dashed var(--border)' : 'none' }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{def.rowLabel(r) || '—'}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{def.rowSub(r) || ''}</span>
          </div>
        ))}
        {cohort.count > 3 && (
          <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
            View all {cohort.count} <ArrowRight size={11} />
          </div>
        )}
      </div>
    </div>
  );
}
