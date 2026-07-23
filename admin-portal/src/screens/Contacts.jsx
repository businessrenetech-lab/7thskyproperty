import React, { useCallback, useEffect, useState } from 'react';
import { Plus, UserPlus, Phone, Mail, Globe2, BadgeCheck } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  PageHead, Button, DataTable, StatusBadge, Badge, Drawer, Field, Input, Textarea, Select,
  SearchInput, KV, Spinner,
} from '../ui/kit';
import ContactDetail from './ContactDetail';

const BLANK = {
  contact_type: 'individual', salutation: '', first_name: '', last_name: '', company_name: '',
  designation: '', primary_phone: '', alt_phone: '', whatsapp: '', email: '', alt_email: '', website: '',
  preferred_contact_method: 'phone', address_line1: '', area: '', city: '', district: '', postal_code: '',
  country: 'Bangladesh', national_id: '', passport_no: '', tin: '', trade_licence_no: '',
  date_of_birth: '', gender: '', nationality: 'Bangladeshi', is_nrb: false, nrb_country: '',
  source: '', notes: '',
};

export default function Contacts() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ contact_type: '', status: '', is_nrb: '' });
  const [page, setPage] = useState(1);
  const [drawer, setDrawer] = useState(null); // 'create' | 'view'
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeContactId, setActiveContactId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 25 });
      if (search) params.set('search', search);
      if (filters.contact_type) params.set('contact_type', filters.contact_type);
      if (filters.status) params.set('status', filters.status);
      if (filters.is_nrb) params.set('is_nrb', filters.is_nrb);
      const { data } = await api.get(`/contacts?${params}`);
      setRows(data.data || []); setTotal(data.pagination?.total || 0);
    } catch { toast.error('Failed to load contacts'); }
    finally { setLoading(false); }
  }, [page, search, filters, toast]);

  useEffect(() => { load(); }, [load]);
  // Deep link: /contacts?contact=<id> opens that contact directly.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('contact');
    if (id) setActiveContactId(Number(id));
  }, []);

  const openCreate = () => { setForm(BLANK); setDrawer('create'); };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await api.post('/contacts', form);
      toast.success('Contact created');
      setDrawer(null); setPage(1); load();
    } catch (e) { toast.error(e.response?.data?.error || 'Could not create contact'); }
    finally { setSaving(false); }
  };

  const openView = (row) => {
    setActiveContactId(row.id);
  };

  const convert = async () => {
    try {
      await api.post(`/contacts/${selected.id}/convert`, { is_buyer: true });
      toast.success('Converted to client');
      setDrawer(null); load();
    } catch (e) { toast.error(e.response?.data?.error || 'Convert failed'); }
  };

  const columns = [
    { key: 'contact_code', header: 'Code', render: (r) => <span className="code-chip">{r.contact_code}</span> },
    { key: 'full_name', header: 'Name', render: (r) => (
      <div><div className="cell-strong">{r.full_name}</div>{r.company_name && <div className="cell-sub">{r.company_name}</div>}</div>
    ) },
    { key: 'contact', header: 'Contact', render: (r) => (
      <div><div className="cell-sub"><Phone size={12} /> {r.primary_phone || '—'}</div><div className="cell-sub"><Mail size={12} /> {r.email || '—'}</div></div>
    ) },
    { key: 'district', header: 'District', render: (r) => r.district || '—' },
    { key: 'flags', header: 'Tags', render: (r) => (
      <div className="wrap-gap">
        {r.is_nrb ? <Badge tone="blue"><Globe2 size={11} /> NRB</Badge> : null}
        {r.is_client ? <Badge tone="green"><BadgeCheck size={11} /> Client</Badge> : null}
      </div>
    ) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  if (activeContactId) {
    return (
      <ContactDetail contactId={activeContactId} onBack={() => { setActiveContactId(null); load(); }} />
    );
  }

  return (
    <>
      <PageHead title="Contacts" desc="Your master directory of people and organisations."
        actions={<Button icon={Plus} onClick={openCreate}>New Contact</Button>} />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-pad row" style={{ flexWrap: 'wrap', gap: 12 }}>
          <SearchInput value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder="Search name, phone, email, code…" />
          <Select value={filters.contact_type} onChange={(e) => setFilters((f) => ({ ...f, contact_type: e.target.value }))} style={{ width: 160 }}>
            <option value="">All types</option><option value="individual">Individual</option><option value="company">Company</option>
          </Select>
          <Select value={filters.is_nrb} onChange={(e) => setFilters((f) => ({ ...f, is_nrb: e.target.value }))} style={{ width: 140 }}>
            <option value="">All clients</option><option value="true">NRB only</option>
          </Select>
          <Select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} style={{ width: 150 }}>
            <option value="">Any status</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="blacklisted">Blacklisted</option>
          </Select>
        </div>
      </div>

      <div className="card">
        <DataTable columns={columns} rows={rows} loading={loading} onRowClick={openView} />
        <div className="pagination"><span>{total} contact{total === 1 ? '' : 's'}</span></div>
      </div>

      {drawer === 'create' && (
        <Drawer title="New Contact" onClose={() => setDrawer(null)}
          footer={<><Button variant="ghost" onClick={() => setDrawer(null)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? <Spinner /> : 'Create Contact'}</Button></>}>
          <div className="form-section-title">Identity</div>
          <div className="form-grid">
            <Field label="Type"><Select value={form.contact_type} onChange={(e) => set('contact_type', e.target.value)}><option value="individual">Individual</option><option value="company">Company</option></Select></Field>
            <Field label="Salutation"><Input value={form.salutation} onChange={(e) => set('salutation', e.target.value)} placeholder="Mr / Ms / Dr" /></Field>
            {form.contact_type === 'company' ? (
              <>
                <Field label="Company name" required full><Input value={form.company_name} onChange={(e) => set('company_name', e.target.value)} /></Field>
                <Field label="Contact person"><Input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} /></Field>
                <Field label="Designation"><Input value={form.designation} onChange={(e) => set('designation', e.target.value)} /></Field>
              </>
            ) : (
              <>
                <Field label="First name" required><Input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} /></Field>
                <Field label="Last name"><Input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} /></Field>
              </>
            )}
          </div>

          <div className="form-section-title">Contact channels</div>
          <div className="form-grid">
            <Field label="Primary phone"><Input value={form.primary_phone} onChange={(e) => set('primary_phone', e.target.value)} /></Field>
            <Field label="WhatsApp"><Input value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
            <Field label="Website"><Input value={form.website} onChange={(e) => set('website', e.target.value)} /></Field>
            <Field label="Preferred method"><Select value={form.preferred_contact_method} onChange={(e) => set('preferred_contact_method', e.target.value)}><option value="phone">Phone</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="sms">SMS</option></Select></Field>
          </div>

          <div className="form-section-title">Address</div>
          <div className="form-grid">
            <Field label="Address line" full><Input value={form.address_line1} onChange={(e) => set('address_line1', e.target.value)} /></Field>
            <Field label="Area"><Input value={form.area} onChange={(e) => set('area', e.target.value)} /></Field>
            <Field label="City"><Input value={form.city} onChange={(e) => set('city', e.target.value)} /></Field>
            <Field label="District"><Input value={form.district} onChange={(e) => set('district', e.target.value)} /></Field>
            <Field label="Postal code"><Input value={form.postal_code} onChange={(e) => set('postal_code', e.target.value)} /></Field>
          </div>

          <div className="form-section-title">Identity & KYC</div>
          <div className="form-grid">
            <Field label="National ID"><Input value={form.national_id} onChange={(e) => set('national_id', e.target.value)} /></Field>
            <Field label="Passport no."><Input value={form.passport_no} onChange={(e) => set('passport_no', e.target.value)} /></Field>
            <Field label="TIN"><Input value={form.tin} onChange={(e) => set('tin', e.target.value)} /></Field>
            <Field label="Trade licence"><Input value={form.trade_licence_no} onChange={(e) => set('trade_licence_no', e.target.value)} /></Field>
            <Field label="NRB (overseas)?"><Select value={String(form.is_nrb)} onChange={(e) => set('is_nrb', e.target.value === 'true')}><option value="false">No</option><option value="true">Yes</option></Select></Field>
            {form.is_nrb && <Field label="NRB country"><Input value={form.nrb_country} onChange={(e) => set('nrb_country', e.target.value)} /></Field>}
          </div>

          <div className="form-section-title">CRM</div>
          <div className="form-grid">
            <Field label="Lead source"><Input value={form.source} onChange={(e) => set('source', e.target.value)} placeholder="Website, Referral, Facebook…" /></Field>
          </div>
          <Field label="Notes" full><Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
        </Drawer>
      )}

      {drawer === 'view' && (
        <Drawer title={selected?.full_name || 'Contact'} onClose={() => setDrawer(null)}
          footer={!detail?.data?.is_client && <Button icon={UserPlus} onClick={convert}>Convert to Client</Button>}>
          {!detail ? <Spinner /> : (
            <>
              <div className="wrap-gap" style={{ marginBottom: 16 }}>
                <span className="code-chip">{detail.data.contact_code}</span>
                <StatusBadge status={detail.data.status} />
                {detail.data.is_nrb && <Badge tone="blue"><Globe2 size={11} /> NRB · {detail.data.nrb_country || '—'}</Badge>}
                {detail.data.is_client && <Badge tone="green"><BadgeCheck size={11} /> Client</Badge>}
              </div>
              <KV k="Type" v={detail.data.contact_type} />
              <KV k="Company" v={detail.data.company_name} />
              <KV k="Phone" v={detail.data.primary_phone} />
              <KV k="WhatsApp" v={detail.data.whatsapp} />
              <KV k="Email" v={detail.data.email} />
              <KV k="Address" v={[detail.data.address_line1, detail.data.area, detail.data.district].filter(Boolean).join(', ')} />
              <KV k="National ID" v={detail.data.national_id} />
              <KV k="Passport" v={detail.data.passport_no} />
              <KV k="Source" v={detail.data.source} />
              <div className="form-section-title">Documents ({detail.data.documents?.length || 0})</div>
              {detail.data.documents?.length ? detail.data.documents.map((d) => <KV key={d.id} k={d.doc_type} v={d.file_name} />) : <p className="cell-sub">No documents uploaded.</p>}
              <div className="form-section-title">Recent communications ({detail.communications?.length || 0})</div>
              {detail.communications?.length ? detail.communications.map((c) => <KV key={c.id} k={c.channel} v={c.subject || c.body?.slice(0, 40)} />) : <p className="cell-sub">No communications logged.</p>}
            </>
          )}
        </Drawer>
      )}
    </>
  );
}
