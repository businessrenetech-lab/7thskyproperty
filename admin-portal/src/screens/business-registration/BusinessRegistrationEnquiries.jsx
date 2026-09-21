import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MessageSquareQuote, ArrowRightCircle } from 'lucide-react';
import api from '../../services/api';
import { PageHead, Button, Badge, DataTable, SearchInput, Drawer, Field, Input, Select, Textarea, EmptyState } from '../../ui/kit';
import { ENQUIRY_STAGES, ENQUIRY_STAGE_TONE, LEAD_SOURCES, CLIENT_TYPES } from './constants';

const emptyForm = () => ({
  enquirer_name: '', company_name: '', phone: '', email: '', client_type: 'business',
  service_requested: '', registration_type: '', source: 'website', message: '', stage: 'new', next_action: '', follow_up_date: '',
});

export default function BusinessRegistrationEnquiries() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [drawer, setDrawer] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [converting, setConverting] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/business-registration-enquiries', { params: search ? { search } : {} }).then((r) => setRows(r.data.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, [search]);
  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const openNew = () => { setForm(emptyForm()); setErr(''); setDrawer(true); };

  const save = () => {
    if (!form.enquirer_name.trim()) { setErr('Enquirer name is required.'); return; }
    setSaving(true); setErr('');
    const payload = { ...form, follow_up_date: form.follow_up_date || null };
    api.post('/business-registration-enquiries', payload).then(() => { setDrawer(false); load(); }).catch((e) => setErr(e.response?.data?.error || 'Could not save enquiry.')).finally(() => setSaving(false));
  };

  const convert = (row) => {
    setConverting(row.id);
    api.post(`/business-registration-enquiries/${row.id}/convert`).then((r) => nav(`/business-registration/projects/${r.data.data.id}`)).catch((e) => alert(e.response?.data?.error || 'Could not convert.')).finally(() => setConverting(null));
  };

  const columns = [
    { key: 'enquiry_code', header: 'Enquiry', render: (r) => <div><div style={{ fontWeight: 700 }}>{r.enquiry_code}</div><div style={{ fontSize: 12, color: '#6b7280' }}>{new Date(r.created_at).toLocaleDateString()}</div></div> },
    { key: 'enquirer_name', header: 'Enquirer', render: (r) => <div><div>{r.enquirer_name}</div><div style={{ fontSize: 12, color: '#6b7280' }}>{r.company_name || r.client_type}</div></div> },
    { key: 'service_requested', header: 'Service requested', render: (r) => r.service_requested || r.registration_type || '—' },
    { key: 'contact', header: 'Contact', render: (r) => <div style={{ fontSize: 12 }}>{r.phone}<br />{r.email}</div> },
    { key: 'stage', header: 'Stage', render: (r) => <Badge tone={ENQUIRY_STAGE_TONE[r.stage] || 'grey'}>{r.stage}</Badge> },
    { key: 'actions', header: '', tdStyle: { textAlign: 'right' }, render: (r) => (
      r.converted
        ? <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); nav(`/business-registration/projects/${r.project_id}`); }}>View project</Button>
        : <Button size="sm" icon={ArrowRightCircle} disabled={converting === r.id} onClick={(e) => { e.stopPropagation(); convert(r); }}>{converting === r.id ? 'Converting…' : 'Convert'}</Button>
    ) },
  ];

  return (
    <div className="pm-scope">
      <PageHead title="Registration Enquiries" desc="Phase 1 leads (SSPC-BRE-xxxxxx). Qualify, then convert into a registration project."
        actions={<Button icon={Plus} onClick={openNew}>New enquiry</Button>} />

      <div style={{ margin: '4px 0 14px', maxWidth: 320 }}><SearchInput value={search} onChange={setSearch} placeholder="Search enquiries…" /></div>

      <DataTable columns={columns} rows={rows} loading={loading}
        empty={<EmptyState icon={MessageSquareQuote} title="No enquiries yet" sub="Capture a lead to start the SOP." action={<Button icon={Plus} onClick={openNew}>New enquiry</Button>} />} />

      {drawer && (
        <Drawer open title="New Registration Enquiry" width={520} onClose={() => setDrawer(false)}
          footer={<><Button variant="ghost" onClick={() => setDrawer(false)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Create enquiry'}</Button></>}>
          {err && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{err}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Enquirer name" required><Input value={form.enquirer_name} onChange={(e) => set('enquirer_name', e.target.value)} /></Field>
            <Field label="Company name"><Input value={form.company_name} onChange={(e) => set('company_name', e.target.value)} /></Field>
            <Field label="Client type"><Select value={form.client_type} onChange={(e) => set('client_type', e.target.value)}>{CLIENT_TYPES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field label="Source"><Select value={form.source} onChange={(e) => set('source', e.target.value)}>{LEAD_SOURCES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
            <Field label="Email"><Input value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
            <Field label="Service requested" full><Input value={form.service_requested} onChange={(e) => set('service_requested', e.target.value)} placeholder="e.g. Private Limited Company Registration" /></Field>
            <Field label="Registration type"><Input value={form.registration_type} onChange={(e) => set('registration_type', e.target.value)} /></Field>
            <Field label="Stage"><Select value={form.stage} onChange={(e) => set('stage', e.target.value)}>{ENQUIRY_STAGES.filter(([k]) => k !== 'converted').map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field label="Next action"><Input value={form.next_action} onChange={(e) => set('next_action', e.target.value)} /></Field>
            <Field label="Follow-up date"><Input type="date" value={form.follow_up_date} onChange={(e) => set('follow_up_date', e.target.value)} /></Field>
            <Field label="Message / notes" full><Textarea rows={2} value={form.message} onChange={(e) => set('message', e.target.value)} /></Field>
          </div>
        </Drawer>
      )}
    </div>
  );
}
