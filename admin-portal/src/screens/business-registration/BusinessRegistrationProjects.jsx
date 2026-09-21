import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ScrollText } from 'lucide-react';
import api from '../../services/api';
import { PageHead, Button, Badge, DataTable, SearchInput, Drawer, Field, Input, Select, Textarea, EmptyState } from '../../ui/kit';
import { STAGES, STAGE_LABEL, STATUSES, STATUS_TONE, BIZ_TYPES, BIZ_TYPE_LABEL, URGENCY, URGENCY_TONE, LEAD_SOURCES, CLIENT_TYPES, SERVICE_GROUPS, money } from './constants';

const emptyForm = () => ({
  client_name: '', client_type: 'business', client_nid: '', client_phone: '', client_email: '', client_address: '',
  business_name: '', business_type: '', registration_type: '', nature_of_business: '', business_address: '',
  number_of_owners: '', number_of_directors: '', capital_structure: '',
  lead_source: 'website', urgency: 'normal', service_selection: [], authorities: '',
  quoted_amount: '', deposit_amount: '', government_fees: '', contract_value: '',
  stage: 'consultation', status: 'active', scope_of_work: '', special_requirements: '',
});

export default function BusinessRegistrationProjects() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [drawer, setDrawer] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (stageFilter) params.stage = stageFilter;
    api.get('/business-registration-projects', { params }).then((r) => setRows(r.data.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, [search, stageFilter]);
  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleService = (label) => setForm((f) => ({
    ...f,
    service_selection: f.service_selection.includes(label) ? f.service_selection.filter((x) => x !== label) : [...f.service_selection, label],
  }));

  const openNew = () => { setForm(emptyForm()); setErr(''); setDrawer(true); };

  const save = () => {
    if (!form.client_name.trim()) { setErr('Client name is required.'); return; }
    setSaving(true); setErr('');
    const payload = { ...form };
    ['number_of_owners', 'number_of_directors', 'quoted_amount', 'deposit_amount', 'government_fees', 'contract_value'].forEach((k) => {
      payload[k] = payload[k] === '' ? null : Number(payload[k]);
    });
    api.post('/business-registration-projects', payload)
      .then((r) => { setDrawer(false); nav(`/business-registration/projects/${r.data.data.id}`); })
      .catch((e) => setErr(e.response?.data?.error || 'Could not save project.'))
      .finally(() => setSaving(false));
  };

  const columns = [
    { key: 'project_code', header: 'Project', render: (r) => <div><div style={{ fontWeight: 700 }}>{r.project_code}</div><div style={{ fontSize: 12, color: '#6b7280' }}>{r.client_name}</div></div> },
    { key: 'business_name', header: 'Business', render: (r) => <div><div>{r.business_name || '—'}</div><div style={{ fontSize: 12, color: '#6b7280' }}>{BIZ_TYPE_LABEL[r.business_type] || r.business_type || '—'}</div></div> },
    { key: 'registration_type', header: 'Service', render: (r) => r.registration_type || '—' },
    { key: 'urgency', header: 'Urgency', render: (r) => <Badge tone={URGENCY_TONE[r.urgency] || 'grey'}>{r.urgency}</Badge> },
    { key: 'stage', header: 'Stage', render: (r) => <Badge tone="violet">{STAGE_LABEL[r.stage] || r.stage}</Badge> },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={STATUS_TONE[r.status] || 'grey'}>{r.status}</Badge> },
    { key: 'contract_value', header: 'Value', tdStyle: { textAlign: 'right' }, thStyle: { textAlign: 'right' }, render: (r) => money(r.contract_value) },
  ];

  return (
    <div className="pm-scope">
      <PageHead title="Registration Projects" desc="Every registration engagement (SSPC-BRP-xxxxxx) and its SOP pipeline stage — scoped to Business Registration only."
        actions={<Button icon={Plus} onClick={openNew}>New project</Button>} />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '4px 0 14px', alignItems: 'center' }}>
        <div style={{ minWidth: 240 }}><SearchInput value={search} onChange={setSearch} placeholder="Search projects, clients, business…" /></div>
        <Select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} style={{ maxWidth: 220 }}>
          <option value="">All stages</option>
          {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </Select>
      </div>

      <DataTable columns={columns} rows={rows} loading={loading} onRowClick={(r) => nav(`/business-registration/projects/${r.id}`)}
        empty={<EmptyState icon={ScrollText} title="No registration projects yet" sub="Create one, or convert an enquiry into a project." action={<Button icon={Plus} onClick={openNew}>New project</Button>} />} />

      {drawer && (
        <Drawer open title="New Registration Project" width={620} onClose={() => setDrawer(false)}
          footer={<><Button variant="ghost" onClick={() => setDrawer(false)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Create project'}</Button></>}>
          {err && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{err}</div>}

          <div style={{ fontWeight: 700, fontSize: 12, color: '#6b7280', margin: '2px 0 8px', letterSpacing: 0.4 }}>CLIENT</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Client name" required><Input value={form.client_name} onChange={(e) => set('client_name', e.target.value)} /></Field>
            <Field label="Client type"><Select value={form.client_type} onChange={(e) => set('client_type', e.target.value)}>{CLIENT_TYPES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field label="NID / Passport"><Input value={form.client_nid} onChange={(e) => set('client_nid', e.target.value)} /></Field>
            <Field label="Phone"><Input value={form.client_phone} onChange={(e) => set('client_phone', e.target.value)} /></Field>
            <Field label="Email"><Input value={form.client_email} onChange={(e) => set('client_email', e.target.value)} /></Field>
            <Field label="Address"><Input value={form.client_address} onChange={(e) => set('client_address', e.target.value)} /></Field>
          </div>

          <div style={{ fontWeight: 700, fontSize: 12, color: '#6b7280', margin: '16px 0 8px', letterSpacing: 0.4 }}>BUSINESS</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Business name"><Input value={form.business_name} onChange={(e) => set('business_name', e.target.value)} placeholder="Proposed / existing" /></Field>
            <Field label="Business type"><Select value={form.business_type} onChange={(e) => set('business_type', e.target.value)}><option value="">—</option>{BIZ_TYPES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field label="Registration type (headline service)"><Input value={form.registration_type} onChange={(e) => set('registration_type', e.target.value)} placeholder="e.g. Private Limited Company Registration" /></Field>
            <Field label="Nature of business"><Input value={form.nature_of_business} onChange={(e) => set('nature_of_business', e.target.value)} /></Field>
            <Field label="No. of owners"><Input type="number" value={form.number_of_owners} onChange={(e) => set('number_of_owners', e.target.value)} /></Field>
            <Field label="No. of directors"><Input type="number" value={form.number_of_directors} onChange={(e) => set('number_of_directors', e.target.value)} /></Field>
            <Field label="Capital structure"><Input value={form.capital_structure} onChange={(e) => set('capital_structure', e.target.value)} /></Field>
            <Field label="Business address"><Input value={form.business_address} onChange={(e) => set('business_address', e.target.value)} /></Field>
          </div>

          <div style={{ fontWeight: 700, fontSize: 12, color: '#6b7280', margin: '16px 0 8px', letterSpacing: 0.4 }}>INTAKE & COMMERCIALS</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Lead source"><Select value={form.lead_source} onChange={(e) => set('lead_source', e.target.value)}>{LEAD_SOURCES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field label="Urgency"><Select value={form.urgency} onChange={(e) => set('urgency', e.target.value)}>{URGENCY.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field label="Quoted amount (BDT)"><Input type="number" value={form.quoted_amount} onChange={(e) => set('quoted_amount', e.target.value)} /></Field>
            <Field label="Deposit (BDT)"><Input type="number" value={form.deposit_amount} onChange={(e) => set('deposit_amount', e.target.value)} /></Field>
            <Field label="Government fees (BDT)"><Input type="number" value={form.government_fees} onChange={(e) => set('government_fees', e.target.value)} /></Field>
            <Field label="Contract value (BDT)"><Input type="number" value={form.contract_value} onChange={(e) => set('contract_value', e.target.value)} /></Field>
            <Field label="Authorities involved" full><Input value={form.authorities} onChange={(e) => set('authorities', e.target.value)} placeholder="RJSC, NBR, City Corporation…" /></Field>
          </div>

          <div style={{ fontWeight: 700, fontSize: 12, color: '#6b7280', margin: '16px 0 8px', letterSpacing: 0.4 }}>SERVICE SELECTION (SCHEDULE A)</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {SERVICE_GROUPS.map(([group, items]) => (
              <div key={group} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 12px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#115e59', marginBottom: 6 }}>{group}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {items.map((it) => {
                    const on = form.service_selection.includes(it);
                    return (
                      <button key={it} type="button" onClick={() => toggleService(it)}
                        style={{ fontSize: 12, padding: '3px 9px', borderRadius: 999, cursor: 'pointer', border: on ? '1px solid #0d9488' : '1px solid #e5e7eb', background: on ? 'rgba(13,148,136,.12)' : '#fff', color: on ? '#115e59' : '#6b7280', fontWeight: on ? 700 : 500 }}>
                        {on ? '✓ ' : ''}{it}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14 }}>
            <Field label="Scope of work"><Textarea rows={2} value={form.scope_of_work} onChange={(e) => set('scope_of_work', e.target.value)} /></Field>
            <Field label="Special requirements"><Textarea rows={2} value={form.special_requirements} onChange={(e) => set('special_requirements', e.target.value)} /></Field>
          </div>
        </Drawer>
      )}
    </div>
  );
}
