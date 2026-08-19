import React from 'react';
import { X, Inbox, Search } from 'lucide-react';

export const Spinner = () => <span className="spinner" />;

export const PageHead = ({ title, desc, actions }) => (
  <div className="page-head">
    <div>
      <h1 className="title">{title}</h1>
      {desc && <div className="desc">{desc}</div>}
    </div>
    {actions && <div className="wrap-gap">{actions}</div>}
  </div>
);

export const Button = ({ variant = 'primary', size, icon: Icon, children, ...rest }) => (
  <button className={`btn btn-${variant} ${size === 'sm' ? 'btn-sm' : ''}`} {...rest}>
    {Icon && <Icon size={size === 'sm' ? 15 : 16} />} {children}
  </button>
);

export const Badge = ({ tone = 'grey', children, dot }) => (
  <span className={`badge badge-${tone}`}>{dot && <span className="badge-dot" />}{children}</span>
);

// Map common statuses to badge tones
const TONE = {
  active: 'green', available: 'green', completed: 'green', paid: 'green', approved: 'green', signed: 'green', valid: 'green', matched: 'green', reconciled: 'green', cleared: 'green',
  draft: 'grey', inactive: 'grey', closed: 'grey', archived: 'grey', cancelled: 'grey',
  pending: 'amber', follow_up: 'amber', partially_paid: 'amber', partial: 'amber', sent: 'amber', expiring: 'amber', in_progress: 'amber', due: 'amber',
  new: 'blue', contacted: 'blue', meeting: 'blue', reserved: 'blue', prospect: 'blue', viewed: 'blue', unmatched: 'blue',
  lost: 'red', overdue: 'red', declined: 'red', voided: 'red', expired: 'red', suspended: 'red', terminated: 'red', arrears: 'red',
};
export const StatusBadge = ({ status }) => {
  if (!status) return <Badge tone="grey">—</Badge>;
  const label = String(status).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return <Badge tone={TONE[status] || 'blue'} dot>{label}</Badge>;
};

export const StatCard = ({ icon: Icon, label, value, tone = 'blue', trend }) => {
  const colors = {
    blue: ['var(--primary-50)', 'var(--primary)'], green: ['var(--success-bg)', 'var(--success)'],
    amber: ['var(--warning-bg)', 'var(--warning)'], red: ['var(--danger-bg)', 'var(--danger)'],
    sky: ['var(--info-bg)', 'var(--info)'],
  }[tone] || ['var(--primary-50)', 'var(--primary)'];
  return (
    <div className="card stat">
      <div className="stat-top">
        <div className="icon" style={{ background: colors[0], color: colors[1] }}>{Icon && <Icon size={21} />}</div>
        {trend && <span className={`trend ${trend.dir}`}>{trend.dir === 'up' ? '▲' : '▼'} {trend.value}</span>}
      </div>
      <div className="value">{value}</div>
      <div className="label">{label}</div>
    </div>
  );
};

export const Field = ({ label, required, children, full }) => {
  const generatedId = React.useId();
  const control = React.isValidElement(children) && !children.props.id
    ? React.cloneElement(children, { id: generatedId })
    : children;
  const controlId = React.isValidElement(control) ? control.props.id : undefined;
  return (
    <div className="field" style={full ? { gridColumn: '1 / -1' } : undefined}>
      {label && <label htmlFor={controlId}>{label}{required && <span className="req"> *</span>}</label>}
      {control}
    </div>
  );
};

export const Input = (props) => <input className="input" {...props} />;
export const Textarea = (props) => <textarea className="textarea" {...props} />;
export const Select = ({ children, ...rest }) => <select className="select" {...rest}>{children}</select>;

export const Drawer = ({ title, onClose, children, footer, width }) => {
  const titleId = React.useId();
  const drawerRef = React.useRef(null);
  const closeRef = React.useRef(null);
  React.useEffect(() => {
    const previous = document.activeElement;
    closeRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = [...drawerRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href]')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus?.(); };
  }, [onClose]);
  return (
    <>
      <div className="overlay" onClick={onClose} aria-hidden="true" />
      <aside ref={drawerRef} className="drawer" role="dialog" aria-modal="true" aria-labelledby={titleId} style={width ? { width } : undefined}>
        <div className="drawer-head">
          <h2 id={titleId}>{title}</h2>
          <button ref={closeRef} type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close drawer"><X size={18} /></button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </aside>
    </>
  );
};

export const EmptyState = ({ icon: Icon = Inbox, title, sub, action }) => (
  <div className="empty">
    <div className="empty-icon"><Icon size={28} /></div>
    <h3 style={{ margin: '0 0 6px', color: 'var(--text)' }}>{title}</h3>
    {sub && <p style={{ margin: '0 0 16px', fontSize: 13 }}>{sub}</p>}
    {action}
  </div>
);

export const SearchInput = ({ value, onChange, placeholder = 'Search…' }) => (
  <div className="search-box" style={{ minWidth: 220 }}>
    <Search size={16} color="var(--muted)" />
    <input value={value} onChange={onChange} placeholder={placeholder} />
  </div>
);

export const DataTable = ({ columns, rows, onRowClick, loading, empty }) => {
  if (loading) return <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>;
  if (!rows?.length) return empty || <EmptyState title="Nothing here yet" sub="Records will appear here once added." />;
  return (
    <div className="table-wrap">
      <table className="tbl">
        <thead><tr>{columns.map((c) => <th key={c.key} style={c.thStyle}>{c.header}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} onClick={() => onRowClick?.(r)}>
              {columns.map((c) => <td key={c.key} style={c.tdStyle}>{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const KV = ({ k, v }) => (<div className="kv"><span className="k">{k}</span><span className="v">{v ?? '—'}</span></div>);
