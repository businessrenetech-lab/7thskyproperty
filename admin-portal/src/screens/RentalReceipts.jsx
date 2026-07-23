import React, { useCallback, useEffect, useState } from 'react';
import { Play, Wallet, Download, Mail, BellRing, FolderInput } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Button, DataTable, Drawer, Field, Input, Select, Spinner, StatusBadge, Badge } from '../ui/kit';

const money = (v) => 'BDT ' + Number(v || 0).toLocaleString();
const num = (v) => Number(v || 0);
const thisPeriod = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

export default function RentalReceipts() {
  const toast = useToast();
  const [period, setPeriod] = useState(thisPeriod());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState(null);
  const [pay, setPay] = useState({ amount: '', method: 'cash', reference: '' });
  const load = useCallback(async () => { setLoading(true); try { const { data } = await api.get(`/billing/rental-receipts?period_label=${period}&limit=100`); setRows(data.data || []); } catch { toast.error('Failed to load rental receipts'); } finally { setLoading(false); } }, [period, toast]);
  useEffect(() => { load(); }, [load]);
  const generate = async () => { setRunning(true); try { const { data } = await api.post('/billing/rental-receipts/generate', { period_label: period, receipt_day: 5 }); toast.success(data.message || 'Rental receipts generated'); load(); } catch (e) { toast.error(e.response?.data?.error || 'Generate failed'); } finally { setRunning(false); } };
  const recordPayment = async () => { if (!num(pay.amount)) return toast.error('Enter amount'); try { await api.post(`/billing/rental-receipts/${selected.id}/payments`, pay); toast.success('Receipt payment recorded and landlord balance updated'); setSelected(null); setPay({ amount: '', method: 'cash', reference: '' }); load(); } catch (e) { toast.error(e.response?.data?.error || 'Payment failed'); } };
  const receiptBlob = async (r) => { const { buildRentReceiptBlob } = await import('../utils/sspcPdf'); return buildRentReceiptBlob({ receipt: r, tenancy: { tenant: r.tenant }, property: r.property }); };
  const downloadReceipt = async (r) => { try { const blob = await receiptBlob(r); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `rent-receipt-${r.receipt_code}.pdf`; a.click(); URL.revokeObjectURL(url); } catch { toast.error('Could not generate the receipt PDF.'); } };
  // Generate the PDF and file it into the property's Documents section.
  const fileToDocuments = async (r) => {
    if (!r.property_id) throw new Error('no property');
    const blob = await receiptBlob(r);
    const fd = new FormData();
    fd.append('file', new File([blob], `rent-receipt-${r.receipt_code}.pdf`, { type: 'application/pdf' }));
    const up = await api.post('/uploads?folder=documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    await api.post(`/properties/${r.property_id}/documents`, {
      title: `Rent receipt ${r.receipt_code} — ${r.period_label}`, file_url: up.data.data.url,
      doc_type: 'rent_receipt', entity_type: 'tenant', entity_id: r.tenant_contact_id || null,
    });
  };
  const [filing, setFiling] = useState(false);
  const saveToDocuments = async (r) => { setFiling(true); try { await fileToDocuments(r); toast.success('Receipt saved to the property’s Documents.'); } catch (e) { toast.error(e.response?.data?.error || 'Could not save to documents.'); } finally { setFiling(false); } };
  const [emailing, setEmailing] = useState(false);
  // Email the tenant AND file a copy into the property Documents section.
  const emailReceipt = async (r) => { setEmailing(true); try { const { data } = await api.post(`/billing/rental-receipts/${r.id}/email`); try { await fileToDocuments(r); } catch { /* filing is best-effort */ } toast.success(data.message + ' Copy saved to Documents.'); } catch (e) { toast.error(e.response?.data?.error || 'Email failed'); } finally { setEmailing(false); } };
  const sendReminder = async (r) => { if (!r.tenancy_id) return toast.error('No tenancy linked.'); try { const { data } = await api.post(`/tenancies/${r.tenancy_id}/send-rent-reminder`); toast.success(data.message); } catch (e) { toast.error(e.response?.data?.error || 'Reminder failed'); } };
  const columns = [
    { key: 'receipt_code', header: 'Receipt', render: (r) => <span className="code-chip">{r.receipt_code}</span> },
    { key: 'tenant', header: 'Tenant', render: (r) => r.tenant?.full_name || '—' },
    { key: 'property', header: 'Property', render: (r) => r.property?.title || '—' },
    { key: 'period', header: 'Period', render: (r) => r.period_label },
    { key: 'rent', header: 'Rent + Service', render: (r) => `${money(r.rent_amount)} + ${money(r.service_charge)}` },
    { key: 'balance', header: 'Balance', render: (r) => num(r.balance) > 0 ? <Badge tone="amber">{money(r.balance)}</Badge> : <Badge tone="green">Settled</Badge> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];
  return <>
    <PageHead title="Rental Receipts" desc="Recurring rent/service receipts. Generate monthly on the 5th; tenant payments increase landlord balance." actions={<Button icon={Play} onClick={generate} disabled={running}>{running ? <Spinner /> : 'Generate for Period'}</Button>} />
    <div className="card" style={{ marginBottom: 16 }}><div className="card-pad form-grid"><Field label="Period"><Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} /></Field></div></div>
    <div className="card"><DataTable columns={columns} rows={rows} loading={loading} onRowClick={setSelected} /></div>
    {selected && <Drawer title={selected.receipt_code} onClose={() => setSelected(null)} width={520}><StatusBadge status={selected.status} /><div style={{ marginTop: 12 }}><div className="kv"><span className="k">Tenant</span><span className="v">{selected.tenant?.full_name}</span></div><div className="kv"><span className="k">Total</span><span className="v">{money(selected.total_amount)}</span></div><div className="kv"><span className="k">Paid</span><span className="v">{money(selected.amount_paid)}</span></div><div className="kv"><span className="k">Balance</span><span className="v">{money(selected.balance)}</span></div></div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <Button size="sm" variant="ghost" icon={Download} onClick={() => downloadReceipt(selected)}>Download</Button>
        <Button size="sm" variant="ghost" icon={FolderInput} onClick={() => saveToDocuments(selected)} disabled={filing}>{filing ? <Spinner /> : 'Save to documents'}</Button>
        <Button size="sm" variant="ghost" icon={Mail} onClick={() => emailReceipt(selected)} disabled={emailing}>{emailing ? <Spinner /> : 'Email tenant'}</Button>
        {num(selected.balance) > 0 && <Button size="sm" variant="ghost" icon={BellRing} onClick={() => sendReminder(selected)}>Send reminder</Button>}
      </div>
      {selected.status !== 'paid' && <><div className="form-section-title"><Wallet size={13} /> Record Payment</div><div className="form-grid"><Field label="Amount"><Input type="number" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></Field><Field label="Method"><Select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>{['cash', 'bank_transfer', 'bkash', 'nagad', 'card', 'cheque', 'sslcommerz', 'other'].map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}</Select></Field></div><Field label="Reference" full><Input value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} /></Field><Button icon={Wallet} onClick={recordPayment}>Record payment</Button></>}</Drawer>}
  </>;
}
