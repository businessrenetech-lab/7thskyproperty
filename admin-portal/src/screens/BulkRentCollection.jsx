import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, RefreshCw, Search, CheckCircle2, Wallet, Layers, Bell } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Button, Field, Input, Select, Spinner, Badge } from '../ui/kit';

/*
 * Bulk Rent Collection (PM Phase 1). One "Collect Rent" run for the whole
 * portfolio: pick a month, filter, see every active tenancy's arrears-aware due,
 * edit amounts, and record many payments in a single pass. Every payment posts
 * through the existing rent-invoice + recordPayment engine (backend
 * /tenancies/collect-rent), so owner fees, folios and receipts stay correct.
 */
const money = (v) => 'BDT ' + Number(v || 0).toLocaleString();
const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const todayISO = () => new Date().toISOString().slice(0, 10);
const METHODS = ['cash', 'bank', 'bkash', 'nagad', 'cheque', 'card', 'other'];

export default function BulkRentCollection() {
  const toast = useToast();
  const nav = useNavigate();
  const [month, setMonth] = useState(thisMonth());
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);

  // filters
  const [owner, setOwner] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');

  // per-row entry state: { [tenancy_id]: { selected, amount, method, reference } }
  const [entries, setEntries] = useState({});

  const load = useCallback(async () => {
    setLoading(true); setResults(null);
    try {
      const params = { month };
      if (owner) params.owner_id = owner;
      if (status) params.status = status;
      if (q.trim()) params.q = q.trim();
      const { data } = await api.get('/tenancies/collect-rent-data', { params });
      const list = data.data || [];
      setRows(list);
      setSummary(data.summary || null);
      // pre-fill: select every not-paid row with its suggested amount
      const seed = {};
      list.forEach((r) => {
        seed[r.tenancy_id] = {
          selected: r.status !== 'paid' && (r.suggested_amount || 0) > 0,
          amount: r.suggested_amount || r.month_charge || 0,
          method: 'cash', reference: '',
        };
      });
      setEntries(seed);
    } catch (e) { toast.error(e.response?.data?.error || 'Could not load rent data'); }
    finally { setLoading(false); }
  }, [month, owner, status, q, toast]);

  const owners = useMemo(() => {
    const seen = new Map();
    rows.forEach((r) => { if (r.owner_contact_id) seen.set(r.owner_contact_id, r.owner_name); });
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [rows]);

  const setEntry = (id, patch) => setEntries((s) => ({ ...s, [id]: { ...s[id], ...patch } }));
  const selectedRows = rows.filter((r) => entries[r.tenancy_id]?.selected);
  const selectedTotal = selectedRows.reduce((s, r) => s + Number(entries[r.tenancy_id]?.amount || 0), 0);
  const allSelected = rows.length > 0 && rows.every((r) => entries[r.tenancy_id]?.selected || r.status === 'paid');
  const toggleAll = (on) => setEntries((s) => {
    const next = { ...s };
    rows.forEach((r) => { if (r.status !== 'paid') next[r.tenancy_id] = { ...next[r.tenancy_id], selected: on }; });
    return next;
  });
  const setAmountToDue = () => setEntries((s) => {
    const next = { ...s };
    rows.forEach((r) => { if (next[r.tenancy_id]?.selected) next[r.tenancy_id] = { ...next[r.tenancy_id], amount: r.month_outstanding || r.month_charge }; });
    return next;
  });
  const addArrears = () => setEntries((s) => {
    const next = { ...s };
    rows.forEach((r) => { if (next[r.tenancy_id]?.selected) next[r.tenancy_id] = { ...next[r.tenancy_id], amount: Number(r.month_outstanding || r.month_charge) + Number(r.arrears || 0) }; });
    return next;
  });

  const run = async () => {
    const payload = selectedRows.map((r) => ({
      tenancy_id: r.tenancy_id, amount: Number(entries[r.tenancy_id].amount || 0),
      method: entries[r.tenancy_id].method || 'cash', reference: entries[r.tenancy_id].reference || null, paid_at: todayISO(),
    })).filter((e) => e.amount > 0);
    if (!payload.length) { toast.error('Select at least one tenancy with an amount.'); return; }
    setRunning(true); setResults(null);
    try {
      const { data } = await api.post('/tenancies/collect-rent', { month, entries: payload });
      setResults(data);
      const s = data.summary || {};
      toast.success(`Collected ${money(s.total_collected)} — ${s.paid} paid, ${s.failed} failed, ${s.skipped} skipped`);
      load();
    } catch (e) { toast.error(e.response?.data?.error || 'Collection run failed'); }
    finally { setRunning(false); }
  };

  const tone = (st) => (st === 'paid' ? 'green' : st === 'partial' ? 'amber' : 'grey');
  const resultFor = (id) => results?.results?.find((x) => x.tenancy_id === id);

  return (
    <>
      <PageHead title="Bulk Rent Collection"
        desc="Collect rent across the whole portfolio for a month in one run. Each payment posts through the normal rent engine — owner fees, folios and receipts update automatically."
        actions={<><Button variant="ghost" icon={Bell} onClick={() => nav('/property-management/rent-reminders')}>Remind first</Button><Button icon={Play} onClick={run} disabled={running || !selectedRows.length}>{running ? <Spinner /> : `Record ${selectedRows.length} payment${selectedRows.length === 1 ? '' : 's'} · ${money(selectedTotal)}`}</Button></>} />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-pad" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
          <Field label="Month"><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></Field>
          <Field label="Owner"><Select value={owner} onChange={(e) => setOwner(e.target.value)}><option value="">All owners</option>{owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</Select></Field>
          <Field label="Status"><Select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option><option value="due">Due</option><option value="partial">Partial</option><option value="paid">Paid</option></Select></Field>
          <Field label="Search"><Input placeholder="Tenant / property / unit / phone" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} /></Field>
          <Button icon={loading ? undefined : RefreshCw} onClick={load} disabled={loading}>{loading ? <Spinner /> : 'Load'}</Button>
        </div>
      </div>

      {summary && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <Kpi icon={Layers} label="Tenancies" value={summary.tenancies} />
          <Kpi icon={Wallet} label="Due this month" value={money(summary.total_due)} tone="amber" />
          <Kpi icon={Wallet} label="Arrears (prior)" value={money(summary.total_arrears)} tone={summary.total_arrears ? 'red' : 'grey'} />
          <Kpi icon={CheckCircle2} label="Selected" value={`${selectedRows.length} · ${money(selectedTotal)}`} tone="green" />
        </div>
      )}

      {rows.length > 0 && (
        <div className="card-pad" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
            <input type="checkbox" checked={allSelected} onChange={(e) => toggleAll(e.target.checked)} /> Select all due
          </label>
          <Button size="sm" variant="ghost" onClick={setAmountToDue}>Amount = this month</Button>
          <Button size="sm" variant="ghost" onClick={addArrears}>Amount = month + arrears</Button>
        </div>
      )}

      <div className="card">
        {loading ? <div className="card-pad"><Spinner /></div> : !rows.length ? (
          <div className="card-pad" style={{ color: 'var(--muted, #64748b)' }}>Pick a month and press Load to see who owes rent.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr>
                <th style={{ width: 34 }} />
                <th>Tenant / Property</th>
                <th>Owner</th>
                <th style={{ textAlign: 'right' }}>This month</th>
                <th style={{ textAlign: 'right' }}>Arrears</th>
                <th style={{ width: 130, textAlign: 'right' }}>Collect</th>
                <th style={{ width: 110 }}>Method</th>
                <th style={{ width: 120 }}>Receipt no.</th>
                <th style={{ width: 96 }}>Status</th>
              </tr></thead>
              <tbody>
                {rows.map((r) => {
                  const e = entries[r.tenancy_id] || {};
                  const res = resultFor(r.tenancy_id);
                  return (
                    <tr key={r.tenancy_id}>
                      <td><input type="checkbox" disabled={r.status === 'paid'} checked={!!e.selected} onChange={(ev) => setEntry(r.tenancy_id, { selected: ev.target.checked })} /></td>
                      <td>
                        <div className="cell-strong">{r.tenant_name}</div>
                        <div className="cell-sub">{[r.property_title, r.unit].filter(Boolean).join(' · ') || r.property_code} · {r.tenancy_code}</div>
                      </td>
                      <td className="cell-sub">{r.owner_name}</td>
                      <td style={{ textAlign: 'right' }}>{money(r.month_outstanding || r.month_charge)}</td>
                      <td style={{ textAlign: 'right', color: r.arrears ? 'var(--danger, #dc2626)' : 'inherit' }}>{r.arrears ? money(r.arrears) : '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <input className="input" style={{ width: 110, textAlign: 'right' }} type="number" min="0" value={e.amount ?? ''} disabled={r.status === 'paid'}
                          onChange={(ev) => setEntry(r.tenancy_id, { amount: ev.target.value, selected: true })} />
                      </td>
                      <td>
                        <select className="select" value={e.method || 'cash'} disabled={r.status === 'paid'} onChange={(ev) => setEntry(r.tenancy_id, { method: ev.target.value })}>
                          {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </td>
                      <td><input className="input" style={{ width: 110 }} value={e.reference || ''} disabled={r.status === 'paid'} onChange={(ev) => setEntry(r.tenancy_id, { reference: ev.target.value })} /></td>
                      <td>
                        {res
                          ? <Badge tone={res.status === 'paid' ? 'green' : res.status === 'skipped' ? 'grey' : 'red'} dot>{res.status}</Badge>
                          : <Badge tone={tone(r.status)}>{r.status}</Badge>}
                        {res?.error && <div className="cell-sub" style={{ color: 'var(--danger,#dc2626)' }}>{res.error}</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function Kpi({ icon: Icon, label, value, tone = 'grey' }) {
  const c = { grey: '#334155', amber: '#b45309', red: '#dc2626', green: '#047857' }[tone] || '#334155';
  return (
    <div className="card" style={{ padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center', minWidth: 180 }}>
      <span style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 9, background: 'rgba(2,132,199,.10)', color: '#0284c7' }}><Icon size={16} /></span>
      <span>
        <span style={{ display: 'block', fontSize: 11.5, color: '#64748b' }}>{label}</span>
        <span style={{ display: 'block', fontSize: 16, fontWeight: 800, color: c }}>{value}</span>
      </span>
    </div>
  );
}
