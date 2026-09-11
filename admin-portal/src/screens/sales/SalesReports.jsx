// admin-portal/src/screens/sales/SalesReports.jsx
//
// Sales reports & analytics — read-only over /api/sales/reports. Pipeline,
// conversion, settlement forecast, overdue receivables, expected-vs-actual
// fees, response-SLA + workload, and expenses/margin. Download as PDF via the
// bundled html2pdf.js (same pattern as AdminReportsHub).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { PageHead, Spinner, Button } from '../../ui/kit';

const bdt = (v) => '৳' + Number(v || 0).toLocaleString('en-BD');
const cell = { padding: '6px 10px', borderBottom: '1px solid var(--line)', fontSize: 13 };
const th = { ...cell, textAlign: 'left', color: 'var(--muted)', fontWeight: 700, fontSize: 11.5, textTransform: 'uppercase' };
const iso = (d) => d.toISOString().slice(0, 10);

function Card({ title, children }) {
  return (
    <div className="pm-card" style={{ marginBottom: 14 }}>
      <div className="pm-card-body" style={{ padding: 16 }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 15, color: 'var(--navy)' }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}
function Tile({ label, value }) {
  return (
    <div style={{ flex: '1 1 140px', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{label}</div>
      <strong style={{ fontSize: 16 }}>{value}</strong>
    </div>
  );
}
const Table = ({ cols, rows }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>{cols.map((c) => <th key={c.k} style={{ ...th, textAlign: c.right ? 'right' : 'left' }}>{c.h}</th>)}</tr></thead>
      <tbody>
        {rows.length === 0 ? <tr><td style={cell} colSpan={cols.length}><span style={{ color: 'var(--muted)' }}>No data in range.</span></td></tr>
          : rows.map((r, i) => <tr key={i}>{cols.map((c) => <td key={c.k} style={{ ...cell, textAlign: c.right ? 'right' : 'left' }}>{c.render ? c.render(r) : r[c.k]}</td>)}</tr>)}
      </tbody>
    </table>
  </div>
);

export default function SalesReports() {
  const toast = useToast();
  const ref = useRef(null);
  const [from, setFrom] = useState(iso(new Date(Date.now() - 90 * 86400000)));
  const [to, setTo] = useState(iso(new Date()));
  const [category, setCategory] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ from, to }); if (category) q.set('category', category);
      const r = await api.get(`/sales/reports?${q}`);
      setData(r.data);
    } catch { toast.error('Failed to load reports'); } finally { setLoading(false); }
  }, [from, to, category, toast]);
  useEffect(() => { load(); }, [load]);

  const downloadPdf = async () => {
    if (!ref.current) return;
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().set({
        margin: [8, 8, 8, 8], filename: `Sales-Report-${from}-to-${to}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(ref.current).save();
    } catch { toast.error('PDF generation failed'); }
  };

  return (
    <>
      <PageHead title="Sales Reports" desc="Pipeline, conversion, forecast, receivables, fees, SLA and margin." actions={
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '7px 10px', font: 'inherit' }} />
          <span style={{ color: 'var(--muted)' }}>→</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '7px 10px', font: 'inherit' }} />
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '7px 10px', font: 'inherit' }}>
            <option value="">All categories</option>{['residential', 'commercial', 'rural', 'business'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <Button variant="ghost" icon={RefreshCw} onClick={load}>Refresh</Button>
          <Button icon={Download} onClick={downloadPdf}>PDF</Button>
        </div>
      } />

      {loading ? <div className="pm-card card-pad" style={{ padding: 48, textAlign: 'center' }}><Spinner /></div> : !data ? null : (
        <div ref={ref} style={{ background: 'var(--bg, #f6f8fb)' }}>
          <Card title="Pipeline">
            <Table cols={[
              { k: 'status', h: 'Stage' }, { k: 'count', h: 'Deals', right: true },
              { k: 'avg_age_days', h: 'Avg age (d)', right: true }, { k: 'avg_days_in_stage', h: 'Avg in-stage (d)', right: true },
            ]} rows={data.pipeline} />
          </Card>

          <Card title="Conversion (deals created in range)">
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Tile label="Created" value={data.conversion.created} />
              <Tile label="Reached agreed" value={`${data.conversion.reached_agreed} (${data.conversion.agreed_rate}%)`} />
              <Tile label="Completed" value={`${data.conversion.completed} (${data.conversion.completed_rate}%)`} />
            </div>
          </Card>

          <Card title="Settlement forecast">
            <Table cols={[
              { k: 'month', h: 'Month' }, { k: 'count', h: 'Settlements', right: true },
              { k: 'expected_value', h: 'Expected value', right: true, render: (r) => bdt(r.expected_value) },
            ]} rows={data.settlement_forecast} />
          </Card>

          <Card title="Overdue receivables">
            <Table cols={[
              { k: 'property', h: 'Property' }, { k: 'settlement_date', h: 'Due' },
              { k: 'status', h: 'Payment' }, { k: 'expected', h: 'Expected', right: true, render: (r) => bdt(r.expected) },
            ]} rows={data.overdue_receivables} />
          </Card>

          <Card title="Fees — expected vs actual">
            <Table cols={[
              { k: 'property', h: 'Property' },
              { k: 'expected', h: 'Expected', right: true, render: (r) => bdt(r.expected) },
              { k: 'invoiced', h: 'Invoiced', right: true, render: (r) => bdt(r.invoiced) },
              { k: 'collected', h: 'Collected', right: true, render: (r) => bdt(r.collected) },
              { k: 'variance', h: 'Variance', right: true, render: (r) => bdt(r.variance) },
            ]} rows={data.fees.rows} />
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
              <Tile label="Expected" value={bdt(data.fees.totals.expected)} />
              <Tile label="Invoiced" value={bdt(data.fees.totals.invoiced)} />
              <Tile label="Collected" value={bdt(data.fees.totals.collected)} />
              <Tile label="Variance" value={bdt(data.fees.totals.variance)} />
            </div>
          </Card>

          <Card title="Response SLA & workload">
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <Tile label="Enquiries" value={data.sla.enquiries} />
              <Tile label="Responded" value={data.sla.responded} />
              <Tile label="Within SLA" value={`${data.sla.within_sla_pct}%`} />
              <Tile label="Avg first response" value={`${data.sla.avg_first_response_hours} h`} />
            </div>
            <Table cols={[
              { k: 'name', h: 'Assignee' }, { k: 'open_deals', h: 'Open deals', right: true }, { k: 'open_enquiries', h: 'Open enquiries', right: true },
            ]} rows={data.workload} />
          </Card>

          <Card title="Expenses & margin">
            <Table cols={[
              { k: 'property', h: 'Property' },
              { k: 'total', h: 'Expenses', right: true, render: (r) => bdt(r.total) },
              { k: 'collected', h: 'Collected', right: true, render: (r) => bdt(r.collected) },
              { k: 'margin', h: 'Margin', right: true, render: (r) => bdt(r.margin) },
            ]} rows={data.expenses.rows} />
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
              <Tile label="Expenses" value={bdt(data.expenses.totals.expenses)} />
              <Tile label="Collected" value={bdt(data.expenses.totals.collected)} />
              <Tile label="Margin" value={bdt(data.expenses.totals.margin)} />
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
