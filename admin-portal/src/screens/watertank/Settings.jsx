import React, { useState, useMemo } from 'react';
import { WtHead, bdt, useCatalog, Loading, EmptyState, titleCase } from './common';

/* Settings — the WTC standard price schedule (live from the service catalog)
   plus the Water Tank SOP stages. Editable pricing lives in the Service Catalog;
   quotations and agreements price from this schedule. */

const CLIENT_SOP = ['Client Enquiry', 'Needs Assessment', 'Site Assessment', 'Quotation & Agreement', 'Deposit Collection', 'Provider Assignment', 'Service Delivery', 'Inspection & Reporting', 'Completion', 'AMC / Ongoing Support'];
const PROVIDER_SOP = ['Provider Application', 'Capability Assessment', 'Compliance & Insurance Verification', 'Master Agreement Signing', 'Provider Approval', 'Work Order Assignment', 'Service Delivery', 'Performance Review', 'Renewal / Suspension / Termination'];

const Stages = ({ title, steps }) => (
  <div className="wt-card" style={{ padding: 24, flex: '1 1 380px' }}>
    <h2 className="wt-section-title" style={{ marginBottom: 14 }}>{title}</h2>
    <div style={{ display: 'grid', gap: 8 }}>
      {steps.map((s, i) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px', border: '1px solid var(--wt-line)', borderRadius: 8 }}>
          <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--wt-accent-tint)', color: 'var(--wt-accent-ink)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
          <span style={{ fontSize: 13, color: 'var(--wt-ink-2)' }}>{s}</span>
        </div>
      ))}
    </div>
  </div>
);

export default function Settings() {
  const { items, loading } = useCatalog();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('');

  const groups = useMemo(() => [...new Set(items.map((i) => i.service_group).filter(Boolean))], [items]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((i) => (!group || i.service_group === group)
      && (!term || [i.code, i.name, i.unit].some((v) => String(v || '').toLowerCase().includes(term))));
  }, [items, q, group]);

  const priced = items.filter((i) => Number(i.base_price) > 0);
  const avg = priced.length ? Math.round(priced.reduce((s, i) => s + Number(i.base_price), 0) / priced.length) : 0;

  return (
    <>
      <WtHead
        title="Settings"
        subtitle="Standard price schedule & Standard Operating Procedures"
        search={q} onSearch={setQ}
      />

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <Stages title="Client Management SOP" steps={CLIENT_SOP} />
        <Stages title="Third-Party Provider SOP" steps={PROVIDER_SOP} />
      </div>

      <div className="wt-card wt-tblcard">
        <div style={{ padding: '18px 20px 0' }}>
          <div className="wt-panel-head">
            <div>
              <h2 className="wt-section-title">Standard Service Price Schedule</h2>
              <p className="wt-subtitle" style={{ marginBottom: 8 }}>
                Live from the Service Catalog (vertical <code>water_tank_csa</code>) — {items.length} item{items.length === 1 ? '' : 's'}, {priced.length} priced{avg ? `, average ${bdt(avg)}` : ''}. Quotations and agreements price from this list.
              </p>
            </div>
            {groups.length > 1 && (
              <select className="wt-select" style={{ width: 170 }} value={group} onChange={(e) => setGroup(e.target.value)}>
                <option value="">All groups</option>
                {groups.map((g) => <option key={g} value={g}>{titleCase(g)}</option>)}
              </select>
            )}
          </div>
        </div>

        {loading ? <Loading /> : shown.length ? (
          <table className="wt-tbl">
            <thead><tr><th style={{ width: 110 }}>Code</th><th>Service</th><th style={{ width: 130 }}>Group</th><th style={{ width: 120 }}>Unit</th><th style={{ width: 150, textAlign: 'right' }}>Standard Price</th></tr></thead>
            <tbody>
              {shown.map((i) => (
                <tr key={i.id}>
                  <td className="id">{i.code}</td>
                  <td>{i.name}</td>
                  <td className="muted">{i.service_group ? titleCase(i.service_group) : '—'}</td>
                  <td className="muted">{i.unit || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{Number(i.base_price) > 0 ? bdt(i.base_price) : <span className="muted">On quote</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            eyebrow="Price schedule"
            title={q || group ? 'Nothing matches this filter' : 'No catalog items seeded'}
            hint={q || group ? undefined : 'Seed the water_tank_csa vertical in the Service Catalog and the schedule appears here.'}
          />
        )}
      </div>
    </>
  );
}
