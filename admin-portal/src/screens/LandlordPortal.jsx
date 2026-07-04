import React, { useCallback, useEffect, useState } from 'react';
import {
  Home, FileText, Wallet, Building2, Wrench, AlertTriangle, Check, X,
  Send, Download, Mail, ClipboardCheck, MessageCircle, RefreshCw, ArrowLeft, KeyRound,
} from 'lucide-react';
import api from '../services/api';
import { PageHead, DataTable, StatusBadge, Badge, Spinner, EmptyState, Field, Input, Textarea, Button, Drawer, KV } from '../ui/kit';
import { useToast } from '../context/ToastContext';

const money = (v) => 'BDT ' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TABS = [
  { key: 'portfolio', label: 'My Portfolio', icon: Home },
  { key: 'statements', label: 'Statements', icon: FileText },
  { key: 'approvals', label: 'Approvals', icon: ClipboardCheck },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'messages', label: 'Messages', icon: MessageCircle },
];

export default function LandlordPortal() {
  const toast = useToast();
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState('portfolio');
  const [loading, setLoading] = useState(true);
  const [openProperty, setOpenProperty] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/landlord/me');
      setMe(data.data);
    } catch (e) {
      setMe({ error: e.response?.data?.error || 'Failed to load your portal' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>;
  if (me?.error) return (
    <EmptyState
      icon={AlertTriangle}
      title="Portal not linked"
      sub={me.error}
    />
  );

  const m = me.metrics;

  return (
    <>
      <PageHead
        title={`Welcome, ${me.contact?.full_name || 'Landlord'}`}
        desc="Your Seventh Sky property portfolio — properties, statements, approvals, and messages."
        actions={<Button variant="ghost" icon={RefreshCw} onClick={load}>Refresh</Button>}
      />

      {/* Headline metrics */}
      <div className="grid grid-4">
        <MetricCard icon={Home} label="Properties" value={m.total_properties} tone="blue" />
        <MetricCard icon={KeyRound} label="Active tenancies" value={m.active_tenancies} tone="green" />
        <MetricCard icon={ClipboardCheck} label="Approvals waiting" value={m.approvals_waiting} tone={m.approvals_waiting ? 'red' : 'green'} />
        <MetricCard icon={Mail} label="Unread statements" value={m.unsent_statements} tone={m.unsent_statements ? 'amber' : 'green'} />
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginTop: 20 }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              <Icon size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} /> {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 8 }}>
        {tab === 'portfolio' && <PortfolioTab onOpen={setOpenProperty} />}
        {tab === 'statements' && <StatementsTab />}
        {tab === 'approvals' && <ApprovalsTab onReload={load} />}
        {tab === 'documents' && <DocumentsTab />}
        {tab === 'messages' && <MessagesTab />}
      </div>

      {openProperty && <PropertyDrawer propertyId={openProperty} onClose={() => setOpenProperty(null)} />}
    </>
  );
}

// ─── METRIC CARD ────────────────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, tone }) {
  const color = { blue: 'var(--primary)', green: 'var(--success)', amber: 'var(--warning)', red: 'var(--danger)' }[tone] || 'var(--text)';
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: `var(--${tone}-bg)`, color, display: 'grid', placeItems: 'center' }}>
          <Icon size={18} />
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, color }}>{value}</div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700, marginTop: 4, letterSpacing: 0.3 }}>{label}</div>
        </div>
      </div>
    </div>
  );
}

// ─── PORTFOLIO TAB ──────────────────────────────────────────────────────────
function PortfolioTab({ onOpen }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { try { const { data } = await api.get('/landlord/portfolio'); setRows(data.data || []); } catch {} finally { setLoading(false); } })(); }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>;
  if (!rows.length) return <EmptyState title="No properties yet" sub="Your Seventh Sky property manager will add your properties here." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {rows.map((p) => <PortfolioCard key={p.id} p={p} onOpen={() => onOpen(p.id)} />)}
    </div>
  );
}

function PortfolioCard({ p, onOpen }) {
  return (
    <div className="card" onClick={onOpen} style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}>
      <div style={{ display: 'flex', gap: 12 }}>
        {p.featured_image_url && (
          <div style={{ width: 160, background: `url(${p.featured_image_url}) center/cover`, minHeight: 120 }} />
        )}
        <div style={{ padding: 14, flex: 1 }}>
          <div className="between">
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{p.title}</div>
              <div className="cell-sub">{[p.area, p.district].filter(Boolean).join(', ')} · {p.property_code}</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <StatusBadge status={p.status} />
              <StatusBadge status={p.pm_status} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginTop: 12, fontSize: 12 }}>
            <div>
              <div className="cell-sub">Active tenant</div>
              <div style={{ fontWeight: 700 }}>{p.active_tenant?.tenant_name || '—'}</div>
            </div>
            <div>
              <div className="cell-sub">Monthly rent</div>
              <div style={{ fontWeight: 700 }}>{money(p.approved_monthly_rent || p.active_tenant?.monthly_rent)}</div>
            </div>
            <div>
              <div className="cell-sub">Rent this month</div>
              <div style={{ fontWeight: 700, color: p.rent_this_month.outstanding > 0 ? 'var(--danger)' : 'var(--success)' }}>
                {money(p.rent_this_month.collected)}
                {p.rent_this_month.outstanding > 0 && <span style={{ color: 'var(--danger)', fontWeight: 500, fontSize: 11 }}> · {money(p.rent_this_month.outstanding)} due</span>}
              </div>
            </div>
            <div>
              <div className="cell-sub">Open items</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                {p.open_applications > 0 && <Badge tone="amber">{p.open_applications} apps</Badge>}
                {p.open_work_orders > 0 && <Badge tone="blue">{p.open_work_orders} WOs</Badge>}
                {p.open_applications === 0 && p.open_work_orders === 0 && <span className="cell-sub">—</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── STATEMENTS TAB ─────────────────────────────────────────────────────────
function StatementsTab() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  useEffect(() => { (async () => { try { const { data } = await api.get('/landlord/statements'); setRows(data.data || []); } catch {} finally { setLoading(false); } })(); }, []);

  const openPrintable = async (id) => {
    try {
      const { data } = await api.get(`/landlord/statements/${id}/pdf.html`, { responseType: 'text' });
      const blob = new Blob([data], { type: 'text/html' });
      window.open(URL.createObjectURL(blob), '_blank');
    } catch { toast.error('Failed to open statement'); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>;
  if (!rows.length) return <EmptyState title="No statements yet" sub="Statements will appear when your property manager generates them." />;

  const columns = [
    { key: 'period_label', header: 'Period', render: (r) => <><strong>{r.period_label}</strong> <span className="cell-sub">· {r.period_start}→{r.period_end}</span></> },
    { key: 'property', header: 'Property', render: (r) => <div><div className="cell-strong">{r.property?.title || '—'}</div><div className="cell-sub">{r.property?.property_code || ''}</div></div> },
    { key: 'rent_collected', header: 'Rent', render: (r) => money(r.rent_collected) },
    { key: 'total_deductions', header: 'Deductions', render: (r) => <span style={{ color: 'var(--danger)' }}>({money(r.total_deductions)})</span> },
    { key: 'net_disbursement', header: 'Net', render: (r) => <strong>{money(r.net_disbursement)}</strong> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'actions', header: '', render: (r) => (
      <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
        <Button size="sm" variant="ghost" icon={Download} onClick={() => openPrintable(r.id)}>PDF</Button>
      </div>
    ) },
  ];
  return (
    <>
      <div className="card"><DataTable columns={columns} rows={rows} onRowClick={setSelected} /></div>
      {selected && (
        <Drawer title={`Statement ${selected.statement_code}`} width={720} onClose={() => setSelected(null)}
          footer={<><Button variant="ghost" onClick={() => setSelected(null)}>Close</Button><Button icon={Download} onClick={() => openPrintable(selected.id)}>Print / Save as PDF</Button></>}>
          <StatementView data={selected} />
        </Drawer>
      )}
    </>
  );
}

function StatementView({ data }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card" style={{ padding: 12, background: 'var(--surface-2)' }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>Property</div>
        <div style={{ fontWeight: 700, marginTop: 4 }}>{data.property?.title || '—'}</div>
        <div className="cell-sub">{data.property?.property_code} · Period {data.period_label} · {data.period_start} → {data.period_end}</div>
      </div>

      <div className="card" style={{ padding: 14, background: 'var(--primary-50)', borderColor: 'var(--primary-100)' }}>
        <SummaryRow label="Opening balance" value={money(data.opening_balance)} strong />
        <SummaryRow label="Rent collected" value={money(data.rent_collected)} />
        <SummaryRow label="Service charge collected" value={money(data.service_charge_collected)} />
        {Number(data.arrears_recovered) > 0 && <SummaryRow label="Arrears recovered" value={money(data.arrears_recovered)} />}
        <SummaryRow label="Total credits" value={money(data.total_credits)} strong />
        <SummaryRow label="Management fee" value={`(${money(data.management_fee)})`} />
        {Number(data.maintenance_deductions) > 0 && <SummaryRow label="Maintenance" value={`(${money(data.maintenance_deductions)})`} />}
        {Number(data.utility_deductions) > 0 && <SummaryRow label="Utility" value={`(${money(data.utility_deductions)})`} />}
        {Number(data.landlord_bills_deductions) > 0 && <SummaryRow label="Landlord bills" value={`(${money(data.landlord_bills_deductions)})`} />}
        <SummaryRow label="Total deductions" value={`(${money(data.total_deductions)})`} strong />
        <div style={{ borderTop: '2px solid var(--primary)', marginTop: 6, paddingTop: 8 }}>
          <SummaryRow label="NET DISBURSEMENT" value={money(data.net_disbursement)} big />
        </div>
        <SummaryRow label="Closing balance" value={money(data.closing_balance)} strong />
      </div>
    </div>
  );
}
function SummaryRow({ label, value, strong, big }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: big ? 16 : 13, fontWeight: big ? 800 : strong ? 700 : 500, color: big ? 'var(--primary)' : 'var(--text)' }}>
      <span>{label}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

// ─── APPROVALS TAB ──────────────────────────────────────────────────────────
function ApprovalsTab({ onReload }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    try { const { data } = await api.get('/landlord/approvals'); setData(data.data); } catch {}
  }, []);
  useEffect(() => { load(); }, [load]);

  const decide = async (appId, decision) => {
    setBusy(appId + decision);
    try {
      await api.post(`/landlord/approvals/application/${appId}/decide`, { decision, note });
      toast.success(`Application ${decision}`);
      setNote('');
      await load();
      onReload?.();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setBusy(null); }
  };

  if (!data) return <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>;
  const { applications, work_orders, renewals = [], settlements = [], total } = data;
  if (!total) return <EmptyState title="Nothing needs your approval" sub="Your property manager will notify you when items require your decision." icon={Check} />;

  const decideRenewal = async (id, decision) => {
    try {
      await api.post(`/landlord/approvals/renewal/${id}/decide`, { decision, note });
      toast.success(`Renewal ${decision}`);
      setNote('');
      await load();
      onReload?.();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  };
  const decideSettlement = async (id, decision) => {
    try {
      await api.post(`/landlord/approvals/settlement/${id}/decide`, { decision, note });
      toast.success(`Settlement ${decision}`);
      setNote('');
      await load();
      onReload?.();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {renewals.length > 0 && (
        <div>
          <h4 className="form-section-title">Lease Renewals ({renewals.length})</h4>
          {renewals.map((t) => (
            <div key={t.id} className="card" style={{ padding: 14, marginBottom: 10 }}>
              <div className="between">
                <div>
                  <div style={{ fontWeight: 700 }}>Renewal proposal — {t.Property?.title}</div>
                  <div className="cell-sub">Tenant: {t.tenant?.full_name} · Current rent {money(t.monthly_rent)}, ends {t.lease_end}</div>
                  <div style={{ marginTop: 6, fontSize: 13 }}><strong>Proposed:</strong> {money(t.renewal_offer_rent)}/mo · new end {t.renewal_offer_lease_end || '—'}</div>
                  {t.renewal_notes && <div className="cell-sub" style={{ marginTop: 4 }}>{t.renewal_notes}</div>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                <Button size="sm" variant="ghost" style={{ color: 'var(--danger)' }} onClick={() => decideRenewal(t.id, 'declined')}>Decline</Button>
                <Button size="sm" onClick={() => decideRenewal(t.id, 'approved')}>Approve</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {settlements.length > 0 && (
        <div>
          <h4 className="form-section-title">Deposit Settlements ({settlements.length})</h4>
          {settlements.map((s) => (
            <div key={s.id} className="card" style={{ padding: 14, marginBottom: 10 }}>
              <div className="between">
                <div>
                  <div style={{ fontWeight: 700 }}>Deposit settlement · {s.settlement_code}</div>
                  <div className="cell-sub">Deposit held {money(s.deposit_held)} · Deductions <span style={{ color: 'var(--danger)' }}>({money(s.total_deductions)})</span> · Refund <strong>{money(s.refund_amount)}</strong></div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                <Button size="sm" variant="ghost" style={{ color: 'var(--danger)' }} onClick={() => decideSettlement(s.id, 'disputed')}>Dispute</Button>
                <Button size="sm" onClick={() => decideSettlement(s.id, 'approved')}>Approve</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {applications.length > 0 && (
        <div>
          <h4 className="form-section-title">Tenant Applications ({applications.length})</h4>
          {applications.map((a) => (
            <div key={a.id} className="card" style={{ padding: 14, marginBottom: 10 }}>
              <div className="between">
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{a.applicant_name}</div>
                  <div className="cell-sub">{a.property?.title} · {a.property?.property_code}</div>
                  <div className="cell-sub" style={{ marginTop: 4 }}>Income: {money(a.monthly_income)} · Employer: {a.employer || '—'} · Move-in: {a.preferred_move_in || '—'}</div>
                  {a.notes && <div style={{ fontSize: 12, marginTop: 6 }}>Manager note: {a.notes}</div>}
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <Textarea rows={2} placeholder="Add a note (optional)…" value={note} onChange={(e) => setNote(e.target.value)} />
                <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                  <Button size="sm" variant="ghost" onClick={() => decide(a.id, 'hold')} disabled={busy}>Hold</Button>
                  <Button size="sm" variant="ghost" style={{ color: 'var(--danger)' }} onClick={() => decide(a.id, 'rejected')} disabled={busy}>{busy === a.id + 'rejected' ? <Spinner /> : <><X size={13} /> Reject</>}</Button>
                  <Button size="sm" onClick={() => decide(a.id, 'approved')} disabled={busy}>{busy === a.id + 'approved' ? <Spinner /> : <><Check size={13} /> Approve</>}</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {work_orders.length > 0 && (
        <div>
          <h4 className="form-section-title">Maintenance Requests ({work_orders.length})</h4>
          {work_orders.map((w) => <WorkOrderApprovalCard key={w.id} wo={w} onReload={load} onReloadPortfolio={onReload} />)}
        </div>
      )}
    </div>
  );
}

function WorkOrderApprovalCard({ wo, onReload, onReloadPortfolio }) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(null);
  const decide = async (decision) => {
    setBusy(decision);
    try {
      await api.post(`/landlord/approvals/work-order/${wo.id}/decide`, { decision, note });
      toast.success(`Work order ${decision}`);
      setNote('');
      await onReload();
      onReloadPortfolio?.();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setBusy(null); }
  };
  const sevTone = { emergency: 'red', urgent: 'amber', normal: 'blue', cosmetic: 'grey' }[wo.severity] || 'grey';
  return (
    <div className="card" style={{ padding: 14, marginBottom: 10 }}>
      <div className="between" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700 }}>{wo.title}</span>
            <Badge tone={sevTone} dot>{wo.severity || 'normal'}</Badge>
            <Badge tone="blue">{wo.category || 'general'}</Badge>
          </div>
          <div className="cell-sub" style={{ marginTop: 4 }}>
            {wo.property?.title} · Estimated: <strong>{money(wo.estimated_cost)}</strong>
            {wo.sla_due_at && <> · SLA {new Date(wo.sla_due_at).toLocaleDateString()}</>}
          </div>
          {wo.scope && <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--muted)' }}>{wo.scope}</div>}
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <Textarea rows={2} placeholder="Add a note to the property manager (optional)…" value={note} onChange={(e) => setNote(e.target.value)} />
        <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
          <Button size="sm" variant="ghost" style={{ color: 'var(--danger)' }} onClick={() => decide('rejected')} disabled={busy}>
            {busy === 'rejected' ? <Spinner /> : <><X size={13} /> Reject</>}
          </Button>
          <Button size="sm" onClick={() => decide('approved')} disabled={busy}>
            {busy === 'approved' ? <Spinner /> : <><Check size={13} /> Approve</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── DOCUMENTS TAB ──────────────────────────────────────────────────────────
function DocumentsTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { try { const { data } = await api.get('/landlord/documents'); setRows(data.data || []); } catch {} finally { setLoading(false); } })(); }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>;
  if (!rows.length) return <EmptyState title="No documents shared yet" sub="Your property manager will share statements, agreements, and reports here." icon={FileText} />;

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
  const [portfolio, setPortfolio] = useState([]);
  const [form, setForm] = useState({ property_id: '', subject: '', body: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: m }, { data: p }] = await Promise.all([
        api.get('/landlord/messages'),
        api.get('/landlord/portfolio'),
      ]);
      setRows(m.data || []);
      setPortfolio(p.data || []);
    } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const send = async () => {
    if (!form.property_id || !form.body) return toast.error('Property and message body required');
    setSaving(true);
    try {
      await api.post('/landlord/messages', form);
      toast.success('Message sent');
      setForm({ property_id: '', subject: '', body: '' });
      await load();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: 14 }}>
        <h4 className="form-section-title" style={{ marginTop: 0 }}>Send a message to your property manager</h4>
        <div className="form-grid">
          <Field label="Property" required>
            <select className="select" value={form.property_id} onChange={(e) => setForm((s) => ({ ...s, property_id: e.target.value }))}>
              <option value="">Select property…</option>
              {portfolio.map((p) => <option key={p.id} value={p.id}>{p.title} · {p.property_code}</option>)}
            </select>
          </Field>
          <Field label="Subject"><Input value={form.subject} onChange={(e) => setForm((s) => ({ ...s, subject: e.target.value }))} placeholder="Quick summary…" /></Field>
        </div>
        <Field label="Message" required><Textarea rows={3} value={form.body} onChange={(e) => setForm((s) => ({ ...s, body: e.target.value }))} placeholder="Type your message…" /></Field>
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

// ─── PROPERTY DRAWER (owner-scoped detail) ──────────────────────────────────
function PropertyDrawer({ propertyId, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => { (async () => { try { const { data } = await api.get(`/landlord/properties/${propertyId}`); setData(data.data); } catch {} })(); }, [propertyId]);

  if (!data) return <Drawer title="Loading…" onClose={onClose}><div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div></Drawer>;

  const p = data.property;
  const state = data.state;
  return (
    <Drawer title={p.title} width={720} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="card" style={{ padding: 12, background: 'var(--surface-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="code-chip">{p.property_code}</span>
            <StatusBadge status={p.status} />
            <StatusBadge status={p.pm_status} />
          </div>
          <div className="cell-sub" style={{ marginTop: 6 }}>{[p.address, p.area, p.district].filter(Boolean).join(', ')}</div>
        </div>

        {state?.financial && (
          <div className="card" style={{ padding: 14, background: 'var(--primary-50)' }}>
            <KV k="Approved monthly rent" v={money(state.financial.approved_monthly_rent)} />
            <KV k="Owner balance" v={money(state.financial.owner_balance)} />
            <KV k="Tenant balance" v={money(state.financial.tenant_balance)} />
            {state.financial.lease_end && <KV k="Lease ends" v={`${state.financial.lease_end} (${state.financial.days_until_lease_end}d)`} />}
          </div>
        )}

        {data.tenancies.length > 0 && (
          <div>
            <h4 className="form-section-title">Tenancies</h4>
            {data.tenancies.map((t) => (
              <div key={t.id} className="card" style={{ padding: 12, marginBottom: 8 }}>
                <div className="between">
                  <div>
                    <div style={{ fontWeight: 700 }}>{t.tenant?.full_name || '—'}</div>
                    <div className="cell-sub">{t.tenancy_code} · Rent {money(t.monthly_rent)} · {t.lease_start} → {t.lease_end}</div>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              </div>
            ))}
          </div>
        )}

        {data.media.length > 0 && (
          <div>
            <h4 className="form-section-title">Photos</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
              {data.media.map((m) => <img key={m.id} src={m.file_url} alt="" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 6 }} />)}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
