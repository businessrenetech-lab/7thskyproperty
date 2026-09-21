import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Building2, User, FileSignature, Landmark, Plus, Trash2, Users, FileCheck } from 'lucide-react';
import api from '../../services/api';
import { Button, Badge, Spinner, KV, Field, Input, Select, Textarea, Drawer, DataTable, EmptyState } from '../../ui/kit';
import UploadButton from '../../ui/UploadButton';
import { fileSrc } from '../../ui/FileUpload';
import { STAGES, STAGE_LABEL, STATUSES, STATUS_TONE, BIZ_TYPE_LABEL, URGENCY_TONE, money } from './constants';

const teal = '#0d9488';

function Section({ title, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 18px', marginBottom: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: '#115e59', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

export default function BusinessRegistrationProjectDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/business-registration-projects/${id}`).then((r) => setP(r.data.data)).catch(() => setP(null)).finally(() => setLoading(false));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const move = (patch) => {
    setBusy(true);
    api.patch(`/business-registration-projects/${id}/move`, patch).then((r) => setP(r.data.data)).catch(() => {}).finally(() => setBusy(false));
  };

  if (loading) return <div className="pm-scope" style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>;
  if (!p) return <div className="pm-scope" style={{ padding: 40 }}>Project not found. <Button variant="ghost" onClick={() => nav('/business-registration/projects')}>Back</Button></div>;

  const services = Array.isArray(p.service_selection) ? p.service_selection : (typeof p.service_selection === 'string' ? (() => { try { return JSON.parse(p.service_selection); } catch { return []; } })() : []);
  const curIdx = STAGES.findIndex((s) => s.key === p.stage);

  const TABS = [
    ['overview', 'Overview'],
    ['workflow', 'Workflow'],
    ['consultation', 'Consultation'],
    ['parties', 'Parties'],
    ['documents', 'Documents'],
    ['providers', 'Work Orders'],
    ['finance', 'Finance'],
  ];

  return (
    <div className="pm-scope">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Button variant="ghost" icon={ArrowLeft} onClick={() => nav('/business-registration/projects')}>Back</Button>
      </div>

      <div style={{ background: 'linear-gradient(135deg,#0d9488,#115e59)', borderRadius: 16, padding: '20px 24px', color: '#fff', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 600 }}>{p.project_code}</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>{p.business_name || p.client_name}</div>
            <div style={{ fontSize: 13, opacity: 0.9, marginTop: 3 }}>{p.registration_type || BIZ_TYPE_LABEL[p.business_type] || 'Business Registration'} · Client: {p.client_name}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Badge tone={URGENCY_TONE[p.urgency] || 'grey'}>{p.urgency}</Badge>
            <Badge tone="violet">{STAGE_LABEL[p.stage] || p.stage}</Badge>
            <Badge tone={STATUS_TONE[p.status] || 'grey'}>{p.status}</Badge>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e5e7eb', marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: tab === k ? teal : '#6b7280', borderBottom: tab === k ? `2px solid ${teal}` : '2px solid transparent' }}>{label}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <Section title={<><User size={14} style={{ verticalAlign: -2 }} /> Client</>}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 6 }}>
              <KV k="Name" v={p.client_name} /><KV k="Type" v={p.client_type} /><KV k="NID / Passport" v={p.client_nid} />
              <KV k="Phone" v={p.client_phone} /><KV k="Email" v={p.client_email} /><KV k="Address" v={p.client_address} />
            </div>
          </Section>
          <Section title={<><Building2 size={14} style={{ verticalAlign: -2 }} /> Business</>}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 6 }}>
              <KV k="Business name" v={p.business_name} /><KV k="Type" v={BIZ_TYPE_LABEL[p.business_type] || p.business_type} />
              <KV k="Registration type" v={p.registration_type} /><KV k="Nature" v={p.nature_of_business} />
              <KV k="Owners" v={p.number_of_owners} /><KV k="Directors" v={p.number_of_directors} />
              <KV k="Capital structure" v={p.capital_structure} /><KV k="Business address" v={p.business_address} />
              <KV k="Authorities" v={p.authorities} />
            </div>
          </Section>
          <Section title={<><Landmark size={14} style={{ verticalAlign: -2 }} /> Commercials</>}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 6 }}>
              <KV k="Quoted" v={money(p.quoted_amount)} /><KV k="Deposit" v={money(p.deposit_amount)} />
              <KV k="Government fees" v={money(p.government_fees)} /><KV k="Contract value" v={money(p.contract_value)} />
              <KV k="Lead source" v={p.lead_source} />
            </div>
          </Section>
          {services.length > 0 && (
            <Section title="Selected Services (Schedule A)">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {services.map((s) => <span key={s} style={{ fontSize: 12, padding: '3px 9px', borderRadius: 999, background: 'rgba(13,148,136,.1)', color: '#115e59', fontWeight: 600 }}>{s}</span>)}
              </div>
            </Section>
          )}
          {(p.scope_of_work || p.special_requirements || p.notes) && (
            <Section title="Notes">
              {p.scope_of_work && <div style={{ marginBottom: 8 }}><b style={{ fontSize: 12, color: '#6b7280' }}>Scope of work</b><div style={{ fontSize: 13 }}>{p.scope_of_work}</div></div>}
              {p.special_requirements && <div style={{ marginBottom: 8 }}><b style={{ fontSize: 12, color: '#6b7280' }}>Special requirements</b><div style={{ fontSize: 13 }}>{p.special_requirements}</div></div>}
              {p.notes && <div><b style={{ fontSize: 12, color: '#6b7280' }}>Notes</b><div style={{ fontSize: 13 }}>{p.notes}</div></div>}
            </Section>
          )}
        </>
      )}

      {tab === 'workflow' && (
        <Section title="SOP Pipeline (SSPC-BR-SOP-01)">
          <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
            {STAGES.filter((s) => s.key !== 'closed').map((s, i) => {
              const done = i < curIdx;
              const current = i === curIdx;
              return (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, border: current ? `1.5px solid ${teal}` : '1px solid #e5e7eb', background: current ? 'rgba(13,148,136,.06)' : '#fff' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: done ? teal : current ? '#fff' : '#f3f4f6', border: current ? `2px solid ${teal}` : 'none', color: done ? '#fff' : current ? teal : '#9ca3af', fontWeight: 700, fontSize: 12 }}>
                    {done ? <Check size={14} /> : i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: current ? '#115e59' : '#374151' }}>{s.label}</div>
                    {s.phase && <div style={{ fontSize: 11, color: '#9ca3af' }}>{s.phase}</div>}
                  </div>
                  {!done && !current && <Button size="sm" variant="ghost" disabled={busy} onClick={() => move({ stage: s.key })}>Jump here</Button>}
                  {current && i < STAGES.length - 2 && <Button size="sm" disabled={busy} onClick={() => move({ stage: STAGES[i + 1].key })}>Advance →</Button>}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 460 }}>
            <Field label="Stage"><Select value={p.stage} disabled={busy} onChange={(e) => move({ stage: e.target.value })}>{STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select></Field>
            <Field label="Status"><Select value={p.status} disabled={busy} onChange={(e) => move({ status: e.target.value })}>{STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select></Field>
          </div>
        </Section>
      )}

      {tab === 'consultation' && <ConsultationTab projectId={id} />}
      {tab === 'parties' && <PartiesTab projectId={id} />}
      {tab === 'documents' && <DocumentsTab projectId={id} />}
      {tab === 'providers' && <WorkOrdersTab projectId={id} />}

      {tab === 'finance' && (
        <Section title="Finance">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6b7280', fontSize: 13, padding: '8px 0' }}>
            <FileSignature size={16} color={teal} />
            Quotation, deposit / progress / final invoicing &amp; payments arrive in Phase 4.
          </div>
        </Section>
      )}
    </div>
  );
}

// ── Consultation / business-structure assessment (SOP Phase 2) ────────────────
function ConsultationTab({ projectId }) {
  const [a, setA] = useState(null);
  const [form, setForm] = useState({ business_objectives: '', ownership_structure: '', proposed_activities: '', regulatory_requirements: '', recommended_structure: '', estimated_timeline: '', risks_notes: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    api.get(`/business-registration-projects/${projectId}/assessment`).then((r) => {
      const d = r.data.data; setA(d);
      if (d) setForm((f) => ({ ...f, ...Object.fromEntries(Object.keys(f).map((k) => [k, d[k] || ''])) }));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [projectId]);
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setSaved(false); };
  const save = () => {
    setSaving(true);
    api.put(`/business-registration-projects/${projectId}/assessment`, form).then((r) => { setA(r.data.data); setSaved(true); }).catch(() => {}).finally(() => setSaving(false));
  };
  if (loading) return <Section title="Consultation"><Spinner /></Section>;
  return (
    <Section title="Consultation & Business-Structure Assessment">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Business objectives" full><Textarea rows={2} value={form.business_objectives} onChange={(e) => set('business_objectives', e.target.value)} /></Field>
        <Field label="Ownership structure"><Input value={form.ownership_structure} onChange={(e) => set('ownership_structure', e.target.value)} /></Field>
        <Field label="Recommended structure"><Input value={form.recommended_structure} onChange={(e) => set('recommended_structure', e.target.value)} placeholder="e.g. Private Limited Company" /></Field>
        <Field label="Proposed activities" full><Textarea rows={2} value={form.proposed_activities} onChange={(e) => set('proposed_activities', e.target.value)} /></Field>
        <Field label="Regulatory requirements" full><Textarea rows={2} value={form.regulatory_requirements} onChange={(e) => set('regulatory_requirements', e.target.value)} /></Field>
        <Field label="Estimated timeline"><Input value={form.estimated_timeline} onChange={(e) => set('estimated_timeline', e.target.value)} /></Field>
        <Field label="Risks / notes" full><Textarea rows={2} value={form.risks_notes} onChange={(e) => set('risks_notes', e.target.value)} /></Field>
      </div>
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save assessment'}</Button>
        {saved && <span style={{ color: '#0d9488', fontSize: 13, fontWeight: 600 }}>✓ Saved{a?.assessed_at ? ` · ${new Date(a.assessed_at).toLocaleString()}` : ''}</span>}
      </div>
    </Section>
  );
}

// ── Shareholders & directors (workbook Sheets 5 & 6) ─────────────────────────
const PARTY_ROLES = [['shareholder', 'Shareholder'], ['director', 'Director']];
function PartiesTab({ projectId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [form, setForm] = useState({ party_role: 'shareholder', name: '', nid: '', designation: '', share_percentage: '', mobile: '', email: '', address: '', nationality: '' });
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => { setLoading(true); api.get(`/business-registration-projects/${projectId}/parties`).then((r) => setRows(r.data.data || [])).catch(() => {}).finally(() => setLoading(false)); }, [projectId]);
  useEffect(() => { load(); }, [load]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const openNew = () => { setForm({ party_role: 'shareholder', name: '', nid: '', designation: '', share_percentage: '', mobile: '', email: '', address: '', nationality: '' }); setDrawer(true); };
  const save = () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { ...form, share_percentage: form.share_percentage === '' ? null : Number(form.share_percentage) };
    api.post(`/business-registration-projects/${projectId}/parties`, payload).then(() => { setDrawer(false); load(); }).catch(() => {}).finally(() => setSaving(false));
  };
  const remove = (r) => { if (!window.confirm(`Remove ${r.name}?`)) return; api.delete(`/business-registration-projects/${projectId}/parties/${r.id}`).then(load).catch(() => {}); };
  const columns = [
    { key: 'party_role', header: 'Role', render: (r) => <Badge tone={r.party_role === 'director' ? 'violet' : 'blue'}>{r.party_role}</Badge> },
    { key: 'name', header: 'Name', render: (r) => <div><div style={{ fontWeight: 600 }}>{r.name}</div><div style={{ fontSize: 12, color: '#6b7280' }}>{r.designation || r.nid || ''}</div></div> },
    { key: 'share_percentage', header: 'Share %', render: (r) => (r.share_percentage != null ? `${r.share_percentage}%` : '—') },
    { key: 'mobile', header: 'Contact', render: (r) => <div style={{ fontSize: 12 }}>{r.mobile}<br />{r.email}</div> },
    { key: 'actions', header: '', tdStyle: { textAlign: 'right' }, render: (r) => <Button size="sm" variant="ghost" icon={Trash2} onClick={() => remove(r)}>Remove</Button> },
  ];
  return (
    <Section title={<><Users size={14} style={{ verticalAlign: -2 }} /> Shareholders & Directors <Button size="sm" icon={Plus} onClick={openNew} style={{ float: 'right' }}>Add party</Button></>}>
      <DataTable columns={columns} rows={rows} loading={loading} empty={<EmptyState icon={Users} title="No parties yet" sub="Add shareholders and directors." />} />
      {drawer && (
        <Drawer open title="Add Party" width={480} onClose={() => setDrawer(false)}
          footer={<><Button variant="ghost" onClick={() => setDrawer(false)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Add'}</Button></>}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Role"><Select value={form.party_role} onChange={(e) => set('party_role', e.target.value)}>{PARTY_ROLES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field label="Name" required><Input value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="NID / Passport"><Input value={form.nid} onChange={(e) => set('nid', e.target.value)} /></Field>
            {form.party_role === 'director'
              ? <Field label="Designation"><Input value={form.designation} onChange={(e) => set('designation', e.target.value)} placeholder="Managing Director…" /></Field>
              : <Field label="Share %"><Input type="number" value={form.share_percentage} onChange={(e) => set('share_percentage', e.target.value)} /></Field>}
            <Field label="Mobile"><Input value={form.mobile} onChange={(e) => set('mobile', e.target.value)} /></Field>
            <Field label="Email"><Input value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
            <Field label="Nationality"><Input value={form.nationality} onChange={(e) => set('nationality', e.target.value)} /></Field>
            <Field label="Address" full><Input value={form.address} onChange={(e) => set('address', e.target.value)} /></Field>
          </div>
        </Drawer>
      )}
    </Section>
  );
}

// ── Document register / Schedule D KYC checklist (SOP Phase 4) ────────────────
const DOC_CATEGORIES = [
  ['client_identification', 'Client Identification'],
  ['business_information', 'Business Information'],
  ['company_registration', 'Company Registration'],
  ['tax_regulatory', 'Tax & Regulatory'],
];
const DOC_STATUS_TONE = { pending: 'grey', received: 'blue', verified: 'green', rejected: 'red' };
function DocumentsTab({ projectId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [form, setForm] = useState({ category: 'client_identification', doc_type: '', file_url: '', status: 'received', notes: '' });
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => { setLoading(true); api.get(`/business-registration-projects/${projectId}/documents`).then((r) => setRows(r.data.data || [])).catch(() => {}).finally(() => setLoading(false)); }, [projectId]);
  useEffect(() => { load(); }, [load]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const openNew = () => { setForm({ category: 'client_identification', doc_type: '', file_url: '', status: 'received', notes: '' }); setDrawer(true); };
  const save = () => {
    if (!form.doc_type.trim()) return;
    setSaving(true);
    api.post(`/business-registration-projects/${projectId}/documents`, form).then(() => { setDrawer(false); load(); }).catch(() => {}).finally(() => setSaving(false));
  };
  const setStatus = (r, status) => api.put(`/business-registration-projects/${projectId}/documents/${r.id}`, { status }).then(load).catch(() => {});
  const remove = (r) => { if (!window.confirm(`Remove ${r.doc_type}?`)) return; api.delete(`/business-registration-projects/${projectId}/documents/${r.id}`).then(load).catch(() => {}); };
  const catLabel = Object.fromEntries(DOC_CATEGORIES);
  const columns = [
    { key: 'doc_type', header: 'Document', render: (r) => <div><div style={{ fontWeight: 600 }}>{r.doc_type}</div><div style={{ fontSize: 12, color: '#6b7280' }}>{catLabel[r.category] || r.category || ''}</div></div> },
    { key: 'file_url', header: 'File', render: (r) => (r.file_url ? <a href={fileSrc(r.file_url)} target="_blank" rel="noreferrer" style={{ color: teal, fontSize: 13 }}>View</a> : <span style={{ color: '#9ca3af', fontSize: 13 }}>—</span>) },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={DOC_STATUS_TONE[r.status] || 'grey'}>{r.status}</Badge> },
    { key: 'actions', header: '', tdStyle: { textAlign: 'right' }, render: (r) => (
      <div style={{ display: 'inline-flex', gap: 6 }}>
        {r.status !== 'verified' && <Button size="sm" icon={FileCheck} onClick={() => setStatus(r, 'verified')}>Verify</Button>}
        <Button size="sm" variant="ghost" icon={Trash2} onClick={() => remove(r)} />
      </div>
    ) },
  ];
  return (
    <Section title={<><FileCheck size={14} style={{ verticalAlign: -2 }} /> Document Register (Schedule D) <Button size="sm" icon={Plus} onClick={openNew} style={{ float: 'right' }}>Add document</Button></>}>
      <DataTable columns={columns} rows={rows} loading={loading} empty={<EmptyState icon={FileCheck} title="No documents yet" sub="Add the KYC / registration documents." />} />
      {drawer && (
        <Drawer open title="Add Document" width={460} onClose={() => setDrawer(false)}
          footer={<><Button variant="ghost" onClick={() => setDrawer(false)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Add'}</Button></>}>
          <div style={{ display: 'grid', gap: 12 }}>
            <Field label="Category"><Select value={form.category} onChange={(e) => set('category', e.target.value)}>{DOC_CATEGORIES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field label="Document type" required><Input value={form.doc_type} onChange={(e) => set('doc_type', e.target.value)} placeholder="e.g. National ID / Passport" /></Field>
            <Field label="File (private)"><UploadButton value={form.file_url} onChange={(url) => set('file_url', url)} folder="documents" /></Field>
            <Field label="Status"><Select value={form.status} onChange={(e) => set('status', e.target.value)}>{['pending', 'received', 'verified', 'rejected'].map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
            <Field label="Notes"><Textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
          </div>
        </Drawer>
      )}
    </Section>
  );
}

// ── Provider work orders + registration activities (SOP Phase 5-6) ───────────
const WO_STATUS_TONE = { issued: 'blue', accepted: 'violet', in_progress: 'amber', completed: 'green', cancelled: 'red' };
const ACT_TYPES = [
  ['name_clearance', 'Name Clearance'], ['trade_licence', 'Trade Licence'], ['rjsc', 'RJSC Registration'],
  ['tin', 'TIN Registration'], ['bin', 'BIN Registration'], ['vat', 'VAT Registration'],
  ['authority_liaison', 'Authority Liaison'], ['documentation', 'Documentation'],
];
const ACT_TYPE_LABEL = Object.fromEntries(ACT_TYPES);
const ACT_STATUS = ['pending', 'submitted', 'in_review', 'approved', 'rejected', 'completed'];
const ACT_STATUS_TONE = { pending: 'grey', submitted: 'blue', in_review: 'amber', approved: 'green', rejected: 'red', completed: 'green' };

function WorkOrdersTab({ projectId }) {
  const [wos, setWos] = useState([]);
  const [acts, setActs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [woDrawer, setWoDrawer] = useState(false);
  const [actDrawer, setActDrawer] = useState(false);
  const [wo, setWo] = useState({ provider_name: '', provider_category: '', total_fee: '', special_instructions: '' });
  const [act, setAct] = useState({ activity_type: 'name_clearance', title: '', authority: '', reference_no: '', status: 'pending' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get(`/business-registration-projects/${projectId}/work-orders`),
      api.get(`/business-registration-projects/${projectId}/activities`),
    ]).then(([w, a]) => { setWos(w.data.data || []); setActs(a.data.data || []); }).catch(() => {}).finally(() => setLoading(false));
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  const saveWo = () => {
    if (!wo.provider_name.trim()) return;
    setSaving(true);
    api.post(`/business-registration-projects/${projectId}/work-orders`, { ...wo, total_fee: wo.total_fee === '' ? null : Number(wo.total_fee) })
      .then(() => { setWoDrawer(false); setWo({ provider_name: '', provider_category: '', total_fee: '', special_instructions: '' }); load(); }).catch(() => {}).finally(() => setSaving(false));
  };
  const setWoStatus = (r, status) => api.put(`/business-registration-projects/${projectId}/work-orders/${r.id}`, { status }).then(load).catch(() => {});
  const removeWo = (r) => { if (!window.confirm(`Remove ${r.work_order_no}?`)) return; api.delete(`/business-registration-projects/${projectId}/work-orders/${r.id}`).then(load).catch(() => {}); };

  const saveAct = () => {
    setSaving(true);
    api.post(`/business-registration-projects/${projectId}/activities`, act)
      .then(() => { setActDrawer(false); setAct({ activity_type: 'name_clearance', title: '', authority: '', reference_no: '', status: 'pending' }); load(); }).catch(() => {}).finally(() => setSaving(false));
  };
  const setActStatus = (r, status) => api.put(`/business-registration-projects/${projectId}/activities/${r.id}`, { status }).then(load).catch(() => {});
  const removeAct = (r) => { if (!window.confirm('Remove activity?')) return; api.delete(`/business-registration-projects/${projectId}/activities/${r.id}`).then(load).catch(() => {}); };

  const woCols = [
    { key: 'work_order_no', header: 'Work order', render: (r) => <div><div style={{ fontWeight: 700 }}>{r.work_order_no}</div><div style={{ fontSize: 12, color: '#6b7280' }}>{r.provider_name}</div></div> },
    { key: 'provider_category', header: 'Provider type', render: (r) => r.provider_category || '—' },
    { key: 'total_fee', header: 'Fee', tdStyle: { textAlign: 'right' }, render: (r) => money(r.total_fee) },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={WO_STATUS_TONE[r.status] || 'grey'}>{r.status}</Badge> },
    { key: 'actions', header: '', tdStyle: { textAlign: 'right' }, render: (r) => (
      <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
        <Select value={r.status} onChange={(e) => setWoStatus(r, e.target.value)} style={{ height: 28, fontSize: 12 }}>
          {['issued', 'accepted', 'in_progress', 'completed', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Button size="sm" variant="ghost" icon={Trash2} onClick={() => removeWo(r)} />
      </div>
    ) },
  ];
  const actCols = [
    { key: 'activity_type', header: 'Activity', render: (r) => <div><div style={{ fontWeight: 600 }}>{ACT_TYPE_LABEL[r.activity_type] || r.activity_type}</div><div style={{ fontSize: 12, color: '#6b7280' }}>{r.title || r.authority || ''}</div></div> },
    { key: 'authority', header: 'Authority', render: (r) => r.authority || '—' },
    { key: 'reference_no', header: 'Reference', render: (r) => r.reference_no || '—' },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={ACT_STATUS_TONE[r.status] || 'grey'}>{r.status}</Badge> },
    { key: 'actions', header: '', tdStyle: { textAlign: 'right' }, render: (r) => (
      <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
        <Select value={r.status} onChange={(e) => setActStatus(r, e.target.value)} style={{ height: 28, fontSize: 12 }}>
          {ACT_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Button size="sm" variant="ghost" icon={Trash2} onClick={() => removeAct(r)} />
      </div>
    ) },
  ];

  return (
    <>
      <Section title={<><Building2 size={14} style={{ verticalAlign: -2 }} /> Provider Work Orders (SSPC-BR-PWO) <Button size="sm" icon={Plus} onClick={() => setWoDrawer(true)} style={{ float: 'right' }}>Issue work order</Button></>}>
        <DataTable columns={woCols} rows={wos} loading={loading} empty={<EmptyState icon={Building2} title="No work orders yet" sub="Assign an approved provider." />} />
      </Section>
      <Section title={<><Landmark size={14} style={{ verticalAlign: -2 }} /> Registration Activities <Button size="sm" icon={Plus} onClick={() => setActDrawer(true)} style={{ float: 'right' }}>Add activity</Button></>}>
        <DataTable columns={actCols} rows={acts} loading={loading} empty={<EmptyState icon={Landmark} title="No activities yet" sub="Track name clearance, RJSC, TIN/BIN/VAT and authority liaison." />} />
      </Section>

      {woDrawer && (
        <Drawer open title="Issue Work Order" width={480} onClose={() => setWoDrawer(false)}
          footer={<><Button variant="ghost" onClick={() => setWoDrawer(false)}>Cancel</Button><Button onClick={saveWo} disabled={saving}>{saving ? 'Saving…' : 'Issue'}</Button></>}>
          <div style={{ display: 'grid', gap: 12 }}>
            <Field label="Provider name" required><Input value={wo.provider_name} onChange={(e) => setWo((f) => ({ ...f, provider_name: e.target.value }))} /></Field>
            <Field label="Provider category"><Input value={wo.provider_category} onChange={(e) => setWo((f) => ({ ...f, provider_category: e.target.value }))} placeholder="RJSC Consultant / Trade Licence Consultant…" /></Field>
            <Field label="Total fee (BDT)"><Input type="number" value={wo.total_fee} onChange={(e) => setWo((f) => ({ ...f, total_fee: e.target.value }))} /></Field>
            <Field label="Special instructions"><Textarea rows={2} value={wo.special_instructions} onChange={(e) => setWo((f) => ({ ...f, special_instructions: e.target.value }))} /></Field>
          </div>
        </Drawer>
      )}
      {actDrawer && (
        <Drawer open title="Add Registration Activity" width={460} onClose={() => setActDrawer(false)}
          footer={<><Button variant="ghost" onClick={() => setActDrawer(false)}>Cancel</Button><Button onClick={saveAct} disabled={saving}>{saving ? 'Saving…' : 'Add'}</Button></>}>
          <div style={{ display: 'grid', gap: 12 }}>
            <Field label="Activity type"><Select value={act.activity_type} onChange={(e) => setAct((f) => ({ ...f, activity_type: e.target.value }))}>{ACT_TYPES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field label="Title"><Input value={act.title} onChange={(e) => setAct((f) => ({ ...f, title: e.target.value }))} /></Field>
            <Field label="Authority"><Input value={act.authority} onChange={(e) => setAct((f) => ({ ...f, authority: e.target.value }))} placeholder="RJSC / NBR / City Corporation…" /></Field>
            <Field label="Reference no."><Input value={act.reference_no} onChange={(e) => setAct((f) => ({ ...f, reference_no: e.target.value }))} /></Field>
            <Field label="Status"><Select value={act.status} onChange={(e) => setAct((f) => ({ ...f, status: e.target.value }))}>{ACT_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
          </div>
        </Drawer>
      )}
    </>
  );
}
