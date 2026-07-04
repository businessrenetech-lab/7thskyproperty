import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, FileCheck2, UserCheck, Users, ShieldCheck, ArrowRight, Check, X, KeyRound, Upload } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, DataTable, StatusBadge, Drawer, SearchInput, Spinner, Badge, Button, Field, Input, Select, Textarea, KV } from '../ui/kit';
import { Combo } from '../ui/pickers';

const money = (v) => (v == null || v === '' ? '—' : '৳' + Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 }));
const contactLabel = (c) => `${c.full_name}${c.primary_phone ? ' · ' + c.primary_phone : ''}`;

const STATUS_OPTS = ['draft', 'submitted', 'screening', 'verification', 'awaiting_documents', 'awaiting_owner_approval', 'approved', 'rejected', 'withdrawn', 'converted'];
const VERIFY_STATUS = ['pending', 'in_progress', 'passed', 'failed', 'na'];

const emptyCreate = (propertyId) => ({
  property_id: propertyId || null, applicant_name: '', mobile: '', email: '', occupation: '', employer: '',
  monthly_income: '', preferred_move_in: '', lease_period: '6 Months', occupancy_requirement: '', budget: '',
  source: '', notes: '',
});

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {!propertyId && (
              <Field label="Property" required>
                <Combo endpoint="/properties?listing_type=rent" labelFn={(p) => `${p.title} · ${p.property_code}`} value={createForm.property_id} onChange={(v) => setCreateForm((s) => ({ ...s, property_id: v }))} placeholder="Select rental property…" />
              </Field>
            )}
            <div className="form-grid">
              <Field label="Applicant Name" required><Input value={createForm.applicant_name} onChange={(e) => setCreateForm((s) => ({ ...s, applicant_name: e.target.value }))} /></Field>
              <Field label="Mobile"><Input value={createForm.mobile} onChange={(e) => setCreateForm((s) => ({ ...s, mobile: e.target.value }))} placeholder="01XXXXXXXXX" /></Field>
              <Field label="Email"><Input value={createForm.email} onChange={(e) => setCreateForm((s) => ({ ...s, email: e.target.value }))} /></Field>
              <Field label="Source / Channel"><Input value={createForm.source} onChange={(e) => setCreateForm((s) => ({ ...s, source: e.target.value }))} placeholder="Website, referral…" /></Field>
            </div>
            <div className="form-grid">
              <Field label="Occupation"><Input value={createForm.occupation} onChange={(e) => setCreateForm((s) => ({ ...s, occupation: e.target.value }))} /></Field>
              <Field label="Employer"><Input value={createForm.employer} onChange={(e) => setCreateForm((s) => ({ ...s, employer: e.target.value }))} /></Field>
              <Field label="Monthly Income (৳)"><Input type="number" value={createForm.monthly_income} onChange={(e) => setCreateForm((s) => ({ ...s, monthly_income: e.target.value }))} /></Field>
              <Field label="Budget (৳)"><Input type="number" value={createForm.budget} onChange={(e) => setCreateForm((s) => ({ ...s, budget: e.target.value }))} /></Field>
            </div>
            <div className="form-grid">
              <Field label="Preferred Move-In"><Input type="date" value={createForm.preferred_move_in} onChange={(e) => setCreateForm((s) => ({ ...s, preferred_move_in: e.target.value }))} /></Field>
              <Field label="Lease Period"><Input value={createForm.lease_period} onChange={(e) => setCreateForm((s) => ({ ...s, lease_period: e.target.value }))} placeholder="6 Months" /></Field>
              <Field label="Occupancy Requirement"><Input value={createForm.occupancy_requirement} onChange={(e) => setCreateForm((s) => ({ ...s, occupancy_requirement: e.target.value }))} placeholder="Family of 4…" /></Field>
            </div>
            <Field label="Notes"><Textarea value={createForm.notes} onChange={(e) => setCreateForm((s) => ({ ...s, notes: e.target.value }))} /></Field>
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
  const [convForm, setConvForm] = useState({ lease_start: '', lease_end: '', monthly_rent: app.approved_rent || app.property?.approved_monthly_rent || '', security_deposit: '', advance_rent: '', service_charge: '', rent_due_day: app.property?.rent_due_day || 5 });
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <div>
            <KV k="Occupation" v={app.occupation} />
            <KV k="Employer" v={app.employer} />
            <KV k="Monthly Income" v={money(app.monthly_income)} />
            <KV k="Budget" v={money(app.budget)} />
            <KV k="Application Date" v={app.application_date} />
          </div>
          <div>
            <KV k="Preferred Move-In" v={app.preferred_move_in} />
            <KV k="Lease Period" v={app.lease_period} />
            <KV k="Occupancy" v={app.occupancy_requirement} />
            <KV k="Approved Rent" v={money(app.approved_rent)} />
            <KV k="Owner Decision" v={app.owner_decision} />
          </div>
          <div style={{ gridColumn: '1 / -1', marginTop: 10 }}>
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
            <Field label="File URL"><Input value={doc.file_url} onChange={(e) => setDoc((s) => ({ ...s, file_url: e.target.value }))} placeholder="Paste hosted file URL…" /></Field>
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
              <Field label="Rent Due Day"><Input type="number" min="1" max="28" value={convForm.rent_due_day} onChange={(e) => setConvForm((s) => ({ ...s, rent_due_day: e.target.value }))} /></Field>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
}
