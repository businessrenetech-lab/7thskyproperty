// admin-portal/src/screens/sales/SalesReports.jsx
//
// Sales reports & analytics — read-only over /api/sales/reports. Pipeline,
// conversion, settlement forecast, overdue receivables, expected-vs-actual
// fees, response-SLA + workload, expenses/margin, and lead attribution.
// Download as PDF via bundled html2pdf.js.
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  Download,
  RefreshCw,
  Calendar,
  Filter,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Users,
  ShieldCheck,
  DollarSign,
  Briefcase,
  Layers,
  Inbox,
  LayoutDashboard,
  CalendarClock,
  FileText,
  ChevronRight,
  PieChart
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Spinner } from '../../ui/kit';

const bdt = (v) => '৳' + Number(v || 0).toLocaleString('en-BD');
const iso = (d) => d.toISOString().slice(0, 10);

const STAGE_CONFIG = {
  lead: { label: 'Lead', bg: '#f1f5f9', color: '#475569', bar: '#94a3b8' },
  negotiation: { label: 'Negotiation', bg: '#fef3c7', color: '#92400e', bar: '#f59e0b' },
  agreed: { label: 'Agreed', bg: '#e0f2fe', color: '#0369a1', bar: '#0ea5e9' },
  settlement: { label: 'Settlement', bg: '#ede9fe', color: '#5b21b6', bar: '#8b5cf6' },
  completed: { label: 'Completed', bg: '#dcfce7', color: '#166534', bar: '#22c55e' },
  cancelled: { label: 'Cancelled', bg: '#f1f5f9', color: '#64748b', bar: '#cbd5e1' },
};

function StageBadge({ status }) {
  const conf = STAGE_CONFIG[status] || { label: status, bg: '#f1f5f9', color: '#475569' };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 5,
        fontSize: 11.5,
        fontWeight: 600,
        letterSpacing: '0.01em',
        background: conf.bg,
        color: conf.color,
        textTransform: 'capitalize',
      }}
    >
      {conf.label}
    </span>
  );
}

function SectionCard({ title, subtitle, icon: Icon, badge, children }) {
  return (
    <div
      className="pm-card sr-card"
      style={{
        marginBottom: 16,
        background: '#ffffff',
        border: '1px solid var(--line, #e2e8f0)',
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid var(--line-soft, #edf2f7)',
          background: '#ffffff',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {Icon && (
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                display: 'grid',
                placeItems: 'center',
                background: 'var(--surface-2, #f8fafc)',
                border: '1px solid var(--line, #e2e8f0)',
                color: 'var(--navy, #003768)',
                flexShrink: 0,
              }}
            >
              <Icon size={14} />
            </div>
          )}
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 680,
                color: 'var(--ink, #0f172a)',
                letterSpacing: '-0.01em',
              }}
            >
              {title}
            </h3>
            {subtitle && (
              <p
                style={{
                  margin: '1px 0 0',
                  fontSize: 12,
                  color: 'var(--muted, #64748b)',
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {badge && <div>{badge}</div>}
      </div>
      <div style={{ padding: '16px 18px' }}>{children}</div>
    </div>
  );
}

function KpiTile({ label, value, subtext, tone = 'neutral', progress }) {
  const toneMap = {
    neutral: { text: 'var(--ink, #0f172a)', badgeBg: 'var(--surface-2, #f1f5f9)', badgeColor: 'var(--muted, #64748b)' },
    good: { text: '#15803d', badgeBg: '#dcfce7', badgeColor: '#166534' },
    warn: { text: '#b45309', badgeBg: '#fef3c7', badgeColor: '#92400e' },
    bad: { text: '#b91c1c', badgeBg: '#fee2e2', badgeColor: '#991b1b' },
    cyan: { text: '#0369a1', badgeBg: '#e0f2fe', badgeColor: '#0284c7' },
  };
  const currentTone = toneMap[tone] || toneMap.neutral;

  return (
    <div
      style={{
        flex: '1 1 180px',
        background: 'var(--surface-2, #f8fafc)',
        border: '1px solid var(--line, #e2e8f0)',
        borderRadius: 10,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minWidth: 150,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 650,
          color: 'var(--muted, #64748b)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 720,
          color: currentTone.text,
          letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      {typeof progress === 'number' && (
        <div
          style={{
            height: 4,
            width: '100%',
            background: 'var(--line, #e2e8f0)',
            borderRadius: 2,
            marginTop: 8,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, Math.max(0, progress))}%`,
              background: tone === 'good' ? '#22c55e' : 'var(--cyan, #0ea5e9)',
              borderRadius: 2,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      )}
      {subtext && (
        <div
          style={{
            fontSize: 11.5,
            color: 'var(--muted, #64748b)',
            marginTop: 6,
            fontWeight: 500,
          }}
        >
          {subtext}
        </div>
      )}
    </div>
  );
}

function DataTable({ cols, rows, emptyText = 'No records found in selected range.' }) {
  return (
    <div
      style={{
        overflowX: 'auto',
        borderRadius: 8,
        border: '1px solid var(--line-soft, #edf2f7)',
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 12.5,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <thead>
          <tr style={{ background: 'var(--surface-2, #f8fafc)' }}>
            {cols.map((c) => (
              <th
                key={c.k}
                style={{
                  padding: '9px 14px',
                  textAlign: c.right ? 'right' : 'left',
                  color: 'var(--muted, #64748b)',
                  fontWeight: 650,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  borderBottom: '1px solid var(--line, #e2e8f0)',
                  whiteSpace: 'nowrap',
                }}
              >
                {c.h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={cols.length}
                style={{
                  padding: '28px 14px',
                  textAlign: 'center',
                  color: 'var(--muted, #64748b)',
                  fontSize: 12.5,
                }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Inbox size={15} />
                  <span>{emptyText}</span>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr
                key={i}
                style={{
                  borderBottom: i === rows.length - 1 ? 'none' : '1px solid var(--line-soft, #edf2f7)',
                  transition: 'background 0.12s ease',
                }}
                className="sr-table-row"
              >
                {cols.map((c) => (
                  <td
                    key={c.k}
                    style={{
                      padding: '10px 14px',
                      textAlign: c.right ? 'right' : 'left',
                      color: 'var(--ink, #0f172a)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.render ? c.render(r) : r[c.k]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function SummaryStrip({ items }) {
  return (
    <div
      style={{
        marginTop: 12,
        padding: '10px 14px',
        background: 'var(--surface-2, #f8fafc)',
        border: '1px solid var(--line, #e2e8f0)',
        borderRadius: 8,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}
    >
      <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Total Summary
      </div>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {items.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 11.5, color: 'var(--muted, #64748b)', fontWeight: 500 }}>{item.label}:</span>
            <span
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: item.color || 'var(--ink, #0f172a)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SalesReports() {
  const toast = useToast();
  const ref = useRef(null);

  const [from, setFrom] = useState(iso(new Date(Date.now() - 90 * 86400000)));
  const [to, setTo] = useState(iso(new Date()));
  const [category, setCategory] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePreset, setActivePreset] = useState('90D');
  const [activeTab, setActiveTab] = useState('overview');

  const fromInputId = useId();
  const toInputId = useId();
  const categorySelectId = useId();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ from, to });
      if (category) q.set('category', category);
      const r = await api.get(`/sales/reports?${q}`);
      setData(r.data);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [from, to, category, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const applyPreset = (preset) => {
    const now = new Date();
    let newFrom = '';
    const newTo = iso(now);

    if (preset === '30D') {
      newFrom = iso(new Date(Date.now() - 30 * 86400000));
    } else if (preset === '90D') {
      newFrom = iso(new Date(Date.now() - 90 * 86400000));
    } else if (preset === 'YTD') {
      newFrom = `${now.getFullYear()}-01-01`;
    } else if (preset === '12M') {
      newFrom = iso(new Date(Date.now() - 365 * 86400000));
    }

    setFrom(newFrom);
    setTo(newTo);
    setActivePreset(preset);
  };

  const downloadPdf = async () => {
    if (!ref.current) return;
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf()
        .set({
          margin: [8, 8, 8, 8],
          filename: `Sales-Report-${activeTab}-${from}-to-${to}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(ref.current)
        .save();
    } catch {
      toast.error('PDF generation failed');
    }
  };

  // Pipeline deals total for distribution bar
  const pipelineTotal = data?.pipeline ? data.pipeline.reduce((acc, p) => acc + (p.count || 0), 0) : 0;
  const overdueCount = data?.overdue_receivables?.length || 0;
  const totalForecastValue = data?.settlement_forecast?.reduce((s, f) => s + (f.expected_value || 0), 0) || 0;

  // Tabs list configuration
  const TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'pipeline', label: 'Pipeline & Deals', icon: Layers, count: pipelineTotal },
    { id: 'settlements', label: 'Settlements & Credit', icon: CalendarClock, alert: overdueCount > 0 },
    { id: 'financials', label: 'Fees & Margins', icon: DollarSign },
    { id: 'team', label: 'Team & SLA', icon: Users },
    { id: 'all', label: 'All Reports', icon: FileText },
  ];

  /* ── RENDER SUB-SECTIONS (Reusable across tabs & all-view) ── */
  const renderPipelineSection = () => (
    <SectionCard
      title="Pipeline Distribution"
      subtitle="Volume and velocity across all active and historical sales stages."
      icon={Layers}
      badge={
        <span style={{ fontSize: 12, color: 'var(--muted, #64748b)', fontWeight: 600 }}>
          {pipelineTotal} Total Deals
        </span>
      }
    >
      {pipelineTotal > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              height: 8,
              borderRadius: 4,
              overflow: 'hidden',
              display: 'flex',
              background: 'var(--line-soft, #edf2f7)',
              width: '100%',
            }}
          >
            {data.pipeline.map((p) => {
              const pct = (p.count / pipelineTotal) * 100;
              if (!pct) return null;
              const conf = STAGE_CONFIG[p.status] || { bar: '#94a3b8' };
              return (
                <div
                  key={p.status}
                  title={`${p.status}: ${p.count} deals (${Math.round(pct)}%)`}
                  style={{
                    width: `${pct}%`,
                    background: conf.bar,
                    transition: 'width 0.2s ease',
                  }}
                />
              );
            })}
          </div>
          <div
            style={{
              display: 'flex',
              gap: 14,
              marginTop: 8,
              flexWrap: 'wrap',
            }}
          >
            {data.pipeline.map((p) => {
              const conf = STAGE_CONFIG[p.status] || { label: p.status, bar: '#94a3b8' };
              return (
                <div key={p.status} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: conf.bar }} />
                  <span style={{ fontSize: 11, color: 'var(--muted, #64748b)', fontWeight: 500 }}>
                    {conf.label}: <strong style={{ color: 'var(--ink, #0f172a)' }}>{p.count}</strong>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <DataTable
        cols={[
          {
            k: 'status',
            h: 'Stage',
            render: (r) => <StageBadge status={r.status} />,
          },
          {
            k: 'count',
            h: 'Deals',
            right: true,
            render: (r) => <strong>{r.count}</strong>,
          },
          {
            k: 'avg_age_days',
            h: 'Avg Age',
            right: true,
            render: (r) => (
              <span style={{ color: r.avg_age_days > 60 ? '#b45309' : 'var(--ink, #0f172a)' }}>
                {r.avg_age_days} d
              </span>
            ),
          },
          {
            k: 'avg_days_in_stage',
            h: 'Avg In-Stage',
            right: true,
            render: (r) => <span>{r.avg_days_in_stage} d</span>,
          },
        ]}
        rows={data.pipeline}
      />
    </SectionCard>
  );

  const renderConversionSection = () => (
    <SectionCard
      title="Conversion Velocity"
      subtitle="Throughput of property deals created within the selected range."
      icon={TrendingUp}
    >
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KpiTile
          label="Deals Created"
          value={data.conversion.created}
          subtext="Total opportunities initiated in range"
          tone="cyan"
        />
        <KpiTile
          label="Reached Agreed"
          value={`${data.conversion.reached_agreed} (${data.conversion.agreed_rate}%)`}
          subtext="Deals progressed to agreed terms"
          tone={data.conversion.agreed_rate >= 50 ? 'good' : 'warn'}
          progress={data.conversion.agreed_rate}
        />
        <KpiTile
          label="Completed Deals"
          value={`${data.conversion.completed} (${data.conversion.completed_rate}%)`}
          subtext="Transactions successfully closed"
          tone={data.conversion.completed_rate >= 25 ? 'good' : 'neutral'}
          progress={data.conversion.completed_rate}
        />
      </div>
    </SectionCard>
  );

  const renderSettlementSection = () => (
    <SectionCard
      title="Settlement Forecast"
      subtitle="Projected monthly closing schedule and expected transactional value."
      icon={Calendar}
    >
      <DataTable
        cols={[
          {
            k: 'month',
            h: 'Forecast Month',
            render: (r) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={13} color="var(--muted, #64748b)" />
                <span style={{ fontWeight: 600 }}>{r.month}</span>
              </div>
            ),
          },
          {
            k: 'count',
            h: 'Settlements',
            right: true,
            render: (r) => <strong>{r.count}</strong>,
          },
          {
            k: 'expected_value',
            h: 'Expected Value',
            right: true,
            render: (r) => (
              <span style={{ fontWeight: 700, color: 'var(--navy, #003768)' }}>
                {bdt(r.expected_value)}
              </span>
            ),
          },
        ]}
        rows={data.settlement_forecast}
        emptyText="No settlements forecasted for this period."
      />
    </SectionCard>
  );

  const renderOverdueSection = () => (
    <SectionCard
      title="Overdue Receivables"
      subtitle="Deals with past settlement dates carrying unpaid or partial payment balances."
      icon={AlertTriangle}
      badge={
        data.overdue_receivables.length > 0 ? (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 5,
              fontSize: 11.5,
              fontWeight: 650,
              background: '#fee2e2',
              color: '#991b1b',
            }}
          >
            {data.overdue_receivables.length} Action Needed
          </span>
        ) : (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              color: '#166534',
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={13} />
            <span>All Clear</span>
          </span>
        )
      }
    >
      <DataTable
        cols={[
          {
            k: 'property',
            h: 'Property',
            render: (r) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Building2 size={13} color="var(--muted, #64748b)" />
                <span style={{ fontWeight: 600 }}>{r.property || '—'}</span>
              </div>
            ),
          },
          {
            k: 'settlement_date',
            h: 'Due Date',
            render: (r) => <span style={{ color: '#b91c1c', fontWeight: 600 }}>{r.settlement_date}</span>,
          },
          {
            k: 'status',
            h: 'Payment Status',
            render: (r) => (
              <span
                style={{
                  padding: '2px 7px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  background: r.status === 'unpaid' ? '#fee2e2' : '#fef3c7',
                  color: r.status === 'unpaid' ? '#991b1b' : '#92400e',
                  textTransform: 'capitalize',
                }}
              >
                {r.status}
              </span>
            ),
          },
          {
            k: 'expected',
            h: 'Expected Balance',
            right: true,
            render: (r) => <strong>{bdt(r.expected)}</strong>,
          },
        ]}
        rows={data.overdue_receivables}
        emptyText="No overdue receivables. All accounts are up to date."
      />
    </SectionCard>
  );

  const renderFeesSection = () => (
    <SectionCard
      title="Fees — Expected vs Actual"
      subtitle="Commission and marketing fee reconciliation against billings and cash collections."
      icon={DollarSign}
    >
      <DataTable
        cols={[
          {
            k: 'property',
            h: 'Property',
            render: (r) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Building2 size={13} color="var(--muted, #64748b)" />
                <span style={{ fontWeight: 600 }}>{r.property || '—'}</span>
              </div>
            ),
          },
          {
            k: 'expected',
            h: 'Expected Fee',
            right: true,
            render: (r) => bdt(r.expected),
          },
          {
            k: 'invoiced',
            h: 'Invoiced',
            right: true,
            render: (r) => bdt(r.invoiced),
          },
          {
            k: 'collected',
            h: 'Collected',
            right: true,
            render: (r) => <strong style={{ color: '#166534' }}>{bdt(r.collected)}</strong>,
          },
          {
            k: 'variance',
            h: 'Variance',
            right: true,
            render: (r) => {
              const isPositive = r.variance >= 0;
              return (
                <span
                  style={{
                    fontWeight: 650,
                    color: isPositive ? '#166534' : '#b91c1c',
                  }}
                >
                  {isPositive ? `+${bdt(r.variance)}` : `-${bdt(Math.abs(r.variance))}`}
                </span>
              );
            },
          },
        ]}
        rows={data.fees.rows}
        emptyText="No property fee profiles registered for the current scope."
      />

      <SummaryStrip
        items={[
          { label: 'Expected', value: bdt(data.fees.totals.expected) },
          { label: 'Invoiced', value: bdt(data.fees.totals.invoiced) },
          { label: 'Collected', value: bdt(data.fees.totals.collected), color: '#166534' },
          {
            label: 'Variance',
            value:
              data.fees.totals.variance >= 0
                ? `+${bdt(data.fees.totals.variance)}`
                : `-${bdt(Math.abs(data.fees.totals.variance))}`,
            color: data.fees.totals.variance >= 0 ? '#166534' : '#b91c1c',
          },
        ]}
      />
    </SectionCard>
  );

  const renderSlaSection = () => (
    <SectionCard
      title="Response SLA & Assignee Workload"
      subtitle="Inquiry turnaround times against business-day SLAs and officer allocation."
      icon={ShieldCheck}
    >
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <KpiTile
          label="Enquiries Received"
          value={data.sla.enquiries}
          subtext="Total inbound inquiries in range"
        />
        <KpiTile
          label="Responded"
          value={data.sla.responded}
          subtext="Inquiries with recorded outbound reply"
        />
        <KpiTile
          label="Within SLA (≤1 Day)"
          value={`${data.sla.within_sla_pct}%`}
          subtext={`${data.sla.within_sla || 0} inquiries met response SLA`}
          tone={data.sla.within_sla_pct >= 90 ? 'good' : 'warn'}
          progress={data.sla.within_sla_pct}
        />
        <KpiTile
          label="Avg First Response"
          value={`${data.sla.avg_first_response_hours} hrs`}
          subtext="Average duration to first outreach"
          tone="cyan"
        />
      </div>

      <DataTable
        cols={[
          {
            k: 'name',
            h: 'Officer / Assignee',
            render: (r) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'var(--surface-3, #eff3f9)',
                    border: '1px solid var(--line, #e2e8f0)',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: 'var(--navy, #003768)',
                  }}
                >
                  {r.name ? r.name.slice(0, 2).toUpperCase() : 'U'}
                </div>
                <span style={{ fontWeight: 600 }}>{r.name}</span>
              </div>
            ),
          },
          {
            k: 'open_deals',
            h: 'Active Deals',
            right: true,
            render: (r) => <strong>{r.open_deals}</strong>,
          },
          {
            k: 'open_enquiries',
            h: 'Open Inquiries',
            right: true,
            render: (r) => <strong>{r.open_enquiries}</strong>,
          },
        ]}
        rows={data.workload}
        emptyText="No assigned team members with active load in range."
      />
    </SectionCard>
  );

  const renderExpensesSection = () => (
    <SectionCard
      title="Expenses & Operational Margin"
      subtitle="Direct marketing, staging, and property overheads measured against collections."
      icon={Briefcase}
    >
      <DataTable
        cols={[
          {
            k: 'property',
            h: 'Property',
            render: (r) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Building2 size={13} color="var(--muted, #64748b)" />
                <span style={{ fontWeight: 600 }}>{r.property || '—'}</span>
              </div>
            ),
          },
          {
            k: 'total',
            h: 'Total Expenses',
            right: true,
            render: (r) => (
              <span style={{ color: '#b45309' }}>{bdt(r.total)}</span>
            ),
          },
          {
            k: 'collected',
            h: 'Collected Fees',
            right: true,
            render: (r) => bdt(r.collected),
          },
          {
            k: 'margin',
            h: 'Net Margin',
            right: true,
            render: (r) => {
              const isPositive = r.margin >= 0;
              return (
                <span
                  style={{
                    fontWeight: 700,
                    color: isPositive ? '#166534' : '#b91c1c',
                  }}
                >
                  {isPositive ? `+${bdt(r.margin)}` : `-${bdt(Math.abs(r.margin))}`}
                </span>
              );
            },
          },
        ]}
        rows={data.expenses.rows}
        emptyText="No expense records registered for properties in this range."
      />

      <SummaryStrip
        items={[
          { label: 'Total Expenses', value: bdt(data.expenses.totals.expenses), color: '#b45309' },
          { label: 'Total Collected', value: bdt(data.expenses.totals.collected), color: '#166534' },
          {
            label: 'Net Margin',
            value:
              data.expenses.totals.margin >= 0
                ? `+${bdt(data.expenses.totals.margin)}`
                : `-${bdt(Math.abs(data.expenses.totals.margin))}`,
            color: data.expenses.totals.margin >= 0 ? '#166534' : '#b91c1c',
          },
        ]}
      />
    </SectionCard>
  );

  const renderLeadAttributionSection = () => (
    <SectionCard
      title="Lead Attribution"
      subtitle="First-touch marketing source and campaign for leads created in range, with conversion."
      icon={Users}
    >
      <DataTable
        cols={[
          { k: 'source', h: 'Source', render: (r) => <span style={{ fontWeight: 600 }}>{r.source}</span> },
          { k: 'campaign', h: 'Campaign' },
          { k: 'created', h: 'Leads', right: true, render: (r) => <strong>{r.created}</strong> },
          { k: 'converted', h: 'Converted', right: true, render: (r) => <span style={{ color: '#166534', fontWeight: 600 }}>{r.converted}</span> },
          { k: 'rate', h: 'Conv. Rate', right: true, render: (r) => <span style={{ fontWeight: 650 }}>{r.rate}%</span> },
        ]}
        rows={data.lead_attribution || []}
        emptyText="No leads created in this range."
      />
    </SectionCard>
  );

  /* ── EXECUTIVE OVERVIEW TAB (High-density, low scroll cockpit) ── */
  const renderOverviewTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Executive Key Metrics Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <KpiTile
          label="Active Pipeline"
          value={pipelineTotal}
          subtext="Total tracked opportunities"
          tone="cyan"
        />
        <KpiTile
          label="Conversion Rate"
          value={`${data.conversion.completed_rate}%`}
          subtext={`${data.conversion.completed} deals closed`}
          tone={data.conversion.completed_rate >= 25 ? 'good' : 'neutral'}
          progress={data.conversion.completed_rate}
        />
        <KpiTile
          label="Settlement Forecast"
          value={bdt(totalForecastValue)}
          subtext={`${data.settlement_forecast?.length || 0} forecast periods`}
          tone="neutral"
        />
        <KpiTile
          label="Overdue Receivables"
          value={overdueCount === 0 ? 'All Clear' : `${overdueCount} Pending`}
          subtext={overdueCount === 0 ? 'Zero arrears detected' : 'Requires collection follow-up'}
          tone={overdueCount === 0 ? 'good' : 'bad'}
        />
        <KpiTile
          label="Collected Fees"
          value={bdt(data.fees.totals.collected)}
          subtext={`Variance: ${data.fees.totals.variance >= 0 ? '+' : ''}${bdt(data.fees.totals.variance)}`}
          tone="good"
        />
        <KpiTile
          label="SLA Compliance"
          value={`${data.sla.within_sla_pct}%`}
          subtext={`Avg response: ${data.sla.avg_first_response_hours}h`}
          tone={data.sla.within_sla_pct >= 90 ? 'good' : 'warn'}
          progress={data.sla.within_sla_pct}
        />
      </div>

      {/* 2-Column High Density Cockpit */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 16 }}>
        {/* Left Column: Pipeline & Conversion */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--line, #e2e8f0)',
              borderRadius: 12,
              padding: 16,
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={15} color="var(--navy, #003768)" />
                <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink, #0f172a)' }}>
                  Pipeline Stages & Velocity
                </span>
              </div>
              <button
                type="button"
                className="pm-link"
                onClick={() => setActiveTab('pipeline')}
                style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 2 }}
              >
                <span>Details</span>
                <ChevronRight size={13} />
              </button>
            </div>

            {pipelineTotal > 0 ? (
              <div>
                <div
                  style={{
                    height: 8,
                    borderRadius: 4,
                    overflow: 'hidden',
                    display: 'flex',
                    background: 'var(--line-soft, #edf2f7)',
                    width: '100%',
                    marginBottom: 10,
                  }}
                >
                  {data.pipeline.map((p) => {
                    const pct = (p.count / pipelineTotal) * 100;
                    if (!pct) return null;
                    const conf = STAGE_CONFIG[p.status] || { bar: '#94a3b8' };
                    return (
                      <div
                        key={p.status}
                        title={`${p.status}: ${p.count}`}
                        style={{ width: `${pct}%`, background: conf.bar }}
                      />
                    );
                  })}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
                  {data.pipeline.map((p) => (
                    <div
                      key={p.status}
                      style={{
                        padding: '8px 10px',
                        background: 'var(--surface-2, #f8fafc)',
                        border: '1px solid var(--line-soft, #edf2f7)',
                        borderRadius: 7,
                      }}
                    >
                      <div style={{ fontSize: 10.5, color: 'var(--muted, #64748b)', textTransform: 'capitalize' }}>
                        {p.status}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink, #0f172a)' }}>
                        {p.count} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--muted, #64748b)' }}>({p.avg_days_in_stage}d)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted, #64748b)', fontSize: 12 }}>
                No active deals in range.
              </div>
            )}
          </div>

          {/* Quick Conversion strip */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--line, #e2e8f0)',
              borderRadius: 12,
              padding: 16,
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={15} color="var(--navy, #003768)" />
                <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink, #0f172a)' }}>
                  Conversion Throughput
                </span>
              </div>
              <button
                type="button"
                className="pm-link"
                onClick={() => setActiveTab('pipeline')}
                style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 2 }}
              >
                <span>Funnel</span>
                <ChevronRight size={13} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <KpiTile label="Created" value={data.conversion.created} tone="neutral" />
              <KpiTile
                label="Agreed"
                value={`${data.conversion.reached_agreed}`}
                subtext={`${data.conversion.agreed_rate}% rate`}
                tone="warn"
                progress={data.conversion.agreed_rate}
              />
              <KpiTile
                label="Closed"
                value={`${data.conversion.completed}`}
                subtext={`${data.conversion.completed_rate}% rate`}
                tone="good"
                progress={data.conversion.completed_rate}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Financials & Operations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Financial Summary card */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--line, #e2e8f0)',
              borderRadius: 12,
              padding: 16,
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <DollarSign size={15} color="var(--navy, #003768)" />
                <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink, #0f172a)' }}>
                  Financial Health & Margins
                </span>
              </div>
              <button
                type="button"
                className="pm-link"
                onClick={() => setActiveTab('financials')}
                style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 2 }}
              >
                <span>Ledger</span>
                <ChevronRight size={13} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              <div style={{ padding: 12, background: 'var(--surface-2, #f8fafc)', borderRadius: 8, border: '1px solid var(--line-soft, #edf2f7)' }}>
                <div style={{ fontSize: 11, color: 'var(--muted, #64748b)', textTransform: 'uppercase' }}>Invoiced Fees</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink, #0f172a)' }}>{bdt(data.fees.totals.invoiced)}</div>
                <div style={{ fontSize: 11, color: 'var(--muted, #64748b)', marginTop: 2 }}>Expected: {bdt(data.fees.totals.expected)}</div>
              </div>
              <div style={{ padding: 12, background: 'var(--surface-2, #f8fafc)', borderRadius: 8, border: '1px solid var(--line-soft, #edf2f7)' }}>
                <div style={{ fontSize: 11, color: 'var(--muted, #64748b)', textTransform: 'uppercase' }}>Collected Cash</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#166534' }}>{bdt(data.fees.totals.collected)}</div>
                <div style={{ fontSize: 11, color: data.fees.totals.variance >= 0 ? '#166534' : '#b91c1c', marginTop: 2 }}>
                  Variance: {data.fees.totals.variance >= 0 ? '+' : ''}{bdt(data.fees.totals.variance)}
                </div>
              </div>
              <div style={{ padding: 12, background: 'var(--surface-2, #f8fafc)', borderRadius: 8, border: '1px solid var(--line-soft, #edf2f7)' }}>
                <div style={{ fontSize: 11, color: 'var(--muted, #64748b)', textTransform: 'uppercase' }}>Direct Expenses</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#b45309' }}>{bdt(data.expenses.totals.expenses)}</div>
                <div style={{ fontSize: 11, color: 'var(--muted, #64748b)', marginTop: 2 }}>Overheads & staging</div>
              </div>
              <div style={{ padding: 12, background: 'var(--surface-2, #f8fafc)', borderRadius: 8, border: '1px solid var(--line-soft, #edf2f7)' }}>
                <div style={{ fontSize: 11, color: 'var(--muted, #64748b)', textTransform: 'uppercase' }}>Net Margin</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: data.expenses.totals.margin >= 0 ? '#166534' : '#b91c1c' }}>
                  {data.expenses.totals.margin >= 0 ? '+' : ''}{bdt(data.expenses.totals.margin)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted, #64748b)', marginTop: 2 }}>Collected − expenses</div>
              </div>
            </div>
          </div>

          {/* SLA & Risk Highlights */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--line, #e2e8f0)',
              borderRadius: 12,
              padding: 16,
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={15} color="var(--navy, #003768)" />
                <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink, #0f172a)' }}>
                  Service Operations & Credit
                </span>
              </div>
              <button
                type="button"
                className="pm-link"
                onClick={() => setActiveTab('team')}
                style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 2 }}
              >
                <span>Team</span>
                <ChevronRight size={13} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: 'var(--surface-2, #f8fafc)',
                  borderRadius: 7,
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--muted, #64748b)' }}>Team Response SLA (≤1 Day)</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: data.sla.within_sla_pct >= 90 ? '#166534' : '#b45309' }}>
                  {data.sla.within_sla_pct}% ({data.sla.within_sla}/{data.sla.responded} responded)
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: overdueCount > 0 ? '#fee2e2' : 'var(--surface-2, #f8fafc)',
                  borderRadius: 7,
                }}
              >
                <span style={{ fontSize: 12, color: overdueCount > 0 ? '#991b1b' : 'var(--muted, #64748b)' }}>
                  Overdue Accounts Receivable
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: overdueCount > 0 ? '#991b1b' : '#166534' }}>
                  {overdueCount === 0 ? 'All Clear (0)' : `${overdueCount} overdue actions`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pm-scope sales-reports-screen" style={{ minHeight: '100%', paddingBottom: 40 }}>
      {/* Header & Filter Bar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--cyan, #0ea5e9)',
                marginBottom: 3,
              }}
            >
              Residential Sales Intelligence
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 750,
                color: 'var(--ink, #0f172a)',
                letterSpacing: '-0.02em',
              }}
            >
              Sales Reports & Analytics
            </h1>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 13,
                color: 'var(--muted, #64748b)',
              }}
            >
              Real-time pipeline tracking, deal conversion, settlement forecasts, fee reconciliations, and margin analysis.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              className="pm-btn"
              onClick={load}
              disabled={loading}
              style={{
                padding: '8px 14px',
                fontSize: 12.5,
                fontWeight: 600,
                borderRadius: 8,
                border: '1px solid var(--line, #e2e8f0)',
                background: '#ffffff',
                color: 'var(--ink, #0f172a)',
                cursor: loading ? 'default' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
              }}
            >
              <RefreshCw size={13} className={loading ? 'sr-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              className="pm-btn"
              onClick={downloadPdf}
              style={{
                padding: '8px 14px',
                fontSize: 12.5,
                fontWeight: 600,
                borderRadius: 8,
                border: '1px solid transparent',
                background: 'var(--navy, #003768)',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 1px 3px rgba(0, 55, 104, 0.2)',
              }}
            >
              <Download size={13} />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
            border: '1px solid var(--line, #e2e8f0)',
            borderRadius: 10,
            padding: '8px 14px',
            flexWrap: 'wrap',
            gap: 12,
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
          }}
        >
          {/* Preset Segment */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11.5, fontWeight: 650, color: 'var(--muted, #64748b)', marginRight: 6 }}>
              Period:
            </span>
            {['30D', '90D', 'YTD', '12M'].map((p) => {
              const active = activePreset === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => applyPreset(p)}
                  style={{
                    border: 'none',
                    background: active ? 'var(--surface-3, #eff3f9)' : 'transparent',
                    color: active ? 'var(--navy, #003768)' : 'var(--muted, #64748b)',
                    fontWeight: active ? 700 : 500,
                    fontSize: 11.5,
                    padding: '5px 10px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Date Range Inputs */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--surface-2, #f8fafc)',
                border: '1px solid var(--line, #e2e8f0)',
                borderRadius: 7,
                padding: '4px 8px',
                gap: 6,
              }}
            >
              <Calendar size={13} color="var(--muted, #64748b)" />
              <label htmlFor={fromInputId} className="sr-only">Start Date</label>
              <input
                id={fromInputId}
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setActivePreset('');
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: 12,
                  color: 'var(--ink, #0f172a)',
                  outline: 'none',
                  fontFamily: 'inherit',
                  padding: '2px 0',
                }}
              />
              <ArrowRight size={11} color="var(--muted, #64748b)" />
              <label htmlFor={toInputId} className="sr-only">End Date</label>
              <input
                id={toInputId}
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setActivePreset('');
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: 12,
                  color: 'var(--ink, #0f172a)',
                  outline: 'none',
                  fontFamily: 'inherit',
                  padding: '2px 0',
                }}
              />
            </div>

            {/* Category Select */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--surface-2, #f8fafc)',
                border: '1px solid var(--line, #e2e8f0)',
                borderRadius: 7,
                padding: '4px 8px',
                gap: 6,
              }}
            >
              <Filter size={13} color="var(--muted, #64748b)" />
              <label htmlFor={categorySelectId} className="sr-only">Filter Category</label>
              <select
                id={categorySelectId}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: 12,
                  color: 'var(--ink, #0f172a)',
                  outline: 'none',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  padding: '2px 0',
                }}
              >
                <option value="">All categories</option>
                {['residential', 'commercial', 'rural', 'business'].map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── UX TABS NAVIGATION BAR ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            overflowX: 'auto',
            paddingBottom: 2,
            borderBottom: '1px solid var(--line, #e2e8f0)',
          }}
        >
          {TABS.map((t) => {
            const active = activeTab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '9px 14px',
                  border: 'none',
                  borderBottom: active ? '2px solid var(--navy, #003768)' : '2px solid transparent',
                  background: 'transparent',
                  color: active ? 'var(--navy, #003768)' : 'var(--muted, #64748b)',
                  fontWeight: active ? 700 : 550,
                  fontSize: 12.5,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={14} color={active ? 'var(--navy, #003768)' : 'var(--muted, #64748b)'} />
                <span>{t.label}</span>
                {typeof t.count === 'number' && (
                  <span
                    style={{
                      fontSize: 11,
                      padding: '1px 6px',
                      borderRadius: 10,
                      background: active ? 'var(--surface-3, #eff3f9)' : 'var(--surface-2, #f8fafc)',
                      color: active ? 'var(--navy, #003768)' : 'var(--muted, #64748b)',
                      fontWeight: 650,
                    }}
                  >
                    {t.count}
                  </span>
                )}
                {t.alert && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#ef4444',
                      display: 'inline-block',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Report Body */}
      {loading ? (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid var(--line, #e2e8f0)',
            borderRadius: 12,
            padding: 64,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          <Spinner />
          <span style={{ fontSize: 13, color: 'var(--muted, #64748b)' }}>
            Aggregating residential sales metrics...
          </span>
        </div>
      ) : !data ? null : (
        <div ref={ref}>
          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {activeTab === 'overview' && renderOverviewTab()}

          {/* TAB 2: PIPELINE & CONVERSION & LEADS */}
          {activeTab === 'pipeline' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {renderPipelineSection()}
              {renderConversionSection()}
              {renderLeadAttributionSection()}
            </div>
          )}

          {/* TAB 3: SETTLEMENTS & OVERDUE */}
          {activeTab === 'settlements' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {renderSettlementSection()}
              {renderOverdueSection()}
            </div>
          )}

          {/* TAB 4: FEES & MARGINS */}
          {activeTab === 'financials' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {renderFeesSection()}
              {renderExpensesSection()}
            </div>
          )}

          {/* TAB 5: TEAM & SLA */}
          {activeTab === 'team' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {renderSlaSection()}
            </div>
          )}

          {/* TAB 6: ALL REPORTS (Complete Sequential Dossier) */}
          {activeTab === 'all' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {renderPipelineSection()}
              {renderConversionSection()}
              {renderSettlementSection()}
              {renderOverdueSection()}
              {renderFeesSection()}
              {renderSlaSection()}
              {renderExpensesSection()}
              {renderLeadAttributionSection()}
            </div>
          )}
        </div>
      )}

      {/* Embedded micro styles for seamless UX */}
      <style>{`
        .sr-card:hover {
          border-color: #cbd5e1 !important;
        }
        .sr-table-row:hover {
          background: var(--surface-2, #f8fafc) !important;
        }
        @keyframes sr-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .sr-spin {
          animation: sr-spin 0.8s linear infinite;
        }
        @media print {
          .sr-card {
            box-shadow: none !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}

