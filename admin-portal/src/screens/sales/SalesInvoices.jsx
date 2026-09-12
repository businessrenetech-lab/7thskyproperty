// admin-portal/src/screens/sales/SalesInvoices.jsx
//
// Invoices tab for residential sales accounting. Lists every vendor/buyer
// invoice generated + drafted after a sale/purchase agreement is signed, and
// lets staff edit lines, email the invoice (PDF), and download it. Mirrors the
// services (water-tank) invoice section's features.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Mail, Plus, Trash2, Save, RefreshCw, Eye } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button, Spinner, StatusBadge, Drawer, Field, Input, Textarea, Select, EmptyState } from '../../ui/kit';

const bdt = (v) => '৳' + Number(v || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const th = { padding: '8px 10px', textAlign: 'left', fontSize: 11.5, textTransform: 'uppercase', color: 'var(--muted)', borderBottom: '1px solid var(--line)' };
const td = { padding: '8px 10px', borderBottom: '1px solid var(--line)', fontSize: 13 };

export default function SalesInvoices() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    setRows(null);
    try {
      const q = new URLSearchParams({ invoice_type: 'agreement_fee' });
      if (status) q.set('status', status);
      if (search) q.set('search', search);
      const r = await api.get(`/invoices?${q}`);
      setRows(r.data.data || []);
    } catch { toast.error('Could not load invoices'); setRows([]); }
  }, [status, search, toast]);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code / title…" style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '7px 10px', font: 'inherit' }} />
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {['draft', 'sent', 'partial', 'paid', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Button variant="ghost" icon={RefreshCw} onClick={load}>Refresh</Button>
      </div>

      {rows === null ? <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div> : rows.length === 0 ? (
        <EmptyState icon={Mail} title="No agreement invoices yet" sub="Invoices are drafted automatically when a sale/purchase agreement is signed." />
      ) : (
        <div className="pm-card"><div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={th}>Invoice</th><th style={th}>Billed to</th><th style={th}>Title</th><th style={th}>Status</th>
              <th style={{ ...th, textAlign: 'right' }}>Total</th><th style={{ ...th, textAlign: 'right' }}>Balance</th><th style={th} />
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={td}><strong>{r.invoice_code}</strong></td>
                  <td style={td}>{r.payable_name}</td>
                  <td style={td}>{r.title}</td>
                  <td style={td}><StatusBadge status={r.status} /></td>
                  <td style={{ ...td, textAlign: 'right' }}>{bdt(r.total)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{bdt(r.balance)}</td>
                  <td style={{ ...td, textAlign: 'right' }}><Button size="sm" variant="ghost" onClick={() => setOpenId(r.id)}>Open</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      )}

      {openId && <InvoiceDrawer id={openId} onClose={() => setOpenId(null)} onSaved={load} />}
    </div>
  );
}

function InvoiceDrawer({ id, onClose, onSaved }) {
  const toast = useToast();
  const [inv, setInv] = useState(null);
  const [form, setForm] = useState({ title: '', due_date: '', notes: '', items: [] });
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await api.get(`/invoices/${id}`);
      const d = r.data.data; setInv(d);
      setForm({
        title: d.title || '', due_date: d.due_date ? String(d.due_date).slice(0, 10) : '', notes: d.notes || '',
        items: (d.items || []).map((it) => ({ description: it.description || '', quantity: Number(it.quantity) || 1, unit_price: Number(it.unit_price) || 0 })),
      });
    } catch { toast.error('Could not load the invoice'); }
  }, [id, toast]);
  useEffect(() => { load(); }, [load]);

  const editable = inv && Number(inv.amount_paid) === 0 && !['paid', 'cancelled'].includes(inv.status);
  const total = useMemo(() => form.items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0), [form.items]);
  const setItem = (i, k, v) => setForm((f) => ({ ...f, items: f.items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)) }));
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { description: '', quantity: 1, unit_price: 0 }] }));
  const removeItem = (i) => setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const save = async () => {
    setBusy('save');
    try { await api.put(`/invoices/${id}`, form); toast.success('Invoice updated'); await load(); onSaved?.(); }
    catch (e) { toast.error(e.response?.data?.error || 'Could not save the invoice'); } finally { setBusy(''); }
  };
  const send = async () => {
    setBusy('send');
    try { const r = await api.post(`/invoices/${id}/send`, {}); toast.success(r.data?.message || 'Invoice sent'); await load(); onSaved?.(); }
    catch (e) { toast.error(e.response?.data?.error || 'Could not send the invoice'); } finally { setBusy(''); }
  };
  const download = async () => {
    setBusy('pdf');
    try {
      const r = await api.get(`/invoices/${id}/document`, { responseType: 'text' });
      const html2pdf = (await import('html2pdf.js')).default;
      const container = document.createElement('div');
      container.innerHTML = typeof r.data === 'string' ? r.data : '';
      await html2pdf().set({ margin: [8, 8, 8, 8], filename: `${inv.invoice_code}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, backgroundColor: '#ffffff' }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(container).save();
    } catch { toast.error('Could not generate the PDF'); } finally { setBusy(''); }
  };

  return (
    <Drawer title={inv ? `${inv.invoice_code} · ${inv.status}` : 'Invoice'} onClose={onClose} width={640}
      footer={inv ? (
        <>
          <Button variant="ghost" icon={Download} disabled={!!busy} onClick={download}>{busy === 'pdf' ? <Spinner /> : 'Download PDF'}</Button>
          <Button variant="ghost" icon={Mail} disabled={!!busy} onClick={send}>{busy === 'send' ? <Spinner /> : 'Send email'}</Button>
          {editable && <Button icon={Save} disabled={!!busy} onClick={save}>{busy === 'save' ? <Spinner /> : 'Save'}</Button>}
        </>
      ) : null}>
      {!inv ? <div style={{ padding: 24, textAlign: 'center' }}><Spinner /></div> : (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <div style={{ flex: '1 1 200px' }}><Field label="Billed to"><Input value={inv.payable_name || '—'} disabled /></Field></div>
            <div style={{ flex: '1 1 120px' }}><Field label="Balance due"><Input value={bdt(inv.balance)} disabled /></Field></div>
          </div>
          <Field label="Title"><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} disabled={!editable} /></Field>
          <Field label="Due date"><Input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} disabled={!editable} /></Field>

          <div style={{ fontWeight: 700, fontSize: 13, margin: '12px 0 6px' }}>Line items</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Description</th><th style={{ ...th, textAlign: 'right' }}>Qty</th><th style={{ ...th, textAlign: 'right' }}>Unit</th><th style={{ ...th, textAlign: 'right' }}>Amount</th>{editable && <th style={th} />}</tr></thead>
              <tbody>
                {form.items.map((it, i) => (
                  <tr key={i}>
                    <td style={td}><Input value={it.description} onChange={(e) => setItem(i, 'description', e.target.value)} disabled={!editable} /></td>
                    <td style={{ ...td, textAlign: 'right' }}><Input type="number" style={{ width: 70 }} value={it.quantity} onChange={(e) => setItem(i, 'quantity', e.target.value)} disabled={!editable} /></td>
                    <td style={{ ...td, textAlign: 'right' }}><Input type="number" style={{ width: 110 }} value={it.unit_price} onChange={(e) => setItem(i, 'unit_price', e.target.value)} disabled={!editable} /></td>
                    <td style={{ ...td, textAlign: 'right' }}>{bdt((Number(it.quantity) || 0) * (Number(it.unit_price) || 0))}</td>
                    {editable && <td style={{ ...td, textAlign: 'right' }}><Button size="sm" variant="ghost" icon={Trash2} onClick={() => removeItem(i)} /></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {editable && <Button size="sm" variant="ghost" icon={Plus} onClick={addItem} style={{ marginTop: 8 }}>Add line</Button>}
          <div style={{ textAlign: 'right', fontWeight: 700, marginTop: 10 }}>Total: {bdt(total)}</div>

          <div style={{ marginTop: 12 }}><Field label="Notes"><Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} disabled={!editable} /></Field></div>
          {!editable && <p className="cell-sub" style={{ marginTop: 8 }}>This invoice is {inv.status}{Number(inv.amount_paid) > 0 ? ' / partly paid' : ''} — lines can no longer be edited. You can still send or download it.</p>}
        </>
      )}
    </Drawer>
  );
}
