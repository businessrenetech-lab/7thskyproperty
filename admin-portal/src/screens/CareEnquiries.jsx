import React, { useCallback, useEffect, useState } from 'react';
import { MessageSquare, Plus, ArrowRight, Phone } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Spinner, Badge, Button, Drawer, Field, Input, Select, Textarea, EmptyState } from '../ui/kit';

const money = (v) => '৳' + Number(v || 0).toLocaleString();
const STAGES = [['new', 'New', 'blue'], ['contacted', 'Contacted', 'amber'], ['assessment', 'Assessment', 'amber'], ['quoted', 'Quoted', 'amber'], ['won', 'Won', 'green'], ['lost', 'Lost', 'red']];

function useEnquiries() {
  const [rows, setRows] = useState([]); const [counts, setCounts] = useState({}); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); try { const { data } = await api.get('/care/enquiries?limit=300'); setRows(data.data || []); setCounts(data.stage_counts || {}); } catch { } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  return { rows, counts, loading, load };
}

function CreateEnquiry({ onClose, onSaved }) {
  const toast = useToast();
  const [services, setServices] = useState([]);
  const [f, setF] = useState({ customer_name: '', mobile: '', email: '', service_id: '', district: '', property_type: '', message: '', source: 'phone' });
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get('/service-catalog/items').then(({ data }) => setServices(data.data || [])).catch(() => {}); }, []);
  const save = async () => { if (!f.customer_name && !f.mobile) return toast.error('Name or mobile required'); setBusy(true); try { const { data } = await api.post('/care/enquiries', f); toast.success(data.message); onSaved(); } catch (e) { toast.error(e.response?.data?.error || 'Failed'); } finally { setBusy(false); } };
  return (
    <Drawer title="New enquiry" width={500} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? <Spinner /> : 'Log enquiry'}</Button></>}>
      <div className="form-grid">
        <Field label="Customer name"><Input value={f.customer_name} onChange={(e) => setF((p) => ({ ...p, customer_name: e.target.value }))} /></Field>
        <Field label="Mobile"><Input value={f.mobile} onChange={(e) => setF((p) => ({ ...p, mobile: e.target.value }))} /></Field>
        <Field label="Email"><Input value={f.email} onChange={(e) => setF((p) => ({ ...p, email: e.target.value }))} /></Field>
        <Field label="District"><Input value={f.district} onChange={(e) => setF((p) => ({ ...p, district: e.target.value }))} /></Field>
      </div>
      <Field label="Service interest"><Select value={f.service_id} onChange={(e) => setF((p) => ({ ...p, service_id: e.target.value }))}><option value="">Select…</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
      <Field label="Source"><Select value={f.source} onChange={(e) => setF((p) => ({ ...p, source: e.target.value }))}><option value="phone">Phone</option><option value="web">Website</option><option value="referral">Referral</option><option value="walk_in">Walk-in</option><option value="manual">Other</option></Select></Field>
      <Field label="Message"><Textarea rows={2} value={f.message} onChange={(e) => setF((p) => ({ ...p, message: e.target.value }))} /></Field>
    </Drawer>
  );
}

// ─── Enquiries list ─────────────────────────────────────────────────────────
export default function CareEnquiries() {
  const toast = useToast();
  const { rows, loading, load } = useEnquiries();
  const [create, setCreate] = useState(false);
  const convert = async (id) => { try { const { data } = await api.post(`/care/enquiries/${id}/convert`); toast.success(data.message); load(); } catch (e) { toast.error(e.response?.data?.error || 'Failed'); } };
  return (
    <div className="pm-scope">
      <PageHead title="Service Enquiries" desc="Incoming service requests. Qualify, then convert to a work order." actions={<Button icon={Plus} onClick={() => setCreate(true)}>New enquiry</Button>} />
      {loading ? <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div> : !rows.length ? (
        <div className="pm-card"><EmptyState icon={MessageSquare} title="No enquiries yet" /></div>
      ) : (
        <div className="pm-card" style={{ overflowX: 'auto' }}>
          <table className="pm-tbl">
            <thead><tr><th>Enquiry</th><th>Customer</th><th>Service interest</th><th>District</th><th>Stage</th><th /></tr></thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td><span className="code-chip">{e.enquiry_code}</span></td>
                  <td><div className="cell-strong">{e.customer_name || '—'}</div><div className="cell-sub">{e.mobile || ''}</div></td>
                  <td>{e.service_interest || e.service?.name || '—'}</td>
                  <td>{e.district || '—'}</td>
                  <td><Badge tone={(STAGES.find((s) => s[0] === e.stage) || [])[2] || 'grey'} dot>{(STAGES.find((s) => s[0] === e.stage) || [])[1]}</Badge></td>
                  <td style={{ textAlign: 'right' }}>{e.work_order_id ? <span className="cell-sub">Converted</span> : <Button size="sm" variant="ghost" icon={ArrowRight} onClick={() => convert(e.id)}>To work order</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {create && <CreateEnquiry onClose={() => setCreate(false)} onSaved={() => { setCreate(false); load(); }} />}
    </div>
  );
}

// ─── Leads kanban ───────────────────────────────────────────────────────────
export function CareLeads() {
  const toast = useToast();
  const { rows, loading, load } = useEnquiries();
  const [create, setCreate] = useState(false);
  const move = async (id, stage) => { try { await api.patch(`/care/enquiries/${id}/stage`, { stage }); load(); } catch { toast.error('Failed'); } };
  return (
    <div className="pm-scope">
      <PageHead title="Service Leads" desc="Move enquiries through the pipeline to won." actions={<Button icon={Plus} onClick={() => setCreate(true)}>New lead</Button>} />
      {loading ? <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div> : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STAGES.length}, minmax(180px,1fr))`, gap: 12, overflowX: 'auto' }}>
          {STAGES.map(([key, label, tone]) => {
            const col = rows.filter((r) => r.stage === key);
            return (
              <div key={key} className="pm-card" style={{ background: 'var(--surface-2)' }}>
                <div className="pm-card-h" style={{ padding: '12px 14px 8px' }}><h3 style={{ fontSize: 13 }}>{label}</h3><div className="sp" /><Badge tone={tone}>{col.length}</Badge></div>
                <div style={{ padding: '0 10px 12px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 60 }}>
                  {col.map((e) => (
                    <div key={e.id} className="pm-card" style={{ padding: 10 }}>
                      <div style={{ fontWeight: 650, fontSize: 13 }}>{e.customer_name || e.mobile}</div>
                      <div className="cell-sub" style={{ fontSize: 11.5 }}>{e.service_interest || '—'}{e.district ? ` · ${e.district}` : ''}</div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                        {STAGES.filter((s) => s[0] !== key && ['contacted', 'assessment', 'quoted', 'won', 'lost'].includes(s[0])).slice(0, 3).map(([sk, sl]) => (
                          <button key={sk} className="pm-pill" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => move(e.id, sk)}>→ {sl}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {create && <CreateEnquiry onClose={() => setCreate(false)} onSaved={() => { setCreate(false); load(); }} />}
    </div>
  );
}
