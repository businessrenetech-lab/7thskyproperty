import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Trash2, Wallet, Send, Banknote } from 'lucide-react';
import api from '../../services/api';
import InvoiceCreateModal from './InvoiceCreateModal';
import {
  WtHead, WtTabs, Pill, dateFmt, bdt, StatCards, useCollection, RecordDrawer, useUrlTab,
  WtDrawer, StatusCell, RowActions, Loading, EmptyState, useFocusedRecord, parseJson, toast, errText,
} from './common';

const STATUSES = ['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'];
const TABS = ['All', ...STATUSES];
const PAYOUTS = ['Not Due', 'Pending', 'Cleared'];

const FIELDS = [
  { key: 'client_name', label: 'Client name', required: true },
  { key: 'project_id', label: 'Project ID' },
  { key: 'inv_type', label: 'Invoice type' },
  { key: 'amount', label: 'Amount (৳)', type: 'number', money: true },
  { key: 'outstanding', label: 'Outstanding (৳)', type: 'number', money: true },
  { key: 'due_date', label: 'Due date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: STATUSES, pill: true },
  { key: 'provider_payout', label: 'Provider payout', type: 'select', options: PAYOUTS, pill: true },
];

const num = (v) => Number(v || 0);

/* Record a full or partial payment against an invoice. */
function PaymentDrawer({ invoice, onClose, onConfirm }) {
  const due = num(invoice.outstanding) || num(invoice.amount);
  const [amount, setAmount] = useState(due);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const go = async () => {
    const paid = Number(amount);
    if (!(paid > 0)) { setErr('Enter an amount greater than zero.'); return; }
    if (paid > due) { setErr(`Cannot exceed the outstanding balance of ${bdt(due)}.`); return; }
    setBusy(true); setErr('');
    const remaining = Math.round((due - paid) * 100) / 100;
    try { await onConfirm({ outstanding: remaining, status: remaining <= 0 ? 'Paid' : invoice.status === 'Draft' ? 'Sent' : invoice.status }); }
    catch (e) { setErr(errText(e, 'Could not record the payment')); setBusy(false); }
  };

  return (
    <WtDrawer title="Record Payment" subtitle={`${invoice.code} · ${invoice.client_name}`} onClose={onClose}
      footer={<><button className="wt-btn" onClick={onClose}>Cancel</button><button className="wt-btn primary" disabled={busy} onClick={go}>{busy ? 'Saving…' : 'Record payment'}</button></>}>
      {err && <div className="wt-formerr">{err}</div>}
      <div className="wt-note">Invoice total {bdt(invoice.amount)} · outstanding {bdt(due)}. Settling the balance in full marks the invoice Paid.</div>
      <div className="wt-field">
        <label>Amount received (৳)</label>
        <input className="wt-input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <span className="hint">Leaves {bdt(Math.max(0, due - Number(amount || 0)))} outstanding.</span>
      </div>
    </WtDrawer>
  );
}

export default function Invoices() {
  const nav = useNavigate();
  const { rows, loading, error, reload, patch, remove } = useCollection('invoices');
  const [tab, setTab] = useState('All');
  useUrlTab(TABS, setTab);
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(null);
  const [paying, setPaying] = useState(null);
  const [project, setProject] = useState(null);
  useFocusedRecord(rows, (r) => { setTab('All'); setOpen(r); });

  // milestone schedule of the most recent open project
  useEffect(() => {
    api.get('/wt-ops/projects', { params: { limit: 1 } })
      .then((r) => setProject(Array.isArray(r.data) ? r.data[0] : null))
      .catch(() => setProject(null));
  }, []);
  const milestones = parseJson(project?.milestones, []) || [];

  const counts = useMemo(() => {
    const c = { All: rows.length };
    STATUSES.forEach((s) => { c[s] = rows.filter((r) => (r.status || '').toLowerCase() === s.toLowerCase()).length; });
    return c;
  }, [rows]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => (tab === 'All' || (r.status || '').toLowerCase() === tab.toLowerCase())
      && (!term || [r.code, r.client_name, r.project_id, r.inv_type].some((v) => String(v || '').toLowerCase().includes(term))));
  }, [rows, tab, q]);

  // every figure below is computed from the invoices actually on file
  const stats = useMemo(() => {
    const is = (r, s) => (r.status || '').toLowerCase() === s;
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const pending = rows.filter((r) => is(r, 'sent') || is(r, 'overdue'));
    const overdue = rows.filter((r) => is(r, 'overdue'));
    const paidThisMonth = rows.filter((r) => is(r, 'paid') && new Date(r.updatedAt || r.createdAt) >= monthStart);
    const payoutPending = rows.filter((r) => (r.provider_payout || '').toLowerCase() === 'pending');
    return {
      outstanding: pending.reduce((s, r) => s + (num(r.outstanding) || num(r.amount)), 0),
      outstandingCount: pending.length,
      paidThisMonth: paidThisMonth.reduce((s, r) => s + num(r.amount), 0),
      paidThisMonthCount: paidThisMonth.length,
      overdueCount: overdue.length,
      overdueAmount: overdue.reduce((s, r) => s + (num(r.outstanding) || num(r.amount)), 0),
      payoutPending: payoutPending.reduce((s, r) => s + num(r.amount), 0),
      payoutPendingCount: payoutPending.length,
    };
  }, [rows]);

  const current = open ? rows.find((r) => r.id === open.id) || open : null;

  const recordPayment = async (body) => {
    await patch(paying.id, body, body.status === 'Paid' ? `${paying.code} settled in full` : `Payment recorded on ${paying.code}`);
    setPaying(null);
  };

  return (
    <>
      <WtHead
        title="Invoices & Payments"
        subtitle="Collect deposits, log progress payments, allocate disbursements"
        search={q} onSearch={setQ}
      >
        <button className="wt-btn primary" onClick={() => setCreating(true)}><Plus size={15} /> Create Invoice</button>
      </WtHead>

      <StatCards items={[
        { label: 'Total Outstanding', value: bdt(stats.outstanding), sub: `${stats.outstandingCount} unsettled invoice${stats.outstandingCount === 1 ? '' : 's'}` },
        { label: 'Paid This Month', value: bdt(stats.paidThisMonth), sub: `${stats.paidThisMonthCount} invoice${stats.paidThisMonthCount === 1 ? '' : 's'} settled` },
        { label: 'Overdue', value: `${stats.overdueCount} account${stats.overdueCount === 1 ? '' : 's'}`, sub: stats.overdueAmount ? `${bdt(stats.overdueAmount)} past due` : 'Nothing past due', color: stats.overdueCount ? 'var(--wt-red)' : undefined },
        { label: 'Pending Payouts', value: bdt(stats.payoutPending), sub: `${stats.payoutPendingCount} provider disbursement${stats.payoutPendingCount === 1 ? '' : 's'} due` },
      ]} />

      <WtTabs tabs={TABS} value={tab} onChange={setTab} counts={counts} />

      <div className="wt-card wt-tblcard">
        {loading ? <Loading /> : error ? (
          <EmptyState eyebrow="Error" title="Could not load invoices" hint={error}
            action={<button className="wt-btn" onClick={reload}>Retry</button>} />
        ) : (
          <table className="wt-tbl">
            <thead><tr><th style={{ width: 88 }}>Invoice No</th><th style={{ width: 98 }}>Proj. ID</th><th>Client Name</th><th style={{ width: 128 }}>Type</th><th style={{ width: 116 }}>Amount (BDT)</th><th style={{ width: 106 }}>Due Date</th><th style={{ width: 108 }}>Outstanding</th><th style={{ width: 128 }}>Status</th><th style={{ width: 128 }}>Provider Payout</th><th style={{ width: 44 }} /></tr></thead>
            <tbody>
              {shown.map((r) => {
                const s = (r.status || '').toLowerCase();
                const settled = s === 'paid' || s === 'cancelled';
                return (
                  // Open the full invoice: draft editing, PDF preview and send.
                  <tr key={r.id} className="click" onClick={() => nav(`/water-tank/invoices/${r.code}`)}>
                    <td className="id">{r.code}</td>
                    <td className="muted">{r.project_id || '—'}</td>
                    <td><strong>{r.client_name}</strong></td>
                    <td className="muted">{r.inv_type || '—'}</td>
                    <td style={{ fontWeight: 700 }}>{bdt(r.amount)}</td>
                    <td className="muted">{dateFmt(r.due_date)}</td>
                    <td style={{ color: num(r.outstanding) > 0 ? 'var(--wt-red)' : 'var(--wt-muted)', fontWeight: num(r.outstanding) > 0 ? 700 : 400 }}>{bdt(r.outstanding)}</td>
                    <td><StatusCell value={r.status} options={STATUSES} onChange={(body) => patch(r.id, body, `${r.code} → ${body.status}`)} /></td>
                    <td><StatusCell value={r.provider_payout} options={PAYOUTS} field="provider_payout"
                      onChange={(body) => patch(r.id, body, `${r.code} payout → ${body.provider_payout}`)} /></td>
                    <td>
                      <RowActions items={[
                        { label: 'Open', icon: Eye, onClick: () => setOpen(r) },
                        !settled && { label: 'Record Payment', icon: Wallet, onClick: () => setPaying(r) },
                        s === 'draft' && { label: 'Mark Sent', icon: Send, onClick: () => patch(r.id, { status: 'Sent' }, `${r.code} marked sent`).catch((e) => toast.err(errText(e))) },
                        s === 'paid' && (r.provider_payout || '').toLowerCase() !== 'cleared' && { label: 'Clear Provider Payout', icon: Banknote, onClick: () => patch(r.id, { provider_payout: 'Cleared' }, `${r.code} payout cleared`).catch((e) => toast.err(errText(e))) },
                        { label: 'Delete', icon: Trash2, danger: true, onClick: () => remove(r.id, `${r.code} deleted`).catch((e) => toast.err(errText(e))) },
                      ]} />
                    </td>
                  </tr>
                );
              })}
              {!shown.length && <tr className="wt-empty-row"><td colSpan={10}>{q ? `Nothing matches “${q}”.` : `No invoices in “${tab}”.`}</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {milestones.length > 0 && (
        <div className="wt-card" style={{ padding: 22 }}>
          <div className="wt-sec-title" style={{ marginBottom: 14 }}>Project Payment Schedule &amp; Milestone Stages (Project {project?.code})</div>
          <div className="wt-milestones">
            {milestones.map((m, i) => (
              <div key={i} className={`wt-milestone${(m.status || '').toLowerCase() === 'invoiced' ? ' active' : ''}`}>
                <div className="mh"><span className="mt">{m.title}</span><Pill value={m.status} sm /></div>
                <div className="amt">{bdt(m.amount)}</div>
                <div className="dt">{m.date}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* A centred modal, not a drawer: building an invoice needs the client
          search, the catalogue and the running total visible together. */}
      {creating && (
        <InvoiceCreateModal
          onClose={() => setCreating(false)}
          onCreated={(created) => { setCreating(false); nav(`/water-tank/invoices/${created.code}`); }}
        />
      )}

      {current && !paying && (
        <RecordDrawer
          record={current} singular="invoice" fields={FIELDS} subtitle={current.client_name}
          onClose={() => setOpen(null)}
          onSave={(body) => patch(current.id, body)}
          onDelete={() => remove(current.id, `${current.code} deleted`)}
          advanceLabel="Record Payment"
          onAdvance={['paid', 'cancelled'].includes((current.status || '').toLowerCase()) ? undefined : () => setPaying(current)}
        />
      )}

      {paying && <PaymentDrawer invoice={paying} onClose={() => setPaying(null)} onConfirm={recordPayment} />}
    </>
  );
}
