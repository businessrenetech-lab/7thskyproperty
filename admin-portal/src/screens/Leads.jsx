import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, UserPlus, PhoneCall } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Button, DataTable, StatusBadge, Badge, Drawer, Field, Input, Textarea, Select, SearchInput, KV, Spinner } from '../ui/kit';

const STAGES = ['new', 'contacted', 'follow_up', 'meeting', 'converted', 'lost'];
const money = (v) => (v == null ? '—' : 'BDT ' + Number(v).toLocaleString());
const VERTICALS = ['properties', 'property_care', 'leasing', 'removal', 'documentation', 'nrb', 'interior'];

export default function Leads() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const urlVertical = searchParams.get('vertical') || '';
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(''); const [search, setSearch] = useState('');
  const [drawer, setDrawer] = useState(null); const [form, setForm] = useState({});
  const [sel, setSel] = useState(null); const [detail, setDetail] = useState(null);
  const [act, setAct] = useState({ activity_type: 'call', title: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { 
      const p = new URLSearchParams({ limit: 100 }); 
      if (tab) p.set('status', tab); 
      if (search) p.set('search', search); 
      if (urlVertical) p.set('vertical_key', urlVertical);
      const { data } = await api.get(`/leads?${p}`); 
      setRows(data.data || []); 
    }
    catch { toast.error('Failed to load leads'); } finally { setLoading(false); }
  }, [tab, search, urlVertical, toast]);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm({ name: '', phone: '', email: '', source: '', vertical_key: '', priority: 'medium', estimated_value: '', requirement: '', next_follow_up: '' }); setDrawer('create'); };
  const save = async () => {
    if (!form.name) return toast.error('Name is required');
    setSaving(true);
    try { await api.post('/leads', form); toast.success('Lead created'); setDrawer(null); load(); }
    catch (e) { toast.error(e.response?.data?.error || 'Create failed'); } finally { setSaving(false); }
  };
  const openView = async (r) => { setSel(r); setDrawer('view'); setDetail(null); try { const { data } = await api.get(`/leads/${r.id}`); setDetail(data.data); } catch { toast.error('Load failed'); } };
  const setStatus = async (status) => { try { await api.patch(`/leads/${sel.id}/status`, { status }); toast.success(`Moved to ${status}`); const { data } = await api.get(`/leads/${sel.id}`); setDetail(data.data); load(); } catch { toast.error('Failed'); } };
  const addActivity = async () => { try { await api.post(`/leads/${sel.id}/activities`, act); setAct({ activity_type: 'call', title: '', notes: '' }); const { data } = await api.get(`/leads/${sel.id}`); setDetail(data.data); toast.success('Logged'); } catch { toast.error('Failed'); } };
  const convert = async () => { try { await api.post(`/leads/${sel.id}/convert`, { is_buyer: true }); toast.success('Converted to client'); setDrawer(null); load(); } catch (e) { toast.error(e.response?.data?.error || 'Failed'); } };

  const columns = [
    { key: 'lead_code', header: 'Code', render: (r) => <span className="code-chip">{r.lead_code}</span> },
    { key: 'name', header: 'Lead', render: (r) => <div><div className="cell-strong">{r.name}</div><div className="cell-sub">{r.phone || r.email || ''}</div></div> },
    { key: 'vertical', header: 'Interest', render: (r) => r.vertical_key ? <Badge tone="blue">{r.vertical_key}</Badge> : '—' },
    { key: 'source', header: 'Source', render: (r) => r.source || '—' },
    { key: 'priority', header: 'Priority', render: (r) => <Badge tone={r.priority === 'high' || r.priority === 'critical' ? 'red' : r.priority === 'medium' ? 'amber' : 'grey'}>{r.priority}</Badge> },
    { key: 'value', header: 'Est. value', render: (r) => money(r.estimated_value) },
    { key: 'follow', header: 'Follow-up', render: (r) => r.next_follow_up ? new Date(r.next_follow_up).toLocaleDateString() : '—' },
    { key: 'status', header: 'Stage', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <>
      <PageHead title="Leads" desc="Pipeline: New → Contacted → Follow-up → Meeting → Converted / Lost."
        actions={<Button icon={Plus} onClick={openCreate}>New Lead</Button>} />
      <div className="tabs">
        <div className={`tab ${tab === '' ? 'active' : ''}`} onClick={() => setTab('')}>All</div>
        {STAGES.map((s) => <div key={s} className={`tab ${tab === s ? 'active' : ''}`} onClick={() => setTab(s)} style={{ textTransform: 'capitalize' }}>{s.replace('_', ' ')}</div>)}
      </div>
      <div className="card" style={{ marginBottom: 16 }}><div className="card-pad"><SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, email, code…" /></div></div>
      <div className="card"><DataTable columns={columns} rows={rows} loading={loading} onRowClick={openView} /></div>

      {drawer === 'create' && (
        <Drawer title="New Lead" onClose={() => setDrawer(null)} footer={<><Button variant="ghost" onClick={() => setDrawer(null)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? <Spinner /> : 'Create'}</Button></>}>
          <Field label="Name" required full><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="form-grid">
            <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Source"><Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Website, Referral…" /></Field>
            <Field label="Interest (vertical)"><Select value={form.vertical_key} onChange={(e) => setForm({ ...form, vertical_key: e.target.value })}><option value="">—</option>{VERTICALS.map((v) => <option key={v}>{v}</option>)}</Select></Field>
            <Field label="Priority"><Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{['low', 'medium', 'high', 'critical'].map((p) => <option key={p}>{p}</option>)}</Select></Field>
            <Field label="Est. value"><Input type="number" value={form.estimated_value} onChange={(e) => setForm({ ...form, estimated_value: e.target.value })} /></Field>
            <Field label="Next follow-up"><Input type="date" value={form.next_follow_up} onChange={(e) => setForm({ ...form, next_follow_up: e.target.value })} /></Field>
          </div>
          <Field label="Requirement" full><Textarea value={form.requirement} onChange={(e) => setForm({ ...form, requirement: e.target.value })} /></Field>
        </Drawer>
      )}

      {drawer === 'view' && (
        <Drawer title={sel?.name || 'Lead'} onClose={() => setDrawer(null)}
          footer={detail && detail.status !== 'converted' && <Button icon={UserPlus} onClick={convert}>Convert to Client</Button>}>
          {!detail ? <Spinner /> : (
            <>
              <div className="wrap-gap" style={{ marginBottom: 14 }}><span className="code-chip">{detail.lead_code}</span><StatusBadge status={detail.status} /></div>
              <KV k="Phone" v={detail.phone} /><KV k="Email" v={detail.email} /><KV k="Source" v={detail.source} />
              <KV k="Interest" v={detail.vertical_key} /><KV k="Est. value" v={money(detail.estimated_value)} />
              <KV k="Requirement" v={detail.requirement} />

              <div className="form-section-title">Move stage</div>
              <div className="wrap-gap">{STAGES.filter((s) => s !== detail.status).map((s) => <button key={s} className="btn btn-ghost btn-sm" style={{ textTransform: 'capitalize' }} onClick={() => setStatus(s)}>{s.replace('_', ' ')}</button>)}</div>

              <div className="form-section-title">Log activity</div>
              <div className="form-grid">
                <Field label="Type"><Select value={act.activity_type} onChange={(e) => setAct({ ...act, activity_type: e.target.value })}>{['call', 'email', 'sms', 'whatsapp', 'meeting', 'note'].map((t) => <option key={t}>{t}</option>)}</Select></Field>
                <Field label="Title"><Input value={act.title} onChange={(e) => setAct({ ...act, title: e.target.value })} /></Field>
              </div>
              <Field label="Notes" full><Textarea value={act.notes} onChange={(e) => setAct({ ...act, notes: e.target.value })} /></Field>
              <Button variant="ghost" icon={PhoneCall} onClick={addActivity}>Log activity</Button>

              <div className="form-section-title">Activity history ({detail.activities?.length || 0})</div>
              {detail.activities?.length ? detail.activities.map((a) => (
                <div key={a.id} className="kv"><span className="k">{a.activity_type} · {a.title || ''}</span><span className="v">{new Date(a.occurred_at).toLocaleDateString()}</span></div>
              )) : <p className="cell-sub">No activity yet.</p>}
            </>
          )}
        </Drawer>
      )}
    </>
  );
}
