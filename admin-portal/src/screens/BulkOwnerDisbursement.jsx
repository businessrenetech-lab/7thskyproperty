import React, { useState, useMemo, useCallback } from 'react';
import { Play, RefreshCw, Wallet, Users, Layers, Landmark } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Button, Field, Input, Select, Spinner, Badge } from '../ui/kit';

/*
 * Bulk Owner Disbursement (PM Phase 2). Aggregate held balances per landlord
 * folio, pick which to pay, and run each through the existing owner-payout
 * engine (backend /disbursements/bulk-owner). Every payout records its
 * OwnerDisbursement + owner_payout folio credit + before/after balance exactly
 * as a single payout does — no parallel money path.
 */
const money = (v) => 'BDT ' + Number(v || 0).toLocaleString();
const METHODS = ['bank_transfer', 'cash', 'bkash', 'nagad', 'cheque', 'other'];

export default function BulkOwnerDisbursement() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [owner, setOwner] = useState('');
  const [min, setMin] = useState('');
  const [entries, setEntries] = useState({}); // folio_id -> { selected, amount, method, reference }

  const load = useCallback(async () => {
    setLoading(true); setResults(null);
    try {
      const params = {};
      if (owner) params.owner_id = owner;
      if (min) params.min = min;
      const { data } = await api.get('/disbursements/bulk-owner-data', { params });
      const list = data.data || [];
      setRows(list);
      setSummary(data.summary || null);
      const seed = {};
      list.forEach((r) => { seed[r.folio_id] = { selected: true, amount: r.payable, method: r.bank?.preferred_payment || 'bank_transfer', reference: '' }; });
      setEntries(seed);
    } catch (e) { toast.error(e.response?.data?.error || 'Could not load owner balances'); }
    finally { setLoading(false); }
  }, [owner, min, toast]);

  const owners = useMemo(() => {
    const seen = new Map();
    rows.forEach((r) => { if (r.owner_contact_id) seen.set(r.owner_contact_id, r.owner_name); });
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [rows]);

  const setEntry = (id, patch) => setEntries((s) => ({ ...s, [id]: { ...s[id], ...patch } }));
  const selectedRows = rows.filter((r) => entries[r.folio_id]?.selected);
  const selectedTotal = selectedRows.reduce((s, r) => s + Number(entries[r.folio_id]?.amount || 0), 0);
  const allSelected = rows.length > 0 && rows.every((r) => entries[r.folio_id]?.selected);
  const toggleAll = (on) => setEntries((s) => { const n = { ...s }; rows.forEach((r) => { n[r.folio_id] = { ...n[r.folio_id], selected: on }; }); return n; });
  const payFull = () => setEntries((s) => { const n = { ...s }; rows.forEach((r) => { if (n[r.folio_id]?.selected) n[r.folio_id] = { ...n[r.folio_id], amount: r.payable }; }); return n; });

  const run = async () => {
    const payload = selectedRows.map((r) => ({
      folio_id: r.folio_id, owner_contact_id: r.owner_contact_id, property_id: r.property_id,
      amount: Number(entries[r.folio_id].amount || 0), method: entries[r.folio_id].method || 'bank_transfer', reference: entries[r.folio_id].reference || null,
    })).filter((e) => e.amount > 0);
    if (!payload.length) { toast.error('Select at least one owner with an amount.'); return; }
    setRunning(true); setResults(null);
    try {
      const { data } = await api.post('/disbursements/bulk-owner', { entries: payload });
      setResults(data);
      const s = data.summary || {};
      toast.success(`Disbursed ${money(s.total_disbursed)} — ${s.paid} paid, ${s.failed} failed, ${s.skipped} skipped`);
      load();
    } catch (e) { toast.error(e.response?.data?.error || 'Disbursement run failed'); }
    finally { setRunning(false); }
  };

  const resultFor = (id) => results?.results?.find((x) => x.folio_id === id);

  return (
    <>
      <PageHead title="Bulk Owner Disbursement"
        desc="Pay every owner their held balance in one run. Each payout posts through the normal owner-payout engine — folio balances, disbursement records and statements update automatically."
        actions={<Button icon={Play} onClick={run} disabled={running || !selectedRows.length}>{running ? <Spinner /> : `Pay ${selectedRows.length} owner${selectedRows.length === 1 ? '' : 's'} · ${money(selectedTotal)}`}</Button>} />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-pad" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
          <Field label="Owner"><Select value={owner} onChange={(e) => setOwner(e.target.value)}><option value="">All owners</option>{owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</Select></Field>
          <Field label="Minimum balance"><Input type="number" min="0" placeholder="e.g. 1000" value={min} onChange={(e) => setMin(e.target.value)} /></Field>
          <Button icon={loading ? undefined : RefreshCw} onClick={load} disabled={loading}>{loading ? <Spinner /> : 'Load'}</Button>
        </div>
      </div>

      {summary && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <Kpi icon={Layers} label="Folios" value={summary.folios} />
          <Kpi icon={Users} label="Owners" value={summary.owners} />
          <Kpi icon={Wallet} label="Total payable" value={money(summary.total_payable)} tone="amber" />
          <Kpi icon={Wallet} label="Selected" value={`${selectedRows.length} · ${money(selectedTotal)}`} tone="green" />
        </div>
      )}

      {rows.length > 0 && (
        <div className="card-pad" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
            <input type="checkbox" checked={allSelected} onChange={(e) => toggleAll(e.target.checked)} /> Select all
          </label>
          <Button size="sm" variant="ghost" onClick={payFull}>Amount = full balance</Button>
        </div>
      )}

      <div className="card">
        {loading ? <div className="card-pad"><Spinner /></div> : !rows.length ? (
          <div className="card-pad" style={{ color: 'var(--muted, #64748b)' }}>No owner is holding a positive balance. Collect rent first, then owners become payable here.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr>
                <th style={{ width: 34 }} />
                <th>Owner / Property</th>
                <th>Bank / method on file</th>
                <th style={{ textAlign: 'right' }}>Held</th>
                <th style={{ width: 130, textAlign: 'right' }}>Pay</th>
                <th style={{ width: 130 }}>Method</th>
                <th style={{ width: 120 }}>Reference</th>
                <th style={{ width: 110 }}>Status</th>
              </tr></thead>
              <tbody>
                {rows.map((r) => {
                  const e = entries[r.folio_id] || {};
                  const res = resultFor(r.folio_id);
                  const bank = r.bank;
                  return (
                    <tr key={r.folio_id}>
                      <td><input type="checkbox" checked={!!e.selected} onChange={(ev) => setEntry(r.folio_id, { selected: ev.target.checked })} /></td>
                      <td>
                        <div className="cell-strong">{r.owner_name}</div>
                        <div className="cell-sub">{[r.property_title, r.property_code].filter(Boolean).join(' · ')} · {r.folio_code}</div>
                      </td>
                      <td className="cell-sub">
                        {bank
                          ? <><Landmark size={11} style={{ verticalAlign: -1, marginRight: 4 }} />{[bank.bank_name, bank.bank_account_number].filter(Boolean).join(' · ') || bank.preferred_payment || bank.bkash_number || bank.nagad_number || '—'}</>
                          : <span style={{ color: 'var(--danger,#dc2626)' }}>No bank details on file</span>}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{money(r.payable)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <input className="input" style={{ width: 110, textAlign: 'right' }} type="number" min="0" max={r.payable} value={e.amount ?? ''}
                          onChange={(ev) => setEntry(r.folio_id, { amount: ev.target.value, selected: true })} />
                      </td>
                      <td>
                        <select className="select" value={e.method || 'bank_transfer'} onChange={(ev) => setEntry(r.folio_id, { method: ev.target.value })}>
                          {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </td>
                      <td><input className="input" style={{ width: 110 }} value={e.reference || ''} onChange={(ev) => setEntry(r.folio_id, { reference: ev.target.value })} /></td>
                      <td>
                        {res
                          ? <Badge tone={res.status === 'paid' ? 'green' : res.status === 'skipped' ? 'grey' : 'red'} dot>{res.status}</Badge>
                          : <Badge tone="amber">held</Badge>}
                        {res?.disbursement_code && <div className="cell-sub">{res.disbursement_code}</div>}
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
