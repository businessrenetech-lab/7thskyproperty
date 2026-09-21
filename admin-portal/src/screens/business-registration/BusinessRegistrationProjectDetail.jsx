import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Building2, User, FileSignature, Landmark } from 'lucide-react';
import api from '../../services/api';
import { Button, Badge, Spinner, KV, Field, Select, Textarea } from '../../ui/kit';
import { STAGES, STAGE_LABEL, STATUSES, STATUS_TONE, BIZ_TYPE_LABEL, URGENCY_TONE, money } from './constants';

const teal = '#0d9488';

function Section({ title, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 18px', marginBottom: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: '#115e59', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

export default function BusinessRegistrationProjectDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/business-registration-projects/${id}`).then((r) => setP(r.data.data)).catch(() => setP(null)).finally(() => setLoading(false));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const move = (patch) => {
    setBusy(true);
    api.patch(`/business-registration-projects/${id}/move`, patch).then((r) => setP(r.data.data)).catch(() => {}).finally(() => setBusy(false));
  };

  if (loading) return <div className="pm-scope" style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>;
  if (!p) return <div className="pm-scope" style={{ padding: 40 }}>Project not found. <Button variant="ghost" onClick={() => nav('/business-registration/projects')}>Back</Button></div>;

  const services = Array.isArray(p.service_selection) ? p.service_selection : (typeof p.service_selection === 'string' ? (() => { try { return JSON.parse(p.service_selection); } catch { return []; } })() : []);
  const curIdx = STAGES.findIndex((s) => s.key === p.stage);

  const TABS = [
    ['overview', 'Overview'],
    ['workflow', 'Workflow'],
    ['documents', 'Documents'],
    ['providers', 'Work Orders'],
    ['finance', 'Finance'],
  ];

  return (
    <div className="pm-scope">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Button variant="ghost" icon={ArrowLeft} onClick={() => nav('/business-registration/projects')}>Back</Button>
      </div>

      <div style={{ background: 'linear-gradient(135deg,#0d9488,#115e59)', borderRadius: 16, padding: '20px 24px', color: '#fff', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 600 }}>{p.project_code}</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>{p.business_name || p.client_name}</div>
            <div style={{ fontSize: 13, opacity: 0.9, marginTop: 3 }}>{p.registration_type || BIZ_TYPE_LABEL[p.business_type] || 'Business Registration'} · Client: {p.client_name}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Badge tone={URGENCY_TONE[p.urgency] || 'grey'}>{p.urgency}</Badge>
            <Badge tone="violet">{STAGE_LABEL[p.stage] || p.stage}</Badge>
            <Badge tone={STATUS_TONE[p.status] || 'grey'}>{p.status}</Badge>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e5e7eb', marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: tab === k ? teal : '#6b7280', borderBottom: tab === k ? `2px solid ${teal}` : '2px solid transparent' }}>{label}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <Section title={<><User size={14} style={{ verticalAlign: -2 }} /> Client</>}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 6 }}>
              <KV k="Name" v={p.client_name} /><KV k="Type" v={p.client_type} /><KV k="NID / Passport" v={p.client_nid} />
              <KV k="Phone" v={p.client_phone} /><KV k="Email" v={p.client_email} /><KV k="Address" v={p.client_address} />
            </div>
          </Section>
          <Section title={<><Building2 size={14} style={{ verticalAlign: -2 }} /> Business</>}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 6 }}>
              <KV k="Business name" v={p.business_name} /><KV k="Type" v={BIZ_TYPE_LABEL[p.business_type] || p.business_type} />
              <KV k="Registration type" v={p.registration_type} /><KV k="Nature" v={p.nature_of_business} />
              <KV k="Owners" v={p.number_of_owners} /><KV k="Directors" v={p.number_of_directors} />
              <KV k="Capital structure" v={p.capital_structure} /><KV k="Business address" v={p.business_address} />
              <KV k="Authorities" v={p.authorities} />
            </div>
          </Section>
          <Section title={<><Landmark size={14} style={{ verticalAlign: -2 }} /> Commercials</>}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 6 }}>
              <KV k="Quoted" v={money(p.quoted_amount)} /><KV k="Deposit" v={money(p.deposit_amount)} />
              <KV k="Government fees" v={money(p.government_fees)} /><KV k="Contract value" v={money(p.contract_value)} />
              <KV k="Lead source" v={p.lead_source} />
            </div>
          </Section>
          {services.length > 0 && (
            <Section title="Selected Services (Schedule A)">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {services.map((s) => <span key={s} style={{ fontSize: 12, padding: '3px 9px', borderRadius: 999, background: 'rgba(13,148,136,.1)', color: '#115e59', fontWeight: 600 }}>{s}</span>)}
              </div>
            </Section>
          )}
          {(p.scope_of_work || p.special_requirements || p.notes) && (
            <Section title="Notes">
              {p.scope_of_work && <div style={{ marginBottom: 8 }}><b style={{ fontSize: 12, color: '#6b7280' }}>Scope of work</b><div style={{ fontSize: 13 }}>{p.scope_of_work}</div></div>}
              {p.special_requirements && <div style={{ marginBottom: 8 }}><b style={{ fontSize: 12, color: '#6b7280' }}>Special requirements</b><div style={{ fontSize: 13 }}>{p.special_requirements}</div></div>}
              {p.notes && <div><b style={{ fontSize: 12, color: '#6b7280' }}>Notes</b><div style={{ fontSize: 13 }}>{p.notes}</div></div>}
            </Section>
          )}
        </>
      )}

      {tab === 'workflow' && (
        <Section title="SOP Pipeline (SSPC-BR-SOP-01)">
          <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
            {STAGES.filter((s) => s.key !== 'closed').map((s, i) => {
              const done = i < curIdx;
              const current = i === curIdx;
              return (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, border: current ? `1.5px solid ${teal}` : '1px solid #e5e7eb', background: current ? 'rgba(13,148,136,.06)' : '#fff' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: done ? teal : current ? '#fff' : '#f3f4f6', border: current ? `2px solid ${teal}` : 'none', color: done ? '#fff' : current ? teal : '#9ca3af', fontWeight: 700, fontSize: 12 }}>
                    {done ? <Check size={14} /> : i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: current ? '#115e59' : '#374151' }}>{s.label}</div>
                    {s.phase && <div style={{ fontSize: 11, color: '#9ca3af' }}>{s.phase}</div>}
                  </div>
                  {!done && !current && <Button size="sm" variant="ghost" disabled={busy} onClick={() => move({ stage: s.key })}>Jump here</Button>}
                  {current && i < STAGES.length - 2 && <Button size="sm" disabled={busy} onClick={() => move({ stage: STAGES[i + 1].key })}>Advance →</Button>}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 460 }}>
            <Field label="Stage"><Select value={p.stage} disabled={busy} onChange={(e) => move({ stage: e.target.value })}>{STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select></Field>
            <Field label="Status"><Select value={p.status} disabled={busy} onChange={(e) => move({ status: e.target.value })}>{STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select></Field>
          </div>
        </Section>
      )}

      {(tab === 'documents' || tab === 'providers' || tab === 'finance') && (
        <Section title={tab === 'documents' ? 'Document Collection' : tab === 'providers' ? 'Provider Work Orders' : 'Finance'}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6b7280', fontSize: 13, padding: '8px 0' }}>
            <FileSignature size={16} color={teal} />
            {tab === 'documents' && 'Document register (KYC, shareholder/director docs) arrives in Phase 2.'}
            {tab === 'providers' && 'Provider assignment, work orders & registration activities (name clearance, RJSC, TIN/BIN/VAT) arrive in Phase 3.'}
            {tab === 'finance' && 'Quotation, deposit / progress / final invoicing & payments arrive in Phase 4.'}
          </div>
        </Section>
      )}
    </div>
  );
}
