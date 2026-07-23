import React, { useCallback, useEffect, useState } from 'react';
import { Wallet, TrendingUp, Send, RefreshCw, Building2, ArrowDownToLine, Banknote } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, DataTable, StatusBadge, Spinner, Badge, Button, Field, Input, Select, Textarea, Drawer, KV } from '../ui/kit';

const money = (v) => 'BDT ' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const currentPeriod = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

const TABS = [
  { key: 'owner', label: 'Owner Payouts', icon: Wallet },
  { key: 'history', label: 'Disbursement History', icon: ArrowDownToLine },
  { key: 'income', label: 'Our Income', icon: TrendingUp },
];

export default function Disbursements() {
  const [tab, setTab] = useState('owner');
  return (
    <>
      <PageHead title="Disbursements & Payouts" desc="Pay owners their net held balance, track supplier payouts and tenant refunds, and see Seventh Sky's earned income." />
      <div className="tabs">
        {TABS.map((t) => { const Icon = t.icon; return <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}><Icon size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />{t.label}</button>; })}
      </div>
      <div style={{ marginTop: 8 }}>
        {tab === 'owner' && <OwnerPayoutsTab />}
        {tab === 'history' && <HistoryTab />}
        {tab === 'income' && <IncomeTab />}
      </div>
    </>
  );
}

// ─── OWNER PAYOUTS ──────────────────────────────────────────────────────────
function OwnerPayoutsTab() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pay, setPay] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/disbursements/owner-balances'); setRows(data.data || []); setTotal(data.total_held || 0); }
    catch { toast.error('Failed to load owner balances'); } finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>;

  return (
    <>
      <div className="card" style={{ padding: 16, marginBottom: 16, background: 'var(--primary-50)', borderColor: 'var(--primary-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 700, letterSpacing: 0.4 }}>Total held for owners</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--primary)' }}>{money(total)}</div>
          <div className="cell-sub">Net of management fees already deducted on each rent receipt.</div>
        </div>
        <Button variant="ghost" icon={RefreshCw} onClick={load}>Refresh</Button>
      </div>

      <div className="card">
        <DataTable
          columns={[
            { key: 'owner', header: 'Owner', render: (r) => <div><div className="cell-strong">{r.owner_name || '—'}</div><div className="cell-sub">{r.primary_phone || ''}</div></div> },
            { key: 'property', header: 'Property', render: (r) => r.property_title ? <div><div className="cell-strong">{r.property_title}</div><div className="cell-sub">{r.property_code}</div></div> : <span className="cell-sub">Portfolio folio</span> },
            { key: 'folio', header: 'Folio', render: (r) => <span className="code-chip">{r.folio_code}</span> },
            { key: 'balance', header: 'Held (payable)', render: (r) => <strong style={{ color: Number(r.current_balance) > 0 ? 'var(--success)' : 'var(--muted)' }}>{money(r.current_balance)}</strong> },
            { key: 'action', header: '', render: (r) => Number(r.current_balance) > 0
              ? <Button size="sm" icon={Send} onClick={(e) => { e.stopPropagation(); setPay(r); }}>Pay owner</Button>
              : <span className="cell-sub">Nothing due</span> },
          ]}
          rows={rows}
        />
      </div>

      {pay && <PayOwnerDrawer folio={pay} onClose={() => setPay(null)} onPaid={() => { setPay(null); load(); }} />}
    </>
  );
}

function PayOwnerDrawer({ folio, onClose, onPaid }) {
  const toast = useToast();
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({ amount: '', method: 'bank_transfer', reference: '', period_label: currentPeriod(), notes: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/disbursements/owner/${folio.owner_contact_id}/preview?property_id=${folio.property_id || ''}`);
        setPreview(data.data);
        setForm((s) => ({ ...s, amount: String(data.data.payable || ''), method: data.data.bank?.preferred_payment || 'bank_transfer' }));
      } catch { toast.error('Failed to load preview'); }
    })();
  }, [folio]);

  const submit = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/disbursements/owner', {
        owner_contact_id: folio.owner_contact_id, property_id: folio.property_id,
        amount: Number(form.amount), method: form.method, reference: form.reference,
        period_label: form.period_label, notes: form.notes,
      });
      toast.success(data.message);
      onPaid();
    } catch (e) { toast.error(e.response?.data?.error || 'Payout failed'); }
    finally { setBusy(false); }
  };

  return (
    <Drawer title={`Pay owner — ${folio.owner_name}`} width={560} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={Banknote} onClick={submit} disabled={busy || !Number(form.amount)}>{busy ? <Spinner /> : `Pay ${money(form.amount || 0)}`}</Button></>}>
      {!preview ? <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ padding: 14, background: 'var(--surface-2)' }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>Payable now</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--success)' }}>{money(preview.payable)}</div>
            {preview.breakdown && (
              <div style={{ marginTop: 8, fontSize: 12.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Rent collected</span><span>{money(preview.breakdown.rent_collected)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)' }}><span>Management fees</span><span>({money(preview.breakdown.fees_deducted)})</span></div>
                {preview.breakdown.supplier_bills > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)' }}><span>Supplier bills</span><span>({money(preview.breakdown.supplier_bills)})</span></div>}
                {preview.breakdown.already_paid > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}><span>Already paid</span><span>({money(preview.breakdown.already_paid)})</span></div>}
              </div>
            )}
          </div>

          {preview.bank && (
            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>Disbursement account (from agreement)</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>{preview.bank.bank_name || '—'} · {preview.bank.bank_account_name || ''} · {preview.bank.bank_account_number || ''}</div>
              {(preview.bank.bkash_number || preview.bank.nagad_number) && <div className="cell-sub">bKash: {preview.bank.bkash_number || '—'} · Nagad: {preview.bank.nagad_number || '—'}</div>}
            </div>
          )}

          <div className="form-grid">
            <Field label="Amount to pay (৳)" required><Input type="number" value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))} /></Field>
            <Field label="Method">
              <Select value={form.method} onChange={(e) => setForm((s) => ({ ...s, method: e.target.value }))}>
                <option value="bank_transfer">Bank Transfer</option><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="cheque">Cheque</option><option value="cash">Cash</option>
              </Select>
            </Field>
            <Field label="Reference / Txn ID"><Input value={form.reference} onChange={(e) => setForm((s) => ({ ...s, reference: e.target.value }))} placeholder="Bank slip / txn" /></Field>
            <Field label="Period"><Input type="month" value={form.period_label} onChange={(e) => setForm((s) => ({ ...s, period_label: e.target.value }))} /></Field>
          </div>
          <Field label="Notes"><Textarea rows={2} value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} /></Field>
          <div className="cell-sub" style={{ fontSize: 12 }}>Recording this payout reduces the owner's held balance to reflect it immediately on their dashboard.</div>
        </div>
      )}
    </Drawer>
  );
}

// ─── HISTORY ────────────────────────────────────────────────────────────────
function HistoryTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { try { const { data } = await api.get('/disbursements/owner'); setRows(data.data || []); } catch {} finally { setLoading(false); } })(); }, []);
  return (
    <div className="card">
      <DataTable loading={loading} rows={rows}
        columns={[
          { key: 'disbursement_code', header: 'Code', render: (r) => <span className="code-chip">{r.disbursement_code}</span> },
          { key: 'owner', header: 'Owner', render: (r) => r.owner?.full_name || '—' },
          { key: 'property', header: 'Property', render: (r) => r.property?.title || 'Portfolio' },
          { key: 'period_label', header: 'Period', render: (r) => r.period_label || '—' },
          { key: 'net_amount', header: 'Net paid', render: (r) => <strong>{money(r.net_amount)}</strong> },
          { key: 'balances', header: 'Balance', render: (r) => <span className="cell-sub">{money(r.balance_before)} → {money(r.balance_after)}</span> },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'paid_at', header: 'Paid', render: (r) => r.paid_at ? new Date(r.paid_at).toLocaleDateString() : '—' },
        ]}
      />
    </div>
  );
}

// ─── PM INCOME ──────────────────────────────────────────────────────────────
function IncomeTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { try { const { data } = await api.get('/disbursements/income'); setData(data); } catch {} finally { setLoading(false); } })(); }, []);
  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>;
  if (!data) return null;
  const cats = Object.entries(data.by_category || {});
  return (
    <>
      <div className="card" style={{ padding: 16, marginBottom: 16, background: 'var(--success-bg)', border: '1px solid var(--success)' }}>
        <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--success)', fontWeight: 700 }}>Total earned income</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--success)' }}>{money(data.total_income)}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {cats.map(([c, v]) => <Badge key={c} tone="green">{c.replace(/_/g, ' ')}: {money(v)}</Badge>)}
        </div>
      </div>
      <div className="card">
        <DataTable rows={data.data}
          columns={[
            { key: 'entry_code', header: 'Entry', render: (r) => <span className="code-chip">{r.entry_code}</span> },
            { key: 'category', header: 'Category', render: (r) => <Badge tone="green">{r.category?.replace(/_/g, ' ')}</Badge> },
            { key: 'fee_name', header: 'Fee', render: (r) => r.fee_name },
            { key: 'property', header: 'Property', render: (r) => r.property?.title || '—' },
            { key: 'owner', header: 'Owner', render: (r) => r.owner?.full_name || '—' },
            { key: 'period_label', header: 'Period', render: (r) => r.period_label || '—' },
            { key: 'amount', header: 'Amount', render: (r) => <strong>{money(r.amount)}</strong> },
          ]}
        />
      </div>
    </>
  );
}
