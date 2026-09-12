// admin-portal/src/screens/sales/NewPartyKycDrawer.jsx
//
// Create a new Buyer or Vendor (Seller) directly from the Contacts hub, with
// full KYC capture. Three-step wizard:
//   1. Party & identity details  → creates Contact + Client(role) + PartyRoleProfile
//   2. KYC documents             → reuses <RoleKycManager> (upload + verify, with
//                                   automatic reuse of the contact's verified docs)
//   3. Done                      → jump straight into the Purchase / Sale Agreement
//
// role: 'buyer' | 'vendor'  (vendor === seller; KYC requirements are keyed to
// 'buyer' and 'vendor' on the backend).
import React, { useState } from 'react';
import { CheckCircle2, FileSignature, ExternalLink, ShieldCheck, User } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Drawer, Field, Input, Select, Textarea, Button, Badge } from '../../ui/kit';
import RoleKycManager from '../../components/RoleKycManager';

const BLANK = {
  full_name: '',
  company_name: '',
  contact_type: 'individual',
  primary_phone: '',
  whatsapp: '',
  email: '',
  national_id: '',
  passport_no: '',
  tin: '',
  date_of_birth: '',
  nationality: 'Bangladeshi',
  is_nrb: false,
  nrb_country: '',
  address_line1: '',
  area: '',
  city: 'Dhaka',
  district: '',
  client_segment: 'standard',
  property_id: '',
  budget: '',
  notes: '',
};

export default function NewPartyKycDrawer({ role, properties = [], onClose, onCreated, onGoToAgreement }) {
  const toast = useToast();
  const isVendor = role === 'vendor';
  const label = isVendor ? 'Vendor (Seller)' : 'Buyer';
  const accent = isVendor ? '#d97706' : '#4f46e5';

  const [step, setStep] = useState(1); // 1 details · 2 kyc · 3 done
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null); // { profile, client, contact }

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const createParty = async (e) => {
    if (e) e.preventDefault();
    if (!form.full_name.trim()) return toast.error('Full name is required');
    setSaving(true);
    try {
      // 1. Contact (master identity record)
      const { data: cRes } = await api.post('/contacts', {
        full_name: form.full_name.trim(),
        contact_type: form.contact_type,
        company_name: form.company_name.trim() || null,
        primary_phone: form.primary_phone.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        email: form.email.trim() || null,
        national_id: form.national_id.trim() || null,
        passport_no: form.passport_no.trim() || null,
        tin: form.tin.trim() || null,
        date_of_birth: form.date_of_birth || null,
        nationality: form.nationality.trim() || null,
        is_nrb: !!form.is_nrb,
        nrb_country: form.is_nrb ? (form.nrb_country.trim() || null) : null,
        address_line1: form.address_line1.trim() || null,
        area: form.area.trim() || null,
        city: form.city.trim() || 'Dhaka',
        district: form.district.trim() || null,
        notes: form.notes.trim() || null,
      });
      const contact = cRes.data;

      // 2. Client profile with the target role
      const { data: clRes } = await api.post('/clients', {
        contact_id: contact.id,
        is_buyer: !isVendor,
        is_seller: isVendor,
        client_segment: form.client_segment,
        notes: form.notes.trim() || null,
      });
      const client = clRes.data;

      // 3. Party role profile — seeds the KYC checklist and reuses any verified docs
      const { data: prRes } = await api.post('/party-role-profiles', {
        contact_id: contact.id,
        role_type: role,
        property_id: form.property_id ? Number(form.property_id) : null,
      });
      const profile = prRes.data;

      setCreated({ profile, client, contact });
      if (prRes.kyc_reused) toast.success(`${label} created — ${prRes.kyc_reused} verified KYC document(s) reused`);
      else toast.success(`${label} profile created`);
      onCreated?.();
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to create ${label.toLowerCase()}`);
    } finally {
      setSaving(false);
    }
  };

  const proceedToAgreement = () => {
    if (!created) return;
    onClose?.();
    onGoToAgreement?.(
      isVendor ? 'seller' : 'buyer',
      created.contact.id,
      created.contact.full_name,
      created.contact.primary_phone,
      created.contact.email,
      {
        client_id: created.client.id,
        nid: created.contact.national_id || created.contact.passport_no || '',
        address: created.contact.address_line1 || created.contact.area || '',
        budget: form.budget || '',
        property_id: form.property_id || '',
      },
    );
  };

  const StepDot = ({ n, text }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        width: 22, height: 22, borderRadius: 11, display: 'grid', placeItems: 'center',
        fontSize: 11, fontWeight: 800,
        background: step >= n ? accent : 'var(--surface-3, #e2e8f0)',
        color: step >= n ? '#fff' : 'var(--muted)',
      }}>{step > n ? '✓' : n}</span>
      <span style={{ fontSize: 11.5, fontWeight: step === n ? 750 : 550, color: step === n ? 'var(--ink)' : 'var(--muted)' }}>{text}</span>
    </div>
  );

  return (
    <Drawer open onClose={onClose} title={`New ${label}`} width={560}>
      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
        <StepDot n={1} text="Details & identity" />
        <span style={{ color: 'var(--line, #cbd5e1)' }}>—</span>
        <StepDot n={2} text="KYC documents" />
        <span style={{ color: 'var(--line, #cbd5e1)' }}>—</span>
        <StepDot n={3} text="Agreement" />
      </div>

      {/* ── Step 1: details ──────────────────────────────────────────── */}
      {step === 1 && (
        <form onSubmit={createParty} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--subtle, #f8fafc)', borderRadius: 8, fontSize: 12.5 }}>
            <User size={15} color={accent} />
            <span>Register a new <strong>{label}</strong> — this creates the contact, client profile and KYC checklist in one step.</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Contact Type">
              <Select value={form.contact_type} onChange={(e) => set({ contact_type: e.target.value })}>
                <option value="individual">Individual</option>
                <option value="company">Company / Enterprise</option>
              </Select>
            </Field>
            <Field label="Client Segment">
              <Select value={form.client_segment} onChange={(e) => set({ client_segment: e.target.value })}>
                <option value="standard">Standard</option>
                <option value="vip">VIP / High Net Worth</option>
                <option value="investor">Real Estate Investor</option>
                <option value="corporate">Corporate Entity</option>
              </Select>
            </Field>
          </div>

          <Field label="Full Name *" hint="Person name or authorised representative">
            <Input value={form.full_name} onChange={(e) => set({ full_name: e.target.value })} placeholder="e.g. Tanvir Hasan" required />
          </Field>

          {form.contact_type === 'company' && (
            <Field label="Company / Organization Name">
              <Input value={form.company_name} onChange={(e) => set({ company_name: e.target.value })} placeholder="e.g. Apex Holdings Ltd" />
            </Field>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Primary Phone">
              <Input value={form.primary_phone} onChange={(e) => set({ primary_phone: e.target.value })} placeholder="017xxxxxxxx" />
            </Field>
            <Field label="WhatsApp / Alt Phone">
              <Input value={form.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} placeholder="018xxxxxxxx" />
            </Field>
          </div>

          <Field label="Email Address">
            <Input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder="name@domain.com" />
          </Field>

          {/* Identity / KYC fields */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 4, color: accent, fontWeight: 750, fontSize: 12.5 }}>
            <ShieldCheck size={15} /> Identity (for KYC &amp; agreement)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="National ID (NID)">
              <Input value={form.national_id} onChange={(e) => set({ national_id: e.target.value })} placeholder="e.g. 1990123456789" />
            </Field>
            <Field label="Passport No">
              <Input value={form.passport_no} onChange={(e) => set({ passport_no: e.target.value })} placeholder="e.g. A12345678" />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Field label="TIN (optional)">
              <Input value={form.tin} onChange={(e) => set({ tin: e.target.value })} placeholder="TIN" />
            </Field>
            <Field label="Date of Birth">
              <Input type="date" value={form.date_of_birth} onChange={(e) => set({ date_of_birth: e.target.value })} />
            </Field>
            <Field label="Nationality">
              <Input value={form.nationality} onChange={(e) => set({ nationality: e.target.value })} placeholder="Bangladeshi" />
            </Field>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_nrb} onChange={(e) => set({ is_nrb: e.target.checked })} />
              Non-Resident Bangladeshi (NRB)
            </label>
            {form.is_nrb && (
              <Input value={form.nrb_country} onChange={(e) => set({ nrb_country: e.target.value })} placeholder="Country of residence" style={{ maxWidth: 220 }} />
            )}
          </div>

          {/* Address */}
          <Field label="Street / Address">
            <Input value={form.address_line1} onChange={(e) => set({ address_line1: e.target.value })} placeholder="e.g. House 12, Road 4, Sector 3" />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Field label="Area"><Input value={form.area} onChange={(e) => set({ area: e.target.value })} placeholder="Gulshan-2" /></Field>
            <Field label="City"><Input value={form.city} onChange={(e) => set({ city: e.target.value })} placeholder="Dhaka" /></Field>
            <Field label="District"><Input value={form.district} onChange={(e) => set({ district: e.target.value })} placeholder="Dhaka" /></Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label={isVendor ? 'Property to Sell (optional)' : 'Interested Property (optional)'}>
              <Select value={form.property_id} onChange={(e) => set({ property_id: e.target.value })}>
                <option value="">No property linked</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.property_code ? `${p.property_code} · ` : ''}{p.title}</option>
                ))}
              </Select>
            </Field>
            <Field label={isVendor ? 'Asking Price (৳)' : 'Budget (৳)'}>
              <Input type="number" value={form.budget} onChange={(e) => set({ budget: e.target.value })} placeholder="e.g. 15000000" />
            </Field>
          </div>

          <Field label="Notes">
            <Textarea rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Requirements, motivation, preferred terms…" />
          </Field>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="btn-primary" disabled={saving} style={{ background: accent, color: '#fff' }}>
              {saving ? 'Creating…' : 'Create & continue to KYC'}
            </Button>
          </div>
        </form>
      )}

      {/* ── Step 2: KYC documents ────────────────────────────────────── */}
      {step === 2 && created && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--subtle, #f8fafc)', borderRadius: 8, fontSize: 12.5 }}>
            <div>
              <strong>{created.contact.full_name}</strong> · <span className="code-chip">{created.client.client_code}</span>
            </div>
            <Badge tone={isVendor ? 'amber' : 'purple'}>{label}</Badge>
          </div>

          <RoleKycManager profile={created.profile} />

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 4 }}>
            <Button type="button" variant="ghost" onClick={() => setStep(3)}>Skip for now</Button>
            <Button type="button" className="btn-primary" onClick={() => setStep(3)} style={{ background: accent, color: '#fff' }}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: done → agreement ─────────────────────────────────── */}
      {step === 3 && created && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center', padding: '16px 8px' }}>
          <div style={{ width: 52, height: 52, borderRadius: 26, background: '#dcfce7', color: '#16a34a', display: 'grid', placeItems: 'center', margin: '0 auto' }}>
            <CheckCircle2 size={28} />
          </div>
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>{label} registered</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
              <strong>{created.contact.full_name}</strong> is now a residential {label.toLowerCase()} with code{' '}
              <span className="code-chip">{created.client.client_code}</span>.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            <Button className="btn-primary" onClick={proceedToAgreement}
              style={{ padding: '10px 16px', fontSize: 13, background: isVendor ? '#003768' : '#4f46e5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <FileSignature size={16} /> Sign {isVendor ? 'Sale Agreement' : 'Purchase Agreement'} Now
            </Button>
            <Button variant="ghost" onClick={onClose} style={{ color: 'var(--muted)', fontSize: 12 }}>
              Done, stay on Contacts
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
