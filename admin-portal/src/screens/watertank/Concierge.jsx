import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Plus, Pencil, Trash2, Search, KeyRound, DoorOpen, Check, X } from 'lucide-react';
import api from '../../services/api';
import {
  WtHead, Pill, Loading, EmptyState, WtDrawer,
  toast, errText, svcLabel,
} from './common';

/*
 * Concierge — Property Care & Concierge only (manifest concierge).
 * Two related registers on one screen:
 *   • Access Declarations — key/alarm/pets/valuables/restricted-areas per client property.
 *   • Entry / Exit Log     — Property Opening & Closing checklists (meter readings,
 *     alarm, keys returned) per work order.
 */
export default function Concierge() {
  const [tab, setTab] = useState('declarations');
  const [ref, setRef] = useState({ access_methods: [], visit_types: [] });
  const [summary, setSummary] = useState({ declarations: 0, visits: 0, entries: 0, exits: 0 });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);

  const path = tab === 'declarations' ? '/wt-concierge/declarations' : '/wt-concierge/visits';

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [l, r, s] = await Promise.all([
        api.get(path, { params: { q: q || undefined } }),
        api.get('/wt-concierge/reference'),
        api.get('/wt-concierge/summary'),
      ]);
      setRows(l.data || []); setRef(r.data || {}); setSummary(s.data || {});
    } catch (e) { setError(errText(e)); }
    setLoading(false);
  }, [path, q]);
  useEffect(() => { load(); }, [load]);

  const remove = async (row) => {
    if (!window.confirm(`Delete ${row.code}?`)) return;
    try { await api.delete(`${path}/${row.id}`); toast.ok('Deleted'); load(); }
    catch (e) { toast.err(errText(e)); }
  };

  const Tab = ({ id, label, icon: Icon }) => (
    <button className={`wt-btn sm ${tab === id ? '' : 'ghost'}`} onClick={() => { setTab(id); setQ(''); }}><Icon size={13} /> {label}</button>
  );
  const YN = ({ v }) => (v ? <Check size={14} style={{ color: '#059669' }} /> : <X size={14} style={{ color: 'var(--wt-muted)' }} />);

  return (
    <div className="wt-page">
      <WtHead title="Concierge & Access" subtitle={`${svcLabel()} — key-holding, access & property visits`}>
        <button className="wt-btn ghost sm" onClick={load}><RefreshCw size={13} /> Refresh</button>
        <button className="wt-btn sm" onClick={() => setEdit({})}><Plus size={14} /> New {tab === 'declarations' ? 'declaration' : 'visit'}</button>
      </WtHead>

      {error && <div className="wt-note" style={{ margin: '8px 0', background: '#fef3c7', borderColor: '#fcd34d', color: '#92400e' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '4px 0 12px' }}>
        <Chip label="Declarations" value={summary.declarations} />
        <Chip label="Visits" value={summary.visits} />
        <Chip label="Entries" value={summary.entries} />
        <Chip label="Exits" value={summary.exits} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <Tab id="declarations" label="Access Declarations" icon={KeyRound} />
        <Tab id="visits" label="Entry / Exit Log" icon={DoorOpen} />
      </div>

      <div className="wt-card" style={{ padding: 12, display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <Search size={15} style={{ color: 'var(--wt-muted)' }} />
        <input className="wt-input" style={{ flex: 1 }} placeholder="Search client, address, code…"
          value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') load(); }} />
        <button className="wt-btn sm" onClick={load}>Search</button>
      </div>

      {loading ? <Loading /> : (
        rows.length ? (
          <div className="wt-card wt-tblcard">
            {tab === 'declarations' ? (
              <table className="wt-tbl">
                <thead><tr><th style={{ width: 96 }}>Code</th><th>Client / Property</th><th>Access method</th><th style={{ width: 70 }}>Alarm</th><th style={{ width: 90 }}>Valuables</th><th style={{ width: 90 }}>Authorised</th><th style={{ width: 84, textAlign: 'right' }}>Actions</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td><strong>{r.code}</strong></td>
                      <td>{r.client_code}{r.property_address ? <div className="muted" style={{ fontSize: 11 }}>{r.property_address}</div> : null}</td>
                      <td>{r.key_access_method || '—'}</td>
                      <td><YN v={r.alarm_managed} /></td>
                      <td><YN v={r.valuables_secured} /></td>
                      <td><YN v={r.client_authorisation} /></td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="wt-btn ghost sm" onClick={() => setEdit(r)}><Pencil size={12} /></button>
                        <button className="wt-btn ghost sm" onClick={() => remove(r)}><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="wt-tbl">
                <thead><tr><th style={{ width: 96 }}>Code</th><th>Client / WO</th><th style={{ width: 80 }}>Type</th><th style={{ width: 110 }}>Date</th><th style={{ width: 70 }}>Alarm</th><th style={{ width: 70 }}>Keys</th><th style={{ width: 84, textAlign: 'right' }}>Actions</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td><strong>{r.code}</strong></td>
                      <td>{r.client_code}{r.work_order_code ? <div className="muted" style={{ fontSize: 11 }}>{r.work_order_code}</div> : null}</td>
                      <td><Pill value={r.visit_type} sm /></td>
                      <td>{r.visit_date || '—'}</td>
                      <td><YN v={r.alarm_activated} /></td>
                      <td><YN v={r.keys_returned} /></td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="wt-btn ghost sm" onClick={() => setEdit(r)}><Pencil size={12} /></button>
                        <button className="wt-btn ghost sm" onClick={() => remove(r)}><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : <div className="wt-card" style={{ padding: 28 }}><EmptyState eyebrow={tab === 'declarations' ? <KeyRound size={20} /> : <DoorOpen size={20} />} title={`No ${tab === 'declarations' ? 'declarations' : 'visits'} yet`} hint={tab === 'declarations' ? 'Record the client’s key-holding and access arrangements.' : 'Log property opening & closing visits against a work order.'} /></div>
      )}

      {edit && (tab === 'declarations'
        ? <DeclarationDrawer row={edit} ref_={ref} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />
        : <VisitDrawer row={edit} ref_={ref} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />)}
    </div>
  );
}

const Chip = ({ label, value }) => (
  <div className="wt-card" style={{ padding: '8px 14px' }}>
    <div style={{ fontSize: 11, color: 'var(--wt-muted)' }}>{label}</div>
    <div style={{ fontWeight: 700, fontSize: 15 }}>{value}</div>
  </div>
);
const Field = ({ label, children }) => (
  <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{label}</div>{children}</div>
);
const Chk = ({ label, checked, onChange }) => (
  <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}><input type="checkbox" checked={checked} onChange={onChange} /> {label}</label>
);

function DeclarationDrawer({ row, ref_, onClose, onSaved }) {
  const isNew = !row.id;
  const [f, setF] = useState({
    client_code: row.client_code || '', key_access_method: row.key_access_method || '', alarm_managed: !!row.alarm_managed,
    alarm_notes: row.alarm_notes || '', pets: row.pets || '', vulnerable_persons: row.vulnerable_persons || '',
    known_hazards: row.known_hazards || '', restricted_areas: row.restricted_areas || '',
    valuables_secured: !!row.valuables_secured, client_authorisation: !!row.client_authorisation,
    declaration_date: row.declaration_date || '', notes: row.notes || '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((c) => ({ ...c, [k]: v }));
  const save = async () => {
    if (isNew && !f.client_code.trim()) { toast.err('Client code is required'); return; }
    setBusy(true);
    try {
      if (isNew) await api.post('/wt-concierge/declarations', f); else await api.patch(`/wt-concierge/declarations/${row.id}`, f);
      toast.ok(isNew ? 'Added' : 'Updated'); onSaved();
    } catch (e) { toast.err(errText(e)); }
    setBusy(false);
  };
  return (
    <WtDrawer title={isNew ? 'New access declaration' : `Declaration ${row.code}`} onClose={onClose}
      footer={<button className="wt-btn" disabled={busy} onClick={save}>{busy ? 'Saving…' : (isNew ? 'Add' : 'Save changes')}</button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {isNew && <Field label="Client code *"><input className="wt-input" value={f.client_code} onChange={(e) => set('client_code', e.target.value)} placeholder="e.g. PCC-C0001" /></Field>}
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="Access method"><select className="wt-input" value={f.key_access_method} onChange={(e) => set('key_access_method', e.target.value)}><option value="">—</option>{(ref_.access_methods || []).map((m) => <option key={m} value={m}>{m}</option>)}</select></Field>
          <Field label="Declaration date"><input className="wt-input" type="date" value={f.declaration_date || ''} onChange={(e) => set('declaration_date', e.target.value)} /></Field>
        </div>
        <Field label="Alarm notes / code arrangement"><input className="wt-input" value={f.alarm_notes} onChange={(e) => set('alarm_notes', e.target.value)} placeholder="e.g. Code held securely; disarm on entry" /></Field>
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="Pets"><input className="wt-input" value={f.pets} onChange={(e) => set('pets', e.target.value)} placeholder="e.g. 1 dog (friendly)" /></Field>
          <Field label="Vulnerable persons"><input className="wt-input" value={f.vulnerable_persons} onChange={(e) => set('vulnerable_persons', e.target.value)} /></Field>
        </div>
        <Field label="Known hazards"><textarea className="wt-input" rows={2} value={f.known_hazards} onChange={(e) => set('known_hazards', e.target.value)} /></Field>
        <Field label="Restricted areas"><textarea className="wt-input" rows={2} value={f.restricted_areas} onChange={(e) => set('restricted_areas', e.target.value)} placeholder="Rooms / areas not to be entered" /></Field>
        <div style={{ display: 'flex', gap: 16 }}>
          <Chk label="Alarm managed by Seventh Sky" checked={f.alarm_managed} onChange={(e) => set('alarm_managed', e.target.checked)} />
          <Chk label="Valuables secured" checked={f.valuables_secured} onChange={(e) => set('valuables_secured', e.target.checked)} />
        </div>
        <Chk label="Client authorisation given" checked={f.client_authorisation} onChange={(e) => set('client_authorisation', e.target.checked)} />
        <Field label="Notes"><textarea className="wt-input" rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
      </div>
    </WtDrawer>
  );
}

function VisitDrawer({ row, ref_, onClose, onSaved }) {
  const isNew = !row.id;
  const [f, setF] = useState({
    client_code: row.client_code || '', work_order_code: row.work_order_code || '', visit_type: row.visit_type || 'Entry',
    visit_date: row.visit_date || '', access_method: row.access_method || '', condition: row.condition || '',
    meter_readings: row.meter_readings || '', security_check: !!row.security_check, doors_locked: !!row.doors_locked,
    alarm_activated: !!row.alarm_activated, keys_returned: !!row.keys_returned, issues: row.issues || '',
    completed_by: row.completed_by || '', notes: row.notes || '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((c) => ({ ...c, [k]: v }));
  const save = async () => {
    if (isNew && !f.client_code.trim()) { toast.err('Client code is required'); return; }
    setBusy(true);
    try {
      if (isNew) await api.post('/wt-concierge/visits', f); else await api.patch(`/wt-concierge/visits/${row.id}`, f);
      toast.ok(isNew ? 'Added' : 'Updated'); onSaved();
    } catch (e) { toast.err(errText(e)); }
    setBusy(false);
  };
  return (
    <WtDrawer title={isNew ? 'New property visit' : `Visit ${row.code}`} onClose={onClose}
      footer={<button className="wt-btn" disabled={busy} onClick={save}>{busy ? 'Saving…' : (isNew ? 'Add' : 'Save changes')}</button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {isNew && <Field label="Client code *"><input className="wt-input" value={f.client_code} onChange={(e) => set('client_code', e.target.value)} placeholder="e.g. PCC-C0001" /></Field>}
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="Visit type"><select className="wt-input" value={f.visit_type} onChange={(e) => set('visit_type', e.target.value)}>{(ref_.visit_types || ['Entry', 'Exit']).map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
          <Field label="Visit date"><input className="wt-input" type="date" value={f.visit_date || ''} onChange={(e) => set('visit_date', e.target.value)} /></Field>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="Work order"><input className="wt-input" value={f.work_order_code} onChange={(e) => set('work_order_code', e.target.value)} placeholder="e.g. PCCW-0001" /></Field>
          <Field label="Access method"><input className="wt-input" value={f.access_method} onChange={(e) => set('access_method', e.target.value)} /></Field>
        </div>
        <Field label="Condition on entry / area secured on exit"><input className="wt-input" value={f.condition} onChange={(e) => set('condition', e.target.value)} /></Field>
        <Field label="Meter readings"><input className="wt-input" value={f.meter_readings} onChange={(e) => set('meter_readings', e.target.value)} placeholder="e.g. Elec 12345, Gas 6789" /></Field>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Chk label="Security check" checked={f.security_check} onChange={(e) => set('security_check', e.target.checked)} />
          <Chk label="Doors / windows locked" checked={f.doors_locked} onChange={(e) => set('doors_locked', e.target.checked)} />
          <Chk label="Alarm activated" checked={f.alarm_activated} onChange={(e) => set('alarm_activated', e.target.checked)} />
          <Chk label="Keys returned" checked={f.keys_returned} onChange={(e) => set('keys_returned', e.target.checked)} />
        </div>
        <Field label="Issues identified"><textarea className="wt-input" rows={2} value={f.issues} onChange={(e) => set('issues', e.target.value)} /></Field>
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="Completed by"><input className="wt-input" value={f.completed_by} onChange={(e) => set('completed_by', e.target.value)} /></Field>
        </div>
        <Field label="Notes"><textarea className="wt-input" rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
      </div>
    </WtDrawer>
  );
}
