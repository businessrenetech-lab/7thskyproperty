import React, { useState, useEffect, useCallback } from 'react';
import {
  Fingerprint, Cpu, Users, Activity, RefreshCw, Plus, Trash2, Edit3, Save,
  Wifi, WifiOff, Clock, AlertTriangle, CheckCircle2, XCircle, Loader2,
  Server, Link2, Hash, ArrowDownCircle, ArrowUpCircle, ScanLine, Shield
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import '../styles/GlobalStyles.css';

/* ═══════════════════════════════════════════════════════════════
   TAB CONSTANTS
   ═══════════════════════════════════════════════════════════════ */
const TABS = [
  { key: 'overview',  label: 'Overview',   icon: <Activity size={15} /> },
  { key: 'devices',   label: 'Devices',    icon: <Server size={15} /> },
  { key: 'mappings',  label: 'Mappings',   icon: <Link2 size={15} /> },
  { key: 'logs',      label: 'Sync Logs',  icon: <ScanLine size={15} /> },
];

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
const BiometricManagement = () => {
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(false);

  /* ─── Overview State ─── */
  const [dashboard, setDashboard] = useState(null);

  /* ─── Devices State ─── */
  const [devices, setDevices] = useState([]);
  const [deviceForm, setDeviceForm] = useState({ serial_number: '', name: '', ip_address: '', port: '4370', location: '' });
  const [editingDevice, setEditingDevice] = useState(null);
  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [syncing, setSyncing] = useState({});

  /* ─── Mappings State ─── */
  const [mappings, setMappings] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [mapForm, setMapForm] = useState({ user_id: '', device_pin: '', device_serial: '' });
  const [showMapForm, setShowMapForm] = useState(false);

  /* ─── Logs State ─── */
  const [logs, setLogs] = useState([]);
  const [logPage, setLogPage] = useState(1);
  const [logTotal, setLogTotal] = useState(0);

  /* ═══════════ DATA FETCHING ═══════════ */
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/biometric/dashboard');
      setDashboard(res.data);
    } catch (err) { console.error('Dashboard fetch failed:', err); }
    finally { setLoading(false); }
  }, []);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/biometric/devices');
      setDevices(Array.isArray(res.data) ? res.data : res.data.devices || []);
    } catch (err) { console.error('Devices fetch failed:', err); }
    finally { setLoading(false); }
  }, []);

  const fetchMappings = useCallback(async () => {
    setLoading(true);
    try {
      const [mapRes, staffRes] = await Promise.all([
        api.get('/biometric/mappings'),
        api.get('/auth/staff'),
      ]);
      setMappings(Array.isArray(mapRes.data) ? mapRes.data : mapRes.data.mappings || []);
      const staffData = staffRes.data;
      setStaffList(Array.isArray(staffData) ? staffData : staffData.staff || []);
    } catch (err) { console.error('Mappings fetch failed:', err); }
    finally { setLoading(false); }
  }, []);

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/biometric/logs?page=${page}&limit=25`);
      const data = res.data;
      setLogs(Array.isArray(data) ? data : data.logs || []);
      setLogTotal(data.total || (Array.isArray(data) ? data.length : 0));
      setLogPage(page);
    } catch (err) { console.error('Logs fetch failed:', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'overview') fetchDashboard();
    if (tab === 'devices') fetchDevices();
    if (tab === 'mappings') fetchMappings();
    if (tab === 'logs') fetchLogs(1);
  }, [tab]);

  /* ═══════════ DEVICE CRUD ═══════════ */
  const saveDevice = async () => {
    try {
      const payload = { ...deviceForm, port: parseInt(deviceForm.port) || 4370 };
      if (editingDevice) {
        await api.patch(`/biometric/devices/${editingDevice}`, payload);
        toast.success('Device updated');
      } else {
        await api.post('/biometric/devices', payload);
        toast.success('Device registered');
      }
      setShowDeviceForm(false);
      setEditingDevice(null);
      setDeviceForm({ serial_number: '', name: '', ip_address: '', port: '4370', location: '' });
      fetchDevices();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save device');
    }
  };

  const deleteDevice = async (id) => {
    if (!window.confirm('Remove this device? Existing logs will be preserved.')) return;
    try {
      await api.delete(`/biometric/devices/${id}`);
      toast.success('Device removed');
      fetchDevices();
    } catch (err) { toast.error('Failed to remove device'); }
  };

  const syncDevice = async (id) => {
    setSyncing(prev => ({ ...prev, [id]: true }));
    try {
      const res = await api.post(`/biometric/devices/${id}/sync`);
      toast.success(`Synced ${res.data?.count ?? 0} records`);
      fetchDevices();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Sync failed — check device network');
    } finally {
      setSyncing(prev => ({ ...prev, [id]: false }));
    }
  };

  const editDevice = (dev) => {
    setEditingDevice(dev.id);
    setDeviceForm({
      serial_number: dev.serial_number || '',
      name: dev.name || '',
      ip_address: dev.ip_address || '',
      port: String(dev.port || 4370),
      location: dev.location || '',
    });
    setShowDeviceForm(true);
  };

  /* ═══════════ MAPPING CRUD ═══════════ */
  const saveMapping = async () => {
    try {
      await api.post('/biometric/mappings', {
        user_id: parseInt(mapForm.user_id),
        pin: mapForm.device_pin.toString(),
        device_serial: mapForm.device_serial,
      });
      toast.success('Employee mapped to device PIN');
      setShowMapForm(false);
      setMapForm({ user_id: '', device_pin: '', device_serial: '' });
      fetchMappings();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Mapping failed');
    }
  };

  const deleteMapping = async (id) => {
    if (!window.confirm('Remove this mapping?')) return;
    try {
      await api.delete(`/biometric/mappings/${id}`);
      toast.success('Mapping removed');
      fetchMappings();
    } catch (err) { toast.error('Failed to remove mapping'); }
  };

  /* ═══════════ LOG PROCESSING ═══════════ */
  const reprocessLogs = async () => {
    try {
      const res = await api.post('/biometric/logs/reprocess');
      toast.success(`Reprocessed ${res.data?.processed ?? 0} logs`);
      fetchLogs(logPage);
    } catch (err) { toast.error('Reprocessing failed'); }
  };

  /* ═══════════════════════════════════════════════════════════════
     RENDER HELPERS
     ═══════════════════════════════════════════════════════════════ */

  const getDeviceName = (serial) => {
    const dev = devices.find(d => d.serial_number === serial);
    return dev ? dev.name || dev.serial_number : serial || 'All Devices';
  };

  const StatusBadge = ({ status }) => {
    const map = {
      active: { cls: 'sb2 sb2-mint', icon: <CheckCircle2 size={11} /> },
      inactive: { cls: 'sb2 sb2-dim', icon: <XCircle size={11} /> },
      online: { cls: 'sb2 sb2-cyan', icon: <Wifi size={11} /> },
      offline: { cls: 'sb2 sb2-rose', icon: <WifiOff size={11} /> },
    };
    const cfg = map[status] || map.inactive;
    return <span className={cfg.cls}>{cfg.icon} {status}</span>;
  };

  /* ─── OVERVIEW TAB ─── */
  const renderOverview = () => {
    if (!dashboard) return <LoadingState />;
    const d = dashboard.devices || {};
    const l = dashboard.logs || {};
    return (
      <>
        <div className="pulse-grid pg-4" style={{ marginBottom: 24 }}>
          <div className="pulse-card c-cyan">
            <p className="pc-label">Total Devices</p>
            <p className="pc-value">{d.total || 0}</p>
            <div className="pc-meta"><Server size={13} /> {d.active || 0} active</div>
          </div>
          <div className="pulse-card c-mint">
            <p className="pc-label">Devices Online</p>
            <p className="pc-value">{d.online || 0}</p>
            <div className="pc-meta"><Wifi size={13} /> {d.offline || 0} offline</div>
          </div>
          <div className="pulse-card c-amber">
            <p className="pc-label">Punches Today</p>
            <p className="pc-value">{l.today || 0}</p>
            <div className="pc-meta"><ArrowDownCircle size={13} /> live feed</div>
          </div>
          <div className="pulse-card c-violet">
            <p className="pc-label">Employee Mappings</p>
            <p className="pc-value">{dashboard.mappings || 0}</p>
            <div className="pc-meta"><Users size={13} /> PIN bindings</div>
          </div>
        </div>

        {/* Quick-action cards */}
        <div className="g2 mb24">
          <div className="sc">
            <div className="sc-head">
              <span className="sc-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={15} style={{ color: '#FFB347' }} /> Pending Items
              </span>
            </div>
            <div className="sc-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="row-sb">
                  <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Unprocessed logs</span>
                  <span className="sb2 sb2-amber">{l.unprocessed || 0}</span>
                </div>
                <div className="row-sb">
                  <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Unmatched PINs</span>
                  <span className="sb2 sb2-rose">{l.unmatched || 0}</span>
                </div>
                <div className="row-sb">
                  <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Pending commands</span>
                  <span className="sb2 sb2-dim">{dashboard.pending_commands || 0}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="sc">
            <div className="sc-head">
              <span className="sc-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={15} style={{ color: '#00D4FF' }} /> Quick Actions
              </span>
            </div>
            <div className="sc-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn-stitch" onClick={() => setTab('devices')} style={{ width: '100%', justifyContent: 'center' }}>
                <Plus size={15} /> Register New Device
              </button>
              <button className="btn-ghost" onClick={() => setTab('mappings')} style={{ width: '100%', justifyContent: 'center' }}>
                <Link2 size={15} /> Map Employee PINs
              </button>
              <button className="btn-ghost" onClick={reprocessLogs} style={{ width: '100%', justifyContent: 'center' }}>
                <RefreshCw size={15} /> Reprocess Logs
              </button>
            </div>
          </div>
        </div>
      </>
    );
  };

  /* ─── DEVICES TAB ─── */
  const renderDevices = () => (
    <>
      <div className="row-sb mb16">
        <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{devices.length} device{devices.length !== 1 ? 's' : ''} registered</span>
        <button className="btn-stitch" onClick={() => { setEditingDevice(null); setDeviceForm({ serial_number: '', name: '', ip_address: '', port: '4370', location: '' }); setShowDeviceForm(true); }}>
          <Plus size={15} /> Add Device
        </button>
      </div>

      {/* Inline Device Form */}
      {showDeviceForm && (
        <div className="sc mb24" style={{ borderColor: 'rgba(0,212,255,0.3)' }}>
          <div className="sc-head">
            <span className="sc-title">{editingDevice ? 'Edit Device' : 'Register New Device'}</span>
            <button className="btn-ghost" onClick={() => { setShowDeviceForm(false); setEditingDevice(null); }} style={{ padding: '4px 10px', fontSize: 12 }}>
              <XCircle size={14} /> Cancel
            </button>
          </div>
          <div className="sc-body">
            <div className="fgrid2">
              <div className="fgroup">
                <span className="flabel">Serial Number</span>
                <input className="glass-input" placeholder="e.g. BFHX234500123" value={deviceForm.serial_number} onChange={e => setDeviceForm(f => ({ ...f, serial_number: e.target.value }))} />
              </div>
              <div className="fgroup">
                <span className="flabel">Device Name</span>
                <input className="glass-input" placeholder="e.g. F18 – Main Entrance" value={deviceForm.name} onChange={e => setDeviceForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="fgroup">
                <span className="flabel">IP Address</span>
                <input className="glass-input" placeholder="192.168.1.201" value={deviceForm.ip_address} onChange={e => setDeviceForm(f => ({ ...f, ip_address: e.target.value }))} />
              </div>
              <div className="fgroup">
                <span className="flabel">Port</span>
                <input className="glass-input" type="number" placeholder="4370" value={deviceForm.port} onChange={e => setDeviceForm(f => ({ ...f, port: e.target.value }))} />
              </div>
              <div className="fgroup">
                <span className="flabel">Location</span>
                <input className="glass-input" placeholder="Main Office, Floor 2" value={deviceForm.location} onChange={e => setDeviceForm(f => ({ ...f, location: e.target.value }))} />
              </div>
              <div className="fgroup" style={{ justifyContent: 'flex-end' }}>
                <button className="btn-stitch" onClick={saveDevice} style={{ height: 42 }}>
                  <Save size={15} /> {editingDevice ? 'Update' : 'Register'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Devices Table */}
      <div className="sc">
        <div className="st-wrap">
          <table className="stitch">
            <thead>
              <tr>
                <th>Device</th>
                <th>Serial</th>
                <th>IP / Port</th>
                <th>Location</th>
                <th>Status</th>
                <th>Last Heartbeat</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.map(dev => (
                <tr key={dev.id}>
                  <td className="td-name">{dev.name || dev.serial_number}</td>
                  <td className="td-mono">{dev.serial_number}</td>
                  <td className="td-mono">{dev.ip_address || '—'}:{dev.port || 4370}</td>
                  <td>{dev.location || '—'}</td>
                  <td><StatusBadge status={dev.status || 'inactive'} /></td>
                  <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                    {dev.last_heartbeat ? new Date(dev.last_heartbeat).toLocaleString() : 'Never'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <button className="btn-ghost" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => syncDevice(dev.id)} disabled={syncing[dev.id]}>
                        {syncing[dev.id] ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Sync
                      </button>
                      <button className="btn-ghost" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => editDevice(dev)}>
                        <Edit3 size={13} />
                      </button>
                      <button className="btn-ghost" style={{ padding: '5px 10px', fontSize: 12, color: 'var(--danger)' }} onClick={() => deleteDevice(dev.id)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {devices.length === 0 && !loading && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                    <Server size={28} style={{ opacity: 0.3, marginBottom: 8 }} /><br />
                    No devices registered yet. Click <strong>Add Device</strong> to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  /* ─── MAPPINGS TAB ─── */
  const renderMappings = () => (
    <>
      <div className="row-sb mb16">
        <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{mappings.length} active mapping{mappings.length !== 1 ? 's' : ''}</span>
        <button className="btn-stitch" onClick={() => setShowMapForm(true)}>
          <Plus size={15} /> New Mapping
        </button>
      </div>

      {showMapForm && (
        <div className="sc mb24" style={{ borderColor: 'rgba(0,255,148,0.3)' }}>
          <div className="sc-head">
            <span className="sc-title">Map Employee to Device PIN</span>
            <button className="btn-ghost" onClick={() => setShowMapForm(false)} style={{ padding: '4px 10px', fontSize: 12 }}>
              <XCircle size={14} /> Cancel
            </button>
          </div>
          <div className="sc-body">
            <div className="fgrid2">
              <div className="fgroup">
                <span className="flabel">Employee</span>
                <select className="glass-input" value={mapForm.user_id} onChange={e => setMapForm(f => ({ ...f, user_id: e.target.value }))}>
                  <option value="">Select employee…</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                  ))}
                </select>
              </div>
              <div className="fgroup">
                <span className="flabel">Device PIN (printed on card / enrolled on device)</span>
                <input className="glass-input" placeholder="e.g. 1, 2, 15…" value={mapForm.device_pin} onChange={e => setMapForm(f => ({ ...f, device_pin: e.target.value }))} />
              </div>
              <div className="fgroup">
                <span className="flabel">Device (required)</span>
                <select className="glass-input" value={mapForm.device_serial} onChange={e => setMapForm(f => ({ ...f, device_serial: e.target.value }))}>
                  <option value="">Select a device…</option>
                  {devices.map(d => (
                    <option key={d.id} value={d.serial_number}>{d.name || d.serial_number}</option>
                  ))}
                </select>
              </div>
              <div className="fgroup" style={{ justifyContent: 'flex-end' }}>
                <button className="btn-stitch" onClick={saveMapping} style={{ height: 42 }} disabled={!mapForm.user_id || !mapForm.device_pin || !mapForm.device_serial}>
                  <Save size={15} /> Save Mapping
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="sc">
        <div className="st-wrap">
          <table className="stitch">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Device PIN</th>
                <th>Device</th>
                <th>Status</th>
                <th>Created</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map(m => (
                <tr key={m.id}>
                  <td className="td-name">{m.User?.name || m.user?.name || `User #${m.user_id}`}</td>
                  <td><span className="sb2 sb2-cyan"><Hash size={10} /> {m.pin || m.device_pin}</span></td>
                  <td>{getDeviceName(m.device_serial)}</td>
                  <td><StatusBadge status={m.is_active ? 'active' : 'inactive'} /></td>
                  <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '—'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn-ghost" style={{ padding: '5px 10px', fontSize: 12, color: 'var(--danger)' }} onClick={() => deleteMapping(m.id)}>
                      <Trash2 size={13} /> Remove
                    </button>
                  </td>
                </tr>
              ))}
              {mappings.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                    <Link2 size={28} style={{ opacity: 0.3, marginBottom: 8 }} /><br />
                    No employee-PIN mappings yet. Create one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  /* ─── LOGS TAB ─── */
  const renderLogs = () => (
    <>
      <div className="row-sb mb16">
        <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{logTotal} total log{logTotal !== 1 ? 's' : ''}</span>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn-ghost" onClick={reprocessLogs}>
            <RefreshCw size={14} /> Reprocess
          </button>
          <button className="btn-ghost" onClick={() => fetchLogs(logPage)}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="sc">
        <div className="st-wrap">
          <table className="stitch">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Device PIN</th>
                <th>Device</th>
                <th>Type</th>
                <th>Processed</th>
                <th>Matched To</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td className="td-mono" style={{ fontSize: 12 }}>
                    {log.punch_time ? new Date(log.punch_time).toLocaleString() : '—'}
                  </td>
                  <td><span className="sb2 sb2-cyan"><Hash size={10} /> {log.device_pin || log.pin || '—'}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{log.BiometricDevice?.name || log.device_serial || '—'}</td>
                  <td>
                    <span className={`sb2 ${log.punch_type === 'check_in' ? 'sb2-mint' : 'sb2-amber'}`}>
                      {log.punch_type === 'check_in' ? <ArrowDownCircle size={10} /> : <ArrowUpCircle size={10} />}
                      {log.punch_type || 'punch'}
                    </span>
                  </td>
                  <td>
                    {log.processed
                      ? <span className="sb2 sb2-mint"><CheckCircle2 size={10} /> Yes</span>
                      : <span className="sb2 sb2-dim"><Clock size={10} /> Pending</span>
                    }
                  </td>
                  <td style={{ fontSize: 12 }}>{log.User?.name || log.matched_user || '—'}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-dim)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.process_error || '—'}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                    <ScanLine size={28} style={{ opacity: 0.3, marginBottom: 8 }} /><br />
                    No biometric logs found. Sync a device to pull records.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {logTotal > 25 && (
        <div className="row" style={{ justifyContent: 'center', marginTop: 16, gap: 8 }}>
          <button className="btn-ghost" disabled={logPage <= 1} onClick={() => fetchLogs(logPage - 1)} style={{ padding: '6px 14px', fontSize: 12 }}>
            Previous
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: '32px' }}>Page {logPage} of {Math.ceil(logTotal / 25)}</span>
          <button className="btn-ghost" disabled={logPage >= Math.ceil(logTotal / 25)} onClick={() => fetchLogs(logPage + 1)} style={{ padding: '6px 14px', fontSize: 12 }}>
            Next
          </button>
        </div>
      )}
    </>
  );

  /* ═══════════════════════════════════════════════════════════════
     LOADING STATE
     ═══════════════════════════════════════════════════════════════ */
  const LoadingState = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem' }}>
      <Loader2 size={32} className="animate-spin" color="var(--primary)" />
    </div>
  );

  /* ═══════════════════════════════════════════════════════════════
     MAIN RENDER
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div className="view-head">
        <div>
          <h2 className="view-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Fingerprint size={24} /> Biometric Management
          </h2>
          <p className="view-sub">Device registration, employee PIN mapping, and attendance sync logs</p>
        </div>
        <div className="view-actions">
          <button className="btn-ghost" onClick={() => {
            if (tab === 'overview') fetchDashboard();
            if (tab === 'devices') fetchDevices();
            if (tab === 'mappings') fetchMappings();
            if (tab === 'logs') fetchLogs(logPage);
          }}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 10, background: 'var(--glass)', border: '1px solid var(--border)', width: 'fit-content' }}>
        {TABS.map(t => (
          <div key={t.key} onClick={() => setTab(t.key)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.2s',
            background: tab === t.key ? 'rgba(255,255,255,0.06)' : 'transparent',
            color: tab === t.key ? 'var(--text-main)' : 'var(--text-dim)',
            borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
          }}>
            {t.icon} {t.label}
          </div>
        ))}
      </div>

      {/* Tab Content */}
      {loading && tab !== 'overview' ? <LoadingState /> : (
        <>
          {tab === 'overview' && renderOverview()}
          {tab === 'devices' && renderDevices()}
          {tab === 'mappings' && renderMappings()}
          {tab === 'logs' && renderLogs()}
        </>
      )}
    </div>
  );
};

export default BiometricManagement;
