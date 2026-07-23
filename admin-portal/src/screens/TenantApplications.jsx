import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, FileCheck2, UserCheck, Users, ShieldCheck, ArrowRight, Check, X, KeyRound, Upload } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, DataTable, StatusBadge, Drawer, SearchInput, Spinner, Badge, Button, Field, Input, Select, Textarea, KV } from '../ui/kit';
import { Combo } from '../ui/pickers';
import FileUpload from '../ui/FileUpload';

const money = (v) => (v == null || v === '' ? '—' : '৳' + Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 }));
const contactLabel = (c) => `${c.full_name}${c.primary_phone ? ' · ' + c.primary_phone : ''}`;

const STATUS_OPTS = ['draft', 'submitted', 'screening', 'verification', 'awaiting_documents', 'awaiting_owner_approval', 'approved', 'rejected', 'withdrawn', 'converted'];
const VERIFY_STATUS = ['pending', 'in_progress', 'passed', 'failed', 'na'];
const blankReference = () => ({ name: '', phone: '', relationship: '', address: '' });
const blankKycDocument = () => ({ title: '', file_url: '' });

const emptyCreate = (propertyId) => ({
  property_id: propertyId || null, applicant_name: '', mobile: '', email: '', occupation: '', employer: '',
  monthly_income: '', preferred_move_in: '', lease_period: '6 Months', occupancy_requirement: '', budget: '',
  source: '', proposed_monthly_rent: '', proposed_service_charge: '', proposed_security_deposit: '', proposed_advance_rent: '',
  proposed_lease_term_months: '', proposed_lease_start: '', current_address: '', permanent_address: '', current_landlord_name: '',
  current_landlord_phone: '', current_tenancy_address: '', current_tenancy_rent: '', current_tenancy_duration: '', reason_for_moving: '',
  employment_type: '', job_title: '', work_address: '', employment_duration: '', other_income: '', income_source_notes: '',
  references: [blankReference(), blankReference()], emergency_contact_name: '', emergency_contact_phone: '',
  emergency_contact_relationship: '', emergency_contact_address: '', date_of_birth: '', nationality: 'Bangladeshi', nid_number: '',
  passport_number: '', kyc_documents: [blankKycDocument()], kyc_notes: '', notes: '',
});

const sectionTitle = (title, note) => (
  <div>
    <h4 className="form-section-title" style={{ margin: 0 }}>{title}</h4>
    {note && <p className="cell-sub" style={{ margin: '4px 0 0' }}>{note}</p>}
  </div>
);

const listOrDash = (rows, render) => rows?.filter(Boolean)?.length ? rows.filter(Boolean).map(render) : <span className="cell-sub">—</span>;
const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try { return JSON.parse(value); } catch { return []; }
};

/**
 * Tenant Applications.
 * Global view (no props) or property-scoped (propertyId set → filters + prefills property,
 * hides the property picker, slimmer chrome for embedding in the property detail tab).
 */
export default function TenantApplications({ propertyId = null, embedded = false }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [saving, setSaving] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreate(propertyId));

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ include_counts: 'true', limit: '200' });
      if (propertyId) params.set('property_id', propertyId);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);
      const { data } = await api.get(`/tenant-applications?${params.toString()}`);
      setRows(data.data || []);
      setCounts(data.status_counts || {});
    } catch (e) {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [propertyId, statusFilter, search, toast]);

  useEffect(() => { load(); }, [load]);

  const setCreateField = (key, value) => setCreateForm((s) => ({ ...s, [key]: value }));
  const setCreateArrayField = (key, index, field, value) => setCreateForm((s) => ({
    ...s,
    [key]: (s[key] || []).map((item, i) => (i === index ? { ...item, [field]: value } : item)),
  }));
  const addCreateArrayItem = (key, factory) => setCreateForm((s) => ({ ...s, [key]: [...(s[key] || []), factory()] }));
  const removeCreateArrayItem = (key, index) => setCreateForm((s) => ({ ...s, [key]: (s[key] || []).filter((_, i) => i !== index) }));

  const selectProperty = (value, row) => {
    setCreateForm((s) => ({
      ...s,
      property_id: value,
      proposed_monthly_rent: s.proposed_monthly_rent || row?.approved_monthly_rent || row?.price || '',
      proposed_lease_term_months: s.proposed_lease_term_months || row?.lease_min_period_months || '',
      lease_period: s.lease_period || (row?.lease_min_period_months ? `${row.lease_min_period_months} Months` : ''),
    }));
  };

  const loadDetail = useCallback(async (id) => {
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/tenant-applications/${id}`);
      setDetail(data.data);
    } catch (e) {
      toast.error('Failed to load application');
    } finally {
      setDetailLoading(false);
    }
  }, [toast]);

  useEffect(() => { if (selectedId) loadDetail(selectedId); else setDetail(null); }, [selectedId, loadDetail]);

  const create = async () => {
    if (!createForm.applicant_name) return toast.error('Applicant name is required');
    if (!createForm.proposed_monthly_rent) return toast.error('Rent per month is required');
    setSaving(true);
    try {
      const { data } = await api.post('/tenant-applications', createForm);
      toast.success(data.message || 'Application created');
      setShowCreate(false);
      setCreateForm(emptyCreate(propertyId));
      await load();
      setSelectedId(data.data.id);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Create failed');
    } finally { setSaving(false); }
  };

  const patchApp = async (patch, msg) => {
    try {
      await api.put(`/tenant-applications/${selectedId}`, patch);
      if (msg) toast.success(msg);
      await loadDetail(selectedId);
      await load();
    } catch (e) { toast.error(e.response?.data?.error || 'Update failed'); }
  };

  const patchVerification = async (vid, patch) => {
    try {
      await api.patch(`/tenant-applications/${selectedId}/verifications/${vid}`, patch);
      await loadDetail(selectedId);
    } catch (e) { toast.error('Failed to update verification'); }
  };

  const filtered = useMemo(() => rows, [rows]);

  const statusTabs = [
    { key: 'all', label: `All (${counts.all ?? rows.length})` },
    { key: 'submitted', label: `Submitted (${counts.submitted ?? 0})` },
    { key: 'screening', label: `Screening (${counts.screening ?? 0})` },
    { key: 'verification', label: `Verification (${counts.verification ?? 0})` },
    { key: 'awaiting_owner_approval', label: `Owner Approval (${counts.awaiting_owner_approval ?? 0})` },
    { key: 'approved', label: `Approved (${counts.approved ?? 0})` },
    { key: 'converted', label: `Converted (${counts.converted ?? 0})` },
  ];

  const columns = [
    { key: 'application_code', header: 'Code', render: (r) => <span className="code-chip">{r.application_code}</span> },
    { key: 'applicant', header: 'Applicant', render: (r) => (
      <div><div className="cell-strong">{r.applicant_name}</div><div className="cell-sub">{r.mobile || r.email || '—'}</div></div>
    ) },
    ...(propertyId ? [] : [{ key: 'property', header: 'Property', render: (r) => r.property ? (
      <div><div className="cell-strong">{r.property.title}</div><div className="cell-sub">{r.property.property_code}</div></div>
    ) : <span className="cell-sub">—</span> }]),
    { key: 'rent', header: 'Rent / Terms', render: (r) => <span className="cell-sub">{money(r.proposed_monthly_rent || r.approved_rent || r.property?.approved_monthly_rent)}{r.proposed_service_charge ? ` + ${money(r.proposed_service_charge)} svc` : ''}</span> },
    { key: 'income', header: 'Income / Budget', render: (r) => <span className="cell-sub">{money(r.monthly_income)}{r.budget ? ` · ${money(r.budget)}` : ''}</span> },
    { key: 'recommendation', header: 'Reco', render: (r) => <span className="cell-sub" style={{ textTransform: 'capitalize' }}>{r.recommendation || '—'}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <>
      {!embedded && (
        <PageHead
          title="Tenant Applications"
          desc="All tenant applications across every rental property — screening, verification, owner approval and conversion to tenancy."
          actions={<Button icon={Plus} onClick={() => { setCreateForm(emptyCreate(propertyId)); setShowCreate(true); }}>Create Tenant Application</Button>}
        />
      )}

      {embedded && (
        <div className="between" style={{ marginBottom: 12 }}>
          <h4 className="form-section-title" style={{ margin: 0, border: 'none', padding: 0 }}>Tenant Applications</h4>
          <Button size="sm" icon={Plus} onClick={() => { setCreateForm(emptyCreate(propertyId)); setShowCreate(true); }}>Create Tenant Application</Button>
        </div>
      )}

      <div className="tabs" style={{ flexWrap: 'wrap' }}>
        {statusTabs.map((t) => (
          <button key={t.key} className={`tab ${statusFilter === t.key ? 'active' : ''}`} onClick={() => setStatusFilter(t.key)}>{t.label}</button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-pad" style={{ padding: 14 }}>
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search applicant, code, phone, email…" />
        </div>
      </div>

      <div className="card">
        <DataTable columns={columns} rows={filtered} loading={loading} onRowClick={(r) => setSelectedId(r.id)} />
      </div>

      {/* ── CREATE DRAWER ── */}
      {showCreate && (
        <Drawer title="Create Tenant Application" width={640} onClose={() => setShowCreate(false)}
          footer={<><Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button><Button onClick={create} disabled={saving}>{saving ? <Spinner /> : 'Create Application'}</Button></>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {!propertyId && (
              <Field label="Property" required>
                <Combo endpoint="/properties?listing_type=rent" labelFn={(p) => `${p.title} · ${p.property_code}`} value={createForm.property_id} onChange={selectProperty} placeholder="Select rental property…" />
              </Field>
            )}
            {sectionTitle('Application lease terms', 'Prefilled from the listing/property when available. Applicants can edit these requested terms before submission.')}
            <div className="form-grid">
              <Field label="Rent Per Month (৳)" required><Input type="number" value={createForm.proposed_monthly_rent} onChange={(e) => setCreateField('proposed_monthly_rent', e.target.value)} /></Field>
              <Field label="Service Charge (৳)"><Input type="number" value={createForm.proposed_service_charge} onChange={(e) => setCreateField('proposed_service_charge', e.target.value)} /></Field>
              <Field label="Advance Rent / Security Money (৳)"><Input type="number" value={createForm.proposed_advance_rent} onChange={(e) => setCreateField('proposed_advance_rent', e.target.value)} /></Field>
              <Field label="Security Deposit (৳)"><Input type="number" value={createForm.proposed_security_deposit} onChange={(e) => setCreateField('proposed_security_deposit', e.target.value)} /></Field>
              <Field label="Lease Term (months)"><Input type="number" value={createForm.proposed_lease_term_months} onChange={(e) => setCreateField('proposed_lease_term_months', e.target.value)} /></Field>
              <Field label="Proposed Lease Start"><Input type="date" value={createForm.proposed_lease_start} onChange={(e) => setCreateField('proposed_lease_start', e.target.value)} /></Field>
            </div>

            {sectionTitle('Applicant information')}
            <div className="form-grid">
              <Field label="Applicant Name" required><Input value={createForm.applicant_name} onChange={(e) => setCreateField('applicant_name', e.target.value)} /></Field>
              <Field label="Mobile"><Input value={createForm.mobile} onChange={(e) => setCreateField('mobile', e.target.value)} placeholder="01XXXXXXXXX" /></Field>
              <Field label="Email"><Input value={createForm.email} onChange={(e) => setCreateField('email', e.target.value)} /></Field>
              <Field label="Source / Channel"><Input value={createForm.source} onChange={(e) => setCreateField('source', e.target.value)} placeholder="Website listing, referral…" /></Field>
            </div>

            {sectionTitle('Current address and tenancy')}
            <Field label="Current Address"><Textarea value={createForm.current_address} onChange={(e) => setCreateField('current_address', e.target.value)} /></Field>
            <Field label="Current Tenancy Address"><Textarea value={createForm.current_tenancy_address} onChange={(e) => setCreateField('current_tenancy_address', e.target.value)} /></Field>
            <div className="form-grid">
              <Field label="Current Landlord Name"><Input value={createForm.current_landlord_name} onChange={(e) => setCreateField('current_landlord_name', e.target.value)} /></Field>
              <Field label="Current Landlord Phone"><Input value={createForm.current_landlord_phone} onChange={(e) => setCreateField('current_landlord_phone', e.target.value)} /></Field>
              <Field label="Current Rent (৳)"><Input type="number" value={createForm.current_tenancy_rent} onChange={(e) => setCreateField('current_tenancy_rent', e.target.value)} /></Field>
              <Field label="Tenancy Duration"><Input value={createForm.current_tenancy_duration} onChange={(e) => setCreateField('current_tenancy_duration', e.target.value)} placeholder="2 years" /></Field>
            </div>
            <Field label="Reason For Moving"><Textarea value={createForm.reason_for_moving} onChange={(e) => setCreateField('reason_for_moving', e.target.value)} /></Field>

            {sectionTitle('Employment and income')}
            <div className="form-grid">
              <Field label="Occupation"><Input value={createForm.occupation} onChange={(e) => setCreateField('occupation', e.target.value)} /></Field>
              <Field label="Employer / Business"><Input value={createForm.employer} onChange={(e) => setCreateField('employer', e.target.value)} /></Field>
              <Field label="Job Title"><Input value={createForm.job_title} onChange={(e) => setCreateField('job_title', e.target.value)} /></Field>
              <Field label="Employment Type"><Input value={createForm.employment_type} onChange={(e) => setCreateField('employment_type', e.target.value)} placeholder="Salaried, business, self-employed…" /></Field>
              <Field label="Employment Duration"><Input value={createForm.employment_duration} onChange={(e) => setCreateField('employment_duration', e.target.value)} /></Field>
              <Field label="Monthly Income (৳)"><Input type="number" value={createForm.monthly_income} onChange={(e) => setCreateField('monthly_income', e.target.value)} /></Field>
              <Field label="Other Income (৳)"><Input type="number" value={createForm.other_income} onChange={(e) => setCreateField('other_income', e.target.value)} /></Field>
              <Field label="Budget (৳)"><Input type="number" value={createForm.budget} onChange={(e) => setCreateField('budget', e.target.value)} /></Field>
            </div>
            <Field label="Work Address"><Textarea value={createForm.work_address} onChange={(e) => setCreateField('work_address', e.target.value)} /></Field>
            <Field label="Income Source Notes"><Textarea value={createForm.income_source_notes} onChange={(e) => setCreateField('income_source_notes', e.target.value)} /></Field>

            {sectionTitle('References')}
            {(createForm.references || []).map((ref, index) => (
              <div key={index} className="card" style={{ padding: 12, background: 'var(--surface-2)' }}>
                <div className="between" style={{ marginBottom: 8 }}><strong>Reference {index + 1}</strong>{index > 1 && <Button size="sm" variant="ghost" onClick={() => removeCreateArrayItem('references', index)}>Remove</Button>}</div>
                <div className="form-grid">
                  <Field label="Name"><Input value={ref.name || ''} onChange={(e) => setCreateArrayField('references', index, 'name', e.target.value)} /></Field>
                  <Field label="Phone"><Input value={ref.phone || ''} onChange={(e) => setCreateArrayField('references', index, 'phone', e.target.value)} /></Field>
                  <Field label="Relationship"><Input value={ref.relationship || ''} onChange={(e) => setCreateArrayField('references', index, 'relationship', e.target.value)} /></Field>
                  <Field label="Address"><Input value={ref.address || ''} onChange={(e) => setCreateArrayField('references', index, 'address', e.target.value)} /></Field>
                </div>
              </div>
            ))}
            <Button size="sm" variant="ghost" icon={Plus} onClick={() => addCreateArrayItem('references', blankReference)}>Add Reference</Button>

            {sectionTitle('Emergency contact')}
            <div className="form-grid">
              <Field label="Name"><Input value={createForm.emergency_contact_name} onChange={(e) => setCreateField('emergency_contact_name', e.target.value)} /></Field>
              <Field label="Phone"><Input value={createForm.emergency_contact_phone} onChange={(e) => setCreateField('emergency_contact_phone', e.target.value)} /></Field>
              <Field label="Relationship"><Input value={createForm.emergency_contact_relationship} onChange={(e) => setCreateField('emergency_contact_relationship', e.target.value)} /></Field>
            </div>
            <Field label="Address"><Textarea value={createForm.emergency_contact_address} onChange={(e) => setCreateField('emergency_contact_address', e.target.value)} /></Field>

            {sectionTitle('KYC information')}
            <div className="form-grid">
              <Field label="Date of Birth"><Input type="date" value={createForm.date_of_birth} onChange={(e) => setCreateField('date_of_birth', e.target.value)} /></Field>
              <Field label="Nationality"><Input value={createForm.nationality} onChange={(e) => setCreateField('nationality', e.target.value)} /></Field>
              <Field label="NID Number"><Input value={createForm.nid_number} onChange={(e) => setCreateField('nid_number', e.target.value)} /></Field>
              <Field label="Passport Number"><Input value={createForm.passport_number} onChange={(e) => setCreateField('passport_number', e.target.value)} /></Field>
            </div>
            <Field label="Permanent Address"><Textarea value={createForm.permanent_address} onChange={(e) => setCreateField('permanent_address', e.target.value)} /></Field>
            {(createForm.kyc_documents || []).map((doc, index) => (
              <div key={index} className="form-grid">
                <Field label={`KYC Document ${index + 1} Title`}><Input value={doc.title || ''} onChange={(e) => setCreateArrayField('kyc_documents', index, 'title', e.target.value)} placeholder="NID front, passport, utility bill…" /></Field>
                <Field label="Document file"><FileUpload value={doc.file_url || ''} onChange={(url) => setCreateArrayField('kyc_documents', index, 'file_url', url)} label="Upload ID / KYC / payslip (image or PDF)" /></Field>
              </div>
            ))}
            <Button size="sm" variant="ghost" icon={Plus} onClick={() => addCreateArrayItem('kyc_documents', blankKycDocument)}>Add KYC Document</Button>
            <Field label="KYC Notes"><Textarea value={createForm.kyc_notes} onChange={(e) => setCreateField('kyc_notes', e.target.value)} /></Field>

            {sectionTitle('Move-in and occupancy')}
            <div className="form-grid">
              <Field label="Preferred Move-In"><Input type="date" value={createForm.preferred_move_in} onChange={(e) => setCreateField('preferred_move_in', e.target.value)} /></Field>
              <Field label="Occupancy Requirement"><Input value={createForm.occupancy_requirement} onChange={(e) => setCreateField('occupancy_requirement', e.target.value)} placeholder="Family of 4…" /></Field>
            </div>
            <Field label="Notes"><Textarea value={createForm.notes} onChange={(e) => setCreateField('notes', e.target.value)} /></Field>
          </div>
        </Drawer>
      )}

      {/* ── DETAIL DRAWER ── */}
      {selectedId && (
        <Drawer title="Application File" width={760} onClose={() => setSelectedId(null)}>
          {detailLoading || !detail ? (
            <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>
          ) : (
            <ApplicationDetail
              app={detail}
              onPatch={patchApp}
              onPatchVerification={patchVerification}
              onReload={() => { loadDetail(selectedId); load(); }}
            />
          )}
        </Drawer>
      )}
    </>
  );
}

// ── Detail body: header, status workflow, verification checklist, occupants, docs, convert ──
function ApplicationDetail({ app, onPatch, onPatchVerification, onReload }) {
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [convert, setConvert] = useState(false);
  const [convForm, setConvForm] = useState({
    lease_start: app.proposed_lease_start || app.lease_start_target || '',
    lease_end: '',
    monthly_rent: app.proposed_monthly_rent || app.approved_rent || app.property?.approved_monthly_rent || '',
    security_deposit: app.proposed_security_deposit || '',
    advance_rent: app.proposed_advance_rent || '',
    service_charge: app.proposed_service_charge || '',
    minimum_lease_period_months: app.proposed_lease_term_months || app.property?.lease_min_period_months || 6,
    rent_due_day: app.property?.rent_due_day || 5,
  });
  const [occ, setOcc] = useState({ name: '', relationship: '', contact: '', occupation: '', id_received: false });
  const [doc, setDoc] = useState({ title: '', file_url: '', doc_type: 'id' });
  const [busy, setBusy] = useState(false);

  const addOccupant = async () => {
    if (!occ.name) return toast.error('Occupant name required');
    try { await api.post(`/tenant-applications/${app.id}/occupants`, occ); setOcc({ name: '', relationship: '', contact: '', occupation: '', id_received: false }); onReload(); toast.success('Occupant added'); }
    catch { toast.error('Failed to add occupant'); }
  };
  const addDoc = async () => {
    if (!doc.file_url) return toast.error('Document URL required');
    try { await api.post(`/tenant-applications/${app.id}/documents`, doc); setDoc({ title: '', file_url: '', doc_type: 'id' }); onReload(); toast.success('Document added'); }
    catch { toast.error('Failed to add document'); }
  };
  const doConvert = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/tenant-applications/${app.id}/convert-to-tenancy`, convForm);
      toast.success(data.message || 'Tenancy created');
      setConvert(false); onReload();
    } catch (e) { toast.error(e.response?.data?.error || 'Conversion failed'); }
    finally { setBusy(false); }
  };

  const v = app.verifications || [];
  const passed = v.filter((x) => x.status === 'passed' || x.status === 'na').length;
  const references = asArray(app.references);
  const kycDocuments = asArray(app.kyc_documents);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ background: 'var(--primary-50)', borderColor: 'var(--primary-100)', padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="code-chip">{app.application_code}</span><StatusBadge status={app.status} />
            </div>
            <div style={{ fontWeight: 800, fontSize: 17, marginTop: 6 }}>{app.applicant_name}</div>
            <div className="cell-sub">{app.mobile || '—'} · {app.email || '—'}</div>
            {app.property && <div className="cell-sub" style={{ marginTop: 2 }}>Property: <strong>{app.property.title}</strong> ({app.property.property_code})</div>}
          </div>
          <div style={{ minWidth: 200 }}>
            <Field label="Status">
              <Select value={app.status} onChange={(e) => onPatch({ status: e.target.value }, 'Status updated')}>
                {STATUS_OPTS.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </Select>
            </Field>
            <Field label="Recommendation">
              <Select value={app.recommendation || 'pending'} onChange={(e) => onPatch({ recommendation: e.target.value }, 'Recommendation updated')}>
                {['pending', 'recommend', 'hold', 'reject'].map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>Overview</button>
        <button className={`tab ${tab === 'verify' ? 'active' : ''}`} onClick={() => setTab('verify')}>Verification ({passed}/{v.length})</button>
        <button className={`tab ${tab === 'occupants' ? 'active' : ''}`} onClick={() => setTab('occupants')}>Occupants ({app.occupants?.length || 0})</button>
        <button className={`tab ${tab === 'docs' ? 'active' : ''}`} onClick={() => setTab('docs')}>Documents ({app.documents?.length || 0})</button>
      </div>

      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ padding: 12, border: '1px solid var(--border)' }}>
            {sectionTitle('Submitted lease terms')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <div>
                <KV k="Rent Per Month" v={money(app.proposed_monthly_rent || app.approved_rent)} />
                <KV k="Service Charge" v={money(app.proposed_service_charge)} />
                <KV k="Advance / Security Money" v={money(app.proposed_advance_rent)} />
              </div>
              <div>
                <KV k="Security Deposit" v={money(app.proposed_security_deposit)} />
                <KV k="Lease Term" v={app.proposed_lease_term_months ? `${app.proposed_lease_term_months} months` : app.lease_period} />
                <KV k="Proposed Lease Start" v={app.proposed_lease_start} />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 12, border: '1px solid var(--border)' }}>
            {sectionTitle('Applicant, employment and income')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <div>
                <KV k="Occupation" v={app.occupation} />
                <KV k="Employer / Business" v={app.employer} />
                <KV k="Job Title" v={app.job_title} />
                <KV k="Employment Type" v={app.employment_type} />
                <KV k="Employment Duration" v={app.employment_duration} />
              </div>
              <div>
                <KV k="Monthly Income" v={money(app.monthly_income)} />
                <KV k="Other Income" v={money(app.other_income)} />
                <KV k="Budget" v={money(app.budget)} />
                <KV k="Preferred Move-In" v={app.preferred_move_in} />
                <KV k="Occupancy" v={app.occupancy_requirement} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <KV k="Work Address" v={app.work_address} />
                <KV k="Income Notes" v={app.income_source_notes} />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 12, border: '1px solid var(--border)' }}>
            {sectionTitle('Current address and tenancy')}
            <KV k="Current Address" v={app.current_address} />
            <KV k="Current Tenancy Address" v={app.current_tenancy_address} />
            <KV k="Current Landlord" v={[app.current_landlord_name, app.current_landlord_phone].filter(Boolean).join(' · ')} />
            <KV k="Current Rent" v={money(app.current_tenancy_rent)} />
            <KV k="Tenancy Duration" v={app.current_tenancy_duration} />
            <KV k="Reason For Moving" v={app.reason_for_moving} />
          </div>

          <div className="card" style={{ padding: 12, border: '1px solid var(--border)' }}>
            {sectionTitle('References and emergency contact')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {listOrDash(references, (r, i) => (
                <div key={i} className="cell-sub"><strong>{r.name || `Reference ${i + 1}`}</strong>{r.phone ? ` · ${r.phone}` : ''}{r.relationship ? ` · ${r.relationship}` : ''}{r.address ? ` · ${r.address}` : ''}</div>
              ))}
            </div>
            <div style={{ marginTop: 10 }}>
              <KV k="Emergency Contact" v={[app.emergency_contact_name, app.emergency_contact_phone, app.emergency_contact_relationship].filter(Boolean).join(' · ')} />
              <KV k="Emergency Address" v={app.emergency_contact_address} />
            </div>
          </div>

          <div className="card" style={{ padding: 12, border: '1px solid var(--border)' }}>
            {sectionTitle('KYC information')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <div>
                <KV k="Date of Birth" v={app.date_of_birth} />
                <KV k="Nationality" v={app.nationality} />
                <KV k="NID Number" v={app.nid_number} />
              </div>
              <div>
                <KV k="Passport Number" v={app.passport_number} />
                <KV k="Permanent Address" v={app.permanent_address} />
                <KV k="KYC Notes" v={app.kyc_notes} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {listOrDash(kycDocuments, (d, i) => d.file_url ? <a key={i} href={d.file_url} target="_blank" rel="noreferrer" className="cell-sub">{d.title || `KYC document ${i + 1}`}</a> : <span key={i} className="cell-sub">{d.title || `KYC document ${i + 1}`}</span>)}
            </div>
          </div>

          <div className="card" style={{ padding: 12, border: '1px solid var(--border)' }}>
            {sectionTitle('Workflow')}
            <KV k="Application Date" v={app.application_date} />
            <KV k="Owner Decision" v={app.owner_decision} />
            <KV k="Approved Rent" v={money(app.approved_rent)} />
            <Field label="Link Tenant Contact (required before conversion)">
              <Combo endpoint="/contacts" labelFn={contactLabel} value={app.tenant_contact_id} onChange={(val) => onPatch({ tenant_contact_id: val }, 'Tenant contact linked')} placeholder="Select tenant contact…" />
            </Field>
            <Field label="Screening Notes">
              <Textarea defaultValue={app.screening_notes || ''} onBlur={(e) => e.target.value !== (app.screening_notes || '') && onPatch({ screening_notes: e.target.value })} placeholder="Screening / risk notes…" />
            </Field>
            {app.converted_tenancy_id ? (
              <Badge tone="green" dot>Converted to tenancy #{app.converted_tenancy_id}</Badge>
            ) : (
              <Button icon={KeyRound} disabled={app.status !== 'approved'} onClick={() => setConvert(true)} title={app.status !== 'approved' ? 'Set status to Approved first' : ''}>
                Create Tenancy from Application
              </Button>
            )}
          </div>
        </div>
      )}

      {tab === 'verify' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <EmployerReferenceCard app={app} onReload={onReload} />
          {v.map((item) => (
            <div key={item.id} className="card" style={{ padding: 10, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{item.item}</div>
                  <div className="cell-sub">Evidence: {item.evidence_required || '—'}</div>
                </div>
                <Select value={item.status} onChange={(e) => onPatchVerification(item.id, { status: e.target.value })} style={{ width: 130 }}>
                  {VERIFY_STATUS.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </Select>
              </div>
              <Input style={{ marginTop: 6 }} placeholder="Evidence URL / note…" defaultValue={item.evidence_url || ''} onBlur={(e) => e.target.value !== (item.evidence_url || '') && onPatchVerification(item.id, { evidence_url: e.target.value })} />
            </div>
          ))}
        </div>
      )}

      {tab === 'occupants' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(app.occupants || []).map((o) => (
            <div key={o.id} className="card" style={{ padding: 10, border: '1px solid var(--border)' }}>
              <div className="between">
                <div><strong>{o.name}</strong> <span className="cell-sub">· {o.relationship || '—'}</span></div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {o.subletting_concern && <Badge tone="red">Subletting?</Badge>}
                  <Badge tone={o.approved ? 'green' : 'grey'}>{o.approved ? 'Approved' : 'Pending'}</Badge>
                </div>
              </div>
              <div className="cell-sub">{o.occupation || '—'} · {o.contact || '—'} · ID: {o.id_received ? 'Yes' : 'No'}</div>
            </div>
          ))}
          <div className="card" style={{ padding: 12, background: 'var(--surface-2)' }}>
            <div className="form-grid">
              <Field label="Occupant Name"><Input value={occ.name} onChange={(e) => setOcc((s) => ({ ...s, name: e.target.value }))} /></Field>
              <Field label="Relationship"><Input value={occ.relationship} onChange={(e) => setOcc((s) => ({ ...s, relationship: e.target.value }))} /></Field>
              <Field label="Contact"><Input value={occ.contact} onChange={(e) => setOcc((s) => ({ ...s, contact: e.target.value }))} /></Field>
              <Field label="Occupation"><Input value={occ.occupation} onChange={(e) => setOcc((s) => ({ ...s, occupation: e.target.value }))} /></Field>
            </div>
            <Button size="sm" icon={Plus} style={{ marginTop: 8 }} onClick={addOccupant}>Add Occupant</Button>
          </div>
        </div>
      )}

      {tab === 'docs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(app.documents || []).map((d) => (
            <div key={d.id} className="nav-item" style={{ margin: 0, padding: 10, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <span><strong>{d.title}</strong> <span className="cell-sub">· {d.doc_type}</span></span>
              <a href={d.file_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">View</a>
            </div>
          ))}
          <div className="card" style={{ padding: 12, background: 'var(--surface-2)' }}>
            <div className="form-grid">
              <Field label="Document Title"><Input value={doc.title} onChange={(e) => setDoc((s) => ({ ...s, title: e.target.value }))} placeholder="NID copy, payslip…" /></Field>
              <Field label="Type">
                <Select value={doc.doc_type} onChange={(e) => setDoc((s) => ({ ...s, doc_type: e.target.value }))}>
                  {['id', 'income', 'reference', 'employment', 'other'].map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Document file"><FileUpload value={doc.file_url} onChange={(url) => setDoc((s) => ({ ...s, file_url: url }))} label="Upload ID / KYC / payslip (image or PDF)" /></Field>
            <Button size="sm" icon={Upload} style={{ marginTop: 8 }} onClick={addDoc}>Add Document</Button>
          </div>
        </div>
      )}

      {/* Convert sub-drawer */}
      {convert && (
        <Drawer title="Create Tenancy from Application" width={520} onClose={() => setConvert(false)}
          footer={<><Button variant="ghost" onClick={() => setConvert(false)}>Cancel</Button><Button onClick={doConvert} disabled={busy}>{busy ? <Spinner /> : 'Create Tenancy'}</Button></>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p className="cell-sub" style={{ margin: 0 }}>Creates an upcoming tenancy, bond/deposit record, folios and copies approved occupants.</p>
            <div className="form-grid">
              <Field label="Lease Start"><Input type="date" value={convForm.lease_start} onChange={(e) => setConvForm((s) => ({ ...s, lease_start: e.target.value }))} /></Field>
              <Field label="Lease End"><Input type="date" value={convForm.lease_end} onChange={(e) => setConvForm((s) => ({ ...s, lease_end: e.target.value }))} /></Field>
              <Field label="Monthly Rent (৳)" required><Input type="number" value={convForm.monthly_rent} onChange={(e) => setConvForm((s) => ({ ...s, monthly_rent: e.target.value }))} /></Field>
              <Field label="Service Charge (৳)"><Input type="number" value={convForm.service_charge} onChange={(e) => setConvForm((s) => ({ ...s, service_charge: e.target.value }))} /></Field>
              <Field label="Advance Rent (৳)"><Input type="number" value={convForm.advance_rent} onChange={(e) => setConvForm((s) => ({ ...s, advance_rent: e.target.value }))} placeholder="Defaults to 1 month" /></Field>
              <Field label="Security Deposit (৳)"><Input type="number" value={convForm.security_deposit} onChange={(e) => setConvForm((s) => ({ ...s, security_deposit: e.target.value }))} placeholder="Defaults to 2 months" /></Field>
              <Field label="Lease Term (months)"><Input type="number" value={convForm.minimum_lease_period_months} onChange={(e) => setConvForm((s) => ({ ...s, minimum_lease_period_months: e.target.value }))} /></Field>
              <Field label="Rent Due Day"><Input type="number" min="1" max="28" value={convForm.rent_due_day} onChange={(e) => setConvForm((s) => ({ ...s, rent_due_day: e.target.value }))} /></Field>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
}

/* ── Employer reference card (not sent / sent / responded) ─────────────────── */
const REF_LABELS = {
  works_at_company: 'Works at the company', role_correct: 'Role matches', employment_type: 'Employment type',
  start_period_correct: 'Start period matches', salary_correct: 'Salary matches', salary_actual: 'Actual salary (per employer)',
  role_ongoing: 'Role ongoing', comments: 'Comments',
};

function EmployerReferenceCard({ app, onReload }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    employer_ref_name: app.employer_ref_name || '', employer_ref_email: app.employer_ref_email || '',
    employer_ref_phone: app.employer_ref_phone || '', employer_ref_role: app.employer_ref_role || '',
    employer_ref_company: app.employer_ref_company || app.employer || '',
  });
  const resp = app.employer_ref_response;

  const send = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/tenant-applications/${app.id}/send-employer-reference`, form);
      toast.success(data.message);
      if (data.data?.link) { try { await navigator.clipboard.writeText(data.data.link); toast.success('Link copied.'); } catch { /* ignore */ } }
      onReload?.();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to send.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="card" style={{ padding: 12, border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <ShieldCheck size={15} color="var(--primary)" />
        <span style={{ fontWeight: 750, fontSize: 13 }}>Employer reference</span>
        {resp ? <Badge tone="green" dot>Responded</Badge> : app.employer_ref_sent_at ? <Badge tone="amber" dot>Sent — awaiting reply</Badge> : <Badge tone="grey">Not sent</Badge>}
      </div>
      {resp ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 18px' }}>
          {Object.entries(resp).filter(([, v]) => v != null && v !== '').map(([k, v]) => {
            const bad = v === 'no';
            const salaryMismatch = k === 'salary_actual';
            return (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '3px 0' }}>
                <span style={{ color: 'var(--muted)' }}>{REF_LABELS[k] || k}</span>
                <span style={{ fontWeight: 700, color: bad || salaryMismatch ? 'var(--danger)' : v === 'yes' ? 'var(--success)' : 'var(--ink)' }}>
                  {typeof v === 'number' ? '৳' + v.toLocaleString() : String(v)}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Input placeholder="Contact name" value={form.employer_ref_name} onChange={(e) => setForm((s) => ({ ...s, employer_ref_name: e.target.value }))} />
            <Input placeholder="Email *" value={form.employer_ref_email} onChange={(e) => setForm((s) => ({ ...s, employer_ref_email: e.target.value }))} />
            <Input placeholder="Their role (e.g. HR Manager)" value={form.employer_ref_role} onChange={(e) => setForm((s) => ({ ...s, employer_ref_role: e.target.value }))} />
            <Input placeholder="Company" value={form.employer_ref_company} onChange={(e) => setForm((s) => ({ ...s, employer_ref_company: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <Button size="sm" onClick={send} disabled={busy || !form.employer_ref_email}>{busy ? <Spinner /> : app.employer_ref_sent_at ? 'Resend request' : 'Send reference request'}</Button>
          </div>
          <p className="cell-sub" style={{ fontSize: 11.5, margin: '6px 0 0' }}>Optional — a positive reference strengthens the application; it never blocks it.</p>
        </>
      )}
    </div>
  );
}
