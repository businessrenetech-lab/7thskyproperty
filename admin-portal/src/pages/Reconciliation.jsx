import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, ArrowDownRight, ArrowUpRight, Calendar, Download, Landmark, Loader2, Receipt, ShieldCheck, Wallet, X, AlertTriangle, FileText, CheckCircle2, History, Banknote } from 'lucide-react';
import api from '../services/api';
import '../styles/GlobalStyles.css';
import DrillDownModal from '../components/reconciliation/DrillDownModal';
import { useToast } from '../context/ToastContext';

const money = (v) => `BDT ${Number(v || 0).toLocaleString()}`;
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString() : '-');

const formatDateLocal = (dateObj) => {
  const toast = useToast();
  const d = new Date(dateObj);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

const getTodayLocal = () => {
  return formatDateLocal(new Date());
};

const getRange = (preset, from, to) => {
  const end = getTodayLocal();
  if (preset === 'daily') return { from: end, to: end };
  if (preset === 'weekly') {
    const now = new Date();
    return { from: formatDateLocal(new Date(now.getTime() - 6 * 86400000)), to: end };
  }
  if (preset === 'monthly') {
    const now = new Date();
    return { from: formatDateLocal(new Date(now.getFullYear(), now.getMonth(), 1)), to: end };
  }
  return { from: from || end, to: to || end };
};

const Card = ({ children, style, className = '' }) => (
  <div className={`glass-morphism ${className}`} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', ...style }}>
    {children}
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: 'var(--canvas)', border: '1px solid var(--border)', borderRadius: '20px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', animation: 'fadeIn 0.2s ease-out' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px', borderRadius: '50%' }}><X size={20} /></button>
        </div>
        <div style={{ padding: '1.5rem' }}>{children}</div>
      </div>
    </div>
  );
};

const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: '1rem' }}>
    {label && <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.4rem', fontWeight: 600 }}>{label}</label>}
    {props.type === 'select' ? (
      <select className="glass-input" {...props} style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-main)', appearance: 'auto', ...props.style }}>{props.children}</select>
    ) : (
      <input className="glass-input" {...props} style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-main)', ...props.style }} />
    )}
  </div>
);

const Table = ({ columns, rows, empty = 'No records found.' }) => (
  <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border)' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
      <thead><tr style={{ background: 'var(--surface)' }}>{columns.map((c) => <th key={c.key} style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>{c.label}</th>)}</tr></thead>
      <tbody>
        {rows.length ? rows.map((row, i) => (
          <tr key={row.id || row.account_id || row.unique_key || i} style={{ transition: 'background 0.2s', borderBottom: '1px solid var(--border)' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            {columns.map((c) => <td key={c.key} style={{ padding: '1rem', color: 'var(--text-main)', fontSize: '0.88rem', verticalAlign: 'middle' }}>{c.render ? c.render(row) : row[c.key] ?? '-'}</td>)}
          </tr>
        )) : <tr><td colSpan={columns.length} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}><FileText size={32} opacity={0.5} /><span>{empty}</span></div></td></tr>}
      </tbody>
    </table>
  </div>
);

export default function Reconciliation() {
  const [preset, setPreset] = useState('monthly');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [activeTab, setActiveTab] = useState('accounts');
  const [activeModal, setActiveModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formAccountSnapshot, setFormAccountSnapshot] = useState(null);
  const [formSnapshotLoading, setFormSnapshotLoading] = useState(false);
  const [data, setData] = useState(null);
  const [liquidAccounts, setLiquidAccounts] = useState([]);
  const [drillDown, setDrillDown] = useState({ isOpen: false, title: '', data: [], accountName: '' });
  
  const [form, setForm] = useState({ account_id: '', date: getTodayLocal(), opening_balance: '', amount: '', actual_closing_balance: '', reason: '', source: '', reference: '', remarks: '', from_account_id: '', to_account_id: '' });
  
  const printRef = useRef(null);
  const range = useMemo(() => getRange(preset, customFrom, customTo), [preset, customFrom, customTo]);

  const load = async () => {
    setLoading(true);
    try {
      const [dashboardRes, liquidAccountsRes] = await Promise.allSettled([
        api.get('/reconciliation/dashboard', { params: range }),
        api.get('/finance/accounts/liquid')
      ]);

      if (dashboardRes.status === 'fulfilled') {
        setData(dashboardRes.value.data);
      } else {
        console.error('Failed to load reconciliation dashboard', dashboardRes.reason);
        setData(null);
      }

      if (liquidAccountsRes.status === 'fulfilled') {
        setLiquidAccounts(liquidAccountsRes.value.data || []);
      } else {
        console.error('Failed to load liquid accounts', liquidAccountsRes.reason);
        setLiquidAccounts([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [range.from, range.to]);

  // Listen for bottom nav quick action events
  useEffect(() => {
    const handler = (e) => setActiveModal(e.detail);
    window.addEventListener('recon-open-modal', handler);
    return () => window.removeEventListener('recon-open-modal', handler);
  }, []);

  useEffect(() => {
    const needsSnapshot = ['opening', 'closing'].includes(activeModal);
    if (!needsSnapshot || !form.account_id || !form.date) {
      setFormAccountSnapshot(null);
      setFormSnapshotLoading(false);
      return;
    }

    let cancelled = false;
    const loadAccountSnapshot = async () => {
      setFormSnapshotLoading(true);
      try {
        const res = await api.get('/reconciliation/dashboard', { params: { from: form.date, to: form.date } });
        if (cancelled) return;
        const account = (res.data?.accounts || []).find((item) => String(item.account_id) === String(form.account_id));
        setFormAccountSnapshot(account || null);
      } catch (_) {
        if (!cancelled) setFormAccountSnapshot(null);
      } finally {
        if (!cancelled) setFormSnapshotLoading(false);
      }
    };

    loadAccountSnapshot();
    return () => {
      cancelled = true;
    };
  }, [activeModal, form.account_id, form.date]);

  const submit = async (url, payload, successMessage) => {
    setSaving(true);
    try {
      const res = await api.post(url, payload);
      toast.success(res.data.message || successMessage);
      setActiveModal(null);
      setForm(f => ({ ...f, amount: '', actual_closing_balance: '', reason: '', reference: '', remarks: '', source: '', opening_balance: '' }));
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    } finally {
      setSaving(false);
    }
  };

  const exportPdf = () => {
    const w = window.open('', '_blank', 'width=1280,height=900');
    if (!w || !printRef.current) return;
    w.document.write(`<html><head><title>Reconciliation Report</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #cbd5e1;padding:10px;text-align:left;font-size:12px}th{background:#f1f5f9;text-transform:uppercase;color:#475569}h1,h2,h3{margin:0 0 10px;color:#0f172a}.header{margin-bottom:30px;padding-bottom:10px;border-bottom:2px solid #e2e8f0}</style></head><body><div class="header"><h1>Liquidity & Reconciliation Report</h1><p style="color:#64748b;margin:0">Reporting Period: ${range.from} to ${range.to}</p></div>${printRef.current.innerHTML}</body></html>`);
    w.document.close(); w.focus(); w.print();
  };

  const accounts = data?.accounts || [];
  const openingClosingReport = data?.opening_closing_report || [];
  const liquidAccountOptions = liquidAccounts.map((a) => ({ value: a.id ?? a.account_id, label: `${a.name ?? a.account_name} (${a.code ?? a.account_code})` }));
  const desiredOpeningBalance = Number(form.opening_balance || 0);
  const requestedClosingBalance = Number(form.actual_closing_balance || 0);
  const openingMismatch = formAccountSnapshot ? desiredOpeningBalance - Number(formAccountSnapshot.opening_balance || 0) : 0;
  const closingMismatch = formAccountSnapshot ? requestedClosingBalance - Number(formAccountSnapshot.expected_closing_balance || 0) : 0;

  const kpis = data ? [
    { label: 'Total Inflows', value: data.summary.total_inflows, icon: ArrowDownRight, color: 'var(--primary)' },
    { label: 'Total Outflows', value: data.summary.total_outflows, icon: ArrowUpRight, color: 'var(--danger)' },
    { label: 'System Discrepancy', value: data.summary.total_discrepancy, icon: AlertTriangle, color: data.summary.total_discrepancy > 0 ? 'var(--accent)' : 'var(--primary)' },
    { label: 'Tracked Accounts', value: data.summary.total_accounts, icon: Landmark, color: 'var(--accent)' },
  ] : [];

  const tabs = [
    { id: 'accounts', label: 'Daily Summary', icon: CheckCircle2 },
    { id: 'movements', label: 'Movement Log', icon: History },
    { id: 'transfers', label: 'Transfers', icon: ArrowLeftRight },
    { id: 'receipts', label: 'Direct Receipts', icon: Receipt },
    { id: 'discrepancies', label: 'Discrepancies', icon: AlertTriangle },
    { id: 'adjustments', label: 'Adjustments', icon: ShieldCheck },
    { id: 'balance-report', label: 'Balance Report', icon: Landmark },
    { id: 'audit', label: 'Audit Trail', icon: FileText }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      

      {!loading && data && (
        <div className="kpi-scroll-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {kpis.map((k, i) => {
            const Icon = k.icon;
            return (
              <Card key={i} style={{ padding: '1.25rem', borderLeft: `3px solid ${k.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', margin: '0 0 0.5rem 0' }}>{k.label}</p>
                    <h3 style={{ color: 'var(--text-main)', fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{typeof k.value === 'number' ? money(k.value) : k.value}</h3>
                  </div>
                  <div style={{ background: `${k.color}15`, padding: '8px', borderRadius: '10px', color: k.color }}>
                    <Icon size={20} />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Card className="recon-quick-actions" style={{ padding: '1.5rem', background: 'var(--surface)' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', margin: '0 0 1rem 0', fontWeight: 600 }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          
          <button onClick={() => setActiveModal('opening')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1.25rem', background: 'var(--primary-glow)', border: '1px solid var(--primary)', borderRadius: '16px', color: 'var(--primary)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.8'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            <Landmark size={28} />
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Set Opening Balance</span>
          </button>
          
          <button onClick={() => setActiveModal('collection')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1.25rem', background: 'var(--accent-glow)', border: '1px solid var(--accent)', borderRadius: '16px', color: 'var(--accent)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.8'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            <Banknote size={28} />
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Record Collection</span>
          </button>
          
          <button onClick={() => setActiveModal('transfer')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1.25rem', background: 'var(--canvas)', border: '1px solid var(--text-main)', borderRadius: '16px', color: 'var(--text-main)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.8'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            <ArrowLeftRight size={28} />
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Internal Transfer</span>
          </button>
          
          <button onClick={() => setActiveModal('closing')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1.25rem', background: 'var(--primary-glow)', border: '1px solid var(--primary)', borderRadius: '16px', color: 'var(--primary)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.8'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            <ShieldCheck size={28} />
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Submit Closing</span>
          </button>

        </div>
      </Card>

      <div className="recon-toolbar" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0', background: 'var(--surface)', padding: '3px', borderRadius: '10px', border: '1px solid var(--border)', flex: 1 }}>
          {['daily', 'weekly', 'monthly', 'custom'].map((p) => (
            <button key={p} onClick={() => setPreset(p)} style={{ 
              padding: '0.4rem 0.7rem', borderRadius: '7px', border: 'none', 
              background: preset === p ? 'var(--accent)' : 'transparent', 
              color: preset === p ? '#ffffff' : 'var(--text-dim)', 
              fontSize: '0.72rem', fontWeight: 600, textTransform: 'capitalize', cursor: 'pointer', transition: 'all 0.2s',
              flex: 1, textAlign: 'center'
            }}>
              {p === 'daily' ? 'Day' : p === 'weekly' ? 'Week' : p === 'monthly' ? 'Month' : 'Custom'}
            </button>
          ))}
        </div>
        <button onClick={exportPdf} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.8rem', borderRadius: '8px', background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '0.75rem', flexShrink: 0 }}>
          <Download size={14} /> <span className="recon-export-label">Export</span>
        </button>
      </div>
      {preset === 'custom' && (
        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={{ flex: 1, padding: '0.4rem', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.75rem' }} />
          <span style={{ color: 'var(--text-dim)', alignSelf: 'center', fontSize: '0.7rem' }}>→</span>
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={{ flex: 1, padding: '0.4rem', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.75rem' }} />
        </div>
      )}

      <div className="recon-tabs" style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem',
              background: 'transparent', border: 'none', borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              color: isActive ? 'var(--accent)' : '#94a3b8', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s'
            }}>
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      <div ref={printRef} style={{ background: 'var(--canvas)' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}><Loader2 size={40} className="animate-spin" color="var(--accent)" /></div>
        ) : !data ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>No data available.</div>
        ) : (
          <div style={{ padding: '0.5rem 0' }}>
            
            {activeTab === 'accounts' && (
              <Table 
                columns={[
                  { key: 'account_name', label: 'Account', render: r => <div><div style={{fontWeight:600, color: 'var(--text-main)'}}>{r.account_name}</div><div style={{fontSize:'0.7rem', color: 'var(--text-dim)'}}>{r.account_code}</div></div> },
                  { key: 'account_type', label: 'Type', render: r => <span style={{padding:'2px 8px', background:'rgba(255,255,255,0.05)', borderRadius:'8px', fontSize:'0.7rem', textTransform:'uppercase'}}>{r.account_type}</span> },
                  { key: 'opening_balance', label: 'Opening', render: r => (
                    <div style={{ position: 'relative' }}>
                      <div style={{ color: 'var(--text-main)' }}>{money(r.opening_balance)}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '2px' }}>{r.opening_source_label || 'Carry forward'}</div>
                      {r.last_actual_closing_date && (
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Prev close {r.last_actual_closing_date}: {money(r.last_actual_closing)}</div>
                      )}
                      {Math.abs(r.continuity_variance || 0) > 0.009 && (
                        <div style={{ fontSize: '0.65rem', color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 4px', borderRadius: '4px', marginTop: '2px' }}>
                          <AlertTriangle size={10} /> Slip: {money(r.continuity_variance)}
                        </div>
                      )}
                    </div>
                  ) },
                   { key: 'inflows', label: 'Inflows', render: r => (
                     <button 
                       onClick={() => {
                         const accountMovements = (data?.movements || []).filter(m => m.account_id === r.account_id);
                         setDrillDown({ isOpen: true, title: 'Inflow Audit', accountName: r.account_name, data: accountMovements.filter(m => m.direction === 'inflow') });
                       }}
                       style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '4px 8px', borderRadius: '6px', color: 'var(--primary)', cursor: 'pointer', fontWeight: 700 }}
                     >
                       <div>{money(r.inflows)}</div>
                       <div style={{ fontSize: '0.62rem', color: '#86efac', fontWeight: 500 }}>Auto {money(r.system_generated_inflows || 0)} / Manual {money(r.manual_inflows || 0)}</div>
                     </button>
                   ) },
                   { key: 'outflows', label: 'Outflows', render: r => (
                     <button 
                       onClick={() => {
                         const accountMovements = (data?.movements || []).filter(m => m.account_id === r.account_id);
                         setDrillDown({ isOpen: true, title: 'Outflow Audit', accountName: r.account_name, data: accountMovements.filter(m => m.direction === 'outflow') });
                       }}
                       style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '4px 8px', borderRadius: '6px', color: 'var(--danger)', cursor: 'pointer', fontWeight: 700 }}
                     >
                       <div>{money(r.outflows)}</div>
                       <div style={{ fontSize: '0.62rem', color: '#fca5a5', fontWeight: 500 }}>Auto {money(r.system_generated_outflows || 0)} / Manual {money(r.manual_outflows || 0)}</div>
                     </button>
                   ) },
                   { key: 'expected_closing_balance', label: 'System Close', render: r => <div><strong style={{color: 'var(--text-main)', padding: '0 8px'}}>{money(r.expected_closing_balance)}</strong><div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', padding: '0 8px' }}>Opening + inflows - outflows</div></div> },
                   { key: 'actual_closing_balance', label: 'Actual Close', render: r => r.actual_closing_balance === null ? <span style={{color: 'var(--text-dim)', padding: '0 8px'}}>Pending</span> : <div><strong style={{color:'var(--accent)', padding: '0 8px'}}>{money(r.actual_closing_balance)}</strong><div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', padding: '0 8px' }}>{r.closing_source_label || 'Submitted'}{r.closing_recorded_by ? ` by ${r.closing_recorded_by}` : ''}</div></div> },
                  { key: 'discrepancy_amount', label: 'Variance', render: r => (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <strong style={{ color: Math.abs(Number(r.discrepancy_amount)) > 0.009 ? 'var(--danger)' : 'var(--primary)', fontSize: '1rem' }}>{money(r.discrepancy_amount)}</strong>
                      {r.discrepancy_reason && <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>{r.discrepancy_reason}</span>}
                    </div>
                  ) },
                  { key: 'status', label: 'Status', render: r => <span style={{padding:'3px 10px', borderRadius:'12px', fontSize:'0.7rem', fontWeight:600, background: r.status==='reconciled'?'var(--primary-glow)':r.status==='discrepancy'?'rgba(239,68,68,0.1)':'rgba(148,163,184,0.1)', color: r.status==='reconciled'?'var(--primary)':r.status==='discrepancy'?'var(--danger)':'#94a3b8'}}>{r.status.toUpperCase()}</span> }
                ]} 
                rows={accounts} 
              />
            )}

            {activeTab === 'movements' && (
              <Table 
                columns={[
                  { key: 'movement_date', label: 'Date', render: r => fmtDate(r.movement_date) },
                  { key: 'account_name', label: 'Account', render: r => <span style={{fontWeight:600}}>{r.account_name}</span> },
                  { key: 'transaction_type', label: 'Type', render: r => <span style={{color: 'var(--text-dim)', fontSize:'0.75rem', textTransform:'capitalize'}}>{r.transaction_type.replace(/_/g, ' ')}</span> },
                  { key: 'reference', label: 'Ref', render: r => r.reference || '-' },
                  { key: 'remarks', label: 'Details', render: r => <div style={{maxWidth:'200px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}} title={r.remarks}>{r.remarks || '-'}</div> },
                  { key: 'amount', label: 'Amount', render: r => <strong style={{ color: r.direction==='inflow'?'var(--primary)':r.direction==='outflow'?'var(--danger)':'#94a3b8' }}>{r.direction==='outflow'?'-':''}{money(r.amount)}</strong> },
                  { key: 'new_balance', label: 'Running Bal', render: r => money(r.new_balance) },
                  { key: 'created_by_name', label: 'User', render: r => <span style={{fontSize:'0.75rem'}}>{r.created_by_name}</span> }
                ]} 
                rows={data.movements || []} 
              />
            )}

            {activeTab === 'transfers' && (
              <Table 
                columns={[
                  { key: 'movement_date', label: 'Date', render: r => fmtDate(r.movement_date) },
                  { key: 'account_name', label: 'From/To Account', render: r => <span style={{fontWeight:600}}>{r.account_name}</span> },
                  { key: 'related_account_name', label: 'Counterparty', render: r => <span style={{color:'var(--accent)'}}>{r.related_account_name}</span> },
                  { key: 'transaction_type', label: 'Direction', render: r => r.transaction_type==='transfer_in' ? <span style={{color:'var(--primary)'}}>IN</span> : <span style={{color:'var(--danger)'}}>OUT</span> },
                  { key: 'reference', label: 'Reference' },
                  { key: 'amount', label: 'Amount', render: r => <strong>{money(r.amount)}</strong> }
                ]} 
                rows={data.transfers || []} 
              />
            )}

            {activeTab === 'receipts' && (
              <Table 
                columns={[
                  { key: 'movement_date', label: 'Date', render: r => fmtDate(r.movement_date) },
                  { key: 'account_name', label: 'Bank/MFS Account', render: r => <span style={{fontWeight:600}}>{r.account_name}</span> },
                  { key: 'transaction_type', label: 'Type', render: r => <span style={{textTransform:'capitalize', color: 'var(--text-dim)'}}>{r.transaction_type.replace('_',' ')}</span> },
                  { key: 'reference', label: 'Reference' },
                  { key: 'remarks', label: 'Details' },
                  { key: 'amount', label: 'Amount', render: r => <strong style={{ color: 'var(--primary)' }}>{money(r.amount)}</strong> }
                ]} 
                rows={data.direct_bank_receipts || []} 
              />
            )}

            {activeTab === 'discrepancies' && (
              <Table 
                empty="No discrepancies found. Excellent!"
                columns={[
                  { key: 'account_name', label: 'Account', render: r => <span style={{fontWeight:600}}>{r.account_name}</span> },
                  { key: 'opening_balance', label: 'Opening', render: r => money(r.opening_balance) },
                  { key: 'expected_closing_balance', label: 'System Closing', render: r => money(r.expected_closing_balance) },
                  { key: 'actual_closing_balance', label: 'Actual Closing', render: r => money(r.actual_closing_balance) },
                  { key: 'discrepancy_amount', label: 'Variance', render: r => <strong style={{ color: 'var(--danger)' }}>{money(r.discrepancy_amount)}</strong> },
                  { key: 'discrepancy_reason', label: 'Manager Explanation', render: r => r.discrepancy_reason || <span style={{color:'var(--danger)', fontStyle:'italic'}}>Missing</span> }
                ]} 
                rows={data.discrepancies || []} 
              />
            )}

            {activeTab === 'adjustments' && (
              <Table 
                empty="No manual adjustments recorded."
                columns={[
                  { key: 'movement_date', label: 'Date', render: r => fmtDate(r.movement_date) },
                  { key: 'account_name', label: 'Account', render: r => <span style={{fontWeight:600}}>{r.account_name}</span> },
                  { key: 'transaction_type', label: 'Type', render: r => <span style={{textTransform:'capitalize', color:'var(--accent)'}}>{r.transaction_type.replace('_',' ')}</span> },
                  { key: 'reason', label: 'Reason', render: r => r.reason || r.remarks || '-' },
                  { key: 'amount', label: 'Impact', render: r => <strong style={{color:r.direction==='inflow'?'var(--primary)':'var(--danger)'}}>{r.direction==='outflow'?'-':''}{money(r.amount)}</strong> },
                  { key: 'new_balance', label: 'New Balance', render: r => money(r.new_balance) }
                ]} 
                rows={data.adjustment_history || []} 
              />
            )}

            {activeTab === 'balance-report' && (
              <Table
                empty="No opening/closing records found."
                columns={[
                  { key: 'report_date', label: 'Report Date', render: r => <div><strong>{r.report_from === r.report_to ? r.report_from : `${r.report_from} to ${r.report_to}`}</strong><div style={{ fontSize:'0.65rem', color: 'var(--text-dim)' }}>Selected period</div></div> },
                  { key: 'account_name', label: 'Account', render: r => <div><div style={{fontWeight:600}}>{r.account_name}</div><div style={{fontSize:'0.7rem', color: 'var(--text-dim)'}}>{r.account_code}</div></div> },
                  { key: 'previous_closing_balance', label: 'Prev Close', render: r => <div><strong>{money(r.previous_closing_balance)}</strong><div style={{ fontSize:'0.65rem', color: 'var(--text-dim)' }}>{r.previous_closing_date || 'No prior close'}</div></div> },
                  { key: 'opening_balance', label: 'Opening', render: r => <div><strong>{money(r.opening_balance)}</strong><div style={{ fontSize:'0.65rem', color: r.opening_source === 'carry_forward' ? '#94a3b8' : 'var(--accent)' }}>{r.opening_source_label}</div></div> },
                  { key: 'continuity_variance', label: 'Continuity', render: r => <div><strong style={{ color: r.has_continuity_exception ? 'var(--danger)' : 'var(--primary)' }}>{money(r.continuity_variance)}</strong><div style={{ fontSize:'0.65rem', color: 'var(--text-dim)' }}>{r.opening_recorded_by || 'System'}</div></div> },
                  { key: 'expected_closing_balance', label: 'System Close', render: r => money(r.expected_closing_balance) },
                  { key: 'actual_closing_balance', label: 'Actual Close', render: r => r.actual_closing_balance === null ? <span style={{ color: 'var(--text-dim)' }}>Pending</span> : <div><strong>{money(r.actual_closing_balance)}</strong><div style={{ fontSize:'0.65rem', color: 'var(--text-dim)' }}>{r.closing_source_label}{r.closing_recorded_by ? ` by ${r.closing_recorded_by}` : ''}</div></div> },
                  { key: 'discrepancy_amount', label: 'Mismatch', render: r => <strong style={{ color: r.has_closing_exception ? 'var(--danger)' : 'var(--primary)' }}>{money(r.discrepancy_amount)}</strong> },
                  { key: 'exceptions', label: 'Flags', render: r => <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>{r.has_continuity_exception ? <span style={{ color:'var(--danger)', fontSize:'0.7rem', fontWeight:700 }}>Opening mismatch</span> : <span style={{ color:'var(--primary)', fontSize:'0.7rem', fontWeight:700 }}>Opening ok</span>}{r.has_closing_exception ? <span style={{ color:'var(--danger)', fontSize:'0.7rem', fontWeight:700 }}>Closing mismatch</span> : <span style={{ color:'var(--primary)', fontSize:'0.7rem', fontWeight:700 }}>Closing ok</span>}</div> },
                ]}
                rows={openingClosingReport}
              />
            )}

            {activeTab === 'audit' && (
              <Table 
                columns={[
                  { key: 'timestamp', label: 'Timestamp', render: r => <span style={{fontSize:'0.75rem', color: 'var(--text-dim)'}}>{new Date(r.timestamp).toLocaleString()}</span> },
                  { key: 'user_name', label: 'User', render: r => <span style={{fontWeight:600}}>{r.user_name}</span> },
                  { key: 'action', label: 'Action', render: r => <span style={{padding:'2px 8px', background:'rgba(255,255,255,0.05)', borderRadius:'6px', fontSize:'0.7rem', textTransform:'uppercase'}}>{r.action}</span> },
                  { key: 'entity', label: 'Target', render: r => `${r.entity} #${r.entity_id}` },
                  { key: 'new_value', label: 'Data Snapshot', render: r => <div style={{fontSize:'0.7rem', color: 'var(--text-dim)', fontFamily:'monospace', maxWidth:'400px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{JSON.stringify(r.new_value||{})}</div> }
                ]} 
                rows={data.full_audit_trail || []} 
              />
            )}

          </div>
        )}
      </div>

      <Modal isOpen={activeModal === 'opening'} onClose={() => setActiveModal(null)} title="Set Opening Balance">
        <div style={{ padding: '1rem', background: 'var(--accent-glow)', border: '1px solid var(--accent-glow)', borderRadius: '12px', marginBottom: '1rem' }}>
          <div style={{ color: '#bfdbfe', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>Opening should match carry-forward unless properly adjusted</div>
          <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>If the previous day closed at `0`, today cannot start at `5000` unless the source is recorded through transfer, collection, or adjustment.</div>
        </div>
        <Input type="select" label="Target Account" value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })}>
          <option value="">-- Select Account --</option>
          {liquidAccountOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Input>
        <Input label="Effective Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        {formSnapshotLoading ? <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>Checking previous closing...</div> : formAccountSnapshot && (
          <div style={{ padding: '0.9rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '1rem' }}>
            <div style={{ color: 'var(--text-main)', fontSize: '0.82rem' }}>System opening for {form.date}: <strong>{money(formAccountSnapshot.opening_balance)}</strong></div>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: '0.35rem' }}>Previous close: {formAccountSnapshot.last_actual_closing_date ? `${formAccountSnapshot.last_actual_closing_date} - ${money(formAccountSnapshot.last_actual_closing)}` : 'No previous closing submitted'}</div>
          </div>
        )}
        <Input label="Opening Balance (BDT)" type="number" placeholder="0.00" value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: e.target.value })} />
        {formAccountSnapshot && form.opening_balance !== '' && Math.abs(openingMismatch) > 0.009 && (
          <div style={{ padding: '0.85rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', color: '#fca5a5', fontSize: '0.8rem', marginBottom: '1rem' }}>
            Warning: entered opening balance differs from system carry-forward by {money(openingMismatch)}.
          </div>
        )}
        <Input label="Adjustment Reason" placeholder="e.g. Initial setup or correction" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <button className="btn-primary" style={{ width: '100%', padding: '0.85rem', marginTop: '1rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }} disabled={saving} onClick={() => submit('/reconciliation/opening-balance', { account_id: form.account_id, date: form.date, opening_balance: form.opening_balance, reason: form.reason }, 'Opening balance recorded')}>
          {saving ? 'Saving...' : 'Confirm Opening Balance'}
        </button>
      </Modal>

      <Modal isOpen={activeModal === 'collection'} onClose={() => setActiveModal(null)} title="Record Manual Collection">
        <Input type="select" label="Deposit Account" value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })}>
          <option value="">-- Select Account --</option>
          {liquidAccountOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Input>
        <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <Input label="Amount Received (BDT)" type="number" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <Input label="Source / Customer" placeholder="Name or Source details" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
        <Input label="Reference ID" placeholder="Txn ID or Receipt No." value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
        <button className="btn-primary" style={{ width: '100%', padding: '0.85rem', marginTop: '1rem', background: 'var(--accent)', color: '#0f172a', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }} disabled={saving} onClick={() => submit('/reconciliation/collections', { account_id: form.account_id, date: form.date, amount: form.amount, source: form.source, reference: form.reference }, 'Collection saved')}>
          {saving ? 'Processing...' : 'Record Collection'}
        </button>
      </Modal>

      <Modal isOpen={activeModal === 'transfer'} onClose={() => setActiveModal(null)} title="Internal System Transfer">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input type="select" label="Withdraw From" value={form.from_account_id} onChange={(e) => setForm({ ...form, from_account_id: e.target.value })}>
            <option value="">-- Source --</option>
            {liquidAccountOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Input>
          <Input type="select" label="Deposit To" value={form.to_account_id} onChange={(e) => setForm({ ...form, to_account_id: e.target.value })}>
            <option value="">-- Destination --</option>
            {liquidAccountOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Input>
        </div>
        <Input label="Transfer Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <Input label="Transfer Amount (BDT)" type="number" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <Input label="Remarks / Reference" placeholder="Reason for transfer" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
        <button className="btn-primary" style={{ width: '100%', padding: '0.85rem', marginTop: '1rem', background: 'var(--text-main)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }} disabled={saving} onClick={() => submit('/reconciliation/transfers', { from_account_id: form.from_account_id, to_account_id: form.to_account_id, date: form.date, amount: form.amount, remarks: form.remarks, reference: form.reference }, 'Transfer complete')}>
          {saving ? 'Transferring...' : 'Execute Transfer'}
        </button>
      </Modal>

      <Modal isOpen={activeModal === 'closing'} onClose={() => setActiveModal(null)} title="Submit Closing Balance">
        <div style={{ padding: '1rem', background: 'var(--accent-glow)', border: '1px solid var(--accent-glow)', borderRadius: '12px', marginBottom: '1.5rem' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#fcd34d' }}>Closing submission logs actual balance. Discrepancies will be audited.</p>
        </div>
        <Input type="select" label="Account to Close" value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })}>
          <option value="">-- Select Account --</option>
          {liquidAccountOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Input>
        <Input label="Closing Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        {formSnapshotLoading ? <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>Calculating today&apos;s final amount...</div> : formAccountSnapshot && (
          <div style={{ padding: '0.95rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '1rem' }}>
            <div style={{ color: 'var(--text-main)', fontSize: '0.84rem' }}>Today&apos;s system final amount: <strong>{money(formAccountSnapshot.expected_closing_balance)}</strong></div>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: '0.35rem' }}>Opening {money(formAccountSnapshot.opening_balance)} + inflows {money(formAccountSnapshot.inflows)} - outflows {money(formAccountSnapshot.outflows)}</div>
          </div>
        )}
        <Input label="Actual Count / Physical Balance" type="number" placeholder="0.00" value={form.actual_closing_balance} onChange={(e) => setForm({ ...form, actual_closing_balance: e.target.value })} />
        {formAccountSnapshot && form.actual_closing_balance !== '' && Math.abs(closingMismatch) > 0.009 && (
          <div style={{ padding: '0.85rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', color: '#fca5a5', fontSize: '0.8rem', marginBottom: '1rem' }}>
            Warning: submitted closing balance differs from today&apos;s system final amount by {money(closingMismatch)}. Please verify before submitting.
          </div>
        )}
        <Input label="Discrepancy Explanation (if any)" placeholder="Explain any mismatch..." value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <button className="btn-primary" style={{ width: '100%', padding: '0.85rem', marginTop: '1rem', background: 'var(--accent)', color: '#0f172a', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }} disabled={saving} onClick={() => submit('/reconciliation/closing-balance', { account_id: form.account_id, date: form.date, actual_closing_balance: form.actual_closing_balance, reason: form.reason }, 'Closing submitted successfully')}>
          {saving ? 'Validating...' : 'Submit Final Closing'}
        </button>
      </Modal>

      <DrillDownModal 
        isOpen={drillDown.isOpen} 
        onClose={() => setDrillDown({ ...drillDown, isOpen: false })} 
        title={drillDown.title} 
        accountName={drillDown.accountName} 
        data={drillDown.data} 
      />

    </div>
  );
}
