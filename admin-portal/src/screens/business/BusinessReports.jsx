import React, { useEffect, useState } from 'react';
import { Building2, Coins, HandCoins, Receipt, Layers, MessageSquareQuote, Handshake, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { PageHead, Button, StatCard, Spinner } from '../../ui/kit';
import { STAGE_LABEL } from './BusinessListingForm';

const money = (n) => `৳${Number(n || 0).toLocaleString()}`;

function Breakdown({ title, data, labelMap }) {
  const entries = Object.entries(data || {}).filter(([, n]) => n);
  if (!entries.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #e7e3f3', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#1b1440' }}>{title}</div>
      <div style={{ display: 'grid', gap: 6 }}>
        {entries.map(([k, n]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: '#6b7280', textTransform: 'capitalize' }}>{(labelMap && labelMap[k]) || k.replace(/_/g, ' ')}</span>
            <b>{n}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BusinessReports({ listingType }) {
  const isRent = listingType === 'rent';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); api.get('/business-reports/overview', { params: listingType ? { listing_type: listingType } : {} }).then((r) => setData(r.data.data)).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, [listingType]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !data) return <div className="pm-scope" style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>;
  const { listings, enquiries, offers, settlements, invoices, leases } = data;

  return (
    <div className="pm-scope">
      <PageHead title={isRent ? 'Business Rent Reports' : 'Business Sale Reports'} desc={isRent ? 'Rent pipeline, leases & rent collection — scoped to Business Rent only.' : 'Pipeline & financials — every figure is scoped to the Business Sale module only.'}
        actions={<Button variant="ghost" icon={RefreshCw} onClick={load}>Refresh</Button>} />

      {isRent && leases && (
        <>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#6b7280', margin: '10px 0 8px' }}>LEASE MANAGEMENT</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
            <StatCard icon={Building2} label="Active leases" value={leases.active} tone="violet" />
            <StatCard icon={Coins} label="Rent collected" value={money(leases.rent_collected)} tone="green" />
            <StatCard icon={HandCoins} label="Rent scheduled" value={money(leases.rent_due)} tone="blue" />
            <StatCard icon={Layers} label="Rent arrears" value={money(leases.rent_arrears)} tone={leases.rent_arrears > 0 ? 'red' : 'green'} />
          </div>
        </>
      )}

      <div style={{ fontWeight: 700, fontSize: 13, color: '#6b7280', margin: '10px 0 8px' }}>PIPELINE</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <StatCard icon={Building2} label="Listings" value={listings.total} tone="violet" />
        <StatCard icon={Coins} label="Pipeline value" value={money(listings.pipeline_value)} tone="blue" />
        <StatCard icon={MessageSquareQuote} label="Buyer enquiries" value={enquiries.total} tone="amber" />
        <StatCard icon={Handshake} label="Offers" value={offers.total} tone="green" />
      </div>

      <div style={{ fontWeight: 700, fontSize: 13, color: '#6b7280', margin: '18px 0 8px' }}>FINANCIALS</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <StatCard icon={HandCoins} label="Commission earned" value={money(settlements.commission_earned)} tone="violet" />
        <StatCard icon={HandCoins} label="Commission collected" value={money(settlements.commission_collected)} tone="green" />
        <StatCard icon={Receipt} label="Invoiced" value={money(invoices.total_invoiced)} tone="blue" />
        <StatCard icon={Receipt} label="Collected" value={money(invoices.total_collected)} tone="green" />
        <StatCard icon={Layers} label="Outstanding" value={money(invoices.outstanding)} tone={invoices.outstanding > 0 ? 'red' : 'green'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 18 }}>
        <Breakdown title="Listings by SOP stage" data={listings.by_stage} labelMap={STAGE_LABEL} />
        <Breakdown title="Listings by status" data={listings.by_status} />
        <Breakdown title="Listings by type" data={listings.by_type} />
        <Breakdown title="Enquiries by stage" data={enquiries.by_stage} />
        <Breakdown title="Offers by status" data={offers.by_status} />
      </div>
    </div>
  );
}
