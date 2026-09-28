import React from 'react';
import { Field, Input, Select } from '../../ui/kit';
import { RURAL_PROPERTY_TYPES } from '../../config/ruralPropertyTypes';

/**
 * The rural land record (CRM workbook, Owner Sheet 2). Rural properties only.
 *
 * A rural property is found by mouza, khatiyan and dag — not by a street
 * address — which is why these are columns on the property and not free text.
 */
export default function RuralLandPanel({ form, setForm }) {
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <section style={{ marginTop: 16 }}>
      <h4 style={{ margin: 0 }}>Land record</h4>
      <p className="cell-sub" style={{ marginTop: 4 }}>
        A rural property is identified by its land record, not a street address.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 10 }}>
        <Field label="District"><Input value={form.district || ''} onChange={set('district')} /></Field>
        <Field label="Upazila"><Input value={form.upazila || ''} onChange={set('upazila')} /></Field>
        <Field label="Union"><Input value={form.union_name || ''} onChange={set('union_name')} /></Field>
        <Field label="Village"><Input value={form.village || ''} onChange={set('village')} /></Field>
        <Field label="Mouza"><Input value={form.mouza || ''} onChange={set('mouza')} /></Field>
        <Field label="Khatiyan"><Input value={form.khatiyan || ''} onChange={set('khatiyan')} /></Field>
        <Field label="Dag"><Input value={form.dag || ''} onChange={set('dag')} /></Field>
        <Field label="Land area (decimal)">
          <Input type="number" step="0.001" value={form.land_area_decimal || ''} onChange={set('land_area_decimal')} />
        </Field>
        <Field label="Property type">
          <Select value={form.property_type || ''} onChange={set('property_type')}>
            <option value="">— select —</option>
            {RURAL_PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Current use">
        <Input value={form.current_use || ''} onChange={set('current_use')} placeholder="Paddy, fishery, orchard, vacant…" />
      </Field>
    </section>
  );
}
