import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Plus, CalendarClock } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Spinner, Badge, Button, Drawer, Field, Input, Select, EmptyState } from '../ui/kit';

const money = (v) => '৳' + Number(v || 0).toLocaleString();

export default function CareAmc() {
  const toast = useToast();
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [create, setCreate] = useState(false); const [busy, setBusy] = useState(0);
  const load = useCallback(async () => { setLoading(true); try { const { data } = await api.get('/care/amc?limit=200'); setRows(data.data || []); } catch { } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const genVisit = async (id) => { setBusy(id); try { const { data } = await api.post(`/care/amc/${id}/generate-visit`); toast.success(data.message); load(); } catch (e) { toast.error(e.response?.data?.error || 'Failed'); } finally { setBusy(0); } };

  return (
    <div className="pm-scope">
      <PageHead title="AMC Contracts" desc="Recurring maintenance contracts that generate scheduled visits as work orders." actions={<Button icon={Plus} onClick={() => setCreate(true)}>New AMC contract</Button>} />
      {loading ? <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div> : !rows.length ? (
        <div className="pm-card"><EmptyState icon={RefreshCw} title="No AMC contracts yet" /></div>
      ) : (
        <div className="pm-card" style={{ overflowX: 'auto' }}>
          <table className="pm-tbl">
            <thead><tr><th>Contract</th><th>Customer</th><th>Service</th><th>Frequency</th><th>Annual value</th><th>Next visit</th><th>Visits</th><th /></tr></thead>
            <tbody>{rows.map((c) => (
              <tr key={c.id}>
                <td><span className="code-chip">{c.contract_code}</span></td>
                <td>{c.customer_name || '—'}</td>
                <td>{c.service_name || '—'}</td>
                <td style={{ textTransform: 'capitalize' }}>{c.frequency?.replace('_', '-')}</td>
                <td className="pm-num">{money(c.annual_value)}</td>
                <td>{c.next_visit_date || '—'}</td>
                <td><Badge tone="blue">{c.visits_done}/{c.visits_per_year}</Badge></td>
                <td style={{ textAlign: 'right' }}>{c.status === 'active' ? <Button size="sm" icon={CalendarClock} onClick={() => genVisit(c.id)} disabled={busy === c.id}>{busy === c.id ? <Spinner /> : 'Generate visit'}</Button> : <Badge tone="grey">{c.status}</Badge>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {create && <AmcDrawer onClose={() => setCreate(false)} onSaved={() => { setCreate(false); load(); }} />}
    </div>
  );
}

function AmcDrawer({ onClose, onSaved }) {
  const toast = useToast();
  const [services, setServices] = useState([]); const [providers, setProviders] = useState([]);
  const [f, setF] = useState({ service_id: '', customer_name: '', mobile: '', district: '', frequency: 'quarterly', annual_value: '', assigned_provider_id: '', start_date: new Date().toISOString().slice(0, 10) });
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get('/service-catalog/items').then(({ data }) => setServices(data.data || [])).catch(() => {}); api.get('/providers?limit=100').then(({ data }) => setProviders((data.data || []).filter((p) => p.onboarding_stage === 'active'))).catch(() => {}); }, []);
  const save = async () => { if (!f.customer_name) return toast.error('Customer required'); setBusy(true); try { const { data } = await api.post('/care/amc', f); toast.success(data.message); onSaved(); } catch (e) { toast.error(e.response?.data?.error || 'Failed'); } finally { setBusy(false); } };
  return (
    <Drawer title="New AMC contract" width={500} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? <Spinner /> : 'Create contract'}</Button></>}>
      <Field label="Service"><Select value={f.service_id} onChange={(e) => setF((p) => ({ ...p, service_id: e.target.value }))}><option value="">Select…</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
      <div className="form-grid">
        <Field label="Customer name" required><Input value={f.customer_name} onChange={(e) => setF((p) => ({ ...p, customer_name: e.target.value }))} /></Field>
        <Field label="Mobile"><Input value={f.mobile} onChange={(e) => setF((p) => ({ ...p, mobile: e.target.value }))} /></Field>
        <Field label="Frequency"><Select value={f.frequency} onChange={(e) => setF((p) => ({ ...p, frequency: e.target.value }))}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="half_yearly">Half-yearly</option><option value="annual">Annual</option></Select></Field>
        <Field label="Annual value (৳)"><Input type="number" value={f.annual_value} onChange={(e) => setF((p) => ({ ...p, annual_value: e.target.value }))} /></Field>
        <Field label="Start date"><Input type="date" value={f.start_date} onChange={(e) => setF((p) => ({ ...p, start_date: e.target.value }))} /></Field>
        <Field label="Assigned provider"><Select value={f.assigned_provider_id} onChange={(e) => setF((p) => ({ ...p, assigned_provider_id: e.target.value }))}><option value="">Internal / TBD</option>{providers.map((p) => <option key={p.id} value={p.id}>{p.company_name}</option>)}</Select></Field>
      </div>
    </Drawer>
  );
}
