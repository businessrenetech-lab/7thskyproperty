import React, { useState } from 'react';
import { ChevronDown, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { bdt, dateFmt } from './common';

/*
 * Shared furniture for both portals.
 *
 * These live apart from the panels because the two audiences are different
 * businesses — a provider on a rooftop with one bar of signal, a building
 * manager at a desk — but the CHROME must be identical. Styling comes from the
 * dedicated portal design system (styles/portal.css, `.pp-*`), so the portal is
 * a calm, polished, compact page rather than a copy of the operator console.
 */

export const num = (v) => Number(v || 0);
export const lower = (v) => String(v || '').trim().toLowerCase();

/** A labelled figure. `tone` colours it when the number is the point. */
export function Kpi({ label, value, sub, tone, onClick }) {
  return (
    <div className={`pp-kpi${onClick ? ' click' : ''}`}
      onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}>
      <div className="k-label">{label}</div>
      <div className={`k-value${tone ? ` ${tone === 'bad' ? 'bad' : tone === 'good' ? 'good' : 'warn'}` : ''}`}>{value}</div>
      {sub && <div className="k-sub">{sub}</div>}
    </div>
  );
}

/**
 * The things that will bite if ignored — at the very top, above the tabs, so the
 * other party can see a problem coming (a lapsing certificate, an overdue bill).
 */
export function Alerts({ items }) {
  const live = (items || []).filter(Boolean);
  if (!live.length) return null;
  return (
    <div className="pp-alerts">
      {live.map((a) => (
        <div key={a.key} className={`pp-alert${a.tone === 'bad' ? ' bad' : ''}`}>
          <AlertTriangle size={16} />
          <span className="txt"><b>{a.title}</b>{a.detail ? <> — {a.detail}</> : null}</span>
          {a.action && <span className="act">{a.action}</span>}
        </div>
      ))}
    </div>
  );
}

/** A tab bar that wraps. Providers open this on a phone; it cannot scroll off. */
export function PortalTabs({ tabs, value, onChange }) {
  return (
    <div className="pp-tabs" role="tablist">
      {tabs.map((t) => {
        const on = t.value === value;
        return (
          <button key={t.value} className={`pp-tab${on ? ' on' : ''}`} role="tab" aria-selected={on}
            onClick={() => onChange(t.value)}>
            {t.icon ? <t.icon size={14} /> : null}
            {t.label}
            {t.count > 0 && <span className={`cnt${t.tone === 'bad' ? ' bad' : ''}`}>{t.count}</span>}
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
    <div className="pp-exp">
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="exp-t">
          <span className="row"><strong>{title}</strong>{badge}</span>
          {subtitle && <span className="sub">{subtitle}</span>}
        </span>
        {right}
        <ChevronDown size={16} className={`chev${open ? ' open' : ''}`} />
      </button>
      {open && <div className="exp-body">{children}</div>}
    </div>
  );
}

/** label / value pairs that survive a narrow screen. */
export function Facts({ items }) {
  const live = items.filter(([, v]) => v != null && v !== '');
  if (!live.length) return null;
  return (
    <div className="pp-facts">
      {live.map(([label, value]) => (
        <div className="f" key={label}>
          <span className="l">{label}</span>
          <span className="v">{value}</span>
        </div>
      ))}
    </div>
  );
}

/** An empty state that explains rather than shrugging. */
export function Nothing({ title, hint, icon: Icon = Info }) {
  return (
    <div className="pp-empty">
      <Icon size={24} />
      <div className="t">{title}</div>
      {hint && <p className="h">{hint}</p>}
    </div>
  );
}

/** A section heading with an optional count. */
export function SectionTitle({ children, count, hint }) {
  return (
    <div className="pp-sec">
      <div className="h">{children}{count != null && <span className="n">({count})</span>}</div>
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

/** Days-to-expiry, said in words rather than left as a date to work out. */
export function ExpiryChip({ days, expired = 'Expired', soon = 'Expiring' }) {
  if (days == null) return null;
  if (days < 0) return <span className="pp-chip bad">{expired} {Math.abs(days)}d ago</span>;
  if (days <= 45) return <span className="pp-chip warn">{soon} in {days}d</span>;
  return null;
}

/** A tidy money + date line used by both statements. */
export const MoneyLine = ({ label, amount, date, tone }) => (
  <div className="pp-money">
    <span className="l">{label}{date ? ` · ${dateFmt(date)}` : ''}</span>
    <b className={tone === 'good' ? 'good' : tone === 'bad' ? 'bad' : ''}>{bdt(amount)}</b>
  </div>
);

export const Done = ({ children }) => (
  <span className="pp-chip ok"><CheckCircle2 size={13} /> {children}</span>
);
