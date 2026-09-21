import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, MessageSquareQuote, FileSignature, Tags, BarChart3, ArrowRight, Coins } from 'lucide-react';
import api from '../../services/api';

/*
 * BusinessRentDashboard — the Business RENT (leasing) console home.
 * Rental listings (listing_type='rent'), tenant enquiries, rental/tenancy
 * management agreements and lease/rent collection. Separate from Sale and Buy.
 */
const ACCENT = '#db2777';
const money = (n) => (n == null ? '—' : `৳${Number(n).toLocaleString()}`);

function Card({ to, icon: Icon, title, desc }) {
  return (
    <Link to={to} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, textDecoration: 'none', background: '#fff', border: '1px solid #fce7f3', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 2px rgba(16,24,40,.04)' }}>
      <span style={{ display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: 10, background: 'rgba(219,39,119,.12)', color: ACCENT, flex: '0 0 auto' }}><Icon size={22} /></span>
      <span style={{ flex: 1 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#831843' }}>{title} <ArrowRight size={15} style={{ color: ACCENT }} /></span>
        <span style={{ display: 'block', marginTop: 4, fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{desc}</span>
      </span>
    </Link>
  );
}

export default function BusinessRentDashboard() {
  const [rep, setRep] = useState(null);
  useEffect(() => { api.get('/business-reports/overview', { params: { listing_type: 'rent' } }).then((r) => setRep(r.data.data)).catch(() => {}); }, []);

  return (
    <div className="pm-scope" style={{ padding: '4px 2px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 10, background: 'rgba(219,39,119,.12)', color: ACCENT }}><Building2 size={22} /></span>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#831843' }}>Business Rent</h1>
          <p style={{ margin: '2px 0 0', color: '#6b7280', fontSize: 13.5 }}>Lease a business or premises — marketing, tenant screening, lease coordination & rent management (SSPC-BRMS-01 / BTMS-01).</p>
        </div>
      </div>

      {rep && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 16 }}>
          {[['Rental listings', rep.listings.total], ['Active leases', rep.leases.active], ['Rent collected', money(rep.leases.rent_collected)], ['Rent arrears', money(rep.leases.rent_arrears)]].map(([label, value]) => (
            <div key={label} style={{ background: '#fff', border: '1px solid #fce7f3', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#831843', marginTop: 2 }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginTop: 18 }}>
        <Card to="/business-rent/listings" icon={Building2} title="Rental Listings" desc="Businesses & premises engaged for lease — the leasing SOP pipeline and lease management." />
        <Card to="/business-rent/enquiries" icon={MessageSquareQuote} title="Tenant Enquiries" desc="Tenants / operators looking to lease — screening and lead pipeline." />
        <Card to="/business-rent/rental-agreements" icon={FileSignature} title="Rental Management" desc="Business Rental Management Agreement (SSPC-BRMS-01) — signed with the owner/landlord." />
        <Card to="/business-rent/tenancy-agreements" icon={FileSignature} title="Tenancy Management" desc="Business Tenancy Management Agreement (SSPC-BTMS-01) — signed with the tenant." />
        <Card to="/business-rent/price-schedule" icon={Tags} title="Price Schedules" desc="Standard Schedule C price schedules for rental (BRM) & tenancy (BTM) management." />
        <Card to="/business-rent/reports" icon={BarChart3} title="Rent Reports" desc="Leasing pipeline, active leases, rent collected & arrears." />
      </div>
    </div>
  );
}
