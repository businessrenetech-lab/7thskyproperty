import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Upload, ShieldCheck, FileText, PenLine, Trash2, Circle, Clock, Landmark } from 'lucide-react';
import api from '../services/api';
import { Spinner, Button } from '../ui/kit';

/* Smart Agreement + KYC intake — one token walks the signer through
   uploading their KYC documents, reviewing the agreement, and signing. */

const STATUS_STYLE = {
  missing:              { label: 'Not uploaded', bg: '#f1f5f9', fg: '#64748b' },
  submitted:            { label: 'Uploaded',     bg: '#e0f2fe', fg: '#0369a1' },
  verified:             { label: 'Verified',     bg: '#dcfce7', fg: '#15803d' },
  rejected:             { label: 'Rejected',     bg: '#fee2e2', fg: '#b91c1c' },
  needs_resubmission:   { label: 'Re-upload',    bg: '#fef3c7', fg: '#b45309' },
  expired:              { label: 'Expired',      bg: '#fee2e2', fg: '#b91c1c' },
};

function Pill({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.missing;
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 999, background: s.bg, color: s.fg }}>{s.label}</span>;
}

function KycRow({ token, item, onChange }) {
  const [busy, setBusy] = useState('');
  const [ref, setRef] = useState(item.doc?.reference_no || '');
  const frontRef = useRef(); const backRef = useRef();

  const upload = async (file, side) => {
    if (!file) return;
    setBusy(side);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('document_type', item.document_type);
    fd.append('side', side);
    if (ref) fd.append('reference_no', ref);
    try { await api.post(`/intake/${token}/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }); await onChange(); }
    catch (e) { alert(e.response?.data?.error || 'Upload failed.'); } finally { setBusy(''); }
  };
  const remove = async () => {
    if (!item.doc || !window.confirm('Remove this document?')) return;
    setBusy('rm');
    try { await api.delete(`/intake/${token}/document/${item.doc.id}`); await onChange(); }
    catch (e) { alert(e.response?.data?.error || 'Could not remove.'); } finally { setBusy(''); }
  };

  const done = item.uploaded;
  return (
    <div style={{ border: '1px solid var(--border,#e5e7eb)', borderRadius: 12, padding: 14, marginBottom: 10, background: done ? '#fafffb' : '#fff' }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div>
          <div style={{ fontWeight: 700 }}>{item.label}{item.required && <span style={{ color: '#dc2626' }}> *</span>}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {item.required ? 'Required' : 'Optional'}{item.front_back ? ' · front & back' : ''}{item.expiry ? ' · has expiry' : ''}
          </div>
        </div>
        <Pill status={item.status} />
      </div>

      {item.reference && (
        <input className="input" placeholder="Reference / document number" value={ref} onChange={(e) => setRef(e.target.value)} style={{ marginTop: 10 }} />
      )}

      <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
        <input ref={frontRef} type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={(e) => upload(e.target.files[0], 'front')} />
        <Button variant={done ? 'ghost' : 'primary'} onClick={() => frontRef.current?.click()} disabled={!!busy}>
          {busy === 'front' ? <Spinner /> : <><Upload size={14} /> {item.doc?.file_url ? 'Replace' : 'Upload'}{item.front_back ? ' front' : ''}</>}
        </Button>
        {item.front_back && (
          <>
            <input ref={backRef} type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={(e) => upload(e.target.files[0], 'back')} />
            <Button variant="ghost" onClick={() => backRef.current?.click()} disabled={!!busy}>
              {busy === 'back' ? <Spinner /> : <><Upload size={14} /> {item.doc?.file_url_back ? 'Replace back' : 'Upload back'}</>}
            </Button>
          </>
        )}
        {item.doc && item.status !== 'verified' && (
          <Button variant="ghost" onClick={remove} disabled={!!busy} title="Remove"><Trash2 size={14} /></Button>
        )}
      </div>
      {item.doc?.status === 'rejected' && item.doc?.rejection_reason && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#b91c1c' }}>Reviewer: {item.doc.rejection_reason}</div>
      )}
    </div>
  );
}

export default function IntakePage() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true });
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({});
  const [fillValues, setFillValues] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);

  const load = async () => {
    const { data } = await api.get(`/intake/${token}`);
    setState({ loading: false, ...data.data });
    // Seed the signer-fill values once; keep any edits already made.
    setFillValues((prev) => { const fv = { ...prev }; (data.data.fill_fields || []).forEach((f) => { if (fv[f.key] === undefined) fv[f.key] = f.value || ''; }); return fv; });
    return data.data;
  };

  const saveDetails = async () => {
    setBusy(true); setErr('');
    try {
      const { data } = await api.post(`/intake/${token}/values`, { values: fillValues });
      setState((s) => ({ ...s, envelope: { ...s.envelope, document_html: data.data.document_html } }));
      setStep(step + 1);
    } catch (e) { setErr(e.response?.data?.error || 'Could not save your details.'); } finally { setBusy(false); }
  };
  useEffect(() => {
    (async () => { try { await load(); } catch (e) { setState({ loading: false, error: e.response?.data?.error || 'Unable to load your agreement.' }); } })();
  }, [token]);

  const kyc = state.kyc || {};
  const kycRequired = kyc.required_here;
  const fillFields = state.fill_fields || [];
  const hasFill = fillFields.length > 0;
  const steps = useMemo(() => [
    ...(hasFill ? [{ key: 'details', label: 'Your Details', icon: Landmark }] : []),
    ...(kycRequired ? [{ key: 'kyc', label: 'Your Documents', icon: ShieldCheck }] : []),
    { key: 'review', label: 'Review Agreement', icon: FileText },
    { key: 'sign', label: 'Sign', icon: PenLine },
  ], [kycRequired, hasFill]);
  const current = steps[step]?.key;

  const stepStatus = (i) => {
    if (i < step) return 'done';
    if (i === step) return 'active';
    return 'todo';
  };

  const sign = async () => {
    setBusy(true); setErr('');
    try {
      const fields = (state.fields || []).map((f) => ({ id: f.id, value: f.field_type === 'date_signed' ? new Date().toISOString().slice(0, 10) : (values[f.id] || '') }));
      const { data } = await api.post(`/intake/${token}/sign`, { fields });
      setDone(data.message || 'Signed successfully.');
    } catch (e) {
      const d = e.response?.data;
      setErr(d?.error || 'Could not submit.');
      if (d?.missing && kycRequired) setStep(0); // bounce back to documents
    } finally { setBusy(false); }
  };

  if (state.loading) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><Spinner /></div>;
  if (state.error) return <Centered icon={<XCircle size={44} color="#dc2626" />} title={state.error} />;
  if (done) return <Centered icon={<CheckCircle2 size={52} color="#16a34a" />} title={done} sub="Thank you. You may close this window — we'll be in touch as your submission is reviewed." />;
  if (state.signer?.status === 'signed') return <Centered icon={<CheckCircle2 size={52} color="#16a34a" />} title="You've already completed this agreement." sub="No further action is needed." />;

  const { envelope, signer } = state;
  const missingRequired = (kyc.items || []).filter((i) => i.required && !i.uploaded).length;

  return (
    <div style={{ minHeight: '100vh', background: '#f6f8fb' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#003768,#0b5fa5)', color: '#fff', padding: '18px 20px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,.15)', display: 'grid', placeItems: 'center', fontWeight: 800 }}>7S</div>
          <div>
            <div style={{ fontWeight: 800 }}>Seventh Sky Property Care</div>
            <div style={{ fontSize: 12, opacity: .85 }}>{envelope.title}</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 12, opacity: .9, textAlign: 'right' }}>
            <div>Signing as <b>{signer.name}</b></div>
            <div style={{ textTransform: 'capitalize' }}>{(envelope.kyc_role || signer.role || '').replace(/_/g, ' ')}</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: 20, display: 'grid', gridTemplateColumns: '250px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Progress rail */}
        <div className="card" style={{ padding: 16, position: 'sticky', top: 20 }}>
          {steps.map((s, i) => {
            const st = stepStatus(i); const Icon = s.icon;
            return (
              <div key={s.key} onClick={() => i <= step && setStep(i)} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 8px', borderRadius: 10, cursor: i <= step ? 'pointer' : 'default', background: st === 'active' ? '#eff6ff' : 'transparent' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', background: st === 'done' ? '#dcfce7' : st === 'active' ? '#003768' : '#f1f5f9', color: st === 'done' ? '#16a34a' : st === 'active' ? '#fff' : '#94a3b8' }}>
                  {st === 'done' ? <CheckCircle2 size={16} /> : <Icon size={15} />}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: st === 'todo' ? '#94a3b8' : '#0f172a' }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Step {i + 1}</div>
                </div>
              </div>
            );
          })}
          {kycRequired && (
            <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: '#f8fafc', fontSize: 12, color: '#475569' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontWeight: 700, color: '#0f172a' }}><ShieldCheck size={13} /> KYC {envelope.kyc_policy === 'strict' ? '(required to sign)' : 'verification'}</div>
              <div style={{ marginTop: 4 }}>{kyc.verified_count}/{kyc.required_count} verified · {missingRequired} required left</div>
            </div>
          )}
        </div>

        {/* Step content */}
        <div>
          {current === 'details' && (
            <div className="card" style={{ padding: 20 }}>
              <h2 style={{ marginTop: 0 }}>Your details</h2>
              <p style={{ color: '#64748b', marginTop: 4 }}>Please complete the fields below. They will be added to your agreement before you sign.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                {fillFields.map((f) => (
                  <div key={f.key} style={{ gridColumn: f.type === 'textarea' ? '1 / -1' : 'auto' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>{f.label}</label>
                    {f.type === 'textarea'
                      ? <textarea className="input" rows={3} value={fillValues[f.key] || ''} onChange={(e) => setFillValues({ ...fillValues, [f.key]: e.target.value })} />
                      : <input className="input" type={['date', 'number', 'email'].includes(f.type) ? f.type : 'text'} value={fillValues[f.key] || ''} onChange={(e) => setFillValues({ ...fillValues, [f.key]: e.target.value })} />}
                  </div>
                ))}
              </div>
              {err && <div style={{ color: '#b91c1c', fontSize: 13, marginTop: 10 }}>{err}</div>}
              <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
                <Button onClick={saveDetails} disabled={busy}>{busy ? <Spinner /> : 'Save & continue'}</Button>
              </div>
            </div>
          )}

          {current === 'kyc' && (
            <div className="card" style={{ padding: 20 }}>
              <h2 style={{ marginTop: 0 }}>Upload your documents</h2>
              <p style={{ color: '#64748b', marginTop: 4 }}>
                Please upload the documents below. They are stored securely and used only to verify your identity for this agreement.
                {envelope.kyc_policy === 'strict' && <b> All required (*) documents must be uploaded before you can sign.</b>}
              </p>
              {(kyc.items || []).map((it) => <KycRow key={it.document_type} token={token} item={it} onChange={load} />)}
              <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
                <Button onClick={() => setStep(step + 1)} disabled={envelope.kyc_policy === 'strict' && missingRequired > 0}>
                  Continue to review
                </Button>
              </div>
              {envelope.kyc_policy === 'strict' && missingRequired > 0 && (
                <div style={{ textAlign: 'right', fontSize: 12, color: '#b45309', marginTop: 6 }}>Upload the {missingRequired} remaining required document(s) to continue.</div>
              )}
            </div>
          )}

          {current === 'review' && (
            <div className="card" style={{ padding: 20 }}>
              <h2 style={{ marginTop: 0 }}>Review your agreement</h2>
              <p style={{ color: '#64748b', marginTop: 4 }}>Please read the agreement carefully before signing.</p>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, maxHeight: 520, overflow: 'auto', background: '#fff' }}
                dangerouslySetInnerHTML={{ __html: envelope.document_html || '<p>No content.</p>' }} />
              <div className="row" style={{ justifyContent: 'space-between', marginTop: 14 }}>
                {step > 0 ? <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button> : <span />}
                <Button onClick={() => setStep(step + 1)}>Continue to sign</Button>
              </div>
            </div>
          )}

          {current === 'sign' && (
            <div className="card" style={{ padding: 20 }}>
              <h2 style={{ marginTop: 0 }}>Sign the agreement</h2>
              <p style={{ color: '#64748b', marginTop: 4 }}>Type your full legal name to apply your electronic signature.</p>
              {(state.fields || []).map((f) => (
                <div className="field" key={f.id} style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>{f.label || f.field_type}{f.required && <span style={{ color: '#dc2626' }}> *</span>}</label>
                  {f.field_type === 'date_signed'
                    ? <input className="input" value={new Date().toISOString().slice(0, 10)} disabled />
                    : <input className="input" placeholder={f.field_type === 'signature' ? 'Type your full name to sign' : ''} value={values[f.id] || ''} onChange={(e) => setValues({ ...values, [f.id]: e.target.value })} style={f.field_type === 'signature' ? { fontFamily: 'cursive', fontSize: 22 } : undefined} />}
                </div>
              ))}
              {err && <div style={{ color: '#b91c1c', fontSize: 13, marginBottom: 10, padding: 10, background: '#fef2f2', borderRadius: 8 }}>{err}</div>}
              <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
                <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>
                <Button onClick={sign} disabled={busy}>{busy ? <Spinner /> : <><PenLine size={15} /> Sign & Submit</>}</Button>
              </div>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 14 }}>
                By signing, you confirm the information and documents you provided are accurate and that this electronic signature is legally binding. Your IP address and timestamp are recorded for audit.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Centered({ icon, title, sub }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f6f8fb', padding: 20 }}>
      <div className="card" style={{ padding: 32, maxWidth: 480, textAlign: 'center' }}>
        {icon}
        <h2 style={{ marginTop: 14 }}>{title}</h2>
        {sub && <p style={{ color: '#64748b' }}>{sub}</p>}
      </div>
    </div>
  );
}
