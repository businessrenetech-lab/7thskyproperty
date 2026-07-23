import React, { useCallback, useEffect, useState } from 'react';
import { FileText, Plus, FileSignature, ArrowRight, ClipboardCheck } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Spinner, Badge, Button, Drawer, Field, Input, Select, Textarea, EmptyState } from '../ui/kit';

const money = (v) => '৳' + Number(v || 0).toLocaleString();
const STATUS = { draft: 'grey', assessed: 'blue', sent: 'amber', accepted: 'green', rejected: 'red', expired: 'grey', converted: 'green' };

export default function CareQuotations() {
  const toast = useToast();
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true);
  const [create, setCreate] = useState(false); const [detail, setDetail] = useState(null);
  const load = useCallback(async () => { setLoading(true); try { const { data } = await api.get('/care/quotations?limit=200'); setRows(data.data || []); } catch { } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="pm-scope">
      <PageHead title="Quotations" desc="Site assessment → quote → customer agreement → work order." actions={<Button icon={Plus} onClick={() => setCreate(true)}>New quotation</Button>} />
      {loading ? <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div> : !rows.length ? (
        <div className="pm-card"><EmptyState icon={FileText} title="No quotations yet" hint="Assess a site and quote a customer to begin." /></div>
      ) : (
        <div className="pm-card" style={{ overflowX: 'auto' }}>
          <table className="pm-tbl">
            <thead><tr><th>Quote</th><th>Customer</th><th>Service</th><th>Amount</th><th>Agreement</th><th>Status</th></tr></thead>
            <tbody>{rows.map((q) => (
              <tr key={q.id} onClick={() => setDetail(q)}>
                <td><span className="code-chip">{q.quote_code}</span></td>
                <td>{q.customer_name || '—'}</td>
                <td>{q.service_name || '—'}</td>
                <td className="pm-num">{money(q.amount)}</td>
                <td>{q.agreement_status === 'signed' ? <Badge tone="green" dot>Signed</Badge> : q.agreement_status === 'sent' ? <Badge tone="amber" dot>Sent</Badge> : <span className="cell-sub">—</span>}</td>
                <td><Badge tone={STATUS[q.status] || 'grey'} dot>{q.status}</Badge></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {create && <QuoteDrawer onClose={() => setCreate(false)} onSaved={() => { setCreate(false); load(); }} />}
      {detail && <QuoteDetail q={detail} onClose={() => setDetail(null)} onChanged={load} />}
    </div>
  );
}

function QuoteDrawer({ onClose, onSaved }) {
  const toast = useToast();
  const [services, setServices] = useState([]);
  const [f, setF] = useState({ service_id: '', customer_name: '', email: '', mobile: '', district: '', tank_type: '', tank_capacity: '', tank_count: '', findings: '', amount: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get('/service-catalog/items').then(({ data }) => setServices(data.data || [])).catch(() => {}); }, []);
  const onService = (id) => { const s = services.find((x) => String(x.id) === String(id)); setF((p) => ({ ...p, service_id: id, amount: s && Number(s.base_price) > 0 ? s.base_price : p.amount })); };
  const save = async () => { if (!f.customer_name) return toast.error('Customer name required'); setBusy(true); try { const { data } = await api.post('/care/quotations', f); toast.success(data.message); onSaved(); } catch (e) { toast.error(e.response?.data?.error || 'Failed'); } finally { setBusy(false); } };
  return (
    <Drawer title="New quotation & site assessment" width={560} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? <Spinner /> : 'Create quotation'}</Button></>}>
      <Field label="Service"><Select value={f.service_id} onChange={(e) => onService(e.target.value)}><option value="">Select…</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
      <div className="form-grid">
        <Field label="Customer name" required><Input value={f.customer_name} onChange={(e) => setF((p) => ({ ...p, customer_name: e.target.value }))} /></Field>
        <Field label="Mobile"><Input value={f.mobile} onChange={(e) => setF((p) => ({ ...p, mobile: e.target.value }))} /></Field>
        <Field label="Email"><Input value={f.email} onChange={(e) => setF((p) => ({ ...p, email: e.target.value }))} /></Field>
        <Field label="District"><Input value={f.district} onChange={(e) => setF((p) => ({ ...p, district: e.target.value }))} /></Field>
      </div>
      <div className="form-section-title">Site assessment</div>
      <div className="form-grid">
        <Field label="Tank type"><Input value={f.tank_type} onChange={(e) => setF((p) => ({ ...p, tank_type: e.target.value }))} placeholder="Rooftop / underground" /></Field>
        <Field label="Capacity"><Input value={f.tank_capacity} onChange={(e) => setF((p) => ({ ...p, tank_capacity: e.target.value }))} placeholder="2000L" /></Field>
        <Field label="No. of tanks"><Input type="number" value={f.tank_count} onChange={(e) => setF((p) => ({ ...p, tank_count: e.target.value }))} /></Field>
        <Field label="Quoted amount (৳)"><Input type="number" value={f.amount} onChange={(e) => setF((p) => ({ ...p, amount: e.target.value }))} /></Field>
      </div>
      <Field label="Findings / issues"><Textarea rows={2} value={f.findings} onChange={(e) => setF((p) => ({ ...p, findings: e.target.value }))} /></Field>
    </Drawer>
  );
}

function QuoteDetail({ q: q0, onClose, onChanged }) {
  const toast = useToast();
  const [q, setQ] = useState(q0); const [busy, setBusy] = useState(false); const [link, setLink] = useState(null);
  const [templates, setTemplates] = useState([]); const [templateId, setTemplateId] = useState('');
  useEffect(() => { api.get('/agreement-templates?category=customer_service&status=active').then(({ data }) => { const list = data.data || []; setTemplates(list); if (list[0]) setTemplateId(String(list[0].id)); }).catch(() => {}); }, []);
  const reload = async () => { const { data } = await api.get(`/care/quotations/${q.id}`); setQ(data.data); onChanged?.(); };
  const sendAgreement = async () => { setBusy(true); try { const { data } = await api.post(`/care/quotations/${q.id}/send-agreement`, { warranty_months: 6, template_id: templateId || undefined, use_template: !!templateId }); setLink(data.link); toast.success(data.message); reload(); } catch (e) { toast.error(e.response?.data?.error || 'Failed'); } finally { setBusy(false); } };
  const convert = async () => { setBusy(true); try { const { data } = await api.post(`/care/quotations/${q.id}/convert`); toast.success(data.message); reload(); } catch (e) { toast.error(e.response?.data?.error || 'Failed'); } finally { setBusy(false); } };
  return (
    <Drawer title={q.quote_code} width={560} onClose={onClose}>
      <div className="pm-scope">
        <div className="pm-card" style={{ padding: 16, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{q.customer_name}</div>
          <div className="cell-sub">{q.service_name} · {money(q.amount)}{q.district ? ` · ${q.district}` : ''}</div>
          {(q.tank_type || q.findings) && <div style={{ marginTop: 8, fontSize: 12.5 }}><b>Assessment:</b> {q.tank_type} {q.tank_capacity} {q.tank_count ? `· ${q.tank_count} tanks` : ''}{q.findings ? ` — ${q.findings}` : ''}</div>}
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}><Badge tone={STATUS[q.status] || 'grey'} dot>{q.status}</Badge>{q.work_order_id && <span className="code-chip">→ WO #{q.work_order_id}</span>}</div>
        </div>
        <div className="pm-card" style={{ padding: 16 }}>
          <div className="pm-card-h" style={{ padding: 0, marginBottom: 12 }}><div className="ic"><FileSignature size={16} /></div><h3>Customer agreement</h3></div>
          {q.agreement_status === 'signed' ? <Badge tone="green" dot>Signed — work order raised</Badge>
            : (<>
              {templates.length > 0 && (
                <Field label="Agreement template">
                  <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.fields?.length || 0} fields)</option>)}
                    <option value="">Built-in short agreement</option>
                  </Select>
                </Field>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button size="sm" icon={FileSignature} onClick={sendAgreement} disabled={busy}>{q.agreement_status === 'sent' ? 'Resend agreement' : 'Send agreement'}</Button>
                {!q.work_order_id && <Button size="sm" variant="ghost" icon={ArrowRight} onClick={convert} disabled={busy}>Convert to work order (no signing)</Button>}
              </div>
              {link && <div className="cell-sub" style={{ marginTop: 10, wordBreak: 'break-all' }}>Signing link: {link}</div>}
              <div className="cell-sub" style={{ fontSize: 12, marginTop: 10 }}>{templateId ? 'The chosen template is auto-filled from this quote (customer, service, tank, amount, dates). ' : ''}On signing, a work order is created automatically with the quoted price and fee split.</div>
            </>)}
        </div>
      </div>
    </Drawer>
  );
}
