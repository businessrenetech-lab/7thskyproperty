import React, { useState, useEffect, useCallback } from 'react';
import { Truck, Plus, RefreshCw, Banknote, Search } from 'lucide-react';
import api from '../../services/api';
import { bdt, toast, errText } from './common';

/*
 * Suppliers & Payables — the supplier/vendor directory (with running payables)
 * and a firm-wide accounts-payable list. Service line is set from the route by
 * api.js. Bills are raised per project from the project's Costing tab; here they
 * are managed and paid across all projects.
 */
const billChip = (s) => ({ paid: 'green', partial: 'amber', unpaid: 'slate', void: 'red' }[s] || 'slate');

export default function WtSuppliers() {
  const [tab, setTab] = useState('suppliers');
  return (
    <div className="wt-scope" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}><Truck size={20} /> Suppliers &amp; Payables</h1>
          <p className="muted" style={{ margin: '4px 0 0' }}>Vendor directory and accounts payable across all projects.</p>
        </div>
      </div>
      <div className="wt-segment" style={{ marginBottom: 14 }}>
        {[['suppliers', 'Suppliers'], ['payables', 'Payables']].map(([k, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === 'suppliers' ? <Suppliers /> : <Payables />}
    </div>
  );
}

function Suppliers() {
  const [rows, setRows] = useState([]);
  const [cats, setCats] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/wt-suppliers', { params: q ? { q } : {} }); setRows(data.data || []); setCats(data.categories || []); }
    catch (e) { toast.err(errText(e, 'Could not load suppliers')); } finally { setLoading(false); }
  }, [q]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name?.trim()) { toast.err('Supplier name is required.'); return; }
    setBusy(true);
    try { await api.post('/wt-suppliers', form); toast.ok('Supplier added'); setForm(null); await load(); }
    catch (e) { toast.err(errText(e, 'Could not add the supplier')); } finally { setBusy(false); }
  };

  const totalPayable = rows.reduce((s, r) => s + Number(r.payable || 0), 0);

  return (
    <>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 320 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--wt-muted)' }} />
          <input className="wt-input" style={{ paddingLeft: 30 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name / phone / category…" />
        </div>
        <button className="wt-btn" onClick={load} disabled={loading}><RefreshCw size={14} className={loading ? 'wt-spin' : ''} /> Refresh</button>
        <span style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--wt-muted)' }}>Total payable: <strong style={{ color: 'var(--wt-ink)' }}>{bdt(totalPayable)}</strong></span>
        <button className="wt-btn primary" onClick={() => setForm({ name: '', category: '', contact_person: '', phone: '', email: '', opening_balance: '' })}><Plus size={14} /> New supplier</button>
      </div>

      {form && (
        <div className="wt-card" style={{ padding: 16, marginBottom: 14, display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
          <label>Name *<input className="wt-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></label>
          <label>Category<select className="wt-input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
            <option value="">Select…</option>{cats.map((x) => <option key={x} value={x}>{x}</option>)}
          </select></label>
          <label>Contact person<input className="wt-input" value={form.contact_person} onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))} /></label>
          <label>Phone<input className="wt-input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></label>
          <label>Email<input className="wt-input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></label>
          <label>Opening balance (owed)<input className="wt-input" type="number" value={form.opening_balance} onChange={(e) => setForm((f) => ({ ...f, opening_balance: e.target.value }))} /></label>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="wt-btn" onClick={() => setForm(null)}>Cancel</button>
            <button className="wt-btn primary" onClick={save} disabled={busy}>Save supplier</button>
          </div>
        </div>
      )}

      <div className="wt-card" style={{ padding: 0 }}>
        <table className="wt-tbl">
          <thead><tr><th>Code</th><th>Name</th><th>Category</th><th>Contact</th><th style={{ textAlign: 'right' }}>Payable</th></tr></thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.code}>
                <td><strong>{s.code}</strong></td>
                <td>{s.name}</td>
                <td>{s.category || '—'}</td>
                <td className="muted" style={{ fontSize: 12.5 }}>{[s.contact_person, s.phone, s.email].filter(Boolean).join(' · ') || '—'}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: s.payable > 0 ? 'var(--wt-amber)' : 'var(--wt-muted)' }}>{bdt(s.payable)}</td>
              </tr>
            ))}
            {!rows.length && !loading && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 26, color: 'var(--wt-muted)' }}>No suppliers yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Payables() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [payFor, setPayFor] = useState(null);
  const [pay, setPay] = useState({ amount: '', method: 'bank_transfer', reference: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/wt-supplier-bills'); setRows(data.data || []); setSummary(data.summary || {}); }
    catch (e) { toast.err(errText(e, 'Could not load bills')); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const doPay = async () => {
    if (!Number(pay.amount)) { toast.err('Enter an amount.'); return; }
    setBusy(true);
    try { const { data } = await api.post(`/wt-supplier-bills/${payFor.bill_code}/pay`, { ...pay, amount: Number(pay.amount) }); toast.ok(data.message || 'Paid'); setPayFor(null); setPay({ amount: '', method: 'bank_transfer', reference: '' }); await load(); }
    catch (e) { toast.err(errText(e, 'Could not record the payment')); } finally { setBusy(false); }
  };

  return (
    <>
      <div className="wt-kpigrid" style={{ marginBottom: 14 }}>
        <div className="wt-card" style={{ padding: 14 }}><div className="muted" style={{ fontSize: 12 }}>Billed</div><div style={{ fontSize: 18, fontWeight: 800 }}>{bdt(summary.billed)}</div></div>
        <div className="wt-card" style={{ padding: 14 }}><div className="muted" style={{ fontSize: 12 }}>Paid</div><div style={{ fontSize: 18, fontWeight: 800, color: 'var(--wt-green)' }}>{bdt(summary.paid)}</div></div>
        <div className="wt-card" style={{ padding: 14 }}><div className="muted" style={{ fontSize: 12 }}>Outstanding</div><div style={{ fontSize: 18, fontWeight: 800, color: 'var(--wt-amber)' }}>{bdt(summary.outstanding)}</div></div>
      </div>
      <div className="wt-card" style={{ padding: 0 }}>
        <table className="wt-tbl">
          <thead><tr><th>Bill</th><th>Supplier</th><th>Project</th><th>Category</th><th style={{ textAlign: 'right' }}>Total</th><th style={{ textAlign: 'right' }}>Balance</th><th>Status</th><th style={{ textAlign: 'right' }} /></tr></thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.bill_code}>
                <td><strong>{b.bill_code}</strong></td>
                <td>{b.supplier_name}</td>
                <td>{b.project_code || '—'}</td>
                <td>{b.category}</td>
                <td style={{ textAlign: 'right' }}>{bdt(b.total)}</td>
                <td style={{ textAlign: 'right', color: b.balance > 0 ? 'var(--wt-amber)' : 'var(--wt-muted)' }}>{bdt(b.balance)}</td>
                <td><span className={`wt-pill ${billChip(b.status)}`}>{b.status}</span></td>
                <td style={{ textAlign: 'right' }}>{b.status !== 'paid' && b.status !== 'void' && <button className="wt-btn sm" onClick={() => { setPayFor(b); setPay({ amount: String(b.balance), method: 'bank_transfer', reference: '' }); }}><Banknote size={13} /> Pay</button>}</td>
              </tr>
            ))}
            {!rows.length && !loading && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 26, color: 'var(--wt-muted)' }}>No supplier bills yet — raise them from a project's Costing tab.</td></tr>}
          </tbody>
        </table>
        {payFor && (
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', padding: '12px 16px', borderTop: '1px solid var(--wt-line)' }}>
            <div style={{ gridColumn: '1 / -1', fontWeight: 700 }}>Pay {payFor.bill_code} — {payFor.supplier_name} (balance {bdt(payFor.balance)})</div>
            <label>Amount<input className="wt-input" type="number" value={pay.amount} onChange={(e) => setPay((x) => ({ ...x, amount: e.target.value }))} /></label>
            <label>Method<select className="wt-input" value={pay.method} onChange={(e) => setPay((x) => ({ ...x, method: e.target.value }))}>{['bank_transfer', 'cash', 'bkash', 'nagad', 'cheque', 'card'].map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
            <label>Reference<input className="wt-input" value={pay.reference} onChange={(e) => setPay((x) => ({ ...x, reference: e.target.value }))} /></label>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="wt-btn" onClick={() => setPayFor(null)}>Cancel</button>
              <button className="wt-btn primary" onClick={doPay} disabled={busy}>Record payment</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
