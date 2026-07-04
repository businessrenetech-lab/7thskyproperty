import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, ClipboardCheck, ArrowRight, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, DataTable, StatusBadge, Spinner, Button, Field, Input, Drawer } from '../ui/kit';

export default function Vacancies() {
  const toast = useToast();
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({ exit_inspection_date: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/vacancy-notices'); setRows(data.data || []); }
    catch { toast.error('Failed to load notices'); } finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const scheduleExit = async () => {
    if (!scheduleForm.exit_inspection_date) return toast.error('Exit inspection date required');
    try {
      const { data } = await api.post(`/vacancy-notices/${selected.id}/schedule-exit`, scheduleForm);
      toast.success(data.message);
      setSelected(null);
      setScheduleForm({ exit_inspection_date: '' });
      await load();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  const columns = [
    { key: 'notice_code', header: 'Notice', render: (r) => <span className="code-chip">{r.notice_code}</span> },
    { key: 'property', header: 'Property', render: (r) => r.property?.title || '—' },
    { key: 'tenant', header: 'Tenant', render: (r) => r.tenant?.full_name || '—' },
    { key: 'intended_vacate_date', header: 'Vacate date', render: (r) => <strong>{r.intended_vacate_date}</strong> },
    { key: 'notice', header: 'Notice period', render: (r) => (
      <span style={{ color: r.notice_period_met ? 'var(--success)' : 'var(--warning)' }}>
        {r.notice_period_days}d {r.notice_period_met ? '✓' : '⚠'}
      </span>
    ) },
    { key: 'exit_inspection_date', header: 'Exit inspection', render: (r) => r.exit_inspection_date || '—' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'settlement', header: 'Settlement', render: (r) => r.settlement_id ? <Button size="sm" variant="ghost" icon={ArrowRight} onClick={() => nav(`/property-management/settlements?id=${r.settlement_id}`)}>Open</Button> : <span className="cell-sub">—</span> },
  ];

  return (
    <>
      <PageHead title="Vacancy Notices" desc="Tenant notice-to-vacate submissions — schedule exit inspections and settle deposits." actions={<Button variant="ghost" icon={RefreshCw} onClick={load}>Refresh</Button>} />
      <div className="card">
        <DataTable columns={columns} rows={rows} loading={loading} onRowClick={(r) => setSelected(r)} />
      </div>

      {selected && (
        <Drawer title={`Vacancy Notice ${selected.notice_code}`} width={620} onClose={() => setSelected(null)}
          footer={selected.status === 'submitted' || selected.status === 'acknowledged'
            ? <><Button variant="ghost" onClick={() => setSelected(null)}>Close</Button><Button icon={ClipboardCheck} onClick={scheduleExit}>Schedule Exit Inspection</Button></>
            : <><Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>{!selected.settlement_id && <Button icon={KeyRound} onClick={() => nav(`/property-management/settlements?tenancy_id=${selected.tenancy_id}&vacancy_notice_id=${selected.id}`)}>Create Deposit Settlement</Button>}</>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="card" style={{ padding: 12, background: 'var(--surface-2)' }}>
              <div style={{ fontWeight: 700 }}>{selected.property?.title}</div>
              <div className="cell-sub">Tenant: {selected.tenant?.full_name}</div>
              <div className="cell-sub">Intended vacate: <strong>{selected.intended_vacate_date}</strong> · Notice period: {selected.notice_period_days} days · Required 30d {selected.notice_period_met ? 'met' : 'NOT MET'}</div>
            </div>
            {selected.reason && <div><strong>Reason:</strong> {selected.reason}</div>}
            {selected.notes && <div className="cell-sub" style={{ fontSize: 12.5 }}>{selected.notes}</div>}
            {(selected.status === 'submitted' || selected.status === 'acknowledged') && (
              <Field label="Exit inspection date" required><Input type="date" value={scheduleForm.exit_inspection_date} onChange={(e) => setScheduleForm({ exit_inspection_date: e.target.value })} /></Field>
            )}
          </div>
        </Drawer>
      )}
    </>
  );
}
