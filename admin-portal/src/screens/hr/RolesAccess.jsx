import React, { useEffect, useState } from 'react';
import { Lock, RotateCcw, Save } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../ui/kit';
import { useGet, useHrMe, forgetHrMe, Loading, errText } from './hrShared';

/*
 * Roles & access (M1 §7, M2 §10 as defaults; the CEO may change them). The server checks these settings
 * on every HR request. The CEO always keeps approvals, structure editing and this screen.
 */

const GROUPS = [
  ['Organisation', [['org.view_basic', 'See the organisation chart'], ['org.edit', 'Create and edit the structure'], ['org.view_cost', 'See cost centres and salary grades']]],
  ['Employees', [['emp.view_any', 'See every employee'], ['emp.view_team', 'See their own team'], ['emp.view_own', 'See their own profile'], ['emp.edit', 'Edit employee records'], ['emp.view_payroll', 'See salary, bank and payroll'], ['emp.view_sensitive', 'See NID, passport, family and medical details']]],
  ['Recruitment', [['rec.manage', 'Run recruitment'], ['rec.request', 'Request new staff']]],
  ['Pay, reviews and exits', [['pay.manage', 'Prepare payroll and adjustments'], ['pay.view', 'See payroll'], ['pay.pay', 'Mark payroll paid'], ['perf.manage', 'Run performance reviews'], ['off.manage', 'Manage exits']]],
  ['Time and approvals', [['approvals.inbox', 'Approve changes'], ['time.view_all', 'See everyone’s attendance and leave'], ['time.manage', 'Manage attendance, leave and shifts'], ['biometric.manage', 'Manage biometric devices']]],
  ['Settings', [['access.manage', 'Change these access settings']]],
];

export default function RolesAccess() {
  const toast = useToast();
  const { can } = useHrMe();
  const { data, error, reload } = useGet('/hr/access');
  const [matrix, setMatrix] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setMatrix(data.matrix); }, [data]);
  const editable = can('access.manage');

  if (!data || !matrix) return <div className="hrm"><Loading error={error} reload={reload} /></div>;
  const locked = (role, a) => role === 'ceo' && data.locked.ceo.includes(a);
  const dirty = JSON.stringify(matrix) !== JSON.stringify(data.matrix);
  const flip = (role, a) => setMatrix((m) => ({ ...m, [role]: m[role].includes(a) ? m[role].filter((x) => x !== a) : [...m[role], a] }));

  const send = async (fn, msg) => {
    setBusy(true);
    try { await fn(); forgetHrMe(); toast.success(msg); reload(); } catch (e) { toast.error(errText(e)); } finally { setBusy(false); }
  };

  return (
    <div className="hrm">
      <div className="hrm-head">
        <div>
          <h1>Roles and access</h1>
          <p>Who may see and do what in HR. The client’s role tables are the starting point; {editable ? 'you can change them and every change is logged.' : 'only the CEO can change them.'}</p>
        </div>
        {editable && (
          <div className="hrm-actions">
            <Button variant="secondary" icon={RotateCcw} disabled={busy} onClick={() => send(() => api.post('/hr/access/reset'), 'Back to the defaults')}>Reset to defaults</Button>
            <Button icon={Save} disabled={busy || !dirty} onClick={() => send(() => api.put('/hr/access', { matrix }), 'Access saved')}>Save changes</Button>
          </div>
        )}
      </div>
      <section className="hrm-card" aria-label="Access by role">
        <div className="hrm-table-wrap">
          <table className="hrm-table hrm-matrix">
            <thead><tr><th>What they can do</th>{data.roles.map((r) => <th key={r.key}>{r.label}</th>)}</tr></thead>
            <tbody>
              {GROUPS.map(([g, actions]) => (
                <React.Fragment key={g}>
                  <tr className="grp"><td colSpan={data.roles.length + 1}>{g}</td></tr>
                  {actions.map(([a, label]) => (
                    <tr key={a}>
                      <td>{label}</td>
                      {data.roles.map((r) => (
                        <td key={r.key} className="c">
                          {locked(r.key, a) ? <Lock size={14} aria-label={`${r.label} always keeps this`} style={{ color: '#64748B' }} />
                            : <input type="checkbox" checked={matrix[r.key].includes(a)} disabled={!editable} onChange={() => flip(r.key, a)} aria-label={`${r.label}: ${label}`} />}
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hrm-note" style={{ padding: '10px 16px 14px' }}>Department managers and team leaders are recognised from the structure. People always see their own record. The lock marks what the CEO can never lose.</p>
      </section>
    </div>
  );
}
