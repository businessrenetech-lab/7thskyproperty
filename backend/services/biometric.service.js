/**
 * ═══════════════════════════════════════════════════════════════
 *  BIOMETRIC SERVICE — ZKTeco ADMS Integration
 *  Processes raw biometric logs into StaffAttendance records.
 *  
 *  This service is the BRIDGE between the raw device data layer
 *  (BiometricLog) and the existing HRM attendance layer (StaffAttendance).
 *  
 *  It does NOT modify any existing HRM code — it simply writes to
 *  the same StaffAttendance table using method = 'biometric'.
 * ═══════════════════════════════════════════════════════════════
 */

const { Op } = require('sequelize');
const BiometricDevice = require('../models/BiometricDevice');
const BiometricLog = require('../models/BiometricLog');
const BiometricUserMap = require('../models/BiometricUserMap');
const BiometricCommand = require('../models/BiometricCommand');
const StaffAttendance = require('../models/StaffAttendance');
const User = require('../models/User');

/* ─── Dhaka Timezone Helpers (matching hrm.routes.js convention) ─── */
const getDhakaDate = (date) => {
  const d = date || new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d);
  return `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}`;
};

const getDhakaTime = (date) => {
  const d = date || new Date();
  return d.toLocaleTimeString('en-GB', { hour12: false, timeZone: 'Asia/Dhaka' });
};

/* ═══════════════════════════════════════════════════════════════
   SECTION 1: ADMS PROTOCOL HANDLERS
   ═══════════════════════════════════════════════════════════════ */

/**
 * Handle device handshake — called when a ZKTeco device first contacts the server.
 * Registers the device if new, updates heartbeat if known.
 * Returns the ADMS configuration response.
 */
exports.handleHandshake = async (serialNumber, query, ipAddress) => {
  const pushVersion = query.pushver || 'unknown';
  const language = query.language || '0';

  // Find or register device
  let device = await BiometricDevice.findOne({ where: { serial_number: serialNumber } });

  if (!device) {
    // Auto-register unknown devices (admin must assign branch_id later)
    device = await BiometricDevice.create({
      serial_number: serialNumber,
      name: `New Device (${serialNumber})`,
      branch_id: 1, // Default branch — admin should update this
      push_version: pushVersion,
      ip_address: ipAddress,
      last_heartbeat: new Date(),
      status: 'active',
    });
    console.log(`[BIOMETRIC] New device auto-registered: ${serialNumber}`);
  } else {
    await device.update({
      push_version: pushVersion,
      ip_address: ipAddress,
      last_heartbeat: new Date(),
      status: 'active',
    });
  }

  // Build ADMS response — tells the device how to behave
  const stamp = device.last_sync_stamp || '0';
  const config = [
    `GET OPTION FROM: ${serialNumber}`,
    `Stamp=${stamp}`,
    `OpStamp=0`,
    `PhotoStamp=0`,
    `TransTimes=00:00;14:05`,
    `TransInterval=1`,
    `TransFlag=TransData AttLog OpLog`,
    `Realtime=1`,
    `Encrypt=0`,
    `ServerVer=2.4.1`,
    `ATTLOGStamp=${stamp}`,
    `OPERLOGStamp=0`,
  ].join('\r\n');

  return config;
};

/**
 * Parse and store attendance logs pushed from device.
 * ATTLOG format (tab-separated, one record per line):
 * PIN \t DateTime \t Status \t Verify \t WorkCode \t Reserved1 \t Reserved2
 * 
 * Example: "1\t2025-06-01 09:15:23\t0\t1\t0\t0\t0"
 */
exports.handleAttendancePush = async (serialNumber, body, stamp) => {
  const device = await BiometricDevice.findOne({ where: { serial_number: serialNumber } });
  if (!device) {
    console.warn(`[BIOMETRIC] ATTLOG from unknown device: ${serialNumber}`);
    return { count: 0, error: 'Device not registered' };
  }

  // Update heartbeat
  await device.update({ last_heartbeat: new Date() });

  // Parse ATTLOG body
  const lines = body.toString().split('\n').filter(l => l.trim());
  let savedCount = 0;
  const errors = [];

  for (const line of lines) {
    try {
      const parts = line.trim().split('\t');
      if (parts.length < 2) continue;

      const pin = parts[0]?.trim();
      const dateTimeStr = parts[1]?.trim();
      const ioMode = parseInt(parts[2] || '0');
      const verifyType = parseInt(parts[3] || '0');
      const workCode = parts[4]?.trim() || '0';
      const reserved = parts.slice(5).join('\t').trim() || null;

      if (!pin || !dateTimeStr) continue;

      const punchTime = new Date(dateTimeStr);
      if (isNaN(punchTime.getTime())) {
        errors.push(`Invalid datetime: ${dateTimeStr}`);
        continue;
      }

      // Deduplicate — skip if exact same record exists
      const [log, created] = await BiometricLog.findOrCreate({
        where: { device_serial: serialNumber, pin, punch_time: punchTime },
        defaults: {
          verify_type: verifyType,
          io_mode: ioMode,
          work_code: workCode,
          reserved,
          processed: false,
        },
      });

      if (created) savedCount++;
    } catch (err) {
      errors.push(err.message);
    }
  }

  // Update stamp so device knows we received up to this point
  if (stamp) {
    await device.update({ last_sync_stamp: stamp });
  }

  // Trigger async processing of unprocessed logs
  setImmediate(() => this.processUnprocessedLogs(serialNumber).catch(console.error));

  return { count: savedCount, errors: errors.length > 0 ? errors : undefined };
};

/**
 * Get the next pending command for a device.
 * The device polls GET /iclock/getrequest?SN=xxx periodically.
 */
exports.getNextCommand = async (serialNumber) => {
  const device = await BiometricDevice.findOne({ where: { serial_number: serialNumber } });
  if (device) {
    await device.update({ last_heartbeat: new Date() });
  }

  const cmd = await BiometricCommand.findOne({
    where: { device_serial: serialNumber, status: 'pending' },
    order: [['created_at', 'ASC']],
  });

  if (!cmd) return null;

  await cmd.update({ status: 'delivered', delivered_at: new Date() });

  return `C:${cmd.id}:${cmd.command}`;
};

/**
 * Handle device command execution result.
 */
exports.handleCommandResult = async (serialNumber, body) => {
  const lines = body.toString().split('\n').filter(l => l.trim());

  for (const line of lines) {
    const match = line.match(/^ID=(\d+)&Return=(.*)$/);
    if (match) {
      const cmdId = parseInt(match[1]);
      const result = match[2];

      await BiometricCommand.update(
        { status: result === '0' ? 'executed' : 'failed', response: result, executed_at: new Date() },
        { where: { id: cmdId, device_serial: serialNumber } }
      );
    }
  }
};

/* ═══════════════════════════════════════════════════════════════
   SECTION 2: LOG PROCESSING — Raw logs → StaffAttendance
   ═══════════════════════════════════════════════════════════════ */

/**
 * Process unprocessed biometric logs for a given device (or all).
 * 
 * Logic:
 * 1. Find unprocessed BiometricLog records
 * 2. Resolve PIN → user_id via BiometricUserMap
 * 3. Create/update StaffAttendance record with method='biometric'
 * 4. For each day per user: first punch = check_in, last punch = check_out
 */
exports.processUnprocessedLogs = async (deviceSerial = null) => {
  const where = { processed: false };
  if (deviceSerial) where.device_serial = deviceSerial;

  const logs = await BiometricLog.findAll({
    where,
    order: [['punch_time', 'ASC']],
    limit: 500, // Process in batches
  });

  if (logs.length === 0) return { processed: 0 };

  let processedCount = 0;
  let errorCount = 0;

  // Group logs by device_serial + pin + date for efficient processing
  const grouped = {};
  for (const log of logs) {
    const date = getDhakaDate(new Date(log.punch_time));
    const key = `${log.device_serial}:${log.pin}:${date}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(log);
  }

  for (const [key, dayLogs] of Object.entries(grouped)) {
    const [devSerial, pin, date] = key.split(':');

    try {
      // Resolve PIN → user_id
      const mapping = await BiometricUserMap.findOne({
        where: { device_serial: devSerial, pin, is_active: true },
      });

      if (!mapping) {
        // Mark logs with unmapped error
        await BiometricLog.update(
          { processed: true, processed_at: new Date(), process_error: `Unmapped PIN: ${pin} on device ${devSerial}` },
          { where: { id: dayLogs.map(l => l.id) } }
        );
        errorCount += dayLogs.length;
        continue;
      }

      const userId = mapping.user_id;

      // Get the device to know its branch
      const device = await BiometricDevice.findOne({ where: { serial_number: devSerial } });
      if (!device) {
        await BiometricLog.update(
          { processed: true, processed_at: new Date(), process_error: `Device not found: ${devSerial}` },
          { where: { id: dayLogs.map(l => l.id) } }
        );
        errorCount += dayLogs.length;
        continue;
      }

      // Sort punches chronologically
      dayLogs.sort((a, b) => new Date(a.punch_time) - new Date(b.punch_time));

      // Determine check_in (first punch) and check_out (last punch if different)
      const firstPunch = dayLogs[0];
      const lastPunch = dayLogs.length > 1 ? dayLogs[dayLogs.length - 1] : null;

      const checkIn = getDhakaTime(new Date(firstPunch.punch_time));
      const checkOut = lastPunch ? getDhakaTime(new Date(lastPunch.punch_time)) : null;

      // Determine status based on io_mode or time rules
      let status = 'present';

      // Check if late (configurable — default 9:30 AM threshold)
      const lateThreshold = device.settings?.late_threshold || '09:30:00';
      if (checkIn > lateThreshold) {
        status = 'late';
      }

      // Create or update StaffAttendance record (method = 'biometric')
      const [attendance, created] = await StaffAttendance.findOrCreate({
        where: { user_id: userId, date },
        defaults: {
          branch_id: device.branch_id,
          status,
          check_in: checkIn,
          check_out: checkOut,
          method: 'biometric',
          notes: `Auto-synced from device ${devSerial}`,
        },
      });

      if (!created) {
        // Only update if existing record is also biometric or if biometric should override
        const updates = {};

        // Update check_in only if earlier than existing, or no existing
        if (!attendance.check_in || checkIn < attendance.check_in) {
          updates.check_in = checkIn;
        }

        // Update check_out only if later than existing
        if (checkOut && (!attendance.check_out || checkOut > attendance.check_out)) {
          updates.check_out = checkOut;
        }

        // Update status if needed
        if (attendance.method === 'biometric' || !attendance.check_in) {
          updates.status = status;
          updates.method = 'biometric';
        }

        if (Object.keys(updates).length > 0) {
          await attendance.update(updates);
        }
      }

      // Mark all logs for this group as processed
      await BiometricLog.update(
        { processed: true, processed_at: new Date(), matched_user_id: userId, process_error: null },
        { where: { id: dayLogs.map(l => l.id) } }
      );

      processedCount += dayLogs.length;
    } catch (err) {
      console.error(`[BIOMETRIC] Error processing logs for ${key}:`, err.message);
      await BiometricLog.update(
        { processed: true, processed_at: new Date(), process_error: err.message },
        { where: { id: dayLogs.map(l => l.id) } }
      );
      errorCount += dayLogs.length;
    }
  }

  console.log(`[BIOMETRIC] Processed ${processedCount} logs, ${errorCount} errors`);
  return { processed: processedCount, errors: errorCount };
};

/**
 * Reprocess failed/unmatched logs (after admin fixes user mappings).
 */
exports.reprocessFailedLogs = async (deviceSerial = null) => {
  const where = { processed: true, process_error: { [Op.ne]: null } };
  if (deviceSerial) where.device_serial = deviceSerial;

  // Reset them to unprocessed
  const [count] = await BiometricLog.update(
    { processed: false, process_error: null, matched_user_id: null },
    { where }
  );

  if (count > 0) {
    // Trigger reprocessing
    await this.processUnprocessedLogs(deviceSerial);
  }

  return { reset: count };
};

/* ═══════════════════════════════════════════════════════════════
   SECTION 3: DEVICE MANAGEMENT HELPERS
   ═══════════════════════════════════════════════════════════════ */

/**
 * Get device health summary.
 */
exports.getDeviceHealth = async (branchId = null) => {
  const where = {};
  if (branchId) where.branch_id = branchId;

  const devices = await BiometricDevice.findAll({ where });
  const now = new Date();

  return devices.map(d => {
    const minutesSinceHeartbeat = d.last_heartbeat
      ? Math.round((now - new Date(d.last_heartbeat)) / 60000)
      : null;

    return {
      id: d.id,
      serial_number: d.serial_number,
      name: d.name,
      branch_id: d.branch_id,
      model: d.model,
      ip_address: d.ip_address,
      status: d.status,
      last_heartbeat: d.last_heartbeat,
      minutes_since_heartbeat: minutesSinceHeartbeat,
      is_online: minutesSinceHeartbeat !== null && minutesSinceHeartbeat < 10,
      firmware_version: d.firmware_version,
    };
  });
};

/**
 * Queue a command for a device.
 */
exports.queueCommand = async (deviceSerial, commandType, commandStr, userId = null) => {
  const device = await BiometricDevice.findOne({ where: { serial_number: deviceSerial } });
  if (!device) throw new Error(`Device not found: ${deviceSerial}`);

  const cmd = await BiometricCommand.create({
    device_serial: deviceSerial,
    command: commandStr,
    command_type: commandType,
    created_by: userId,
  });

  return cmd;
};

/**
 * Generate standard ADMS commands.
 */
exports.commands = {
  reboot: (serial) => exports.queueCommand(serial, 'REBOOT', 'REBOOT'),
  clearLog: (serial) => exports.queueCommand(serial, 'CLEAR_LOG', 'CLEAR LOG'),
  getInfo: (serial) => exports.queueCommand(serial, 'INFO', 'INFO'),
  setTime: (serial) => {
    const now = getDhakaDate() + ' ' + getDhakaTime();
    return exports.queueCommand(serial, 'SET_TIME', `SET OPTION DateTime=${now}`);
  },
  check: (serial) => exports.queueCommand(serial, 'CHECK', 'CHECK'),
};

/**
 * ═══════════════════════════════════════════════════════════════
 *  SECTION 4: TCP IP PULL PROTOCOL (node-zklib Integration)
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Pull attendance logs directly from a device using TCP socket (port 4370).
 * Handles mock simulation for local/testing IPs.
 */
exports.pullLogsFromDevice = async (device) => {
  const ip = device.ip_address;
  const port = device.port || 4370;

  if (!ip) {
    throw new Error(`Device ${device.serial_number} has no IP address configured.`);
  }

  // MOCK SIMULATION: For testing or local setups without a physical device connected
  if (ip === '127.0.0.1' || ip === 'mock-device' || process.env.NODE_ENV === 'test') {
    console.log(`[BIOMETRIC] [MOCK] Simulating direct pull from device ${device.serial_number} at ${ip}:${port}`);
    
    // Simulate updating heartbeat
    await device.update({ last_heartbeat: new Date(), status: 'active' });

    // Generate mock logs (e.g. employee punch simulation)
    const mockLogs = [
      { deviceUserId: '1', recordTime: new Date(new Date() - 30 * 60 * 1000).toISOString(), attacheDevice: 1, ip: 0 }, // 30m ago check-in
      { deviceUserId: '2', recordTime: new Date(new Date() - 15 * 60 * 1000).toISOString(), attacheDevice: 1, ip: 0 }, // 15m ago check-in
    ];

    let savedCount = 0;
    for (const log of mockLogs) {
      const pin = String(log.deviceUserId);
      const punchTime = new Date(log.recordTime);
      const [dbLog, created] = await BiometricLog.findOrCreate({
        where: { device_serial: device.serial_number, pin, punch_time: punchTime },
        defaults: {
          verify_type: log.attacheDevice,
          io_mode: log.ip,
          work_code: '0',
          processed: false,
        },
      });
      if (created) savedCount++;
    }

    // Trigger local processing immediately
    const processResult = await exports.processUnprocessedLogs(device.serial_number);
    return {
      pulled: mockLogs.length,
      saved: savedCount,
      processed: processResult.processed,
      isMock: true,
    };
  }

  // REAL CONNECTION: Using node-zklib
  console.log(`[BIOMETRIC] Connecting to device ${device.serial_number} at ${ip}:${port}...`);
  const ZKLib = require('node-zklib');
  const zk = new ZKLib(ip, port, 10000, 4000);

  try {
    await zk.createSocket();
    console.log(`[BIOMETRIC] Connected. Fetching attendance records...`);
    
    const zkLogs = await zk.getAttendance();
    const records = zkLogs?.data || [];
    console.log(`[BIOMETRIC] Fetched ${records.length} records from device.`);

    // Try to update firmware info and heartbeat
    try {
      const version = await zk.getFMVersion();
      await device.update({
        last_heartbeat: new Date(),
        firmware_version: version || device.firmware_version,
        status: 'active',
      });
    } catch (infoErr) {
      await device.update({ last_heartbeat: new Date(), status: 'active' });
    }

    let savedCount = 0;
    const errors = [];

    // Store in BiometricLog
    for (const log of records) {
      try {
        const pin = String(log.deviceUserId);
        const punchTime = new Date(log.recordTime);
        if (isNaN(punchTime.getTime())) continue;

        const ioMode = log.ip || 0; // standard io state field

        const [dbLog, created] = await BiometricLog.findOrCreate({
          where: { device_serial: device.serial_number, pin, punch_time: punchTime },
          defaults: {
            verify_type: log.attacheDevice || 0,
            io_mode: ioMode,
            work_code: '0',
            processed: false,
          },
        });

        if (created) savedCount++;
      } catch (err) {
        errors.push(err.message);
      }
    }

    // Clear logs on device if configured in settings
    if (device.settings?.clear_on_sync) {
      console.log(`[BIOMETRIC] Clearing attendance log on device ${device.serial_number}...`);
      await zk.clearAttendanceLog();
    }

    await zk.disconnect();

    // Trigger local processing immediately
    const processResult = await exports.processUnprocessedLogs(device.serial_number);

    return {
      pulled: records.length,
      saved: savedCount,
      processed: processResult.processed,
      errors: errors.length > 0 ? errors : undefined,
    };

  } catch (err) {
    console.error(`[BIOMETRIC] TCP connection failed for device ${device.serial_number} at ${ip}:${port}:`, err.message);
    await device.update({ status: 'offline' });
    throw err;
  }
};

/**
 * Trigger sync for a device by its system ID.
 */
exports.syncDeviceLogsById = async (deviceId) => {
  const device = await BiometricDevice.findByPk(deviceId);
  if (!device) {
    throw new Error(`Biometric device with ID ${deviceId} not found.`);
  }
  return await exports.pullLogsFromDevice(device);
};

/**
 * Background Scheduler
 * Runs periodically to pull logs from all active devices
 */
const startScheduler = () => {
  const intervalMins = 30; // Polling interval
  console.log(`[BIOMETRIC] Initializing background direct TCP pull scheduler (Interval: ${intervalMins}m)`);

  setInterval(async () => {
    try {
      const activeDevices = await BiometricDevice.findAll({
        where: { status: 'active', ip_address: { [Op.ne]: null } }
      });

      if (activeDevices.length === 0) return;

      console.log(`[BIOMETRIC] Scheduler: Syncing ${activeDevices.length} active devices...`);
      for (const device of activeDevices) {
        try {
          const res = await exports.pullLogsFromDevice(device);
          console.log(`[BIOMETRIC] Scheduler: Synced ${device.serial_number}. Pulled: ${res.pulled}, Saved: ${res.saved}`);
        } catch (syncErr) {
          console.error(`[BIOMETRIC] Scheduler: Sync failed for device ${device.serial_number}:`, syncErr.message);
        }
      }
    } catch (err) {
      console.error(`[BIOMETRIC] Scheduler execution error:`, err);
    }
  }, intervalMins * 60 * 1000);
};

// Auto-start scheduler in background
setImmediate(startScheduler);

