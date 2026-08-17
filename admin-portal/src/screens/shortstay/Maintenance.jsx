import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import api from '../../services/api';
import { Spinner } from '../../ui/kit';
import { bdt, Chip, fmtDate, ScreenHead } from './common';

const SEV = { critical: 'bad', high: 'warn', medium: 'info', low: 'grey' };

export default function Maintenance({ actions = {}, refreshKey }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get('/short-stay/incidents'); setRows(Array.isArray(res.data) ? res.data : []); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  const { urgent, planned } = useMemo(() => {
    const open = rows.filter((i) => ['reported', 'investigating'].includes(i.status));
    return {
      urgent: open.filter((i) => ['critical', 'high'].includes(i.severity)),
      planned: rows.filter((i) => !(['reported', 'investigating'].includes(i.status) && ['critical', 'high'].includes(i.severity))),
    };
  }, [rows]);
  const critical = urgent.filter((i) => i.severity === 'critical').length;

  if (loading) return <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>;

  return (
    <div>
      <ScreenHead title="Maintenance & incidents" desc="Urgent guest-affecting incidents kept apart from planned work."
        actions={<button className="pm-btn primary" onClick={actions.reportIncident}><Plus size={15} /> Report incident</button>} />

      {/* Urgent incidents */}
      <div className="pm-card" style={{ marginBottom: 20, borderColor: urgent.length ? 'var(--bad)' : undefined }}>
        <div className="pm-card-h">
          <div className="ic" style={{ color: 'var(--bad)' }}><AlertTriangle size={17} /></div>
          <div><h3 style={{ color: urgent.length ? 'var(--bad)' : 'var(--ink)' }}>Urgent incidents</h3><div className="hsub">Guest-affecting · escalation clock running</div></div>
          <div className="sp" /><span className="pm-chip bad"><span className="d" />{urgent.length} open · {critical} critical</span>
        </div>
        <div className="pm-card-body ss-table-scroll" style={{ padding: 0 }}>
          {urgent.map((i) => (
            <div key={i.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 16, padding: '14px 18px', borderBottom: '1px solid var(--line-soft)' }}>
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <span className={`pm-chip ${SEV[i.severity]}`}><span className="d" />{i.severity}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--muted-2)', textTransform: 'capitalize' }}>{String(i.category || '').replace(/_/g, ' ')}</span>
                </div>
                <div style={{ fontWeight: 650, fontSize: 13.5, color: 'var(--ink)', marginBottom: 3 }}>{i.description}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{i.property?.title || `#${i.property_id}`}{i.estimated_cost ? ` · est. ${bdt(i.estimated_cost)}` : ''}{i.deduct_from_deposit_amount ? ` · deposit claim ${bdt(i.deduct_from_deposit_amount)}` : ''}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 150 }}>
                <button className="pm-btn primary" style={btn} onClick={() => actions.updateIncident?.(i.id, 'investigating')}>Escalate</button>
                <button className="pm-btn" style={btn} onClick={() => actions.assignIncident?.(i)}>{i.provider_name ? `Reassign · ${i.provider_name.split(' ')[0]}` : 'Assign provider'}</button>
                {i.category === 'damage' && <button className="pm-btn" style={btn} onClick={() => actions.chargeIncident?.(i)}>Charge deposit</button>}
                <button className="pm-btn" style={btn} onClick={() => actions.updateIncident?.(i.id, 'resolved')}>Resolve</button>
              </div>
            </div>
          ))}
          {!urgent.length && <div className="pm-empty" style={{ padding: '28px 20px' }}><div className="ic"><AlertTriangle size={20} /></div>No urgent incidents. Guest-affecting issues surface here.</div>}
        </div>
      </div>

      {/* Planned maintenance / log */}
      <div className="pm-card">
        <div className="pm-card-h"><div><h3>Maintenance log</h3><div className="hsub">All incidents, damage claims and planned work</div></div></div>
        <div className="pm-card-body ss-table-scroll" style={{ padding: 0 }}>
          <table className="pm-tbl">
            <thead><tr><th>Severity</th><th>Property</th><th>Category</th><th>Assigned</th><th>Reported</th><th style={{ textAlign: 'right' }}>Est. cost</th><th>Deposit claim</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
            <tbody>
              {planned.map((i) => (
                <tr key={i.id}>
                  <td><span className={`pm-chip ${SEV[i.severity]}`}><span className="d" />{i.severity}</span></td>
                  <td style={{ fontWeight: 650 }}>{i.property?.title || `#${i.property_id}`}</td>
                  <td style={{ textTransform: 'capitalize', fontSize: 12.5 }}>{String(i.category || '').replace(/_/g, ' ')}</td>
                  <td style={{ fontSize: 12.5 }}>{i.provider_name || <span style={{ color: 'var(--muted)' }}>Unassigned</span>}</td>
                  <td style={{ fontSize: 12.5 }}>{fmtDate(i.createdAt || i.created_at)}</td>
                  <td style={{ textAlign: 'right' }}>{i.estimated_cost ? <span className="pm-money-out">{bdt(i.estimated_cost)}</span> : '—'}</td>
                  <td>{i.deduct_from_deposit_amount ? <span className="pm-money">{bdt(i.deduct_from_deposit_amount)}</span> : '—'}</td>
                  <td><Chip k={i.status} /></td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button className="pm-btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => actions.assignIncident?.(i)}>Assign</button>
                      {['reported', 'investigating'].includes(i.status) && <button className="pm-btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => actions.updateIncident?.(i.id, 'resolved')}>Resolve</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {!planned.length && <tr><td colSpan={9} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>No incidents logged.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
const btn = { padding: '5px 12px', fontSize: 12, justifyContent: 'center' };
