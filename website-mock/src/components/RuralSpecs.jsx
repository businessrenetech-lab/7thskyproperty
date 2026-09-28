import React from 'react';
import { MapPin, Ruler, Sprout, Landmark } from 'lucide-react';

/**
 * Land record shown instead of beds/baths/sqft for rural listings.
 *
 * A rural parcel is described by where it is and what it is, not by rooms: mouza
 * and upazila place it, land area sizes it, current use says what it grows or
 * holds. Mirrors BusinessSpecs, which does the same job for business listings.
 *
 * Khatiyan and dag are deliberately NOT here: the public API withholds them,
 * because they identify the parcel in the public land records and would let
 * anyone look up the registered owner. They reach a buyer after an enquiry.
 */
export default function RuralSpecs({ property, compact = false }) {
  if (!property) return null;

  const place = [property.mouza, property.upazila].filter(Boolean).join(', ');
  const area = property.land_area_decimal
    ? `${Number(property.land_area_decimal).toLocaleString()} decimal`
    : null;

  const items = [
    [MapPin, place || property.district || null],
    [Ruler, area],
    [Sprout, property.current_use],
    [Landmark, property.property_type],
  ].filter(([, text]) => text);

  if (!items.length) return null;

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
        <div key={text} className="flex items-center gap-1.5">
          <Icon className="w-4 h-4 text-slate-400" />
          <span>{text}</span>
        </div>
      ))}
    </div>
  );
}
