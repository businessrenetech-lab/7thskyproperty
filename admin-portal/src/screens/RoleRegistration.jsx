import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, AlertTriangle, Plus, Trash2, FileText } from 'lucide-react';
import axios from 'axios';
import { Spinner, Button, Field, Input, Textarea } from '../ui/kit';

// Public page — vendor/buyer/supplier/landlord opens /register/:token, no login.
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

const FIELD_LABELS = {
  full_name: 'Full name', primary_phone: 'Mobile number', email: 'Email',
  national_id: 'NID number', passport_no: 'Passport number', tin: 'TIN',
  company_name: 'Company name', company_reg_no: 'Company registration no.',
  trade_licence_no: 'Trade licence no.', address_line1: 'Address',
  city: 'City', district: 'District', is_nrb: 'Living abroad (NRB)?',
  bank_name: 'Bank name', bank_branch: 'Bank branch', bank_account_name: 'Account holder name',
  bank_account_number: 'Account number', bank_routing_number: 'Routing number',
  bkash_number: 'bKash number', nagad_number: 'Nagad number',
};

export default function RoleRegistration() {
  const { token } = useParams();
  const [cfg, setCfg] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({});
  const [docs, setDocs] = useState([]);
  const [newDoc, setNewDoc] = useState({ title: '', file_url: '' });
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/public-party/register/${token}`);
        setCfg(data.data);
        setForm(data.data.prefill || {});
        if (data.data.already_submitted) setDone('This registration has already been submitted. Contact Seventh Sky to make changes.');
      } catch (e) {
        setError(e.response?.data?.error || 'This link is invalid or has expired.');
      }
    })();
  }, [token]);

  const submit = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/public-party/register/${token}`, { ...form, documents: docs, notes });
      setDone(data.message);
    } catch (e) {
      setError(e.response?.data?.error || 'Submission failed — please try again.');
      setBusy(false);
    }
  };

  const addDoc = () => {
    if (!newDoc.title || !newDoc.file_url) return;
    setDocs((d) => [...d, { ...newDoc, doc_type: newDoc.title.toLowerCase().replace(/[^a-z0-9]+/g, '_') }]);
    setNewDoc({ title: '', file_url: '' });
  };

  const Shell = ({ children }) => (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ width: '100%', maxWidth: 640 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ display: 'inline-grid', placeItems: 'center', width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,var(--primary),var(--accent))', color: '#fff', fontWeight: 800, fontSize: 18 }}>7S</div>
          <div style={{ fontWeight: 800, marginTop: 8 }}>Seventh Sky Property Care</div>
          {cfg && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{cfg.title}</div>}
        </div>
        {children}
      </div>
    </div>
  );

  if (error) return <Shell><div className="card" style={{ padding: 24, textAlign: 'center' }}><AlertTriangle size={28} color="var(--danger)" /><h3>Link unavailable</h3><p className="cell-sub">{error}</p></div></Shell>;
  if (!cfg) return <Shell><div className="card" style={{ padding: 40, textAlign: 'center' }}><Spinner /></div></Shell>;
  if (done) return <Shell><div className="card" style={{ padding: 28, textAlign: 'center' }}><Check size={36} color="var(--success)" /><h3 style={{ margin: '10px 0 6px' }}>Thank you!</h3><p className="cell-sub" style={{ margin: 0 }}>{done}</p></div></Shell>;

  return (
    <Shell>
      {cfg.property && (
        <div className="card" style={{ padding: 14, marginBottom: 14, fontSize: 13 }}>
          <strong>Related property:</strong> {cfg.property.title} · {[cfg.property.area, cfg.property.district].filter(Boolean).join(', ')}
        </div>
      )}

      <div className="card" style={{ padding: 20, marginBottom: 14 }}>
        <h4 className="form-section-title" style={{ marginTop: 0 }}>Your details</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {cfg.kyc_fields.map((f) => (
            <Field key={f} label={FIELD_LABELS[f] || f}>
              {f === 'is_nrb' ? (
                <select className="select" value={form[f] ? 'yes' : 'no'} onChange={(e) => setForm((s) => ({ ...s, [f]: e.target.value === 'yes' }))}>
                  <option value="no">No — living in Bangladesh</option>
                  <option value="yes">Yes — NRB</option>
                </select>
              ) : (
                <Input value={form[f] ?? ''} onChange={(e) => setForm((s) => ({ ...s, [f]: e.target.value }))} />
              )}
            </Field>
          ))}
        </div>
      </div>

      {cfg.bank_fields.length > 0 && (
        <div className="card" style={{ padding: 20, marginBottom: 14 }}>
          <h4 className="form-section-title" style={{ marginTop: 0 }}>Payment / disbursement details</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            {cfg.bank_fields.map((f) => (
              <Field key={f} label={FIELD_LABELS[f] || f}>
                <Input value={form[f] ?? ''} onChange={(e) => setForm((s) => ({ ...s, [f]: e.target.value }))} />
              </Field>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 20, marginBottom: 14 }}>
        <h4 className="form-section-title" style={{ marginTop: 0 }}>Documents</h4>
        <div className="cell-sub" style={{ fontSize: 12.5, marginBottom: 10 }}>
          Required: {cfg.required_documents.join(' · ')}<br />
          Upload your files to Google Drive / Dropbox and paste the share links below.
        </div>
        {docs.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px dashed var(--border)', fontSize: 13 }}>
            <FileText size={14} color="var(--primary)" />
            <span style={{ flex: 1 }}>{d.title}</span>
            <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDocs((x) => x.filter((_, idx) => idx !== i))}><Trash2 size={13} /></button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <select className="select" style={{ minWidth: 170 }} value={newDoc.title} onChange={(e) => setNewDoc((s) => ({ ...s, title: e.target.value }))}>
            <option value="">Document type…</option>
            {cfg.required_documents.map((d) => <option key={d} value={d}>{d}</option>)}
            <option value="Other">Other</option>
          </select>
          <Input style={{ flex: 1, minWidth: 200 }} placeholder="Paste file link…" value={newDoc.file_url} onChange={(e) => setNewDoc((s) => ({ ...s, file_url: e.target.value }))} />
          <Button size="sm" icon={Plus} onClick={addDoc}>Add</Button>
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <Field label="Anything else we should know?"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <Button onClick={submit} disabled={busy}>{busy ? <Spinner /> : 'Submit registration'}</Button>
        </div>
        <div className="cell-sub" style={{ fontSize: 11.5, marginTop: 10 }}>
          After review, Seventh Sky will send your agreement for electronic signing. Your role becomes active once the agreement is fully signed.
        </div>
      </div>
    </Shell>
  );
}
