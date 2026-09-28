import React from 'react';
import { Field, Input, Select, Textarea, Badge } from '../../ui/kit';

/**
 * Business tenant screening — SOP Business Rental Management §11 / Business
 * Tenancy Management §6. Rendered only for the Business Rent console: a
 * residential applicant has no trade licence to give.
 */
const TONE = { suitable: 'green', conditional: 'amber', declined: 'red', pending: 'grey' };

const REQUIRED = ['business_type', 'intended_activity', 'trade_licence_no', 'corporate_profile',
  'financial_capability', 'operational_suitability', 'previous_leasing_history'];

export default function BusinessScreeningPanel({ form, setForm }) {
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const missing = REQUIRED.filter((k) => !String(form[k] || '').trim());

  return (
    <section style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h4 style={{ margin: 0 }}>Business tenant screening</h4>
        <Badge tone={TONE[form.screening_verdict] || 'grey'}>{form.screening_verdict || 'pending'}</Badge>
      </div>
      {missing.length > 0 && (
        <p className="cell-sub" style={{ marginTop: 4 }}>
          {missing.length} screening field{missing.length === 1 ? '' : 's'} still outstanding.
        </p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
        <Field label="Business name"><Input value={form.business_name || ''} onChange={set('business_name')} /></Field>
        <Field label="Business type"><Input value={form.business_type || ''} onChange={set('business_type')} placeholder="Retail, restaurant, warehouse…" /></Field>
        <Field label="Trade licence no."><Input value={form.trade_licence_no || ''} onChange={set('trade_licence_no')} /></Field>
        <Field label="Trade licence expiry"><Input type="date" value={form.trade_licence_expiry || ''} onChange={set('trade_licence_expiry')} /></Field>
        <Field label="Screening verdict">
          <Select value={form.screening_verdict || 'pending'} onChange={set('screening_verdict')}>
            <option value="pending">Pending</option>
            <option value="suitable">Suitable</option>
            <option value="conditional">Conditional</option>
            <option value="declined">Declined</option>
          </Select>
        </Field>
      </div>
      <Field label="Intended commercial activity"><Textarea rows={2} value={form.intended_activity || ''} onChange={set('intended_activity')} /></Field>
      <Field label="Corporate profile"><Textarea rows={2} value={form.corporate_profile || ''} onChange={set('corporate_profile')} /></Field>
      <Field label="Financial capability"><Textarea rows={2} value={form.financial_capability || ''} onChange={set('financial_capability')} /></Field>
      <Field label="Operational suitability"><Textarea rows={2} value={form.operational_suitability || ''} onChange={set('operational_suitability')} /></Field>
      <Field label="Previous leasing history"><Textarea rows={2} value={form.previous_leasing_history || ''} onChange={set('previous_leasing_history')} /></Field>
      <Field label="Screening notes"><Textarea rows={2} value={form.screening_notes || ''} onChange={set('screening_notes')} /></Field>
    </section>
  );
}
