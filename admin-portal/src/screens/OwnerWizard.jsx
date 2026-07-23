import React, { useMemo, useState } from 'react';
import { Check, ChevronRight, Trash2, Plus, UserRound, Banknote, Landmark, Link2 as LinkIcon } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Drawer, Spinner, Button, Field, Input, Select, Textarea } from '../ui/kit';
import { Combo } from '../ui/pickers';
import FileUpload from '../ui/FileUpload';

/* 3-step owner/landlord wizard. Step 1 identity (+ sole/joint), step 2 tenancy
   commercials for the management agreement, step 3 payment & fees. Saves via
   the existing POST /properties/:id/owner-profile upsert + PUT /properties/:id
   for property-homed fields. */

const DEFAULT_FEES = [
  { fee_name: 'Management Fee', fee_category: 'Management fee', fee_trigger: 'rental_receipt', amount_type: 'percentage', amount_value: 5 },
  { fee_name: 'Leasing Fee', fee_category: 'Letting fee', fee_trigger: 'first_rent', amount_type: 'percentage', amount_value: 110 },
  { fee_name: 'Lease Renewal Fee', fee_category: 'Lease renewal fee', fee_trigger: 'renewal', amount_type: 'percentage', amount_value: 55 },
  { fee_name: 'Maintenance Fee', fee_category: 'Maintenance fee', fee_trigger: 'invoice_receipt', amount_type: 'percentage', amount_value: 2 },
  { fee_name: 'Advertising Fee', fee_category: 'Advertising fee', fee_trigger: 'manual', amount_type: 'fixed', amount_value: 200 },
  { fee_name: 'Statement Fee', fee_category: 'Admin fee', fee_trigger: 'statement_period', amount_type: 'fixed', amount_value: 3 },
];

const STEPS = [
  { key: 'identity', label: 'Owner identity', icon: UserRound },
  { key: 'commercials', label: 'Tenancy & agreement terms', icon: Landmark },
  { key: 'payment', label: 'Payment & fees', icon: Banknote },
];

export default function OwnerWizard({ property, ownerProfile, fees, onClose, onSaved }) {
  const toast = useToast();
  const isCommercial = property?.category === 'commercial';
  const depositLabel = isCommercial ? 'Security money' : 'Security deposit';
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState(() => ({
    contact_id: ownerProfile?.contact_id || property?.owner_contact_id || null,
    nid_number: ownerProfile?.nid_number || '', tin_number: ownerProfile?.tin_number || '',
    nid_front_url: ownerProfile?.nid_front_url || '', nid_back_url: ownerProfile?.nid_back_url || '',
    current_address: ownerProfile?.current_address || '',
    ownership_status: ownerProfile?.ownership_status || property?.ownership_type || 'sole',
    joint_owner_name: ownerProfile?.joint_owner_name || '', joint_owner_phone: ownerProfile?.joint_owner_phone || '',
    joint_owner_email: ownerProfile?.joint_owner_email || '', joint_owner_nid: ownerProfile?.joint_owner_nid || '',
    joint_owner_address: ownerProfile?.joint_owner_address || '',
    joint_consent_collected: !!ownerProfile?.joint_consent_collected,
    // Commercials
    approved_monthly_rent: property?.approved_monthly_rent || '',
    security_money_amount: ownerProfile?.security_money_amount || '',
    advance_rent_amount: ownerProfile?.advance_rent_amount || '',
    service_charge_amount: ownerProfile?.service_charge_amount || '',
    agreement_start_date: ownerProfile?.agreement_start_date || '',
    repair_budget_max: ownerProfile?.repair_budget_max || '',
    termination_notice_days: ownerProfile?.termination_notice_days || '',
    rent_due_day: property?.rent_due_day ?? 5,
    management_commission: ownerProfile?.management_commission ?? property?.management_fee_pct ?? 5,
    lease_min_period_months: property?.lease_min_period_months ?? 6,
    // Payment
    bank_name: ownerProfile?.bank_name || '', bank_branch: ownerProfile?.bank_branch || '',
    bank_account_name: ownerProfile?.bank_account_name || '', bank_account_number: ownerProfile?.bank_account_number || '',
    bank_routing_number: ownerProfile?.bank_routing_number || '',
    bkash_number: ownerProfile?.bkash_number || '', nagad_number: ownerProfile?.nagad_number || '',
    preferred_payment: ownerProfile?.preferred_payment || 'bank_transfer',
    disbursement_frequency: ownerProfile?.disbursement_frequency || 'monthly',
    disbursement_day: ownerProfile?.disbursement_day ?? 1,
    opening_balance: ownerProfile?.opening_balance ?? 0,
    notes: ownerProfile?.notes || '',
    fees: (fees && fees.length ? fees : DEFAULT_FEES).map((x) => ({ ...x })),
  }));
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const isJoint = f.ownership_status === 'joint';
  const [reqBusy, setReqBusy] = useState(false);

  // Mirror an uploaded owner document into the property's document store so it
  // appears in the Document Verification panel.
  const fileToDoc = async (url, title, doc_type) => {
    if (!url || !property?.id) return;
    try { await api.post(`/properties/${property.id}/documents`, { title, file_url: url, doc_type, entity_type: 'owner', entity_id: f.contact_id || null }); }
    catch { /* non-fatal */ }
  };

  // Create a landlord role profile + registration link so the owner can upload
  // their KYC / property documents themselves.
  const requestDocs = async () => {
    if (!f.contact_id) { toast.error('Select the owner contact first.'); return; }
    setReqBusy(true);
    try {
      const { data: prof } = await api.post('/party-role-profiles', { contact_id: f.contact_id, role_type: 'landlord', property_id: property.id, source: 'staff' });
      const { data: link } = await api.post(`/party-role-profiles/${prof.data.id}/registration-link`, {});
      try { await navigator.clipboard.writeText(link.data.link); } catch { /* ignore */ }
      toast.success(`${link.data.emailed ? 'Emailed and copied' : 'Copied'} the document request link.`);
    } catch (e) { toast.error(e.response?.data?.error || 'Could not create the request link.'); }
    finally { setReqBusy(false); }
  };

  const save = async () => {
    if (!f.contact_id) { toast.error('Select or create the owner contact first.'); setStep(0); return; }
    setSaving(true);
    try {
      // Property-homed commercial fields.
      await api.put(`/properties/${property.id}`, {
        approved_monthly_rent: f.approved_monthly_rent || null,
        rent_due_day: f.rent_due_day || null,
        management_fee_pct: f.management_commission || null,
        lease_min_period_months: f.lease_min_period_months || null,
        ownership_type: isJoint ? 'joint' : 'sole',
      });
      // Profile-homed everything else (existing upsert endpoint + fee replace).
      const { fees: feeList, approved_monthly_rent, rent_due_day, lease_min_period_months, ...profile } = f;
      const { data } = await api.post(`/properties/${property.id}/owner-profile`, { ...profile, fees: feeList });
      toast.success(data.message || 'Owner saved.');
      onSaved?.();
      onClose?.();
    } catch (e) { toast.error(e.response?.data?.error || 'Save failed.'); }
    finally { setSaving(false); }
  };

  const setFee = (i, patch) => set('fees', f.fees.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  return (
    <Drawer title={`${ownerProfile ? 'Edit' : 'Add'} owner — ${property?.title || ''}`} width={760} onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={step === 0 ? onClose : () => setStep(step - 1)}>{step === 0 ? 'Cancel' : 'Back'}</Button>
          {step < STEPS.length - 1
            ? <Button onClick={() => setStep(step + 1)}>Continue</Button>
            : <Button onClick={save} disabled={saving}>{saving ? <Spinner /> : 'Save owner'}</Button>}
        </>
      }>
      <div className="pm-scope">
        {/* Step rail (horizontal inside drawer) */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {STEPS.map((s, i) => {
            const st = i < step ? 'done' : i === step ? 'active' : 'todo';
            return (
              <div key={s.key} onClick={() => i <= step && setStep(i)} className={`pm-wizard-step ${st}`} style={{ flex: 1, border: '1px solid var(--line,#e5e7eb)', borderRadius: 10 }}>
                <span className="num">{st === 'done' ? <Check size={13} /> : i + 1}</span>
                <span className="lbl" style={{ fontSize: 12.5 }}>{s.label}</span>
              </div>
            );
          })}
        </div>

        {step === 0 && (
          <>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div className="cell-sub" style={{ fontSize: 12.5 }}>Upload the owner's documents here, or request them via a link.</div>
              <Button size="sm" variant="ghost" icon={LinkIcon} onClick={requestDocs} disabled={!f.contact_id || reqBusy}>{reqBusy ? <Spinner /> : 'Request docs from owner'}</Button>
            </div>
            <Field label="Owner contact *">
              <Combo endpoint="/contacts" labelFn={(c) => `${c.full_name}${c.primary_phone ? ' · ' + c.primary_phone : ''}`} value={f.contact_id} onChange={(v) => set('contact_id', v)} placeholder="Search or select the owner…" />
            </Field>
            <div className="form-grid">
              <Field label="NID number"><Input value={f.nid_number} onChange={(e) => set('nid_number', e.target.value)} /></Field>
              <Field label="TIN (optional)"><Input value={f.tin_number} onChange={(e) => set('tin_number', e.target.value)} /></Field>
            </div>
            <div className="form-grid">
              <Field label="NID — front"><FileUpload value={f.nid_front_url} onChange={(u) => { set('nid_front_url', u); fileToDoc(u, 'NID front', 'nid_front'); }} compact /></Field>
              <Field label="NID — back"><FileUpload value={f.nid_back_url} onChange={(u) => { set('nid_back_url', u); fileToDoc(u, 'NID back', 'nid_back'); }} compact /></Field>
            </div>
            <Field label="Owner's current address"><Input value={f.current_address} onChange={(e) => set('current_address', e.target.value)} /></Field>

            <div className="form-section-title">Ownership</div>
            <div className="pm-seg" style={{ marginBottom: 10 }}>
              {[['sole', 'Sole owner'], ['joint', 'Joint owners']].map(([v, l]) => (
                <button key={v} className={f.ownership_status === v ? 'on' : ''} onClick={() => set('ownership_status', v)}>{l}</button>
              ))}
            </div>
            {isJoint && (
              <div className="pm-card" style={{ padding: 14, background: 'var(--surface-2,#f8fafc)' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Second owner</div>
                <div className="form-grid">
                  <Field label="Full name"><Input value={f.joint_owner_name} onChange={(e) => set('joint_owner_name', e.target.value)} /></Field>
                  <Field label="Phone"><Input value={f.joint_owner_phone} onChange={(e) => set('joint_owner_phone', e.target.value)} /></Field>
                  <Field label="Email"><Input value={f.joint_owner_email} onChange={(e) => set('joint_owner_email', e.target.value)} /></Field>
                  <Field label="NID no."><Input value={f.joint_owner_nid} onChange={(e) => set('joint_owner_nid', e.target.value)} /></Field>
                </div>
                <Field label="Address"><Input value={f.joint_owner_address} onChange={(e) => set('joint_owner_address', e.target.value)} /></Field>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={f.joint_consent_collected} onChange={(e) => set('joint_consent_collected', e.target.checked)} />
                  Written consent collected from all joint owners
                </label>
              </div>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <p className="cell-sub" style={{ marginTop: 0 }}>These terms feed the rental management agreement with the landlord.</p>
            <div className="form-grid">
              <Field label="Rent per month (৳)"><Input type="number" value={f.approved_monthly_rent} onChange={(e) => set('approved_monthly_rent', e.target.value)} /></Field>
              <Field label={`${depositLabel} (৳)`}><Input type="number" value={f.security_money_amount} onChange={(e) => set('security_money_amount', e.target.value)} /></Field>
              <Field label="Advance rent (৳)"><Input type="number" value={f.advance_rent_amount} onChange={(e) => set('advance_rent_amount', e.target.value)} /></Field>
              <Field label="Service charge (৳/month)"><Input type="number" value={f.service_charge_amount} onChange={(e) => set('service_charge_amount', e.target.value)} /></Field>
              <Field label="Agreement start date"><Input type="date" value={f.agreement_start_date || ''} onChange={(e) => set('agreement_start_date', e.target.value)} /></Field>
              <Field label="Repair budget cap (৳) — no approval needed below"><Input type="number" value={f.repair_budget_max} onChange={(e) => set('repair_budget_max', e.target.value)} /></Field>
              <Field label="Termination notice (days)"><Input type="number" value={f.termination_notice_days} onChange={(e) => set('termination_notice_days', e.target.value)} placeholder="e.g. 60" /></Field>
              <Field label="Rent due day (of month)"><Input type="number" min="1" max="28" value={f.rent_due_day} onChange={(e) => set('rent_due_day', e.target.value)} /></Field>
              <Field label="Management fee (%)"><Input type="number" value={f.management_commission} onChange={(e) => set('management_commission', e.target.value)} /></Field>
              <Field label="Minimum lease period (months)"><Input type="number" value={f.lease_min_period_months} onChange={(e) => set('lease_min_period_months', e.target.value)} /></Field>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="form-section-title" style={{ marginTop: 0 }}>Owner payment details</div>
            <div className="form-grid">
              <Field label="Bank name"><Input value={f.bank_name} onChange={(e) => set('bank_name', e.target.value)} /></Field>
              <Field label="Branch"><Input value={f.bank_branch} onChange={(e) => set('bank_branch', e.target.value)} /></Field>
              <Field label="Account name"><Input value={f.bank_account_name} onChange={(e) => set('bank_account_name', e.target.value)} /></Field>
              <Field label="Account number"><Input value={f.bank_account_number} onChange={(e) => set('bank_account_number', e.target.value)} /></Field>
              <Field label="Routing number"><Input value={f.bank_routing_number} onChange={(e) => set('bank_routing_number', e.target.value)} /></Field>
              <Field label="Preferred payment">
                <Select value={f.preferred_payment} onChange={(e) => set('preferred_payment', e.target.value)}>
                  <option value="bank_transfer">Bank transfer</option><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="cash">Cash</option><option value="cheque">Cheque</option>
                </Select>
              </Field>
              <Field label="bKash"><Input value={f.bkash_number} onChange={(e) => set('bkash_number', e.target.value)} /></Field>
              <Field label="Nagad"><Input value={f.nagad_number} onChange={(e) => set('nagad_number', e.target.value)} /></Field>
              <Field label="Disbursement frequency">
                <Select value={f.disbursement_frequency} onChange={(e) => set('disbursement_frequency', e.target.value)}>
                  <option value="weekly">Weekly</option><option value="fortnightly">Fortnightly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly (3 months)</option>
                </Select>
              </Field>
              <Field label="Disbursement day"><Input type="number" min="1" max="28" value={f.disbursement_day} onChange={(e) => set('disbursement_day', e.target.value)} /></Field>
            </div>

            <div className="form-section-title">Fee schedule</div>
            {f.fees.map((fee, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.4fr 110px 90px 34px', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <Input value={fee.fee_name} onChange={(e) => setFee(i, { fee_name: e.target.value })} />
                <Select value={fee.amount_type} onChange={(e) => setFee(i, { amount_type: e.target.value })}>
                  <option value="percentage">%</option><option value="fixed">Fixed ৳</option>
                </Select>
                <Input type="number" value={fee.amount_value} onChange={(e) => setFee(i, { amount_value: e.target.value })} />
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => set('fees', f.fees.filter((_, idx) => idx !== i))}><Trash2 size={13} /></button>
              </div>
            ))}
            <Button size="sm" variant="ghost" icon={Plus} onClick={() => set('fees', [...f.fees, { fee_name: '', fee_category: 'Admin fee', fee_trigger: 'manual', amount_type: 'fixed', amount_value: 0 }])}>Add fee</Button>
            <Field label="Notes"><Textarea rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
          </>
        )}
      </div>
    </Drawer>
  );
}
