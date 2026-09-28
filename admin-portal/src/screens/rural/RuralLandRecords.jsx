import React, { useCallback, useEffect, useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { usePmScope } from '../../config/pmScope';
import { useToast } from '../../context/ToastContext';
import { PageHead, Button, Input, Spinner } from '../../ui/kit';

/**
 * Rural land records — the rural rental book as a land register.
 *
 * A rural property is found by mouza, khatiyan or dag, not by a street address,
 * so those are the filters. They query the server (migration 0156 indexed upazila
 * and mouza); this is not a client-side filter over one page of results.
 */
const COLUMNS = [
  ['property_code', 'Code'], ['title', 'Title'], ['district', 'District'], ['upazila', 'Upazila'],
  ['union_name', 'Union'], ['village', 'Village'], ['mouza', 'Mouza'], ['khatiyan', 'Khatiyan'],
  ['dag', 'Dag'], ['land_area_decimal', 'Area (dec.)'], ['property_type', 'Type'], ['current_use', 'Current use'],
];

export default function RuralLandRecords() {
  const scope = usePmScope();
  const toast = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  const [filters, setFilters] = useState({ district: '', upazila: '', mouza: '', dag: '' });

  const load = useCallback(async () => {
    setRows(null);
    try {
      const params = new URLSearchParams({
        category: scope.category,
        listing_type: scope.listingType || 'rent',
        limit: '200',
      });
      for (const [k, v] of Object.entries(filters)) if (v.trim()) params.set(k, v.trim());
      const { data } = await api.get(`/properties?${params}`);
      setRows(data.data || []);
    } catch {
      setRows([]);
      toast.error('Could not load the land records');
    }
  }, [scope.category, scope.listingType, filters, toast]);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  return (
    <div>
      <PageHead
        title="Rural · Land Records"
        desc="The rural rental book by land record — district, upazila, union, village, mouza, khatiyan and dag."
      />

      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-head between">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Input placeholder="District" value={filters.district} onChange={set('district')} style={{ width: 150 }} />
            <Input placeholder="Upazila" value={filters.upazila} onChange={set('upazila')} style={{ width: 150 }} />
            <Input placeholder="Mouza" value={filters.mouza} onChange={set('mouza')} style={{ width: 150 }} />
            <Input placeholder="Dag" value={filters.dag} onChange={set('dag')} style={{ width: 130 }} />
            <Button variant="ghost" icon={Search} onClick={load}>Search</Button>
          </div>
          <Button icon={Plus} onClick={() => navigate(`${scope.basePath}/rentals/new`)}>New rural property</Button>
        </div>
        <div className="card-pad">
          {rows === null ? <Spinner /> : (
            <table className="data-table" style={{ width: '100%' }}>
              <thead><tr>{COLUMNS.map(([, label]) => <th key={label}>{label}</th>)}</tr></thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={COLUMNS.length} className="cell-sub">No rural rental property matches.</td></tr>
                )}
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`${scope.basePath}/rentals?property=${r.id}`)}
                  >
                    {COLUMNS.map(([key]) => (
                      <td key={key} className={key === 'property_code' || key === 'title' ? 'cell-strong' : 'cell-sub'}>
                        {r[key] || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
