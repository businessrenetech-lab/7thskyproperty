import React, { useEffect, useState, useCallback } from 'react';
import { Settings as Cog, Plus, X, Wallet, Clock, ScrollText, Sparkles, Users, ShieldCheck, ExternalLink, LogIn, LogOut } from 'lucide-react';
import api from '../../services/api';
import { Spinner } from '../../ui/kit';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { ScreenHead } from './common';

const RATE_FIELDS = [
  ['base_nightly_rate', 'Base nightly rate'], ['weekend_rate', 'Weekend rate'], ['weekly_rate', 'Weekly rate'], ['monthly_rate', 'Monthly rate'],
  ['cleaning_fee', 'Cleaning fee'], ['security_deposit', 'Security deposit'], ['extra_guest_fee', 'Extra guest fee'],
  ['early_checkin_fee', 'Early check-in fee'], ['late_checkout_fee', 'Late check-out fee'],
];

// Editable list of short text lines (house rules / checklist items)
function EditableList({ items, onChange, placeholder }) {
  const [draft, setDraft] = useState('');
  const add = () => { const v = draft.trim(); if (!v) return; onChange([...items, v]); setDraft(''); };
  return (
    <div>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--line-soft)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan)', flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 13, color: 'var(--ink-soft)' }}>{it}</span>
          <button className="pm-btn" style={{ padding: 4 }} onClick={() => onChange(items.filter((_, j) => j !== i))}><X size={13} /></button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder} style={{ flex: 1, border: '1px solid var(--line)', borderRadius: 10, padding: '8px 12px', font: 'inherit', fontSize: 12.5, color: 'var(--ink)', background: 'var(--surface)' }} />
        <button className="pm-btn" onClick={add}><Plus size={14} /> Add</button>
      </div>
    </div>
  );
}

const Card = ({ icon: Icon, title, sub, children }) => (
  <div className="pm-card" style={{ marginBottom: 16 }}>
    <div className="pm-card-h">
      <div className="ic"><Icon size={17} /></div>
      <div><h3 style={{ fontSize: 14.5 }}>{title}</h3>{sub && <div className="hsub">{sub}</div>}</div>
    </div>
    <div className="pm-card-body">{children}</div>
  </div>
);

const lbl = { fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 };
const inp = { width: '100%', border: '1px solid var(--line)', borderRadius: 10, padding: '8px 12px', font: 'inherit', fontSize: 13, color: 'var(--ink)', background: 'var(--surface)' };

export default function Settings({ goTab }) {
  const toast = useToast();
  const { user } = useAuth();
  const canSave = ['super_admin', 'branch_admin'].includes(user?.role);
  const [data, setData] = useState(null);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([
        api.get('/short-stay/settings'),
        api.get('/providers?limit=100').catch(() => ({ data: { data: [] } })),
      ]);
      setData(s.data || null);
      setProviders(p.data?.data || []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const patch = (section, key, value) => { setData((d) => ({ ...d, [section]: { ...d[section], [key]: value } })); setDirty(true); };
  const setList = (key, value) => { setData((d) => ({ ...d, [key]: value })); setDirty(true); };

  const save = async () => {
    setSaving(true);
    try { const res = await api.put('/short-stay/settings', data); setData(res.data); setDirty(false); toast.success('Settings saved'); }
    catch (err) { toast.error(err.response?.data?.error || 'Could not save settings'); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>;
  if (!data) return <div className="pm-card"><div className="pm-card-body" style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Could not load settings.</div></div>;

  return (
    <div>
      <ScreenHead title="Settings" desc="Rates, rules, checklists, providers and permissions for short stays."
        actions={canSave ? <button className="pm-btn primary" disabled={!dirty || saving} onClick={save} style={{ opacity: dirty && !saving ? 1 : 0.55 }}>{saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}</button> : null} />

      <fieldset disabled={!canSave} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>

      <Card icon={Wallet} title="Default rates & fees" sub="New listings prefill from these. Amounts in ৳ BDT.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }} className="ss-set-grid">
          {RATE_FIELDS.map(([k, label]) => (
            <div key={k}><label style={lbl}>{label} (৳)</label><input type="number" value={data.rates[k] ?? ''} onChange={(e) => patch('rates', k, e.target.value === '' ? '' : Number(e.target.value))} style={inp} /></div>
          ))}
        </div>
      </Card>

      <Card icon={Clock} title="Check-in / out policy" sub="Applied as defaults across the portfolio.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 14 }} className="ss-set-grid">
          <div><label style={lbl}>Check-in time</label><input type="time" value={data.policy.checkin_time || ''} onChange={(e) => patch('policy', 'checkin_time', e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Check-out time</label><input type="time" value={data.policy.checkout_time || ''} onChange={(e) => patch('policy', 'checkout_time', e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Minimum nights</label><input type="number" min={1} value={data.policy.min_nights ?? 1} onChange={(e) => patch('policy', 'min_nights', Number(e.target.value))} style={inp} /></div>
        </div>
        <label style={lbl}>Cancellation policy</label>
        <textarea rows={2} value={data.policy.cancellation_policy || ''} onChange={(e) => patch('policy', 'cancellation_policy', e.target.value)} style={{ ...inp, resize: 'vertical' }} />
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="ss-set-two">
        <Card icon={ScrollText} title="Default house rules" sub="Shown to guests on the stay agreement.">
          <EditableList items={data.house_rules} onChange={(v) => setList('house_rules', v)} placeholder="Add a house rule…" />
        </Card>
        <Card icon={Sparkles} title="Turnover checklist template" sub="Seeds each housekeeping turnover.">
          <EditableList items={data.turnover_checklist} onChange={(v) => setList('turnover_checklist', v)} placeholder="Add a checklist step…" />
        </Card>
      </div>

      <Card icon={ShieldCheck} title="Property readiness checklist" sub="Every property must pass these items before activation and publication.">
        <EditableList items={data.property_readiness_checklist || []} onChange={(v) => setList('property_readiness_checklist', v)} placeholder="Add a property readiness item…" />
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="ss-set-two">
        <Card icon={LogIn} title="Check-in checklist" sub="Applied to every guest arrival.">
          <EditableList items={data.checkin_checklist} onChange={(v) => setList('checkin_checklist', v)} placeholder="Add a check-in item…" />
        </Card>
        <Card icon={LogOut} title="Check-out checklist" sub="Applied to every guest departure.">
          <EditableList items={data.checkout_checklist} onChange={(v) => setList('checkout_checklist', v)} placeholder="Add a check-out item…" />
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="ss-set-two">
        <Card icon={Users} title="Providers" sub={`${providers.length} service provider${providers.length === 1 ? '' : 's'} available for turnovers & maintenance`}>
          {providers.slice(0, 5).map((p) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', borderBottom: '1px solid var(--line-soft)' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.portal_enabled ? 'var(--good)' : 'var(--muted-2)' }} />
              <span style={{ flex: 1, fontSize: 13, color: 'var(--ink-soft)' }}>{p.company_name || p.contact_person || `Provider #${p.id}`}</span>
              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{Array.isArray(p.service_categories) ? p.service_categories.slice(0, 2).join(', ') : ''}</span>
            </div>
          ))}
          {!providers.length && <div style={{ fontSize: 12.5, color: 'var(--muted)', padding: '8px 0' }}>No providers yet.</div>}
          <button className="pm-btn" style={{ marginTop: 12 }} onClick={() => { window.location.href = '/admin/providers'; }}><ExternalLink size={13} /> Manage in Staff &amp; Providers</button>
        </Card>

        <Card icon={ShieldCheck} title="Permissions" sub="Who can manage Short Term Stay">
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.7 }}>
            {[['Super admin', 'Full access — settings, activation overrides, all operations'], ['Branch admin', 'All operations within their branch'], ['Property manager', 'Bookings, check-in/out, housekeeping, incidents'], ['Sales executive', 'Enquiries and bookings']].map(([role, scope]) => (
              <div key={role} style={{ display: 'flex', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--line-soft)' }}>
                <span style={{ minWidth: 118, fontWeight: 650, color: 'var(--ink)' }}>{role}</span>
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>{scope}</span>
              </div>
            ))}
            <p style={{ fontSize: 11.5, color: 'var(--muted-2)', marginTop: 10, marginBottom: 0 }}>Role assignments are managed in Users &amp; Roles.</p>
          </div>
        </Card>
      </div>
      </fieldset>

      <style>{`@media (max-width:900px){ .ss-set-grid{ grid-template-columns:repeat(2,1fr)!important } .ss-set-two{ grid-template-columns:1fr!important } } @media (max-width:560px){ .ss-set-grid{ grid-template-columns:1fr!important } }`}</style>
    </div>
  );
}
