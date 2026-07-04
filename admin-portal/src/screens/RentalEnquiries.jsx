import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Phone, Mail, CalendarClock, ArrowRight, GripVertical } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Drawer, Spinner, Badge, Button, Field, Input, Select, Textarea } from '../ui/kit';
import { Combo } from '../ui/pickers';

const money = (v) => (v == null || v === '' ? '' : '৳' + Number(v).toLocaleString());

export const ENQUIRY_STAGES = [
  { key: 'new', label: 'New Enquiry', tone: 'blue' },
  { key: 'contacted', label: 'Contacted', tone: 'blue' },
  { key: 'viewing_scheduled', label: 'Viewing Scheduled', tone: 'amber' },
  { key: 'viewed', label: 'Viewed', tone: 'amber' },
  { key: 'application_requested', label: 'Application Requested', tone: 'amber' },
  { key: 'application_received', label: 'Application Received', tone: 'green' },
  { key: 'shortlisted', label: 'Shortlisted', tone: 'green' },
  { key: 'rejected', label: 'Rejected', tone: 'red' },
  { key: 'converted', label: 'Converted to Tenant', tone: 'green' },
];

const emptyForm = { property_id: null, enquirer_name: '', phone: '', email: '', source: '', budget: '', preferred_area: '', bedrooms_wanted: '', preferred_move_in: '', occupancy_requirement: '', lease_period: '', viewing_date: '', next_action: '', follow_up_date: '', notes: '' };

/** Reusable enquiry Kanban board. Used standalone and embedded on the PM dashboard. */
export function EnquiryBoard({ compact = false, onConverted }) {
  const toast = useToast();
  const [board, setBoard] = useState({});
  const [loading, setLoading] = useState(true);
  const [drag, setDrag] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/rental-enquiries?view=kanban');
      setBoard(data.board || {});
    } catch (e) { toast.error('Failed to load enquiries'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const move = async (id, stage) => {
    try { await api.patch(`/rental-enquiries/${id}/move`, { stage }); await load(); }
    catch { toast.error('Failed to move enquiry'); }
  };

  const create = async () => {
    if (!form.enquirer_name) return toast.error('Enquirer name required');
    setSaving(true);
    try { const { data } = await api.post('/rental-enquiries', form); toast.success(data.message || 'Enquiry created'); setShowCreate(false); setForm(emptyForm); await load(); }
    catch (e) { toast.error(e.response?.data?.error || 'Create failed'); }
    finally { setSaving(false); }
  };

  const convert = async (id) => {
    try { const { data } = await api.post(`/rental-enquiries/${id}/convert-to-application`, {}); toast.success(data.message || 'Application created'); setSelected(null); await load(); onConverted?.(data.data); }
    catch (e) { toast.error(e.response?.data?.error || 'Convert failed'); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>;

  return (
    <>
      {!compact && (
        <div className="between" style={{ marginBottom: 12 }}>
          <span />
          <Button icon={Plus} onClick={() => { setForm(emptyForm); setShowCreate(true); }}>New Enquiry</Button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, alignItems: 'flex-start' }}>
        {ENQUIRY_STAGES.map((st) => {
          const cards = board[st.key] || [];
          return (
            <div key={st.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (drag && drag.stage !== st.key) move(drag.id, st.key); setDrag(null); }}
              style={{ minWidth: compact ? 200 : 240, flex: '0 0 auto', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)', padding: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px 8px' }}>
                <span style={{ fontWeight: 700, fontSize: 12.5 }}>{st.label}</span>
                <Badge tone={st.tone}>{cards.length}</Badge>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 40 }}>
                {cards.map((c) => (
                  <div key={c.id} draggable onDragStart={() => setDrag({ id: c.id, stage: st.key })}
                    onClick={() => setSelected(c)}
                    className="card" style={{ padding: 10, cursor: 'pointer', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <GripVertical size={13} color="var(--muted-2)" />
                      <strong style={{ fontSize: 13 }}>{c.enquirer_name}</strong>
                    </div>
                    {c.property && <div className="cell-sub" style={{ marginTop: 3 }}>{c.property.title}</div>}
                    <div className="cell-sub" style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                      {c.phone && <span><Phone size={11} /> {c.phone}</span>}
                      {c.budget && <span>{money(c.budget)}</span>}
                    </div>
                    {c.follow_up_date && <div className="cell-sub" style={{ marginTop: 3, color: 'var(--warning)' }}><CalendarClock size={11} /> {c.follow_up_date}</div>}
                  </div>
                ))}
                {!cards.length && <div style={{ padding: 10, textAlign: 'center', color: 'var(--muted-2)', fontSize: 12 }}>—</div>}
              </div>
            </div>
          );
        })}
      </div>

      {showCreate && (
        <Drawer title="New Rental Enquiry" width={560} onClose={() => setShowCreate(false)}
          footer={<><Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button><Button onClick={create} disabled={saving}>{saving ? <Spinner /> : 'Create Enquiry'}</Button></>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Property of Interest">
              <Combo endpoint="/properties?listing_type=rent" labelFn={(p) => `${p.title} · ${p.property_code}`} value={form.property_id} onChange={(v) => setForm((s) => ({ ...s, property_id: v }))} placeholder="Optional — select property…" />
            </Field>
            <div className="form-grid">
              <Field label="Enquirer Name" required><Input value={form.enquirer_name} onChange={(e) => setForm((s) => ({ ...s, enquirer_name: e.target.value }))} /></Field>
              <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} /></Field>
              <Field label="Email"><Input value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} /></Field>
              <Field label="Source / Channel"><Input value={form.source} onChange={(e) => setForm((s) => ({ ...s, source: e.target.value }))} placeholder="Facebook, website…" /></Field>
            </div>
            <div className="form-grid">
              <Field label="Budget (৳)"><Input type="number" value={form.budget} onChange={(e) => setForm((s) => ({ ...s, budget: e.target.value }))} /></Field>
              <Field label="Preferred Area"><Input value={form.preferred_area} onChange={(e) => setForm((s) => ({ ...s, preferred_area: e.target.value }))} /></Field>
              <Field label="Bedrooms Wanted"><Input type="number" value={form.bedrooms_wanted} onChange={(e) => setForm((s) => ({ ...s, bedrooms_wanted: e.target.value }))} /></Field>
              <Field label="Preferred Move-In"><Input type="date" value={form.preferred_move_in} onChange={(e) => setForm((s) => ({ ...s, preferred_move_in: e.target.value }))} /></Field>
            </div>
            <div className="form-grid">
              <Field label="Occupancy Requirement"><Input value={form.occupancy_requirement} onChange={(e) => setForm((s) => ({ ...s, occupancy_requirement: e.target.value }))} /></Field>
              <Field label="Viewing Date"><Input type="date" value={form.viewing_date} onChange={(e) => setForm((s) => ({ ...s, viewing_date: e.target.value }))} /></Field>
              <Field label="Follow-up Date"><Input type="date" value={form.follow_up_date} onChange={(e) => setForm((s) => ({ ...s, follow_up_date: e.target.value }))} /></Field>
            </div>
            <Field label="Notes"><Textarea value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} /></Field>
          </div>
        </Drawer>
      )}

      {selected && (
        <Drawer title={`Enquiry · ${selected.enquiry_code}`} width={480} onClose={() => setSelected(null)}
          footer={selected.stage !== 'converted'
            ? <><Button variant="ghost" onClick={() => setSelected(null)}>Close</Button><Button icon={ArrowRight} onClick={() => convert(selected.id)}>Convert to Application</Button></>
            : <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 17 }}>{selected.enquirer_name}</div>
            <div className="cell-sub">{selected.phone} · {selected.email}</div>
            {selected.property && <div className="cell-sub">Property: <strong>{selected.property.title}</strong></div>}
            <Field label="Stage">
              <Select value={selected.stage} onChange={(e) => { move(selected.id, e.target.value); setSelected((s) => ({ ...s, stage: e.target.value })); }}>
                {ENQUIRY_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </Select>
            </Field>
            <div className="form-grid">
              <div><strong>Budget:</strong> {money(selected.budget) || '—'}</div>
              <div><strong>Area:</strong> {selected.preferred_area || '—'}</div>
              <div><strong>Move-in:</strong> {selected.preferred_move_in || '—'}</div>
              <div><strong>Viewing:</strong> {selected.viewing_date ? new Date(selected.viewing_date).toLocaleDateString() : '—'}</div>
            </div>
            {selected.notes && <div className="cell-sub">{selected.notes}</div>}
            {selected.converted_application_id && <Badge tone="green" dot>Converted → application #{selected.converted_application_id}</Badge>}
          </div>
        </Drawer>
      )}
    </>
  );
}

export default function RentalEnquiries() {
  return (
    <>
      <PageHead title="Rental Enquiries" desc="Tenant enquiry pipeline — drag cards across stages from new enquiry to converted tenant." />
      <div className="card"><div className="card-pad" style={{ padding: 14 }}><EnquiryBoard /></div></div>
    </>
  );
}
