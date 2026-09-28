import React from 'react';
import { Field, Input, Select, Textarea, Badge } from '../../ui/kit';

/**
 * Rural tenant screening — SOP Rural Property Rental Management §10 Step 11 and
 * CRM Owner Sheet 8. Rendered only in the Rural Rent console: a farmer is
 * screened on farming experience and financial capacity, not on a trade licence.
 */
const TONE = { suitable: 'green', conditional: 'amber', declined: 'red', pending: 'grey' };

const REQUIRED = ['nid_verified', 'business_verification', 'farming_experience', 'financial_capacity',
  'references_verified', 'background_check', 'intended_use'];

export default function RuralScreeningPanel({ form, setForm }) {
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const missing = REQUIRED.filter((k) => !String(form[k] || '').trim());

  return (
    <section style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h4 style={{ margin: 0 }}>Rural tenant screening</h4>
        <Badge tone={TONE[form.screening_verdict] || 'grey'}>{form.screening_verdict || 'pending'}</Badge>
      </div>
      {missing.length > 0 && (
        <p className="cell-sub" style={{ marginTop: 4 }}>
          {missing.length} screening field{missing.length === 1 ? '' : 's'} still outstanding.
        </p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
        <Field label="NID verification">
          <Input value={form.nid_verified || ''} onChange={set('nid_verified')} placeholder="Verified / pending" />
        </Field>
        <Field label="Background check">
          <Input value={form.background_check || ''} onChange={set('background_check')} placeholder="Clear / flagged" />
        </Field>
        <Field label="Screening verdict">
          <Select value={form.screening_verdict || 'pending'} onChange={set('screening_verdict')}>
            <option value="pending">Pending</option>
            <option value="suitable">Suitable</option>
            <option value="conditional">Conditional</option>
            <option value="declined">Declined</option>
          </Select>
        </Field>
      </div>
      <Field label="Farming experience">
        <Textarea rows={2} value={form.farming_experience || ''} onChange={set('farming_experience')} placeholder="Years farming, crops, prior land held…" />
      </Field>
      <Field label="Business verification">
        <Textarea rows={2} value={form.business_verification || ''} onChange={set('business_verification')} />
      </Field>
      <Field label="Financial capacity">
        <Textarea rows={2} value={form.financial_capacity || ''} onChange={set('financial_capacity')} />
      </Field>
      <Field label="References">
        <Textarea rows={2} value={form.references_verified || ''} onChange={set('references_verified')} />
      </Field>
      <Field label="Intended use">
        <Textarea rows={2} value={form.intended_use || ''} onChange={set('intended_use')} placeholder="Paddy, fishery, orchard, poultry…" />
      </Field>
      <Field label="Screening notes">
        <Textarea rows={2} value={form.screening_notes || ''} onChange={set('screening_notes')} />
      </Field>
    </section>
  );
}
