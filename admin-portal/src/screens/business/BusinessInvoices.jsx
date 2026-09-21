import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Plus, Receipt, Trash2, Coins } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { PageHead, Button, DataTable, Drawer, Field, Input, Textarea, Select, Badge } from '../../ui/kit';

const money = (n) => (n == null || n === '' ? '—' : `৳${Number(n).toLocaleString()}`);
const STATUS_TONE = { draft: 'grey', sent: 'blue', partial: 'amber', paid: 'green', overdue: 'red', void: 'grey' };
const EMPTY_LINE = { description: '', qty: 1, unit_price: '', amount: 0 };

// dealSide scopes the invoice list + creation: sale/rent invoices are raised
// against a business listing; buy invoices against an acquisition mandate.
const SIDE_META = {
  sale: { title: 'Sale Invoices', desc: 'Service-fee & commission invoices for business sales — isolated to the Sale console.', listingType: 'sale' },
  buy: { title: 'Buy Invoices', desc: 'Acquisition service-fee & success-fee invoices, raised against a mandate — isolated to the Buy console.', listingType: null },
  rent: { title: 'Rent Invoices', desc: 'Leasing service-fee & commission invoices — isolated to the Rent console.', listingType: 'rent' },
};

export default function BusinessInvoices({ dealSide = 'sale' }) {
  const meta = SIDE_META[dealSide] || SIDE_META.sale;
  const isBuy = dealSide === 'buy';
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [listings, setListings] = useState([]);
  const [mandates, setMandates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(null); // {id, form}
  const [pay, setPay] = useState(null); // {invoice, amount, method}
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/business-invoices', { params: { limit: 200, deal_side: dealSide } }); setRows(r.data.data || []); }
    catch { toast.error('Failed to load invoices'); } finally { setLoading(false); }
  }, [toast, dealSide]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (isBuy) { api.get('/business-mandates', { params: { limit: 200 } }).then((r) => setMandates(r.data.data || [])).catch(() => {}); }
    else { api.get('/business-listings', { params: { limit: 200, listing_type: meta.listingType } }).then((r) => setListings(r.data.data || [])).catch(() => {}); }
  }, [isBuy, meta.listingType]);

  const openNew = () => setDrawer({ id: null, form: { deal_side: dealSide, business_listing_id: '', mandate_id: '', client_name: '', invoice_type: 'service_fee', line_items: [{ ...EMPTY_LINE }], discount: 0, vat_percent: 0, status: 'draft', due_date: '', issue_date: new Date().toISOString().slice(0, 10), notes: '' } });
  const setF = (k, v) => setDrawer((d) => ({ ...d, form: { ...d.form, [k]: v } }));
  const setLine = (i, k, v) => setDrawer((d) => { const items = d.form.line_items.map((l, idx) => idx === i ? { ...l, [k]: v, amount: k === 'qty' || k === 'unit_price' ? Number(k === 'qty' ? v : l.qty) * Number(k === 'unit_price' ? v : l.unit_price) : l.amount } : l); return { ...d, form: { ...d.form, line_items: items } }; });
  const addLine = () => setDrawer((d) => ({ ...d, form: { ...d.form, line_items: [...d.form.line_items, { ...EMPTY_LINE }] } }));
  const rmLine = (i) => setDrawer((d) => ({ ...d, form: { ...d.form, line_items: d.form.line_items.filter((_, idx) => idx !== i) } }));

  const subtotal = drawer ? drawer.form.line_items.reduce((s, l) => s + Number(l.amount || 0), 0) : 0;
  const vat = drawer ? Math.round((subtotal - Number(drawer.form.discount || 0)) * Number(drawer.form.vat_percent || 0) / 100) : 0;
  const total = subtotal - (drawer ? Number(drawer.form.discount || 0) : 0) + vat;

  const save = async () => {
    if (isBuy) { if (!drawer.form.mandate_id) { toast.error('Select a mandate'); return; } }
    else if (!drawer.form.business_listing_id) { toast.error('Select a business'); return; }
    setSaving(true);
    try {
      if (drawer.id) await api.put(`/business-invoices/${drawer.id}`, drawer.form);
      else await api.post('/business-invoices', drawer.form);
      toast.success('Invoice saved'); setDrawer(null); load();
    } catch (e) { toast.error(e.response?.data?.error || 'Save failed'); } finally { setSaving(false); }
  };
  const savePayment = async () => {
    if (!Number(pay.amount)) { toast.error('Amount required'); return; }
    try { await api.post(`/business-invoices/${pay.invoice.id}/payment`, { amount: Number(pay.amount), method: pay.method }); toast.success('Payment recorded'); setPay(null); load(); }
    catch { toast.error('Failed'); }
  };

  const columns = useMemo(() => [
    { key: 'invoice_code', label: 'Invoice', render: (r) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.invoice_code}</span> },
    { key: 'listing', label: isBuy ? 'Client / Mandate' : 'Business', render: (r) => r.listing?.business_name || r.client_name || (r.mandate_id ? `Mandate #${r.mandate_id}` : '—') },
    { key: 'total_amount', label: 'Total', render: (r) => money(r.total_amount) },
    { key: 'paid_amount', label: 'Paid', render: (r) => money(r.paid_amount) },
    { key: 'due', label: 'Due', render: (r) => money(Number(r.total_amount || 0) - Number(r.paid_amount || 0)) },
    { key: 'status', label: 'Status', render: (r) => <Badge tone={STATUS_TONE[r.status] || 'grey'}>{r.status}</Badge> },
    { key: 'act', label: '', render: (r) => (r.status !== 'paid' && r.status !== 'void' ? <Button size="sm" variant="ghost" icon={Coins} onClick={(e) => { e.stopPropagation(); setPay({ invoice: r, amount: '', method: 'bank' }); }}>Pay</Button> : null) },
  ], []);

  return (
    <div className="pm-scope">
      <PageHead title={meta.title} desc={meta.desc}
        actions={<Button icon={Plus} onClick={openNew}>New Invoice</Button>} />
      <DataTable columns={columns} rows={rows} loading={loading} onRowClick={(r) => setDrawer({ id: r.id, form: { ...r, line_items: Array.isArray(r.line_items) ? r.line_items : (r.line_items ? JSON.parse(r.line_items) : [{ ...EMPTY_LINE }]) } })}
        empty="No invoices yet." />

      {drawer && (
        <Drawer open title={drawer.id ? `Invoice ${drawer.form.invoice_code || ''}` : 'New Invoice'} width={640} onClose={() => setDrawer(null)}
          footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ fontSize: 13 }}>Subtotal {money(subtotal)} · VAT {money(vat)} · <b>Total {money(total)}</b></div>
            <div style={{ display: 'flex', gap: 8 }}><Button variant="ghost" onClick={() => setDrawer(null)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button></div>
          </div>}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {isBuy
              ? <Field label="Mandate" required><Select value={drawer.form.mandate_id} onChange={(e) => setF('mandate_id', e.target.value)}><option value="">— Select —</option>{mandates.map((m) => <option key={m.id} value={m.id}>{m.mandate_code || `Mandate #${m.id}`} · {m.client_name || m.buyer_name || ''}</option>)}</Select></Field>
              : <Field label="Business" required><Select value={drawer.form.business_listing_id} onChange={(e) => setF('business_listing_id', e.target.value)}><option value="">— Select —</option>{listings.map((l) => <option key={l.id} value={l.id}>{l.business_code} · {l.business_name}</option>)}</Select></Field>}
            <Field label="Type"><Select value={drawer.form.invoice_type} onChange={(e) => setF('invoice_type', e.target.value)}><option value="service_fee">Service fee</option><option value="commission">Commission</option><option value="mixed">Mixed</option></Select></Field>
            <Field label="Client name"><Input value={drawer.form.client_name || ''} onChange={(e) => setF('client_name', e.target.value)} /></Field>
            <Field label="Status"><Select value={drawer.form.status} onChange={(e) => setF('status', e.target.value)}><option value="draft">Draft</option><option value="sent">Sent</option><option value="void">Void</option></Select></Field>
            <Field label="Issue date"><Input type="date" value={drawer.form.issue_date || ''} onChange={(e) => setF('issue_date', e.target.value)} /></Field>
            <Field label="Due date"><Input type="date" value={drawer.form.due_date || ''} onChange={(e) => setF('due_date', e.target.value)} /></Field>
          </div>
          <div style={{ marginTop: 14, fontWeight: 700, fontSize: 13 }}>Line items</div>
          {drawer.form.line_items.map((l, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 100px 100px 28px', gap: 6, alignItems: 'center', marginTop: 6 }}>
              <Input placeholder="Description" value={l.description} onChange={(e) => setLine(i, 'description', e.target.value)} />
              <Input type="number" value={l.qty} onChange={(e) => setLine(i, 'qty', e.target.value)} />
              <Input type="number" placeholder="Unit ৳" value={l.unit_price} onChange={(e) => setLine(i, 'unit_price', e.target.value)} />
              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600 }}>{money(l.amount)}</div>
              <button onClick={() => rmLine(i)} style={{ background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer' }}><Trash2 size={15} /></button>
            </div>
          ))}
          <Button size="sm" variant="ghost" icon={Plus} onClick={addLine} style={{ marginTop: 8 }}>Add line</Button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <Field label="Discount (৳)"><Input type="number" value={drawer.form.discount} onChange={(e) => setF('discount', e.target.value)} /></Field>
            <Field label="VAT %"><Input type="number" step="0.1" value={drawer.form.vat_percent} onChange={(e) => setF('vat_percent', e.target.value)} /></Field>
            <Field label="Notes" full><Textarea rows={2} value={drawer.form.notes || ''} onChange={(e) => setF('notes', e.target.value)} /></Field>
          </div>
        </Drawer>
      )}

      {pay && (
        <Drawer open title={`Record payment — ${pay.invoice.invoice_code}`} width={420} onClose={() => setPay(null)}
          footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><Button variant="ghost" onClick={() => setPay(null)}>Cancel</Button><Button onClick={savePayment}>Record</Button></div>}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ fontSize: 13, color: '#6b7280' }}>Outstanding: <b>{money(Number(pay.invoice.total_amount || 0) - Number(pay.invoice.paid_amount || 0))}</b></div>
            <Field label="Amount (৳)"><Input type="number" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></Field>
            <Field label="Method"><Select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}><option value="bank">Bank</option><option value="cash">Cash</option><option value="cheque">Cheque</option><option value="mobile">Mobile</option></Select></Field>
          </div>
        </Drawer>
      )}
    </div>
  );
}
