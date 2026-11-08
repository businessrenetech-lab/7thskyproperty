/**
 * Raising HR change requests and writing history rows (shared by the organisation, employee and recruitment
 * controllers). The rules live in hrApproval.service.js; this file only stores their results.
 */
const sequelize = require('../config/db.config');
const { HrChangeRequest, HrHistory } = require('../models/hrChange');
const { chainFor, pendingConflict, diffToHistory } = require('./hrApproval.service');
const { nextCode } = require('./hrOrg.service');

const conflictError = () => Object.assign(new Error('A change to this is already waiting for approval'), { status: 409 });

/** Create a pending request. Throws 409 when a pending request already changes the same thing. */
const raise = async (req, { kind, entity_type, entity_id = null, payload = {}, before = {}, reason = null }) => {
  if (entity_id != null) {
    const pending = await HrChangeRequest.findAll({ where: { entity_type, entity_id, status: 'pending' } });
    if (pendingConflict(kind, entity_type, entity_id, pending.map((p) => p.get({ plain: true })))) throw conflictError();
  }
  return sequelize.transaction(async (transaction) => {
    const last = await HrChangeRequest.findOne({ order: [['id', 'DESC']], attributes: ['code'], transaction, lock: transaction.LOCK.UPDATE });
    return HrChangeRequest.create({
      branch_id: req.user.branch_id || null,
      code: nextCode('HCR-', last ? last.code : null),
      kind, entity_type, entity_id, payload, before, reason,
      chain: chainFor(kind).map((role) => ({ role })),
      step: 0, status: 'pending', requested_by: req.user.id,
    }, { transaction });
  });
};

/** Write one history row per changed field. */
const logHistory = (req, entity_type, entity_id, before, after, { change_request_id = null, transaction } = {}) => {
  const rows = diffToHistory(before, after, {
    branch_id: req.user ? req.user.branch_id || null : null, entity_type, entity_id, change_request_id,
    actor_id: req.user ? req.user.id : null, at: new Date(),
  });
  return rows.length ? HrHistory.bulkCreate(rows, { transaction }) : Promise.resolve([]);
};

module.exports = { raise, logHistory };
