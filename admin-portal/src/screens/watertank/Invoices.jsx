import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Wallet, Send, Layers, FileText, Trash2 } from 'lucide-react';
import api from '../../services/api';
import InvoiceCreateModal from './InvoiceCreateModal';
import PaymentModal from './PaymentModal';
import BulkPaymentModal from './BulkPaymentModal';
import {
  WtHead, WtTabs, Pill, dateFmt, bdt, StatCards, useCollection, useUrlTab,
  RowActions, Loading, EmptyState, useFocusedRecord, parseJson, toast, errText,
} from './common';

const STATUSES = ['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'];
const TABS = ['All', ...STATUSES];

const num = (v) => Number(v || 0);

/*
 * Money on this screen used to be written by PATCHing `outstanding` and `status`
 * straight onto the invoice row — which bypassed the ledger entirely, and, once
 * generic invoice writes were closed off, simply answered 405. The row actions
 * that did that (Record Payment, the inline Status and Provider Payout
 * dropdowns, Delete) have been replaced by the controls that go through the
 * single money writer. An editable field is a promise that editing works.
 */

export default function Invoices() {
  const nav = useNavigate();
  const { rows, loading, error, reload } = useCollection('invoices');
  const [tab, setTab] = useState('All');
  useUrlTab(TABS, setTab);
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState(null);
  const [bulk, setBulk] = useState(false);
  const [project, setProject] = useState(null);
  useFocusedRecord(rows, (r) => { setTab('All'); nav(`/water-tank/invoices/${r.code}`); });

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

  return (
    <>
      <WtHead
        title="Invoices & Payments"
        subtitle="Collect deposits, log progress payments, allocate disbursements"
        search={q} onSearch={setQ}
      >
        {/* Starts from the client rather than the invoice, because a lump sum
            arrives from a person, not from a document. */}
        <button className="wt-btn" onClick={() => setBulk(true)}><Layers size={15} /> Bulk Payment</button>
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
                    <td><Pill value={r.status} sm /></td>
                    <td><Pill value={r.provider_payout} sm /></td>
                    <td>
                      <RowActions items={[
                        { label: 'Open invoice', icon: Eye, onClick: () => nav(`/water-tank/invoices/${r.code}`) },
                        // Draft money cannot be taken: the client has not been
                        // asked for it yet, and the ledger refuses it outright.
                        !settled && s !== 'draft' && { label: 'Record Payment', icon: Wallet, onClick: () => setPaying(r) },
                        s === 'draft' && { label: 'Send invoice', icon: Send, onClick: () => nav(`/water-tank/invoices/${r.code}`) },
                        { label: 'Download PDF', icon: FileText, onClick: () => window.open(`${api.defaults.baseURL || ''}/wt-invoices/${r.code}/pdf`, '_blank') },
                        /*
                         * Only a draft. An issued invoice is VOIDED rather than
                         * deleted, so the numbering stays continuous and the
                         * gap is explained — which is why this goes through the
                         * invoice controller and not the generic delete the row
                         * used to call.
                         */
                        s === 'draft' && {
                          label: 'Delete draft',
                          icon: Trash2,
                          danger: true,
                          onClick: async () => {
                            // eslint-disable-next-line no-alert
                            if (!window.confirm(`Delete draft ${r.code}? It has not been sent, so nothing is lost from the record.`)) return;
                            try { await api.delete(`/wt-invoices/${r.code}`); toast.ok(`${r.code} deleted`); reload(); }
                            catch (e) { toast.err(errText(e, 'Could not delete it')); }
                          },
                        },
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

      {paying && (
        <PaymentModal invoice={paying} onClose={() => { setPaying(null); reload(); }} onDone={reload} />
      )}

      {bulk && (
        <BulkPaymentModal onClose={() => { setBulk(false); reload(); }} onDone={reload} />
      )}
    </>
  );
}
