import React from 'react';
import { Link } from 'react-router-dom';
import { FileSignature, Tags, Landmark, Building2, ScrollText, Receipt, ArrowRight } from 'lucide-react';
import { PageHead } from '../../ui/kit';

/*
 * Business Registration — console home (Phase 0).
 *
 * The service coordinates trade licence, company registration (RJSC), tax
 * (TIN/BIN/VAT) and corporate documentation on the client's behalf across a
 * 9-phase / 27-step SOP. Phase 0 ships the Customer Service Agreement
 * (SSPC-BR-CSA-01) and its Schedule C price schedule; later phases add the
 * project pipeline, document collection, provider work orders, invoicing and
 * dashboards. This landing wires the live entry points and previews what is next.
 */

const teal = '#0d9488';

function QuickLink({ to, icon: Icon, title, desc }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div style={{ background: '#fff', border: '1px solid #d5f0eb', borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, transition: 'box-shadow .15s', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(13,148,136,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={22} color={teal} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#115e59' }}>{title}</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{desc}</div>
        </div>
        <ArrowRight size={18} color={teal} />
      </div>
    </Link>
  );
}

const PHASES = [
  ['Phase 0', 'Agreements & Price Schedules', 'Customer Service Agreement (SSPC-BR-CSA-01) + Schedule C pricing', true],
  ['Phase 1', 'Client CRM & Projects', 'Enquiries → client register → registration projects (BRS-2027-xxx)', false],
  ['Phase 2', 'Consultation & Documents', 'Business structure assessment, shareholders/directors, KYC document register', false],
  ['Phase 3', 'Provider Work Orders', 'Assign approved providers, work orders & registration activities (name clearance, RJSC, TIN/BIN/VAT)', false],
  ['Phase 4', 'Financials', 'Quotations, deposit / progress / final invoicing & payments', false],
  ['Phase 5', 'Reports & Dashboards', 'Registration, revenue, government liaison, provider & profitability dashboards', false],
];

export default function BusinessRegistrationDashboard() {
  return (
    <div className="pm-scope">
      <PageHead
        title="Business Registration"
        desc="Trade licence, company registration, tax & corporate documentation — coordinated end-to-end. Scoped entirely to the Business Registration service."
      />

      <div style={{ background: 'linear-gradient(135deg,#0d9488,#115e59)', borderRadius: 16, padding: '22px 24px', color: '#fff', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Landmark size={30} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Coordination service · 9-phase SOP (SSPC-BR-SOP-01)</div>
          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 3 }}>Seventh Sky coordinates registrations with government authorities and approved specialist providers — it does not issue approvals itself.</div>
        </div>
      </div>

      <div style={{ fontWeight: 700, fontSize: 13, color: '#6b7280', margin: '4px 0 10px', letterSpacing: 0.4 }}>QUICK LINKS</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
        <QuickLink to="/business-registration/agreements" icon={FileSignature} title="Registration Agreements" desc="Build, price & e-sign the Customer Service Agreement" />
        <QuickLink to="/business-registration/price-schedule" icon={Tags} title="Price Schedules" desc="Edit Schedule C standard pricing (BRC-001 … BRC-020)" />
      </div>

      <div style={{ fontWeight: 700, fontSize: 13, color: '#6b7280', margin: '22px 0 10px', letterSpacing: 0.4 }}>BUILD ROADMAP</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {PHASES.map(([tag, title, desc, done]) => (
          <div key={tag} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, opacity: done ? 1 : 0.72 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: done ? '#fff' : '#6b7280', background: done ? teal : '#f3f4f6', borderRadius: 6, padding: '3px 8px', minWidth: 58, textAlign: 'center' }}>{tag}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1f2937' }}>{title}</div>
              <div style={{ fontSize: 12.5, color: '#6b7280', marginTop: 1 }}>{desc}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: done ? teal : '#9ca3af' }}>{done ? '● Live' : 'Planned'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
