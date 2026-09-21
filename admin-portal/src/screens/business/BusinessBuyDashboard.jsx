import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, ClipboardList, MessageSquareQuote, FileSignature, Tags, Receipt, BarChart3, ArrowRight } from 'lucide-react';
import api from '../../services/api';

/*
 * BusinessBuyDashboard — the Business BUY (acquisition) console home.
 * Buy is mandate-driven (we represent an acquirer): acquisition mandates, a
 * target shortlist, purchase agreements and buy-side invoices. Fully separate
 * from the Sale and Rent consoles.
 */
const ACCENT = '#4f46e5';
const money = (n) => (n == null ? '—' : `৳${Number(n).toLocaleString()}`);

function Card({ to, icon: Icon, title, desc }) {
  return (
    <Link to={to} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, textDecoration: 'none', background: '#fff', border: '1px solid #e0e7ff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 2px rgba(16,24,40,.04)' }}>
      <span style={{ display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: 10, background: 'rgba(79,70,229,.12)', color: ACCENT, flex: '0 0 auto' }}><Icon size={22} /></span>
      <span style={{ flex: 1 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#1e1b4b' }}>{title} <ArrowRight size={15} style={{ color: ACCENT }} /></span>
        <span style={{ display: 'block', marginTop: 4, fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{desc}</span>
      </span>
    </Link>
  );
}

export default function BusinessBuyDashboard() {
  const [rep, setRep] = useState(null);
  useEffect(() => { api.get('/business-reports/buy-overview').then((r) => setRep(r.data.data)).catch(() => {}); }, []);

  return (
    <div className="pm-scope" style={{ padding: '4px 2px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 10, background: 'rgba(79,70,229,.12)', color: ACCENT }}><Briefcase size={22} /></span>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1e1b4b' }}>Business Buy</h1>
          <p style={{ margin: '2px 0 0', color: '#6b7280', fontSize: 13.5 }}>Acquire a business on a client's behalf — mandates, target shortlist and purchase coordination (SSPC-BPS-01).</p>
        </div>
      </div>

      {rep && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 16 }}>
          {[['Acquisition mandates', rep.mandates.total], ['Target shortlist', rep.targets.total], ['Buy invoiced', money(rep.invoices.total_invoiced)], ['Outstanding', money(rep.invoices.outstanding)]].map(([label, value]) => (
            <div key={label} style={{ background: '#fff', border: '1px solid #e0e7ff', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1e1b4b', marginTop: 2 }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginTop: 18 }}>
        <Card to="/business-buy/mandates" icon={ClipboardList} title="Acquisition Mandates" desc="Buyer requirements, budget and target shortlist — the Business Purchase pipeline." />
        <Card to="/business-buy/enquiries" icon={MessageSquareQuote} title="Acquirer Enquiries" desc="Acquirers looking to buy a business — requirements and lead pipeline." />
        <Card to="/business-buy/agreements" icon={FileSignature} title="Purchase Agreements" desc="Business Purchase Customer Service Agreement (SSPC-BPS-01) — build, price & e-sign with the buyer." />
        <Card to="/business-buy/price-schedule" icon={Tags} title="Price Schedules" desc="Standard Schedule C price schedule for business purchase (BPS) services." />
        <Card to="/business-buy/invoices" icon={Receipt} title="Buy Invoices" desc="Acquisition service-fee & success-fee invoices raised against a mandate, with payments." />
        <Card to="/business-buy/reports" icon={BarChart3} title="Buy Reports" desc="Acquisition pipeline & financials — mandates, targets, buy invoiced/collected/outstanding." />
      </div>
    </div>
  );
}
