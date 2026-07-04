import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, FileText, RefreshCw, Send, Download, Filter, Building2, Calendar, Wallet } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, DataTable, StatusBadge, Drawer, Spinner, Badge, Button, Field, Input, Select, Textarea, KV } from '../ui/kit';
import { Combo } from '../ui/pickers';

const money = (v) => 'BDT ' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const contactLabel = (c) => `${c.full_name}${c.primary_phone ? ' · ' + c.primary_phone : ''}`;
const propLabel = (p) => `${p.title} · ${p.property_code}`;

const currentPeriod = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'ready', label: 'Ready' },
  { key: 'sent', label: 'Sent' },
  { key: 'paid', label: 'Paid' },
];

/**
 * Owner Statements — global list, generate, preview, send, printable PDF.
 * Also embeddable via propertyId for the per-property statements tab.
 */
export default function OwnerStatements({ propertyId = null, ownerContactId = null, embedded = false }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [period, setPeriod] = useState('');

  const [showGenerate, setShowGenerate] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [selected, setSelected] = useState(null);

  const [genForm, setGenForm] = useState({ owner_contact_id: ownerContactId, property_id: propertyId, period_label: currentPeriod() });
  const [bulkPeriod, setBulkPeriod] = useState(currentPeriod());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ include_counts: 'true', limit: '200' });
      if (propertyId) params.set('property_id', propertyId);
      if (ownerContactId) params.set('owner_contact_id', ownerContactId);
      if (status !== 'all') params.set('status', status);
      if (period) params.set('period_label', period);
      const { data } = await api.get(`/owner-statements?${params.toString()}`);
      setRows(data.data || []);
      setCounts(data.status_counts || {});
    } catch { toast.error('Failed to load statements'); }
    finally { setLoading(false); }
  }, [propertyId, ownerContactId, status, period, toast]);

  useEffect(() => { load(); }, [load]);

  // ── Preview (compute without persisting) ──
  const doPreview = async () => {
    if (!genForm.owner_contact_id || !genForm.period_label) return toast.error('Owner and period required');
    setSaving(true);
    try {
      const { data } = await api.post('/owner-statements/preview', genForm);
      setPreviewData(data);
      setShowPreview(true);
    } catch (e) { toast.error(e.response?.data?.error || 'Preview failed'); }
    finally { setSaving(false); }
  };

  // ── Generate + persist ──
  const doGenerate = async (regenerate = false) => {
    if (!genForm.owner_contact_id || !genForm.period_label) return toast.error('Owner and period required');
    setSaving(true);
    try {
      const { data } = await api.post('/owner-statements', { ...genForm, regenerate });
      toast.success(data.message);
      setShowGenerate(false);
      setShowPreview(false);
      await load();
      setSelected(data.data);
    } catch (e) { toast.error(e.response?.data?.error || 'Generate failed'); }
    finally { setSaving(false); }
  };

  // ── Bulk generate for all managed properties in a period ──
  const doBulk = async () => {
    setSaving(true);
    try {
      const { data } = await api.post('/owner-statements/bulk-generate', { period_label: bulkPeriod });
      toast.success(data.message);
      setShowBulk(false);
      await load();
    } catch (e) { toast.error(e.response?.data?.error || 'Bulk generate failed'); }
    finally { setSaving(false); }
  };

  // ── Mark sent ──
  const markSent = async (id, channel = 'email') => {
    try {
      await api.post(`/owner-statements/${id}/mark-sent`, { channel });
      toast.success('Marked sent');
      await load();
      if (selected?.id === id) {
        const { data } = await api.get(`/owner-statements/${id}`);
        setSelected(data.data);
      }
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  // ── Regenerate ──
  const regenerate = async (row) => {
    setSaving(true);
    try {
      const { data } = await api.post('/owner-statements', { owner_contact_id: row.owner_contact_id, property_id: row.property_id, period_label: row.period_label, regenerate: true });
      toast.success(data.message);
      await load();
      if (selected?.id === row.id) setSelected(data.data);
    } catch (e) { toast.error(e.response?.data?.error || 'Regenerate failed'); }
    finally { setSaving(false); }
  };

  // ── Open printable PDF (fetch via axios so Bearer works, then blob-open) ──
  const openPrintable = async (id) => {
    try {
      const { data } = await api.get(`/owner-statements/${id}/pdf.html`, { responseType: 'text' });
      const blob = new Blob([data], { type: 'text/html' });
      window.open(URL.createObjectURL(blob), '_blank');
    } catch (e) { toast.error('Failed to open statement'); }
  };

  const columns = [
    { key: 'statement_code', header: 'Code', render: (r) => <span className="code-chip">{r.statement_code}</span> },
    { key: 'period_label', header: 'Period', render: (r) => <><strong>{r.period_label}</strong> <span className="cell-sub">· {r.period_start}→{r.period_end}</span></> },
    { key: 'owner', header: 'Owner', render: (r) => <div><div className="cell-strong">{r.owner?.full_name || '—'}</div><div className="cell-sub">{r.owner?.primary_phone || ''}</div></div> },
    ...(propertyId ? [] : [{ key: 'property', header: 'Property', render: (r) => r.property ? <div><div className="cell-strong">{r.property.title}</div><div className="cell-sub">{r.property.property_code}</div></div> : <span className="cell-sub">Portfolio</span> }]),
    { key: 'net_disbursement', header: 'Net', render: (r) => <strong>{money(r.net_disbursement)}</strong> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'sent', header: 'Sent?', render: (r) => r.sent_at ? <span className="cell-sub">{new Date(r.sent_at).toLocaleDateString()} · {r.sent_channel}</span> : <span style={{ color: 'var(--warning)' }}>Not sent</span> },
  ];

  return (
    <>
      {!embedded && (
        <PageHead
          title="Owner Statements"
          desc="Monthly settlement statements computed from folio ledgers — rent collected, deductions, net disbursement."
          actions={
            <>
              <Button variant="ghost" icon={RefreshCw} onClick={() => setShowBulk(true)}>Bulk Generate</Button>
              <Button icon={Plus} onClick={() => { setGenForm({ owner_contact_id: ownerContactId, property_id: propertyId, period_label: currentPeriod() }); setShowGenerate(true); }}>New Statement</Button>
            </>
          }
        />
      )}

      {embedded && (
        <div className="between" style={{ marginBottom: 12 }}>
          <h4 className="form-section-title" style={{ margin: 0, border: 'none', padding: 0 }}>Owner Statements</h4>
          <Button size="sm" icon={Plus} onClick={() => { setGenForm({ owner_contact_id: ownerContactId, property_id: propertyId, period_label: currentPeriod() }); setShowGenerate(true); }}>Generate Statement</Button>
        </div>
      )}

      <div className="tabs" style={{ flexWrap: 'wrap' }}>
        {STATUS_TABS.map((t) => (
          <button key={t.key} className={`tab ${status === t.key ? 'active' : ''}`} onClick={() => setStatus(t.key)}>
            {t.label}{counts[t.key] != null ? ` (${counts[t.key]})` : (t.key === 'all' && counts.all != null ? ` (${counts.all})` : '')}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-pad" style={{ padding: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Filter size={14} color="var(--muted)" />
          <Field label="Period" style={{ marginBottom: 0 }}>
            <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} style={{ minWidth: 160 }} />
          </Field>
          {period && <Button size="sm" variant="ghost" onClick={() => setPeriod('')}>Clear</Button>}
        </div>
      </div>

      <div className="card">
        <DataTable columns={columns} rows={rows} loading={loading} onRowClick={setSelected} />
      </div>

      {/* ── GENERATE DRAWER ── */}
      {showGenerate && (
        <Drawer title="Generate Owner Statement" width={520} onClose={() => setShowGenerate(false)}
          footer={<><Button variant="ghost" onClick={() => setShowGenerate(false)}>Cancel</Button><Button variant="ghost" onClick={doPreview} disabled={saving}>Preview First</Button><Button onClick={() => doGenerate(false)} disabled={saving}>{saving ? <Spinner /> : 'Generate'}</Button></>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Owner" required>
              <Combo endpoint="/contacts" labelFn={contactLabel} value={genForm.owner_contact_id} onChange={(v) => setGenForm((s) => ({ ...s, owner_contact_id: v }))} placeholder="Select owner contact…" />
            </Field>
            <Field label="Property (leave empty for portfolio-wide)">
              <Combo endpoint="/properties?listing_type=rent" labelFn={propLabel} value={genForm.property_id} onChange={(v) => setGenForm((s) => ({ ...s, property_id: v }))} placeholder="Optional — select property…" />
            </Field>
            <Field label="Period (YYYY-MM)" required>
              <Input type="month" value={genForm.period_label} onChange={(e) => setGenForm((s) => ({ ...s, period_label: e.target.value }))} />
            </Field>
            <div className="cell-sub" style={{ fontSize: 12 }}>
              The statement is computed from the folio's transactions during this period. Preview first if you want to review before persisting.
            </div>
          </div>
        </Drawer>
      )}

      {/* ── PREVIEW DRAWER ── */}
      {showPreview && previewData && (
        <Drawer title="Statement Preview (not saved)" width={720} onClose={() => setShowPreview(false)}
          footer={<><Button variant="ghost" onClick={() => setShowPreview(false)}>Close</Button><Button onClick={() => doGenerate(false)} disabled={saving}>{saving ? <Spinner /> : 'Save Statement'}</Button></>}>
          <StatementView data={previewData.data} owner={previewData.owner} property={previewData.property} preview />
        </Drawer>
      )}

      {/* ── BULK DRAWER ── */}
      {showBulk && (
        <Drawer title="Bulk Generate Statements" width={480} onClose={() => setShowBulk(false)}
          footer={<><Button variant="ghost" onClick={() => setShowBulk(false)}>Cancel</Button><Button onClick={doBulk} disabled={saving}>{saving ? <Spinner /> : 'Generate for All Properties'}</Button></>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p className="cell-sub" style={{ margin: 0 }}>Generates one statement per managed rental property + its current owner for the selected period. Existing statements are skipped (use Regenerate on the row to update them).</p>
            <Field label="Period" required>
              <Input type="month" value={bulkPeriod} onChange={(e) => setBulkPeriod(e.target.value)} />
            </Field>
          </div>
        </Drawer>
      )}

      {/* ── DETAIL DRAWER ── */}
      {selected && (
        <Drawer title={`Statement ${selected.statement_code}`} width={860} onClose={() => setSelected(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
              <Button variant="ghost" icon={RefreshCw} onClick={() => regenerate(selected)}>Regenerate</Button>
              <Button variant="ghost" icon={Download} onClick={() => openPrintable(selected.id)}>Print / PDF</Button>
              {selected.status !== 'sent' && selected.status !== 'paid' && (
                <Button icon={Send} onClick={() => markSent(selected.id, 'email')}>Mark Sent</Button>
              )}
            </>
          }
        >
          <StatementView data={selected} owner={selected.owner} property={selected.property} />
        </Drawer>
      )}
    </>
  );
}

// ── Reusable statement body — used in preview + detail ──
function StatementView({ data, owner, property, preview = false }) {
  if (!data) return <Spinner />;
  const rows = Array.isArray(data.line_items) ? data.line_items : (() => { try { return JSON.parse(data.line_items || '[]'); } catch { return []; } })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {preview && (
        <div style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning)', padding: 10, borderRadius: 6, fontSize: 12.5 }}>
          <strong>Preview only.</strong> Nothing saved yet. Review the numbers, then click Save Statement.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="card" style={{ padding: 12, background: 'var(--surface-2)' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>Owner</div>
          <div style={{ fontWeight: 700, marginTop: 4 }}>{owner?.full_name || '—'}</div>
          <div className="cell-sub">{owner?.primary_phone || ''} · {owner?.email || ''}</div>
        </div>
        <div className="card" style={{ padding: 12, background: 'var(--surface-2)' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>Property</div>
          <div style={{ fontWeight: 700, marginTop: 4 }}>{property?.title || 'Portfolio-wide'}</div>
          <div className="cell-sub">{property?.property_code || ''} · {[property?.area, property?.district].filter(Boolean).join(', ')}</div>
        </div>
      </div>

      {/* Summary block */}
      <div className="card" style={{ padding: 14, background: 'var(--primary-50)', borderColor: 'var(--primary-100)' }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 800 }}>Period {data.period_label} · {data.period_start} → {data.period_end}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 8, fontSize: 13 }}>
          <Line label="Opening balance" value={money(data.opening_balance)} strong />
          <Line label="Rent collected" value={money(data.rent_collected)} />
          <Line label="Service charge collected" value={money(data.service_charge_collected)} />
          {Number(data.arrears_recovered) > 0 && <Line label="Arrears recovered" value={money(data.arrears_recovered)} />}
          {Number(data.other_credits) > 0 && <Line label="Other credits" value={money(data.other_credits)} />}
          <Line label="Total credits" value={money(data.total_credits)} strong />
          <Line label="Management fee" value={`(${money(data.management_fee)})`} />
          {Number(data.maintenance_deductions) > 0 && <Line label="Maintenance" value={`(${money(data.maintenance_deductions)})`} />}
          {Number(data.utility_deductions) > 0 && <Line label="Utility" value={`(${money(data.utility_deductions)})`} />}
          {Number(data.landlord_bills_deductions) > 0 && <Line label="Landlord bills" value={`(${money(data.landlord_bills_deductions)})`} />}
          {Number(data.other_deductions) > 0 && <Line label="Other deductions" value={`(${money(data.other_deductions)})`} />}
          <Line label="Total deductions" value={`(${money(data.total_deductions)})`} strong />
          <div style={{ borderTop: '2px solid var(--primary)', marginTop: 6, paddingTop: 8 }}>
            <Line label="NET DISBURSEMENT" value={money(data.net_disbursement)} big />
          </div>
          <Line label="Closing balance" value={money(data.closing_balance)} strong />
        </div>
      </div>

      {/* Transaction detail */}
      {rows.length > 0 && (
        <div>
          <h4 className="form-section-title">Transaction Detail ({rows.length})</h4>
          <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6 }}>
            <table className="tbl">
              <thead>
                <tr><th>Date</th><th>Description</th><th>Bucket</th><th style={{ textAlign: 'right' }}>Debit</th><th style={{ textAlign: 'right' }}>Credit</th></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.date || '—'}</td>
                    <td>{r.description || '—'}</td>
                    <td className="cell-sub">{(r.bucket || '').replace(/_/g, ' ')}</td>
                    <td style={{ textAlign: 'right' }}>{r.debit > 0 ? money(r.debit) : ''}</td>
                    <td style={{ textAlign: 'right' }}>{r.credit > 0 ? money(r.credit) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {rows.length === 0 && (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 6 }}>
          No transactions in this period. The statement will show zero balances.
        </div>
      )}
    </div>
  );
}

function Line({ label, value, strong, big }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: big ? 16 : 13, fontWeight: big ? 800 : strong ? 700 : 500, color: big ? 'var(--primary)' : 'var(--text)' }}>
      <span>{label}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}
