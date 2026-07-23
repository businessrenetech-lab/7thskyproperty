import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, MessageSquareWarning, AlertOctagon, Plus } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Spinner, Badge, Button, Drawer, Field, Input, Select, Textarea, EmptyState } from '../ui/kit';

const TABS = [
  { key: 'warranties', label: 'Warranties', icon: ShieldCheck },
  { key: 'complaints', label: 'Complaints', icon: MessageSquareWarning },
  { key: 'incidents', label: 'Incidents', icon: AlertOctagon },
];
const TONE = { active: 'green', expiring: 'amber', expired: 'red', claimed: 'blue', void: 'grey', open: 'amber', investigating: 'amber', resolved: 'green', closed: 'grey', escalated: 'red' };

// Per-register config: columns + form fields.
const CONFIG = {
  warranties: {
    code: 'warranty_code', title: 'Warranty',
    columns: [['warranty_code', 'Code'], ['customer_name', 'Customer'], ['warranty_type', 'Type'], ['start_date', 'Start'], ['expiry_date', 'Expiry'], ['status', 'Status']],
    fields: [['customer_name', 'Customer', 'text'], ['warranty_type', 'Warranty type', 'text'], ['start_date', 'Start date', 'date'], ['expiry_date', 'Expiry date', 'date'], ['status', 'Status', 'select', ['active', 'expiring', 'expired', 'claimed', 'void']], ['terms', 'Terms', 'textarea']],
    empty: 'No warranties recorded.',
  },
  complaints: {
    code: 'complaint_code', title: 'Complaint',
    columns: [['complaint_code', 'Code'], ['customer_name', 'Customer'], ['complaint_type', 'Type'], ['severity', 'Severity'], ['status', 'Status']],
    fields: [['customer_name', 'Customer', 'text'], ['complaint_type', 'Complaint type', 'text'], ['severity', 'Severity', 'select', ['low', 'medium', 'high']], ['description', 'Description', 'textarea'], ['investigation', 'Investigation', 'textarea'], ['resolution', 'Resolution', 'textarea'], ['status', 'Status', 'select', ['open', 'investigating', 'resolved', 'closed', 'escalated']]],
    empty: 'No complaints logged.',
  },
  incidents: {
    code: 'incident_code', title: 'Incident',
    columns: [['incident_code', 'Code'], ['incident_type', 'Type'], ['severity', 'Severity'], ['incident_date', 'Date'], ['status', 'Status']],
    fields: [['incident_type', 'Incident type', 'select', ['injury', 'contamination', 'property_damage', 'environmental', 'other']], ['severity', 'Severity', 'select', ['low', 'medium', 'high', 'critical']], ['incident_date', 'Date', 'date'], ['description', 'Description', 'textarea'], ['action_taken', 'Action taken', 'textarea'], ['status', 'Status', 'select', ['open', 'investigating', 'closed']]],
    empty: 'No incidents recorded.',
  },
};

export default function CareRegisters() {
  const [tab, setTab] = useState('warranties');
  return (
    <div className="pm-scope">
      <PageHead title="Warranty & Issues" desc="Warranties on completed work, customer complaints and safety incidents." />
      <div className="pm-segment" style={{ marginBottom: 16 }}>
        {TABS.map((t) => { const Ic = t.icon; return <button key={t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}><Ic size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />{t.label}</button>; })}
      </div>
      <Register key={tab} type={tab} />
    </div>
  );
}

function Register({ type }) {
  const toast = useToast();
  const cfg = CONFIG[type];
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [edit, setEdit] = useState(null);
  const load = useCallback(async () => { setLoading(true); try { const { data } = await api.get(`/care/${type}?limit=200`); setRows(data.data || []); } catch { } finally { setLoading(false); } }, [type]);
  useEffect(() => { load(); }, [load]);
  const save = async (form) => {
    try { if (form.id) await api.put(`/care/${type}/${form.id}`, form); else await api.post(`/care/${type}`, form); toast.success('Saved'); setEdit(null); load(); }
    catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  };
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}><Button icon={Plus} onClick={() => setEdit({})}>New {cfg.title.toLowerCase()}</Button></div>
      {loading ? <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div> : !rows.length ? (
        <div className="pm-card"><EmptyState icon={TABS.find((t) => t.key === type).icon} title={cfg.empty} /></div>
      ) : (
        <div className="pm-card" style={{ overflowX: 'auto' }}>
          <table className="pm-tbl">
            <thead><tr>{cfg.columns.map(([, l]) => <th key={l}>{l}</th>)}<th /></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} onClick={() => setEdit(r)}>
                {cfg.columns.map(([k]) => <td key={k}>{k === cfg.code ? <span className="code-chip">{r[k]}</span> : k === 'status' ? <Badge tone={TONE[r[k]] || 'grey'} dot>{r[k]}</Badge> : (r[k] || '—')}{k === 'severity' && r[k] ? '' : ''}</td>)}
                <td style={{ textAlign: 'right' }}><Button size="sm" variant="ghost">Edit</Button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {edit && <RegisterDrawer cfg={cfg} row={edit} onClose={() => setEdit(null)} onSave={save} />}
    </>
  );
}

function RegisterDrawer({ cfg, row, onClose, onSave }) {
  const [f, setF] = useState({ ...row });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  return (
    <Drawer title={`${row.id ? 'Edit' : 'New'} ${cfg.title.toLowerCase()}`} width={480} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => onSave(f)}>Save</Button></>}>
      {cfg.fields.map(([k, label, kind, opts]) => (
        <Field key={k} label={label}>
          {kind === 'textarea' ? <Textarea rows={2} value={f[k] || ''} onChange={(e) => set(k, e.target.value)} />
            : kind === 'select' ? <Select value={f[k] || ''} onChange={(e) => set(k, e.target.value)}><option value="">Select…</option>{opts.map((o) => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}</Select>
            : <Input type={kind} value={f[k] || ''} onChange={(e) => set(k, e.target.value)} />}
        </Field>
      ))}
    </Drawer>
  );
}
