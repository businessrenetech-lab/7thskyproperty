import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, KeyRound, ShieldCheck, Pencil, Trash2, UserPlus, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PageHead, Button, Badge, DataTable, Drawer, Field, Input, Select, Textarea, SearchInput, EmptyState, Spinner } from '../../ui/kit';
import '../../styles/access.css';

/*
 * Users and roles (modelled on Hadi Real Estate's Access control). Two tabs:
 *   People  give or change a person's role, set a password for them, suspend or reactivate them, add a person.
 *   Roles   the built-in roles, and custom roles a super admin makes: each one is given areas of the system at
 *           a level (Sales, Operations, Finance, Manage). The server enforces the same areas (config/accessAreas).
 * What an admin may do to whom is decided on the server (services/roleRank); this screen only offers it.
 */

const errText = (e, fallback = 'Something went wrong. Try again.') => e?.response?.data?.error || fallback;
const COLORS = ['#1E3A8A', '#0EA5A4', '#7C3AED', '#DB2777', '#EA580C', '#CA8A04', '#16A34A', '#475569'];

// A readable temporary password that meets the rules (8+ characters, a capital letter, a number).
const makePassword = () => {
  const pick = (s) => s[Math.floor(Math.random() * s.length)];
  const words = 'River Cedar Harbor Maple Summit Coral Falcon Willow Amber Meadow'.split(' ');
  return `${pick(words)}${pick(words)}#${Math.floor(1000 + Math.random() * 9000)}`;
};

export default function UsersRoles() {
  const [tab, setTab] = useState('people');
  const [catalog, setCatalog] = useState(null);
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState('');

  const loadRoles = useCallback(() => Promise.all([api.get('/rbac/catalog'), api.get('/rbac/roles')])
    .then(([c, r]) => { setCatalog(c.data); setRoles(r.data.data); setError(''); })
    .catch((e) => setError(errText(e, 'Roles could not be loaded.'))), []);
  useEffect(() => { loadRoles(); }, [loadRoles]);

  const labelOf = useMemo(() => {
    const m = {};
    (catalog?.builtIn || []).forEach((r) => { m[r.key] = { label: r.label }; });
    roles.forEach((r) => { m[r.key] = { label: r.label, color: r.color, custom: true }; });
    return (key) => m[key] || { label: key, missing: true };
  }, [catalog, roles]);

  return (
    <div className="acc">
      <PageHead title="Users and roles" desc="Who can sign in, what role they have, and what each role can use." />
      <div className="acc-tabs" role="tablist" aria-label="Users and roles">
        {[['people', 'People'], ['roles', 'Roles']].map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {error && <div className="acc-warn" role="alert">{error}</div>}
      {!catalog && !error ? <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div> : catalog && (
        tab === 'people'
          ? <People catalog={catalog} labelOf={labelOf} onRolesChanged={loadRoles} />
          : <Roles catalog={catalog} roles={roles} reload={loadRoles} />
      )}
    </div>
  );
}

/* ── People ─────────────────────────────────────────────────────────────── */

function RoleName({ info }) {
  return <span className="acc-role"><i style={info.color ? { background: info.color } : undefined} />{info.label}{info.custom && <Badge tone="blue">Custom</Badge>}{info.missing && <Badge tone="amber">Not a role</Badge>}</span>;
}

function People({ catalog, labelOf, onRolesChanged }) {
  const { user: me } = useAuth();
  const [people, setPeople] = useState(null);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [open, setOpen] = useState(null);      // a person, or 'new'
  const toast = useToast();

  const load = useCallback(() => api.get('/auth/staff', { params: { staff: 1 } })
    .then((r) => setPeople(r.data)).catch((e) => { setPeople([]); toast.error(errText(e, 'People could not be loaded.')); }), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => (people || []).filter((p) => (!roleFilter || p.role === roleFilter)
    && (!q || `${p.name} ${p.email}`.toLowerCase().includes(q.toLowerCase()))), [people, q, roleFilter]);
  const roleKeys = [...new Set((people || []).map((p) => p.role))];

  const columns = [
    { key: 'name', header: 'Person', render: (p) => <div className="acc-person"><b>{p.name}{p.id === me?.id ? ' (you)' : ''}</b><small>{p.email}</small></div> },
    { key: 'role', header: 'Role', render: (p) => <RoleName info={labelOf(p.role)} /> },
    { key: 'branch', header: 'Branch', render: (p) => p.Branch?.name || '—' },
    { key: 'status', header: 'Status', render: (p) => <span className="wrap-gap"><Badge tone={p.status === 'active' ? 'green' : 'red'}>{p.status === 'active' ? 'Active' : 'Suspended'}</Badge>{p.must_change_password && <Badge tone="amber">Must change password</Badge>}</span> },
    { key: 'act', header: <span className="sr-only">Actions</span>, render: (p) => p.id !== me?.id && <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setOpen(p); }}>Manage</Button> },
  ];

  return (
    <>
      <div className="acc-bar">
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" />
        <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Filter by role">
          <option value="">All roles</option>
          {roleKeys.map((k) => <option key={k} value={k}>{labelOf(k).label}</option>)}
        </Select>
        <span className="grow" />
        <Button icon={UserPlus} onClick={() => setOpen('new')}>Add person</Button>
      </div>
      <div className="card">
        <DataTable columns={columns} rows={rows} loading={!people}
          empty={<EmptyState title={people?.length ? 'Nobody matches' : 'No staff accounts yet'} sub={people?.length ? 'Try another name or role.' : 'Add the first person with Add person.'} />} />
      </div>
      {open === 'new' && <NewPerson catalog={catalog} labelOf={labelOf} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); load(); onRolesChanged(); }} />}
      {open && open !== 'new' && <ManagePerson person={open} catalog={catalog} labelOf={labelOf} onClose={() => setOpen(null)} onSaved={(p) => { setOpen(p); load(); onRolesChanged(); }} />}
    </>
  );
}

function RoleOptions({ catalog, labelOf, current }) {
  const keys = current && !catalog.assignable.includes(current) ? [current, ...catalog.assignable] : catalog.assignable;
  const builtIn = keys.filter((k) => !labelOf(k).custom);
  const custom = keys.filter((k) => labelOf(k).custom);
  return <>
    <optgroup label="Built-in roles">{builtIn.map((k) => <option key={k} value={k} disabled={!catalog.assignable.includes(k)}>{labelOf(k).label}</option>)}</optgroup>
    {custom.length > 0 && <optgroup label="Custom roles">{custom.map((k) => <option key={k} value={k} disabled={!catalog.assignable.includes(k)}>{labelOf(k).label}</option>)}</optgroup>}
  </>;
}

function PasswordInput({ value, onChange, id }) {
  return (
    <div className="acc-row">
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} autoComplete="new-password" placeholder="At least 8 characters, a capital and a number" />
      <Button variant="ghost" icon={RefreshCw} type="button" onClick={() => onChange(makePassword())}>Generate</Button>
    </div>
  );
}

function ManagePerson({ person, catalog, labelOf, onClose, onSaved }) {
  const toast = useToast();
  const [role, setRole] = useState(person.role);
  const [pw, setPw] = useState('');
  const [mustChange, setMustChange] = useState(true);
  const [busy, setBusy] = useState('');
  const canGiveCurrent = catalog.assignable.includes(person.role);

  const run = async (what, call, done) => {
    setBusy(what);
    try { const r = await call(); toast.success(done(r)); return r; } catch (e) { toast.error(errText(e)); return null; } finally { setBusy(''); }
  };
  const saveRole = () => run('role', () => api.patch('/auth/role', { userId: person.id, role }), () => `${person.name} is now ${labelOf(role).label}`)
    .then((r) => r && onSaved({ ...person, role }));
  const savePw = () => run('pw', () => api.patch('/auth/staff-password', { userId: person.id, newPassword: pw, mustChange }), () => 'Password set. Give it to them in person or by phone.')
    .then((r) => r && onSaved({ ...person, must_change_password: mustChange }));
  const setStatus = (status) => run('status', () => api.patch('/auth/staff-status', { userId: person.id, status }), (r) => r.data.message)
    .then((r) => r && onSaved({ ...person, status }));

  return (
    <Drawer title={person.name} onClose={onClose} width={480}>
      <div className="acc-section">
        <p className="acc-note">{person.email}{person.Branch?.name ? ` · ${person.Branch.name}` : ''}</p>
        {!canGiveCurrent && <div className="acc-warn">Only a super admin can change this account.</div>}
      </div>
      <div className="acc-section">
        <h3>Role</h3>
        <div className="acc-row">
          <Select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role" disabled={!canGiveCurrent}>
            <RoleOptions catalog={catalog} labelOf={labelOf} current={person.role} />
          </Select>
          <Button onClick={saveRole} disabled={!canGiveCurrent || role === person.role || busy === 'role'}>{busy === 'role' ? 'Saving…' : 'Change role'}</Button>
        </div>
        <p className="acc-note">The new role applies to their next action; they do not need to sign in again.</p>
      </div>
      <div className="acc-section">
        <h3>Set a password</h3>
        <PasswordInput id="acc-pw" value={pw} onChange={setPw} />
        <label className="acc-check"><input type="checkbox" checked={mustChange} onChange={(e) => setMustChange(e.target.checked)} /> Ask them to choose their own password when they next sign in</label>
        <div><Button icon={KeyRound} onClick={savePw} disabled={!canGiveCurrent || pw.length < 8 || busy === 'pw'}>{busy === 'pw' ? 'Setting…' : 'Set password'}</Button></div>
      </div>
      <div className="acc-section">
        <h3>Sign-in</h3>
        {person.status === 'active'
          ? <><p className="acc-note">Suspending stops them signing in. Their records stay as they are.</p><div><Button variant="danger" onClick={() => setStatus('suspended')} disabled={!canGiveCurrent || busy === 'status'}>Suspend account</Button></div></>
          : <><p className="acc-note">This account is suspended and cannot sign in.</p><div><Button onClick={() => setStatus('active')} disabled={!canGiveCurrent || busy === 'status'}>Reactivate account</Button></div></>}
      </div>
    </Drawer>
  );
}

function NewPerson({ catalog, labelOf, onClose, onSaved }) {
  const { user: me } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ name: '', email: '', role: catalog.assignable.includes('staff') ? 'staff' : catalog.assignable[0], password: makePassword(), branch_id: me?.branch_id || '' });
  const [branches, setBranches] = useState([]);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const superAdmin = me?.role === 'super_admin';
  useEffect(() => { if (superAdmin) api.get('/branches').then((r) => setBranches(Array.isArray(r.data) ? r.data : r.data.data || [])).catch(() => {}); }, [superAdmin]);

  const save = async () => {
    setBusy(true);
    try {
      await api.post('/auth/register', { ...f, branch_id: Number(f.branch_id) || undefined });
      toast.success(`Added ${f.name}. They choose their own password at first sign-in.`);
      onSaved();
    } catch (e) { toast.error(errText(e)); }
    setBusy(false);
  };
  return (
    <Drawer title="Add person" onClose={onClose} width={480}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={Plus} onClick={save} disabled={busy || !f.name.trim() || !f.email.trim() || f.password.length < 8}>{busy ? 'Adding…' : 'Add person'}</Button></>}>
      <div className="acc-section">
        <Field label="Full name" required><Input value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Email" required><Input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="Role" required><Select value={f.role} onChange={(e) => set('role', e.target.value)}><RoleOptions catalog={catalog} labelOf={labelOf} /></Select></Field>
        {superAdmin && <Field label="Branch" required><Select value={f.branch_id} onChange={(e) => set('branch_id', e.target.value)}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>}
        <Field label="Temporary password" required><PasswordInput id="acc-new-pw" value={f.password} onChange={(v) => set('password', v)} /></Field>
        <p className="acc-note">Give them this password yourself. They are asked to choose their own the first time they sign in. For HR records, add them as an employee in Human Resources instead.</p>
      </div>
    </Drawer>
  );
}

/* ── Roles ──────────────────────────────────────────────────────────────── */

function Roles({ catalog, roles, reload }) {
  const [edit, setEdit] = useState(null);     // a role, or 'new'
  const areaLabel = Object.fromEntries(catalog.areas.map((a) => [a.key, a.label]));
  const levelLabel = Object.fromEntries(catalog.levels.map((l) => [l.key, l.label]));
  const summary = (levels) => (levels.includes('manage') ? 'Manage' : levels.map((l) => levelLabel[l]).join(', '));

  return (
    <>
      <div className="acc-bar">
        <p className="acc-note grow">A custom role can use only the areas you tick, at the level you choose. Accounts, roles and settings always stay with the built-in admins.</p>
        {catalog.canManageRoles && <Button icon={Plus} onClick={() => setEdit('new')}>New role</Button>}
      </div>
      <h2 className="acc-h2">Custom roles</h2>
      {roles.length ? (
        <div className="acc-roles">
          {roles.map((r) => (
            <article key={r.key} className="card acc-card" style={{ '--rc': r.color }}>
              <div className="acc-card-head"><h3>{r.label}</h3><span className="acc-sub">{r.users} {r.users === 1 ? 'person' : 'people'}</span></div>
              {r.description && <p className="acc-note">{r.description}</p>}
              <div className="acc-areas">
                {Object.entries(r.areas).length
                  ? Object.entries(r.areas).map(([a, levels]) => <span key={a}>{areaLabel[a] || a}: {summary(levels)}</span>)
                  : <span>No areas yet</span>}
              </div>
              <p className="acc-sub">HR: {catalog.hrRoles.find((h) => h.key === r.hr_role)?.label || 'Employee'}</p>
              {catalog.canManageRoles && <div className="wrap-gap"><Button variant="ghost" size="sm" icon={Pencil} onClick={() => setEdit(r)}>Edit</Button></div>}
            </article>
          ))}
        </div>
      ) : (
        <div className="card"><EmptyState icon={ShieldCheck} title="No custom roles yet" sub={catalog.canManageRoles ? 'Make a role when a job needs a mix the built-in roles do not cover, such as a site lead who runs Water Tank work but sees no invoices.' : 'A super admin can make custom roles.'}
          action={catalog.canManageRoles && <Button icon={Plus} onClick={() => setEdit('new')}>New role</Button>} /></div>
      )}
      <h2 className="acc-h2">Built-in roles</h2>
      <div className="card acc-builtin">
        {catalog.builtIn.map((r) => <div key={r.key}><b>{r.label}</b><span>{r.note}</span></div>)}
      </div>
      {edit && <RoleEditor role={edit === 'new' ? null : edit} catalog={catalog} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    </>
  );
}

function RoleEditor({ role, catalog, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState(() => ({
    label: role?.label || '', color: role?.color || COLORS[0], description: role?.description || '',
    hr_role: role?.hr_role || 'employee', areas: { ...(role?.areas || {}) },
  }));
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const levelKeys = catalog.levels.map((l) => l.key);

  const toggle = (area, level) => setF((x) => {
    const cur = new Set(x.areas[area] || []);
    if (cur.has(level)) {
      cur.delete(level);
      if (level !== 'manage') cur.delete('manage');       // manage means all of them
    } else if (level === 'manage') levelKeys.forEach((l) => cur.add(l));
    else cur.add(level);
    const areas = { ...x.areas };
    if (cur.size) areas[area] = levelKeys.filter((l) => cur.has(l)); else delete areas[area];
    return { ...x, areas };
  });

  const save = async () => {
    setBusy(true);
    try {
      if (role) await api.put(`/rbac/roles/${role.key}`, f); else await api.post('/rbac/roles', f);
      toast.success(role ? `Saved ${f.label}. People with this role get the change straight away.` : `Made the role ${f.label}. Give it to people from the People tab.`);
      onSaved();
    } catch (e) { toast.error(errText(e)); }
    setBusy(false);
  };
  const remove = async () => {
    setBusy(true);
    try { await api.delete(`/rbac/roles/${role.key}`); toast.success(`Deleted ${role.label}`); onSaved(); } catch (e) { toast.error(errText(e)); }
    setBusy(false);
  };

  const groups = [...new Set(catalog.areas.map((a) => a.group))];
  return (
    <Drawer title={role ? `Edit ${role.label}` : 'New role'} onClose={onClose} width={640}
      footer={<>
        {role && <Button variant="danger" icon={Trash2} onClick={remove} disabled={busy || role.users > 0} title={role.users ? 'Move everyone to another role first' : undefined}>Delete</Button>}
        <span style={{ flex: 1 }} />
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={busy || !f.label.trim()}>{busy ? 'Saving…' : role ? 'Save role' : 'Make role'}</Button>
      </>}>
      <div className="acc-section">
        <Field label="Name" required><Input value={f.label} maxLength={60} onChange={(e) => set('label', e.target.value)} placeholder="Site lead" /></Field>
        <Field label="What this role is for"><Textarea rows={2} maxLength={200} value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <Field label="Colour">
          <div className="acc-colors">{COLORS.map((c) => <button key={c} type="button" aria-label={`Colour ${c}`} aria-pressed={f.color === c} style={{ background: c }} onClick={() => set('color', c)} />)}</div>
        </Field>
        <Field label="Human Resources access">
          <Select value={f.hr_role} onChange={(e) => set('hr_role', e.target.value)}>{catalog.hrRoles.map((h) => <option key={h.key} value={h.key}>{h.label}</option>)}</Select>
        </Field>
        {role?.users > 0 && <p className="acc-note">{role.users} {role.users === 1 ? 'person has' : 'people have'} this role. To delete it, move them to another role first.</p>}
      </div>
      <div className="acc-section">
        <h3>Areas</h3>
        <p className="acc-note">{catalog.levels.map((l) => `${l.label}: ${l.hint.toLowerCase()}.`).join(' ')}</p>
        <div className="table-wrap">
          <table className="acc-matrix">
            <thead><tr><th scope="col">Area</th>{catalog.levels.map((l) => <th key={l.key} scope="col" title={l.hint}>{l.label}</th>)}</tr></thead>
            <tbody>
              {groups.map((g) => (
                <React.Fragment key={g}>
                  <tr className="grp"><td colSpan={levelKeys.length + 1}>{g}</td></tr>
                  {catalog.areas.filter((a) => a.group === g).map((a) => (
                    <tr key={a.key}>
                      <td>{a.label}</td>
                      {catalog.levels.map((l) => (
                        <td key={l.key}><input type="checkbox" aria-label={`${a.label}: ${l.label}`} checked={(f.areas[a.key] || []).includes(l.key)} onChange={() => toggle(a.key, l.key)} /></td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Drawer>
  );
}
