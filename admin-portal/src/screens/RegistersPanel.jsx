import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Table2 } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Field, Input, Select, Textarea, Button, Spinner, DataTable, EmptyState } from '../ui/kit';

// Renders the registers for a project's vertical and supports dynamic data entry.
export default function RegistersPanel({ project }) {
  const toast = useToast();
  const [defs, setDefs] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [form, setForm] = useState({});
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const active = (defs || []).find((d) => d.id === activeId);

  useEffect(() => {
    if (!project?.vertical_key) { setDefs([]); return; }
    api.get(`/registers/definitions?vertical_key=${project.vertical_key}`)
      .then(({ data }) => { setDefs(data.data || []); if (data.data?.[0]) setActiveId(data.data[0].id); })
      .catch(() => setDefs([]));
  }, [project?.vertical_key]);

  const loadEntries = useCallback(async () => {
    if (!activeId) return;
    setLoadingEntries(true);
    try { const { data } = await api.get(`/registers/entries?register_definition_id=${activeId}&project_id=${project.id}`); setEntries(data.data || []); }
    catch { toast.error('Failed to load entries'); } finally { setLoadingEntries(false); }
  }, [activeId, project.id, toast]);
  useEffect(() => { loadEntries(); }, [loadEntries]);

  const save = async () => {
    setSaving(true);
    try {
      await api.post('/registers/entries', { register_definition_id: activeId, project_id: project.id, vertical_key: project.vertical_key, data: form, status: form.status || null });
      toast.success('Entry added'); setForm({}); setAdding(false); loadEntries();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); } finally { setSaving(false); }
  };
  const remove = async (id) => { try { await api.delete(`/registers/entries/${id}`); loadEntries(); } catch { toast.error('Failed'); } };

  if (defs == null) return <Spinner />;
  if (!defs.length) return <EmptyState icon={Table2} title="No registers" sub="This vertical has no register definitions." />;

  const cols = active?.columns || [];
  const tableCols = [
    ...cols.slice(0, 4).map((c) => ({ key: c.key, header: c.label, render: (r) => String(r.data?.[c.key] ?? '—') })),
    { key: '_x', header: '', render: (r) => <button className="btn btn-danger btn-icon" onClick={(e) => { e.stopPropagation(); remove(r.id); }}><Trash2 size={13} /></button> },
  ];

  return (
    <div>
      {/* Register selector */}
      <div className="wrap-gap" style={{ marginBottom: 12 }}>
        {defs.map((d) => (
          <button key={d.id} className={`btn btn-sm ${d.id === activeId ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setActiveId(d.id); setAdding(false); }}>{d.name}</button>
        ))}
      </div>

      <div className="between" style={{ marginBottom: 8 }}>
        <b style={{ fontSize: 14 }}>{active?.name}</b>
        <Button size="sm" icon={Plus} onClick={() => setAdding((a) => !a)}>{adding ? 'Close' : 'Add entry'}</Button>
      </div>

      {adding && (
        <div className="card card-pad" style={{ marginBottom: 12, background: 'var(--surface-2)' }}>
          <div className="form-grid">
            {cols.map((c) => (
              <Field key={c.key} label={c.label} full={c.type === 'textarea'}>
                {c.type === 'textarea' ? <Textarea value={form[c.key] || ''} onChange={(e) => setForm({ ...form, [c.key]: e.target.value })} />
                  : c.type === 'date' ? <Input type="date" value={form[c.key] || ''} onChange={(e) => setForm({ ...form, [c.key]: e.target.value })} />
                  : c.type === 'select' && c.options ? <Select value={form[c.key] || ''} onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}><option value="">—</option>{c.options.map((o) => <option key={o}>{o}</option>)}</Select>
                  : <Input value={form[c.key] || ''} onChange={(e) => setForm({ ...form, [c.key]: e.target.value })} />}
              </Field>
            ))}
          </div>
          <Button onClick={save} disabled={saving}>{saving ? <Spinner /> : 'Save entry'}</Button>
        </div>
      )}

      <DataTable columns={tableCols} rows={entries} loading={loadingEntries} empty={<EmptyState icon={Table2} title="No entries yet" sub={`Add the first ${active?.name} record for this project.`} />} />
    </div>
  );
}
