import React from 'react';
import { AlertCircle, Clock, CheckCircle } from 'lucide-react';
import api from '../../services/api';
import { actIcons } from './CRMComponents';
import { useToast } from '../../context/ToastContext';

const ActivitiesTab = ({ activities, onRefresh }) => {
  const toast = useToast();
  const overdue = activities.filter(a => !a.is_done && a.due_date && new Date(a.due_date) < new Date());
  const pending = activities.filter(a => !a.is_done && (!a.due_date || new Date(a.due_date) >= new Date()));
  const done = activities.filter(a => a.is_done);

  const complete = async (id) => {
    const outcome = window.prompt('What was the outcome?') || '';
    try { await api.patch(`/crm/activities/${id}/complete`, { outcome }); onRefresh(); }
    catch { toast.error('Failed'); }
  };

  const Row = ({ a }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 1rem', borderBottom: '1px solid var(--border)', opacity: a.is_done ? 0.5 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
        <span style={{ fontSize: '1rem' }}>{actIcons[a.type]}</span>
        <div>
          <p style={{ fontWeight: '600', fontSize: '0.85rem' }}>{a.subject}</p>
          {a.description && <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{a.description}</p>}
          {a.outcome && <p style={{ fontSize: '0.72rem', color: '#10b981' }}>→ {a.outcome}</p>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        {a.due_date && <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{new Date(a.due_date).toLocaleDateString()}</span>}
        {!a.is_done && <button onClick={() => complete(a.id)} style={{ padding: '3px 8px', fontSize: '0.62rem', background: '#10b98115', color: '#10b981', border: '1px solid #10b98130', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><CheckCircle size={10} /> Done</button>}
        {a.is_done && <CheckCircle size={14} color="#10b981" />}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      {overdue.length > 0 && (
        <div className="glass-morphism" style={{ borderTop: '3px solid #ef4444' }}>
          <div style={{ padding: '0.8rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} color="#ef4444" /><span style={{ fontWeight: '700', color: '#ef4444', fontSize: '0.85rem' }}>Overdue ({overdue.length})</span>
          </div>
          {overdue.map(a => <Row key={a.id} a={a} />)}
        </div>
      )}
      <div className="glass-morphism">
        <div style={{ padding: '0.8rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={16} color="var(--text-dim)" /><span style={{ fontWeight: '700', fontSize: '0.85rem' }}>Pending ({pending.length})</span>
        </div>
        {pending.length === 0 ? <p style={{ padding: '1.5rem', color: 'var(--text-dim)', fontSize: '0.82rem', textAlign: 'center' }}>No pending activities. Log one from a lead's side panel.</p>
          : pending.map(a => <Row key={a.id} a={a} />)}
      </div>
      {done.length > 0 && (
        <div className="glass-morphism">
          <div style={{ padding: '0.8rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={16} color="#10b981" /><span style={{ fontWeight: '700', fontSize: '0.85rem' }}>Completed ({done.length})</span>
          </div>
          {done.slice(0, 15).map(a => <Row key={a.id} a={a} />)}
        </div>
      )}
    </div>
  );
};

export default ActivitiesTab;
