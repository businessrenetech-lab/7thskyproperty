import React from 'react';
import {
  ArrowRight, AlertTriangle, Wallet, CalendarClock, KeyRound,
  ShieldAlert, TrendingUp, Home, Users, Wrench, ClipboardCheck,
} from 'lucide-react';
import { Button, Badge } from '../ui/kit';

const money = (v) => '৳' + Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

// Lifecycle chip metadata: colour + human label + short subtitle.
const LIFECYCLE = {
  onboarding:  { label: 'Onboarding',      tone: 'blue',  icon: ShieldAlert,    sub: 'Owner setup in progress' },
  assessment:  { label: 'Assessment',      tone: 'amber', icon: ClipboardCheck, sub: 'Readiness being scored' },
  marketing:   { label: 'Marketing',       tone: 'blue',  icon: TrendingUp,     sub: 'Listed / seeking tenants' },
  application: { label: 'Application',     tone: 'amber', icon: Users,          sub: 'Reviewing tenant applications' },
  tenanted:    { label: 'Tenanted',        tone: 'green', icon: Home,           sub: 'Active tenancy · rent cycle' },
  renewal:     { label: 'Renewal Window',  tone: 'amber', icon: CalendarClock,  sub: 'Lease ending soon' },
  vacating:    { label: 'Vacating',        tone: 'amber', icon: KeyRound,       sub: 'Exit inspection & bond' },
  closed:      { label: 'Closed',          tone: 'grey',  icon: KeyRound,       sub: 'Archived — no active work' },
};

const SEVERITY_TONE = { high: 'red', medium: 'amber', low: 'grey' };

/** Lifecycle chip — a small pill showing the state + short subtitle. */
export function LifecycleChip({ state }) {
  const meta = LIFECYCLE[state] || LIFECYCLE.onboarding;
  const Icon = meta.icon;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: 999, background: `var(--${meta.tone === 'grey' ? 'surface-2' : meta.tone + '-bg'})`, border: `1px solid var(--${meta.tone === 'grey' ? 'border' : meta.tone})` }}>
      <Icon size={13} color={meta.tone === 'grey' ? 'var(--muted)' : `var(--${meta.tone})`} />
      <span style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4, color: meta.tone === 'grey' ? 'var(--muted)' : `var(--${meta.tone})` }}>{meta.label}</span>
      <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>· {meta.sub}</span>
    </div>
  );
}

/** Financial strip — key numbers the manager needs at a glance. */
export function FinancialStrip({ state, financial }) {
  const items = [
    { label: 'Owner balance', value: money(financial.owner_balance), tone: financial.owner_balance >= 0 ? 'green' : 'red' },
    { label: 'Tenant balance', value: money(financial.tenant_balance), tone: financial.tenant_balance > 0 ? 'red' : 'green' },
    { label: 'Rent due', value: financial.next_rent_due ? money(financial.next_rent_due.outstanding) + ' · ' + financial.next_rent_due.due_date : '—', tone: financial.next_rent_due ? 'amber' : 'grey' },
    { label: 'Lease ends', value: financial.lease_end ? `${financial.days_until_lease_end}d (${financial.lease_end})` : '—', tone: financial.days_until_lease_end != null && financial.days_until_lease_end < 90 ? 'amber' : 'grey' },
    { label: 'Readiness', value: `${financial.readiness_pct}%`, tone: financial.readiness_pct === 100 ? 'green' : financial.readiness_pct >= 50 ? 'amber' : 'red' },
    { label: 'Approved rent', value: financial.approved_monthly_rent ? money(financial.approved_monthly_rent) : '—', tone: financial.approved_monthly_rent ? 'blue' : 'red' },
  ];
  return (
    <div className="card" style={{ background: 'var(--surface-2)', padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 0 }}>
        {items.map((it, i) => (
          <div key={it.label} style={{ padding: '12px 16px', borderLeft: i === 0 ? 'none' : '1px solid var(--border)' }}>
            <div style={{ fontSize: 10.5, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700, letterSpacing: 0.3 }}>{it.label}</div>
            <div style={{ fontSize: 15, fontWeight: 800, marginTop: 3, color: `var(--${it.tone === 'grey' ? 'text' : it.tone})` }}>{it.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Next-action banner — one primary CTA. */
export function NextActionBanner({ nextAction, onCta }) {
  if (!nextAction) return null;
  const tone = nextAction.tone || 'blue';
  const bgMap = { red: 'var(--danger-bg)', amber: 'var(--warning-bg)', green: 'var(--success-bg)', blue: 'var(--primary-50)', grey: 'var(--surface-2)' };
  const fgMap = { red: 'var(--danger)', amber: 'var(--warning)', green: 'var(--success)', blue: 'var(--primary)', grey: 'var(--muted)' };
  return (
    <div style={{ background: bgMap[tone], border: `1px solid ${fgMap[tone]}`, borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: fgMap[tone], color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <ArrowRight size={18} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 700, color: fgMap[tone] }}>Next action</div>
        <div style={{ fontSize: 15, fontWeight: 700, marginTop: 1 }}>{nextAction.title}</div>
      </div>
      {onCta && (
        <Button onClick={() => onCta(nextAction.tab)} style={{ background: fgMap[tone], borderColor: fgMap[tone], color: '#fff' }}>
          {nextAction.cta}
        </Button>
      )}
    </div>
  );
}

/** Blockers strip — compact chips shown above the tabs. */
export function BlockersStrip({ blockers, onFix }) {
  if (!blockers?.length) return null;
  return (
    <div className="card" style={{ padding: '10px 14px', background: 'var(--warning-bg)', border: '1px solid var(--warning)', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
        <AlertTriangle size={14} /> Blockers ({blockers.length})
      </div>
      {blockers.map((b) => (
        <button key={b.key} onClick={() => onFix?.(b.tab || 'details')}
          className="badge" style={{ background: 'var(--surface)', border: `1px solid var(--${SEVERITY_TONE[b.severity] || 'grey'})`, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 11.5 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: `var(--${SEVERITY_TONE[b.severity] || 'grey'})` }} />
          {b.label} <span style={{ color: 'var(--muted)', marginLeft: 4 }}>→ {b.cta}</span>
        </button>
      ))}
    </div>
  );
}

/** Compact counts row: tenancies · applications · WOs · media. */
export function CountsRow({ counts }) {
  const items = [
    { icon: Home, label: 'Tenancies', value: `${counts.active_tenancies}/${counts.total_tenancies}` },
    { icon: Users, label: 'Applications', value: counts.applications_open },
    { icon: Wrench, label: 'Open WOs', value: counts.work_orders_open },
    { icon: ClipboardCheck, label: 'Media', value: counts.media_count },
  ];
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
      {items.map((it, i) => {
        const Icon = it.icon;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
            <Icon size={13} /> <strong style={{ color: 'var(--text)' }}>{it.value}</strong> {it.label}
          </div>
        );
      })}
    </div>
  );
}
