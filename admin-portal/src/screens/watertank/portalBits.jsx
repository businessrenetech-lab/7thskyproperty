import React, { useState } from 'react';
import { ChevronDown, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { bdt, dateFmt } from './common';

/*
 * Shared furniture for both portals.
 *
 * These live apart from the panels because the two audiences are different
 * businesses — a provider on a rooftop with one bar of signal, a building
 * manager at a desk — but the CHROME must be identical. When the provider
 * portal and the client portal drift into two different-looking products, the
 * next person to change one forgets the other, and Seventh Sky ends up sending
 * two impressions of itself to the two halves of the same job.
 */

export const num = (v) => Number(v || 0);
export const lower = (v) => String(v || '').trim().toLowerCase();

/** A labelled figure. `tone` colours it when the number is the point. */
export function Kpi({ label, value, sub, tone, onClick }) {
  const colour = tone === 'bad' ? 'var(--wt-red)'
    : tone === 'good' ? 'var(--wt-green)'
      : tone === 'warn' ? '#b45309' : undefined;
  return (
    <div className={`wt-card wt-kpi${onClick ? ' click' : ''}`} style={{ padding: 14, cursor: onClick ? 'pointer' : undefined }}
      onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}>
      <div>
        <div className="wt-kpi-label">{label}</div>
        <div className="wt-kpi-value" style={{ color: colour }}>{value}</div>
        {sub && <div className="wt-kpi-sub">{sub}</div>}
      </div>
    </div>
  );
}

/**
 * The things that will bite if ignored.
 *
 * Deliberately at the very top and above the tabs, because the whole reason a
 * portal beats a phone call is that the other party can see a problem coming.
 * A lapsing insurance certificate that only Seventh Sky can see is how a
 * provider gets suspended by surprise.
 */
export function Alerts({ items }) {
  const live = (items || []).filter(Boolean);
  if (!live.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {live.map((a) => (
        <div key={a.key} style={{
          display: 'flex', gap: 10, alignItems: 'flex-start', padding: '11px 14px', borderRadius: 10,
          border: `1px solid ${a.tone === 'bad' ? '#fecaca' : '#fcd34d'}`,
          background: a.tone === 'bad' ? '#fef2f2' : 'var(--wt-amber-bg)',
        }}>
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1, color: a.tone === 'bad' ? 'var(--wt-red)' : '#b45309' }} />
          <span style={{ fontSize: 13, flex: '1 0 0' }}>
            <b>{a.title}</b>
            {a.detail ? <> — {a.detail}</> : null}
          </span>
          {a.action}
        </div>
      ))}
    </div>
  );
}

/** A tab bar that wraps. Providers open this on a phone; it cannot scroll off. */
export function PortalTabs({ tabs, value, onChange }) {
  return (
    <div style={{
      display: 'flex', gap: 6, flexWrap: 'wrap',
      borderBottom: '1px solid var(--wt-line)', paddingBottom: 10, marginBottom: 4,
    }}>
      {tabs.map((t) => {
        const on = t.value === value;
        return (
          <button key={t.value} onClick={() => onChange(t.value)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 13px', borderRadius: 8, cursor: 'pointer',
              border: `1px solid ${on ? 'var(--wt-accent)' : 'var(--wt-line)'}`,
              background: on ? 'var(--wt-accent)' : '#fff',
              color: on ? '#fff' : 'var(--wt-ink-2)',
              font: 'inherit', fontSize: 13, fontWeight: on ? 700 : 600,
            }}>
            {t.icon ? <t.icon size={14} /> : null}
            {t.label}
            {t.count > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 800, padding: '1px 6px', borderRadius: 999,
                background: on ? 'rgba(255,255,255,0.25)' : (t.tone === 'bad' ? 'var(--wt-red)' : 'var(--wt-line)'),
                color: on ? '#fff' : (t.tone === 'bad' ? '#fff' : 'var(--wt-ink-2)'),
              }}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** A card that opens. Long registers are unreadable fully expanded on a phone. */
export function Expandable({ title, subtitle, right, badge, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="wt-card" style={{ padding: 0, overflow: 'hidden' }}>
      <button onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
          background: 'none', border: 0, cursor: 'pointer', font: 'inherit', textAlign: 'left',
        }}>
        <span style={{ flex: '1 0 0', minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 14 }}>{title}</strong>
            {badge}
          </span>
          {subtitle && <span className="muted" style={{ display: 'block', fontSize: 12.5, marginTop: 3 }}>{subtitle}</span>}
        </span>
        {right}
        <ChevronDown size={16} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .15s', color: 'var(--wt-muted)' }} />
      </button>
      {open && <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--wt-line)' }}>{children}</div>}
    </div>
  );
}

/** label / value pairs that survive a narrow screen. */
export function Facts({ items }) {
  const live = items.filter(([, v]) => v != null && v !== '');
  if (!live.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', columnGap: 26, marginTop: 12 }}>
      {live.map(([label, value]) => (
        <div key={label} style={{
          display: 'flex', justifyContent: 'space-between', gap: 14,
          padding: '7px 0', borderBottom: '1px solid var(--wt-line)', fontSize: 13,
        }}>
          <span className="muted" style={{ fontSize: 12 }}>{label}</span>
          <span style={{ textAlign: 'right', fontWeight: 600 }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

/** An empty state that explains rather than shrugging. */
export function Nothing({ title, hint, icon: Icon = Info }) {
  return (
    <div className="wt-card" style={{ padding: '34px 22px', textAlign: 'center' }}>
      <Icon size={22} style={{ color: 'var(--wt-muted)' }} />
      <div style={{ fontWeight: 700, marginTop: 10, fontSize: 14 }}>{title}</div>
      {hint && <p className="muted" style={{ fontSize: 12.5, maxWidth: 460, margin: '6px auto 0' }}>{hint}</p>}
    </div>
  );
}

/** A section heading with an optional count. */
export function SectionTitle({ children, count, hint }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div className="wt-sec-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {children}
        {count != null && <span className="muted" style={{ fontWeight: 500, fontSize: 12.5 }}>({count})</span>}
      </div>
      {hint && <p className="muted" style={{ fontSize: 12.5, margin: '3px 0 0' }}>{hint}</p>}
    </div>
  );
}

/** Days-to-expiry, said in words rather than left as a date to work out. */
export function ExpiryChip({ days, expired = 'Expired', soon = 'Expiring' }) {
  if (days == null) return null;
  if (days < 0) return <span className="wt-chip warn" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' }}>{expired} {Math.abs(days)}d ago</span>;
  if (days <= 45) return <span className="wt-chip warn">{soon} in {days}d</span>;
  return null;
}

/** A tidy money + date line used by both statements. */
export const MoneyLine = ({ label, amount, date, tone }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, padding: '6px 0' }}>
    <span className="muted">{label}{date ? ` · ${dateFmt(date)}` : ''}</span>
    <b style={{ color: tone === 'good' ? 'var(--wt-green)' : tone === 'bad' ? 'var(--wt-red)' : undefined }}>{bdt(amount)}</b>
  </div>
);

export const Done = ({ children }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--wt-green)', fontSize: 12.5, fontWeight: 600 }}>
    <CheckCircle2 size={13} /> {children}
  </span>
);
