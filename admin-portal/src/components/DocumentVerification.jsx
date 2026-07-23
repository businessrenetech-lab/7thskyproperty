import React, { useState } from 'react';
import { ShieldCheck, Check, X, RotateCcw, FileText, Eye, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Button, Badge, Spinner } from '../ui/kit';
import { fileSrc } from '../ui/FileUpload';

/* Property document verification — aggregates all uploaded documents (owner KYC,
   property deeds, tenant docs, assessment reports) and lets staff verify / reject.
   Owner/landlord documents (from the register link or the owner wizard) auto-appear
   here as entity_type 'owner'. */

const GROUPS = [
  { key: 'owner', label: 'Owner / Landlord documents', hint: 'NID, ownership deed, khazna, tax, utility, bank' },
  { key: 'tenant', label: 'Tenant documents' },
  { key: 'property', label: 'Property documents' },
  { key: 'assessment', label: 'Assessment reports' },
];
const STATUS = {
  verified: { tone: 'green', label: 'Verified' },
  rejected: { tone: 'red', label: 'Rejected' },
  pending: { tone: 'amber', label: 'Pending' },
};

export default function DocumentVerification({ propertyId, documents = [], onReload }) {
  const toast = useToast();
  const [busyId, setBusyId] = useState(null);

  const act = async (doc, action) => {
    let reason;
    if (action === 'reject') { reason = window.prompt('Reason for rejecting this document (the owner may be asked to re-upload):') || ''; }
    setBusyId(doc.id);
    try { await api.patch(`/properties/${propertyId}/documents/${doc.id}/verify`, { action, reason }); await onReload?.(); }
    catch (e) { toast.error(e.response?.data?.error || 'Action failed.'); }
    finally { setBusyId(null); }
  };

  const known = new Set(GROUPS.map((g) => g.key));
  const grouped = GROUPS.map((g) => ({ ...g, docs: documents.filter((d) => (d.entity_type || 'property') === g.key) }));
  const otherDocs = documents.filter((d) => !known.has(d.entity_type || 'property'));
  if (otherDocs.length) grouped.push({ key: 'other', label: 'Other documents', docs: otherDocs });

  const total = documents.length;
  const verified = documents.filter((d) => d.verification_status === 'verified').length;
  const pending = documents.filter((d) => (d.verification_status || 'pending') === 'pending').length;

  return (
    <div className="pm-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="pm-card-h" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div className="ic"><ShieldCheck size={16} /></div><h3 style={{ margin: 0 }}>Document Verification</h3></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Badge tone="green">{verified} verified</Badge>
          {pending > 0 && <Badge tone="amber">{pending} pending</Badge>}
          <Badge tone="grey">{total} total</Badge>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {total === 0 ? (
          <div className="pm-empty"><div className="ic"><FileText size={22} /></div>No documents yet. Upload them in the owner form, or send the owner a registration link to submit their KYC and property documents.</div>
        ) : grouped.filter((g) => g.docs.length).map((g) => (
          <div key={g.key} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
              <span style={{ fontWeight: 750, fontSize: 13 }}>{g.label}</span>
              {g.hint && <span className="cell-sub" style={{ fontSize: 11.5 }}>{g.hint}</span>}
            </div>
            {g.docs.map((d) => {
              const st = STATUS[d.verification_status || 'pending'];
              return (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--line,#e5e7eb)', borderRadius: 10, marginBottom: 6, background: d.verification_status === 'rejected' ? 'var(--bad-bg,#fef2f2)' : '#fff' }}>
                  <FileText size={16} color="var(--navy,#003768)" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 650, fontSize: 13 }}>{d.title || d.doc_type || 'Document'}</div>
                    <div className="cell-sub" style={{ fontSize: 11.5 }}>
                      {(d.doc_type || '').replace(/_/g, ' ')}{d.required_for ? ` · ${d.required_for.replace(/_/g, ' ')}` : ''}
                      {d.rejection_reason ? <span style={{ color: 'var(--bad,#b91c1c)' }}> · {d.rejection_reason}</span> : ''}
                    </div>
                  </div>
                  <a href={fileSrc(d.file_url)} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm btn-icon" title="View"><Eye size={14} /></a>
                  <Badge tone={st.tone} dot>{st.label}</Badge>
                  {busyId === d.id ? <Spinner /> : (
                    <div style={{ display: 'flex', gap: 4 }}>
                      {d.verification_status !== 'verified' && <Button size="sm" variant="ghost" icon={Check} onClick={() => act(d, 'verify')} title="Verify" />}
                      {d.verification_status !== 'rejected' && <Button size="sm" variant="ghost" icon={X} onClick={() => act(d, 'reject')} title="Reject" />}
                      {d.verification_status !== 'pending' && <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => act(d, 'reset')} title="Reset to pending" />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        {pending > 0 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5, color: 'var(--warn,#b45309)', marginTop: 4 }}>
            <AlertTriangle size={14} /> {pending} document{pending > 1 ? 's' : ''} awaiting verification before the owner agreement can be finalised.
          </div>
        )}
      </div>
    </div>
  );
}
