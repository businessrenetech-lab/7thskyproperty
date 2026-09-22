import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { websiteApi } from '../services/api';

/** "Request full details" — starts the NDA flow for a confidential business listing. */
export default function BusinessNdaRequest({ propertyId }) {
  const [f, setF] = useState({ full_name: '', email: '', phone: '', company: '' });
  const [state, setState] = useState({ busy: false, done: '', error: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true, done: '', error: '' });
    try {
      const r = await websiteApi.requestBusinessNda(propertyId, f);
      setState({ busy: false, done: r.message || 'Request received.', error: '' });
    } catch (err) {
      setState({ busy: false, done: '', error: err.message || 'Could not send your request.' });
    }
  };
  if (state.done) return <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-800">{state.done}</div>;
  return (
    <form onSubmit={submit} className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
      <div className="flex items-center gap-2 font-bold text-[#012a4e]"><Lock className="w-4 h-4" /> Request full details</div>
      <p className="text-xs text-slate-500">This is a confidential listing. We verify each buyer, then send a confidentiality agreement to sign electronically. Full details follow once it is signed.</p>
      <input required className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="Full name" value={f.full_name} onChange={set('full_name')} />
      <input required type="email" className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="Email" value={f.email} onChange={set('email')} />
      <input className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="Phone" value={f.phone} onChange={set('phone')} />
      <input className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="Company (optional)" value={f.company} onChange={set('company')} />
      {state.error && <div className="text-xs text-red-600">{state.error}</div>}
      <button disabled={state.busy} className="w-full rounded-xl bg-[#012a4e] text-white text-sm font-bold py-2.5 disabled:opacity-60">{state.busy ? 'Sending…' : 'Request details'}</button>
    </form>
  );
}
