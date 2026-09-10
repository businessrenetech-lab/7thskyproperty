// admin-portal/src/screens/sales/BuyerMandateDetail.jsx
//
// One buyer mandate: the requirements brief + the shortlist of candidate
// properties. Convert a shortlisted candidate into a property-linked buy deal.
import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { PageHead, StatusBadge, Drawer, Field, Input, Select, Textarea, Button, Spinner, Badge, KV } from '../../ui/kit';
import { Combo } from '../../ui/pickers';
import { propertyFilePath } from './paths';

const money = (v) => (v == null || v === '' ? '—' : 'BDT ' + Number(v).toLocaleString());
const propLabel = (p) => `${p.title} (${p.property_code || p.area || ''})`;
const CAND_STATUS = ['shortlisted', 'viewing', 'rejected'];

export default function BuyerMandateDetail({ category = 'residential' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [m, setM] = useState(null); const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(false); const [ef, setEf] = useState({});
  const [addOpen, setAddOpen] = useState(false); const [addF, setAddF] = useState({ property_id: null, fit_note: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get(`/buyer-mandates/${id}`); setM(data.data); }
    catch { toast.error('Failed to load mandate'); } finally { setLoading(false); }
  }, [id, toast]);
  useEffect(() => { load(); }, [load]);

  const saveEdit = async () => {
    try { await api.put(`/buyer-mandates/${id}`, ef); toast.success('Updated'); setEdit(false); load(); }
    catch (e) { toast.error(e.response?.data?.error || 'Update failed'); }
  };
  const setStatus = async (status) => {
    let cancel_reason;
    if (status === 'cancelled') { cancel_reason = window.prompt('Reason for cancelling this mandate:'); if (!cancel_reason || !cancel_reason.trim()) return; }
    try { await api.put(`/buyer-mandates/${id}`, { status, cancel_reason: cancel_reason?.trim() }); toast.success(`Marked ${status}`); load(); }
    catch (e) { toast.error(e.response?.data?.error || 'Update failed'); }
  };
  const addCandidate = async () => {
    if (!addF.property_id) return toast.error('Pick a property');
    try { await api.post(`/buyer-mandates/${id}/candidates`, addF); toast.success('Added to shortlist'); setAddOpen(false); setAddF({ property_id: null, fit_note: '' }); load(); }
    catch (e) { toast.error(e.response?.data?.error || 'Add failed'); }
  };
  const patchCand = async (cid, patch) => {
    try { await api.patch(`/buyer-mandates/candidates/${cid}`, patch); load(); }
    catch (e) { toast.error(e.response?.data?.error || 'Update failed'); }
  };
  const removeCand = async (cid) => {
    if (!window.confirm('Remove this candidate from the shortlist?')) return;
    try { await api.delete(`/buyer-mandates/candidates/${cid}`); load(); }
    catch (e) { toast.error(e.response?.data?.error || 'Remove failed'); }
  };
  const convert = async (cid) => {
    if (!window.confirm('Convert this shortlisted property into a buy deal?')) return;
    try {
      const { data } = await api.post(`/buyer-mandates/${id}/candidates/${cid}/convert`);
      toast.success(`Buy deal ${data.data.deal.deal_code} created`);
      load();
    } catch (e) { toast.error(e.response?.data?.error || 'Convert failed'); }
  };

  if (loading || !m) return <div className="card-pad"><Spinner /></div>;
  const openEdit = () => { setEf({ budget_min: m.budget_min, budget_max: m.budget_max, areas: m.areas, property_type: m.property_type, beds_min: m.beds_min, timeframe: m.timeframe, notes: m.notes }); setEdit(true); };

  return (
    <>
      <PageHead title={`Mandate ${m.mandate_code}`} desc={m.buyer_name} actions={<>
        <Button variant="ghost" onClick={() => navigate(-1)}>Back</Button>
        {m.status !== 'cancelled' && <Button variant="ghost" onClick={() => setStatus('cancelled')}>Cancel mandate</Button>}
        <Button variant="ghost" onClick={openEdit}>Edit brief</Button>
      </>} />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-pad">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
            <StatusBadge status={m.status} />
            {m.assignee && <Badge tone="grey">{m.assignee.name}</Badge>}
          </div>
          <KV k="Buyer" v={m.buyer_name} />
          <KV k="Budget" v={`${money(m.budget_min)} – ${money(m.budget_max)}`} />
          <KV k="Areas" v={m.areas} />
          <KV k="Property type" v={m.property_type} />
          <KV k="Beds (min)" v={m.beds_min} />
          <KV k="Timeframe" v={m.timeframe} />
          <KV k="Notes" v={m.notes} />
          {m.status === 'cancelled' && <KV k="Cancel reason" v={m.cancel_reason} />}
        </div>
      </div>

      <div className="card">
        <div className="card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Shortlist ({(m.candidates || []).length})</h3>
          <Button size="sm" icon={Plus} onClick={() => setAddOpen(true)}>Add candidate</Button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead><tr><th>Property</th><th>Fit note</th><th>Status</th><th>Feedback</th><th /></tr></thead>
            <tbody>
              {(m.candidates || []).length === 0 && <tr><td colSpan={5} className="cell-sub">No candidates yet.</td></tr>}
              {(m.candidates || []).map((c) => (
                <tr key={c.id}>
                  <td>
                    <button type="button" onClick={() => navigate(propertyFilePath(category, c.property_id))} style={{ border: 0, background: 'transparent', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                      <div className="cell-strong">{c.property?.property_code || c.property_id}</div>
                      <div className="cell-sub">{c.property?.title || ''}{c.property?.price ? ` · ${money(c.property.price)}` : ''}</div>
                    </button>
                  </td>
                  <td className="cell-sub">{c.fit_note || '—'}</td>
                  <td>
                    {c.status === 'converted'
                      ? <Badge tone="green">converted{c.converted_deal_id ? ` · #${c.converted_deal_id}` : ''}</Badge>
                      : <Select value={c.status} onChange={(e) => patchCand(c.id, { status: e.target.value })}>{CAND_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</Select>}
                  </td>
                  <td>
                    {c.status === 'converted' ? (c.feedback || '—')
                      : <Input value={c.feedback || ''} onChange={(e) => patchCand(c.id, { feedback: e.target.value })} placeholder="Buyer feedback…" />}
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {c.status !== 'converted' && c.status !== 'rejected' && <Button size="sm" onClick={() => convert(c.id)}>Convert</Button>}
                    {c.status !== 'converted' && <Button size="sm" variant="ghost" onClick={() => removeCand(c.id)}>Remove</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <Drawer title="Edit brief" onClose={() => setEdit(false)} footer={<><Button variant="ghost" onClick={() => setEdit(false)}>Cancel</Button><Button onClick={saveEdit}>Save</Button></>}>
          <div style={{ display: 'flex', gap: 10 }}>
            <Field label="Budget min"><Input type="number" value={ef.budget_min ?? ''} onChange={(e) => setEf({ ...ef, budget_min: e.target.value })} /></Field>
            <Field label="Budget max"><Input type="number" value={ef.budget_max ?? ''} onChange={(e) => setEf({ ...ef, budget_max: e.target.value })} /></Field>
          </div>
          <Field label="Preferred areas"><Input value={ef.areas ?? ''} onChange={(e) => setEf({ ...ef, areas: e.target.value })} /></Field>
          <div style={{ display: 'flex', gap: 10 }}>
            <Field label="Property type"><Input value={ef.property_type ?? ''} onChange={(e) => setEf({ ...ef, property_type: e.target.value })} /></Field>
            <Field label="Beds (min)"><Input type="number" value={ef.beds_min ?? ''} onChange={(e) => setEf({ ...ef, beds_min: e.target.value })} /></Field>
          </div>
          <Field label="Timeframe"><Input value={ef.timeframe ?? ''} onChange={(e) => setEf({ ...ef, timeframe: e.target.value })} /></Field>
          <Field label="Notes"><Textarea value={ef.notes ?? ''} onChange={(e) => setEf({ ...ef, notes: e.target.value })} /></Field>
        </Drawer>
      )}

      {addOpen && (
        <Drawer title="Add candidate property" onClose={() => setAddOpen(false)} footer={<><Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={addCandidate}>Add</Button></>}>
          <Field label="Property"><Combo endpoint={`/properties?category=${category}`} labelFn={propLabel} value={addF.property_id} onChange={(v) => setAddF({ ...addF, property_id: v })} placeholder="Search a property…" /></Field>
          <Field label="Why it fits"><Textarea value={addF.fit_note} onChange={(e) => setAddF({ ...addF, fit_note: e.target.value })} placeholder="Matches budget + area…" /></Field>
        </Drawer>
      )}
    </>
  );
}
