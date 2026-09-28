import React, { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { Button, Field, Input, Select, Textarea, Drawer, Spinner, Badge } from '../../../ui/kit';

/** Registration activities — workbook Sheets 8-12, SOP Phase 6. */
export const ACTIVITY_TYPES = [
  ['name_clearance', 'Name Clearance'], ['trade_licence', 'Trade Licence'], ['rjsc', 'RJSC Registration'],
  ['tin', 'TIN'], ['bin', 'BIN'], ['vat', 'VAT'], ['authority_liaison', 'Authority Liaison'],
];
const STATUS_TONE = { pending: 'grey', submitted: 'blue', completed: 'green', rejected: 'red' };
const EMPTY = { activity_type: 'name_clearance', title: '', authority: '', reference_no: '', status: 'pending', notes: '', work_order_id: null };

export default function ActivitiesPanel({ projectId, projectCode }) {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState(null);
  const [edit, setEdit] = useState(null);
  const [workOrders, setWorkOrders] = useState([]);

  const load = useCallback(async () => {
    try { const { data } = await api.get(`/br-line/projects/${projectId}/activities`); setRows(data.data || []); }
    catch { setRows([]); toast.error('Could not load registration activities'); }
  }, [projectId, toast]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    // The shared list endpoint ignores query filters, and wt_work_orders.project_id
    // holds the project CODE — so filter here rather than offering every work order
    // on the line (binding an activity to another client's job would corrupt the
    // provider dashboard).
    api.get('/wt-work-orders')
      .then(({ data }) => {
        const rows = data.data || data.work_orders || data.rows || (Array.isArray(data) ? data : []);
        setWorkOrders(projectCode ? rows.filter((w) => String(w.project_id || '') === String(projectCode)) : []);
      })
      .catch(() => setWorkOrders([]));
  }, [projectCode]);

  const create = async () => {
    try { await api.post(`/br-line/projects/${projectId}/activities`, form); toast.success('Activity created'); setForm(null); load(); }
    catch (e) { toast.error(e.response?.data?.error || 'Save failed'); }
  };
  const update = async () => {
    try { await api.put(`/br-line/activities/${edit.id}`, edit); toast.success('Activity updated'); setEdit(null); load(); }
    catch (e) { toast.error(e.response?.data?.error || 'Save failed'); }
  };

  if (rows === null) return <Spinner />;
  const label = (k) => (ACTIVITY_TYPES.find(([v]) => v === k) || [k, k])[1];

  return (
    <section className="wt-card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Registration activities</h3>
        <Button icon={Plus} onClick={() => setForm({ ...EMPTY })}>New activity</Button>
      </div>
      <table className="wt-tbl" style={{ marginTop: 10 }}>
        <thead><tr><th>Activity</th><th>Authority</th><th>Reference</th><th>Status</th><th>Submitted</th><th /></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={6} className="cell-sub">Nothing lodged yet.</td></tr>}
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{label(r.activity_type)}<div className="cell-sub">{r.title}</div></td>
              <td className="cell-sub">{r.authority || '—'}</td>
              <td className="cell-sub">{r.reference_no || '—'}</td>
              <td>
                <Badge tone={STATUS_TONE[r.status] || 'grey'}>{r.status}</Badge>
                {r.rejection_reason && <div style={{ color: '#b91c1c', fontSize: 12 }}>{r.rejection_reason}</div>}
              </td>
              <td className="cell-sub">{r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : '—'}</td>
              <td><Button size="sm" variant="ghost" onClick={() => setEdit({ ...r })}>Update</Button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {form && (
        <Drawer open title="New registration activity" width={480} onClose={() => setForm(null)}
          footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button><Button onClick={create}>Create</Button>
          </div>}>
          <Field label="Activity">
            <Select value={form.activity_type} onChange={(e) => setForm({ ...form, activity_type: e.target.value })}>
              {ACTIVITY_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Name clearance — first choice" /></Field>
          <Field label="Authority"><Input value={form.authority} onChange={(e) => setForm({ ...form, authority: e.target.value })} placeholder="RJSC, City Corporation, NBR…" /></Field>
          <Field label="Reference no."><Input value={form.reference_no} onChange={(e) => setForm({ ...form, reference_no: e.target.value })} /></Field>
          <Field label="Work order (optional)">
            <Select value={form.work_order_id || ''} onChange={(e) => setForm({ ...form, work_order_id: e.target.value || null })}>
              <option value="">— none —</option>
              {workOrders.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.scope || 'work order'}</option>)}
            </Select>
          </Field>
          <Field label="Notes"><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </Drawer>
      )}

      {edit && (
        <Drawer open title={`Update — ${label(edit.activity_type)}`} width={480} onClose={() => setEdit(null)}
          footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={update}>Save</Button>
          </div>}>
          <Field label="Status">
            <Select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
              <option value="pending">Pending</option>
              <option value="submitted">Submitted</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </Select>
          </Field>
          <Field label="Reference no."><Input value={edit.reference_no || ''} onChange={(e) => setEdit({ ...edit, reference_no: e.target.value })} /></Field>
          <Field label="Outcome"><Input value={edit.outcome || ''} onChange={(e) => setEdit({ ...edit, outcome: e.target.value })} /></Field>
          {edit.status === 'rejected' && (
            <Field label="Rejection reason">
              <Textarea rows={2} value={edit.rejection_reason || ''} onChange={(e) => setEdit({ ...edit, rejection_reason: e.target.value })} />
            </Field>
          )}
        </Drawer>
      )}
    </section>
  );
}
