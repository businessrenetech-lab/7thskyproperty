import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, PenLine, XCircle } from 'lucide-react';
import api from '../services/api';
import { Spinner, Button } from '../ui/kit';

export default function SignPage() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true });
  const [values, setValues] = useState({});
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try { const { data } = await api.get(`/sign/${token}`); setState({ loading: false, ...data.data }); }
      catch (e) { setState({ loading: false, error: e.response?.data?.error || 'Unable to load document.' }); }
    })();
  }, [token]);

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      const fields = (state.fields || []).map((f) => ({
        id: f.id,
        value: f.field_type === 'date_signed' ? new Date().toISOString().slice(0, 10) : (values[f.id] || ''),
      }));
      const { data } = await api.post(`/sign/${token}/sign`, { fields });
      setDone(data.message || 'Signed successfully.');
    } catch (e) { setErr(e.response?.data?.error || 'Could not submit.'); } finally { setBusy(false); }
  };

  const decline = async () => {
    const reason = prompt('Reason for declining (optional):') || '';
    try { await api.post(`/sign/${token}/decline`, { reason }); setDone('You have declined to sign.'); } catch { setErr('Failed to decline.'); }
  };

  if (state.loading) return <div className="center-screen"><Spinner /></div>;
  if (state.error) return <div className="center-screen"><div className="card card-pad" style={{ maxWidth: 460, textAlign: 'center' }}><XCircle size={40} color="var(--danger)" /><h2>{state.error}</h2></div></div>;
  if (done) return <div className="center-screen"><div className="card card-pad" style={{ maxWidth: 460, textAlign: 'center' }}><CheckCircle2 size={48} color="var(--success)" /><h2 style={{ marginTop: 12 }}>{done}</h2><p className="cell-sub">You may close this window.</p></div></div>;

  const { envelope, signer, fields = [] } = state;
  // Once this party has signed (or declined), there is nothing left to do here —
  // don't keep offering Sign / Decline on a signature that is already recorded.
  if (signer.status === 'signed' || signer.status === 'declined') {
    return (
      <div className="center-screen"><div className="card card-pad" style={{ maxWidth: 460, textAlign: 'center' }}>
        <CheckCircle2 size={48} color="var(--success)" />
        <h2 style={{ marginTop: 12 }}>You have already {signer.status} this document.</h2>
        <p className="cell-sub">No further action is needed. You may close this window.</p>
      </div></div>
    );
  }
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px 16px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <div className="row" style={{ marginBottom: 16 }}>
          <div className="logo" style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,var(--primary),var(--accent))', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800 }}>7S</div>
          <div><div style={{ fontWeight: 800 }}>Seventh Sky Property Care</div><div className="cell-sub">Secure document signing</div></div>
        </div>
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0 }}>{envelope.title}</h2>
          <p className="cell-sub">Signing as <b>{signer.name}</b> ({signer.role?.replace(/_/g, ' ')}) · {signer.email}</p>
          {envelope.message && <div className="card card-pad" style={{ background: 'var(--info-bg)', marginTop: 8 }}>{envelope.message}</div>}
        </div>
        <div className="card card-pad" style={{ marginBottom: 16 }} dangerouslySetInnerHTML={{ __html: envelope.document_html || '<p>No document content.</p>' }} />
        <div className="card card-pad">
          <h3 style={{ marginTop: 0 }}><PenLine size={16} /> Your signature fields</h3>
          {fields.map((f) => (
            <div className="field" key={f.id}>
              <label>{f.label || f.field_type}{f.required && <span className="req"> *</span>}</label>
              {f.field_type === 'date_signed'
                ? <input className="input" value={new Date().toISOString().slice(0, 10)} disabled />
                : f.field_type === 'checkbox'
                  ? <input type="checkbox" checked={!!values[f.id]} onChange={(e) => setValues({ ...values, [f.id]: e.target.checked ? 'checked' : '' })} />
                  : <input className="input" placeholder={f.field_type === 'signature' ? 'Type your full name to sign' : ''} value={values[f.id] || ''} onChange={(e) => setValues({ ...values, [f.id]: e.target.value })} style={f.field_type === 'signature' ? { fontFamily: 'cursive', fontSize: 20 } : undefined} />}
            </div>
          ))}
          {err && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{err}</div>}
          <div className="row" style={{ marginTop: 8 }}>
            <Button onClick={submit} disabled={busy}>{busy ? <Spinner /> : 'Sign & Submit'}</Button>
            <Button variant="ghost" onClick={decline}>Decline</Button>
          </div>
          <p className="cell-sub" style={{ marginTop: 12 }}>By signing, you agree this electronic signature is legally binding. Your IP and timestamp are recorded for audit.</p>
        </div>
      </div>
    </div>
  );
}
