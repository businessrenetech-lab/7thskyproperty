import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSignature, Tags, Briefcase, ArrowRight, Building2, MessageSquareQuote, Receipt, BarChart3 } from 'lucide-react';
import api from '../../services/api';

/*
 * BusinessSaleDashboard — Phase 0 landing for the Business Sale console.
 * The full SOP pipeline (leads, business listings, assessments, due diligence,
 * offers, settlement, financials) lands in later phases; Phase 0 exposes the
 * two Customer Service Agreements and their price schedules.
 */
const ACCENT = '#7c3aed';

function Card({ to, icon: Icon, title, desc }) {
  return (
    <Link to={to} style={{
      display: 'flex', alignItems: 'flex-start', gap: 14, textDecoration: 'none',
      background: '#fff', border: '1px solid #e7e3f3', borderRadius: 14, padding: '18px 20px',
      boxShadow: '0 1px 2px rgba(16,24,40,.04)', transition: 'border-color .15s',
    }}>
      <span style={{ display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: 10, background: 'rgba(124,58,237,.12)', color: ACCENT, flex: '0 0 auto' }}>
        <Icon size={22} />
      </span>
      <span style={{ flex: 1 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#1b1440' }}>
          {title} <ArrowRight size={15} style={{ color: ACCENT }} />
        </span>
        <span style={{ display: 'block', marginTop: 4, fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{desc}</span>
      </span>
    </Link>
  );
}

const money = (n) => (n == null ? '—' : `৳${Number(n).toLocaleString()}`);

export default function BusinessSaleDashboard() {
  const [rep, setRep] = useState(null);
  useEffect(() => { api.get('/business-reports/overview', { params: { listing_type: 'sale' } }).then((r) => setRep(r.data.data)).catch(() => {}); }, []);

  return (
    <div className="pm-scope" style={{ padding: '4px 2px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 10, background: 'rgba(124,58,237,.12)', color: ACCENT }}>
          <Building2 size={22} />
        </span>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1b1440' }}>Business Sale</h1>
          <p style={{ margin: '2px 0 0', color: '#6b7280', fontSize: 13.5 }}>
            Sell a business on the owner's behalf — listings, buyer screening, sale coordination & settlement (SSPC-BSS-01).
          </p>
        </div>
      </div>

      {rep && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 16 }}>
          {[['Business listings', rep.listings.total], ['Pipeline value', money(rep.listings.pipeline_value)], ['Commission earned', money(rep.settlements.commission_earned)], ['Outstanding invoices', money(rep.invoices.outstanding)]].map(([label, value]) => (
            <div key={label} style={{ background: '#fff', border: '1px solid #e7e3f3', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1b1440', marginTop: 2 }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginTop: 18 }}>
        <Card to="/business/listings" icon={Building2} title="Business Listings"
          desc="Businesses engaged for sale — profile, financials, ownership and the SOP pipeline stage." />
        <Card to="/business/enquiries" icon={MessageSquareQuote} title="Buyer Enquiries"
          desc="Buyers & investors — screening, financial capability and lead pipeline (SOP Steps 11–12)." />
        <Card to="/business/sale/agreements" icon={FileSignature} title="Sale Agreements"
          desc="Business Sale Customer Service Agreement (SSPC-BSS-01) — build, price, and send to the seller for e-signature." />
        <Card to="/business/price-schedule" icon={Tags} title="Price Schedules"
          desc="Standard Schedule C price schedule for business sale (BSS) services." />
        <Card to="/business/invoices" icon={Receipt} title="Sale Invoices"
          desc="Service-fee & commission invoices for business sales, with payments — isolated to the Sale console." />
        <Card to="/business/reports" icon={BarChart3} title="Sale Reports"
          desc="Sale pipeline & financial rollups — commission earned/collected, invoiced/outstanding, funnels." />
      </div>

      <div style={{ marginTop: 22, padding: '14px 18px', background: '#faf8ff', border: '1px dashed #d9cffb', borderRadius: 12, color: '#5b21b6', fontSize: 13 }}>
        Looking to <Link to="/business-buy" style={{ color: '#4338ca', fontWeight: 700 }}>buy a business</Link> or <Link to="/business-rent" style={{ color: '#be185d', fontWeight: 700 }}>rent / lease one</Link>? Each has its own dedicated console.
      </div>
    </div>
  );
}
