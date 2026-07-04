import React, { useCallback, useEffect, useState } from 'react';
import {
  Home, Wallet, Wrench, FileText, MessageCircle, LogOut, AlertTriangle,
  CalendarClock, Check, RefreshCw, Upload, Send, KeyRound, Phone, Mail,
} from 'lucide-react';
import api from '../services/api';
import { PageHead, DataTable, StatusBadge, Badge, Spinner, EmptyState, Field, Input, Textarea, Select, Button, Drawer, KV } from '../ui/kit';
import { useToast } from '../context/ToastContext';

const money = (v) => 'BDT ' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TABS = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'payments', label: 'Payments', icon: Wallet },
  { key: 'maintenance', label: 'Maintenance', icon: Wrench },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'messages', label: 'Messages', icon: MessageCircle },
];

export default function TenantPortal() {
  const toast = useToast();
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState('home');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/tenant/me');
      setMe(data.data);
    } catch (e) {
      setMe({ error: e.response?.data?.error || 'Failed to load your portal' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>;
  if (me?.error) return <EmptyState icon={AlertTriangle} title="Portal not linked" sub={me.error} />;
  if (!me.active_tenancy) return <EmptyState icon={KeyRound} title="No active tenancy" sub="Contact Seventh Sky Property Care to complete your onboarding." />;

  const m = me.metrics;
  return (
    <>
      <PageHead
        title={`Welcome, ${me.contact?.full_name || 'Tenant'}`}
        desc={me.property ? `${me.property.title} · ${[me.property.area, me.property.district].filter(Boolean).join(', ')}` : ''}
        actions={<Button variant="ghost" icon={RefreshCw} onClick={load}>Refresh</Button>}
      />

      {/* Headline strip — answers the 4 questions tenants care about */}
      <div className="grid grid-4">
        <MetricCard icon={Wallet} label={m.outstanding > 0 ? 'You owe' : 'All paid up'} value={money(m.outstanding)} tone={m.outstanding > 0 ? 'red' : 'green'} />
        <MetricCard icon={CalendarClock} label={m.next_rent_due ? 'Next rent due' : 'No rent due'} value={m.next_rent_due ? m.next_rent_due.due_date : '—'} sub={m.next_rent_due ? money(m.next_rent_due.outstanding) : ''} tone={m.next_rent_due ? 'amber' : 'green'} />
        <MetricCard icon={KeyRound} label="Deposit held" value={money(m.deposit_held)} tone="blue" />
        <MetricCard icon={Wrench} label="Open maintenance" value={m.open_work_orders} tone={m.open_work_orders > 0 ? 'amber' : 'green'} />
      </div>

      <div className="tabs" style={{ marginTop: 20 }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          return <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}><Icon size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} /> {t.label}</button>;
        })}
      </div>

      <div style={{ marginTop: 8 }}>
        {tab === 'home' && <HomeTab me={me} onReload={load} />}
        {tab === 'payments' && <PaymentsTab me={me} onReload={load} />}
        {tab === 'maintenance' && <MaintenanceTab />}
        {tab === 'documents' && <DocumentsTab />}
        {tab === 'messages' && <MessagesTab />}
      </div>
    </>
  );
}

function MetricCard({ icon: Icon, label, value, sub, tone }) {
  const color = { blue: 'var(--primary)', green: 'var(--success)', amber: 'var(--warning)', red: 'var(--danger)' }[tone] || 'var(--text)';
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: `var(--${tone}-bg)`, color, display: 'grid', placeItems: 'center' }}>
          <Icon size={18} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.2, color }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
          <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700, marginTop: 3, letterSpacing: 0.3 }}>{label}</div>
        </div>
      </div>
    </div>
  );
}

// ─── HOME TAB ───────────────────────────────────────────────────────────────
function HomeTab({ me, onReload }) {
  const toast = useToast();
  const [showVacate, setShowVacate] = useState(false);
  const [vacate, setVacate] = useState({ intended_vacate_date: '', reason: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [renewal, setRenewal] = useState(null);

  useEffect(() => { (async () => { try { const { data } = await api.get('/tenant/renewal-offer'); setRenewal(data.data); } catch {} })(); }, []);

  const acceptRenewal = async () => {
    setSaving(true);
    try {
      const { data } = await api.post('/tenant/renewal-offer/accept');
      toast.success(data.message);
      const { data: r } = await api.get('/tenant/renewal-offer');
      setRenewal(r.data);
      onReload?.();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const submitVacancy = async () => {
    if (!vacate.intended_vacate_date) return toast.error('Vacate date required');
    setSaving(true);
    try {
      const { data } = await api.post('/tenant/vacancy-notice', vacate);
      toast.success(data.message);
      setShowVacate(false);
      setVacate({ intended_vacate_date: '', reason: '', notes: '' });
      onReload?.();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const t = me.active_tenancy;
  const p = me.property;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {renewal && renewal.status === 'owner_approved' && (
        <div className="card" style={{ padding: 16, background: 'var(--success-bg)', border: '1px solid var(--success)' }}>
          <div style={{ fontWeight: 800, color: 'var(--success)' }}>Renewal offer waiting for you</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>
            Your property manager has proposed to extend your lease.<br />
            <strong>New rent:</strong> {money(renewal.offer_rent)}/mo · <strong>New service charge:</strong> {money(renewal.offer_service)} · <strong>New lease end:</strong> {renewal.offer_lease_end}
          </div>
          {renewal.notes && <div className="cell-sub" style={{ marginTop: 6, fontSize: 12 }}>{renewal.notes}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Button icon={Check} onClick={acceptRenewal} disabled={saving}>{saving ? <Spinner /> : 'Accept Renewal'}</Button>
          </div>
        </div>
      )}
      {renewal && renewal.status === 'tenant_accepted' && (
        <div className="card" style={{ padding: 14, background: 'var(--primary-50)', borderColor: 'var(--primary-100)', fontSize: 13 }}>
          You've accepted the renewal — your property manager will finalise the paperwork.
        </div>
      )}
      {renewal && renewal.status === 'activated' && (
        <div className="card" style={{ padding: 14, background: 'var(--success-bg)', border: '1px solid var(--success)', fontSize: 13 }}>
          Renewal activated ✓ Your new lease terms are now in effect.
        </div>
      )}

      <div className="card" style={{ padding: 16, background: 'var(--primary-50)', borderColor: 'var(--primary-100)' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {p?.featured_image_url && <img src={p.featured_image_url} alt="" style={{ width: 140, height: 100, objectFit: 'cover', borderRadius: 8 }} />}
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontWeight: 800, fontSize: 17 }}>{p?.title}</div>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{[p?.address, p?.area, p?.district].filter(Boolean).join(', ')}</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12.5, flexWrap: 'wrap' }}>
              <div><strong>Rent:</strong> {money(t.monthly_rent)}/mo</div>
              {t.service_charge > 0 && <div><strong>Service:</strong> {money(t.service_charge)}/mo</div>}
              <div><strong>Lease:</strong> {t.lease_start || '—'} → {t.lease_end || '—'}</div>
              <div><strong>Due day:</strong> {t.rent_due_day || 5}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <ContactCard title="Property manager" icon={Phone} sub="Reach out anytime" />
        <div className="card" style={{ padding: 14 }}>
          <h4 className="form-section-title" style={{ marginTop: 0 }}>Give notice to vacate</h4>
          <p className="cell-sub" style={{ margin: '0 0 10px' }}>Planning to move out? Submit your notice — the property manager will confirm the exit inspection date and deposit settlement.</p>
          <Button size="sm" variant="ghost" onClick={() => setShowVacate(true)}>Submit notice</Button>
        </div>
      </div>

      {showVacate && (
        <Drawer title="Notice to Vacate" width={520} onClose={() => setShowVacate(false)}
          footer={<><Button variant="ghost" onClick={() => setShowVacate(false)}>Cancel</Button><Button onClick={submitVacancy} disabled={saving}>{saving ? <Spinner /> : 'Submit Notice'}</Button></>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Intended vacate date" required><Input type="date" value={vacate.intended_vacate_date} onChange={(e) => setVacate((s) => ({ ...s, intended_vacate_date: e.target.value }))} /></Field>
            <Field label="Reason (optional)"><Input value={vacate.reason} onChange={(e) => setVacate((s) => ({ ...s, reason: e.target.value }))} placeholder="Moving abroad, job change…" /></Field>
            <Field label="Additional notes"><Textarea rows={3} value={vacate.notes} onChange={(e) => setVacate((s) => ({ ...s, notes: e.target.value }))} /></Field>
            <p className="cell-sub" style={{ fontSize: 12, margin: 0 }}>Once submitted, the manager will contact you to schedule the exit inspection and calculate your deposit refund.</p>
          </div>
        </Drawer>
      )}
    </div>
  );
}

function ContactCard({ title, icon: Icon, sub }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <h4 className="form-section-title" style={{ marginTop: 0 }}>{title}</h4>
      <div style={{ color: 'var(--muted)', fontSize: 13 }}>{sub}</div>
      <div style={{ marginTop: 10 }}>
        <Button size="sm" variant="ghost" icon={Icon}>Call your manager</Button>
      </div>
    </div>
  );
}

// ─── PAYMENTS TAB ───────────────────────────────────────────────────────────
function PaymentsTab({ me, onReload }) {
  const toast = useToast();
  const [invoices, setInvoices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProof, setShowProof] = useState(false);
  const [proof, setProof] = useState({ amount: '', method: 'bkash', reference: '', paid_at: new Date().toISOString().slice(0, 10), notes: '', evidence_url: '', invoice_ids: [] });
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: inv }, { data: rec }] = await Promise.all([api.get('/tenant/invoices'), api.get('/tenant/receipts')]);
      setInvoices(inv.data || []);
      setReceipts(rec.data || []);
    } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submitProof = async () => {
    if (!proof.amount || !proof.method) return toast.error('Amount and method required');
    setSaving(true);
    try {
      const { data } = await api.post('/tenant/payment-proof', proof);
      toast.success(data.message);
      setShowProof(false);
      setProof({ amount: '', method: 'bkash', reference: '', paid_at: new Date().toISOString().slice(0, 10), notes: '', evidence_url: '', invoice_ids: [] });
      onReload?.();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>;

  const unpaid = invoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {unpaid.length > 0 && (
        <div className="card" style={{ padding: 16, background: 'var(--danger-bg)', border: '1px solid var(--danger)' }}>
          <div className="between">
            <div>
              <div style={{ fontWeight: 800, color: 'var(--danger)' }}>You have {unpaid.length} unpaid invoice{unpaid.length === 1 ? '' : 's'}</div>
              <div className="cell-sub" style={{ marginTop: 4 }}>Total balance: {money(unpaid.reduce((a, i) => a + Number(i.balance || 0), 0))}</div>
            </div>
            <Button icon={Upload} onClick={() => setShowProof(true)}>Submit Payment Proof</Button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head"><h3>All Invoices</h3><Button size="sm" variant="ghost" icon={Upload} onClick={() => setShowProof(true)}>Submit Payment Proof</Button></div>
        {invoices.length ? (
          <DataTable
            columns={[
              { key: 'invoice_code', header: 'Invoice', render: (r) => <span className="code-chip">{r.invoice_code}</span> },
              { key: 'title', header: 'Description', render: (r) => r.title },
              { key: 'due_date', header: 'Due', render: (r) => r.due_date || '—' },
              { key: 'total', header: 'Total', render: (r) => money(r.total) },
              { key: 'balance', header: 'Balance', render: (r) => r.balance > 0 ? <strong style={{ color: 'var(--danger)' }}>{money(r.balance)}</strong> : <span style={{ color: 'var(--success)' }}>Paid</span> },
              { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            ]}
            rows={invoices}
            onRowClick={setSelected}
          />
        ) : <EmptyState title="No invoices yet" sub="Invoices will appear once your property manager raises them." />}
      </div>

      <div className="card">
        <div className="card-head"><h3>Payment Receipts</h3></div>
        {receipts.length ? (
          <DataTable
            columns={[
              { key: 'payment_code', header: 'Receipt', render: (r) => <span className="code-chip">{r.payment_code}</span> },
              { key: 'invoice_code', header: 'For invoice', render: (r) => <span className="cell-sub">{r.invoice_code} · {r.invoice_title}</span> },
              { key: 'method', header: 'Method' },
              { key: 'amount', header: 'Amount', render: (r) => <strong>{money(r.amount)}</strong> },
              { key: 'paid_at', header: 'Paid', render: (r) => r.paid_at ? new Date(r.paid_at).toLocaleDateString() : '—' },
              { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            ]}
            rows={receipts}
          />
        ) : <EmptyState title="No receipts yet" sub="Once you make a payment and it's reconciled, receipts appear here." />}
      </div>

      {selected && (
        <Drawer title={`Invoice ${selected.invoice_code}`} width={720} onClose={() => setSelected(null)}>
          <InvoiceDetail id={selected.id} />
        </Drawer>
      )}

      {showProof && (
        <Drawer title="Submit Payment Proof" width={520} onClose={() => setShowProof(false)}
          footer={<><Button variant="ghost" onClick={() => setShowProof(false)}>Cancel</Button><Button onClick={submitProof} disabled={saving}>{saving ? <Spinner /> : 'Submit Proof'}</Button></>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p className="cell-sub" style={{ margin: 0 }}>Made a payment? Submit the details so your property manager can reconcile it.</p>
            <div className="form-grid">
              <Field label="Amount (BDT)" required><Input type="number" value={proof.amount} onChange={(e) => setProof((s) => ({ ...s, amount: e.target.value }))} placeholder="20000" /></Field>
              <Field label="Method" required>
                <Select value={proof.method} onChange={(e) => setProof((s) => ({ ...s, method: e.target.value }))}>
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card</option>
                </Select>
              </Field>
              <Field label="Reference / Txn ID"><Input value={proof.reference} onChange={(e) => setProof((s) => ({ ...s, reference: e.target.value }))} placeholder="TX123456" /></Field>
              <Field label="Paid on"><Input type="date" value={proof.paid_at} onChange={(e) => setProof((s) => ({ ...s, paid_at: e.target.value }))} /></Field>
            </div>
            <Field label="Evidence URL (screenshot / receipt link)"><Input value={proof.evidence_url} onChange={(e) => setProof((s) => ({ ...s, evidence_url: e.target.value }))} placeholder="https://…" /></Field>
            <Field label="Notes"><Textarea rows={2} value={proof.notes} onChange={(e) => setProof((s) => ({ ...s, notes: e.target.value }))} placeholder="Any details…" /></Field>
          </div>
        </Drawer>
      )}
    </div>
  );
}

function InvoiceDetail({ id }) {
  const [data, setData] = useState(null);
  useEffect(() => { (async () => { try { const { data } = await api.get(`/tenant/invoices/${id}`); setData(data.data); } catch {} })(); }, [id]);
  if (!data) return <div style={{ padding: 20, textAlign: 'center' }}><Spinner /></div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="card" style={{ padding: 14, background: 'var(--surface-2)' }}>
        <KV k="Title" v={data.invoice.title} />
        <KV k="Total" v={money(data.invoice.total)} />
        <KV k="Balance" v={data.invoice.balance > 0 ? <strong style={{ color: 'var(--danger)' }}>{money(data.invoice.balance)}</strong> : <span style={{ color: 'var(--success)' }}>Paid</span>} />
        <KV k="Due date" v={data.invoice.due_date || '—'} />
        <KV k="Status" v={<StatusBadge status={data.invoice.status} />} />
      </div>
      {data.items.length > 0 && (
        <div>
          <h4 className="form-section-title">Items</h4>
          <DataTable
            columns={[
              { key: 'description', header: 'Description' },
              { key: 'quantity', header: 'Qty' },
              { key: 'unit_price', header: 'Unit', render: (r) => money(r.unit_price) },
              { key: 'amount', header: 'Amount', render: (r) => <strong>{money(r.amount)}</strong> },
            ]}
            rows={data.items}
          />
        </div>
      )}
      {data.payments.length > 0 && (
        <div>
          <h4 className="form-section-title">Payments</h4>
          <DataTable
            columns={[
              { key: 'payment_code', header: 'Receipt' },
              { key: 'method', header: 'Method' },
              { key: 'amount', header: 'Amount', render: (r) => money(r.amount) },
              { key: 'paid_at', header: 'Paid', render: (r) => r.paid_at ? new Date(r.paid_at).toLocaleDateString() : '—' },
            ]}
            rows={data.payments}
          />
        </div>
      )}
    </div>
  );
}

// ─── MAINTENANCE TAB ────────────────────────────────────────────────────────
function MaintenanceTab() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ title: '', scope: '', severity: 'normal', category: 'general', before_photos_text: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/tenant/work-orders'); setRows(data.data || []); }
    catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.title) return toast.error('Title required');
    setSaving(true);
    try {
      const before_photos = form.before_photos_text.split('\n').map((u) => u.trim()).filter(Boolean);
      const { data } = await api.post('/tenant/work-orders', { title: form.title, scope: form.scope, severity: form.severity, category: form.category, before_photos });
      toast.success(data.message);
      setShow(false); setForm({ title: '', scope: '', severity: 'normal', category: 'general', before_photos_text: '' });
      await load();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: 14 }}>
        <div className="between">
          <div>
            <h4 style={{ margin: 0 }}>Report a maintenance issue</h4>
            <div className="cell-sub" style={{ marginTop: 4 }}>Broken tap? AC not cooling? Report it here — your property manager triages within 24h.</div>
          </div>
          <Button icon={Wrench} onClick={() => setShow(true)}>New Request</Button>
        </div>
      </div>

      {rows.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((w) => (
            <div key={w.id} className="card" style={{ padding: 12 }}>
              <div className="between">
                <div>
                  <div style={{ fontWeight: 700 }}>{w.title}</div>
                  <div className="cell-sub">{w.work_order_code} · {w.scheduled_date ? `Scheduled ${w.scheduled_date}` : 'Not scheduled yet'}</div>
                  {w.scope && <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--muted)' }}>{w.scope}</div>}
                </div>
                <StatusBadge status={w.status} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No maintenance requests yet" sub="You'll see the status of all your requests here." icon={Wrench} />
      )}

      {show && (
        <Drawer title="New Maintenance Request" width={560} onClose={() => setShow(false)}
          footer={<><Button variant="ghost" onClick={() => setShow(false)}>Cancel</Button><Button onClick={submit} disabled={saving}>{saving ? <Spinner /> : 'Submit'}</Button></>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Title / short summary" required><Input value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} placeholder="AC not cooling in living room" /></Field>
            <div className="form-grid">
              <Field label="Severity">
                <Select value={form.severity} onChange={(e) => setForm((s) => ({ ...s, severity: e.target.value }))}>
                  <option value="cosmetic">Cosmetic — can wait</option>
                  <option value="normal">Normal — routine</option>
                  <option value="urgent">Urgent — days matter</option>
                  <option value="emergency">Emergency — right now</option>
                </Select>
              </Field>
              <Field label="Category">
                <Select value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}>
                  <option value="plumbing">Plumbing</option>
                  <option value="electrical">Electrical</option>
                  <option value="ac">Air conditioning</option>
                  <option value="appliance">Appliance</option>
                  <option value="structural">Structural / building</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="security">Security / locks</option>
                  <option value="general">General</option>
                </Select>
              </Field>
            </div>
            <Field label="Details / description"><Textarea rows={4} value={form.scope} onChange={(e) => setForm((s) => ({ ...s, scope: e.target.value }))} placeholder="Started yesterday. Filters may need cleaning…" /></Field>
            <Field label="Photo URLs (one per line — paste hosted URLs)"><Textarea rows={2} value={form.before_photos_text} onChange={(e) => setForm((s) => ({ ...s, before_photos_text: e.target.value }))} placeholder="https://…" /></Field>
            <div className="cell-sub" style={{ fontSize: 12, padding: 8, background: 'var(--surface-2)', borderRadius: 6 }}>
              <strong>Emergency</strong> = same-day response. <strong>Urgent</strong> = 3-day SLA. <strong>Normal</strong> = 1-week SLA. If truly urgent, also call your property manager directly.
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
}

// ─── DOCUMENTS TAB ──────────────────────────────────────────────────────────
function DocumentsTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { try { const { data } = await api.get('/tenant/documents'); setRows(data.data || []); } catch {} finally { setLoading(false); } })(); }, []);
  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>;
  if (!rows.length) return <EmptyState title="No documents shared yet" sub="Your lease agreement, receipts and renewal offers will appear here." icon={FileText} />;
  return (
    <div className="card">
      <DataTable
        columns={[
          { key: 'title', header: 'Title', render: (r) => <><FileText size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} /> {r.title}</> },
          { key: 'doc_type', header: 'Type', render: (r) => <span className="cell-sub">{r.doc_type}</span> },
          { key: 'created_at', header: 'Date', render: (r) => new Date(r.created_at).toLocaleDateString() },
          { key: 'file', header: '', render: (r) => <a href={r.file_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Open</a> },
        ]}
        rows={rows}
      />
    </div>
  );
}

// ─── MESSAGES TAB ───────────────────────────────────────────────────────────
function MessagesTab() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ subject: '', body: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/tenant/messages'); setRows(data.data || []); }
    catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const send = async () => {
    if (!form.body) return toast.error('Message body required');
    setSaving(true);
    try {
      await api.post('/tenant/messages', form);
      toast.success('Message sent');
      setForm({ subject: '', body: '' });
      await load();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: 14 }}>
        <h4 className="form-section-title" style={{ marginTop: 0 }}>Send a message to your property manager</h4>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
          <Field label="Subject"><Input value={form.subject} onChange={(e) => setForm((s) => ({ ...s, subject: e.target.value }))} placeholder="Quick summary…" /></Field>
          <Field label="Message" required><Textarea rows={3} value={form.body} onChange={(e) => setForm((s) => ({ ...s, body: e.target.value }))} placeholder="Type your message…" /></Field>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <Button icon={Send} onClick={send} disabled={saving}>{saving ? <Spinner /> : 'Send'}</Button>
        </div>
      </div>

      {rows.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((c) => (
            <div key={c.id} className="card" style={{ padding: 12, borderLeft: `3px solid var(--${c.direction === 'inbound' ? 'primary' : c.direction === 'outbound' ? 'success' : 'muted'})` }}>
              <div className="between">
                <div style={{ fontWeight: 700 }}>{c.subject || '(no subject)'}</div>
                <div className="cell-sub">{new Date(c.occurred_at).toLocaleString()}</div>
              </div>
              <div className="cell-sub" style={{ marginTop: 2 }}>{c.channel} · {c.direction === 'inbound' ? 'you → staff' : c.direction === 'outbound' ? 'staff → you' : 'internal'}</div>
              {c.body && <div style={{ marginTop: 6, fontSize: 13, whiteSpace: 'pre-wrap' }}>{c.body}</div>}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No messages yet" sub="Start a conversation with your property manager." icon={MessageCircle} />
      )}
    </div>
  );
}
