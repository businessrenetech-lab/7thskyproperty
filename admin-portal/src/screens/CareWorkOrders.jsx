import React, { useCallback, useEffect, useState } from 'react';
import { ClipboardList, Plus, Wrench, UserCheck, Receipt, Check, MapPin, Search } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Spinner, Badge, Button, Drawer, Field, Input, Select, Textarea, EmptyState } from '../ui/kit';

const money = (v) => '৳' + Number(v || 0).toLocaleString();
const STATUS = { draft: 'grey', priced: 'blue', matching: 'blue', assigned: 'amber', accepted: 'amber', scheduled: 'amber', in_progress: 'amber', completed: 'green', inspected: 'green', invoiced: 'green', closed: 'grey', cancelled: 'red' };
const FLOW = ['assigned', 'accepted', 'scheduled', 'in_progress', 'completed', 'inspected'];

export default function CareWorkOrders() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [create, setCreate] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get(`/care/work-orders?limit=200${tab !== 'all' ? `&status=${tab}` : ''}`); setRows(data.data || []); setCounts(data.status_counts || {}); }
    catch { toast.error('Failed to load work orders'); } finally { setLoading(false); }
  }, [tab, toast]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="pm-scope">
      <PageHead title="Work Orders & Service Tracking" desc="Raise a job, auto-price it, match a verified provider, and track it to completion." actions={<Button icon={Plus} onClick={() => setCreate(true)}>New work order</Button>} />
      <div className="pm-segment" style={{ marginBottom: 16, overflowX: 'auto' }}>
        {['all', 'priced', 'assigned', 'in_progress', 'completed', 'invoiced'].map((s) => (
          <button key={s} className={tab === s ? 'on' : ''} onClick={() => setTab(s)} style={{ whiteSpace: 'nowrap', textTransform: 'capitalize' }}>{s.replace(/_/g, ' ')}{counts[s] ? ` (${counts[s]})` : ''}</button>
        ))}
      </div>
      {loading ? <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div> : !rows.length ? (
        <div className="pm-card"><EmptyState icon={ClipboardList} title="No work orders" hint="Raise a service work order to get started." /></div>
      ) : (
        <div className="pm-card" style={{ overflowX: 'auto' }}>
          <table className="pm-tbl">
            <thead><tr><th>Work order</th><th>Service</th><th>Customer</th><th>Provider</th><th>Value</th><th>Our fee</th><th>Provider</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((w) => (
                <tr key={w.id} onClick={() => setDetailId(w.id)}>
                  <td><span className="code-chip">{w.work_order_code}</span></td>
                  <td><div className="cell-strong">{w.service_name || '—'}</div><div className="cell-sub">{w.district || ''}</div></td>
                  <td>{w.customer_name || w.customer?.full_name || '—'}</td>
                  <td>{w.provider?.company_name || (w.delivery_mode === 'internal' ? <Badge tone="green">Our team</Badge> : <span className="cell-sub">Unassigned</span>)}</td>
                  <td className="pm-num">{money(w.service_value)}</td>
                  <td className="pm-num" style={{ color: 'var(--good)' }}>{money(w.sspc_fee)}</td>
                  <td className="pm-num">{money(w.provider_charge)}</td>
                  <td><Badge tone={STATUS[w.status] || 'grey'} dot>{w.status?.replace(/_/g, ' ')}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {create && <CreateWO onClose={() => setCreate(false)} onSaved={(id) => { setCreate(false); load(); setDetailId(id); }} />}
      {detailId && <WODetail id={detailId} onClose={() => setDetailId(null)} onChanged={load} />}
    </div>
  );
}

function CreateWO({ onClose, onSaved }) {
  const toast = useToast();
  const [services, setServices] = useState([]);
  const [f, setF] = useState({ service_id: '', customer_name: '', customer_phone: '', site_address: '', district: '', service_value: '', scope: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get('/service-catalog/items').then(({ data }) => setServices(data.data || [])).catch(() => {}); }, []);
  const onService = (id) => { const s = services.find((x) => String(x.id) === String(id)); setF((p) => ({ ...p, service_id: id, service_value: s && Number(s.base_price) > 0 ? s.base_price : p.service_value })); };
  const save = async () => {
    if (!f.service_id) return toast.error('Pick a service');
    setBusy(true);
    try { const { data } = await api.post('/care/work-orders', f); toast.success(data.message); onSaved(data.data.id); }
    catch (e) { toast.error(e.response?.data?.error || 'Failed'); } finally { setBusy(false); }
  };
  return (
    <Drawer title="New service work order" width={540} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? <Spinner /> : 'Create & price'}</Button></>}>
      <Field label="Service" required>
        <Select value={f.service_id} onChange={(e) => onService(e.target.value)}>
          <option value="">Select a service…</option>
          {services.map((s) => <option key={s.id} value={s.id}>{s.category?.name ? `${s.category.name} · ` : ''}{s.name}{Number(s.base_price) > 0 ? ` (৳${Number(s.base_price).toLocaleString()})` : ''}</option>)}
        </Select>
      </Field>
      <div className="form-grid">
        <Field label="Customer name"><Input value={f.customer_name} onChange={(e) => setF((p) => ({ ...p, customer_name: e.target.value }))} /></Field>
        <Field label="Phone"><Input value={f.customer_phone} onChange={(e) => setF((p) => ({ ...p, customer_phone: e.target.value }))} /></Field>
        <Field label="District"><Input value={f.district} onChange={(e) => setF((p) => ({ ...p, district: e.target.value }))} placeholder="e.g. Dhaka" /></Field>
        <Field label="Service value (৳)"><Input type="number" value={f.service_value} onChange={(e) => setF((p) => ({ ...p, service_value: e.target.value }))} /></Field>
      </div>
      <Field label="Site address"><Input value={f.site_address} onChange={(e) => setF((p) => ({ ...p, site_address: e.target.value }))} /></Field>
      <Field label="Scope / notes"><Textarea rows={2} value={f.scope} onChange={(e) => setF((p) => ({ ...p, scope: e.target.value }))} /></Field>
      <div className="cell-sub" style={{ fontSize: 12 }}>Seventh Sky fee and the provider charge are calculated automatically from the service's fee split.</div>
    </Drawer>
  );
}

function WODetail({ id, onClose, onChanged }) {
  const toast = useToast();
  const [w, setW] = useState(null);
  const [matches, setMatches] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { const { data } = await api.get(`/care/work-orders/${id}`); setW(data.data); } catch { toast.error('Load failed'); } }, [id, toast]);
  useEffect(() => { load(); }, [load]);
  const act = async (fn, ok) => { setBusy(true); try { await fn(); toast.success(ok); await load(); onChanged?.(); } catch (e) { toast.error(e.response?.data?.error || 'Failed'); } finally { setBusy(false); } };
  const findMatches = async () => { try { const { data } = await api.get(`/care/work-orders/${id}/matches`); setMatches(data.data || []); } catch { toast.error('Match failed'); } };
  if (!w) return <Drawer title="Work order" width={640} onClose={onClose}><div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div></Drawer>;

  const Sec = ({ icon: Ic, title, children, right }) => (<div className="pm-card" style={{ marginBottom: 14 }}><div className="pm-card-h"><div className="ic"><Ic size={16} /></div><h3>{title}</h3><div className="sp" />{right}</div><div style={{ padding: '0 16px 16px' }}>{children}</div></div>);
  const nextStatus = FLOW[FLOW.indexOf(w.status) + 1] || (w.status === 'draft' || w.status === 'priced' ? 'assigned' : null);

  return (
    <Drawer title={w.work_order_code} width={680} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Close</Button>{!w.invoice_id && <Button icon={Receipt} onClick={() => act(() => api.post(`/care/work-orders/${id}/invoice`), 'Invoice raised')} disabled={busy || !(w.service_value > 0)}>Raise invoice</Button>}</>}>
      <div className="pm-scope">
        <div className="between" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div><div style={{ fontWeight: 700, fontSize: 15 }}>{w.service_name}</div><div className="cell-sub">{w.customer_name}{w.customer_phone ? ` · ${w.customer_phone}` : ''} · {[w.site_address, w.district].filter(Boolean).join(', ')}</div></div>
          <Badge tone={STATUS[w.status] || 'grey'} dot>{w.status?.replace(/_/g, ' ')}</Badge>
        </div>

        <Sec icon={Receipt} title="Pricing">
          <div className="fin" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[['Service value', w.service_value, 'var(--ink)'], ['Seventh Sky fee', w.sspc_fee, 'var(--good)'], ['Provider charge', w.provider_charge, 'var(--navy)']].map(([l, v, c]) => (
              <div key={l} style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px' }}><div style={{ fontSize: 10.5, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 650 }}>{l}</div><div className="pm-num" style={{ fontSize: 17, fontWeight: 780, marginTop: 4, color: c }}>{money(v)}</div></div>
            ))}
          </div>
        </Sec>

        <Sec icon={UserCheck} title="Provider assignment" right={<Button size="sm" variant="ghost" icon={Search} onClick={findMatches}>Find matches</Button>}>
          {w.provider ? <div className="pm-row" style={{ padding: '9px 0' }}><UserCheck size={16} color="var(--good)" /><div className="grow"><div style={{ fontWeight: 600 }}>{w.provider.company_name}</div><div className="sub">Assigned provider</div></div><Badge tone="green" dot>Assigned</Badge></div>
            : w.delivery_mode === 'internal' ? <Badge tone="green">Our internal team</Badge>
            : <div className="cell-sub">No provider assigned. Find matches to assign a verified provider.</div>}
          {matches && (
            <div style={{ marginTop: 10 }}>
              <div className="cell-sub" style={{ marginBottom: 6 }}>{matches.filter((m) => m.eligible).length} eligible of {matches.length}</div>
              {matches.map((m) => (
                <div key={m.id} className="pm-row" style={{ padding: '9px 0', opacity: m.eligible ? 1 : 0.55 }}>
                  <div className="grow"><div style={{ fontWeight: 600, fontSize: 13 }}>{m.company_name}</div><div className="sub">{m.capable ? 'Capable' : 'Not capable'} · {m.territory_ok ? 'In territory' : 'Out of territory'}{m.rating ? ` · ★ ${m.rating}` : ''}</div></div>
                  <Button size="sm" variant={m.eligible ? 'primary' : 'ghost'} onClick={() => act(() => api.post(`/care/work-orders/${id}/assign`, { assigned_provider_id: m.id }), `Assigned ${m.company_name}`)}>Assign</Button>
                </div>
              ))}
              <Button size="sm" variant="ghost" style={{ marginTop: 6 }} onClick={() => act(() => api.post(`/care/work-orders/${id}/assign`, { delivery_mode: 'internal' }), 'Assigned to our team')}>Assign to our internal team instead</Button>
            </div>
          )}
        </Sec>

        <Sec icon={Wrench} title="Service tracking">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {FLOW.map((s) => <Badge key={s} tone={FLOW.indexOf(s) <= FLOW.indexOf(w.status) ? 'green' : 'grey'} dot>{s.replace(/_/g, ' ')}</Badge>)}
          </div>
          {nextStatus && <Button size="sm" style={{ marginTop: 12 }} icon={Check} onClick={() => act(() => api.patch(`/care/work-orders/${id}/status`, { status: nextStatus }), `Marked ${nextStatus.replace(/_/g, ' ')}`)}>Mark {nextStatus.replace(/_/g, ' ')} →</Button>}
        </Sec>

        {w.invoice_id && <Sec icon={Receipt} title="Billing"><Badge tone="green" dot>Invoiced</Badge> <span className="cell-sub" style={{ marginLeft: 8 }}>Payment status: {w.payment_status}</span></Sec>}
      </div>
    </Drawer>
  );
}
