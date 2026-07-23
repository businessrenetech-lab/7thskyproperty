import React from 'react';
import { X, Plus, RefreshCw, LogOut, Ban, FileSignature, Wallet, Users, Clock } from 'lucide-react';
import { Button, Badge, StatusBadge, KV } from '../ui/kit';

/* Manage Tenants hub — replaces the always-on "Add tenant" button.
   Shows the current tenancy with lifecycle actions (renew / end / terminate /
   send agreement / raise invoice), the history of past tenants, and add-new. */

const money = (v) => (v == null || v === '' ? '—' : '৳' + Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 }));
const daysToEnd = (end) => { if (!end) return null; return Math.ceil((new Date(end) - new Date()) / 86400000); };

export default function ManageTenants({ tenancies = [], hasOwner, onAddNew, onRenew, onEnd, onTerminate, onSendAgreement, onRaiseInvoice, onClose }) {
  const current = tenancies.filter((t) => t.status === 'active' || t.status === 'upcoming');
  const past = tenancies.filter((t) => !current.includes(t));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 75, display: 'grid', placeItems: 'center', padding: 20 }} onClick={onClose}>
      <div className="pm-scope" onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: 'min(760px,96vw)', maxHeight: '88vh', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--line,#e5e7eb)' }}>
          <b><Users size={15} style={{ verticalAlign: -2 }} /> Manage tenants</b>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ padding: 18, overflowY: 'auto' }}>
          {!hasOwner && <div style={{ padding: '10px 12px', marginBottom: 14, borderRadius: 10, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', fontSize: 12.5 }}><b>Owner required:</b> you can prepare an upcoming tenancy, but an owner must be assigned before sending agreements or activating the lease.</div>}
          {/* Current tenancy */}
          <div className="between" style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 750, fontSize: 13 }}>Current tenancy</span>
            {!current.length && <Button size="sm" icon={Plus} onClick={onAddNew}>Add new tenant</Button>}
          </div>
          {current.length ? current.map((t) => {
            const d = daysToEnd(t.lease_end);
            return (
              <div key={t.id} className="pm-card" style={{ padding: 0, marginBottom: 12, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: 'var(--surface-2,#f8fafc)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span className="code-chip">{t.tenancy_code}</span>
                  <StatusBadge status={t.status} />
                  <Badge tone={t.lease_status === 'active' ? 'green' : 'grey'} dot>{(t.lease_status || 'draft').replace(/_/g, ' ')}</Badge>
                  {d != null && d <= 90 && <Badge tone={d < 0 ? 'red' : d <= 30 ? 'amber' : 'grey'}><Clock size={11} style={{ verticalAlign: -1 }} /> {d < 0 ? `Ended ${-d}d ago` : `Ends in ${d}d`}</Badge>}
                </div>
                <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px' }}>
                  <KV k="Tenant" v={t.tenant?.full_name || '—'} />
                  <KV k="Phone" v={t.tenant?.primary_phone || '—'} />
                  <KV k="Lease" v={`${t.lease_start || '—'} → ${t.lease_end || '—'}`} />
                  <KV k="Monthly rent" v={money(t.monthly_rent)} />
                  <KV k="Service charge" v={money(t.service_charge)} />
                  <KV k="Outstanding" v={t.outstanding > 0 ? <Badge tone="red">{money(t.outstanding)}</Badge> : <Badge tone="green">Clear</Badge>} />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '0 16px 14px' }}>
                  {t.status === 'active' && <Button size="sm" icon={RefreshCw} onClick={() => onRenew(t)}>Renew</Button>}
                  {t.status === 'active' && <Button size="sm" variant="ghost" icon={LogOut} onClick={() => onEnd(t)}>End tenancy</Button>}
                  {t.status === 'active' && <Button size="sm" variant="ghost" icon={Ban} onClick={() => onTerminate(t)}>Terminate</Button>}
                  {t.lease_status !== 'active' && t.lease_status !== 'signed' && (
                    <Button size="sm" variant="ghost" icon={FileSignature} disabled={!hasOwner} onClick={() => onSendAgreement(t.id)}>{t.lease_status === 'sent_for_signature' ? 'Resend agreement' : 'Send agreement'}</Button>
                  )}
                  {t.status === 'active' && <Button size="sm" variant="ghost" icon={Wallet} onClick={() => onRaiseInvoice(t.id)}>Raise rent invoice</Button>}
                </div>
              </div>
            );
          }) : <div className="pm-empty" style={{ marginBottom: 14 }}><div className="ic"><Users size={20} /></div>No active tenant. Add one to start rental tracking.</div>}

          {/* Past and historical tenancies */}
          {past.length > 0 && (
            <>
              <div style={{ fontWeight: 750, fontSize: 13, margin: '14px 0 8px' }}>Past tenants and history ({past.length})</div>
              {past.map((t) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--line,#eef2f7)', borderRadius: 10, marginBottom: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 650, fontSize: 13 }}>{t.tenant?.full_name || t.tenancy_code} <span style={{ color: '#94a3b8', fontWeight: 500 }}>· {t.tenancy_code}</span></div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{[t.lease_start, t.move_out_date || t.lease_end].filter(Boolean).join(' → ')} · {money(t.monthly_rent)}/mo{t.termination_reason ? ` · ${t.termination_reason.replace(/_/g, ' ')}` : ''}</div>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
