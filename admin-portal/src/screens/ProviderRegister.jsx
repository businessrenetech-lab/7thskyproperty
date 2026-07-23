import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, AlertTriangle, Plus, Trash2, FileText, HardHat } from 'lucide-react';
import axios from 'axios';
import { Spinner, Button, Field, Input, Textarea } from '../ui/kit';
import FileUpload from '../ui/FileUpload';

// Public page — a provider opens /provider-register/:token, no login.
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

export default function ProviderRegister() {
  const { token } = useParams();
  const [cfg, setCfg] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ bank_details: {} });
  const [docs, setDocs] = useState([]);
  const [caps, setCaps] = useState([]);
  const [newDoc, setNewDoc] = useState({ doc_category: 'kyc', title: '', file_url: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/public-provider/${token}`);
        setCfg(data.data);
        setForm((s) => ({ ...s, company_name: data.data.company_name, contact_person: data.data.contact_person, phone: data.data.phone, email: data.data.email }));
        if (data.data.submitted) setDone(true);
      } catch (e) { setError(e.response?.data?.error || 'This link is invalid or has expired.'); }
    })();
  }, [token]);

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const setBank = (k, v) => setForm((s) => ({ ...s, bank_details: { ...s.bank_details, [k]: v } }));
  const uploader = async (file) => { const fd = new FormData(); fd.append('file', file); const { data } = await api.post(`/uploads/registration/${token}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }); return data.data.url; };
  const addDoc = () => { if (!newDoc.title || !newDoc.file_url) return; setDocs((d) => [...d, newDoc]); setNewDoc({ doc_category: newDoc.doc_category, title: '', file_url: '' }); };
  const toggleCap = (id) => setCaps((c) => c.includes(id) ? c.filter((x) => x !== id) : [...c, id]);

  const submit = async () => {
    setBusy(true);
    try { await api.post(`/public-provider/${token}`, { ...form, documents: docs, category_ids: caps }); setDone(true); }
    catch (e) { alert(e.response?.data?.error || 'Submission failed'); } finally { setBusy(false); }
  };

  const Shell = ({ children }) => (
    <div style={{ minHeight: '100vh', background: '#f4f7fb', padding: '32px 16px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(140deg,#12b6f3,#003768)', display: 'grid', placeItems: 'center', color: '#fff' }}><HardHat size={20} /></div>
          <div><div style={{ fontWeight: 800, fontSize: 16 }}>Seventh Sky Property Care</div><div style={{ fontSize: 12, color: '#5c6c84' }}>Service Provider Registration</div></div>
        </div>
        {children}
      </div>
    </div>
  );

  if (error) return <Shell><div className="card" style={{ padding: 28, textAlign: 'center' }}><AlertTriangle size={30} color="var(--danger)" /><h3>Link unavailable</h3><p className="cell-sub">{error}</p></div></Shell>;
  if (!cfg) return <Shell><div className="card" style={{ padding: 40, textAlign: 'center' }}><Spinner /></div></Shell>;
  if (done) return <Shell><div className="card" style={{ padding: 32, textAlign: 'center' }}><div style={{ width: 54, height: 54, borderRadius: 16, background: 'var(--success-bg)', color: 'var(--success)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}><Check size={26} /></div><h3 style={{ margin: 0 }}>Registration submitted</h3><p className="cell-sub">Seventh Sky will verify your details and send your service agreement for signing. Your account activates once the agreement is signed.</p></div></Shell>;

  return (
    <Shell>
      <div className="card" style={{ padding: 22, marginBottom: 14 }}>
        <h4 className="form-section-title" style={{ marginTop: 0 }}>Business details</h4>
        <div className="form-grid">
          <Field label="Company / business name" required><Input value={form.company_name || ''} onChange={(e) => set('company_name', e.target.value)} /></Field>
          <Field label="Contact person"><Input value={form.contact_person || ''} onChange={(e) => set('contact_person', e.target.value)} /></Field>
          <Field label="Phone"><Input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Email"><Input value={form.email || ''} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="Trade licence no."><Input value={form.trade_licence_no || ''} onChange={(e) => set('trade_licence_no', e.target.value)} /></Field>
          <Field label="Company registration no."><Input value={form.company_reg_no || ''} onChange={(e) => set('company_reg_no', e.target.value)} /></Field>
          <Field label="TIN"><Input value={form.tin || ''} onChange={(e) => set('tin', e.target.value)} /></Field>
          <Field label="BIN"><Input value={form.bin || ''} onChange={(e) => set('bin', e.target.value)} /></Field>
        </div>
        <Field label="Address"><Textarea rows={2} value={form.address || ''} onChange={(e) => set('address', e.target.value)} /></Field>
      </div>

      <div className="card" style={{ padding: 22, marginBottom: 14 }}>
        <h4 className="form-section-title" style={{ marginTop: 0 }}>Payment details</h4>
        <div className="form-grid">
          <Field label="Bank name"><Input value={form.bank_details.bank_name || ''} onChange={(e) => setBank('bank_name', e.target.value)} /></Field>
          <Field label="Account name"><Input value={form.bank_details.account_name || ''} onChange={(e) => setBank('account_name', e.target.value)} /></Field>
          <Field label="Account number"><Input value={form.bank_details.account_number || ''} onChange={(e) => setBank('account_number', e.target.value)} /></Field>
          <Field label="bKash / Nagad"><Input value={form.bank_details.bkash || ''} onChange={(e) => setBank('bkash', e.target.value)} /></Field>
        </div>
      </div>

      <div className="card" style={{ padding: 22, marginBottom: 14 }}>
        <h4 className="form-section-title" style={{ marginTop: 0 }}>Services you provide</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(cfg.capability_categories || []).map((c) => (
            <button key={c.id} type="button" onClick={() => toggleCap(c.id)} className="pm-pill" style={{ background: caps.includes(c.id) ? 'var(--primary-50)' : 'var(--surface-2)', borderColor: caps.includes(c.id) ? 'var(--primary)' : 'var(--border)', color: caps.includes(c.id) ? 'var(--primary-700)' : 'var(--text)', border: '1px solid', padding: '7px 13px', borderRadius: 20, cursor: 'pointer', fontWeight: 600, fontSize: 12.5 }}>
              {caps.includes(c.id) ? '✓ ' : ''}{c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 22, marginBottom: 14 }}>
        <h4 className="form-section-title" style={{ marginTop: 0 }}>Documents (KYC, licence, insurance)</h4>
        {docs.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px dashed var(--border)', fontSize: 13 }}>
            <FileText size={14} color="var(--primary)" /><span style={{ flex: 1 }}>{d.title} <span className="cell-sub">· {d.doc_category}</span></span>
            <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDocs((x) => x.filter((_, idx) => idx !== i))}><Trash2 size={13} /></button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <select className="select" style={{ width: 150 }} value={newDoc.doc_category} onChange={(e) => setNewDoc((s) => ({ ...s, doc_category: e.target.value }))}>
            <option value="kyc">KYC / ID</option><option value="compliance">Licensing</option><option value="insurance">Insurance</option><option value="certification">Certification</option>
          </select>
          <Input style={{ flex: 1, minWidth: 140 }} placeholder="Document title" value={newDoc.title} onChange={(e) => setNewDoc((s) => ({ ...s, title: e.target.value }))} />
          <div style={{ flex: 1, minWidth: 200 }}><FileUpload compact value={newDoc.file_url} onChange={(url) => setNewDoc((s) => ({ ...s, file_url: url }))} uploader={uploader} /></div>
          <Button size="sm" icon={Plus} onClick={addDoc} disabled={!newDoc.title || !newDoc.file_url}>Add</Button>
        </div>
      </div>

      <div className="card" style={{ padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Button onClick={submit} disabled={busy || !form.company_name}>{busy ? <Spinner /> : 'Submit registration'}</Button></div>
      </div>
    </Shell>
  );
}
