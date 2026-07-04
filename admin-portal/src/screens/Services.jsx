import React, { useEffect, useState } from 'react';
import { Layers, Workflow, EyeOff } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Drawer, Badge, Spinner, KV, EmptyState } from '../ui/kit';

export default function Services() {
  const toast = useToast();
  const [verticals, setVerticals] = useState([]); const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(null); const [workflows, setWorkflows] = useState(null);
  const [registers, setRegisters] = useState(null);

  useEffect(() => {
    (async () => {
      try { const { data } = await api.get('/services/verticals'); setVerticals(data.data || []); }
      catch { toast.error('Failed to load services'); } finally { setLoading(false); }
    })();
  }, [toast]);

  const open = async (v) => {
    setSel(v); setWorkflows(null); setRegisters(null);
    try { const { data } = await api.get(`/services/workflows?vertical_key=${v.vertical_key}`); setWorkflows(data.data || []); }
    catch { setWorkflows([]); }
    try { const { data } = await api.get(`/services/registers?vertical_key=${v.vertical_key}`); setRegisters(data.data || []); }
    catch { setRegisters([]); }
  };

  const parse = (j) => { try { return typeof j === 'string' ? JSON.parse(j) : (j || []); } catch { return []; } };

  if (loading) return <div style={{ padding: 48 }}><Spinner /></div>;

  return (
    <>
      <PageHead title="Services" desc="Every Seventh Sky service line and its full operational workflow." />
      {!verticals.length ? <div className="card"><EmptyState icon={Layers} title="No service lines yet" /></div> : (
        <div className="grid grid-3">
          {verticals.map((v) => (
            <div className="card card-pad" key={v.id} style={{ cursor: 'pointer' }} onClick={() => open(v)}>
              <div className="between" style={{ marginBottom: 10 }}>
                <div className="icon" style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--primary-50)', color: 'var(--primary)', display: 'grid', placeItems: 'center' }}><Layers size={20} /></div>
                {v.is_hidden ? <Badge tone="grey"><EyeOff size={11} /> Hidden</Badge> : <Badge tone="green" dot>Active</Badge>}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{v.name}</div>
              <div className="cell-sub" style={{ marginTop: 4 }}>Prefix: <span className="code-chip">{v.id_prefix}</span></div>
            </div>
          ))}
        </div>
      )}

      {sel && (
        <Drawer title={sel.name} onClose={() => setSel(null)} width={600}>
          <div className="wrap-gap" style={{ marginBottom: 14 }}>
            <span className="code-chip">{sel.vertical_key}</span>
            {sel.is_hidden ? <Badge tone="grey"><EyeOff size={11} /> Hidden at launch</Badge> : <Badge tone="green" dot>Active</Badge>}
          </div>
          <div className="form-section-title"><Workflow size={13} /> Workflow</div>
          {workflows == null ? <Spinner /> : !workflows.length ? (
            <p className="cell-sub">No workflow template configured yet. Workflows from the service workbooks will be loaded here (stages, checklists, required documents).</p>
          ) : workflows.map((w) => (
            <div key={w.id} style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{w.name}</div>
              {parse(w.stages).map((st, i) => (
                <div key={i} className="kv"><span className="k">{i + 1}. {st.name || st.key}</span><span className="v">{(st.checklist || []).length} checks</span></div>
              ))}
            </div>
          ))}
          <div className="form-section-title">Dashboards</div>
          <div className="wrap-gap">{parse(sel.dashboards).map((d) => <Badge key={d} tone="blue">{d}</Badge>)}</div>

          <div className="form-section-title">Registers {registers ? `(${registers.length})` : ''}</div>
          {registers == null ? <Spinner /> : !registers.length
            ? <p className="cell-sub">No registers configured for this vertical yet.</p>
            : <div className="wrap-gap">{registers.map((r) => <Badge key={r.id} tone="grey">{r.name}</Badge>)}</div>}
        </Drawer>
      )}
    </>
  );
}
