import React from 'react';

// ── Currency (৳ BDT, matching the PM cockpit: ৳12.4L / ৳3.5k) ──
export const bdt = (v) => {
  const n = Number(v || 0);
  const sign = n < 0 ? '-' : '';
  const a = Math.abs(n);
  if (a >= 1e7) return `${sign}৳${(a / 1e7).toFixed(2)}Cr`;
  if (a >= 1e5) return `${sign}৳${(a / 1e5).toFixed(1)}L`;
  if (a >= 1e3) return `${sign}৳${(a / 1e3).toFixed(1)}k`;
  return `${sign}৳${Math.round(a)}`;
};
// Full amount with thousands separators — for tables where precision matters
export const bdtFull = (v) => `৳${Math.round(Number(v || 0)).toLocaleString('en-BD')}`;

export const initials = (s) => (s || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

// ── Dates ─────────────────────────────────────────────────────
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return `${dt.getDate()} ${MON[dt.getMonth()]}`;
};
export const fmtRange = (a, b) => `${fmtDate(a)} → ${fmtDate(b)}`;
export const nightsBetween = (a, b) => {
  if (!a || !b) return 0;
  return Math.max(0, Math.round((new Date(b) - new Date(a)) / 864e5));
};

// ── Status → pm-chip tone + label ─────────────────────────────
export const CHIP = {
  // verification
  verified: ['good', 'Verified'], under_review: ['warn', 'Under review'], submitted: ['info', 'Submitted'],
  documents_requested: ['bad', 'Docs requested'], not_started: ['grey', 'Not started'], pending: ['warn', 'Pending'],
  // agreement
  signed: ['good', 'Signed'], sent: ['warn', 'Sent'], viewed: ['info', 'Viewed'], draft: ['grey', 'Draft'],
  prepared: ['info', 'Prepared'], partially_signed: ['warn', 'Partially signed'], completed: ['good', 'Completed'],
  declined: ['bad', 'Declined'], void: ['grey', 'Void'],
  // payment
  paid: ['good', 'Paid'], part_paid: ['warn', 'Part paid'], unpaid: ['bad', 'Unpaid'], held: ['info', 'Held'],
  netted: ['grey', 'Netted'], due: ['bad', 'Due'], pending_approval: ['warn', 'Pending approval'],
  // booking lifecycle
  enquiry: ['grey', 'Enquiry'], hold: ['warn', 'On hold'], pending_verification: ['warn', 'Pending verification'],
  pending_agreement: ['warn', 'Pending agreement'], pending_payment: ['warn', 'Pending payment'],
  confirmed: ['good', 'Confirmed'], ready_checkin: ['info', 'Pre-arrival'], checked_in: ['good', 'Checked in'],
  checked_out: ['info', 'Check-out due'], inspection_pending: ['warn', 'Closure pending'], closed: ['grey', 'Closed'],
  cancelled: ['grey', 'Cancelled'],
  // property lifecycle / readiness
  active: ['good', 'Guest ready'], ready: ['good', 'Guest ready'], readiness_pending: ['warn', 'Assessment due'],
  suspended: ['bad', 'Suspended'], blocked: ['bad', 'Blocked'], setup_incomplete: ['warn', 'Setup incomplete'],
  // housekeeping / incidents
  in_progress: ['info', 'In progress'], reported: ['bad', 'Reported'], investigating: ['warn', 'Investigating'],
  resolved: ['good', 'Resolved'],
};
export const Chip = ({ k, label }) => {
  if (!k && !label) return <span className="pm-chip grey"><span className="d" />—</span>;
  const [tone, lbl] = CHIP[k] || ['grey', label || String(k).replace(/_/g, ' ')];
  return <span className={`pm-chip ${tone}`}><span className="d" />{label || lbl}</span>;
};

// ── KPI tile (dot + label + big value + sub) ──────────────────
export function Kpi({ tone = 'ink', label, value, unit, sub }) {
  const dot = { good: 'var(--good)', bad: 'var(--bad)', warn: 'var(--warn)', cyan: 'var(--cyan)', ink: 'var(--muted-2)' }[tone];
  const valColor = tone === 'good' ? 'var(--good)' : tone === 'bad' ? 'var(--bad)' : 'var(--ink)';
  return (
    <div className="pm-kpi" style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot }} />
        <span style={{ fontSize: 11.5, fontWeight: 650, color: 'var(--muted)' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 26, fontWeight: 780, letterSpacing: '-.03em', lineHeight: 1, color: valColor }}>{value}</span>
        {unit && <span style={{ fontSize: 12.5, color: 'var(--muted-2)', fontWeight: 650 }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 8 }}>{sub}</div>}
    </div>
  );
}

// A screen page header consistent with the mockup / pm cockpit
export function ScreenHead({ title, desc, actions }) {
  return (
    <div className="pm-head">
      <div>
        <div className="pm-eyebrow">Short Term Stay</div>
        <h1>{title}</h1>
        {desc && <div className="pm-meta">{desc}</div>}
      </div>
      {actions && <div className="pm-head-actions">{actions}</div>}
    </div>
  );
}

// ── Agreement signing progress (6-step) + card ────────────────
const STEP_LABELS = { draft: 'Draft', prepared: 'Prepared', sent: 'Sent', viewed: 'Viewed', partially_signed: 'Partially signed', completed: 'Completed' };
export function Stepper({ progress }) {
  const stages = progress?.stages || ['draft', 'prepared', 'sent', 'viewed', 'partially_signed', 'completed'];
  const idx = progress?.index ?? 0;
  const done = progress?.stage === 'completed';
  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {stages.map((s, i) => (
          <div key={s} style={{ flex: 1, height: 4, borderRadius: 3, background: i <= idx ? (done ? 'var(--good)' : 'var(--cyan)') : 'var(--line)' }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: 'var(--muted-2)', letterSpacing: '.01em' }}>
        {stages.map((s, i) => <span key={s} style={{ color: i === idx ? 'var(--ink-soft)' : 'var(--muted-2)', fontWeight: i === idx ? 700 : 500 }}>{STEP_LABELS[s]}</span>)}
      </div>
    </div>
  );
}

const AGR_STATUS = {
  active: ['good', 'Completed'], completed: ['good', 'Completed'], signed: ['good', 'Signed'],
  pending_signature: ['warn', 'Pending signature'], sent: ['warn', 'Sent'], viewed: ['info', 'Viewed'],
  draft: ['grey', 'Draft'], terminated: ['grey', 'Void'], declined: ['bad', 'Declined'],
};
export function AgreementCard({ item, actions }) {
  const [tone, label] = AGR_STATUS[item.status] || ['grey', String(item.status || '').replace(/_/g, ' ')];
  return (
    <div className="pm-card" style={{ marginBottom: 14 }}>
      <div className="pm-card-body" style={{ padding: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 20, alignItems: 'start' }} className="ss-agr-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span className={`pm-chip ${tone}`}><span className="d" />{label}</span>
              <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>{item.code}</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--ink)', marginBottom: 3 }}>{item.title}</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>{item.subtitle}</div>
            <Stepper progress={item.progress} />
          </div>
          <div>
            {(item.signers || []).length ? (item.signers).map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 0' }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700,
                  background: s.status === 'signed' ? 'var(--good)' : 'var(--surface-2)', color: s.status === 'signed' ? '#fff' : 'var(--muted)', border: s.status === 'signed' ? 'none' : '1px solid var(--line)' }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'capitalize' }}>{String(s.role || '').replace(/_/g, ' ')}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: s.status === 'signed' ? 'var(--good)' : s.status === 'declined' ? 'var(--bad)' : 'var(--warn)' }}>{s.status === 'signed' ? 'Signed' : s.status === 'viewed' ? 'Viewed' : s.status === 'declined' ? 'Declined' : 'Awaiting'}</span>
              </div>
            )) : <div style={{ fontSize: 12, color: 'var(--muted)' }}>No signers yet</div>}
            {actions && <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 12 }}>{actions}</div>}
          </div>
        </div>
      </div>
      <style>{`@media (max-width:820px){ .ss-agr-grid{ grid-template-columns:1fr!important } }`}</style>
    </div>
  );
}

// Generic "next in build queue" placeholder (matches the mockup's Settings state)
export function BuildQueue({ title, note }) {
  return (
    <div className="pm-card" style={{ maxWidth: 720 }}>
      <div className="pm-card-body" style={{ padding: '26px 24px' }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--cyan)', marginBottom: 8 }}>
          Next in the build queue
        </div>
        <h3 style={{ margin: '0 0 10px', fontSize: 18, color: 'var(--ink)' }}>{title}</h3>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6 }}>
          {note || 'The shell, navigation, header pattern and hub are in place. This screen is designed and lands in the next build phase, using the same table, filter, chip and drawer language as the core screens.'}
        </p>
      </div>
    </div>
  );
}
