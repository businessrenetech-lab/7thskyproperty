import React, { useEffect, useState } from 'react';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { Button, Field, Select, Textarea } from '../../../ui/kit';

const LEVELS = [['strong', 'Strong'], ['adequate', 'Adequate'], ['weak', 'Weak'], ['unknown', 'Not assessed']];
const CRITERIA = [['readiness', 'Buyer readiness'], ['investment_capability', 'Investment capability'], ['financing_feasibility', 'Financing feasibility'], ['operational_capability', 'Operational capability']];
const parse = (v) => { if (v && typeof v === 'object') return v; try { return JSON.parse(v || '{}') || {}; } catch { return {}; } };

/** Business Purchase SOP Step 2 — acquisition suitability of the buyer. */
export default function BuyerSuitabilityCard({ mandate, onSaved }) {
  const toast = useToast();
  const [s, setS] = useState({});
  useEffect(() => { setS({ verdict: 'pending', notes: '', ...parse(mandate.suitability) }); }, [mandate]);
  const save = async () => {
    try { await api.put(`/buyer-mandates/${mandate.id}`, { suitability: { ...s, assessed_at: new Date().toISOString() } }); toast.success('Suitability saved'); onSaved?.(); }
    catch (e) { toast.error(e.response?.data?.error || 'Save failed'); }
  };
  return (
    <div className="card" style={{ padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Acquisition suitability</h3>
        <Button size="sm" onClick={save}>Save</Button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 10 }}>
        {CRITERIA.map(([k, l]) => (
          <Field key={k} label={l}><Select value={s[k] || 'unknown'} onChange={(e) => setS({ ...s, [k]: e.target.value })}>{LEVELS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</Select></Field>
        ))}
        <Field label="Verdict"><Select value={s.verdict} onChange={(e) => setS({ ...s, verdict: e.target.value })}><option value="pending">Pending</option><option value="suitable">Suitable</option><option value="conditional">Suitable with conditions</option><option value="not_suitable">Not suitable</option></Select></Field>
      </div>
      <Field label="Notes"><Textarea rows={2} value={s.notes} onChange={(e) => setS({ ...s, notes: e.target.value })} /></Field>
    </div>
  );
}
