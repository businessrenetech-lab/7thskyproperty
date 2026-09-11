// admin-portal/src/screens/sales/SavedViews.jsx
//
// Per-user saved filter presets for a list screen. `scope` is the saved-view
// key (e.g. 'deals', 'work-queue'); `current` is the screen's live filter set;
// `onApply(params)` receives a stored params object to re-apply.
import React, { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button, Select } from '../../ui/kit';

export default function SavedViews({ scope, current, onApply }) {
  const toast = useToast();
  const [views, setViews] = useState([]);
  const load = useCallback(async () => {
    try { const { data } = await api.get(`/saved-views?scope=${scope}`); setViews(data.data || []); } catch { /* non-fatal */ }
  }, [scope]);
  useEffect(() => { load(); }, [load]);

  // params should be an object, but guard against a JSON string coming back from
  // some MySQL/Sequelize combos — a string would make p.<key> resolve to a
  // String method (e.g. p.search === String.prototype.search) and break callers.
  const asObj = (p) => { if (p && typeof p === 'object') return p; try { return JSON.parse(p || '{}'); } catch { return {}; } };
  const apply = (id) => { const v = views.find((x) => String(x.id) === String(id)); if (v) onApply(asObj(v.params)); };
  const saveCurrent = async () => {
    const name = window.prompt('Name this view');
    if (!name || !name.trim()) return;
    try { await api.post('/saved-views', { scope, name: name.trim(), params: current }); toast.success('View saved'); load(); }
    catch { toast.error('Could not save view'); }
  };
  const del = async () => {
    if (!views.length) return;
    const name = window.prompt(`Delete which view? Type its exact name:\n${views.map((v) => v.name).join(', ')}`);
    const v = views.find((x) => x.name === name);
    if (!v) return;
    try { await api.delete(`/saved-views/${v.id}`); toast.success('View deleted'); load(); } catch { toast.error('Delete failed'); }
  };

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <Select value="" onChange={(e) => apply(e.target.value)}>
        <option value="">Saved views…</option>
        {views.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
      </Select>
      <Button size="sm" variant="ghost" onClick={saveCurrent}>Save view</Button>
      {views.length > 0 && <Button size="sm" variant="ghost" onClick={del}>Delete</Button>}
    </div>
  );
}
