import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Upload, FileText, Clock } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Button, DataTable, StatusBadge, Drawer, Field, Input, Textarea, Select, SearchInput, KV, Spinner, Badge } from '../ui/kit';

export default function Agreements() {
  const toast = useToast();
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [drawer, setDrawer] = useState(null); // 'create' | 'view'
  const [form, setForm] = useState({ title: '', category: 'Service Agreement', vertical_key: '', description: '', effective_date: '', file: null });
  const [sel, setSel] = useState(null); const [detail, setDetail] = useState(null); const [saving, setSaving] = useState(false);
  const [ver, setVer] = useState({ effective_date: '', change_note: '', file: null });

  const load = useCallback(async () => {
    setLoading(true);
    try { const p = new URLSearchParams({ limit: 50 }); if (search) p.set('search', search); const { data } = await api.get(`/agreements?${p}`); setRows(data.data || []); }
    catch { toast.error('Failed to load agreements'); } finally { setLoading(false); }
  }, [search, toast]);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.title) return toast.error('Title is required');
    setSaving(true);
    try {
      const fd = new FormData();
      ['title', 'category', 'vertical_key', 'description', 'effective_date'].forEach((k) => form[k] && fd.append(k, form[k]));
      if (form.file) fd.append('file', form.file);
      await api.post('/agreements', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Agreement created'); setDrawer(null); setForm({ title: '', category: 'Service Agreement', vertical_key: '', description: '', effective_date: '', file: null }); load();
    } catch (e) { toast.error(e.response?.data?.error || 'Create failed'); } finally { setSaving(false); }
  };

  const open = async (r) => { setSel(r); setDrawer('view'); setDetail(null); try { const { data } = await api.get(`/agreements/${r.id}`); setDetail(data.data); } catch { toast.error('Load failed'); } };

  const uploadVersion = async () => {
    if (!ver.file) return toast.error('Choose a file');
    try {
      const fd = new FormData(); fd.append('file', ver.file);
      if (ver.effective_date) fd.append('effective_date', ver.effective_date);
      if (ver.change_note) fd.append('change_note', ver.change_note);
      const { data } = await api.post(`/agreements/${sel.id}/versions`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(data.message || 'Version uploaded'); setVer({ effective_date: '', change_note: '', file: null });
      const { data: fresh } = await api.get(`/agreements/${sel.id}`); setDetail(fresh.data); load();
    } catch (e) { toast.error(e.response?.data?.error || 'Upload failed'); }
  };

  const columns = [
    { key: 'agreement_code', header: 'Doc ID', render: (r) => <span className="code-chip">{r.agreement_code}</span> },
    { key: 'title', header: 'Agreement', render: (r) => <div><div className="cell-strong">{r.title}</div><div className="cell-sub">{r.category}</div></div> },
    { key: 'version', header: 'Version', render: (r) => <Badge tone="blue">v{r.current_version}</Badge> },
    { key: 'effective', header: 'Effective', render: (r) => r.current_effective_date || '—' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <>
      <PageHead title="Agreements" desc="Versioned master agreements — the document ID stays fixed, each upload adds a new effective version."
        actions={<Button icon={Plus} onClick={() => setDrawer('create')}>New Agreement</Button>} />
      <div className="card" style={{ marginBottom: 16 }}><div className="card-pad"><SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or doc ID…" /></div></div>
      <div className="card"><DataTable columns={columns} rows={rows} loading={loading} onRowClick={open} /></div>

      {drawer === 'create' && (
        <Drawer title="New Agreement" onClose={() => setDrawer(null)}
          footer={<><Button variant="ghost" onClick={() => setDrawer(null)}>Cancel</Button><Button onClick={create} disabled={saving}>{saving ? <Spinner /> : 'Create'}</Button></>}>
          <Field label="Title" required full><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Residential Tenancy Management Service Agreement" /></Field>
          <div className="form-grid">
            <Field label="Category"><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {['Service Agreement', 'Lease Agreement', 'Provider Master Agreement', 'Work Order', 'Customer Service Agreement', 'SOP', 'Consent Form', 'Other'].map((c) => <option key={c}>{c}</option>)}
            </Select></Field>
            <Field label="Vertical"><Select value={form.vertical_key} onChange={(e) => setForm({ ...form, vertical_key: e.target.value })}>
              <option value="">— none —</option>
              {['properties', 'property_care', 'leasing', 'removal', 'documentation', 'nrb', 'interior', 'solar', 'ac', 'water_tank'].map((v) => <option key={v} value={v}>{v}</option>)}
            </Select></Field>
            <Field label="Effective date (v1)"><Input type="date" value={form.effective_date} onChange={(e) => setForm({ ...form, effective_date: e.target.value })} /></Field>
            <Field label="Document file (PDF/DOC)"><Input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setForm({ ...form, file: e.target.files[0] })} /></Field>
          </div>
          <Field label="Description / purpose" full><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Where/how this agreement is used…" /></Field>
        </Drawer>
      )}

      {drawer === 'view' && (
        <Drawer title={sel?.title || 'Agreement'} onClose={() => setDrawer(null)} width={620}>
          {!detail ? <Spinner /> : (
            <>
              <div className="wrap-gap" style={{ marginBottom: 16 }}>
                <span className="code-chip">{detail.agreement_code}</span>
                <Badge tone="blue">Current v{detail.current_version}</Badge>
                <StatusBadge status={detail.status} />
              </div>
              <KV k="Category" v={detail.category} />
              <KV k="Vertical" v={detail.vertical_key} />
              <KV k="Effective date" v={detail.current_effective_date} />
              <KV k="Purpose" v={detail.purpose || detail.description} />

              <div className="form-section-title">Upload new version</div>
              <div className="form-grid">
                <Field label="Effective date"><Input type="date" value={ver.effective_date} onChange={(e) => setVer({ ...ver, effective_date: e.target.value })} /></Field>
                <Field label="File"><Input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setVer({ ...ver, file: e.target.files[0] })} /></Field>
              </div>
              <Field label="Change note" full><Input value={ver.change_note} onChange={(e) => setVer({ ...ver, change_note: e.target.value })} placeholder="What changed in this version?" /></Field>
              <Button icon={Upload} onClick={uploadVersion}>Upload Version {(detail.current_version || 0) + 1}</Button>

              <div className="form-section-title">Version history</div>
              {(detail.versions || []).map((v) => (
                <div key={v.id} className="between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div className="row"><FileText size={16} color="var(--primary)" /><div><div className="cell-strong">Version {v.version} {v.is_current && <Badge tone="green">current</Badge>}</div><div className="cell-sub">{v.file_name}</div></div></div>
                  <div className="cell-sub"><Clock size={12} /> {v.effective_date || '—'}</div>
                </div>
              ))}
            </>
          )}
        </Drawer>
      )}
    </>
  );
}
