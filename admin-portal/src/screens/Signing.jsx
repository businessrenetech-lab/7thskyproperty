import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Send, Trash2, Link2, ShieldX, Copy } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Button, DataTable, StatusBadge, Badge, Drawer, Field, Input, Textarea, Select, SearchInput, KV, Spinner } from '../ui/kit';
import { Combo } from '../ui/pickers';

const ROLES = ['internal_approver', 'client', 'landlord', 'tenant', 'provider', 'staff_countersign', 'witness'];
const blankSigner = () => ({ name: '', email: '', role: 'client' });

export default function Signing() {
  const toast = useToast();
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [drawer, setDrawer] = useState(null);
  const [form, setForm] = useState({ title: '', agreement_id: null, message: '', document_html: '', signers: [blankSigner()] });
  const [sel, setSel] = useState(null); const [detail, setDetail] = useState(null); const [links, setLinks] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const p = new URLSearchParams({ limit: 50 }); if (search) p.set('search', search); const { data } = await api.get(`/signing/envelopes?${p}`); setRows(data.data || []); }
    catch { toast.error('Failed to load envelopes'); } finally { setLoading(false); }
  }, [search, toast]);
  useEffect(() => { load(); }, [load]);

  const setSigner = (i, k, v) => setForm((f) => ({ ...f, signers: f.signers.map((s, idx) => idx === i ? { ...s, [k]: v } : s) }));
  const addSigner = () => setForm((f) => ({ ...f, signers: [...f.signers, blankSigner()] }));
  const rmSigner = (i) => setForm((f) => ({ ...f, signers: f.signers.filter((_, idx) => idx !== i) }));

  const create = async () => {
    if (!form.title || !form.signers[0]?.email) return toast.error('Title and at least one signer email required');
    setSaving(true);
    try {
      const fields = form.signers.flatMap((_, i) => [
        { signer_index: i, field_type: 'signature', label: 'Signature', required: true },
        { signer_index: i, field_type: 'date_signed', label: 'Date', required: false },
      ]);
      const signers = form.signers.map((s, i) => ({ ...s, signer_order: i + 1 }));
      await api.post('/signing/envelopes', { ...form, signers, fields });
      toast.success('Envelope created'); setDrawer(null); setForm({ title: '', agreement_id: null, message: '', document_html: '', signers: [blankSigner()] }); load();
    } catch (e) { toast.error(e.response?.data?.error || 'Create failed'); } finally { setSaving(false); }
  };

  const openView = async (r) => { setSel(r); setDrawer('view'); setDetail(null); setLinks(null); try { const { data } = await api.get(`/signing/envelopes/${r.id}`); setDetail(data.data); } catch { toast.error('Load failed'); } };
  const send = async () => { try { const { data } = await api.post(`/signing/envelopes/${sel.id}/send`); setLinks(data.links); toast.success('Envelope sent'); const { data: d } = await api.get(`/signing/envelopes/${sel.id}`); setDetail(d.data); load(); } catch (e) { toast.error(e.response?.data?.error || 'Send failed'); } };
  const voidEnv = async () => { try { await api.post(`/signing/envelopes/${sel.id}/void`, { reason: 'Voided from admin' }); toast.success('Voided'); const { data: d } = await api.get(`/signing/envelopes/${sel.id}`); setDetail(d.data); load(); } catch { toast.error('Failed'); } };

  const progress = (s = []) => `${s.filter((x) => x.status === 'signed').length}/${s.length} signed`;
  const columns = [
    { key: 'envelope_code', header: 'Envelope', render: (r) => <span className="code-chip">{r.envelope_code}</span> },
    { key: 'title', header: 'Title', render: (r) => <div className="cell-strong">{r.title}</div> },
    { key: 'signers', header: 'Signers', render: (r) => <span className="cell-sub">{progress(r.signers)}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'created', header: 'Created', render: (r) => new Date(r.created_at).toLocaleDateString() },
  ];

  return (
    <>
      <PageHead title="eSign Envelopes" desc="Native document signing — send, track, sign and audit. Completed documents are tamper-hashed."
        actions={<Button icon={Plus} onClick={() => setDrawer('create')}>New Envelope</Button>} />
      <div className="card" style={{ marginBottom: 16 }}><div className="card-pad"><SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or code…" /></div></div>
      <div className="card"><DataTable columns={columns} rows={rows} loading={loading} onRowClick={openView} /></div>

      {drawer === 'create' && (
        <Drawer title="New Signing Envelope" onClose={() => setDrawer(null)} width={620}
          footer={<><Button variant="ghost" onClick={() => setDrawer(null)}>Cancel</Button><Button onClick={create} disabled={saving}>{saving ? <Spinner /> : 'Create'}</Button></>}>
          <Field label="Title" required full><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Tenancy Agreement — Flat 4B" /></Field>
          <Field label="Link master agreement (optional)"><Combo endpoint="/agreements" labelFn={(a) => `${a.title} (${a.agreement_code})`} value={form.agreement_id} onChange={(v) => setForm({ ...form, agreement_id: v })} placeholder="Pull content from an agreement…" /></Field>
          <Field label="Document content (HTML, optional if agreement linked)" full><Textarea value={form.document_html} onChange={(e) => setForm({ ...form, document_html: e.target.value })} placeholder="<h2>Agreement</h2><p>…</p>" /></Field>
          <Field label="Message to signers" full><Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field>
          <div className="form-section-title">Signers (in signing order)</div>
          {form.signers.map((s, i) => (
            <div key={i} className="form-grid" style={{ alignItems: 'end' }}>
              <Field label={`#${i + 1} Name`}><Input value={s.name} onChange={(e) => setSigner(i, 'name', e.target.value)} /></Field>
              <Field label="Email"><Input value={s.email} onChange={(e) => setSigner(i, 'email', e.target.value)} /></Field>
              <Field label="Role"><Select value={s.role} onChange={(e) => setSigner(i, 'role', e.target.value)}>{ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}</Select></Field>
              <div style={{ marginBottom: 14 }}>{form.signers.length > 1 && <button className="btn btn-danger btn-icon" onClick={() => rmSigner(i)}><Trash2 size={15} /></button>}</div>
            </div>
          ))}
          <Button variant="ghost" size="sm" icon={Plus} onClick={addSigner}>Add signer</Button>
        </Drawer>
      )}

      {drawer === 'view' && (
        <Drawer title={sel?.title || 'Envelope'} onClose={() => setDrawer(null)} width={640}
          footer={detail && (
            <>
              {['draft', 'pending_approval'].includes(detail.status) && <Button icon={Send} onClick={send}>Send for signing</Button>}
              {!['completed', 'voided', 'declined'].includes(detail.status) && <Button variant="danger" icon={ShieldX} onClick={voidEnv}>Void</Button>}
            </>
          )}>
          {!detail ? <Spinner /> : (
            <>
              <div className="wrap-gap" style={{ marginBottom: 14 }}><span className="code-chip">{detail.envelope_code}</span><StatusBadge status={detail.status} />{detail.content_hash && <Badge tone="green">Tamper-hashed ✓</Badge>}</div>

              {links && (
                <div className="card card-pad" style={{ marginBottom: 14, background: 'var(--info-bg)' }}>
                  <div className="form-section-title"><Link2 size={13} /> Signing links</div>
                  {links.map((l) => (
                    <div key={l.link} className="between" style={{ marginBottom: 6 }}>
                      <span className="cell-sub">{l.name} ({l.email})</span>
                      <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard?.writeText(l.link); toast.success('Link copied'); }}><Copy size={13} /> Copy</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="form-section-title">Signers</div>
              {detail.signers?.map((s) => (
                <div key={s.id} className="kv"><span className="k">#{s.signer_order} {s.name} · {s.role?.replace(/_/g, ' ')}</span><span className="v"><StatusBadge status={s.status} /></span></div>
              ))}

              <div className="form-section-title">Document</div>
              <div className="card card-pad" style={{ maxHeight: 220, overflow: 'auto', background: 'var(--surface-2)' }} dangerouslySetInnerHTML={{ __html: detail.document_html || '<p class="cell-sub">No content.</p>' }} />

              <div className="form-section-title">Audit trail</div>
              {detail.audit_logs?.length ? detail.audit_logs.map((a) => (
                <div key={a.id} className="kv"><span className="k">{a.event}{a.actor_email ? ` · ${a.actor_email}` : ''}</span><span className="v">{new Date(a.created_at).toLocaleString()}</span></div>
              )) : <p className="cell-sub">No events yet.</p>}
            </>
          )}
        </Drawer>
      )}
    </>
  );
}
