import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { websiteApi } from '../services/api';

const money = (n) => (n == null || n === '' ? '—' : `৳${Number(n).toLocaleString()}`);
const ROWS = [
  ['Business type', 'business_type_label'], ['Industry', 'industry'], ['Ownership', 'ownership_structure'],
  ['Year established', 'year_established'], ['Staff', 'staff_count'], ['Annual turnover', 'annual_turnover', money],
  ['Annual profit', 'annual_profit', money], ['Monthly revenue', 'monthly_revenue', money], ['Premises', 'lease_status'],
  ['Lease details', 'lease_details'], ['Reason for sale', 'reason_for_sale'], ['Included assets', 'included_assets'],
  ['Stock', 'stock_info'], ['Employees', 'employee_info'], ['Intellectual property', 'ip_details'],
  ['Trade licence', 'trade_licence_no'], ['Company registration', 'company_registration_no'], ['TIN / BIN', 'tin_bin'],
];

/** Full business details for a buyer holding a released NDA token (tokenised, time-limited). */
export default function BusinessDetailsPage() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  useEffect(() => {
    websiteApi.getBusinessDetails(token)
      .then((r) => setState({ loading: false, data: r.data, error: '' }))
      .catch((e) => setState({ loading: false, data: null, error: e.message || 'This link is invalid or has expired.' }));
  }, [token]);
  if (state.loading) return <div className="max-w-3xl mx-auto p-10 text-center text-slate-500">Loading…</div>;
  if (!state.data) return (
    <div className="max-w-xl mx-auto p-10 text-center">
      <h1 className="text-xl font-bold text-[#012a4e]">Link unavailable</h1>
      <p className="text-slate-500 mt-2">{state.error}</p>
      <Link to="/contact" className="inline-block mt-4 text-[#00AEEF] font-bold">Contact Seventh Sky</Link>
    </div>
  );
  const d = state.data; const b = d.business || {};
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="text-xs font-bold text-[#00AEEF] uppercase tracking-wider">Confidential — shared under your signed NDA</div>
      <h1 className="text-3xl font-extrabold text-[#012a4e] mt-1">{d.title}</h1>
      <p className="text-slate-500 mt-1">{[d.address, d.area, d.city].filter(Boolean).join(', ')} · Asking {money(d.price)}</p>
      {(d.media || []).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
          {d.media.map((m) => <img key={m.id || m.file_url} src={m.file_url} alt="" className="w-full h-40 object-cover rounded-xl" />)}
        </div>
      )}
      {d.description && <p className="mt-6 text-slate-700 whitespace-pre-line">{d.description}</p>}
      <table className="w-full mt-6 text-sm border border-slate-200 rounded-xl overflow-hidden">
        <tbody>
          {ROWS.filter(([, k]) => b[k] != null && b[k] !== '').map(([label, k, fmt]) => (
            <tr key={k} className="border-b border-slate-100"><td className="p-3 bg-slate-50 font-semibold w-1/3">{label}</td><td className="p-3">{fmt ? fmt(b[k]) : String(b[k])}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
