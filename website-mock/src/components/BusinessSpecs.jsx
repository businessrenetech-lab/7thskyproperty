import React from 'react';
import { Briefcase, Factory, TrendingUp, Users, CalendarClock } from 'lucide-react';

/** Business summary shown instead of beds/baths/sqft for confidential business listings. */
export default function BusinessSpecs({ business, compact = false }) {
  if (!business) return null;
  const items = [
    [Briefcase, business.business_type_label],
    [Factory, business.industry],
    [TrendingUp, business.turnover_band ? `Turnover ${business.turnover_band}` : null],
    [Users, business.staff_count != null ? `${business.staff_count} staff` : null],
    [CalendarClock, business.years_established != null ? `${business.years_established} yrs` : null],
  ].filter(([, text]) => text);
  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400 font-semibold border-t border-slate-100 pt-2">
        {items.slice(0, 3).map(([, text]) => <span key={text} className="truncate">{text}</span>)}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold text-[#012a4e]">
      {items.map(([Icon, text]) => (
        <div key={text} className="flex items-center gap-1.5"><Icon className="w-4 h-4 text-slate-400" /><span>{text}</span></div>
      ))}
      <div className="text-slate-400 font-normal ml-auto">Confidential listing — full details after NDA</div>
    </div>
  );
}
