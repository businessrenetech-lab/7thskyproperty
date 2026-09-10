import React, { useState, useMemo, useCallback } from 'react';
import { Send, RefreshCw, Bell, AlertTriangle, MailWarning, Clock } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Button, Field, Input, Select, Spinner, Badge } from '../ui/kit';

/*
 * Bulk Rent Reminders (PM Phase 4). List every overdue tenancy and send staged
 * arrears reminders in one pass (backend /tenancies/send-reminders, which reuses
 * the daily arrears-reminder service). Reminders touch no money — they email/log
 * and advance the reminder stage. Completes the remind → collect → disburse arc.
 */
const money = (v) => 'BDT ' + Number(v || 0).toLocaleString();
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString() : '—');

export default function RentReminders() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [owner, setOwner] = useState('');
  const [minDays, setMinDays] = useState('');
  const [force, setForce] = useState(false);
  const [sel, setSel] = useState({}); // tenancy_id -> bool

  const load = useCallback(async () => {
    setLoading(true); setResults(null);
    try {
      const params = {};
      if (owner) params.owner_id = owner;
      if (minDays) params.min_days = minDays;
      const { data } = await api.get('/tenancies/overdue-reminders', { params });
      const list = data.data || [];
      setRows(list);
      setSummary(data.summary || null);
      const seed = {}; list.forEach((r) => { seed[r.tenancy_id] = true; });
      setSel(seed);
    } catch (e) { toast.error(e.response?.data?.error || 'Could not load overdue tenancies'); }
    finally { setLoading(false); }
  }, [owner, minDays, toast]);

  const owners = useMemo(() => {
    const seen = new Map();
    rows.forEach((r) => { if (r.owner_contact_id) seen.set(r.owner_contact_id, r.owner_name); });
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [rows]);

  const selectedIds = rows.filter((r) => sel[r.tenancy_id]).map((r) => r.tenancy_id);
  const allSelected = rows.length > 0 && rows.every((r) => sel[r.tenancy_id]);
  const toggleAll = (on) => { const n = {}; rows.forEach((r) => { n[r.tenancy_id] = on; }); setSel(n); };

  const run = async () => {
    if (!selectedIds.length) { toast.error('Select at least one tenancy.'); return; }
    setRunning(true); setResults(null);
    try {
      const { data } = await api.post('/tenancies/send-reminders', { tenancy_ids: selectedIds, force });
      setResults(data);
      const s = data.summary || {};
      toast.success(`${s.sent} sent · ${s.no_email} logged (no email) · ${s.skipped} skipped · ${s.failed} failed`);
      load();
    } catch (e) { toast.error(e.response?.data?.error || 'Reminder run failed'); }
    finally { setRunning(false); }
  };

  const resultFor = (id) => results?.results?.find((x) => x.tenancy_id === id);
  const daysTone = (d) => (d >= 30 ? 'red' : d >= 8 ? 'amber' : 'grey');

  return (
    <>
      <PageHead title="Rent Reminders (Bulk)"
        desc="Send staged overdue-rent reminders to every tenant in arrears in one run. Reminders email the tenant (or log when no email is on file) and advance the reminder stage — no money is moved."
        actions={<Button icon={Send} onClick={run} disabled={running || !selectedIds.length}>{running ? <Spinner /> : `Send ${selectedIds.length} reminder${selectedIds.length === 1 ? '' : 's'}`}</Button>} />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-pad" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
          <Field label="Owner"><Select value={owner} onChange={(e) => setOwner(e.target.value)}><option value="">All owners</option>{owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</Select></Field>
          <Field label="Min days overdue"><Input type="number" min="0" placeholder="e.g. 7" value={minDays} onChange={(e) => setMinDays(e.target.value)} /></Field>
          <Button icon={loading ? undefined : RefreshCw} onClick={load} disabled={loading}>{loading ? <Spinner /> : 'Load'}</Button>
        </div>
      </div>

      {summary && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <Kpi icon={AlertTriangle} label="Overdue tenancies" value={summary.overdue} tone={summary.overdue ? 'red' : 'grey'} />
          <Kpi icon={Bell} label="Total overdue" value={money(summary.total_overdue)} tone="amber" />
          <Kpi icon={MailWarning} label="No email on file" value={summary.no_email} tone={summary.no_email ? 'amber' : 'grey'} />
          <Kpi icon={Send} label="Selected" value={selectedIds.length} tone="green" />
        </div>
      )}

      {rows.length > 0 && (
        <div className="card-pad" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
            <input type="checkbox" checked={allSelected} onChange={(e) => toggleAll(e.target.checked)} /> Select all
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }} title="Re-send even if a reminder was already sent for this overdue stage">
            <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} /> Force re-send
          </label>
        </div>
      )}

      <div className="card">
        {loading ? <div className="card-pad"><Spinner /></div> : !rows.length ? (
          <div className="card-pad" style={{ color: 'var(--muted, #64748b)' }}>Press Load to see tenants in arrears. Nothing overdue means every tenant is current.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr>
                <th style={{ width: 34 }} />
                <th>Tenant / Property</th>
                <th>Owner</th>
                <th style={{ textAlign: 'right' }}>Overdue</th>
                <th style={{ width: 110 }}>Days</th>
                <th style={{ width: 120 }}>Last reminder</th>
                <th style={{ width: 120 }}>Status</th>
              </tr></thead>
              <tbody>
                {rows.map((r) => {
                  const res = resultFor(r.tenancy_id);
                  return (
                    <tr key={r.tenancy_id}>
                      <td><input type="checkbox" checked={!!sel[r.tenancy_id]} onChange={(e) => setSel((s) => ({ ...s, [r.tenancy_id]: e.target.checked }))} /></td>
                      <td>
                        <div className="cell-strong">{r.tenant_name} {!r.has_email && <Badge tone="amber">no email</Badge>}</div>
                        <div className="cell-sub">{[r.property_title, r.unit].filter(Boolean).join(' · ') || r.property_code} · {r.tenancy_code}</div>
                      </td>
                      <td className="cell-sub">{r.owner_name}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{money(r.amount_due)}</td>
                      <td>{r.days_overdue == null ? <span className="cell-sub">—</span> : <Badge tone={daysTone(r.days_overdue)} dot>{r.days_overdue}d</Badge>}</td>
                      <td className="cell-sub"><Clock size={11} style={{ verticalAlign: -1, marginRight: 3 }} />{fmtDate(r.last_reminder_at)}</td>
                      <td>
                        {res
                          ? <Badge tone={res.status === 'sent' ? 'green' : res.status === 'failed' ? 'red' : 'grey'} dot>{res.status}</Badge>
                          : <Badge tone="grey">in arrears</Badge>}
                        {res?.reason && <div className="cell-sub">{res.reason}</div>}
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
