import React, { useCallback, useEffect, useState } from 'react';
import { Banknote, Edit, Eye, FileSignature, FileText, Link2, Mail, Send, ShieldCheck, Upload, UserRound, Wallet, XCircle } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Drawer, Field, Input, KV, Select, Spinner, Textarea } from '../ui/kit';
import FileUpload from '../ui/FileUpload';
import DocumentVerification from '../components/DocumentVerification';

const money = (value) => '৳' + Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const label = (value) => String(value || 'not started').replace(/_/g, ' ');
const STATUS_TONE = { active: 'green', signed: 'green', completed: 'green', sent: 'blue', viewed: 'blue', signing_sent: 'blue', partially_signed: 'blue', pending: 'amber', agreement_pending: 'amber', kyc_pending: 'amber', documents_pending: 'amber', declined: 'red', rejected: 'red', voided: 'grey' };

export default function OwnerOperations({ property, ownerProfile, fees = [], documents = [], ownerHeld = 0, onEditOwner, onReload }) {
  const toast = useToast();
  const [contact, setContact] = useState(property.owner || null);
  const [profile, setProfile] = useState(null);
  const [envelope, setEnvelope] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [drawer, setDrawer] = useState(null);
  const [doc, setDoc] = useState({ title: '', doc_type: 'other', file_url: '', description: '' });
  const [contactForm, setContactForm] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const jobs = [
        property.owner_contact_id ? api.get(`/contacts/${property.owner_contact_id}`) : Promise.resolve({ data: { data: null } }),
        api.get(`/party-role-profiles?property_id=${property.id}&role_type=landlord&limit=20`),
      ];
      const [contactResult, profileResult] = await Promise.all(jobs);
      const nextContact = contactResult.data.data || property.owner || null;
      const nextProfile = (profileResult.data.data || []).find((item) => item.contact_id === property.owner_contact_id) || null;
      setContact(nextContact);
      setContactForm(nextContact || {});
      setProfile(nextProfile);
      if (nextProfile?.envelope_id) {
        const env = await api.get(`/signing/envelopes/${nextProfile.envelope_id}`);
        setEnvelope(env.data.data);
      } else setEnvelope(null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not load owner operations.');
    } finally { setLoading(false); }
  }, [property.id, property.owner, property.owner_contact_id, toast]);

  useEffect(() => { load(); }, [load]);

  const ensureRoleProfile = async () => {
    if (profile) return profile;
    if (!property.owner_contact_id) throw new Error('Assign an owner before starting onboarding.');
    const { data } = await api.post('/party-role-profiles', { contact_id: property.owner_contact_id, role_type: 'landlord', property_id: property.id, source: 'staff' });
    setProfile(data.data);
    return data.data;
  };

  const requestDocuments = async () => {
    setBusy('request');
    try {
      const role = await ensureRoleProfile();
      const { data } = await api.post(`/party-role-profiles/${role.id}/registration-link`);
      if (data.data?.link) await navigator.clipboard?.writeText(data.data.link);
      toast.success(data.message || 'Owner document request sent.');
      await load();
    } catch (error) { toast.error(error.response?.data?.error || error.message); }
    finally { setBusy(null); }
  };

  const createAgreement = async (send) => {
    setBusy(send ? 'send' : 'draft');
    try {
      const role = await ensureRoleProfile();
      const { data } = await api.post(`/party-role-profiles/${role.id}/start-signing`, { send });
      setProfile(data.data);
      setEnvelope(data.envelope);
      toast.success(data.message);
      if (!send) setDrawer('preview');
      await onReload?.();
    } catch (error) { toast.error(error.response?.data?.error || error.message); }
    finally { setBusy(null); }
  };

  const sendDraft = async () => {
    if (!envelope?.id) return createAgreement(true);
    setBusy('send');
    try {
      const { data } = await api.post(`/signing/envelopes/${envelope.id}/send`);
      toast.success(data.message);
      await load();
      await onReload?.();
    } catch (error) { toast.error(error.response?.data?.error || 'Could not send agreement.'); }
    finally { setBusy(null); }
  };

  const voidAgreement = async () => {
    if (!envelope?.id) return;
    setBusy('void');
    try {
      await api.post(`/signing/envelopes/${envelope.id}/void`, { reason: 'Replaced from owner operations' });
      toast.success('Agreement voided.');
      await load();
      await onReload?.();
    } catch (error) { toast.error(error.response?.data?.error || 'Could not void agreement.'); }
    finally { setBusy(null); }
  };

  const saveContact = async () => {
    if (!contact?.id) return;
    setBusy('contact');
    try {
      const fields = ['full_name', 'primary_phone', 'alt_phone', 'whatsapp', 'email', 'address_line1', 'address_line2', 'area', 'city', 'district', 'postal_code', 'national_id', 'passport_no', 'tin', 'preferred_contact_method'];
      const payload = Object.fromEntries(fields.map((key) => [key, contactForm[key] ?? '']));
      await api.put(`/contacts/${contact.id}`, payload);
      toast.success('Owner contact updated.');
      setDrawer(null);
      await load();
      await onReload?.();
    } catch (error) { toast.error(error.response?.data?.error || 'Could not update owner contact.'); }
    finally { setBusy(null); }
  };

  const uploadDocument = async () => {
    if (!doc.file_url) return toast.error('Upload a file first.');
    setBusy('document');
    try {
      await api.post(`/properties/${property.id}/documents`, { ...doc, title: doc.title || 'Owner document', entity_type: 'owner', entity_id: property.owner_contact_id, is_private: true });
      toast.success('Owner document uploaded for verification.');
      setDoc({ title: '', doc_type: 'other', file_url: '', description: '' });
      setDrawer(null);
      await onReload?.();
    } catch (error) { toast.error(error.response?.data?.error || 'Could not upload document.'); }
    finally { setBusy(null); }
  };

  if (loading) return <div style={{ padding: 36, textAlign: 'center' }}><Spinner /></div>;
  if (!property.owner_contact_id) return <div className="pm-card"><div className="pm-empty"><div className="ic"><UserRound size={22} /></div><strong>No owner assigned</strong><span>Assign an owner to manage KYC, documents, banking and the management agreement.</span><Button icon={UserRound} onClick={onEditOwner}>Add owner</Button></div></div>;

  const ownerDocs = documents.filter((item) => item.entity_type === 'owner' && Number(item.entity_id) === Number(property.owner_contact_id));
  const agreementStatus = envelope?.status || profile?.status || ownerProfile?.agreement_status || 'not_started';
  const canSendDraft = envelope?.status === 'draft';
  const readyToSend = profile?.status === 'active' || (profile?.kyc_status === 'complete' && profile?.documents_status === 'complete');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="pm-kpis" style={{ gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>
        <div className="pm-kpi"><div className="top"><span className="lab">Owner</span></div><div className="val" style={{ fontSize: 17 }}>{contact?.full_name || '—'}</div><div className="pm-kpi-label">{contact?.primary_phone || 'No phone'}</div></div>
        <div className="pm-kpi pm-kpi--navy"><div className="top"><span className="lab">Held by us</span></div><div className="val pm-num" style={{ fontSize: 20 }}>{money(ownerHeld)}</div><div className="pm-kpi-label">Net property balance</div></div>
        <div className="pm-kpi pm-kpi--cyan"><div className="top"><span className="lab">Agreement</span></div><div className="val" style={{ fontSize: 17, textTransform: 'capitalize' }}>{label(agreementStatus)}</div><div className="pm-kpi-label">Management agreement</div></div>
        <div className="pm-kpi"><div className="top"><span className="lab">Documents</span></div><div className="val pm-num" style={{ fontSize: 20 }}>{ownerDocs.length}</div><div className="pm-kpi-label">{ownerDocs.filter((item) => item.verification_status === 'verified').length} verified</div></div>
      </div>

      <div className="pm-card">
        <div className="pm-card-h"><div className="ic"><UserRound size={16} /></div><h3 style={{ flex: 1 }}>Owner details</h3><Button size="sm" variant="ghost" icon={Edit} onClick={() => setDrawer('contact')}>Edit contact</Button><Button size="sm" icon={Edit} onClick={onEditOwner}>Edit KYC & terms</Button></div>
        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '0 24px' }}>
          <div><KV k="Name" v={contact?.full_name || '—'} /><KV k="Phone" v={contact?.primary_phone || '—'} /><KV k="WhatsApp" v={contact?.whatsapp || '—'} /><KV k="Email" v={contact?.email || '—'} /></div>
          <div><KV k="NID" v={ownerProfile?.nid_number || contact?.national_id || '—'} /><KV k="Passport" v={ownerProfile?.passport_number || contact?.passport_no || '—'} /><KV k="TIN" v={ownerProfile?.tin_number || contact?.tin || '—'} /><KV k="Ownership" v={label(ownerProfile?.ownership_status || property.ownership_type)} /></div>
        </div>
      </div>

      <div className="pm-card">
        <div className="pm-card-h"><div className="ic"><FileSignature size={16} /></div><h3 style={{ flex: 1 }}>Management agreement</h3><Badge tone={STATUS_TONE[profile?.status] || STATUS_TONE[agreementStatus] || 'grey'} dot>{label(agreementStatus)}</Badge></div>
        <div style={{ padding: 16 }}>
          {envelope && <div style={{ marginBottom: 12 }}><KV k="Envelope" v={envelope.envelope_code} /><KV k="Status" v={label(envelope.status)} />{envelope.signers?.map((signer) => <KV key={signer.id} k={`${signer.name} (${label(signer.role)})`} v={<Badge tone={STATUS_TONE[signer.status] || 'grey'}>{label(signer.status)}</Badge>} />)}</div>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!envelope || ['voided', 'declined', 'expired', 'completed'].includes(envelope.status) ? <Button variant="ghost" icon={FileText} onClick={() => createAgreement(false)} disabled={!!busy}>{busy === 'draft' ? <Spinner /> : 'Generate draft'}</Button> : null}
            {envelope && <Button variant="ghost" icon={Eye} onClick={() => setDrawer('preview')}>Preview</Button>}
            {canSendDraft ? <Button icon={Send} onClick={sendDraft} disabled={!!busy || !readyToSend}>{busy === 'send' ? <Spinner /> : 'Send for signing'}</Button> : !envelope ? <Button icon={Send} onClick={() => createAgreement(true)} disabled={!!busy || !readyToSend}>{busy === 'send' ? <Spinner /> : 'Generate & send'}</Button> : null}
            {envelope && ['draft', 'sent', 'viewed', 'partially_signed'].includes(envelope.status) && <Button variant="ghost" icon={XCircle} onClick={voidAgreement} disabled={!!busy}>Void</Button>}
          </div>
          {!contact?.email && <div className="cell-sub" style={{ color: 'var(--bad)', marginTop: 10 }}>Add the owner email before generating or sending the agreement.</div>}
          {contact?.email && !readyToSend && <div className="cell-sub" style={{ color: 'var(--warn)', marginTop: 10 }}>Verify the owner KYC documents before sending. Draft generation remains available for staff review.</div>}
        </div>
      </div>

      <div className="pm-card">
        <div className="pm-card-h"><div className="ic"><ShieldCheck size={16} /></div><h3 style={{ flex: 1 }}>Owner documents & KYC verification</h3><Button size="sm" variant="ghost" icon={Link2} onClick={requestDocuments} disabled={!!busy}>{busy === 'request' ? <Spinner /> : 'Request from owner'}</Button><Button size="sm" icon={Upload} onClick={() => setDrawer('document')}>Upload document</Button></div>
        <div style={{ padding: 16 }}><DocumentVerification propertyId={property.id} documents={ownerDocs} onReload={onReload} /></div>
      </div>

      <div className="pm-card">
        <div className="pm-card-h"><div className="ic"><Banknote size={16} /></div><h3>Banking, disbursement & fees</h3></div>
        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 20 }}>
          <div><KV k="Bank" v={ownerProfile?.bank_name || '—'} /><KV k="Account" v={ownerProfile?.bank_account_number ? `•••• ${String(ownerProfile.bank_account_number).slice(-4)}` : '—'} /><KV k="Preferred payment" v={label(ownerProfile?.preferred_payment)} /><KV k="Disbursement" v={`${label(ownerProfile?.disbursement_frequency || 'monthly')} · day ${ownerProfile?.disbursement_day || 1}`} /></div>
          <div>{fees.length ? fees.map((fee) => <KV key={fee.id} k={fee.fee_name} v={fee.amount_type === 'percentage' ? `${fee.amount_value}%` : money(fee.amount_value)} />) : <div className="cell-sub">No fee schedule configured.</div>}<Button size="sm" variant="ghost" icon={Wallet} onClick={onEditOwner} style={{ marginTop: 10 }}>Manage banking & fees</Button></div>
        </div>
      </div>

      {drawer === 'contact' && <Drawer title="Edit owner contact" width={620} onClose={() => setDrawer(null)} footer={<><Button variant="ghost" onClick={() => setDrawer(null)}>Cancel</Button><Button onClick={saveContact} disabled={busy === 'contact'}>{busy === 'contact' ? <Spinner /> : 'Save contact'}</Button></>}><div className="form-grid"><Field label="Full name"><Input value={contactForm.full_name || ''} onChange={(event) => setContactForm({ ...contactForm, full_name: event.target.value })} /></Field><Field label="Phone"><Input value={contactForm.primary_phone || ''} onChange={(event) => setContactForm({ ...contactForm, primary_phone: event.target.value })} /></Field><Field label="WhatsApp"><Input value={contactForm.whatsapp || ''} onChange={(event) => setContactForm({ ...contactForm, whatsapp: event.target.value })} /></Field><Field label="Email"><Input type="email" value={contactForm.email || ''} onChange={(event) => setContactForm({ ...contactForm, email: event.target.value })} /></Field><Field label="NID"><Input value={contactForm.national_id || ''} onChange={(event) => setContactForm({ ...contactForm, national_id: event.target.value })} /></Field><Field label="TIN"><Input value={contactForm.tin || ''} onChange={(event) => setContactForm({ ...contactForm, tin: event.target.value })} /></Field></div><Field label="Address"><Textarea rows={2} value={contactForm.address_line1 || ''} onChange={(event) => setContactForm({ ...contactForm, address_line1: event.target.value })} /></Field></Drawer>}
      {drawer === 'document' && <Drawer title="Upload owner document" width={560} onClose={() => setDrawer(null)} footer={<><Button variant="ghost" onClick={() => setDrawer(null)}>Cancel</Button><Button icon={Upload} onClick={uploadDocument} disabled={busy === 'document'}>{busy === 'document' ? <Spinner /> : 'Upload'}</Button></>}><Field label="Document title"><Input value={doc.title} onChange={(event) => setDoc({ ...doc, title: event.target.value })} /></Field><Field label="Document type"><Select value={doc.doc_type} onChange={(event) => setDoc({ ...doc, doc_type: event.target.value })}><option value="nid_front">NID front</option><option value="nid_back">NID back</option><option value="passport">Passport</option><option value="tin">TIN</option><option value="ownership_deed">Ownership deed</option><option value="tax_receipt">Tax receipt</option><option value="bank_document">Bank document</option><option value="power_of_attorney">Power of attorney</option><option value="other">Other</option></Select></Field><Field label="Private file"><FileUpload value={doc.file_url} onChange={(url) => setDoc({ ...doc, file_url: url })} label="Upload PDF or image" /></Field><Field label="Description"><Textarea rows={2} value={doc.description} onChange={(event) => setDoc({ ...doc, description: event.target.value })} /></Field></Drawer>}
      {drawer === 'preview' && envelope && <Drawer title={`Agreement preview — ${envelope.envelope_code}`} width={820} onClose={() => setDrawer(null)} footer={<Button onClick={() => setDrawer(null)}>Close</Button>}><iframe title="Agreement preview" sandbox="" srcDoc={envelope.document_html || '<p>No preview available.</p>'} style={{ width: '100%', minHeight: '65vh', border: '1px solid var(--border)', borderRadius: 8, background: '#fff' }} /></Drawer>}
    </div>
  );
}
