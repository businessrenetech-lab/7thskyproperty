import React, { useCallback, useEffect, useState } from 'react';
import { Eye, Building2, FileSignature, Users2, Wallet, Handshake } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, DataTable, StatusBadge, Drawer, SearchInput, KV, Spinner, Button, Badge } from '../ui/kit';
import { Plus, Building2 as BuildingIcon } from 'lucide-react';
import { NewDealDrawer, NewPropertyDrawer } from './CrmForms';

const money = (v) => (v == null ? '—' : 'BDT ' + Number(v).toLocaleString());

export default function DealsBoard({ category, dealType, title, desc }) {
  const toast = useToast();
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [create, setCreate] = useState(null);
  const [sel, setSel] = useState(null); const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ deal_type: dealType, category, limit: 50 });
      const { data } = await api.get(`/deals?${p}`);
      setRows(data.data || []);
    } catch { toast.error('Failed to load deals'); } finally { setLoading(false); }
  }, [category, dealType, toast]);
  useEffect(() => { load(); }, [load]);

  const open = async (r) => { setSel(r); setDetail(null); try { const { data } = await api.get(`/deals/${r.id}`); setDetail(data.data); } catch { toast.error('Load failed'); } };

  const partyLabel = dealType === 'buy' ? 'Buyer' : 'Seller';
  const partyVal = (r) => dealType === 'buy' ? (r.buyer?.Contact?.full_name || '—') : (r.seller?.full_name || '—');

  const columns = [
    { key: 'deal_code', header: 'Deal', render: (r) => <span className="code-chip">{r.deal_code}</span> },
    { key: 'property', header: 'Property', render: (r) => <div className="cell-strong">{r.Property?.title || '—'}<div className="cell-sub">{r.Property?.area || r.Property?.district || ''}</div></div> },
    { key: 'party', header: partyLabel, render: partyVal },
    { key: 'owner', header: 'Owner', render: (r) => r.owner?.full_name || '—' },
    { key: 'agreement', header: 'Agreement start', render: (r) => r.agreement_date || '—' },
    { key: 'commission', header: 'Commission', render: (r) => money(r.commission_amount) },
    { key: 'expenses', header: 'Expenses', render: (r) => money(r.expenses_total) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'view', header: '', render: () => <span className="btn btn-ghost btn-sm"><Eye size={14} /> View</span> },
  ];

  return (
    <>
            <PageHead title={title} desc={desc} actions={<>
              <Button variant="ghost" icon={BuildingIcon} onClick={() => setCreate('property')}>New Property</Button>
              <Button icon={Plus} onClick={() => setCreate('deal')}>New Deal</Button>
            </>} />
            {create === 'deal' && <NewDealDrawer dealType={dealType} category={category} onClose={() => setCreate(null)} onSaved={load} />}
            {create === 'property' && <NewPropertyDrawer category={category} onClose={() => setCreate(null)} />}
      <div className="card" style={{ marginBottom: 16 }}><div className="card-pad"><SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search deals…" /></div></div>
      <div className="card">
        <DataTable columns={columns} rows={rows.filter((r) => !search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))} loading={loading} onRowClick={open} />
      </div>

      {sel && (
        <Drawer title={`${sel.deal_code} · ${sel.Property?.title || 'Deal'}`} onClose={() => setSel(null)} width={640}>
          {!detail ? <Spinner /> : (
            <>
              <div className="wrap-gap" style={{ marginBottom: 16 }}>
                <Badge tone="blue">{dealType === 'buy' ? 'Buying service' : 'Selling service'}</Badge>
                <StatusBadge status={detail.status} />
              </div>
              <div className="form-section-title"><Building2 size={13} /> Property</div>
              <KV k="Title" v={detail.Property?.title} />
              <KV k="Code" v={detail.Property?.property_code} />
              <KV k="Location" v={[detail.Property?.area, detail.Property?.district].filter(Boolean).join(', ')} />
              <KV k="Listed price" v={money(detail.Property?.price)} />

              <div className="form-section-title"><Users2 size={13} /> Parties</div>
              <KV k={partyLabel} v={partyVal(detail)} />
              <KV k="Owner" v={detail.owner?.full_name} />

              <div className="form-section-title"><FileSignature size={13} /> Service Agreement</div>
              {detail.Agreement ? <><KV k="Agreement" v={detail.Agreement.title} /><KV k="Doc ID" v={detail.Agreement.agreement_code} /><KV k="Version" v={`v${detail.Agreement.current_version}`} /></> : <p className="cell-sub">No agreement linked yet.</p>}
              <KV k="Agreement start" v={detail.agreement_date} />

              <div className="form-section-title"><Wallet size={13} /> Commercials</div>
              <KV k="Sale price" v={money(detail.sale_price)} />
              <KV k="Commission" v={`${money(detail.commission_amount)}${detail.commission_percent ? ` (${detail.commission_percent}%)` : ''}`} />
              <KV k="Expenses" v={money(detail.expenses_total)} />

              <div className="form-section-title"><Handshake size={13} /> Settlement</div>
              <KV k="Settlement date" v={detail.settlement_date} />
              <KV k="Notes" v={detail.notes} />
            </>
          )}
        </Drawer>
      )}
    </>
  );
}
