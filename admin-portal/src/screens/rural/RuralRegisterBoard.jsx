import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { PageHead, Button, Field, Input, Select, Textarea, Drawer, Spinner, Badge } from '../../ui/kit';

/**
 * A tabbed board over a set of register definitions, built from each definition's
 * OWN columns.
 *
 * Extracted from RuralServiceRegisters so the buyer's search/shortlist and due
 * diligence screens do not each re-implement the same table, form and JSON
 * defensiveness. Definitions are resolved by register_key + vertical, never by id.
 */
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

const TONE = {
  Shortlisted: 'green', Presented: 'blue', Rejected: 'red', Pending: 'amber',
  Completed: 'green', Yes: 'green', No: 'grey', Partial: 'amber',
  Approved: 'green', Declined: 'red', Submitted: 'blue',
};

export default function RuralRegisterBoard({
  title, desc, tabs, choices = {}, badgeKeys = [], emptyHint,
}) {
  const toast = useToast();
  const [tab, setTab] = useState(tabs[0].key);
  const [defs, setDefs] = useState(null);
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState(null);

  // One call per vertical the tabs need, then everything is resolved locally.
  const verticals = useMemo(() => [...new Set(tabs.map((t) => t.vertical))], [tabs]);

  useEffect(() => {
    Promise.all(verticals.map((v) => api.get(`/registers/definitions?vertical_key=${v}`)
      .then(({ data }) => (data.data || []).map((d) => ({ ...d, vertical_key: d.vertical_key || v })))
      .catch(() => [])))
      .then((lists) => setDefs(lists.flat()))
      .catch(() => { setDefs([]); toast.error('Could not load the register definitions'); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verticals.join(',')]);

  const active = useMemo(() => tabs.find((t) => t.key === tab) || tabs[0], [tabs, tab]);
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
        register_definition_id: def.id, vertical_key: def.vertical_key, data: form,
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
    if (choices[c.key]) {
      return (
        <Select value={form[c.key] || ''} onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}>
          <option value="">—</option>
          {choices[c.key].map((v) => <option key={v} value={v}>{v}</option>)}
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

  const cell = (e, c, i) => {
    const v = e[c.key];
    if (v && badgeKeys.includes(c.key)) return <Badge tone={TONE[v] || 'grey'}>{v}</Badge>;
    return <span className={i === 0 ? 'cell-strong' : 'cell-sub'}>{v || '—'}</span>;
  };

  return (
    <div>
      <PageHead
        title={title}
        desc={desc}
        actions={<Button icon={Plus} disabled={!def} onClick={() => setForm(blank())}>Add entry</Button>}
      />

      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-head between">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {tabs.map((t) => (
              <Button key={t.key} size="sm" variant={t.key === tab ? 'primary' : 'ghost'} onClick={() => setTab(t.key)}>
                {t.label}
              </Button>
            ))}
          </div>
          {rows !== null && <span className="cell-sub">{entries.length} entr{entries.length === 1 ? 'y' : 'ies'}</span>}
        </div>
        <div className="card-pad">
          {defs === null || rows === null ? <Spinner /> : !def ? (
            <p className="cell-sub">{emptyHint || 'This register is not defined yet.'}</p>
          ) : (
            <table className="data-table" style={{ width: '100%' }}>
              <thead><tr>{columns.map((c) => <th key={c.key}>{c.label || c.key}</th>)}</tr></thead>
              <tbody>
                {entries.length === 0 && (
                  <tr><td colSpan={Math.max(columns.length, 1)} className="cell-sub">Nothing recorded yet.</td></tr>
                )}
                {entries.map((e) => (
                  <tr key={e._id}>
                    {columns.map((c, i) => <td key={c.key}>{cell(e, c, i)}</td>)}
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
