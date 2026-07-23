import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { Spinner, Button, Input, Textarea } from '../ui/kit';

/* Public employer reference — /reference/:token, no login. Fixed Yes/No
   questions; conditional salary amount; single submit. */
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

export default function EmployerReference() {
  const { token } = useParams();
  const [cfg, setCfg] = useState(null);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState({});
  const setA = (k, v) => setAnswers((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/public-party/reference/${token}`);
        setCfg(data.data);
        if (data.data.already_submitted) setDone('This reference has already been submitted. Thank you for your time.');
      } catch (e) { setError(e.response?.data?.error || 'This link is invalid.'); }
    })();
  }, [token]);

  const submit = async () => {
    setBusy(true);
    try { const { data } = await api.post(`/public-party/reference/${token}`, { answers }); setDone(data.message); }
    catch (e) { setError(e.response?.data?.error || 'Submission failed.'); setBusy(false); }
  };

  const Shell = ({ children }) => (
    <div style={{ minHeight: '100vh', background: '#f6f8fb', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 14px' }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ display: 'inline-grid', placeItems: 'center', width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#003768,#12b6f3)', color: '#fff', fontWeight: 800, fontSize: 18 }}>7S</div>
          <div style={{ fontWeight: 800, marginTop: 8 }}>Seventh Sky Property Care</div>
          <div style={{ fontSize: 12.5, color: '#64748b' }}>Employment reference</div>
        </div>
        {children}
      </div>
    </div>
  );

  if (error) return <Shell><div className="card" style={{ padding: 24, textAlign: 'center' }}><AlertTriangle size={28} color="#dc2626" /><h3>Link unavailable</h3><p className="cell-sub">{error}</p></div></Shell>;
  if (!cfg) return <Shell><div className="card" style={{ padding: 40, textAlign: 'center' }}><Spinner /></div></Shell>;
  if (done) return <Shell><div className="card" style={{ padding: 28, textAlign: 'center' }}><Check size={36} color="#16a34a" /><h3 style={{ margin: '10px 0 6px' }}>Thank you!</h3><p className="cell-sub" style={{ margin: 0 }}>{done}</p></div></Shell>;

  const YesNo = ({ k }) => (
    <div style={{ display: 'flex', gap: 8 }}>
      {['yes', 'no'].map((v) => (
        <button key={v} type="button" onClick={() => setA(k, v)}
          style={{ padding: '7px 22px', borderRadius: 999, fontWeight: 700, fontSize: 13, cursor: 'pointer', border: '1px solid', borderColor: answers[k] === v ? (v === 'yes' ? '#15803d' : '#b91c1c') : '#e2e8f0', background: answers[k] === v ? (v === 'yes' ? '#dcfce7' : '#fee2e2') : '#fff', color: answers[k] === v ? (v === 'yes' ? '#15803d' : '#b91c1c') : '#64748b' }}>
          {v === 'yes' ? 'Yes' : 'No'}
        </button>
      ))}
    </div>
  );

  return (
    <Shell>
      <div className="card" style={{ padding: 20 }}>
        <p style={{ marginTop: 0, fontSize: 14 }}>
          <strong>{cfg.applicant_name}</strong> has applied for a rental property managed by Seventh Sky Property Care and listed you as their employment reference{cfg.company ? <> at <strong>{cfg.company}</strong></> : null}. Could you kindly confirm a few details? It takes about a minute and is treated confidentially.
        </p>
        {cfg.questions.map((q) => (
          <div key={q.key} style={{ padding: '12px 0', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>{q.label}</div>
            {q.type === 'choice' ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {q.options.map((o) => (
                  <button key={o} type="button" onClick={() => setA(q.key, o)}
                    style={{ padding: '7px 16px', borderRadius: 999, fontWeight: 700, fontSize: 13, cursor: 'pointer', border: '1px solid', borderColor: answers[q.key] === o ? '#003768' : '#e2e8f0', background: answers[q.key] === o ? '#eff6ff' : '#fff', color: answers[q.key] === o ? '#003768' : '#64748b' }}>{o}</button>
                ))}
              </div>
            ) : <YesNo k={q.key} />}
            {q.type === 'yes_no_amount' && answers[q.key] === 'no' && (
              <div style={{ marginTop: 8, maxWidth: 240 }}>
                <Input type="number" placeholder="If not, what is their monthly salary? (৳)" value={answers.salary_actual || ''} onChange={(e) => setA('salary_actual', e.target.value)} />
              </div>
            )}
          </div>
        ))}
        <div style={{ padding: '12px 0', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>Any comments? (optional)</div>
          <Textarea rows={2} value={answers.comments || ''} onChange={(e) => setA('comments', e.target.value)} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <Button onClick={submit} disabled={busy}>{busy ? <Spinner /> : 'Submit reference'}</Button>
        </div>
      </div>
    </Shell>
  );
}
