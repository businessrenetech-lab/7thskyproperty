import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, AlertTriangle, ArrowRight } from 'lucide-react';
import api from '../services/api';
import { Badge } from '../ui/kit';

/**
 * PropertyRoleStrip — the "who is legally attached to this property" strip.
 * Shows each party (landlord/tenant/vendor/…) with their agreement state:
 *   Active ✓ | Draft — complete the agreement | Signing in progress | …
 * Clicking a card opens Role Onboarding to finish the process.
 */
const STATUS_META = {
  active: { tone: 'green', label: 'Active', cta: null },
  draft: { tone: 'red', label: 'Draft', cta: 'Complete the agreement' },
  kyc_pending: { tone: 'amber', label: 'KYC pending', cta: 'Waiting for registration' },
  documents_pending: { tone: 'amber', label: 'Documents pending', cta: 'Collect documents' },
  agreement_pending: { tone: 'amber', label: 'Agreement pending', cta: 'Generate & send agreement' },
  signing_sent: { tone: 'blue', label: 'Signing in progress', cta: 'Waiting for signatures' },
  partially_signed: { tone: 'blue', label: 'Partially signed', cta: 'Waiting for signatures' },
  signed: { tone: 'green', label: 'Signed', cta: 'Finalising…' },
  approval_pending: { tone: 'amber', label: 'Approval pending', cta: 'Awaiting approval' },
  rejected: { tone: 'red', label: 'Rejected', cta: null },
  declined: { tone: 'red', label: 'Agreement declined', cta: 'Review & resend' },
  expired: { tone: 'grey', label: 'Relationship ended', cta: null },
  voided: { tone: 'grey', label: 'Voided', cta: null },
};

export default function PropertyRoleStrip({ propertyId }) {
  const nav = useNavigate();
  const [roles, setRoles] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/party-role-profiles?property_id=${propertyId}&limit=20`);
      setRoles(data.data || []);
    } catch { setRoles([]); }
  }, [propertyId]);
  useEffect(() => { load(); }, [load]);

  if (!roles || !roles.length) return null;

  return (
    <div className="card" style={{ padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
        <UserCheck size={14} /> Parties
      </div>
      {roles.map((r) => {
        const meta = STATUS_META[r.status] || STATUS_META.draft;
        return (
          <button key={r.id} onClick={() => nav('/role-onboarding')}
            className="badge" style={{ background: 'var(--surface)', border: `1px solid var(--${meta.tone === 'grey' ? 'border-strong' : meta.tone})`, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', fontSize: 12 }}>
            <span style={{ textTransform: 'capitalize', fontWeight: 700 }}>{r.role_type?.replace('_', ' ')}:</span>
            <span>{r.contact?.full_name || '—'}</span>
            <Badge tone={meta.tone} dot>{meta.label}</Badge>
            {meta.cta && r.status !== 'active' && (
              <span style={{ color: `var(--${meta.tone === 'grey' ? 'muted' : meta.tone})`, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                {r.status === 'draft' && <AlertTriangle size={11} />}
                {meta.cta} <ArrowRight size={10} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
