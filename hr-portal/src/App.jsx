import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './App.css';

// Auto-detect API Base Url
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : '/api';

// Helper for JWT authentication headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('hrm_token');
  return {
    'Content-Type': 'application/json',
    ...(token && token !== 'temp_token' ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

/* ═══════════════════════════════════════════════════════════════
   MOCK DATA FALLBACKS (For offline/non-authenticated preview)
   ═══════════════════════════════════════════════════════════════ */
const MOCK_DEVICES = [
  { id: 1, name: 'Main Lobby F18', serial_number: 'TEST_F18_SERIAL', ip_address: '127.0.0.1', port: 4370, status: 'active', last_heartbeat: new Date().toISOString(), firmware_version: 'ZK-F18-v1.2', location_description: 'Ground Floor Lobby' },
  { id: 2, name: 'IT Lab Entry', serial_number: 'ZK_LAB_9876', ip_address: '192.168.1.105', port: 4370, status: 'offline', last_heartbeat: null, firmware_version: null, location_description: '2nd Floor IT Wing' }
];

const MOCK_MAPPINGS = [
  { id: 1, device_serial: 'TEST_F18_SERIAL', pin: '1', user_id: 1, employee_name: 'John Doe', is_active: true, User: { name: 'John Doe', email: 'john@example.com', role: 'Trainer' } },
  { id: 2, device_serial: 'TEST_F18_SERIAL', pin: '2', user_id: 2, employee_name: 'Jane Smith', is_active: true, User: { name: 'Jane Smith', email: 'jane@example.com', role: 'Staff' } }
];

const MOCK_USERS = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Trainer' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Staff' },
  { id: 3, name: 'Admin User', email: 'admin@languageacademy.com', role: 'Super Admin' }
];

const MOCK_LOGS = [
  { id: 1, device_serial: 'TEST_F18_SERIAL', pin: '1', punch_time: new Date(new Date() - 30 * 60 * 1000).toISOString(), verify_type: 1, io_mode: 0, processed: true, matched_user_id: 1, process_error: null },
  { id: 2, device_serial: 'TEST_F18_SERIAL', pin: '2', punch_time: new Date(new Date() - 15 * 60 * 1000).toISOString(), verify_type: 1, io_mode: 0, processed: true, matched_user_id: 2, process_error: null },
  { id: 3, device_serial: 'TEST_F18_SERIAL', pin: '99', punch_time: new Date().toISOString(), verify_type: 1, io_mode: 0, processed: true, matched_user_id: null, process_error: 'Unmapped PIN: 99 on device TEST_F18_SERIAL' }
];

/* ═══════════════════════════════════════════════════════════════
   TOAST COMPONENT
   ═══════════════════════════════════════════════════════════════ */
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast-alert ${type === 'error' ? 'error' : ''}`}>
      <span>{message}</span>
      <button onClick={onClose} className="toast-close">×</button>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   LOGIN PAGE
   ═══════════════════════════════════════════════════════════════ */
const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    localStorage.setItem('hrm_token', 'temp_token');
    navigate('/dashboard');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">👥</div>
        <h1>HRM Portal</h1>
        <p className="login-sub">Language Academy Biometric Portal</p>
        <form onSubmit={handleLogin}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit">Sign In</button>
        </form>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN DASHBOARD
   ═══════════════════════════════════════════════════════════════ */
const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [toast, setToast] = useState(null);

  // Global State Loaded from API or Mock
  const [devices, setDevices] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ devices: { total: 0, online: 0 }, logs: { today: 0, unmatched: 0 } });
  const [loading, setLoading] = useState(true);
  const [isUsingMock, setIsUsingMock] = useState(false);

  const showToast = (message, type = 'success') => setToast({ message, type });
  const handleLogout = () => {
    localStorage.removeItem('hrm_token');
    navigate('/login');
  };

  // Fetch all dashboard metrics & configuration lists
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch devices
      const devRes = await fetch(`${API_BASE}/biometric/devices`, { headers: getAuthHeaders() });
      if (!devRes.ok) throw new Error('API request unauthorized/failed');
      const devData = await devRes.json();
      setDevices(devData);

      // 2. Fetch mappings
      const mapRes = await fetch(`${API_BASE}/biometric/mappings`, { headers: getAuthHeaders() });
      const mapData = await mapRes.json();
      setMappings(mapData);

      // 3. Fetch logs
      const logRes = await fetch(`${API_BASE}/biometric/logs?limit=50`, { headers: getAuthHeaders() });
      const logData = await logRes.json();
      setLogs(logData.logs || []);

      // 4. Fetch dashboard stats
      const statsRes = await fetch(`${API_BASE}/biometric/dashboard`, { headers: getAuthHeaders() });
      const statsData = await statsRes.json();
      setStats(statsData);

      // 5. Fetch user directories (for mapping bindings)
      const userRes = await fetch(`${API_BASE}/auth/staff`, { headers: getAuthHeaders() });
      const userData = await userRes.json();
      setUsers(userData || []);

      setIsUsingMock(false);
    } catch (err) {
      console.warn('[BIOMETRIC] Failed fetching from API. Falling back to local simulations.', err);
      // Fallbacks
      setDevices(MOCK_DEVICES);
      setMappings(MOCK_MAPPINGS);
      setLogs(MOCK_LOGS);
      setUsers(MOCK_USERS);
      setStats({
        devices: { total: MOCK_DEVICES.length, online: 1 },
        logs: { today: 2, unmatched: 1 }
      });
      setIsUsingMock(true);
      showToast('Offline Mode: Using simulated local database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="dashboard">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <header className="dash-header">
        <div>
          <h1>👥 HRM Biometric Administration</h1>
          {isUsingMock && <span style={{ color: 'var(--amber)', fontSize: '11px', fontWeight: 'bold' }}>⚠️ RUNNING SIMULATION MODE</span>}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={loadData} className="logout-btn">🔄 Refresh Data</button>
          <button onClick={handleLogout} className="logout-btn" style={{ borderColor: 'rgba(255,71,71,0.2)', color: '#ff7575' }}>Logout</button>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="tab-bar">
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>📊 Overview</button>
        <button className={`tab-btn ${activeTab === 'devices' ? 'active' : ''}`} onClick={() => setActiveTab('devices')}>📟 Biometric Devices</button>
        <button className={`tab-btn ${activeTab === 'mappings' ? 'active' : ''}`} onClick={() => setActiveTab('mappings')}>🔗 Employee Mappings</button>
        <button className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>📋 Device Logs</button>
      </div>

      {loading ? (
        <div className="loader-container">
          <div className="pulse-syncing">Loading Biometric Console...</div>
        </div>
      ) : (
        <div className="tab-content">
          {activeTab === 'overview' && (
            <OverviewTab stats={stats} devices={devices} setActiveTab={setActiveTab} />
          )}

          {activeTab === 'devices' && (
            <DeviceManagerTab 
              devices={devices} 
              setDevices={setDevices} 
              showToast={showToast} 
              isUsingMock={isUsingMock} 
              loadData={loadData}
            />
          )}

          {activeTab === 'mappings' && (
            <UserMappingTab 
              mappings={mappings} 
              setMappings={setMappings} 
              users={users} 
              devices={devices}
              showToast={showToast} 
              isUsingMock={isUsingMock}
              loadData={loadData}
            />
          )}

          {activeTab === 'logs' && (
            <LogsViewerTab 
              logs={logs} 
              setLogs={setLogs} 
              showToast={showToast} 
              isUsingMock={isUsingMock}
              loadData={loadData}
            />
          )}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   SUB-TAB: OVERVIEW
   ═══════════════════════════════════════════════════════════════ */
const OverviewTab = ({ stats, devices, setActiveTab }) => {
  return (
    <div>
      <div className="dash-grid">
        <div className="dash-card mint">
          <div className="card-label">Total Devices</div>
          <div className="card-value">{stats.devices?.total || 0}</div>
        </div>
        <div className="dash-card cyan">
          <div className="card-label">Active / Online</div>
          <div className="card-value">{stats.devices?.online || 0}</div>
        </div>
        <div className="dash-card amber">
          <div className="card-label">Punches Pulled Today</div>
          <div className="card-value">{stats.logs?.today || 0}</div>
        </div>
        <div className="dash-card violet">
          <div className="card-label">Unmapped PIN Errors</div>
          <div className="card-value" style={{ color: (stats.logs?.unmatched || 0) > 0 ? '#ff7575' : 'inherit' }}>
            {stats.logs?.unmatched || 0}
          </div>
        </div>
      </div>

      <div className="biometric-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="pane-card">
          <h2>📟 Configured Device Shortcuts</h2>
          <div className="table-container">
            <table className="biometric-table">
              <thead>
                <tr>
                  <th>Device Name</th>
                  <th>Serial Number</th>
                  <th>IP Address</th>
                  <th>Connection</th>
                  <th>Last Sync Heartbeat</th>
                </tr>
              </thead>
              <tbody>
                {devices.length === 0 ? (
                  <tr><td colSpan="5" className="empty-state">No devices registered. Click "Biometric Devices" above to register.</td></tr>
                ) : (
                  devices.map(d => (
                    <tr key={d.id}>
                      <td><strong>{d.name}</strong></td>
                      <td><code>{d.serial_number}</code></td>
                      <td>{d.ip_address}:{d.port || 4370}</td>
                      <td>
                        <span className={`badge ${d.status === 'active' || d.is_online ? 'online' : 'offline'}`}>
                          {d.status === 'active' || d.is_online ? 'Online (Ready)' : 'Offline'}
                        </span>
                      </td>
                      <td>{d.last_heartbeat ? new Date(d.last_heartbeat).toLocaleString() : 'Never'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   SUB-TAB: DEVICE MANAGEMENT
   ═══════════════════════════════════════════════════════════════ */
const DeviceManagerTab = ({ devices, setDevices, showToast, isUsingMock, loadData }) => {
  const [name, setName] = useState('');
  const [serial, setSerial] = useState('');
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('4370');
  const [location, setLocation] = useState('');
  const [syncingId, setSyncingId] = useState(null);

  const handleAddDevice = async (e) => {
    e.preventDefault();
    const payload = {
      name,
      serial_number: serial,
      ip_address: ip,
      port: parseInt(port),
      location_description: location,
      branch_id: 1 // default test branch
    };

    if (isUsingMock) {
      const mockNew = {
        id: Date.now(),
        ...payload,
        status: 'active',
        last_heartbeat: new Date().toISOString(),
        firmware_version: 'Simulated FW'
      };
      setDevices([mockNew, ...devices]);
      showToast('Simulated Device Added.');
    } else {
      try {
        const res = await fetch(`${API_BASE}/biometric/devices`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to add device.');
        }
        showToast('Device registered successfully.');
        loadData();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    // Reset Form
    setName('');
    setSerial('');
    setIp('');
    setPort('4370');
    setLocation('');
  };

  const handleSync = async (device) => {
    setSyncingId(device.id);
    if (isUsingMock) {
      setTimeout(() => {
        setSyncingId(null);
        showToast(`Simulated direct pull complete: 2 punches retrieved from ${device.name}.`);
      }, 1500);
    } else {
      try {
        const res = await fetch(`${API_BASE}/biometric/devices/${device.id}/sync`, {
          method: 'POST',
          headers: getAuthHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Sync failed.');
        
        showToast(`Sync successful: Pulled ${data.pulled} records, saved ${data.saved} new entries.`);
        loadData();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setSyncingId(null);
      }
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to remove this device registration?')) return;

    if (isUsingMock) {
      setDevices(devices.filter(d => d.id !== id));
      showToast('Simulated Device Removed.');
    } else {
      try {
        const res = await fetch(`${API_BASE}/biometric/devices/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error('Delete failed.');
        showToast('Device removed.');
        loadData();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  };

  return (
    <div className="biometric-grid">
      {/* Left side Form */}
      <div className="pane-card">
        <h2>📟 Register New ZKTeco F18</h2>
        <form onSubmit={handleAddDevice} className="biometric-form">
          <div className="form-group">
            <label>Device Display Name</label>
            <input type="text" className="input-field" placeholder="e.g. Reception F18" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Device Serial Number (SN)</label>
            <input type="text" className="input-field" placeholder="e.g. F1819230005" value={serial} onChange={e => setSerial(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Device Network IP Address</label>
            <input type="text" className="input-field" placeholder="e.g. 192.168.1.201" value={ip} onChange={e => setIp(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Device Connection Port</label>
            <input type="number" className="input-field" placeholder="4370" value={port} onChange={e => setPort(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Physical Location Info</label>
            <input type="text" className="input-field" placeholder="e.g. Front Gate Lobby" value={location} onChange={e => setLocation(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>➕ Register Device</button>
        </form>
      </div>

      {/* Right side Device List */}
      <div className="pane-card">
        <h2>📟 Connected Biometric Terminals</h2>
        <div className="table-container">
          <table className="biometric-table">
            <thead>
              <tr>
                <th>Device</th>
                <th>Socket Address</th>
                <th>Status</th>
                <th>Last Sync</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.length === 0 ? (
                <tr><td colSpan="5" className="empty-state">No biometric devices configured yet. Enter IP address on the left to start.</td></tr>
              ) : (
                devices.map(d => (
                  <tr key={d.id} className={syncingId === d.id ? 'pulse-syncing' : ''}>
                    <td>
                      <div><strong>{d.name}</strong></div>
                      <div style={{ fontSize: '11px', color: 'var(--t3)' }}>SN: <code>{d.serial_number}</code></div>
                    </td>
                    <td>
                      <code>{d.ip_address}:{d.port || 4370}</code>
                      {d.location_description && <div style={{ fontSize: '11px', color: 'var(--t4)' }}>{d.location_description}</div>}
                    </td>
                    <td>
                      <span className={`badge ${d.status === 'active' || d.is_online ? 'online' : 'offline'}`}>
                        {d.status === 'active' || d.is_online ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px' }}>{d.last_heartbeat ? new Date(d.last_heartbeat).toLocaleTimeString() : 'Never'}</div>
                      <div style={{ fontSize: '10px', color: 'var(--t4)' }}>{d.last_heartbeat ? new Date(d.last_heartbeat).toLocaleDateString() : ''}</div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => handleSync(d)} 
                          className="btn-primary" 
                          disabled={syncingId !== null} 
                          style={{ padding: '6px 12px', fontSize: '11px' }}
                        >
                          ⚡ {syncingId === d.id ? 'Syncing...' : 'Sync Logs'}
                        </button>
                        <button 
                          onClick={() => handleDelete(d.id)} 
                          className="btn-danger"
                          style={{ padding: '6px 10px', fontSize: '11px' }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   SUB-TAB: EMPLOYEE MAPPINGS
   ═══════════════════════════════════════════════════════════════ */
const UserMappingTab = ({ mappings, setMappings, users, devices, showToast, isUsingMock, loadData }) => {
  const [selectedDevice, setSelectedDevice] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [pin, setPin] = useState('');

  const handleCreateMapping = async (e) => {
    e.preventDefault();
    if (!selectedDevice || !selectedUser || !pin) {
      showToast('Please select device, user and type PIN.', 'error');
      return;
    }

    const payload = {
      device_serial: selectedDevice,
      user_id: parseInt(selectedUser),
      pin: String(pin)
    };

    if (isUsingMock) {
      const targetUser = users.find(u => u.id === parseInt(selectedUser));
      const mockNew = {
        id: Date.now(),
        ...payload,
        employee_name: targetUser ? targetUser.name : 'Unknown',
        User: targetUser || { name: 'Unknown', email: 'unknown@example.com', role: 'Staff' }
      };
      setMappings([mockNew, ...mappings]);
      showToast('Simulated Mapping Created.');
    } else {
      try {
        const res = await fetch(`${API_BASE}/biometric/mappings`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to map user.');
        }
        showToast('Employee mapped successfully.');
        loadData();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    setPin('');
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to remove this employee PIN mapping?')) return;

    if (isUsingMock) {
      setMappings(mappings.filter(m => m.id !== id));
      showToast('Simulated Mapping Removed.');
    } else {
      try {
        const res = await fetch(`${API_BASE}/biometric/mappings/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error('Delete failed.');
        showToast('Mapping removed.');
        loadData();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  };

  return (
    <div className="biometric-grid">
      {/* Left side Bind Map Form */}
      <div className="pane-card">
        <h2>🔗 Bind Employee to PIN</h2>
        <form onSubmit={handleCreateMapping} className="biometric-form">
          <div className="form-group">
            <label>1. Select Device</label>
            <select className="input-field" value={selectedDevice} onChange={e => setSelectedDevice(e.target.value)} required>
              <option value="">-- Choose Biometric Device --</option>
              {devices.map(d => (
                <option key={d.id} value={d.serial_number}>{d.name} ({d.serial_number})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>2. Select Portal Employee</label>
            <select className="input-field" value={selectedUser} onChange={e => setSelectedUser(e.target.value)} required>
              <option value="">-- Choose Staff Member --</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role} - {u.email})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>3. Device User ID (PIN)</label>
            <input type="number" className="input-field" placeholder="e.g. 105" value={pin} onChange={e => setPin(e.target.value)} required />
            <p style={{ fontSize: '11px', color: 'var(--t4)', marginTop: '2px' }}>
              This is the ID number assigned to the employee when you registered their finger/face on the F18 machine.
            </p>
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>🔗 Save Mapping</button>
        </form>
      </div>

      {/* Right side Mappings List */}
      <div className="pane-card">
        <h2>🔗 Active Employee Bindings</h2>
        <div className="table-container">
          <table className="biometric-table">
            <thead>
              <tr>
                <th>Device Serial</th>
                <th>Device PIN</th>
                <th>Linked Employee</th>
                <th>Role</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {mappings.length === 0 ? (
                <tr><td colSpan="5" className="empty-state">No employee PIN mappings created yet. Pair an employee on the left.</td></tr>
              ) : (
                mappings.map(m => (
                  <tr key={m.id}>
                    <td><code>{m.device_serial}</code></td>
                    <td>
                      <span className="badge success" style={{ fontSize: '12px', padding: '3px 8px' }}>ID: {m.pin}</span>
                    </td>
                    <td>
                      <div><strong>{m.User?.name || m.employee_name}</strong></div>
                      <div style={{ fontSize: '11px', color: 'var(--t4)' }}>{m.User?.email}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px' }}>{m.User?.role || 'Staff'}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        onClick={() => handleDelete(m.id)} 
                        className="btn-danger" 
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                      >
                        Unlink
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   SUB-TAB: RAW DEVICE LOGS
   ═══════════════════════════════════════════════════════════════ */
const LogsViewerTab = ({ logs, setLogs, showToast, isUsingMock, loadData }) => {
  const [reprocessing, setReprocessing] = useState(false);
  const [filterUnmapped, setFilterUnmapped] = useState(false);

  const handleReprocess = async () => {
    setReprocessing(true);
    if (isUsingMock) {
      setTimeout(() => {
        setReprocessing(false);
        showToast('Simulated reprocessing complete. Unmapped errors resolved.');
      }, 1500);
    } else {
      try {
        const res = await fetch(`${API_BASE}/biometric/logs/reprocess`, {
          method: 'POST',
          headers: getAuthHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Reprocessing failed.');
        
        showToast(`Logs reprocessed successfully. Reset: ${data.reset}`);
        loadData();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setReprocessing(false);
      }
    }
  };

  const displayedLogs = filterUnmapped
    ? logs.filter(l => l.process_error && l.process_error.includes('Unmapped PIN'))
    : logs;

  return (
    <div className="pane-card" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <h2>📋 Raw Device Attendance Punches</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className={`btn-secondary ${filterUnmapped ? 'active' : ''}`}
            onClick={() => setFilterUnmapped(!filterUnmapped)}
            style={{ borderColor: filterUnmapped ? 'var(--amber)' : 'inherit' }}
          >
            ⚠️ {filterUnmapped ? 'Showing Unmapped Only' : 'Filter Unmapped Errors'}
          </button>
          <button 
            onClick={handleReprocess} 
            className="btn-primary" 
            disabled={reprocessing}
          >
            ⚡ {reprocessing ? 'Reprocessing...' : 'Reprocess Failed Logs'}
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="biometric-table">
          <thead>
            <tr>
              <th>Log ID</th>
              <th>Device Serial</th>
              <th>Device PIN</th>
              <th>Punch Time</th>
              <th>Verification Mode</th>
              <th>Processing Status</th>
            </tr>
          </thead>
          <tbody>
            {displayedLogs.length === 0 ? (
              <tr><td colSpan="6" className="empty-state">No attendance logs retrieved. Connect a device and trigger sync.</td></tr>
            ) : (
              displayedLogs.map(l => (
                <tr key={l.id}>
                  <td><code>#{l.id}</code></td>
                  <td><code>{l.device_serial}</code></td>
                  <td><span className="badge warning">ID: {l.pin}</span></td>
                  <td>{new Date(l.punch_time).toLocaleString()}</td>
                  <td>
                    {l.verify_type === 1 ? 'Fingerprint' : l.verify_type === 9 ? 'Face' : 'Password/Card'}
                  </td>
                  <td>
                    {l.process_error ? (
                      <span className="badge offline" title={l.process_error} style={{ fontSize: '11px', cursor: 'help' }}>
                        ⚠️ Failed: Unmapped
                      </span>
                    ) : (
                      <span className="badge online" style={{ fontSize: '11px' }}>
                        ✅ Processed (OK)
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   ROUTING MOUNTING
   ═══════════════════════════════════════════════════════════════ */
const ProtectedRoute = ({ children }) => {
  return localStorage.getItem('hrm_token') ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router basename="/hrm">
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
