import React, { useEffect, useState } from 'react';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { PageHead, Spinner, Badge } from '../../../ui/kit';
import { ACTIVITY_TYPES } from './ActivitiesPanel';

/** Every registration activity across projects — workbook Sheets 8-12 in one view. */
export default function Activities() {
  const toast = useToast();
  const [rows, setRows] = useState(null);

  useEffect(() => {
    api.get('/br-line/activities')
      .then(({ data }) => setRows(data.data || []))
      .catch(() => { setRows([]); toast.error('Could not load activities'); });
  }, [toast]);

  if (rows === null) return <Spinner />;
  const label = (k) => (ACTIVITY_TYPES.find(([v]) => v === k) || [k, k])[1];
  const tone = (s) => (s === 'rejected' ? 'red' : s === 'completed' ? 'green' : s === 'submitted' ? 'blue' : 'grey');

  return (
    <div className="wt-scope">
      <PageHead
        title="Registration Activities"
        desc="Name clearance, trade licence, RJSC, TIN/BIN/VAT and authority liaison across every project."
      />
      <table className="tbl" style={{ marginTop: 12 }}>
        <thead><tr><th>Activity</th><th>Project</th><th>Authority</th><th>Reference</th><th>Status</th><th>Submitted</th></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={6} className="cell-sub">No registration activities yet.</td></tr>}
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{label(r.activity_type)}<div className="cell-sub">{r.title}</div></td>
              <td className="cell-sub">{r.wt_project_id || '—'}</td>
              <td className="cell-sub">{r.authority || '—'}</td>
              <td className="cell-sub">{r.reference_no || '—'}</td>
              <td>
                <Badge tone={tone(r.status)}>{r.status}</Badge>
                {r.rejection_reason && <div style={{ color: '#b91c1c', fontSize: 12 }}>{r.rejection_reason}</div>}
              </td>
              <td className="cell-sub">{r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
