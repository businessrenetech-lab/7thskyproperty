import React from 'react';
import { Field, Input, Textarea, Select } from '../../ui/kit';

export const BUSINESS_STAGES = [
  ['lead_intake', 'Lead Intake'], ['consultation', 'Consultation'], ['assessment', 'Assessment'],
  ['documentation', 'Documentation'], ['preparation', 'Preparation'], ['marketing', 'Marketing'],
  ['lead_mgmt', 'Lead Management'], ['inspection', 'Inspection'], ['negotiation', 'Negotiation'],
  ['due_diligence', 'Due Diligence'], ['agreement', 'Agreement'], ['settlement', 'Settlement'],
  ['financial', 'Financial'], ['closure', 'Closure'],
];
export const STAGE_LABEL = Object.fromEntries(BUSINESS_STAGES);
export const BUSINESS_TYPES = ['retail', 'restaurant', 'hospitality', 'manufacturing', 'service', 'trading', 'industrial', 'franchise', 'online', 'other'];
export const STATUSES = ['active', 'under_offer', 'sold', 'withdrawn', 'on_hold'];
export const EMPTY_LISTING = { business_name: '', business_type: 'retail', industry: '', area: '', city: 'Dhaka', ownership_structure: '', company_registration_no: '', trade_licence_no: '', tin_bin: '', year_established: '', staff_count: '', lease_status: 'leased', lease_details: '', reason_for_sale: '', indicative_price: '', annual_turnover: '', annual_profit: '', included_assets: '', description: '', stage: 'lead_intake', status: 'active', special_requirements: '' };

/** The Business Listing profile fields grid — shared by the list drawer and the detail edit. */
export default function BusinessListingForm({ form, set }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Field label="Business name" required full><Input value={form.business_name} onChange={(e) => set('business_name', e.target.value)} placeholder="e.g. Dhaka Delights Restaurant" /></Field>
      <Field label="Business type"><Select value={form.business_type} onChange={(e) => set('business_type', e.target.value)}>{BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></Field>
      <Field label="Industry"><Input value={form.industry} onChange={(e) => set('industry', e.target.value)} placeholder="e.g. Food & Beverage" /></Field>
      <Field label="Area"><Input value={form.area} onChange={(e) => set('area', e.target.value)} /></Field>
      <Field label="City"><Input value={form.city} onChange={(e) => set('city', e.target.value)} /></Field>
      <Field label="Ownership structure"><Input value={form.ownership_structure} onChange={(e) => set('ownership_structure', e.target.value)} placeholder="Private Limited / Partnership…" /></Field>
      <Field label="Trade licence no."><Input value={form.trade_licence_no} onChange={(e) => set('trade_licence_no', e.target.value)} /></Field>
      <Field label="Company reg. no."><Input value={form.company_registration_no} onChange={(e) => set('company_registration_no', e.target.value)} /></Field>
      <Field label="TIN / BIN"><Input value={form.tin_bin} onChange={(e) => set('tin_bin', e.target.value)} /></Field>
      <Field label="Year established"><Input type="number" value={form.year_established} onChange={(e) => set('year_established', e.target.value)} /></Field>
      <Field label="Staff count"><Input type="number" value={form.staff_count} onChange={(e) => set('staff_count', e.target.value)} /></Field>
      <Field label="Lease status"><Select value={form.lease_status} onChange={(e) => set('lease_status', e.target.value)}><option value="leased">Leased</option><option value="owned">Owned</option><option value="na">N/A</option></Select></Field>
      <Field label="Indicative sale price (৳)"><Input type="number" value={form.indicative_price} onChange={(e) => set('indicative_price', e.target.value)} /></Field>
      <Field label="Annual turnover (৳)"><Input type="number" value={form.annual_turnover} onChange={(e) => set('annual_turnover', e.target.value)} /></Field>
      <Field label="Annual profit (৳)"><Input type="number" value={form.annual_profit} onChange={(e) => set('annual_profit', e.target.value)} /></Field>
      <Field label="SOP stage"><Select value={form.stage} onChange={(e) => set('stage', e.target.value)}>{BUSINESS_STAGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
      <Field label="Status"><Select value={form.status} onChange={(e) => set('status', e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
      <Field label="Reason for sale" full><Textarea rows={2} value={form.reason_for_sale} onChange={(e) => set('reason_for_sale', e.target.value)} /></Field>
      <Field label="Included assets / stock" full><Textarea rows={2} value={form.included_assets} onChange={(e) => set('included_assets', e.target.value)} /></Field>
      <Field label="Description / highlights" full><Textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} /></Field>
      <Field label="Special requirements" full><Textarea rows={2} value={form.special_requirements} onChange={(e) => set('special_requirements', e.target.value)} /></Field>
    </div>
  );
}
