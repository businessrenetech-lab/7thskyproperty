import React from 'react';
import { Field, Input, Select, Textarea } from '../../../ui/kit';

export const BUSINESS_TYPE_OPTIONS = [
  ['retail', 'Retail'], ['restaurant', 'Restaurant / Café'], ['hospitality', 'Hospitality'], ['manufacturing', 'Manufacturing'],
  ['service', 'Service'], ['trading', 'Trading'], ['industrial', 'Industrial'], ['franchise', 'Franchise'], ['online', 'Online'], ['other', 'Other'],
];

export const EMPTY_BUSINESS_PROFILE = {
  business_type: '', industry: '', ownership_structure: '', company_registration_no: '', trade_licence_no: '', tin_bin: '',
  year_established: '', staff_count: '', lease_status: '', lease_details: '', reason_for_sale: '',
  annual_turnover: '', annual_profit: '', monthly_revenue: '', included_assets: '', stock_info: '', employee_info: '', ip_details: '',
  teaser_headline: '', teaser_summary: '',
};

/** Business Sale SOP Step 1 — the business profile, plus the website teaser copy. */
export default function BusinessProfileStep({ value, onChange }) {
  const v = value || EMPTY_BUSINESS_PROFILE;
  const set = (k) => (e) => onChange({ ...v, [k]: e.target.value });
  return (
    <div className="pm-card" style={{ padding: 22 }}>
      <h3 style={{ marginTop: 0 }}>Business profile</h3>
      <p className="cell-sub" style={{ marginTop: -6 }}>
        The property title above is the real business name and stays internal. The website shows only the teaser below.
      </p>
      <div className="form-grid">
        <Field label="Business type *">
          <Select value={v.business_type} onChange={set('business_type')}>
            <option value="">— Select —</option>
            {BUSINESS_TYPE_OPTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Industry"><Input value={v.industry} onChange={set('industry')} placeholder="e.g. Electronics import" /></Field>
        <Field label="Ownership structure">
          <Select value={v.ownership_structure} onChange={set('ownership_structure')}>
            <option value="">—</option>
            <option value="sole_proprietor">Sole proprietor</option>
            <option value="partnership">Partnership</option>
            <option value="private_limited">Private limited</option>
            <option value="public_limited">Public limited</option>
            <option value="other">Other</option>
          </Select>
        </Field>
        <Field label="Year established"><Input type="number" value={v.year_established} onChange={set('year_established')} /></Field>
        <Field label="Staff count"><Input type="number" value={v.staff_count} onChange={set('staff_count')} /></Field>
        <Field label="Company registration no."><Input value={v.company_registration_no} onChange={set('company_registration_no')} /></Field>
        <Field label="Trade licence no."><Input value={v.trade_licence_no} onChange={set('trade_licence_no')} /></Field>
        <Field label="TIN / BIN"><Input value={v.tin_bin} onChange={set('tin_bin')} /></Field>
        <Field label="Annual turnover (৳)"><Input type="number" value={v.annual_turnover} onChange={set('annual_turnover')} /></Field>
        <Field label="Annual profit (৳)"><Input type="number" value={v.annual_profit} onChange={set('annual_profit')} /></Field>
        <Field label="Monthly revenue (৳)"><Input type="number" value={v.monthly_revenue} onChange={set('monthly_revenue')} /></Field>
        <Field label="Premises">
          <Select value={v.lease_status} onChange={set('lease_status')}>
            <option value="">—</option>
            <option value="owned">Owned</option>
            <option value="leased">Leased</option>
            <option value="na">Not applicable (online)</option>
          </Select>
        </Field>
      </div>
      <Field label="Lease details"><Textarea rows={2} value={v.lease_details} onChange={set('lease_details')} /></Field>
      <Field label="Reason for sale"><Textarea rows={2} value={v.reason_for_sale} onChange={set('reason_for_sale')} /></Field>
      <Field label="Included assets"><Textarea rows={2} value={v.included_assets} onChange={set('included_assets')} /></Field>
      <Field label="Stock"><Textarea rows={2} value={v.stock_info} onChange={set('stock_info')} /></Field>
      <Field label="Employees"><Textarea rows={2} value={v.employee_info} onChange={set('employee_info')} /></Field>
      <Field label="Intellectual property"><Textarea rows={2} value={v.ip_details} onChange={set('ip_details')} /></Field>
      <h4 style={{ margin: '18px 0 6px' }}>Website teaser (public)</h4>
      <Field label="Teaser headline"><Input value={v.teaser_headline} onChange={set('teaser_headline')} placeholder="e.g. Profitable electronics importer, Banani" /></Field>
      <Field label="Teaser summary"><Textarea rows={3} value={v.teaser_summary} onChange={set('teaser_summary')} placeholder="No name, address or exact figures — buyers get those after signing the NDA." /></Field>
    </div>
  );
}
