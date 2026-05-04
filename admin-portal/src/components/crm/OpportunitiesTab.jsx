import React, { useState } from 'react';
import { BarChart2, Trophy, Flame, ClipboardList, BookOpen, Calendar, Globe, CheckCircle, XCircle } from 'lucide-react';
import api from '../../services/api';
import { stageColors } from './CRMComponents';

const OpportunitiesTab = ({ opportunities, onRefresh }) => {
  const [saving, setSaving] = useState(null);
  const stages = ['qualification', 'proposal', 'demo', 'negotiation', 'won', 'lost'];

  const markWon = async (id) => {
    setSaving(id);
    try {
      const r = await api.post(`/crm/opportunities/${id}/win`);
      alert(`Deal Won! Invoice ${r.data.invoice?.invoice_no} created.`);
      onRefresh();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setSaving(null); }
  };

  const markLost = async (id) => {
    const reason = window.prompt('Reason for losing?');
    if (reason === null) return;
    try { await api.post(`/crm/opportunities/${id}/lose`, { lost_reason: reason }); onRefresh(); }
    catch { alert('Failed'); }
  };

  const totalPipeline = opportunities.filter(o => !['won','lost'].includes(o.stage)).reduce((s,o) => s + parseFloat(o.value||0), 0);
  const wonTotal = opportunities.filter(o => o.stage === 'won').reduce((s,o) => s + parseFloat(o.value||0), 0);
  const openCount = opportunities.filter(o => !['won','lost'].includes(o.stage)).length;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.8rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'PIPELINE VALUE', value: `৳${totalPipeline.toLocaleString()}`, color: '#3b82f6', icon: <BarChart2 size={28} /> },
          { label: 'WON REVENUE', value: `৳${wonTotal.toLocaleString()}`, color: '#10b981', icon: <Trophy size={28} /> },
          { label: 'OPEN DEALS', value: openCount, color: '#f59e0b', icon: <Flame size={28} /> },
          { label: 'TOTAL DEALS', value: opportunities.length, color: '#8b5cf6', icon: <ClipboardList size={28} /> },
        ].map(k => (
          <div key={k.label} style={{ padding: '1.2rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', borderTop: `3px solid ${k.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>{k.label}</p>
              <span style={{ opacity: 0.15, color: k.color }}>{k.icon}</span>
            </div>
            <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: k.color, marginTop: '0.3rem' }}>{k.value}</h3>
          </div>
        ))}
      </div>

      <div className="glass-morphism" style={{ padding: '1.2rem' }}>
        {opportunities.length === 0
          ? <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '3rem' }}>No deals yet. Enroll a lead to create an opportunity.</p>
          : stages.filter(s => opportunities.some(o => o.stage === s)).map(stage => (
            <div key={stage} style={{ marginBottom: '1.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: stageColors[stage] }} />
                <span style={{ fontSize: '0.7rem', fontWeight: '800', color: stageColors[stage], textTransform: 'uppercase' }}>{stage}</span>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>({opportunities.filter(o => o.stage === stage).length})</span>
              </div>
              {opportunities.filter(o => o.stage === stage).map(opp => (
                <div key={opp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1rem', border: '1px solid var(--border)', borderRadius: '10px', marginBottom: '0.5rem', borderLeft: `4px solid ${stageColors[stage]}` }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: '700', fontSize: '0.88rem' }}>{opp.title}</p>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.3rem', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><BookOpen size={12} /> {opp.course_interest || '—'}</span>
                      <span>{opp.probability}% prob</span>
                      {opp.expected_close && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} /> {new Date(opp.expected_close).toLocaleDateString()}</span>}
                    </div>
                    {opp.description?.includes('SSLCommerz') && <span style={{ fontSize: '0.6rem', background: '#10b98115', color: '#10b981', padding: '2px 6px', borderRadius: '6px', marginTop: '0.3rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Globe size={10} /> Website Purchase</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontWeight: '800', fontSize: '1rem', color: '#10b981' }}>৳{parseFloat(opp.value||0).toLocaleString()}</span>
                    {!['won','lost'].includes(opp.stage) && (
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button onClick={() => markWon(opp.id)} disabled={saving === opp.id} style={{ padding: '4px 10px', fontSize: '0.68rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><CheckCircle size={12} /> Won</button>
                        <button onClick={() => markLost(opp.id)} style={{ padding: '4px 10px', fontSize: '0.68rem', background: '#ef444415', color: '#ef4444', border: '1px solid #ef444430', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><XCircle size={12} /> Lost</button>
                      </div>
                    )}
                    {opp.stage === 'won' && <Trophy size={16} color="#10b981" />}
                  </div>
                </div>
              ))}
            </div>
          ))
        }
      </div>
    </div>
  );
};

export default OpportunitiesTab;
