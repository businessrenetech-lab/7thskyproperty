import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Plus, Globe, ShieldCheck, FileSignature, Search, LayoutGrid, List as ListIcon, Pencil, Link2, FolderOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Spinner } from '../../ui/kit';
import { useAuth } from '../../context/AuthContext';
import { bdt, initials, Chip, fmtDate, ScreenHead } from './common';

const capacity = (p) => `${p.bedrooms || 0}-bed · ${p.max_guests || 0} guests`;
const occupancyChip = { occupied: ['bad', 'In house'], booked: ['warn', 'Booked'], available: ['good', 'Available'], maintenance_blocked: ['bad', 'Maintenance'], owner_blocked: ['grey', 'Owner block'] };

export default function Properties({ actions = {}, refreshKey }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = ['super_admin', 'branch_admin', 'property_manager'].includes(user?.role);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [q, setQ] = useState('');
  const [statusF, setStatusF] = useState('all');
  const [agreementF, setAgreementF] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/short-stay/properties');
      setRows(Array.isArray(res.data) ? res.data : []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((p) => (statusF === 'all' || p.status === statusF)
      && (agreementF === 'all' || p.owner_agreement_status === agreementF)
      && (!t || (p.public_headline || p.property?.title || '').toLowerCase().includes(t) || (p.owner_name || '').toLowerCase().includes(t)));
  }, [rows, q, statusF, agreementF]);

  if (loading) return <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>;

  const listingChip = (p) => p.is_website_listed ? <span className="pm-chip good"><span className="d" />Listed</span> : <span className="pm-chip grey"><span className="d" />Not listed</span>;
  const occChip = (p) => { const [tone, label] = occupancyChip[p.current_occupancy_status] || ['grey', '—']; return <span className={`pm-chip ${tone}`}><span className="d" />{label}</span>; };

  return (
    <div>
      <ScreenHead
        title="Short stay properties"
        desc={`${rows.length} unit${rows.length === 1 ? '' : 's'} · readiness, owner agreements and listing status at a glance.`}
        actions={canManage ? <>
          <button type="button" className="pm-btn" onClick={() => navigate('/short-stay/properties/link')}><Link2 size={15} /> Load existing</button>
          <button type="button" className="pm-btn primary" onClick={() => navigate('/short-stay/properties/new')}><Plus size={15} /> Create new</button>
        </> : null}
      />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <div style={{ flex: '1 1 260px', display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--line)', borderRadius: 10, padding: '0 12px', background: 'var(--surface)' }}>
          <Search size={15} color="var(--muted)" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search property, unit or owner…" style={{ border: 0, outline: 0, background: 'transparent', padding: '9px 0', font: 'inherit', flex: 1, color: 'var(--ink)' }} />
        </div>
        <select value={statusF} onChange={(e) => setStatusF(e.target.value)} style={sel}>
          <option value="all">Readiness · all</option>
          {['draft', 'readiness_pending', 'ready', 'active', 'suspended'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={agreementF} onChange={(e) => setAgreementF(e.target.value)} style={sel}>
          <option value="all">Owner agreement · all</option>
          {['signed', 'sent', 'draft', 'missing_owner', 'void'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <div className="pm-segment">
          <button type="button" className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}><ListIcon size={13} /> List</button>
          <button type="button" className={view === 'cards' ? 'on' : ''} onClick={() => setView('cards')}><LayoutGrid size={13} /> Cards</button>
        </div>
      </div>

      {view === 'list' ? (
        <div className="pm-card">
          <div className="pm-card-body ss-table-scroll" style={{ padding: 0 }}>
            <table className="pm-tbl">
              <thead><tr>
                <th>Property</th><th>Owner</th><th>Type &amp; capacity</th><th style={{ textAlign: 'right' }}>Rate</th>
                <th>Readiness</th><th>Owner agreement</th><th>Listing</th><th>Occupancy</th><th>Next booking</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className={canManage ? 'ss-clickable-row' : undefined} role={canManage ? 'link' : undefined} tabIndex={canManage ? 0 : undefined} aria-label={canManage ? `Open ${p.public_headline || p.property?.title || 'short-stay property'}` : undefined} onClick={canManage ? () => navigate(`/short-stay/properties/${p.id}`) : undefined} onKeyDown={canManage ? (event) => { if (event.target === event.currentTarget && event.key === 'Enter') navigate(`/short-stay/properties/${p.id}`); } : undefined}>
                    <td>
                      <div className="pm-who">
                        <div className="pm-avatar">{initials(p.public_headline || p.property?.title || 'ST')}</div>
                        <div>{canManage ? <button type="button" className="ss-property-open" onClick={() => navigate(`/short-stay/properties/${p.id}`)}>{p.public_headline || p.property?.title || 'Serviced stay'}</button> : <strong>{p.public_headline || p.property?.title || 'Serviced stay'}</strong>}<div className="ph">{p.property?.district || `#${p.property_id}`}</div></div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12.5 }}>{p.owner_name || '—'}</td>
                    <td><div style={{ fontWeight: 600, fontSize: 12.5, textTransform: 'capitalize' }}>{String(p.accommodation_type || '').replace(/_/g, ' ')}</div><div className="ph" style={{ fontSize: 11.5, color: 'var(--muted)' }}>{capacity(p)}</div></td>
                    <td style={{ textAlign: 'right' }}><strong>{bdt(p.base_nightly_rate)}</strong><div className="ph" style={{ fontSize: 11, color: 'var(--muted)' }}>/ night</div></td>
                    <td><Chip k={p.status} /></td>
                    <td><Chip k={p.owner_agreement_status} label={p.owner_agreement_status === 'missing_owner' ? 'Missing owner' : undefined} /></td>
                    <td>{listingChip(p)}</td>
                    <td>{occChip(p)}</td>
                    <td style={{ fontSize: 12.5 }}>{p.next_booking ? <><div style={{ fontWeight: 600 }}>{fmtDate(p.next_booking.check_in_date)}</div><div className="ph" style={{ fontSize: 11, color: 'var(--muted)' }}>{p.next_booking.guest_name || p.next_booking.booking_code}</div></> : <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                    <td style={{ textAlign: 'right' }}>
                      {canManage && <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button type="button" className="pm-btn" style={btn} onClick={(event) => { event.stopPropagation(); navigate(`/short-stay/properties/${p.id}`); }}><FolderOpen size={13} /> Open</button>
                        <button type="button" className="pm-btn" style={btn} onClick={(event) => { event.stopPropagation(); navigate(`/short-stay/properties/${p.id}/edit`); }}><Pencil size={13} /> Edit</button>
                        {p.status !== 'active' && <button type="button" className="pm-btn" style={btn} onClick={(event) => { event.stopPropagation(); actions.activate?.(p); }}><ShieldCheck size={13} /> Activate</button>}
                        <button type="button" className="pm-btn" style={btn} onClick={(event) => { event.stopPropagation(); actions.ownerTerms?.(p); }}><FileSignature size={13} /> Owner terms</button>
                        <button type="button" className={`pm-btn ${p.is_website_listed ? 'primary' : ''}`} style={btn} onClick={(event) => { event.stopPropagation(); actions.toggleWebsite?.(p); }}><Globe size={13} /> {p.is_website_listed ? 'Listed' : 'List'}</button>
                      </div>}
                    </td>
                  </tr>
                ))}
                {!filtered.length && <tr><td colSpan={10} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>No stay properties match. Click “Add property”.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
          {filtered.map((p) => (
            <div key={p.id} className="pm-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="pm-card-body" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                  <div>
                    {canManage ? <button type="button" className="ss-property-open card-title" onClick={() => navigate(`/short-stay/properties/${p.id}`)}>{p.public_headline || p.property?.title || 'Serviced stay'}</button> : <strong>{p.public_headline || p.property?.title || 'Serviced stay'}</strong>}
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.property?.district || `#${p.property_id}`} · {capacity(p)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 780, fontSize: 16, color: 'var(--navy)' }}>{bdt(p.base_nightly_rate)}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>/ night</div></div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  <Chip k={p.status} />
                  <Chip k={p.owner_agreement_status} label={p.owner_agreement_status === 'missing_owner' ? 'Missing owner' : undefined} />
                  {listingChip(p)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Owner: {p.owner_name || '—'}{p.revenue_share_percent != null ? ` · ${p.revenue_share_percent}% share` : ''}</div>
                {canManage && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button type="button" className="pm-btn" style={btn} onClick={() => navigate(`/short-stay/properties/${p.id}`)}><FolderOpen size={13} /> Open</button>
                  <button type="button" className="pm-btn" style={btn} onClick={() => navigate(`/short-stay/properties/${p.id}/edit`)}><Pencil size={13} /> Edit</button>
                  {p.status !== 'active' && <button type="button" className="pm-btn" style={btn} onClick={() => actions.activate?.(p)}><ShieldCheck size={13} /> Activate</button>}
                  <button type="button" className="pm-btn" style={btn} onClick={() => actions.ownerTerms?.(p)}><FileSignature size={13} /> Owner terms</button>
                  <button type="button" className={`pm-btn ${p.is_website_listed ? 'primary' : ''}`} style={btn} onClick={() => actions.toggleWebsite?.(p)} aria-label={p.is_website_listed ? 'Unpublish property' : 'Publish property'}><Globe size={13} /></button>
                </div>}
              </div>
            </div>
          ))}
          {!filtered.length && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No stay properties match. Click “Add property”.</div>}
        </div>
      )}
    </div>
  );
}

const btn = { padding: '4px 10px', fontSize: 12 };
const sel = { border: '1px solid var(--line)', borderRadius: 10, padding: '9px 12px', background: 'var(--surface)', font: 'inherit', color: 'var(--ink)', textTransform: 'capitalize' };
