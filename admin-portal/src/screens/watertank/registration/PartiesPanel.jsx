import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { Button, Field, Input, Select, Drawer, Spinner, Badge } from '../../../ui/kit';

/** Shareholder & Director registers (workbook Sheets 5 and 6; SOP Phase 2). */
const EMPTY = { party_role: 'shareholder', name: '', nid: '', designation: '', share_percentage: '', mobile: '', email: '', address: '', nationality: 'Bangladeshi', notes: '' };

export default function PartiesPanel({ projectId }) {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState(null);

  const load = useCallback(async () => {
    try { const { data } = await api.get(`/br-line/projects/${projectId}/parties`); setRows(data.data || []); }
    catch { setRows([]); toast.error('Could not load shareholders and directors'); }
  }, [projectId, toast]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try {
      await api.post(`/br-line/projects/${projectId}/parties`, form);
      toast.success('Party added'); setForm(null); load();
    } catch (e) { toast.error(e.response?.data?.error || 'Save failed'); }
  };
  const remove = async (row) => {
    try { await api.delete(`/br-line/parties/${row.id}`); load(); }
    catch (e) { toast.error(e.response?.data?.error || 'Could not remove'); }
  };

  if (rows === null) return <Spinner />;
  const shareTotal = rows.filter((r) => r.party_role === 'shareholder')
    .reduce((n, r) => n + (Number(r.share_percentage) || 0), 0);

  return (
    <section className="wt-card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Shareholders &amp; directors</h3>
        <Button icon={Plus} onClick={() => setForm({ ...EMPTY })}>Add party</Button>
      </div>
      {shareTotal > 0 && (
        <p className="cell-sub" style={{ marginTop: 6 }}>
          Shareholding recorded: <b>{shareTotal}%</b>{shareTotal !== 100 ? ' — does not total 100%' : ''}
        </p>
      )}
      <table className="tbl" style={{ marginTop: 10 }}>
        <thead><tr><th>Name</th><th>Role</th><th>NID</th><th>Share</th><th>Contact</th><th /></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={6} className="cell-sub">No shareholders or directors recorded yet.</td></tr>}
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.name}{r.designation && <div className="cell-sub">{r.designation}</div>}</td>
              <td><Badge tone={r.party_role === 'director' ? 'blue' : 'green'}>{r.party_role}</Badge></td>
              <td className="cell-sub">{r.nid || '—'}</td>
              <td>{r.share_percentage != null && r.share_percentage !== '' ? `${r.share_percentage}%` : '—'}</td>
              <td className="cell-sub">{[r.mobile, r.email].filter(Boolean).join(' · ') || '—'}</td>
              <td><Button size="sm" variant="ghost" icon={Trash2} onClick={() => remove(r)}>Remove</Button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {form && (
        <Drawer open title="Add shareholder or director" width={520} onClose={() => setForm(null)}
          footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </div>}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Role">
              <Select value={form.party_role} onChange={(e) => setForm({ ...form, party_role: e.target.value })}>
                <option value="shareholder">Shareholder</option>
                <option value="director">Director</option>
              </Select>
            </Field>
            <Field label="Full name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="NID / Passport"><Input value={form.nid} onChange={(e) => setForm({ ...form, nid: e.target.value })} /></Field>
            <Field label="Designation"><Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Managing Director" /></Field>
            <Field label="Share %"><Input type="number" min="0" max="100" value={form.share_percentage} onChange={(e) => setForm({ ...form, share_percentage: e.target.value })} /></Field>
            <Field label="Nationality"><Input value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} /></Field>
            <Field label="Mobile"><Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></Field>
            <Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          </div>
          <Field label="Address"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
        </Drawer>
      )}
    </section>
  );
}
