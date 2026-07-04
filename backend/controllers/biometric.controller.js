/**
 * ═══════════════════════════════════════════════════════════════
 *  BIOMETRIC CONTROLLER
 *  Handles two groups of endpoints:
 *  
 *  1. ADMS Protocol (/iclock/*) — called BY the ZKTeco device
 *     These are unauthenticated (device uses serial number identity)
 *  
 *  2. Admin API (/api/biometric/*) — called BY admin users  
 *     These are JWT-authenticated and role-protected
 * ═══════════════════════════════════════════════════════════════
 */

const { Op } = require('sequelize');
const biometricService = require('../services/biometric.service');
const BiometricDevice = require('../models/BiometricDevice');
const BiometricLog = require('../models/BiometricLog');
const BiometricUserMap = require('../models/BiometricUserMap');
const BiometricCommand = require('../models/BiometricCommand');
const User = require('../models/User');
const Branch = require('../models/Branch');

/* ═══════════════════════════════════════════════════════════════
   SECTION 1: ADMS PROTOCOL ENDPOINTS (called by device)
   ═══════════════════════════════════════════════════════════════ */

/**
 * GET /iclock/cdata?SN=xxx — Device handshake / registration
 * POST /iclock/cdata?SN=xxx&table=ATTLOG — Push attendance logs
 */
exports.handleCdata = async (req, res) => {
  try {
    const sn = req.query.SN || req.query.sn;
    if (!sn) return res.status(400).send('BAD REQUEST');

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;

    // POST = device pushing data
    if (req.method === 'POST') {
      const table = (req.query.table || req.query.Table || '').toUpperCase();
      const stamp = req.query.Stamp || req.query.stamp || '0';

      if (table === 'ATTLOG') {
        const result = await biometricService.handleAttendancePush(sn, req.body, stamp);
        console.log(`[BIOMETRIC] ATTLOG received from ${sn}: ${result.count} new records`);
        return res.status(200).send('OK');
      }

      if (table === 'OPERLOG') {
        // Operation logs (door open, alarm, etc.) — acknowledge but don't process yet
        console.log(`[BIOMETRIC] OPERLOG received from ${sn}`);
        return res.status(200).send('OK');
      }

      // Unknown table — acknowledge anyway
      return res.status(200).send('OK');
    }

    // GET = device handshake / init
    const config = await biometricService.handleHandshake(sn, req.query, ip);
    res.set('Content-Type', 'text/plain');
    return res.status(200).send(config);
  } catch (err) {
    console.error('[BIOMETRIC] cdata error:', err);
    return res.status(500).send('ERROR');
  }
};

/**
 * GET /iclock/getrequest?SN=xxx — Device polls for pending commands
 */
exports.handleGetRequest = async (req, res) => {
  try {
    const sn = req.query.SN || req.query.sn;
    if (!sn) return res.status(400).send('BAD REQUEST');

    const command = await biometricService.getNextCommand(sn);

    if (command) {
      res.set('Content-Type', 'text/plain');
      return res.status(200).send(command);
    }

    return res.status(200).send('OK');
  } catch (err) {
    console.error('[BIOMETRIC] getrequest error:', err);
    return res.status(200).send('OK');
  }
};

/**
 * POST /iclock/devicecmd?SN=xxx — Device reports command execution results
 */
exports.handleDeviceCmd = async (req, res) => {
  try {
    const sn = req.query.SN || req.query.sn;
    if (!sn) return res.status(400).send('BAD REQUEST');

    await biometricService.handleCommandResult(sn, req.body);
    return res.status(200).send('OK');
  } catch (err) {
    console.error('[BIOMETRIC] devicecmd error:', err);
    return res.status(200).send('OK');
  }
};

/* ═══════════════════════════════════════════════════════════════
   SECTION 2: ADMIN API ENDPOINTS (JWT-authenticated)
   ═══════════════════════════════════════════════════════════════ */

// ─── Device Management ────────────────────────────────────────

/**
 * GET /api/biometric/devices — List all biometric devices
 */
exports.getDevices = async (req, res) => {
  try {
    const where = {};
    if (req.branchId) where.branch_id = req.branchId;

    const devices = await BiometricDevice.findAll({
      where,
      include: [{ model: Branch, attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']],
    });

    // Enrich with online status
    const now = new Date();
    const enriched = devices.map(d => {
      const plain = d.toJSON();
      const mins = d.last_heartbeat
        ? Math.round((now - new Date(d.last_heartbeat)) / 60000)
        : null;
      plain.is_online = mins !== null && mins < 10;
      plain.minutes_since_heartbeat = mins;
      return plain;
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/biometric/devices/:id — Get single device
 */
exports.getDevice = async (req, res) => {
  try {
    const device = await BiometricDevice.findByPk(req.params.id, {
      include: [{ model: Branch, attributes: ['id', 'name'] }],
    });
    if (!device) return res.status(404).json({ error: 'Device not found' });
    res.json(device);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/biometric/devices — Register a new device manually
 */
exports.createDevice = async (req, res) => {
  try {
    const { serial_number, name, branch_id, model, location_description, timezone, settings, ip_address, port } = req.body;
    if (!serial_number) return res.status(400).json({ error: 'serial_number is required' });

    const device = await BiometricDevice.create({
      serial_number,
      name: name || `Device ${serial_number}`,
      branch_id: branch_id || req.branchId,
      model,
      location_description,
      timezone: timezone || 'Asia/Dhaka',
      settings: settings || {},
      ip_address,
      port: port || 4370,
    });

    res.status(201).json(device);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Device with this serial number already exists' });
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * PATCH /api/biometric/devices/:id — Update device details
 */
exports.updateDevice = async (req, res) => {
  try {
    const device = await BiometricDevice.findByPk(req.params.id);
    if (!device) return res.status(404).json({ error: 'Device not found' });

    const allowed = ['name', 'branch_id', 'model', 'status', 'location_description', 'timezone', 'settings', 'ip_address', 'port'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    await device.update(updates);
    res.json(device);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * DELETE /api/biometric/devices/:id — Remove a device
 */
exports.deleteDevice = async (req, res) => {
  try {
    const deleted = await BiometricDevice.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Device not found' });
    res.json({ message: 'Device removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/biometric/devices/:id/sync — Trigger direct sync pull
 */
exports.syncDevice = async (req, res) => {
  try {
    const result = await biometricService.syncDeviceLogsById(req.params.id);
    res.json({
      success: true,
      message: 'Direct TCP pull completed successfully.',
      ...result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/**
 * GET /api/biometric/devices/health — Device health dashboard
 */
exports.getDeviceHealth = async (req, res) => {
  try {
    const health = await biometricService.getDeviceHealth(req.branchId);
    res.json(health);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── User Mapping ─────────────────────────────────────────────

/**
 * GET /api/biometric/mappings — List all device PIN ↔ user mappings
 */
exports.getMappings = async (req, res) => {
  try {
    const where = {};
    if (req.query.device_serial) where.device_serial = req.query.device_serial;

    const mappings = await BiometricUserMap.findAll({
      where,
      include: [{ model: User, attributes: ['id', 'name', 'email', 'role'] }],
      order: [['device_serial', 'ASC'], ['pin', 'ASC']],
    });
    res.json(mappings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/biometric/mappings — Create a new PIN ↔ user mapping
 */
exports.createMapping = async (req, res) => {
  try {
    const { device_serial, pin, user_id, employee_name } = req.body;
    if (!device_serial || !pin || !user_id) {
      return res.status(400).json({ error: 'device_serial, pin, and user_id are required' });
    }

    // Verify user exists
    const user = await User.findByPk(user_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Verify device exists
    const device = await BiometricDevice.findOne({ where: { serial_number: device_serial } });
    if (!device) return res.status(404).json({ error: 'Device not found' });

    const mapping = await BiometricUserMap.create({
      device_serial,
      pin: String(pin),
      user_id,
      employee_name: employee_name || user.name,
    });

    res.status(201).json(mapping);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'This PIN is already mapped on this device' });
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/biometric/mappings/bulk — Bulk create mappings
 * Body: { mappings: [{ device_serial, pin, user_id, employee_name }] }
 */
exports.createBulkMappings = async (req, res) => {
  try {
    const { mappings } = req.body;
    if (!Array.isArray(mappings) || mappings.length === 0) {
      return res.status(400).json({ error: 'mappings array is required' });
    }

    const results = { created: 0, errors: [] };

    for (const m of mappings) {
      try {
        await BiometricUserMap.create({
          device_serial: m.device_serial,
          pin: String(m.pin),
          user_id: m.user_id,
          employee_name: m.employee_name || null,
        });
        results.created++;
      } catch (err) {
        results.errors.push({ pin: m.pin, error: err.message });
      }
    }

    res.status(201).json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * PATCH /api/biometric/mappings/:id — Update a mapping
 */
exports.updateMapping = async (req, res) => {
  try {
    const mapping = await BiometricUserMap.findByPk(req.params.id);
    if (!mapping) return res.status(404).json({ error: 'Mapping not found' });

    const allowed = ['user_id', 'employee_name', 'is_active'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    await mapping.update(updates);
    res.json(mapping);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * DELETE /api/biometric/mappings/:id — Remove a mapping
 */
exports.deleteMapping = async (req, res) => {
  try {
    const deleted = await BiometricUserMap.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Mapping not found' });
    res.json({ message: 'Mapping removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Logs & Processing ────────────────────────────────────────

/**
 * GET /api/biometric/logs — View raw biometric logs
 */
exports.getLogs = async (req, res) => {
  try {
    const where = {};
    if (req.query.device_serial) where.device_serial = req.query.device_serial;
    if (req.query.pin) where.pin = req.query.pin;
    if (req.query.processed !== undefined) where.processed = req.query.processed === 'true';
    if (req.query.date) {
      const start = new Date(req.query.date + 'T00:00:00');
      const end = new Date(req.query.date + 'T23:59:59');
      where.punch_time = { [Op.between]: [start, end] };
    }
    if (req.query.from && req.query.to) {
      where.punch_time = { [Op.between]: [new Date(req.query.from), new Date(req.query.to)] };
    }

    const logs = await BiometricLog.findAll({
      where,
      order: [['punch_time', 'DESC']],
      limit: parseInt(req.query.limit) || 200,
      offset: parseInt(req.query.offset) || 0,
    });

    const total = await BiometricLog.count({ where });
    res.json({ logs, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/biometric/logs/unmatched — View logs that failed PIN mapping
 */
exports.getUnmatchedLogs = async (req, res) => {
  try {
    const logs = await BiometricLog.findAll({
      where: {
        processed: true,
        process_error: { [Op.like]: '%Unmapped PIN%' },
      },
      order: [['punch_time', 'DESC']],
      limit: 100,
    });

    // Get distinct unmapped PINs
    const unmappedPins = [...new Set(logs.map(l => `${l.device_serial}:${l.pin}`))];

    res.json({ logs, unmapped_pins: unmappedPins });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/biometric/logs/reprocess — Reprocess failed logs
 */
exports.reprocessLogs = async (req, res) => {
  try {
    const result = await biometricService.reprocessFailedLogs(req.body.device_serial);
    res.json({ message: 'Reprocessing triggered', ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/biometric/process — Manually trigger processing of unprocessed logs
 */
exports.triggerProcessing = async (req, res) => {
  try {
    const result = await biometricService.processUnprocessedLogs(req.body.device_serial);
    res.json({ message: 'Processing complete', ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Device Commands ──────────────────────────────────────────

/**
 * GET /api/biometric/commands — List pending/executed commands
 */
exports.getCommands = async (req, res) => {
  try {
    const where = {};
    if (req.query.device_serial) where.device_serial = req.query.device_serial;
    if (req.query.status) where.status = req.query.status;

    const commands = await BiometricCommand.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: 50,
    });
    res.json(commands);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/biometric/commands — Queue a command for a device
 */
exports.sendCommand = async (req, res) => {
  try {
    const { device_serial, command_type, command } = req.body;
    if (!device_serial) return res.status(400).json({ error: 'device_serial is required' });

    let cmd;

    // Use built-in command generators for known types
    switch (command_type) {
      case 'REBOOT':
        cmd = await biometricService.commands.reboot(device_serial);
        break;
      case 'CLEAR_LOG':
        cmd = await biometricService.commands.clearLog(device_serial);
        break;
      case 'INFO':
        cmd = await biometricService.commands.getInfo(device_serial);
        break;
      case 'SET_TIME':
        cmd = await biometricService.commands.setTime(device_serial);
        break;
      case 'CHECK':
        cmd = await biometricService.commands.check(device_serial);
        break;
      default:
        if (!command) return res.status(400).json({ error: 'command string is required for custom commands' });
        cmd = await biometricService.queueCommand(device_serial, command_type || 'CUSTOM', command, req.user?.id);
    }

    res.status(201).json(cmd);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Dashboard Stats ──────────────────────────────────────────

/**
 * GET /api/biometric/dashboard — Biometric module dashboard summary
 */
exports.getDashboard = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date().toISOString().split('T')[0];

    // Device stats
    const totalDevices = await BiometricDevice.count();
    const activeDevices = await BiometricDevice.count({ where: { status: 'active' } });

    // Find online devices (heartbeat within last 10 minutes)
    const tenMinAgo = new Date(now - 10 * 60 * 1000);
    const onlineDevices = await BiometricDevice.count({
      where: { last_heartbeat: { [Op.gte]: tenMinAgo } },
    });

    // Log stats
    const todayStart = new Date(today + 'T00:00:00');
    const todayEnd = new Date(today + 'T23:59:59');

    const todayLogs = await BiometricLog.count({
      where: { punch_time: { [Op.between]: [todayStart, todayEnd] } },
    });

    const unprocessedLogs = await BiometricLog.count({
      where: { processed: false },
    });

    const unmatchedLogs = await BiometricLog.count({
      where: { processed: true, process_error: { [Op.like]: '%Unmapped PIN%' } },
    });

    // Mapping stats
    const totalMappings = await BiometricUserMap.count({ where: { is_active: true } });

    // Pending commands
    const pendingCommands = await BiometricCommand.count({ where: { status: 'pending' } });

    res.json({
      devices: {
        total: totalDevices,
        active: activeDevices,
        online: onlineDevices,
        offline: activeDevices - onlineDevices,
      },
      logs: {
        today: todayLogs,
        unprocessed: unprocessedLogs,
        unmatched: unmatchedLogs,
      },
      mappings: totalMappings,
      pending_commands: pendingCommands,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
