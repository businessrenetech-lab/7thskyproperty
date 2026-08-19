import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Home, CalendarClock, Wallet, ExternalLink } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, DataTable, StatusBadge, Drawer, SearchInput, KV, Spinner, Badge, Button } from '../ui/kit';
import { Plus } from 'lucide-react';
import { NewTenancyDrawer } from './CrmForms';

const money = (v) => (v == null ? '—' : 'BDT ' + Number(v).toLocaleString());

export default function Rentals() {
  const toast = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState(null); const [detail, setDetail] = useState(null); const [mode, setMode] = useState('tenant');
  const [create, setCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/tenancies?limit=100'); setRows(data.data || []); }
    catch { toast.error('Failed to load rentals'); } finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const open = async (row, which) => {
    setSel(row); setMode(which); setDetail(null);
    try { const { data } = await api.get(`/tenancies/${row.id}`); setDetail(data); }
    catch { toast.error('Load failed'); }
  };

  const NameBtn = ({ children, onClick }) => (
    <span onClick={(e) => { e.stopPropagation(); onClick(); }} style={{ color: 'var(--cyan)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline dotted' }}>{children}</span>
  );

  const columns = [
    { key: 'owner', header: 'Owner', render: (r) => r.owner ? <NameBtn onClick={() => navigate(`/clients?contact=${r.owner.id}`)}>{r.owner.full_name} ↗</NameBtn> : '—' },
    { key: 'tenant', header: 'Tenant', render: (r) => r.tenant ? <NameBtn onClick={() => navigate(`/clients?contact=${r.tenant.id}`)}>{r.tenant.full_name} ↗</NameBtn> : '—' },
    { key: 'property', header: 'Property', render: (r) => <span className="cell-sub">{r.Property?.title || r.Property?.property_code || '—'}</span> },
    { key: 'move_in', header: 'Move in', render: (r) => r.move_in_date || '—' },
    { key: 'security', header: 'Security', render: (r) => money(r.security_deposit) },
    { key: 'rent', header: 'Rent', render: (r) => money(r.monthly_rent) },
    { key: 'service', header: 'Service charge', render: (r) => money(r.service_charge) },
    { key: 'due', header: 'Outstanding', render: (r) => r.outstanding > 0 ? <Badge tone="red">{money(r.outstanding)}</Badge> : <Badge tone="green">Clear</Badge> },
    { key: 'move_out', header: 'Move out', render: (r) => r.move_out_date || '—' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <>
      <PageHead title="Rentals" desc="All managed tenancies with owner, tenant, rent, charges, dues and dates. Click a name for full details."
        actions={<Button icon={Plus} onClick={() => setCreate(true)}>New Tenancy</Button>} />
      {create && <NewTenancyDrawer onClose={() => setCreate(false)} onSaved={load} />}
      <div className="card" style={{ marginBottom: 16 }}><div className="card-pad"><SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search owner, tenant, property…" /></div></div>
      <div className="card">
        <DataTable columns={columns} rows={rows.filter((r) => !search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))} loading={loading} onRowClick={(r) => open(r, 'tenant')} />
      </div>

      {sel && (
        <Drawer title={mode === 'tenant' ? (detail?.data?.tenant?.full_name || 'Tenant') : (detail?.data?.owner?.full_name || 'Owner')} onClose={() => setSel(null)} width={640}>
          {!detail ? <Spinner /> : (
            <>
              <div className="wrap-gap" style={{ marginBottom: 16 }}>
                <span className="code-chip">{detail.data.tenancy_code}</span>
                <StatusBadge status={detail.data.status} />
                <Badge tone={mode === 'tenant' ? 'amber' : 'green'}>{mode === 'tenant' ? 'Tenant view' : 'Owner view'}</Badge>
              </div>

              <div className="form-section-title"><Home size={13} /> Property</div>
              <KV k="Property" v={detail.data.Property?.title} />
              <KV k="Location" v={[detail.data.Property?.area, detail.data.Property?.district].filter(Boolean).join(', ')} />

              <div className="form-section-title"><User size={13} /> {mode === 'tenant' ? 'Tenant' : 'Owner'}</div>
              <KV k="Name" v={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{mode === 'tenant' ? detail.data.tenant?.full_name : detail.data.owner?.full_name}</span>
                  {(mode === 'tenant' ? detail.data.tenant?.id : detail.data.owner?.id) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={ExternalLink}
                      onClick={() => navigate(`/clients?contact=${mode === 'tenant' ? detail.data.tenant?.id : detail.data.owner?.id}`)}
                    >
                      Open 360° Client Dashboard
                    </Button>
                  )}
                </div>
              } />
              <KV k="Phone" v={mode === 'tenant' ? detail.data.tenant?.primary_phone : detail.data.owner?.primary_phone} />
              <KV k="Email" v={mode === 'tenant' ? detail.data.tenant?.email : detail.data.owner?.email} />

              <div className="form-section-title"><CalendarClock size={13} /> Tenancy terms</div>
              <KV k="Move in" v={detail.data.move_in_date} />
              <KV k="Move out" v={detail.data.move_out_date} />
              <KV k="Security deposit" v={money(detail.data.security_deposit)} />
              <KV k="Monthly rent" v={money(detail.data.monthly_rent)} />
              <KV k="Service charge" v={money(detail.data.service_charge)} />
              <KV k="Rent due day" v={detail.data.rent_due_day} />

              <div className="form-section-title"><Wallet size={13} /> Rent ledger {detail.ledger?.length ? `(${detail.ledger.length})` : ''}</div>
              <Button variant="ghost" size="sm" icon={Wallet} onClick={async () => {
                try { const { data } = await api.post(`/tenancies/${sel.id}/raise-invoice`, {}); toast.success(data.message || 'Invoice raised'); const { data: d } = await api.get(`/tenancies/${sel.id}`); setDetail(d); load(); }
                catch (e) { toast.error(e.response?.data?.error || 'Failed to raise invoice'); }
              }}>Raise this month's rent invoice</Button>
              <div style={{ height: 10 }} />
              {detail.ledger?.length ? (
                <table className="tbl"><thead><tr><th>Period</th><th>Due</th><th>Received</th><th>Status</th></tr></thead>
                  <tbody>{detail.ledger.map((l) => (
                    <tr key={l.id}><td>{l.period_label}</td><td>{money(l.rent_due)}</td><td>{money(l.rent_received)}</td><td><StatusBadge status={l.status} /></td></tr>
                  ))}</tbody>
                </table>
              ) : <p className="cell-sub">No rent ledger entries yet. They appear as rent is invoiced/collected.</p>}
            </>
          )}
        </Drawer>
      )}
    </>
  );
}
