import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Plus, Pencil, Trash2, Users, Truck } from 'lucide-react';
import api from '../../services/api';
import {
  WtHead, WtTabs, Pill, Loading, EmptyState, WtDrawer,
  toast, errText, svcLabel,
} from './common';

/*
 * Team & Fleet — Removal & Relocation only (manifest team_fleet).
 * Internal crew (Team Leader/Driver/Mover/Packer) + vehicles (Truck/Van/Pickup)
 * you pick from the DB or add inline; assigned to a work order at Resource
 * Allocation. No provider master agreement. Backend refuses lines without team_fleet.
 */
const TABS = ['Crew', 'Vehicles'];

export default function TeamFleet() {
  const [tab, setTab] = useState('Crew');
  const [ref, setRef] = useState({ crew_roles: [], vehicle_types: [], crew_statuses: [], vehicle_statuses: [] });
  const [crew, setCrew] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [edit, setEdit] = useState(null); // { kind:'crew'|'vehicle', row }

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [r, c, v] = await Promise.all([
        api.get('/wt-resources/reference'),
        api.get('/wt-resources/crew'),
        api.get('/wt-resources/vehicles'),
      ]);
      setRef(r.data || {}); setCrew(c.data || []); setVehicles(v.data || []);
    } catch (e) { setError(errText(e)); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (kind, row) => {
    if (!window.confirm(`Delete ${row.name || row.reg_no || row.code}?`)) return;
    try { await api.delete(`/wt-resources/${kind === 'crew' ? 'crew' : 'vehicles'}/${row.id}`); toast.ok('Deleted'); load(); }
    catch (e) { toast.err(errText(e)); }
  };

  if (loading) return <Loading />;

  return (
    <div className="wt-page">
      <WtHead title="Team & Fleet" subtitle={`${svcLabel()} — internal crew & vehicles`}>
        <button className="wt-btn ghost sm" onClick={load}><RefreshCw size={13} /> Refresh</button>
        <button className="wt-btn sm" onClick={() => setEdit({ kind: tab === 'Crew' ? 'crew' : 'vehicle', row: {} })}>
          <Plus size={14} /> New {tab === 'Crew' ? 'crew member' : 'vehicle'}
        </button>
      </WtHead>

      {error && <div className="wt-note" style={{ margin: '8px 0', background: '#fef3c7', borderColor: '#fcd34d', color: '#92400e' }}>{error}</div>}

      <WtTabs tabs={TABS} value={tab} onChange={setTab} counts={{ Crew: crew.length, Vehicles: vehicles.length }} />

      {tab === 'Crew' && (
        <div className="wt-card wt-tblcard">
          {crew.length ? (
            <table className="wt-tbl">
              <thead><tr><th style={{ width: 96 }}>Code</th><th>Name</th><th>Role</th><th>Phone</th><th style={{ width: 100 }}>Status</th><th style={{ width: 84, textAlign: 'right' }}>Actions</th></tr></thead>
              <tbody>
                {crew.map((c) => (
                  <tr key={c.id}>
                    <td className="id">{c.code}</td>
                    <td><strong>{c.name}</strong></td>
                    <td>{c.role || '—'}</td>
                    <td>{c.phone || '—'}</td>
                    <td><Pill value={c.status} sm /></td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="wt-btn ghost sm" onClick={() => setEdit({ kind: 'crew', row: c })}><Pencil size={12} /></button>
                      <button className="wt-btn ghost sm" onClick={() => remove('crew', c)}><Trash2 size={12} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div style={{ padding: 28 }}><EmptyState eyebrow={<Users size={20} />} title="No crew yet" hint="Add your movers, packers and drivers." /></div>}
        </div>
      )}

      {tab === 'Vehicles' && (
        <div className="wt-card wt-tblcard">
          {vehicles.length ? (
            <table className="wt-tbl">
              <thead><tr><th style={{ width: 96 }}>Code</th><th>Registration</th><th>Type</th><th>Capacity</th><th style={{ width: 110 }}>Status</th><th style={{ width: 84, textAlign: 'right' }}>Actions</th></tr></thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id}>
                    <td className="id">{v.code}</td>
                    <td><strong>{v.reg_no || '—'}</strong></td>
                    <td>{v.vehicle_type || '—'}</td>
                    <td>{v.capacity || '—'}</td>
                    <td><Pill value={v.status} sm /></td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="wt-btn ghost sm" onClick={() => setEdit({ kind: 'vehicle', row: v })}><Pencil size={12} /></button>
                      <button className="wt-btn ghost sm" onClick={() => remove('vehicle', v)}><Trash2 size={12} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div style={{ padding: 28 }}><EmptyState eyebrow={<Truck size={20} />} title="No vehicles yet" hint="Add your trucks, vans and pickups." /></div>}
        </div>
      )}

      {edit && <ResourceDrawer edit={edit} ref_={ref} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}

const Field = ({ label, children }) => (
  <div><div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{label}</div>{children}</div>
);

function ResourceDrawer({ edit, ref_, onClose, onSaved }) {
  const { kind, row } = edit;
  const isNew = !row.id;
  const crew = kind === 'crew';
  const [f, setF] = useState(crew
    ? { name: row.name || '', role: row.role || '', phone: row.phone || '', email: row.email || '', skills: row.skills || '', status: row.status || 'Active', notes: row.notes || '' }
    : { reg_no: row.reg_no || '', vehicle_type: row.vehicle_type || '', capacity: row.capacity || '', status: row.status || 'Available', notes: row.notes || '' });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((c) => ({ ...c, [k]: v }));

  const save = async () => {
    if (crew && !f.name.trim()) { toast.err('Name is required'); return; }
    if (!crew && !f.reg_no.trim() && !f.vehicle_type) { toast.err('Registration or type is required'); return; }
    setBusy(true);
    try {
      const base = crew ? '/wt-resources/crew' : '/wt-resources/vehicles';
      if (isNew) await api.post(base, f); else await api.patch(`${base}/${row.id}`, f);
      toast.ok(isNew ? 'Added' : 'Updated'); onSaved();
    } catch (e) { toast.err(errText(e)); }
    setBusy(false);
  };

  return (
    <WtDrawer title={`${isNew ? 'New' : 'Edit'} ${crew ? 'crew member' : 'vehicle'}`} onClose={onClose}
      footer={<button className="wt-btn" disabled={busy} onClick={save}>{busy ? 'Saving…' : (isNew ? 'Add' : 'Save changes')}</button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {crew ? (
          <>
            <Field label="Name *"><input className="wt-input" value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <div style={{ display: 'flex', gap: 10 }}>
              <Field label="Role"><select className="wt-input" value={f.role} onChange={(e) => set('role', e.target.value)}><option value="">—</option>{(ref_.crew_roles || []).map((r) => <option key={r} value={r}>{r}</option>)}</select></Field>
              <Field label="Status"><select className="wt-input" value={f.status} onChange={(e) => set('status', e.target.value)}>{(ref_.crew_statuses || ['Active']).map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Field label="Phone"><input className="wt-input" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
              <Field label="Email"><input className="wt-input" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
            </div>
            <Field label="Skills / notes"><textarea className="wt-input" rows={2} value={f.skills} onChange={(e) => set('skills', e.target.value)} /></Field>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10 }}>
              <Field label="Registration"><input className="wt-input" value={f.reg_no} onChange={(e) => set('reg_no', e.target.value)} placeholder="e.g. DHA-GA-11-1234" /></Field>
              <Field label="Type"><select className="wt-input" value={f.vehicle_type} onChange={(e) => set('vehicle_type', e.target.value)}><option value="">—</option>{(ref_.vehicle_types || []).map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Field label="Capacity"><input className="wt-input" value={f.capacity} onChange={(e) => set('capacity', e.target.value)} placeholder="e.g. 3 Ton / 12 CBM" /></Field>
              <Field label="Status"><select className="wt-input" value={f.status} onChange={(e) => set('status', e.target.value)}>{(ref_.vehicle_statuses || ['Available']).map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
            </div>
            <Field label="Notes"><textarea className="wt-input" rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
          </>
        )}
      </div>
    </WtDrawer>
  );
}
