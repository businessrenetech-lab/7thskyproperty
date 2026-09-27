import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { PageHead, Button, Field, Input, Select, Textarea, Drawer, Spinner } from '../../ui/kit';

/**
 * Rural service registers — complaints, the communication log, owner and tenant
 * feedback, and project closure with its retention date (owner Sheets 19-22,
 * tenant Sheets 21-23).
 *
 * Each tab is a register DEFINITION and its form is built from that definition's
 * own columns, so a workbook change reaches this screen without a code change.
 * Definitions are resolved by register_key, never by id — the ids were assigned
 * at seed time and differ between environments.
 */
const TABS = [
  { key: 'complaint_register', vertical: 'rural_rent', label: 'Complaints' },
  { key: 'communication_log', vertical: 'rural_rent', label: 'Communication Log' },
  { key: 'owner_feedback_register', vertical: 'rural_rent', label: 'Owner Feedback' },
  { key: 'tenant_feedback_register', vertical: 'rural_tenancy', label: 'Tenant Feedback' },
  { key: 'closure_register', vertical: 'rural_rent', label: 'Closure & Retention' },
];

// Column choices the workbook offers as a list rather than free text.
const CHOICES = {
  severity: ['Low', 'Medium', 'High', 'Critical'],
  channel: ['Phone', 'SMS', 'Email', 'WhatsApp', 'In person', 'Letter'],
  rating: ['1', '2', '3', '4', '5'],
  records_archived: ['Yes', 'No', 'Partial'],
};

const asObject = (v) => {
  if (v && typeof v === 'object') return v;
  try { return JSON.parse(v || '{}'); } catch { return {}; }
};
const asColumns = (v) => {
  const parsed = asObject(v);
  if (Array.isArray(parsed)) return parsed;
  // A JSON column can round-trip with stray numeric keys; drop anything unkeyed.
  return Object.values(parsed).filter((c) => c && c.key);
};

export default function RuralServiceRegisters() {
  const toast = useToast();
  const [tab, setTab] = useState(TABS[0].key);
  const [defs, setDefs] = useState(null);
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState(null);

  useEffect(() => {
    api.get('/registers/definitions')
      .then(({ data }) => setDefs(data.data || []))
      .catch(() => { setDefs([]); toast.error('Could not load the register definitions'); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = useMemo(() => TABS.find((t) => t.key === tab), [tab]);
  const def = useMemo(
    () => (defs || []).find((d) => d.register_key === active.key && d.vertical_key === active.vertical),
    [defs, active],
  );
  const columns = useMemo(() => (def ? asColumns(def.columns) : []), [def]);

  const load = useCallback(async () => {
    if (!def) { setRows([]); return; }
    setRows(null);
    try {
      const { data } = await api.get(`/registers/entries?register_definition_id=${def.id}&vertical_key=${def.vertical_key}`);
      setRows(data.data || []);
    } catch {
      setRows([]);
      toast.error('Could not load the register');
    }
  }, [def, toast]);
  useEffect(() => { if (defs) load(); }, [defs, load]);

  const save = async () => {
    try {
      await api.post('/registers/entries', {
        register_definition_id: def.id,
        vertical_key: def.vertical_key,
        data: form,
      });
      toast.success('Recorded');
      setForm(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Save failed');
    }
  };

  const entries = (rows || []).map((r) => ({ _id: r.id, ...asObject(r.data) }));
  const blank = () => Object.fromEntries(columns.map((c) => [c.key, '']));

  const input = (c) => {
    if (CHOICES[c.key]) {
      return (
        <Select value={form[c.key] || ''} onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}>
          <option value="">—</option>
          {CHOICES[c.key].map((v) => <option key={v} value={v}>{v}</option>)}
        </Select>
      );
    }
    if (c.type === 'textarea') {
      return <Textarea rows={3} value={form[c.key] || ''} onChange={(e) => setForm({ ...form, [c.key]: e.target.value })} />;
    }
    return (
      <Input
        type={c.type === 'date' ? 'date' : 'text'}
        value={form[c.key] || ''}
        onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
      />
    );
  };

  return (
    <div>
      <PageHead
        title="Rural · Service Registers"
        desc="Complaints, communication, owner and tenant feedback, and project closure with its record-retention date."
        actions={<Button icon={Plus} disabled={!def} onClick={() => setForm(blank())}>Add entry</Button>}
      />

      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-head between">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TABS.map((t) => (
              <Button key={t.key} size="sm" variant={t.key === tab ? 'primary' : 'ghost'} onClick={() => setTab(t.key)}>
                {t.label}
              </Button>
            ))}
          </div>
          {rows !== null && <span className="cell-sub">{entries.length} entr{entries.length === 1 ? 'y' : 'ies'}</span>}
        </div>
        <div className="card-pad">
          {defs === null || rows === null ? <Spinner /> : !def ? (
            <p className="cell-sub">
              This register is not defined yet. Seed it with <code>node scripts/seedRuralServiceRegisters.js</code> from <code>backend/</code>.
            </p>
          ) : (
            <table className="data-table" style={{ width: '100%' }}>
              <thead><tr>{columns.map((c) => <th key={c.key}>{c.label || c.key}</th>)}</tr></thead>
              <tbody>
                {entries.length === 0 && (
                  <tr><td colSpan={Math.max(columns.length, 1)} className="cell-sub">Nothing recorded yet.</td></tr>
                )}
                {entries.map((e) => (
                  <tr key={e._id}>
                    {columns.map((c, i) => (
                      <td key={c.key} className={i === 0 ? 'cell-strong' : 'cell-sub'}>{e[c.key] || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {form && def && (
        <Drawer
          open
          title={`Add to ${active.label}`}
          width={460}
          onClose={() => setForm(null)}
          footer={(
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </div>
          )}
        >
          {columns.map((c) => (
            <Field key={c.key} label={c.label || c.key} full={c.type === 'textarea'}>{input(c)}</Field>
          ))}
        </Drawer>
      )}
    </div>
  );
}
