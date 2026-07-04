import React, { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Play, Check, X, RefreshCw, Send } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Spinner, Badge, Button, Field, Input, Textarea, Drawer } from '../ui/kit';

const money = (v) => 'BDT ' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

const IN_FLIGHT_META = {
  proposed: { label: 'Owner Approval', tone: 'amber', next: 'Wait for owner decision' },
  owner_approved: { label: 'Tenant to Accept', tone: 'blue', next: 'Send offer to tenant' },
  tenant_accepted: { label: 'Ready to Activate', tone: 'green', next: 'Activate — apply new terms' },
  activated: { label: 'Activated', tone: 'green', next: 'Complete' },
  declined: { label: 'Declined', tone: 'red', next: '—' },
};

export default function Renewals() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(null); // { tenancy, mode: 'propose' }
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/property-management/renewals'); setData(data); }
    catch { toast.error('Failed to load renewals'); } finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const propose = async (form) => {
    setSaving(true);
    try {
      const { data } = await api.post(`/tenancies/${drawer.tenancy.id}/renewal/propose`, form);
      toast.success(data.message);
      setDrawer(null);
      await load();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); } finally { setSaving(false); }
  };

  const action = async (id, path, msg) => {
    try { const { data } = await api.post(`/tenancies/${id}/renewal/${path}`); toast.success(data.message || msg); await load(); }
    catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>;
  if (!data) return null;
  const c = data.counts;

  return (
    <>
      <PageHead title="Renewals" desc="Lease renewal pipeline — 30/60/90-day buckets and in-flight offers." actions={<Button variant="ghost" icon={RefreshCw} onClick={load}>Refresh</Button>} />

      <div className="grid grid-4">
        <MetricCard label="Expiring 30d" value={c.d30} tone={c.d30 > 0 ? 'red' : 'green'} />
        <MetricCard label="Expiring 60d" value={c.d60} tone={c.d60 > 0 ? 'amber' : 'green'} />
        <MetricCard label="Expiring 90d" value={c.d90} tone="blue" />
        <MetricCard label="In flight" value={c.in_flight} tone="blue" />
      </div>

      {data.data.in_flight.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-head"><h3>In-flight renewals</h3></div>
          <div style={{ padding: 8 }}>
            {data.data.in_flight.map((t) => {
              const meta = IN_FLIGHT_META[t.renewal_status] || IN_FLIGHT_META.proposed;
              return (
                <div key={t.id} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: `3px solid var(--${meta.tone === 'grey' ? 'muted-2' : meta.tone})` }}>
                  <div className="between" style={{ flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{t.Property?.title} <span className="cell-sub">· {t.tenancy_code}</span></div>
                      <div className="cell-sub">Tenant: {t.tenant?.full_name || '—'} · Current rent {money(t.monthly_rent)}, lease ends {t.lease_end}</div>
                      <div style={{ marginTop: 4, fontSize: 12.5 }}><strong>Offer:</strong> {money(t.renewal_offer_rent)} rent · new end {t.renewal_offer_lease_end || '—'}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <Badge tone={meta.tone} dot>{meta.label}</Badge>
                      {t.renewal_status === 'owner_approved' && (
                        <Button size="sm" variant="ghost" icon={Send} onClick={() => action(t.id, 'tenant-accept', 'Tenant accepted')}>Mark Tenant Accepted</Button>
                      )}
                      {t.renewal_status === 'tenant_accepted' && (
                        <Button size="sm" icon={Play} onClick={() => action(t.id, 'activate', 'Activated')}>Activate</Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {['d30', 'd60', 'd90'].map((bucket) => {
        const rows = data.data[bucket];
        if (!rows?.length) return null;
        const label = bucket === 'd30' ? 'Expiring in ≤ 30 days' : bucket === 'd60' ? 'Expiring in 31–60 days' : 'Expiring in 61–90 days';
        return (
          <div key={bucket} className="card" style={{ marginTop: 16 }}>
            <div className="card-head"><h3>{label}</h3></div>
            <div style={{ padding: 8 }}>
              {rows.map((t) => (
                <div key={t.id} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div className="between" style={{ flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{t.Property?.title} <span className="cell-sub">· {t.tenancy_code}</span></div>
                      <div className="cell-sub">Tenant: {t.tenant?.full_name || '—'} · Rent {money(t.monthly_rent)}/mo</div>
                      <div className="cell-sub" style={{ color: 'var(--warning)', marginTop: 2 }}><CalendarClock size={11} /> Lease ends {t.lease_end}</div>
                    </div>
                    <Button size="sm" onClick={() => setDrawer({ tenancy: t, mode: 'propose' })}>Propose Renewal</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {drawer && drawer.mode === 'propose' && <ProposeDrawer tenancy={drawer.tenancy} onClose={() => setDrawer(null)} onSubmit={propose} saving={saving} />}
    </>
  );
}

function MetricCard({ label, value, tone }) {
  const color = { blue: 'var(--primary)', green: 'var(--success)', amber: 'var(--warning)', red: 'var(--danger)' }[tone] || 'var(--text)';
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700, marginTop: 3, letterSpacing: 0.3 }}>{label}</div>
    </div>
  );
}

function ProposeDrawer({ tenancy, onClose, onSubmit, saving }) {
  const [form, setForm] = useState({
    new_rent: tenancy.monthly_rent,
    new_service_charge: tenancy.service_charge || 0,
    new_lease_end: '',
    notes: '',
  });
  return (
    <Drawer title="Propose Renewal" width={520} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => onSubmit(form)} disabled={saving}>{saving ? <Spinner /> : 'Propose'}</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="card" style={{ padding: 10, background: 'var(--surface-2)' }}>
          <div style={{ fontWeight: 700 }}>{tenancy.Property?.title}</div>
          <div className="cell-sub">Tenant: {tenancy.tenant?.full_name} · Current rent {money(tenancy.monthly_rent)}, lease ends {tenancy.lease_end}</div>
        </div>
        <div className="form-grid">
          <Field label="New rent (BDT)" required><Input type="number" value={form.new_rent} onChange={(e) => setForm((s) => ({ ...s, new_rent: e.target.value }))} /></Field>
          <Field label="New service charge (BDT)"><Input type="number" value={form.new_service_charge} onChange={(e) => setForm((s) => ({ ...s, new_service_charge: e.target.value }))} /></Field>
        </div>
        <Field label="New lease end date" required><Input type="date" value={form.new_lease_end} onChange={(e) => setForm((s) => ({ ...s, new_lease_end: e.target.value }))} /></Field>
        <Field label="Notes"><Textarea rows={3} value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} placeholder="Reason for the proposed rate, any concessions…" /></Field>
        <p className="cell-sub" style={{ fontSize: 12, margin: 0 }}>Owner will see this in their approvals inbox. Once approved, the tenant sees the offer in their portal.</p>
      </div>
    </Drawer>
  );
}
