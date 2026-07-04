import React, { useCallback, useEffect, useState } from 'react';
import { Plus, ShieldCheck, Star } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Button, DataTable, StatusBadge, Badge, Drawer, Field, Input, Textarea, Select, SearchInput, KV, Spinner } from '../ui/kit';

const complianceTone = { valid: 'green', expiring: 'amber', expired: 'red', missing: 'grey' };

export default function Providers() {
  const toast = useToast();
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(''); const [status, setStatus] = useState('');
  const [drawer, setDrawer] = useState(null); const [form, setForm] = useState({});
  const [sel, setSel] = useState(null); const [detail, setDetail] = useState(null);
  const [comp, setComp] = useState({ doc_type: 'Trade Licence', title: '', reference_no: '', expiry_date: '' });
  const [pa, setPa] = useState({ email: '', password: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const p = new URLSearchParams({ limit: 50 }); if (search) p.set('search', search); if (status) p.set('status', status); const { data } = await api.get(`/providers?${p}`); setRows(data.data || []); }
    catch { toast.error('Failed to load providers'); } finally { setLoading(false); }
  }, [search, status, toast]);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm({ company_name: '', contact_person: '', phone: '', email: '', specialisations: '', status: 'pending_onboarding', non_circumvention_agreed: false }); setDrawer('create'); };
  const save = async () => {
    if (!form.company_name) return toast.error('Company name is required');
    setSaving(true);
    try {
      const payload = { ...form, specialisations: form.specialisations ? form.specialisations.split(',').map((s) => s.trim()).filter(Boolean) : [] };
      await api.post('/providers', payload); toast.success('Provider created'); setDrawer(null); load();
    } catch (e) { toast.error(e.response?.data?.error || 'Create failed'); } finally { setSaving(false); }
  };
  const openView = async (r) => { setSel(r); setDrawer('view'); setDetail(null); try { const { data } = await api.get(`/providers/${r.id}`); setDetail(data.data); } catch { toast.error('Load failed'); } };
  const addComp = async () => { try { await api.post(`/providers/${sel.id}/compliance`, comp); setComp({ doc_type: 'Trade Licence', title: '', reference_no: '', expiry_date: '' }); const { data } = await api.get(`/providers/${sel.id}`); setDetail(data.data); toast.success('Compliance added'); } catch { toast.error('Failed'); } };

  const columns = [
    { key: 'provider_code', header: 'Code', render: (r) => <span className="code-chip">{r.provider_code}</span> },
    { key: 'company', header: 'Provider', render: (r) => <div><div className="cell-strong">{r.company_name}</div><div className="cell-sub">{r.contact_person || ''} {r.phone ? '· ' + r.phone : ''}</div></div> },
    { key: 'spec', header: 'Specialisations', render: (r) => <div className="wrap-gap">{(r.specialisations || []).slice(0, 3).map((s, i) => <Badge key={i} tone="blue">{s}</Badge>)}</div> },
    { key: 'rating', header: 'Rating', render: (r) => r.rating ? <span><Star size={12} fill="currentColor" color="var(--warning)" /> {r.rating}</span> : '—' },
    { key: 'compliance', header: 'Compliance', render: (r) => { const c = r.compliance || []; const bad = c.filter((x) => x.status === 'expired').length; return c.length ? <Badge tone={bad ? 'red' : 'green'}>{c.length} doc{c.length > 1 ? 's' : ''}</Badge> : <Badge tone="grey">none</Badge>; } },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <>
      <PageHead title="Service Providers" desc="Contractors & third parties with specialisations and compliance tracking."
        actions={<Button icon={Plus} onClick={openCreate}>New Provider</Button>} />
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-pad row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company, code, phone…" />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 180 }}>
            <option value="">Any status</option>{['pending_onboarding', 'approved', 'suspended', 'terminated', 'inactive'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </Select>
        </div>
      </div>
      <div className="card"><DataTable columns={columns} rows={rows} loading={loading} onRowClick={openView} /></div>

      {drawer === 'create' && (
        <Drawer title="New Provider" onClose={() => setDrawer(null)} footer={<><Button variant="ghost" onClick={() => setDrawer(null)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? <Spinner /> : 'Create'}</Button></>}>
          <Field label="Company name" required full><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></Field>
          <div className="form-grid">
            <Field label="Contact person"><Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{['pending_onboarding', 'approved', 'suspended', 'terminated', 'inactive'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</Select></Field>
          </div>
          <Field label="Specialisations (comma separated)" full><Input value={form.specialisations} onChange={(e) => setForm({ ...form, specialisations: e.target.value })} placeholder="cleaning, electrical, plumbing" /></Field>
          <Field label="Non-circumvention agreed?"><Select value={String(form.non_circumvention_agreed)} onChange={(e) => setForm({ ...form, non_circumvention_agreed: e.target.value === 'true' })}><option value="false">No</option><option value="true">Yes</option></Select></Field>
        </Drawer>
      )}

      {drawer === 'view' && (
        <Drawer title={sel?.company_name || 'Provider'} onClose={() => setDrawer(null)} width={620}>
          {!detail ? <Spinner /> : (
            <>
              <div className="wrap-gap" style={{ marginBottom: 14 }}><span className="code-chip">{detail.provider_code}</span><StatusBadge status={detail.status} />{detail.non_circumvention_agreed && <Badge tone="green">Non-circumvention ✓</Badge>}</div>
              <KV k="Contact" v={detail.contact_person} /><KV k="Phone" v={detail.phone} /><KV k="Email" v={detail.email} />
              <KV k="Specialisations" v={(detail.specialisations || []).join(', ')} />
              <KV k="Availability" v={detail.availability} />
              <div className="form-section-title"><ShieldCheck size={13} /> Compliance documents</div>
              {(detail.compliance || []).length ? detail.compliance.map((c) => (
                <div key={c.id} className="kv"><span className="k">{c.doc_type} {c.reference_no ? `· ${c.reference_no}` : ''}</span><span className="v"><Badge tone={complianceTone[c.status] || 'grey'}>{c.status}</Badge> {c.expiry_date || ''}</span></div>
              )) : <p className="cell-sub">No compliance documents recorded.</p>}
              <div className="form-section-title">Add compliance</div>
              <div className="form-grid">
                <Field label="Type"><Select value={comp.doc_type} onChange={(e) => setComp({ ...comp, doc_type: e.target.value })}>{['Trade Licence', 'Insurance', 'NID', 'TIN', 'Certification', 'Other'].map((t) => <option key={t}>{t}</option>)}</Select></Field>
                <Field label="Reference no."><Input value={comp.reference_no} onChange={(e) => setComp({ ...comp, reference_no: e.target.value })} /></Field>
                <Field label="Expiry date"><Input type="date" value={comp.expiry_date} onChange={(e) => setComp({ ...comp, expiry_date: e.target.value })} /></Field>
              </div>
              <Button variant="ghost" icon={Plus} onClick={addComp}>Add compliance record</Button>
              {!detail.portal_enabled && (
                <>
                  <div className="form-section-title">Enable provider portal</div>
                  <div className="form-grid">
                    <Field label="Login email"><Input value={pa.email} onChange={(e) => setPa({ ...pa, email: e.target.value })} /></Field>
                    <Field label="Temp password"><Input value={pa.password} onChange={(e) => setPa({ ...pa, password: e.target.value })} placeholder="Min 8, 1 upper, 1 number" /></Field>
                  </div>
                  <Button variant="ghost" onClick={async () => {
                    try { await api.post(`/providers/${sel.id}/portal-access`, pa); toast.success('Provider portal enabled'); const { data } = await api.get(`/providers/${sel.id}`); setDetail(data.data); }
                    catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
                  }}>Create provider login</Button>
                </>
              )}
            </>
          )}
        </Drawer>
      )}
    </>
  );
}
