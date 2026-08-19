import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Droplet, Wind, Sofa, Truck, Sun, ConciergeBell, FileCheck2, Wrench, ClipboardList, LayoutDashboard, ScrollText, Plus } from 'lucide-react';
import api from '../../services/api';
import { Spinner } from '../../ui/kit';

const bdt = (v) => '৳' + Number(v || 0).toLocaleString('en-BD');

// The seven Seventh Sky service lines. `vertical` maps to the care_services catalog vertical.
export const SERVICE_LINES = {
  'water-tank': { name: 'Water Tank Services', vertical: 'water_tank', icon: Droplet, blurb: 'Cleaning, sanitisation, repair and AMC for residential & commercial water tanks.' },
  'air-conditioning': { name: 'Air Conditioning', vertical: 'air_conditioning', icon: Wind, blurb: 'AC installation, servicing, gas refill, repair and maintenance contracts.' },
  'interior-design': { name: 'Interior Design', vertical: 'interior_design', icon: Sofa, blurb: 'Design consultation, fit-out, furnishing and styling coordination.' },
  'removal': { name: 'Removal Services', vertical: 'removal', icon: Truck, blurb: 'Home & office moving, packing, transport and relocation support.' },
  'solar-energy': { name: 'Solar & Energy', vertical: 'solar_energy', icon: Sun, blurb: 'Solar assessment, installation, energy efficiency and maintenance.' },
  'property-care-concierge': { name: 'Property Care & Concierge Services', vertical: 'property_care_concierge', icon: ConciergeBell, blurb: 'General property care, handyman, cleaning and concierge coordination.' },
  'doc-verification': { name: 'Property Doc Verification & Transfer Support', vertical: 'doc_verification', icon: FileCheck2, blurb: 'Ownership verification, due diligence, mutation and transfer support.' },
};

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'operations', label: 'Operations', icon: Wrench },
  { id: 'sop', label: 'SOP', icon: ScrollText },
];

export default function ServiceLineDashboard() {
  const { slug } = useParams();
  const svc = SERVICE_LINES[slug];
  const [tab, setTab] = useState('dashboard');
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!svc) { setLoading(false); return; }
    setLoading(true);
    try {
      const r = await api.get('/service-catalog/items', { params: { vertical: svc.vertical } });
      setCatalog(Array.isArray(r.data?.data) ? r.data.data : []);
    } catch { setCatalog([]); } finally { setLoading(false); }
  }, [svc]);
  useEffect(() => { load(); setTab('dashboard'); }, [load, slug]);

  if (!svc) return <div className="pm-scope"><div className="pm-head"><div><h1>Unknown service</h1><div className="pm-meta">No service line found for “{slug}”.</div></div></div></div>;

  const Icon = svc.icon;
  const priced = catalog.filter((c) => Number(c.base_price) > 0);
  const avg = priced.length ? Math.round(priced.reduce((s, c) => s + Number(c.base_price || 0), 0) / priced.length) : 0;

  return (
    <div className="pm-scope">
      <div className="pm-head">
        <div>
          <div className="pm-eyebrow">Services</div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Icon size={22} /> {svc.name}</h1>
          <div className="pm-meta">{svc.blurb}</div>
        </div>
        <div className="pm-head-actions">
          <button className="pm-btn primary" onClick={() => { window.location.href = '/admin/services'; }}><Plus size={15} /> Manage catalog</button>
        </div>
      </div>

      <div className="pm-segment" style={{ marginBottom: 18 }}>
        {TABS.map((t) => <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}><t.icon size={13} /> {t.label}</button>)}
      </div>

      {loading ? <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div> : (
        <>
          {tab === 'dashboard' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }} className="ss-kpi-row">
                {[['Catalog services', catalog.length, 'ink'], ['Priced services', priced.length, 'good'], ['Avg. price', bdt(avg), 'cyan'], ['Active jobs', '—', 'ink']].map(([lab, val, tone]) => (
                  <div key={lab} className="pm-kpi" style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 11.5, fontWeight: 650, color: 'var(--muted)', marginBottom: 6 }}>{lab}</div>
                    <div style={{ fontSize: 26, fontWeight: 780, letterSpacing: '-.03em', color: tone === 'good' ? 'var(--good)' : tone === 'cyan' ? 'var(--cyan)' : 'var(--ink)' }}>{val}</div>
                  </div>
                ))}
              </div>
              <div className="pm-card">
                <div className="pm-card-h"><div className="ic"><Icon size={17} /></div><div><h3>Service catalog</h3><div className="hsub">{svc.name} — offerings & standard pricing</div></div></div>
                <div className="pm-card-body" style={{ padding: 0 }}>
                  <table className="pm-tbl">
                    <thead><tr><th>Code</th><th>Service</th><th>Category</th><th>Unit</th><th style={{ textAlign: 'right' }}>Standard price</th></tr></thead>
                    <tbody>
                      {catalog.map((c) => (
                        <tr key={c.id}>
                          <td style={{ fontSize: 12 }}>{c.code || '—'}</td>
                          <td style={{ fontWeight: 650 }}>{c.name}</td>
                          <td style={{ fontSize: 12.5, color: 'var(--muted)' }}>{c.category?.name || '—'}</td>
                          <td style={{ fontSize: 12.5 }}>{c.unit || '—'}</td>
                          <td style={{ textAlign: 'right' }}>{Number(c.base_price) > 0 ? <strong>{bdt(c.base_price)}</strong> : <span style={{ color: 'var(--muted-2)' }}>Quote</span>}</td>
                        </tr>
                      ))}
                      {!catalog.length && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 34, color: 'var(--muted)' }}>No catalog items yet for {svc.name}. Add them in Manage catalog, or share this service's pricing and I'll seed it.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {tab === 'operations' && (
            <div className="pm-card"><div className="pm-card-body" style={{ padding: '30px 26px' }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--cyan)', marginBottom: 8 }}>Operations</div>
              <h3 style={{ margin: '0 0 10px', fontSize: 18, color: 'var(--ink)' }}>{svc.name} — operations</h3>
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6, maxWidth: 640 }}>
                This is where enquiries, quotations, jobs / work orders, scheduling and completion for {svc.name} will run — a self-contained operations board for this service line. Share this service's workflow and I'll wire the full pipeline (the same way the Short Term Stay and Property Management operations are built).
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <a className="pm-btn" href="/admin/property-care/work-orders" style={{ textDecoration: 'none' }}><Wrench size={14} /> Shared work orders</a>
                <a className="pm-btn" href="/admin/property-care/enquiries" style={{ textDecoration: 'none' }}><ClipboardList size={14} /> Shared enquiries</a>
              </div>
            </div></div>
          )}

          {tab === 'sop' && (
            <div className="pm-card"><div className="pm-card-body" style={{ padding: '30px 26px' }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--cyan)', marginBottom: 8 }}>Standard Operating Procedure</div>
              <h3 style={{ margin: '0 0 10px', fontSize: 18, color: 'var(--ink)' }}>{svc.name} — SOP</h3>
              <p style={{ margin: '0 0 16px', fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6, maxWidth: 640 }}>
                The step-by-step Standard Operating Procedure for {svc.name} lands here — intake, assessment, quotation, scheduling, execution checklist, quality control, handover and follow-up. Share this service's SOP document and I'll structure it into stages with checklists, exactly like the check-in/out and readiness flows.
              </p>
              <div style={{ display: 'grid', gap: 8, maxWidth: 520 }}>
                {['Intake & enquiry', 'Site assessment / consultation', 'Quotation & approval', 'Scheduling & assignment', 'Execution checklist', 'Quality control', 'Handover & follow-up'].map((s, i) => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', border: '1px dashed var(--line)', borderRadius: 10 }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--surface-2)', color: 'var(--muted)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                    <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{s}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted-2)' }}>pending SOP</span>
                  </div>
                ))}
              </div>
            </div></div>
          )}
        </>
      )}
      <style>{`@media (max-width:900px){ .ss-kpi-row{ grid-template-columns:repeat(2,1fr)!important } }`}</style>
    </div>
  );
}
