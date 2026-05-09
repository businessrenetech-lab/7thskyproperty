import React, { useEffect, useRef, useState } from 'react';
import { PieChart, TrendingUp, TrendingDown, Building2, ClipboardList, Users, Scale, FileText, Calendar, Download, SearchX, Clock, Loader2, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import '../styles/GlobalStyles.css';
import html2pdf from 'html2pdf.js';
import { buildPdfHeaderHtml, buildReportTableHtml, getInstitutionInfo } from '../utils/pdfUtils';
import { useToast } from '../context/ToastContext';

const money = (v) => `BDT ${Number(v || 0).toLocaleString()}`;
const date = (v) => (v ? new Date(v).toLocaleDateString() : '-');

const tabs = [
  ['income', 'Income', <TrendingUp size={16} />],
  ['expenses', 'Expenses', <TrendingDown size={16} />],
  ['bank', 'Bank', <Building2 size={16} />],
  ['receivables', 'Receivables', <ClipboardList size={16} />],
  ['referrals', 'Referrals', <Users size={16} />],
  ['trial', 'Trial Balance', <Scale size={16} />]
];

const cols = {
  income: ['date', 'source_label', 'description', 'amount'],
  expenses: ['date', 'category', 'description', 'amount'],
  bank: ['date', 'account_name', 'entry_type', 'description', 'amount'],
  receivables: ['invoice_number', 'student_name', 'due_date', 'due'],
  referrals: ['enrollment_date', 'student_name', 'course_name', 'batch_name', 'referred_by', 'amount'],
  trial: ['account_code', 'account_name', 'type', 'debit', 'credit', 'balance']
};

const formatDateLocal = (dateObj) => {
  const d = new Date(dateObj);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

const getTodayLocal = () => formatDateLocal(new Date());

const rangeFor = (preset, from, to) => {
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

const pickRows = (r, tab) => ({
  income: r?.income?.rows,
  expenses: r?.expenses?.rows,
  bank: r?.bank_statement?.rows,
  receivables: r?.receivables?.rows,
  referrals: r?.referrals?.rows,
  trial: r?.trial_balance?.rows
}[tab] || []);

const cell = (key, row) => {
  if (['amount', 'due', 'debit', 'credit', 'balance'].includes(key)) return money(row[key]);
  if (['date', 'due_date', 'start_date', 'expiry_date', 'enrollment_date'].includes(key)) return date(row[key]);
  return row[key] || '-';
};

const sumKeys = ['amount', 'due', 'debit', 'credit', 'balance'];

const Table = ({ tab, rows }) => {
  const columns = cols[tab];
  const totals = {};
  columns.forEach((key) => {
    if (sumKeys.includes(key)) {
      totals[key] = rows.reduce((sum, row) => sum + Number(row[key] || 0), 0);
    }
  });
  const hasTotals = rows.length > 0 && Object.keys(totals).length > 0;

  return (
    <div className="table-container" style={{ overflowX: 'auto', marginTop: '1rem' }}>
      <table style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((key) => (
              <th key={key} style={{
                padding: '1rem',
                textAlign: 'left',
                color: '#64748b',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '2px solid #e2e8f0',
                background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)'
              }}>
                {key.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, i) => (
            <tr key={row.id || row.invoice_number || row.account_code || i} style={{
              borderBottom: '1px solid #f1f5f9',
              transition: 'background-color 0.2s ease'
            }}>
              {columns.map((key) => (
                <td key={key} style={{
                  padding: '1rem',
                  color: '#334155',
                  borderBottom: '1px solid #f1f5f9',
                  fontSize: '0.875rem'
                }}>
                  {cell(key, row)}
                </td>
              ))}
            </tr>
          )) : (
            <tr>
              <td colSpan={columns.length} style={{ padding: '4rem', color: '#94a3b8', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: '#cbd5e1' }}>
                  <SearchX size={48} strokeWidth={1.5} />
                </div>
                <div style={{ fontWeight: 500, fontSize: '1.1rem', color: '#64748b' }}>No data available for this period</div>
              </td>
            </tr>
          )}
        </tbody>
        {hasTotals && (
          <tfoot>
            <tr style={{ borderTop: '2px solid #32619A' }}>
              {columns.map((key, i) => (
                <td key={key} style={{
                  padding: '1rem',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: '#0f172a',
                  background: 'linear-gradient(180deg, #f0f7ff 0%, #e8f0fe 100%)'
                }}>
                  {i === 0 ? `Total (${rows.length} records)` : sumKeys.includes(key) ? money(totals[key]) : ''}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};

export default function AdminReportsHub() {
  const toast = useToast();
  const [preset, setPreset] = useState('monthly');
  const [from, setFrom] = useState(() => rangeFor('monthly').from);
  const [to, setTo] = useState(() => rangeFor('monthly').to);
  const [tab, setTab] = useState('income');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const printContentRef = useRef(null);
  const printHeaderRef = useRef(null);

  const handlePreset = (p) => {
    setPreset(p);
    if (p !== 'custom') {
      const r = rangeFor(p);
      setFrom(r.from);
      setTo(r.to);
    }
  };

  useEffect(() => {
    if (!from || !to) return;
    if (from > to) {
      setReport(null);
      setLoading(false);
      setError('Start date cannot be after end date.');
      return;
    }
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        console.log('Fetching report with date range:', { from, to });
        const res = await api.get('/finance/report-suite', { params: { from, to } });
        console.log('Report data summary:', {
          total_income: res.data.summary?.total_income,
          total_expense: res.data.summary?.total_expense,
          income_rows: res.data.income?.rows?.length,
          expense_rows: res.data.expenses?.rows?.length
        });
        setReport(res.data);
      } catch (e) {
        console.error(e);
        setError('Unable to load finance reports. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [from, to]);

  const exportPdf = async () => {
    const rows = pickRows(report, tab);
    if (!rows || rows.length === 0) {
      toast.error('No data to export');
      return;
    }

    const info = getInstitutionInfo();
    const currentTab = tabs.find(t => t[0] === tab);
    const reportName = currentTab ? currentTab[1] : 'Finance Report';
    const periodText = `Period: ${from} to ${to}`;

    // Build branded header
    const headerHtml = await buildPdfHeaderHtml(reportName, periodText);

    // Build branded report table
    const columns = cols[tab];
    const tableHtml = buildReportTableHtml(columns, rows, (key, val) => cell(key, { [key]: val }));

    // Compose full PDF HTML
    const html = `
      <div style="font-family:'Inter','Segoe UI',Tahoma,Geneva,Verdana,sans-serif; background:#ffffff; color:#1e293b; padding:0;">
        ${headerHtml}
        <div style="padding:18px 24px 24px;">
          ${tableHtml}

          <!-- Footer -->
          <div style="margin-top:28px; padding-top:10px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:9px; color:#94a3b8;">Generated on ${new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</div>
            <div style="font-size:9px; color:#94a3b8;">${info.name} Finance System · ${info.website}</div>
          </div>
        </div>
        <!-- Bottom Accent Bar -->
        <div style="height:4px; background:linear-gradient(90deg, #7bc62e, #275fa7); border-radius:0 0 3px 3px;"></div>
      </div>
    `;

    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.background = 'white';

    const opt = {
      margin: [8, 8, 8, 8],
      filename: `${reportName.replace(/\s+/g, '-')}-Report-${from}-to-${to}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: rows.length > 0 && columns.length > 5 ? 'landscape' : 'portrait' }
    };

    html2pdf()
      .set(opt)
      .from(container)
      .toPdf()
      .get('pdf')
      .then((pdf) => {
        pdf.setProperties({
          title: `Finance Report - ${reportName}`,
          subject: `Financial Report from ${from} to ${to}`,
          author: info.name,
          creator: `${info.name} Finance System`
        });
      })
      .save()
      .catch((error) => {
        console.error('PDF generation error:', error);
        toast.error('Failed to generate PDF. Please try again.');
      });
  };

  const s = report?.summary || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Filters Card */}
      <div style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '1.25rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Date Presets and Range */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
            {['daily', 'weekly', 'monthly', 'custom'].map((p) => (
              <button
                key={p}
                onClick={() => handlePreset(p)}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '999px',
                  border: `2px solid ${preset === p ? '#32619A' : '#cbd5e1'}`,
                  background: preset === p ? 'linear-gradient(135deg, #32619A 0%, #2a5282 100%)' : '#ffffff',
                  color: preset === p ? '#fff' : '#475569',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
            <span style={{ color: '#64748b', marginLeft: '0.5rem', display: 'flex', alignItems: 'center' }}>
              <Calendar size={16} />
            </span>
            <input
              type='date'
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              disabled={preset !== 'custom'}
              style={{
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: preset === 'custom' ? '#fff' : '#f1f5f9',
                color: preset === 'custom' ? '#334155' : '#94a3b8',
                fontSize: '0.875rem',
                cursor: preset === 'custom' ? 'pointer' : 'not-allowed'
              }}
            />
            <span style={{ color: '#cbd5e1' }}>→</span>
            <input
              type='date'
              value={to}
              onChange={(e) => setTo(e.target.value)}
              disabled={preset !== 'custom'}
              style={{
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: preset === 'custom' ? '#fff' : '#f1f5f9',
                color: preset === 'custom' ? '#334155' : '#94a3b8',
                fontSize: '0.875rem',
                cursor: preset === 'custom' ? 'pointer' : 'not-allowed'
              }}
            />
          </div>

          {/* Export Button */}
          <button
            onClick={exportPdf}
            disabled={loading || !!error}
            style={{
              background: loading || error
                ? '#94a3b8'
                : 'linear-gradient(135deg, #32619A 0%, #2a5282 100%)',
              color: '#fff',
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: loading || error ? 'not-allowed' : 'pointer',
              boxShadow: loading || error
                ? 'none'
                : '0 4px 15px rgba(50, 97, 154, 0.3)',
              transition: 'all 0.2s ease',
              opacity: loading || error ? 0.6 : 1,
              whiteSpace: 'nowrap'
            }}
          >
            <Download size={16} /> {loading ? 'Loading...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="kpi-scroll-strip" style={{ display: 'flex', gap: '0.5rem', padding: '0.25rem' }}>
        {tabs.map(([key, label, icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '999px',
              border: 'none',
              background: tab === key
                ? 'linear-gradient(135deg, #32619A 0%, #2a5282 100%)'
                : 'transparent',
              color: tab === key ? '#fff' : '#64748b',
              fontWeight: tab === key ? 700 : 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: tab === key ? '0 4px 12px rgba(50, 97, 154, 0.25)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Printable Content Container (only this goes to PDF) */}
      <div ref={printContentRef} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading ? (
          <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '4rem',
            textAlign: 'center',
            color: '#64748b'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: '#94a3b8' }}>
              <Loader2 size={48} strokeWidth={1.5} className="animate-spin" />
            </div>
            <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>Loading finance report data...</div>
          </div>
        ) : null}

        {!loading && error ? (
          <div style={{
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            border: '1px solid #fecaca',
            borderRadius: '16px',
            padding: '3rem',
            textAlign: 'center',
            color: '#dc2626'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: '#ef4444' }}>
              <AlertTriangle size={48} strokeWidth={1.5} />
            </div>
            <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Unable to Load Report</div>
            <div style={{ color: '#7f1d1d' }}>{error}</div>
          </div>
        ) : null}

        {!loading && !error && (
          <>
            {tab === 'overview' ? (
              <div style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '2rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                textAlign: 'center',
                minHeight: '300px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', color: '#cbd5e1' }}>
                  <PieChart size={64} strokeWidth={1.5} />
                </div>
                <h3 style={{ margin: '0 0 0.75rem 0', color: '#0f172a', fontSize: '1.5rem', fontWeight: 700 }}>
                  Overview
                </h3>
                <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: 1.6, maxWidth: '600px' }}>
                  Select a report type from the tabs above to view detailed financial data.
                  Available reports include Income, Expenses, Bank Statement, Receivables, and Trial Balance.
                </p>
              </div>
            ) : (
              <div style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
              }}>
                <Table tab={tab} rows={pickRows(report, tab)} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
