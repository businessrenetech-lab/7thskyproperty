import React, { useCallback, useEffect, useState } from 'react';
import { Plus, ClipboardCheck } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Button, DataTable, StatusBadge, Badge, Drawer, Field, Input, Select, Textarea, KV, Spinner } from '../ui/kit';
import { Combo } from '../ui/pickers';

const TYPES = ['site_assessment', 'entry', 'routine', 'exit', 'other'];
const condTone = { good: 'green', fair: 'blue', poor: 'amber', damaged: 'red', na: 'grey' };

export default function Inspections() {
  const toast = useToast();
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [type, setType] = useState('');
  const [drawer, setDrawer] = useState(null); const [form, setForm] = useState({}); const [sel, setSel] = useState(null); const [detail, setDetail] = useState(null);
  const [item, setItem] = useState({ area: '', item: '', condition: 'good', notes: '' }); const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const p = new URLSearchParams({ limit: 50 }); if (type) p.set('type', type); const { data } = await api.get(`/inspections?${p}`); setRows(data.data || []); }
    catch { toast.error('Failed to load inspections'); } finally { setLoading(false); }
  }, [type, toast]);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm({ inspection_type: 'routine', property_id: null, scheduled_date: '', summary: '', status: 'scheduled' }); setDrawer('create'); };
  const create = async () => {
    setSaving(true);
    try { await api.post('/inspections', form); toast.success('Inspection created'); setDrawer(null); load(); }
    catch (e) { toast.error(e.response?.data?.error || 'Create failed'); } finally { setSaving(false); }
  };
  const openView = async (r) => { setSel(r); setDrawer('view'); setDetail(null); try { const { data } = await api.get(`/inspections/${r.id}`); setDetail(data.data); } catch { toast.error('Load failed'); } };
  const addItem = async () => { if (!item.item) return toast.error('Item required'); try { await api.post(`/inspections/${sel.id}/items`, item); setItem({ area: '', item: '', condition: 'good', notes: '' }); const { data } = await api.get(`/inspections/${sel.id}`); setDetail(data.data); } catch { toast.error('Failed'); } };

  const columns = [
    { key: 'inspection_code', header: 'Code', render: (r) => <span className="code-chip">{r.inspection_code}</span> },
    { key: 'type', header: 'Type', render: (r) => <Badge tone="blue">{r.inspection_type?.replace('_', ' ')}</Badge> },
    { key: 'property', header: 'Property', render: (r) => r.property?.title || '—' },
    { key: 'scheduled', header: 'Scheduled', render: (r) => r.scheduled_date ? new Date(r.scheduled_date).toLocaleDateString() : '—' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <>
      <PageHead title="Inspections" desc="Site assessment, entry, routine and exit inspections." actions={<Button icon={Plus} onClick={openCreate}>New Inspection</Button>} />
      <div className="tabs">
        <div className={`tab ${type === '' ? 'active' : ''}`} onClick={() => setType('')}>All</div>
        {TYPES.map((t) => <div key={t} className={`tab ${type === t ? 'active' : ''}`} onClick={() => setType(t)} style={{ textTransform: 'capitalize' }}>{t.replace('_', ' ')}</div>)}
      </div>
      <div className="card"><DataTable columns={columns} rows={rows} loading={loading} onRowClick={openView} /></div>

      {drawer === 'create' && (
        <Drawer title="New Inspection" onClose={() => setDrawer(null)} footer={<><Button variant="ghost" onClick={() => setDrawer(null)}>Cancel</Button><Button onClick={create} disabled={saving}>{saving ? <Spinner /> : 'Create'}</Button></>}>
          <Field label="Type"><Select value={form.inspection_type} onChange={(e) => setForm({ ...form, inspection_type: e.target.value })}>{TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}</Select></Field>
          <Field label="Property"><Combo endpoint="/properties" labelFn={(p) => `${p.title} (${p.property_code || ''})`} value={form.property_id} onChange={(v) => setForm({ ...form, property_id: v })} placeholder="Search property…" /></Field>
          <Field label="Scheduled date"><Input type="datetime-local" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} /></Field>
          <Field label="Summary" full><Textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></Field>
        </Drawer>
      )}

      {drawer === 'view' && (
        <Drawer title={sel?.inspection_code || 'Inspection'} onClose={() => setDrawer(null)} width={620}>
          {!detail ? <Spinner /> : (
            <>
              <div className="wrap-gap" style={{ marginBottom: 14 }}><span className="code-chip">{detail.inspection_code}</span><StatusBadge status={detail.status} /><Badge tone="blue">{detail.inspection_type?.replace('_', ' ')}</Badge></div>
              <KV k="Property" v={detail.property?.title} /><KV k="Scheduled" v={detail.scheduled_date} /><KV k="Summary" v={detail.summary} />
              <div className="form-section-title"><ClipboardCheck size={13} /> Checklist items ({(detail.items || []).length})</div>
              {(detail.items || []).map((it) => <div key={it.id} className="kv"><span className="k">{it.area ? it.area + ' · ' : ''}{it.item}</span><span className="v"><Badge tone={condTone[it.condition] || 'grey'}>{it.condition}</Badge></span></div>)}
              <div className="form-grid" style={{ marginTop: 10 }}>
                <Field label="Area"><Input value={item.area} onChange={(e) => setItem({ ...item, area: e.target.value })} /></Field>
                <Field label="Item"><Input value={item.item} onChange={(e) => setItem({ ...item, item: e.target.value })} /></Field>
                <Field label="Condition"><Select value={item.condition} onChange={(e) => setItem({ ...item, condition: e.target.value })}>{Object.keys(condTone).map((c) => <option key={c}>{c}</option>)}</Select></Field>
              </div>
              <Button variant="ghost" size="sm" icon={Plus} onClick={addItem}>Add item</Button>
            </>
          )}
        </Drawer>
      )}
    </>
  );
}
