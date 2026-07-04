import React, { useState } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Drawer, Field, Input, Select, Textarea, Button, Spinner } from '../ui/kit';
import { Combo } from '../ui/pickers';

const contactLabel = (c) => `${c.full_name}${c.primary_phone ? ' · ' + c.primary_phone : ''}`;
const clientLabel = (c) => `${c.Contact?.full_name || c.client_code}`;
const propLabel = (p) => `${p.title} (${p.property_code || p.area || ''})`;

export function NewPropertyDrawer({ category = 'residential', onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ title: '', category, property_type: '', listing_type: 'sale', price: '', area: '', district: '', bedrooms: '', bathrooms: '', owner_contact_id: null, status: 'available' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const save = async () => {
    if (!f.title) return toast.error('Title is required');
    setSaving(true);
    try { const { data } = await api.post('/properties', f); toast.success('Property created'); onSaved?.(data.data); onClose(); }
    catch (e) { toast.error(e.response?.data?.error || 'Create failed'); } finally { setSaving(false); }
  };
  return (
    <Drawer title="New Property" onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? <Spinner /> : 'Create'}</Button></>}>
      <Field label="Title" required full><Input value={f.title} onChange={(e) => set('title', e.target.value)} /></Field>
      <div className="form-grid">
        <Field label="Category"><Select value={f.category} onChange={(e) => set('category', e.target.value)}>{['residential', 'commercial', 'rural', 'business'].map((c) => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="Listing type"><Select value={f.listing_type} onChange={(e) => set('listing_type', e.target.value)}>{['sale', 'rent', 'lease', 'short_term'].map((c) => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="Property type"><Input value={f.property_type} onChange={(e) => set('property_type', e.target.value)} placeholder="Apartment, House, Office…" /></Field>
        <Field label="Price"><Input type="number" value={f.price} onChange={(e) => set('price', e.target.value)} /></Field>
        <Field label="Area"><Input value={f.area} onChange={(e) => set('area', e.target.value)} /></Field>
        <Field label="District"><Input value={f.district} onChange={(e) => set('district', e.target.value)} /></Field>
        <Field label="Bedrooms"><Input type="number" value={f.bedrooms} onChange={(e) => set('bedrooms', e.target.value)} /></Field>
        <Field label="Bathrooms"><Input type="number" value={f.bathrooms} onChange={(e) => set('bathrooms', e.target.value)} /></Field>
      </div>
      <Field label="Owner (contact)"><Combo endpoint="/contacts" labelFn={contactLabel} value={f.owner_contact_id} onChange={(v) => set('owner_contact_id', v)} placeholder="Search owner contact…" /></Field>
    </Drawer>
  );
}

export function NewDealDrawer({ dealType, category, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ deal_type: dealType, property_id: null, buyer_client_id: null, seller_contact_id: null, owner_contact_id: null, agreement_id: null, agreement_date: '', sale_price: '', commission_amount: '', commission_percent: '', expenses_total: '', status: 'lead', notes: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const save = async () => {
    setSaving(true);
    try { const { data } = await api.post('/deals', f); toast.success('Deal created'); onSaved?.(data.data); onClose(); }
    catch (e) { toast.error(e.response?.data?.error || 'Create failed'); } finally { setSaving(false); }
  };
  return (
    <Drawer title={`New ${dealType === 'buy' ? 'Buy' : 'Sell'} Deal`} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? <Spinner /> : 'Create'}</Button></>}>
      <Field label="Property"><Combo endpoint={`/properties?category=${category}`} labelFn={propLabel} value={f.property_id} onChange={(v) => set('property_id', v)} placeholder="Search property…" /></Field>
      {dealType === 'buy'
        ? <Field label="Buyer (client)"><Combo endpoint="/clients?role=buyer" labelFn={clientLabel} value={f.buyer_client_id} onChange={(v) => set('buyer_client_id', v)} placeholder="Search buyer client…" /></Field>
        : <Field label="Seller (contact)"><Combo endpoint="/contacts" labelFn={contactLabel} value={f.seller_contact_id} onChange={(v) => set('seller_contact_id', v)} placeholder="Search seller…" /></Field>}
      <Field label="Owner (contact)"><Combo endpoint="/contacts" labelFn={contactLabel} value={f.owner_contact_id} onChange={(v) => set('owner_contact_id', v)} placeholder="Search owner…" /></Field>
      <Field label="Service agreement"><Combo endpoint="/agreements" labelFn={(a) => `${a.title} (${a.agreement_code})`} value={f.agreement_id} onChange={(v) => set('agreement_id', v)} placeholder="Link an agreement…" /></Field>
      <div className="form-grid">
        <Field label="Agreement start"><Input type="date" value={f.agreement_date} onChange={(e) => set('agreement_date', e.target.value)} /></Field>
        <Field label="Sale price"><Input type="number" value={f.sale_price} onChange={(e) => set('sale_price', e.target.value)} /></Field>
        <Field label="Commission amount"><Input type="number" value={f.commission_amount} onChange={(e) => set('commission_amount', e.target.value)} /></Field>
        <Field label="Commission %"><Input type="number" value={f.commission_percent} onChange={(e) => set('commission_percent', e.target.value)} /></Field>
        <Field label="Expenses total"><Input type="number" value={f.expenses_total} onChange={(e) => set('expenses_total', e.target.value)} /></Field>
        <Field label="Status"><Select value={f.status} onChange={(e) => set('status', e.target.value)}>{['lead', 'negotiation', 'agreed', 'settlement', 'completed', 'cancelled'].map((s) => <option key={s}>{s}</option>)}</Select></Field>
      </div>
      <Field label="Notes" full><Textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
    </Drawer>
  );
}

export function NewTenancyDrawer({ onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ property_id: null, owner_contact_id: null, tenant_contact_id: null, lease_start: '', move_in_date: '', lease_end: '', move_out_date: '', security_deposit: '', monthly_rent: '', service_charge: '', rent_due_day: 1, payment_frequency: 'monthly', status: 'active' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const save = async () => {
    setSaving(true);
    try { const { data } = await api.post('/tenancies', f); toast.success('Tenancy created'); onSaved?.(data.data); onClose(); }
    catch (e) { toast.error(e.response?.data?.error || 'Create failed'); } finally { setSaving(false); }
  };
  return (
    <Drawer title="New Tenancy" onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? <Spinner /> : 'Create'}</Button></>}>
      <Field label="Property"><Combo endpoint="/properties?listing_type=rent" labelFn={propLabel} value={f.property_id} onChange={(v) => set('property_id', v)} placeholder="Search rental property…" /></Field>
      <Field label="Owner"><Combo endpoint="/contacts" labelFn={contactLabel} value={f.owner_contact_id} onChange={(v) => set('owner_contact_id', v)} placeholder="Search owner contact…" /></Field>
      <Field label="Tenant"><Combo endpoint="/contacts" labelFn={contactLabel} value={f.tenant_contact_id} onChange={(v) => set('tenant_contact_id', v)} placeholder="Search tenant contact…" /></Field>
      <div className="form-grid">
        <Field label="Lease start"><Input type="date" value={f.lease_start} onChange={(e) => set('lease_start', e.target.value)} /></Field>
        <Field label="Move in"><Input type="date" value={f.move_in_date} onChange={(e) => set('move_in_date', e.target.value)} /></Field>
        <Field label="Lease end"><Input type="date" value={f.lease_end} onChange={(e) => set('lease_end', e.target.value)} /></Field>
        <Field label="Move out"><Input type="date" value={f.move_out_date} onChange={(e) => set('move_out_date', e.target.value)} /></Field>
        <Field label="Security deposit"><Input type="number" value={f.security_deposit} onChange={(e) => set('security_deposit', e.target.value)} /></Field>
        <Field label="Monthly rent"><Input type="number" value={f.monthly_rent} onChange={(e) => set('monthly_rent', e.target.value)} /></Field>
        <Field label="Service charge"><Input type="number" value={f.service_charge} onChange={(e) => set('service_charge', e.target.value)} /></Field>
        <Field label="Rent due day"><Input type="number" value={f.rent_due_day} onChange={(e) => set('rent_due_day', e.target.value)} /></Field>
      </div>
    </Drawer>
  );
}
