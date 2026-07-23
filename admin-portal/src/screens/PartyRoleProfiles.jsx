import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Send, Link2, Copy, FileText, Check, ShieldCheck, ClipboardList, Save, Pencil, Trash2, UserPlus, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Button, DataTable, Drawer, Field, Input, Select, Textarea, SearchInput, StatusBadge, Badge, Spinner, KV } from '../ui/kit';
import { Combo } from '../ui/pickers';
import RoleKycManager from '../components/RoleKycManager';

const ROLES = ['landlord', 'tenant', 'vendor', 'buyer', 'supplier', 'third_party'];
const STATUSES = ['draft', 'kyc_pending', 'documents_pending', 'agreement_pending', 'signing_sent', 'partially_signed', 'signed', 'approval_pending', 'active', 'rejected', 'declined', 'expired', 'voided'];
const contactLabel = (c) => `${c.full_name}${c.primary_phone ? ' · ' + c.primary_phone : ''}${c.email ? ' · ' + c.email : ''}`;

// The onboarding pipeline every role walks through. Draft → active.
const PIPELINE = ['draft', 'kyc_pending', 'agreement_pending', 'signing_sent', 'active'];
const pipelineIndex = (status) => {
  if (status === 'active') return 4;
  if (['signing_sent', 'partially_signed', 'signed', 'approval_pending'].includes(status)) return 3;
  if (status === 'agreement_pending') return 2;
  if (['kyc_pending', 'documents_pending'].includes(status)) return 1;
  return 0;
};

// Role-specific agreement terms the staff can set before sending.
const TERMS_FIELDS = {
  landlord: [
    { key: 'management_fee_pct', label: 'Management fee (%)', type: 'number', hint: 'Syncs to property + fee schedule on signing' },
    { key: 'onboarding_fee', label: 'Onboarding fee (৳)', type: 'number' },
    { key: 'bank_name', label: 'Bank name' }, { key: 'bank_branch', label: 'Bank branch' },
    { key: 'bank_account_name', label: 'Account holder' }, { key: 'bank_account_number', label: 'Account number' },
    { key: 'bank_routing_number', label: 'Routing number' }, { key: 'bkash_number', label: 'bKash' },
  ],
  vendor: [
    { key: 'listing_price', label: 'Listing price (৳)', type: 'number' },
    { key: 'commission_pct', label: 'Commission (%)', type: 'number' },
    { key: 'exclusivity_months', label: 'Exclusivity (months)', type: 'number' },
  ],
  buyer: [
    { key: 'service_fee_pct', label: 'Service fee (%)', type: 'number' },
    { key: 'budget_min', label: 'Budget min (৳)', type: 'number' },
    { key: 'budget_max', label: 'Budget max (৳)', type: 'number' },
  ],
  supplier: [
    { key: 'payment_terms_days', label: 'Payment terms (days)', type: 'number' },
    { key: 'service_categories', label: 'Service categories', hint: 'e.g. plumbing, electrical' },
  ],
  third_party: [
    { key: 'payment_terms_days', label: 'Payment terms (days)', type: 'number' },
    { key: 'service_categories', label: 'Scope of services' },
  ],
  tenant: [],
};

export default function PartyRoleProfiles() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const propertyIdFilter = searchParams.get('property_id') || '';
  const profileIdFilter = Number(searchParams.get('profile_id') || 0);
  const salesRolesOnly = searchParams.get('sales_roles') === '1';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [drawer, setDrawer] = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ contact_id: null, role_type: 'landlord', property_id: null, notes: '' });

  const openProfile = useCallback(async (id) => {
    try {
      const { data } = await api.get(`/party-role-profiles/${id}`);
      setSelected(data.data);
      return data.data;
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to load role profile');
      return null;
    }
  }, [toast]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (search) params.set('search', search);
      if (roleFilter) params.set('role_type', roleFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (propertyIdFilter) params.set('property_id', propertyIdFilter);
      const { data } = await api.get(`/party-role-profiles?${params.toString()}`);
      const list = (data.data || []).filter(
        (profile) => !salesRolesOnly || ['vendor', 'buyer'].includes(profile.role_type)
      );
      setRows(list);
      if (profileIdFilter) await openProfile(profileIdFilter);
    } catch { toast.error('Failed to load role onboarding'); }
    finally { setLoading(false); }
  }, [search, roleFilter, statusFilter, propertyIdFilter, profileIdFilter, salesRolesOnly, toast, openProfile]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.contact_id) return toast.error('Contact is required');
    setSaving(true);
    try {
      const { data } = await api.post('/party-role-profiles', form);
      toast.success(data.message || 'Role profile created');
      setDrawer(null);
      setForm({ contact_id: null, role_type: 'landlord', property_id: null, notes: '' });
      await load();
      await openProfile(data.data.id);
    } catch (e) { toast.error(e.response?.data?.error || 'Create failed'); }
    finally { setSaving(false); }
  };

  const columns = [
    { key: 'profile_code', header: 'Profile', render: (r) => <span className="code-chip">{r.profile_code}</span> },
    { key: 'contact', header: 'Contact', render: (r) => <div><div className="cell-strong">{r.contact?.full_name || '—'}</div><div className="cell-sub">{r.contact?.email || r.contact?.primary_phone || '—'}</div></div> },
    { key: 'role', header: 'Role', render: (r) => <Badge tone="blue">{r.role_type?.replace('_', ' ')}</Badge> },
    { key: 'source', header: 'Source', render: (r) => <Badge tone={r.source === 'website' ? 'green' : 'grey'}>{r.source === 'website' ? 'via website' : r.source === 'application' ? 'application' : 'staff'}</Badge> },
    { key: 'property', header: 'Property', render: (r) => r.property ? <div><div className="cell-strong">{r.property.title}</div><div className="cell-sub">{r.property.property_code}</div></div> : <span className="cell-sub">—</span> },
    { key: 'pipeline', header: 'Progress', render: (r) => {
      const idx = pipelineIndex(r.status);
      return (
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          {PIPELINE.map((_, i) => (
            <div key={i} style={{ width: 18, height: 6, borderRadius: 3, background: i <= idx ? (r.status === 'active' ? 'var(--success)' : 'var(--primary)') : 'var(--border)' }} />
          ))}
        </div>
      );
    } },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'next', header: 'Next Action', render: (r) => <span className="cell-sub">{r.next_action || '—'}</span> },
  ];

  return (
    <>
      <PageHead title="Role Onboarding" desc="Contacts become landlords, tenants, vendors, buyers, suppliers or third parties only after KYC, documents and a signed agreement. Signing completion activates everything automatically."
        actions={<Button icon={Plus} onClick={() => setDrawer('create')}>New Role Profile</Button>} />
      <div className="card" style={{ marginBottom: 16 }}><div className="card-pad" style={{ display: 'grid', gridTemplateColumns: '1fr 180px 180px', gap: 10 }}>
        <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search profile or next action…" />
        <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}><option value="">All roles</option>{ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}</Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</Select>
      </div></div>
      <div className="card"><DataTable columns={columns} rows={rows} loading={loading} onRowClick={(row) => openProfile(row.id)} /></div>

      {drawer === 'create' && (
        <Drawer title="New Role Profile" width={620} onClose={() => setDrawer(null)} footer={<><Button variant="ghost" onClick={() => setDrawer(null)}>Cancel</Button><Button onClick={create} disabled={saving}>{saving ? <Spinner /> : 'Create'}</Button></>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Contact" required><Combo endpoint="/contacts" labelFn={contactLabel} value={form.contact_id} onChange={(v) => setForm((s) => ({ ...s, contact_id: v }))} placeholder="Select contact…" /></Field>
            <div className="form-grid">
              <Field label="Intended Role"><Select value={form.role_type} onChange={(e) => setForm((s) => ({ ...s, role_type: e.target.value }))}>{ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}</Select></Field>
              <Field label="Related Property"><Combo endpoint="/properties" labelFn={(p) => `${p.title} · ${p.property_code}`} value={form.property_id} onChange={(v) => setForm((s) => ({ ...s, property_id: v }))} placeholder="Optional property…" /></Field>
            </div>
            <Field label="Notes"><Textarea value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} /></Field>
            <div className="cell-sub" style={{ fontSize: 12, padding: 10, background: 'var(--surface-2)', borderRadius: 6 }}>
              After creating: send the <b>registration link</b> so they complete KYC themselves, or fill their details manually — then <b>generate &amp; send the prefilled agreement</b>. The role activates automatically once fully signed.
            </div>
          </div>
        </Drawer>
      )}

      {selected && <AgreementProfileDrawer profile={selected} onClose={() => setSelected(null)} onChanged={async () => { await load(); return openProfile(selected.id); }} />}
    </>
  );
}

// ─── GUIDED DETAIL DRAWER ────────────────────────────────────────────────────
function ProfileDrawer({ profile, onClose, onChanged }) {
  const toast = useToast();
  const [terms, setTerms] = useState({});
  const [ccEmail, setCcEmail] = useState('');
  const [busy, setBusy] = useState(null);
  const [links, setLinks] = useState(null);
  const [regLink, setRegLink] = useState(null);

  const idx = pipelineIndex(profile.status);
  const termFields = TERMS_FIELDS[profile.role_type] || [];
  const isTenant = profile.role_type === 'tenant';

  const copy = (text) => { navigator.clipboard?.writeText(text); toast.success('Copied to clipboard'); };

  const sendRegistrationLink = async () => {
    setBusy('reg');
    try {
      const { data } = await api.post(`/party-role-profiles/${profile.id}/registration-link`);
      setRegLink(data.data);
      toast.success(data.message);
      onChanged();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setBusy(null); }
  };

  const sendAgreement = async () => {
    setBusy('agr');
    try {
      const body = { terms, cc_emails: ccEmail ? [ccEmail] : [] };
      const { data } = await api.post(`/party-role-profiles/${profile.id}/start-signing`, body);
      setLinks(data.links || []);
      toast.success(data.message);
      onChanged(data.data);
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setBusy(null); }
  };

  return (
    <Drawer title={`${profile.profile_code} — ${profile.role_type?.replace('_', ' ')}`} width={720} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Pipeline */}
        <div className="card" style={{ padding: 14, background: 'var(--surface-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {['Draft', 'KYC', 'Agreement', 'Signing', 'Active'].map((label, i) => (
              <React.Fragment key={label}>
                {i > 0 && <div style={{ flex: 1, height: 2, background: i <= idx ? 'var(--primary)' : 'var(--border)' }} />}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 26, height: 26, borderRadius: 13, margin: '0 auto', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800, background: i < idx ? 'var(--success)' : i === idx ? 'var(--primary)' : 'var(--border)', color: i <= idx ? '#fff' : 'var(--muted)' }}>
                    {i < idx ? <Check size={13} /> : i + 1}
                  </div>
                  <div style={{ fontSize: 10, marginTop: 3, fontWeight: 700, color: i === idx ? 'var(--primary)' : 'var(--muted)' }}>{label}</div>
                </div>
              </React.Fragment>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <StatusBadge status={profile.status} />
            {profile.next_action && <span className="cell-sub" style={{ marginLeft: 8 }}>{profile.next_action}</span>}
          </div>
        </div>

        {/* Identity */}
        <div>
          <KV k="Contact" v={profile.contact?.full_name} />
          <KV k="Email" v={profile.contact?.email || <span style={{ color: 'var(--danger)' }}>Missing — required for signing</span>} />
          <KV k="Phone" v={profile.contact?.primary_phone} />
          <KV k="Property" v={profile.property?.title || '—'} />
          <KV k="KYC / Documents" v={`${profile.kyc_status?.replace('_', ' ')} / ${profile.documents_status?.replace('_', ' ')}`} />
          {profile.envelope && <KV k="Envelope" v={`${profile.envelope.envelope_code} · ${profile.envelope.status}`} />}
        </div>

        {profile.status === 'active' ? (
          <div className="card" style={{ padding: 16, background: 'var(--success-bg)', border: '1px solid var(--success)', textAlign: 'center' }}>
            <ShieldCheck size={22} color="var(--success)" />
            <div style={{ fontWeight: 800, color: 'var(--success)', marginTop: 4 }}>Active {profile.role_type?.replace('_', ' ')}</div>
            <div className="cell-sub" style={{ fontSize: 12 }}>Agreement signed{profile.activated_at ? ` · activated ${new Date(profile.activated_at).toLocaleDateString()}` : ''}. All terms synced into the system.</div>
          </div>
        ) : (
          <>
            {/* Step 1 — registration link */}
            {!isTenant && (
              <div className="card" style={{ padding: 14 }}>
                <div className="between">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}><ClipboardList size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Step 1 · KYC &amp; documents</div>
                    <div className="cell-sub" style={{ fontSize: 12 }}>Send the self-registration link, or fill the contact's details manually.</div>
                  </div>
                  <Button size="sm" variant="ghost" icon={Link2} onClick={sendRegistrationLink} disabled={busy}>{busy === 'reg' ? <Spinner /> : 'Send Registration Link'}</Button>
                </div>
                {(regLink || profile.registration_token) && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', background: 'var(--surface-2)', padding: 8, borderRadius: 6, fontSize: 12 }}>
                    <span style={{ flex: 1, wordBreak: 'break-all' }}>{regLink?.link || `${window.location.origin}/admin/register/${profile.registration_token}`}</span>
                    <Button size="sm" variant="ghost" icon={Copy} onClick={() => copy(regLink?.link || `${window.location.origin}/admin/register/${profile.registration_token}`)}>Copy</Button>
                  </div>
                )}
                {profile.registration_submitted_at && <Badge tone="green" dot>Registration submitted {new Date(profile.registration_submitted_at).toLocaleDateString()}</Badge>}
              </div>
            )}

            {/* Step 2 — agreement terms + send */}
            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}><FileText size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Step 2 · Generate &amp; send the agreement</div>
              {isTenant ? (
                <div className="cell-sub" style={{ fontSize: 12.5 }}>
                  Tenant agreements are sent from the tenancy — open the property's <b>Active Tenants</b> tab and click <b>Send Tenancy Agreement</b>. It prefills from the application and activates the tenancy automatically when signed.
                </div>
              ) : (
                <>
                  <div className="cell-sub" style={{ fontSize: 12, marginBottom: 10 }}>The document is prefilled from the contact + property. Terms entered here appear in the agreement and <b>sync back into the system automatically when signed</b>.</div>
                  {termFields.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                      {termFields.map((f) => (
                        <Field key={f.key} label={f.label}>
                          <Input type={f.type || 'text'} value={terms[f.key] ?? ''} onChange={(e) => setTerms((s) => ({ ...s, [f.key]: e.target.value }))} placeholder={f.hint || ''} />
                        </Field>
                      ))}
                    </div>
                  )}
                  <div className="form-grid" style={{ marginTop: 8 }}>
                    <Field label="CC email (optional)"><Input value={ccEmail} onChange={(e) => setCcEmail(e.target.value)} placeholder="cc@example.com" /></Field>
                  </div>
                  <Button icon={Send} onClick={sendAgreement} disabled={busy || !profile.contact?.email} style={{ marginTop: 8 }}>
                    {busy === 'agr' ? <Spinner /> : 'Generate & Send for Signing'}
                  </Button>
                  {!profile.contact?.email && <div className="cell-sub" style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}>Add an email to this contact before sending.</div>}
                </>
              )}
              {links && links.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 12.5 }}>Signing links (also emailed):</div>
                  {links.map((l) => (
                    <div key={l.order} style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--surface-2)', padding: 6, borderRadius: 6, fontSize: 11.5, marginTop: 4 }}>
                      <Badge tone="blue">{l.order}</Badge>
                      <span style={{ flex: 1 }}>{l.name} · {l.email}</span>
                      <Button size="sm" variant="ghost" icon={Copy} onClick={() => copy(l.link)}>Copy link</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Step 3 — auto note */}
            <div className="cell-sub" style={{ fontSize: 12, padding: 10, background: 'var(--primary-50)', borderRadius: 6 }}>
              <b>Step 3 is automatic:</b> when all parties sign, the role activates, the agreement terms sync into the system (fees, bank details, prices), and the property/tenancy records update — no manual entry.
            </div>
          </>
        )}
      </div>
    </Drawer>
  );
}

const parseStoredObject = (value) => {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') return {};
    return Object.fromEntries(Object.entries(parsed).filter(([key]) => !/^\d+$/.test(key)));
  } catch { return {}; }
};

const agreementSignerRole = (role) => {
  if (['landlord', 'tenant'].includes(role)) return role;
  if (['supplier', 'third_party'].includes(role)) return 'provider';
  return 'client';
};

function AgreementProfileDrawer({ profile, onClose, onChanged }) {
  const toast = useToast();
  const [terms, setTerms] = useState({});
  const [ccEmails, setCcEmails] = useState('');
  const [signers, setSigners] = useState([]);
  const [busy, setBusy] = useState('');
  const [links, setLinks] = useState([]);
  const [regLink, setRegLink] = useState(null);
  const envelope = profile.envelope;
  const termFields = TERMS_FIELDS[profile.role_type] || [];
  const isTenant = profile.role_type === 'tenant';
  const idx = pipelineIndex(profile.status);
  const hasSigned = ['partially_signed', 'completed'].includes(envelope?.status)
    || (envelope?.signers || []).some((signer) => signer.status === 'signed' || signer.signed_at);
  const editable = !envelope || envelope.status === 'draft';
  const canReopen = envelope && !hasSigned && !['draft', 'voided'].includes(envelope.status);
  const ownerCandidates = profile.owner_candidates || [];

  useEffect(() => {
    setTerms(parseStoredObject(profile.envelope?.terms));
    let cc = profile.envelope?.cc_emails;
    if (typeof cc === 'string') {
      try { cc = JSON.parse(cc); } catch { cc = cc.split(','); }
    }
    setCcEmails(Array.isArray(cc) ? cc.join(', ') : '');
    if (profile.envelope?.signers?.length) {
      setSigners(profile.envelope.signers.slice().sort((a, b) => a.signer_order - b.signer_order));
    } else {
      const candidates = ownerCandidates.length ? ownerCandidates : [profile.contact].filter(Boolean);
      setSigners(candidates.map((contact, index) => ({
        name: contact.full_name || '', email: contact.email || '', phone: contact.primary_phone || '',
        contact_id: contact.id, role: agreementSignerRole(profile.role_type), signer_order: index + 1, status: 'pending',
      })));
    }
    setLinks([]);
  }, [profile]);

  const payload = () => ({
    terms,
    cc_emails: ccEmails.split(',').map((email) => email.trim()).filter(Boolean),
    signers: signers.map((signer, index) => ({
      name: signer.name, email: signer.email, phone: signer.phone || null,
      contact_id: signer.contact_id || null, role: signer.role, signer_order: index + 1,
    })),
  });
  const valid = () => {
    if (!signers.length) { toast.error('Add at least one signer'); return false; }
    if (signers.some((signer) => !signer.name?.trim() || !signer.email?.trim())) { toast.error('Every signer needs a name and email'); return false; }
    return true;
  };
  const updateSigner = (index, key, value) => setSigners((all) => all.map((signer, i) => i === index ? { ...signer, [key]: value } : signer));
  const copy = (value) => { navigator.clipboard?.writeText(value); toast.success('Copied to clipboard'); };

  const sendRegistration = async () => {
    setBusy('registration');
    try {
      const { data } = await api.post(`/party-role-profiles/${profile.id}/registration-link`);
      setRegLink(data.data); toast.success(data.message); await onChanged();
    } catch (error) { toast.error(error.response?.data?.error || 'Could not send registration link'); }
    finally { setBusy(''); }
  };
  const reopen = async () => {
    setBusy('reopen');
    try {
      const { data } = await api.post(`/party-role-profiles/${profile.id}/agreement/reopen`);
      toast.success(data.message); await onChanged();
    } catch (error) { toast.error(error.response?.data?.error || 'Could not edit sent agreement'); }
    finally { setBusy(''); }
  };
  const save = async () => {
    if (!valid()) return;
    setBusy('save');
    try {
      const response = envelope
        ? await api.put(`/party-role-profiles/${profile.id}/agreement/draft`, payload())
        : await api.post(`/party-role-profiles/${profile.id}/start-signing`, { ...payload(), send: false });
      toast.success(response.data.message); await onChanged();
    } catch (error) { toast.error(error.response?.data?.error || 'Could not save agreement draft'); }
    finally { setBusy(''); }
  };
  const send = async () => {
    if (!valid()) return;
    setBusy('send');
    try {
      let response;
      if (!envelope) response = await api.post(`/party-role-profiles/${profile.id}/start-signing`, { ...payload(), send: true });
      else {
        await api.put(`/party-role-profiles/${profile.id}/agreement/draft`, payload());
        response = await api.post(`/signing/envelopes/${envelope.id}/send`);
      }
      setLinks(response.data.links || []); toast.success(response.data.message); await onChanged();
    } catch (error) { toast.error(error.response?.data?.error || 'Could not send agreement'); }
    finally { setBusy(''); }
  };

  return <Drawer title={`${profile.profile_code} — ${profile.role_type?.replace('_', ' ')}`} width={780} onClose={onClose}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: 14, background: 'var(--surface-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{['Draft', 'KYC', 'Agreement', 'Signing', 'Active'].map((label, i) => <React.Fragment key={label}>{i > 0 && <div style={{ flex: 1, height: 2, background: i <= idx ? 'var(--primary)' : 'var(--border)' }} />}<div style={{ textAlign: 'center' }}><div style={{ width: 26, height: 26, borderRadius: 13, margin: '0 auto', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800, background: i < idx ? 'var(--success)' : i === idx ? 'var(--primary)' : 'var(--border)', color: i <= idx ? '#fff' : 'var(--muted)' }}>{i < idx ? <Check size={13} /> : i + 1}</div><div style={{ fontSize: 10, marginTop: 3, fontWeight: 700 }}>{label}</div></div></React.Fragment>)}</div>
        <div style={{ textAlign: 'center', marginTop: 10 }}><StatusBadge status={profile.status} /> <span className="cell-sub">{profile.next_action}</span></div>
      </div>
      <div><KV k="Contact" v={profile.contact?.full_name} /><KV k="Email" v={profile.contact?.email || 'Missing'} /><KV k="Phone" v={profile.contact?.primary_phone} /><KV k="Property" v={profile.property?.title || '—'} /><KV k="KYC / Documents" v={`${profile.kyc_status?.replace('_', ' ')} / ${profile.documents_status?.replace('_', ' ')}`} />{envelope && <KV k="Envelope" v={<span>{envelope.envelope_code} · <StatusBadge status={envelope.status} /></span>} />}</div>
      {profile.status === 'active' && <div className="card" style={{ padding: 14, background: 'var(--success-bg)', textAlign: 'center' }}><ShieldCheck size={21} color="var(--success)" /><div style={{ fontWeight: 800, color: 'var(--success)' }}>Active {profile.role_type}</div><div className="cell-sub">Signed agreement locked; terms synced.</div></div>}
      {!isTenant && profile.status !== 'active' && <div className="card" style={{ padding: 14 }}><div className="between"><div><b><ClipboardList size={14} /> KYC &amp; documents</b><div className="cell-sub">Send self-registration, or edit KYC from the client workspace.</div></div><Button size="sm" variant="ghost" icon={Link2} onClick={sendRegistration} disabled={busy}>{busy === 'registration' ? <Spinner /> : 'Send registration'}</Button></div>{(regLink || profile.registration_token) && <div style={{ marginTop: 8, display: 'flex', gap: 8 }}><span className="cell-sub" style={{ flex: 1, wordBreak: 'break-all' }}>{regLink?.link || `${window.location.origin}/admin/register/${profile.registration_token}`}</span><Button size="sm" variant="ghost" icon={Copy} onClick={() => copy(regLink?.link || `${window.location.origin}/admin/register/${profile.registration_token}`)}>Copy</Button></div>}</div>}
      {!isTenant && <RoleKycManager profile={profile} onChanged={onChanged} />}
      <div className="card" style={{ padding: 14 }}>
        <div className="between"><div><b><FileText size={14} /> Agreement details &amp; signing</b><div className="cell-sub">{hasSigned ? 'Signed records cannot be edited.' : editable ? 'Edit terms, names and emails before sending.' : 'Unsigned sent agreement can return to draft.'}</div></div>{canReopen && <Button size="sm" icon={Pencil} onClick={reopen} disabled={busy}>{busy === 'reopen' ? <Spinner /> : 'Edit sent agreement'}</Button>}</div>
        {isTenant ? <div className="cell-sub" style={{ marginTop: 10 }}>Tenant agreements are managed from the tenancy record.</div> : <>
          {hasSigned && <div style={{ marginTop: 10, padding: 10, borderRadius: 7, background: 'var(--warning-bg)', color: 'var(--warning)', fontSize: 12 }}><AlertTriangle size={14} /> At least one signer has signed. Editing is disabled.</div>}
          {ownerCandidates.length > 1 && <div style={{ marginTop: 10, padding: 10, borderRadius: 7, background: 'var(--primary-50)', fontSize: 12 }}><AlertTriangle size={14} /> <b>{ownerCandidates.length} property owners detected.</b> Confirm all owner names and emails below before sending.</div>}
          {termFields.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 9, marginTop: 12 }}>{termFields.map((field) => <Field key={field.key} label={field.label}><Input disabled={!editable} type={field.type || 'text'} value={terms[field.key] ?? ''} onChange={(event) => setTerms((current) => ({ ...current, [field.key]: event.target.value }))} /></Field>)}</div>}
          <div className="between" style={{ marginTop: 14 }}><b style={{ fontSize: 12.5 }}>Signers</b>{editable && <Button size="sm" variant="ghost" icon={UserPlus} onClick={() => setSigners((all) => [...all, { name: '', email: '', role: agreementSignerRole(profile.role_type), status: 'pending' }])}>Add signer</Button>}</div>
          {signers.map((signer, index) => <div key={signer.id || index} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1.2fr 115px 34px', gap: 7, alignItems: 'end', marginTop: 7, padding: 8, background: 'var(--surface-2)', borderRadius: 8 }}><Badge tone={signer.status === 'signed' ? 'green' : 'blue'}>{index + 1}</Badge><Field label="Name"><Input disabled={!editable} value={signer.name || ''} onChange={(event) => updateSigner(index, 'name', event.target.value)} /></Field><Field label="Email"><Input disabled={!editable} value={signer.email || ''} onChange={(event) => updateSigner(index, 'email', event.target.value)} /></Field><Field label="Role"><Select disabled={!editable} value={signer.role || 'client'} onChange={(event) => updateSigner(index, 'role', event.target.value)}><option value="client">Client / owner</option><option value="landlord">Landlord</option><option value="provider">Provider</option><option value="witness">Witness</option><option value="staff_countersign">Staff</option></Select></Field>{editable ? <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setSigners((all) => all.filter((_, i) => i !== index))} /> : <StatusBadge status={signer.status} />}</div>)}
          <div style={{ marginTop: 10 }}><Field label="CC emails (comma separated)"><Input disabled={!editable} value={ccEmails} onChange={(event) => setCcEmails(event.target.value)} placeholder="owner2@example.com, lawyer@example.com" /></Field></div>
          {editable && <div style={{ display: 'flex', gap: 8, marginTop: 12 }}><Button variant="ghost" icon={Save} onClick={save} disabled={busy}>{busy === 'save' ? <Spinner /> : envelope ? 'Save changes' : 'Save draft'}</Button><Button icon={Send} onClick={send} disabled={busy}>{busy === 'send' ? <Spinner /> : envelope ? 'Send draft for signing' : 'Generate & send'}</Button></div>}
          {links.length > 0 && <div style={{ marginTop: 12 }}><b>Signing links (also emailed)</b>{links.map((link) => <div key={`${link.order}-${link.email}`} style={{ display: 'flex', gap: 8, marginTop: 5, padding: 7, background: 'var(--surface-2)' }}><span style={{ flex: 1 }}>{link.name} · {link.email}</span><Button size="sm" variant="ghost" icon={Copy} onClick={() => copy(link.link)}>Copy</Button></div>)}</div>}
        </>}
      </div>
    </div>
  </Drawer>;
}
