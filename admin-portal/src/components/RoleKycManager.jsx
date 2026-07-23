import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Eye, FileCheck2, RefreshCw, ShieldCheck, Upload } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Field, Input, Spinner, StatusBadge } from '../ui/kit';
import FileUpload, { fileSrc } from '../ui/FileUpload';

export default function RoleKycManager({ profile, onChanged }) {
  const toast = useToast();
  const [requirements, setRequirements] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [requirementResponse, documentResponse] = await Promise.all([
        api.get(`/kyc/requirements/${profile.role_type}`),
        api.get(`/kyc/documents?related_type=party_role&related_id=${profile.id}&role=${profile.role_type}`),
      ]);
      setRequirements(requirementResponse.data.data || []);
      setDocuments(documentResponse.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not load KYC checklist');
    } finally { setLoading(false); }
  }, [profile.id, profile.role_type, toast]);

  useEffect(() => { load(); }, [load]);

  const latestByType = useMemo(() => documents.reduce((result, document) => {
    const current = result[document.document_type];
    if (!current || new Date(document.updatedAt || document.updated_at || document.createdAt || document.created_at || 0) > new Date(current.updatedAt || current.updated_at || current.createdAt || current.created_at || 0)) {
      result[document.document_type] = document;
    }
    return result;
  }, {}), [documents]);
  const required = requirements.filter((item) => item.required);
  const submitted = required.filter((item) => latestByType[item.document_type]?.file_url).length;
  const verified = required.filter((item) => latestByType[item.document_type]?.status === 'verified').length;

  const draftFor = (item) => ({
    file_url: latestByType[item.document_type]?.file_url || '',
    file_url_back: latestByType[item.document_type]?.file_url_back || '',
    reference_no: latestByType[item.document_type]?.reference_no || '',
    ...(drafts[item.document_type] || {}),
  });
  const setDraft = (type, patch) => setDrafts((current) => ({ ...current, [type]: { ...(current[type] || {}), ...patch } }));

  const saveDocument = async (item) => {
    const draft = draftFor(item);
    if (!draft.file_url || (item.front_back && !draft.file_url_back)) return toast.error(`Upload ${item.label}${item.front_back ? ' front and back' : ''} first`);
    setBusy(`save-${item.document_type}`);
    try {
      const existing = latestByType[item.document_type];
      const payload = {
        related_type: 'party_role', related_id: profile.id, party_role_profile_id: profile.id,
        role: profile.role_type, document_type: item.document_type, title: item.label,
        file_url: draft.file_url, file_url_back: draft.file_url_back || null,
        reference_no: draft.reference_no || null, is_required: item.required,
      };
      if (existing) await api.patch(`/kyc/documents/${existing.id}`, payload);
      else await api.post('/kyc/documents', payload);
      toast.success(`${item.label} submitted for verification`);
      setDrafts((current) => ({ ...current, [item.document_type]: undefined }));
      await load();
      await onChanged?.();
    } catch (error) { toast.error(error.response?.data?.error || 'Could not save KYC document'); }
    finally { setBusy(''); }
  };

  const review = async (item, action) => {
    const document = latestByType[item.document_type];
    if (!document) return;
    const reason = action === 'reject' ? window.prompt('Reason for rejection / resubmission:') : '';
    if (action === 'reject' && reason === null) return;
    setBusy(`${action}-${item.document_type}`);
    try {
      await api.patch(`/kyc/documents/${document.id}/verify`, { action, reason });
      toast.success(action === 'verify' ? `${item.label} verified` : `${item.label} marked for resubmission`);
      await load();
      await onChanged?.();
    } catch (error) { toast.error(error.response?.data?.error || 'KYC review failed'); }
    finally { setBusy(''); }
  };

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><Spinner /></div>;

  return <div className="card" style={{ padding: 14 }}>
    <div className="between" style={{ marginBottom: 10 }}>
      <div>
        <div style={{ fontWeight: 750, fontSize: 13.5 }}><ShieldCheck size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />KYC completion</div>
        <div className="cell-sub" style={{ fontSize: 12 }}>{submitted}/{required.length} required files submitted · {verified}/{required.length} verified</div>
      </div>
      <div className="wrap-gap"><StatusBadge status={profile.kyc_status} /><StatusBadge status={profile.documents_status} /><Button size="sm" variant="ghost" icon={RefreshCw} onClick={load}>Refresh</Button></div>
    </div>

    {!requirements.length ? <div className="cell-sub">No KYC is required for this role.</div> : requirements.map((item) => {
      const document = latestByType[item.document_type];
      const draft = draftFor(item);
      return <div key={item.document_type} style={{ padding: 11, marginTop: 8, border: '1px solid var(--border)', borderRadius: 9, background: 'var(--surface-2)' }}>
        <div className="between">
          <div className="wrap-gap"><FileCheck2 size={15} color="var(--primary)" /><b style={{ fontSize: 12.5 }}>{item.label}</b>{item.required ? <Badge tone="amber">Required</Badge> : <Badge tone="grey">Optional</Badge>}</div>
          <div className="wrap-gap"><StatusBadge status={document?.status || 'missing'} />{document?.file_url && <a className="btn btn-ghost btn-sm" href={fileSrc(document.file_url)} target="_blank" rel="noreferrer"><Eye size={14} /> View</a>}</div>
        </div>
        {document?.rejection_reason && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 7 }}>{document.rejection_reason}</div>}
        {document?.status !== 'verified' && <div style={{ marginTop: 9, display: 'grid', gap: 8 }}>
          <FileUpload compact folder="documents" value={draft.file_url} onChange={(file_url) => setDraft(item.document_type, { file_url })} label={`Upload ${item.label}${item.front_back ? ' front' : ''}`} />
          {item.front_back && <FileUpload compact folder="documents" value={draft.file_url_back} onChange={(file_url_back) => setDraft(item.document_type, { file_url_back })} label={`Upload ${item.label} back`} />}
          {item.reference && <Field label="Reference / document number"><Input value={draft.reference_no} onChange={(event) => setDraft(item.document_type, { reference_no: event.target.value })} /></Field>}
          <div><Button size="sm" icon={Upload} onClick={() => saveDocument(item)} disabled={busy}>{busy === `save-${item.document_type}` ? <Spinner /> : document ? 'Save replacement' : 'Submit document'}</Button></div>
        </div>}
        {document?.status === 'submitted' && <div className="wrap-gap" style={{ marginTop: 9 }}><Button size="sm" icon={Check} onClick={() => review(item, 'verify')} disabled={busy}>Verify</Button><Button size="sm" variant="ghost" onClick={() => review(item, 'resubmit')} disabled={busy}>Request resubmission</Button></div>}
      </div>;
    })}
  </div>;
}
