import React, { useCallback, useEffect, useState } from 'react';
import { Eye, Building2, FileSignature, Users2, Wallet, Handshake, MoreHorizontal, LayoutGrid, List as ListIcon } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, DataTable, StatusBadge, Drawer, SearchInput, KV, Spinner, Button, Badge, Select } from '../ui/kit';
import { Plus, Building2 as BuildingIcon } from 'lucide-react';
import { NewDealDrawer, NewPropertyDrawer } from './CrmForms';
import { useNavigate } from 'react-router-dom';
import { settlementDeskPath } from './sales/paths';

const money = (v) => (v == null ? '—' : 'BDT ' + Number(v).toLocaleString());
const STAGES = ['lead', 'negotiation', 'agreed', 'settlement', 'completed', 'cancelled'];
const STAGE_LABEL = { lead: 'Lead', negotiation: 'Negotiation', agreed: 'Agreed', settlement: 'Settlement', completed: 'Completed', cancelled: 'Cancelled' };
// Mirrors the server's ALLOWED_TRANSITIONS (deal.controller). The server stays
// authoritative — the board is optimistic and reverts on any 4xx.
const ALLOWED = { lead: ['negotiation', 'cancelled'], negotiation: ['lead', 'cancelled'] };
const legalTargets = (status) => ALLOWED[status] || [];
const BLOCKED_HINT = 'Reached via the offer / Settlement Desk flow — not movable here.';
const today = new Date().toISOString().slice(0, 10);
const isOverdue = (r) => r.settlement_date && r.settlement_date < today && !['completed', 'cancelled'].includes(r.status);

export default function DealsBoard({ category, dealType, title, desc }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('board');
  const [fStage, setFStage] = useState(''); const [fAssignee, setFAssignee] = useState(''); const [overdue, setOverdue] = useState(false);
  const [create, setCreate] = useState(null);
  const [sel, setSel] = useState(null); const [detail, setDetail] = useState(null);
  const [menuFor, setMenuFor] = useState(null); const [dragOver, setDragOver] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ deal_type: dealType, category, limit: 500 });
      const { data } = await api.get(`/deals?${p}`);
      setRows(data.data || []);
    } catch { toast.error('Failed to load deals'); } finally { setLoading(false); }
  }, [category, dealType, toast]);
  useEffect(() => { load(); }, [load]);

  const open = async (r) => { setSel(r); setDetail(null); try { const { data } = await api.get(`/deals/${r.id}`); setDetail(data.data); } catch { toast.error('Load failed'); } };

  const partyLabel = dealType === 'buy' ? 'Buyer' : 'Seller';
  const partyVal = (r) => dealType === 'buy' ? (r.buyer?.Contact?.full_name || '—') : (r.seller?.full_name || '—');

  const assignees = [...new Map(rows.filter((r) => r.assignee).map((r) => [r.assignee.id, r.assignee])).values()];
  const filtered = rows.filter((r) =>
    (!search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))
    && (!fStage || r.status === fStage)
    && (!fAssignee || Number(r.assignee?.id) === Number(fAssignee))
    && (!overdue || isOverdue(r)));

  // Guarded stage move — shared by drag/drop and the Move-to-stage menu.
  const move = async (deal, to) => {
    setMenuFor(null);
    if (!deal || deal.status === to) return;
    let reason;
    if (to === 'cancelled') { reason = window.prompt('Reason for cancelling this deal:'); if (!reason || !reason.trim()) return; }
    const prev = rows;
    setRows((rs) => rs.map((r) => (r.id === deal.id ? { ...r, status: to } : r))); // optimistic
    try {
      await api.post(`/deals/${deal.id}/transition`, { to_status: to, reason: reason?.trim() });
      toast.success(`Moved to ${STAGE_LABEL[to] || to}`);
    } catch (e) {
      setRows(prev); // revert
      toast.error(e.response?.data?.error || 'Move not allowed');
    }
  };

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

  const DealCard = ({ r }) => {
    const targets = legalTargets(r.status);
    const draggable = targets.length > 0;
    return (
      <div
        className="deal-card card"
        draggable={draggable}
        onDragStart={(e) => e.dataTransfer.setData('text/plain', String(r.id))}
        style={{ padding: 10, marginBottom: 8, cursor: draggable ? 'grab' : 'default', position: 'relative' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
          <button type="button" onClick={() => open(r)} style={{ border: 0, background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer', flex: 1, minWidth: 0 }}>
            <div className="cell-strong" style={{ fontSize: 13 }}>{r.Property?.property_code || r.deal_code}</div>
            <div className="cell-sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.Property?.title || '—'}</div>
          </button>
          <div style={{ position: 'relative' }}>
            <button type="button" title="Move to stage" onClick={() => setMenuFor(menuFor === r.id ? null : r.id)} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--muted,#64748b)' }}><MoreHorizontal size={16} /></button>
            {menuFor === r.id && (
              <div className="card" style={{ position: 'absolute', right: 0, top: 22, zIndex: 20, minWidth: 180, padding: 6, boxShadow: '0 6px 20px rgba(0,0,0,.12)' }}>
                {targets.length ? targets.map((t) => (
                  <button key={t} type="button" onClick={() => move(r, t)} style={{ display: 'block', width: '100%', textAlign: 'left', border: 0, background: 'transparent', padding: '6px 8px', cursor: 'pointer', font: 'inherit' }}>
                    Move to {STAGE_LABEL[t]}
                  </button>
                )) : <div className="cell-sub" style={{ padding: '6px 8px' }}>{BLOCKED_HINT}</div>}
              </div>
            )}
          </div>
        </div>
        <div style={{ fontSize: 12, marginTop: 6 }}>{partyVal(r)}</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
          <span><span className="cell-sub">Price </span><strong className="pm-num">{money(r.sale_price)}</strong></span>
          <span><span className="cell-sub">Fee </span><strong className="pm-num">{money(r.expected_fee)}</strong></span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {r.assignee && <Badge tone="grey">{r.assignee.name}</Badge>}
          {r.settlement_date && <span className="cell-sub" style={{ color: isOverdue(r) ? 'var(--danger,#dc2626)' : undefined }}>{r.settlement_date}</span>}
        </div>
      </div>
    );
  };

  return (
    <>
      <PageHead title={title} desc={desc} actions={<>
        <Button variant="ghost" icon={BuildingIcon} onClick={() => setCreate('property')}>New Property</Button>
        <Button icon={Plus} onClick={() => setCreate('deal')}>New Deal</Button>
      </>} />
      {create === 'deal' && <NewDealDrawer dealType={dealType} category={category} onClose={() => setCreate(null)} onSaved={load} />}
      {create === 'property' && <NewPropertyDrawer category={category} onClose={() => setCreate(null)} />}

      {/* Shared filter bar + view toggle */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-pad" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 200px', minWidth: 160 }}><SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search deals…" /></div>
          <Select value={fStage} onChange={(e) => setFStage(e.target.value)}><option value="">All stages</option>{STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}</Select>
          <Select value={fAssignee} onChange={(e) => setFAssignee(e.target.value)}><option value="">All assignees</option>{assignees.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}><input type="checkbox" checked={overdue} onChange={(e) => setOverdue(e.target.checked)} /> Overdue</label>
          <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
            <Button size="sm" variant={view === 'board' ? 'primary' : 'ghost'} icon={LayoutGrid} onClick={() => setView('board')}>Board</Button>
            <Button size="sm" variant={view === 'list' ? 'primary' : 'ghost'} icon={ListIcon} onClick={() => setView('list')}>List</Button>
          </div>
        </div>
      </div>

      {loading ? <div className="card-pad"><Spinner /></div> : view === 'list' ? (
        <div className="card"><DataTable columns={columns} rows={filtered} loading={loading} onRowClick={open} /></div>
      ) : (
        <div className="deal-board" style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
          {STAGES.map((stage) => {
            const colRows = filtered.filter((r) => r.status === stage);
            return (
              <div
                key={stage}
                className="deal-col"
                onDragOver={(e) => { e.preventDefault(); if (dragOver !== stage) setDragOver(stage); }}
                onDragLeave={() => setDragOver((s) => (s === stage ? null : s))}
                onDrop={(e) => { e.preventDefault(); setDragOver(null); const id = Number(e.dataTransfer.getData('text/plain')); const deal = rows.find((r) => r.id === id); if (deal) move(deal, stage); }}
                style={{ flex: '0 0 280px', minWidth: 280, background: dragOver === stage ? 'var(--primary-50,#f0fdfa)' : 'var(--surface-2,#f8fafc)', borderRadius: 10, padding: 8, border: '1px solid var(--line,#e5e7eb)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 4px 8px' }}>
                  <strong style={{ fontSize: 13 }}>{STAGE_LABEL[stage]}</strong>
                  <Badge tone="grey">{colRows.length}</Badge>
                </div>
                {colRows.map((r) => <DealCard key={r.id} r={r} />)}
                {colRows.length === 0 && <div className="cell-sub" style={{ padding: 8, textAlign: 'center' }}>—</div>}
              </div>
            );
          })}
        </div>
      )}

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
              {(detail.property_id || detail.Property?.id || sel.property_id || sel.Property?.id) && (
                <div style={{ marginTop: 12 }}>
                  <Button icon={Wallet} onClick={() => navigate(settlementDeskPath(category, detail.property_id || detail.Property?.id || sel.property_id || sel.Property?.id))}>
                    Open Settlement Desk
                  </Button>
                  <p className="cell-sub" style={{ marginTop: 6 }}>Prepare, approve, record money, match the bank and complete this deal's settlement.</p>
                </div>
              )}
            </>
          )}
        </Drawer>
      )}
    </>
  );
}
