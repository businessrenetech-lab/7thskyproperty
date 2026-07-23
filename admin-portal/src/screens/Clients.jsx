import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowLeft, Building2, Crown, FileCheck2, Globe2, Mail, MessageSquare, Pencil, Phone, Plus, Receipt, ShieldCheck, Trash2, UserCheck, Users, WalletCards } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Badge, Button, DataTable, Drawer, EmptyState, Field, Input, PageHead, SearchInput, Select, Spinner, StatCard, StatusBadge, Textarea } from '../ui/kit';
import FileUpload, { fileSrc } from '../ui/FileUpload';

const ROLE_TABS = [
  { key: '', label: 'All' }, { key: 'buyer', label: 'Buyers' }, { key: 'seller', label: 'Sellers' },
  { key: 'landlord', label: 'Landlords' }, { key: 'tenant', label: 'Tenants' },
  { key: 'service', label: 'Service' }, { key: 'nrb', label: 'NRB' },
];
const DETAIL_TABS = ['overview', 'activity', 'accounting', 'documents & kyc', 'records & portal'];
const ROLE_FIELDS = [
  ['is_buyer', 'Buyer'], ['is_seller', 'Seller'], ['is_landlord', 'Landlord'],
  ['is_tenant', 'Tenant'], ['is_service_client', 'Service'], ['is_nrb_client', 'NRB'],
];
const money = (value) => `৳${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (value) => value ? new Date(value).toLocaleDateString() : '—';

const roleBadges = (client) => <div className="wrap-gap">
  {ROLE_FIELDS.filter(([key]) => client[key]).map(([key, label]) => <Badge key={key} tone={key === 'is_landlord' ? 'green' : key === 'is_tenant' ? 'amber' : 'blue'}>{label}</Badge>)}
</div>;

export default function Clients() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (role) params.set('role', role);
      if (search) params.set('search', search);
      const { data } = await api.get(`/clients?${params}`);
      setRows(data.data || []);
      setTotal(data.pagination?.total || 0);
    } catch (error) { toast.error(error.response?.data?.error || 'Failed to load clients'); }
    finally { setLoading(false); }
  }, [role, search, toast]);

  const loadDetail = useCallback(async (id) => {
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/clients/${id}`);
      setDetail(data);
      setSelectedId(Number(id));
      return data;
    } catch (error) { toast.error(error.response?.data?.error || 'Failed to load client profile'); return null; }
    finally { setDetailLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => ({
    active: rows.filter((row) => row.status === 'active').length,
    vip: rows.filter((row) => row.client_segment === 'vip').length,
    portal: rows.filter((row) => row.portal_enabled).length,
  }), [rows]);

  if (selectedId) return <ClientWorkspace detail={detail} loading={detailLoading} onBack={() => { setSelectedId(null); setDetail(null); load(); }} reload={() => loadDetail(selectedId)} />;

  const columns = [
    { key: 'client_code', header: 'Client', render: (row) => <div><span className="code-chip">{row.client_code}</span><div className="cell-strong" style={{ marginTop: 5 }}>{row.Contact?.full_name || '—'}</div></div> },
    { key: 'contact', header: 'Contact details', render: (row) => <div><div>{row.Contact?.primary_phone || '—'}</div><div className="cell-sub">{row.Contact?.email || 'No email'}</div></div> },
    { key: 'roles', header: 'Relationships', render: roleBadges },
    { key: 'segment', header: 'Segment', render: (row) => <Badge tone={row.client_segment === 'vip' ? 'amber' : row.client_segment === 'priority' ? 'blue' : 'grey'}>{row.client_segment}</Badge> },
    { key: 'portal', header: 'Portal', render: (row) => row.portal_enabled ? <Badge tone="green" dot>Enabled</Badge> : <span className="cell-sub">Not enabled</span> },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  return <div className="pm-scope">
    <PageHead title="Client care" desc="A complete view of every client relationship, communication, document and financial record." />
    <div className="stats-grid" style={{ marginBottom: 18 }}>
      <StatCard icon={Users} label="Total clients" value={total} tone="blue" />
      <StatCard icon={UserCheck} label="Active clients" value={stats.active} tone="green" />
      <StatCard icon={Crown} label="VIP clients" value={stats.vip} tone="amber" />
      <StatCard icon={Globe2} label="Portal enabled" value={stats.portal} tone="sky" />
    </div>
    <div className="tabs">{ROLE_TABS.map((tab) => <button type="button" key={tab.key} className={`tab ${role === tab.key ? 'active' : ''}`} onClick={() => setRole(tab.key)}>{tab.label}</button>)}</div>
    <div className="card" style={{ marginBottom: 16 }}><div className="card-pad"><SearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, phone, email or company…" /></div></div>
    <div className="card"><DataTable columns={columns} rows={rows} loading={loading} onRowClick={(row) => loadDetail(row.id)} /><div className="pagination"><span>{total} client{total === 1 ? '' : 's'}</span><span className="cell-sub">Select a client to open the complete workspace</span></div></div>
  </div>;
}

function ClientWorkspace({ detail, loading, onBack, reload }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [drawer, setDrawer] = useState('');
  const [busy, setBusy] = useState(false);
  const client = detail?.data;
  const contact = client?.Contact;
  const [edit, setEdit] = useState({});
  const [message, setMessage] = useState({ channel: 'email', subject: '', body: '', send_now: true });
  const [document, setDocument] = useState({ doc_type: 'national_id', title: '', file_url: '', expiry_date: '' });
  const [portal, setPortal] = useState({ email: '', password: '', role: 'buyer' });

  useEffect(() => {
    if (!client) return;
    setEdit({
      full_name: contact?.full_name || '', email: contact?.email || '', primary_phone: contact?.primary_phone || '', whatsapp: contact?.whatsapp || '',
      address_line1: contact?.address_line1 || '', area: contact?.area || '', city: contact?.city || '', district: contact?.district || '',
      national_id: contact?.national_id || '', passport_no: contact?.passport_no || '', tin: contact?.tin || '',
      client_segment: client.client_segment, status: client.status, notes: client.notes || '',
      ...Object.fromEntries(ROLE_FIELDS.map(([key]) => [key, !!client[key]])),
    });
    setPortal((current) => ({ ...current, email: contact?.email || '' }));
  }, [client, contact]);

  if (loading || !detail) return <div style={{ padding: 80, textAlign: 'center' }}><Spinner /></div>;
  const summary = detail.summary || {};
  const documents = contact?.documents || [];
  const allDocuments = [...documents, ...(detail.kycDocuments || [])];

  const saveProfile = async () => {
    setBusy(true);
    try {
      await Promise.all([
        api.put(`/contacts/${contact.id}`, {
          full_name: edit.full_name, email: edit.email, primary_phone: edit.primary_phone, whatsapp: edit.whatsapp,
          address_line1: edit.address_line1, area: edit.area, city: edit.city, district: edit.district,
          national_id: edit.national_id, passport_no: edit.passport_no, tin: edit.tin,
        }),
        api.put(`/clients/${client.id}`, {
          client_segment: edit.client_segment, status: edit.status, notes: edit.notes,
          ...Object.fromEntries(ROLE_FIELDS.map(([key]) => [key, !!edit[key]])),
        }),
      ]);
      toast.success('Client profile and KYC updated'); setDrawer(''); await reload();
    } catch (error) { toast.error(error.response?.data?.error || 'Profile update failed'); }
    finally { setBusy(false); }
  };
  const sendMessage = async () => {
    if (!message.body.trim()) return toast.error('Write a message first');
    setBusy(true);
    try {
      const { data } = await api.post(`/clients/${client.id}/communications`, message);
      toast.success(data.message); setMessage({ channel: 'email', subject: '', body: '', send_now: true }); setDrawer(''); await reload();
    } catch (error) { toast.error(error.response?.data?.error || 'Message failed'); }
    finally { setBusy(false); }
  };
  const addDocument = async () => {
    if (!document.file_url) return toast.error('Upload a document first');
    setBusy(true);
    try {
      await api.post(`/contacts/${contact.id}/documents`, document);
      toast.success('Document added'); setDocument({ doc_type: 'national_id', title: '', file_url: '', expiry_date: '' }); setDrawer(''); await reload();
    } catch (error) { toast.error(error.response?.data?.error || 'Document upload failed'); }
    finally { setBusy(false); }
  };
  const removeDocument = async (id) => {
    try { await api.delete(`/contacts/${contact.id}/documents/${id}`); toast.success('Document removed'); await reload(); }
    catch (error) { toast.error(error.response?.data?.error || 'Could not remove document'); }
  };
  const enablePortal = async () => {
    setBusy(true);
    try { const { data } = await api.post(`/clients/${client.id}/portal-access`, { ...portal, name: contact.full_name }); toast.success(data.message); setDrawer(''); await reload(); }
    catch (error) { toast.error(error.response?.data?.error || 'Could not enable portal'); }
    finally { setBusy(false); }
  };

  const invoiceColumns = [
    { key: 'invoice_code', header: 'Invoice', render: (row) => <span className="code-chip">{row.invoice_code}</span> },
    { key: 'title', header: 'Description', render: (row) => <div><div className="cell-strong">{row.title || row.invoice_type}</div><div className="cell-sub">Issued {date(row.issue_date)} · due {date(row.due_date)}</div></div> },
    { key: 'total', header: 'Total', render: (row) => money(row.total) }, { key: 'balance', header: 'Balance', render: (row) => <b>{money(row.balance)}</b> },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];
  const paymentColumns = [
    { key: 'payment_code', header: 'Payment', render: (row) => <span className="code-chip">{row.payment_code}</span> },
    { key: 'paid_at', header: 'Date', render: (row) => date(row.paid_at) }, { key: 'direction', header: 'Direction', render: (row) => <Badge tone={row.direction === 'incoming' ? 'green' : 'amber'}>{row.direction}</Badge> },
    { key: 'method', header: 'Method', render: (row) => row.method?.replace('_', ' ') }, { key: 'amount', header: 'Amount', render: (row) => <b>{money(row.amount)}</b> }, { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  return <div className="pm-scope">
    <Button variant="ghost" icon={ArrowLeft} onClick={onBack}>Back to clients</Button>
    <div className="card" style={{ marginTop: 12, padding: 20 }}>
      <div className="between" style={{ alignItems: 'flex-start' }}><div><div className="wrap-gap"><span className="code-chip">{client.client_code}</span><StatusBadge status={client.status} />{client.client_segment === 'vip' && <Badge tone="amber"><Crown size={12} /> VIP</Badge>}</div><h1 style={{ margin: '10px 0 3px', fontSize: 25 }}>{contact?.full_name}</h1><div className="cell-sub">{contact?.primary_phone || 'No phone'} · {contact?.email || 'No email'} · {contact?.district || 'No district'}</div><div style={{ marginTop: 9 }}>{roleBadges(client)}</div></div><div className="wrap-gap"><Button variant="ghost" icon={Pencil} onClick={() => setDrawer('edit')}>Edit profile &amp; KYC</Button><Button icon={Mail} onClick={() => setDrawer('message')}>Contact client</Button></div></div>
    </div>
    <div className="stats-grid" style={{ margin: '16px 0' }}><StatCard icon={Receipt} label="Total invoiced" value={money(summary.invoice_total)} tone="blue" /><StatCard icon={WalletCards} label="Outstanding" value={money(summary.outstanding_total)} tone={Number(summary.outstanding_total) ? 'amber' : 'green'} /><StatCard icon={UserCheck} label="Payments received" value={money(summary.received_total)} tone="green" /><StatCard icon={Activity} label="Recorded activities" value={summary.communications || 0} tone="sky" /></div>
    <div className="tabs">{DETAIL_TABS.map((item) => <button type="button" key={item} className={`tab ${tab === item ? 'active' : ''}`} onClick={() => setTab(item)}>{item.replace(/\b\w/g, (letter) => letter.toUpperCase())}</button>)}</div>

    {tab === 'overview' && <div className="pm-grid" style={{ gridTemplateColumns: '1.1fr .9fr' }}>
      <section className="pm-card"><div className="pm-card-h"><div className="ic"><UserCheck size={17} /></div><div><h3>Client profile</h3><div className="hsub">Identity, preferences and contact details</div></div></div><div className="pm-card-body"><Info label="Phone" value={contact?.primary_phone} /><Info label="WhatsApp" value={contact?.whatsapp} /><Info label="Email" value={contact?.email} /><Info label="Address" value={[contact?.address_line1, contact?.area, contact?.city, contact?.district].filter(Boolean).join(', ')} /><Info label="Preferred contact" value={contact?.preferred_contact_method} /><Info label="National ID" value={contact?.national_id} /><Info label="Passport" value={contact?.passport_no} /><Info label="TIN" value={contact?.tin} /></div></section>
      <section className="pm-card"><div className="pm-card-h"><div className="ic"><Building2 size={17} /></div><div><h3>Roles, properties &amp; agreements</h3><div className="hsub">Every onboarding relationship for this client</div></div></div><div className="pm-card-body">{(detail.roleProfiles || []).length ? detail.roleProfiles.map((profile) => <button type="button" key={profile.id} onClick={() => navigate(`/role-onboarding?profile_id=${profile.id}`)} style={{ width: '100%', textAlign: 'left', padding: 11, marginBottom: 7, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface-2)', cursor: 'pointer' }}><div className="between"><div><b>{profile.role_type?.replace('_', ' ')}</b><div className="cell-sub">{profile.property?.title || 'General client relationship'}</div></div><div><StatusBadge status={profile.status} /> {profile.envelope && <StatusBadge status={profile.envelope.status} />}</div></div></button>) : <EmptyState icon={Building2} title="No role onboarding yet" sub="Role profiles and linked properties will appear here." />}</div></section>
    </div>}

    {tab === 'activity' && <section className="pm-card"><div className="pm-card-h"><div className="ic"><MessageSquare size={17} /></div><div><h3>Communication &amp; activity timeline</h3><div className="hsub">Email, message, calls, meetings and internal notes</div></div><div className="sp" /><Button size="sm" icon={Plus} onClick={() => setDrawer('message')}>New activity</Button></div><div className="pm-card-body">{(detail.communications || []).length ? detail.communications.map((item) => <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '38px 1fr auto', gap: 11, padding: '12px 0', borderBottom: '1px solid var(--border)' }}><div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-50)', color: 'var(--primary)', display: 'grid', placeItems: 'center' }}>{item.channel === 'email' ? <Mail size={16} /> : item.channel === 'call' ? <Phone size={16} /> : <MessageSquare size={16} />}</div><div><div className="wrap-gap"><b>{item.subject || item.channel}</b><Badge tone="grey">{item.channel}</Badge><Badge tone={item.direction === 'inbound' ? 'green' : 'blue'}>{item.direction}</Badge></div><div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{item.body}</div></div><div className="cell-sub">{date(item.occurred_at)}</div></div>) : <EmptyState icon={Activity} title="No activity yet" sub="Send a message or record a client interaction." />}</div></section>}

    {tab === 'accounting' && <div style={{ display: 'grid', gap: 16 }}><section className="pm-card"><div className="pm-card-h"><div className="ic"><Receipt size={17} /></div><div><h3>Invoices</h3><div className="hsub">All client and contact-linked invoices</div></div></div><DataTable columns={invoiceColumns} rows={detail.invoices || []} /></section><section className="pm-card"><div className="pm-card-h"><div className="ic"><WalletCards size={17} /></div><div><h3>Payments</h3><div className="hsub">Incoming and outgoing payment history</div></div></div><DataTable columns={paymentColumns} rows={detail.payments || []} /></section></div>}

    {tab === 'documents & kyc' && <section className="pm-card"><div className="pm-card-h"><div className="ic"><FileCheck2 size={17} /></div><div><h3>Documents &amp; KYC</h3><div className="hsub">Private identity files and onboarding verification</div></div><div className="sp" /><Button size="sm" icon={Plus} onClick={() => setDrawer('document')}>Add document</Button><Button size="sm" variant="ghost" icon={Pencil} onClick={() => setDrawer('edit')}>Edit KYC numbers</Button></div><div className="pm-card-body"><div className="stats-grid" style={{ marginBottom: 14 }}><StatCard icon={ShieldCheck} label="National ID" value={contact?.national_id || 'Not entered'} tone={contact?.national_id ? 'green' : 'amber'} /><StatCard icon={FileCheck2} label="Passport" value={contact?.passport_no || 'Not entered'} tone={contact?.passport_no ? 'green' : 'amber'} /><StatCard icon={Receipt} label="TIN" value={contact?.tin || 'Not entered'} tone={contact?.tin ? 'green' : 'amber'} /></div>{allDocuments.length ? <div className="pm-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>{allDocuments.map((doc) => <div key={`${doc.party_role_profile_id ? 'kyc' : 'contact'}-${doc.id}`} className="card" style={{ padding: 12 }}><div className="between"><div><b>{doc.title || doc.doc_type || doc.document_type}</b><div className="cell-sub">{(doc.doc_type || doc.document_type || '').replace('_', ' ')} · {doc.status || 'stored'}</div></div>{!doc.party_role_profile_id && <Button size="sm" variant="ghost" icon={Trash2} onClick={() => removeDocument(doc.id)} />}</div>{(doc.file_url || doc.file_url_back) && <div className="wrap-gap" style={{ marginTop: 9 }}>{doc.file_url && <a className="btn btn-ghost btn-sm" href={fileSrc(doc.file_url)} target="_blank" rel="noreferrer">View front/file</a>}{doc.file_url_back && <a className="btn btn-ghost btn-sm" href={fileSrc(doc.file_url_back)} target="_blank" rel="noreferrer">View back</a>}</div>}</div>)}</div> : <EmptyState icon={FileCheck2} title="No documents stored" sub="Upload NID, passport, TIN or other client documents." />}</div></section>}

    {tab === 'records & portal' && <div className="pm-grid" style={{ gridTemplateColumns: '1.1fr .9fr' }}><section className="pm-card"><div className="pm-card-h"><div className="ic"><Receipt size={17} /></div><div><h3>Register records</h3><div className="hsub">All structured client register entries</div></div></div><div className="pm-card-body">{(detail.registerEntries || []).length ? detail.registerEntries.map((record) => <div key={record.id} className="between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}><div><span className="code-chip">{record.entry_code}</span><div className="cell-sub">{record.vertical_key || 'General'} · {date(record.created_at)}</div></div><StatusBadge status={record.status} /></div>) : <EmptyState title="No register entries" sub="Client-linked records will appear here." />}</div></section><section className="pm-card"><div className="pm-card-h"><div className="ic"><Globe2 size={17} /></div><div><h3>Client portal</h3><div className="hsub">Secure self-service access</div></div></div><div className="pm-card-body">{client.portal_enabled ? <div style={{ padding: 16, textAlign: 'center', background: 'var(--success-bg)', borderRadius: 10 }}><ShieldCheck color="var(--success)" /><h3>Portal enabled</h3><div className="cell-sub">This client has an active portal account.</div></div> : <EmptyState icon={Globe2} title="Portal not enabled" sub="Create a secure login for the client." action={<Button onClick={() => setDrawer('portal')}>Enable portal access</Button>} />}</div></section></div>}

    {drawer === 'edit' && <Drawer title="Edit client profile & KYC" width={720} onClose={() => setDrawer('')} footer={<><Button variant="ghost" onClick={() => setDrawer('')}>Cancel</Button><Button onClick={saveProfile} disabled={busy}>{busy ? <Spinner /> : 'Save profile'}</Button></>}><div className="form-grid"><Field label="Full name" required><Input value={edit.full_name || ''} onChange={(event) => setEdit({ ...edit, full_name: event.target.value })} /></Field><Field label="Email"><Input type="email" value={edit.email || ''} onChange={(event) => setEdit({ ...edit, email: event.target.value })} /></Field><Field label="Phone"><Input value={edit.primary_phone || ''} onChange={(event) => setEdit({ ...edit, primary_phone: event.target.value })} /></Field><Field label="WhatsApp"><Input value={edit.whatsapp || ''} onChange={(event) => setEdit({ ...edit, whatsapp: event.target.value })} /></Field><Field label="National ID"><Input value={edit.national_id || ''} onChange={(event) => setEdit({ ...edit, national_id: event.target.value })} /></Field><Field label="Passport"><Input value={edit.passport_no || ''} onChange={(event) => setEdit({ ...edit, passport_no: event.target.value })} /></Field><Field label="TIN"><Input value={edit.tin || ''} onChange={(event) => setEdit({ ...edit, tin: event.target.value })} /></Field><Field label="Segment"><Select value={edit.client_segment || 'standard'} onChange={(event) => setEdit({ ...edit, client_segment: event.target.value })}><option value="standard">Standard</option><option value="priority">Priority</option><option value="vip">VIP</option></Select></Field><Field label="Address"><Input value={edit.address_line1 || ''} onChange={(event) => setEdit({ ...edit, address_line1: event.target.value })} /></Field><Field label="Area"><Input value={edit.area || ''} onChange={(event) => setEdit({ ...edit, area: event.target.value })} /></Field><Field label="City"><Input value={edit.city || ''} onChange={(event) => setEdit({ ...edit, city: event.target.value })} /></Field><Field label="District"><Input value={edit.district || ''} onChange={(event) => setEdit({ ...edit, district: event.target.value })} /></Field></div><div className="form-section-title">Client relationships</div><div className="wrap-gap">{ROLE_FIELDS.map(([key, label]) => <label key={key} className="card" style={{ padding: '9px 12px', cursor: 'pointer' }}><input type="checkbox" checked={!!edit[key]} onChange={(event) => setEdit({ ...edit, [key]: event.target.checked })} /> {label}</label>)}</div><div style={{ marginTop: 14 }}><Field label="Internal notes"><Textarea rows={4} value={edit.notes || ''} onChange={(event) => setEdit({ ...edit, notes: event.target.value })} /></Field></div></Drawer>}
    {drawer === 'message' && <Drawer title="Contact client / log activity" width={620} onClose={() => setDrawer('')} footer={<><Button variant="ghost" onClick={() => setDrawer('')}>Cancel</Button><Button onClick={sendMessage} disabled={busy}>{busy ? <Spinner /> : message.send_now && ['email', 'sms', 'whatsapp'].includes(message.channel) ? 'Send & log' : 'Log activity'}</Button></>}><div style={{ display: 'grid', gap: 13 }}><Field label="Channel"><Select value={message.channel} onChange={(event) => setMessage({ ...message, channel: event.target.value, send_now: ['email', 'sms', 'whatsapp'].includes(event.target.value) })}><option value="email">Email</option><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option><option value="call">Phone call</option><option value="meeting">Meeting</option><option value="note">Internal note</option></Select></Field><Field label="Subject"><Input value={message.subject} onChange={(event) => setMessage({ ...message, subject: event.target.value })} placeholder="Purpose of this communication" /></Field><Field label="Message / notes"><Textarea rows={8} value={message.body} onChange={(event) => setMessage({ ...message, body: event.target.value })} /></Field>{['email', 'sms', 'whatsapp'].includes(message.channel) && <label><input type="checkbox" checked={message.send_now} onChange={(event) => setMessage({ ...message, send_now: event.target.checked })} /> Send now and save to the timeline</label>}</div></Drawer>}
    {drawer === 'document' && <Drawer title="Add private client document" width={620} onClose={() => setDrawer('')} footer={<><Button variant="ghost" onClick={() => setDrawer('')}>Cancel</Button><Button onClick={addDocument} disabled={busy}>{busy ? <Spinner /> : 'Save document'}</Button></>}><div style={{ display: 'grid', gap: 13 }}><Field label="Document type"><Select value={document.doc_type} onChange={(event) => setDocument({ ...document, doc_type: event.target.value })}><option value="national_id">National ID</option><option value="passport">Passport</option><option value="tin">TIN certificate</option><option value="trade_licence">Trade licence</option><option value="ownership">Ownership document</option><option value="agreement">Agreement</option><option value="other">Other</option></Select></Field><Field label="Title"><Input value={document.title} onChange={(event) => setDocument({ ...document, title: event.target.value })} /></Field><Field label="Expiry date"><Input type="date" value={document.expiry_date} onChange={(event) => setDocument({ ...document, expiry_date: event.target.value })} /></Field><Field label="File" required><FileUpload folder="documents" value={document.file_url} onChange={(file_url) => setDocument({ ...document, file_url })} /></Field></div></Drawer>}
    {drawer === 'portal' && <Drawer title="Enable client portal" width={560} onClose={() => setDrawer('')} footer={<><Button variant="ghost" onClick={() => setDrawer('')}>Cancel</Button><Button onClick={enablePortal} disabled={busy}>{busy ? <Spinner /> : 'Create portal login'}</Button></>}><div style={{ display: 'grid', gap: 13 }}><Field label="Login email"><Input type="email" value={portal.email} onChange={(event) => setPortal({ ...portal, email: event.target.value })} /></Field><Field label="Temporary password"><Input type="password" value={portal.password} onChange={(event) => setPortal({ ...portal, password: event.target.value })} /></Field><Field label="Portal role"><Select value={portal.role} onChange={(event) => setPortal({ ...portal, role: event.target.value })}><option value="buyer">Buyer</option><option value="tenant">Tenant</option><option value="owner">Owner</option></Select></Field></div></Drawer>}
  </div>;
}

function Info({ label, value }) {
  return <div className="between" style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}><span className="cell-sub">{label}</span><b style={{ textAlign: 'right' }}>{value || '—'}</b></div>;
}
