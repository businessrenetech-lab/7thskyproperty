import React, { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '../../services/api';
import { usePmScope } from '../../config/pmScope';
import { useToast } from '../../context/ToastContext';
import { PageHead, Button, Field, Input, Select, Drawer, Spinner, Badge } from '../../ui/kit';

/**
 * Rural ownership verification — deed, khatiyan, dag, mutation, tax receipts,
 * succession records, utility bills, court clearance and POA (rental SOP §6
 * Step 3, sale SOP §6 Step 3).
 *
 * This reads and writes the `ownership_verification` register, which exists on
 * BOTH rural_rent (the client's CRM workbook defined it, #151, with entries) and
 * rural_sale (seeded with the sale build). The definition is resolved by
 * register_key + vertical, never by id: the two verticals have different ids and
 * a hard-coded 151 would have shown the RENT register inside the sale console.
 *
 * The form is built from the register's OWN columns, so a workbook change does
 * not silently drop a field here.
 */
const REGISTER_KEY = 'ownership_verification';

// SOP §6 Step 3 — the nine documents, offered as a picker rather than typed.
const DOCUMENTS = ['Title Deed', 'Khatiyan', 'Dag', 'Mutation', 'Tax Receipt',
  'Succession Records', 'Utility Bills', 'Court Clearance', 'POA Verification'];

const asObject = (v) => {
  if (v && typeof v === 'object') return v;
  try { return JSON.parse(v || '{}'); } catch { return {}; }
};
const VERIFIED_TONE = (v) => (/^(yes|verified|true)$/i.test(String(v || '')) ? 'green' : 'grey');

export default function RuralOwnershipVerification({ vertical = 'rural_rent' }) {
  const scope = usePmScope();
  const toast = useToast();
  const [properties, setProperties] = useState([]);
  const [propertyId, setPropertyId] = useState('');
  const [definition, setDefinition] = useState(undefined); // undefined = loading, null = missing
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState(null);

  // The rural rental book, scoped by the console.
  useEffect(() => {
    api.get(`/properties?category=${scope.category}&listing_type=${scope.listingType || 'rent'}&limit=200`)
      .then(({ data }) => {
        const list = data.data || [];
        setProperties(list);
        if (list.length && !propertyId) setPropertyId(String(list[0].id));
      })
      .catch(() => toast.error('Could not load rural properties'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.category, scope.listingType]);

  // The register's own columns drive the form. Resolved by key + vertical.
  useEffect(() => {
    api.get(`/registers/definitions?vertical_key=${vertical}`)
      .then(({ data }) => {
        const def = (data.data || []).find((d) => d.register_key === REGISTER_KEY);
        setDefinition(def || null);
        setColumns(def ? asObject(def.columns) || [] : []);
      })
      .catch(() => { setDefinition(null); setColumns([]); });
  }, [vertical]);

  const load = useCallback(async () => {
    if (!propertyId || !definition) { setRows(definition === null ? [] : null); return; }
    setRows(null);
    try {
      const { data } = await api.get(`/registers/entries?register_definition_id=${definition.id}&vertical_key=${vertical}&property_id=${propertyId}`);
      setRows(data.data || []);
    } catch {
      setRows([]);
      toast.error('Could not load the ownership register');
    }
  }, [propertyId, definition, vertical, toast]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try {
      await api.post('/registers/entries', {
        register_definition_id: definition.id,
        vertical_key: vertical,
        property_id: Number(propertyId),
        data: form,
      });
      toast.success('Document recorded');
      setForm(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Save failed');
    }
  };

  const entries = (rows || []).map((r) => ({ id: r.id, ...asObject(r.data) }));
  const verified = entries.filter((e) => VERIFIED_TONE(e.verified) === 'green').length;
  const outstanding = DOCUMENTS.filter((d) => !entries.some((e) => String(e.document || '') === d));

  return (
    <div>
      <PageHead
        title={`${scope.label} · Ownership Verification`}
        desc="Deed, khatiyan, dag, mutation, tax receipts, succession, utilities, court clearance and POA — SOP §6 Step 3."
      />

      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-head between">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} style={{ minWidth: 280 }}>
              {properties.length === 0 && <option value="">No rural {scope.listingType} property yet</option>}
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.property_code} — {p.title}{p.mouza ? ` · ${p.mouza}` : ''}
                </option>
              ))}
            </Select>
            {rows !== null && (
              <span className="cell-sub">
                {verified} verified · {entries.length} recorded · {outstanding.length} of {DOCUMENTS.length} outstanding
              </span>
            )}
          </div>
          <Button icon={Plus} disabled={!propertyId} onClick={() => setForm({ document: outstanding[0] || DOCUMENTS[0], required: 'Yes', received: '', verified: '', verification_method: '', remarks: '' })}>
            Record document
          </Button>
        </div>
        <div className="card-pad">
          {definition === null ? (
            <p className="cell-sub">
              The ownership register is not defined for <code>{vertical}</code> yet.
            </p>
          ) : rows === null ? <Spinner /> : (
            <>
              <table className="data-table" style={{ width: '100%' }}>
                <thead><tr><th>Document</th><th>Required</th><th>Received</th><th>Verified</th><th>Method</th><th>Remarks</th></tr></thead>
                <tbody>
                  {entries.length === 0 && (
                    <tr><td colSpan={6} className="cell-sub">Nothing recorded against this property yet.</td></tr>
                  )}
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td className="cell-strong">{e.document || '—'}</td>
                      <td className="cell-sub">{e.required || '—'}</td>
                      <td className="cell-sub">{e.received || '—'}</td>
                      <td><Badge tone={VERIFIED_TONE(e.verified)}>{e.verified || 'not verified'}</Badge></td>
                      <td className="cell-sub">{e.verification_method || '—'}</td>
                      <td className="cell-sub">{e.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {outstanding.length > 0 && (
                <p className="cell-sub" style={{ marginTop: 10 }}>
                  Still outstanding: {outstanding.join(', ')}.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {form && (
        <Drawer
          open
          title="Record an ownership document"
          width={460}
          onClose={() => setForm(null)}
          footer={(
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </div>
          )}
        >
          <Field label="Document">
            <Select value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })}>
              {DOCUMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
          </Field>
          {/* Every remaining field comes from the register's own columns. */}
          {columns.filter((c) => c.key !== 'document').map((c) => (
            <Field key={c.key} label={c.label || c.key}>
              <Input
                value={form[c.key] || ''}
                onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
                placeholder={c.key === 'verified' ? 'Yes / pending' : ''}
              />
            </Field>
          ))}
        </Drawer>
      )}
    </div>
  );
}
