const { Op } = require('sequelize');
const P = require('../models/waterTankProviders');

const num = (value) => Number(value || 0);
const asArray = (value) => {
  let out = value;
  for (let i = 0; i < 3 && typeof out === 'string'; i++) { try { out = JSON.parse(out); } catch { return []; } }
  return Array.isArray(out) ? out : [];
};
const roundMoney = (value) => Math.round((num(value) + Number.EPSILON) * 100) / 100;
const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

async function getActiveAgreement(provider, atDate = localDate(), options = {}) {
  const where = {
    branch_id: provider.branch_id,
    provider_id: provider.id,
    status: 'Completed',
    effective_date: { [Op.lte]: atDate },
    [Op.or]: [{ expiry_date: null }, { expiry_date: { [Op.gte]: atDate } }],
  };
  if (provider.active_agreement_id) where.id = provider.active_agreement_id;
  let agreement = await P.WtProviderAgreement.findOne({ where, order: [['version_no', 'DESC']], transaction: options.transaction });
  if (!agreement && provider.active_agreement_id) {
    delete where.id;
    agreement = await P.WtProviderAgreement.findOne({ where, order: [['version_no', 'DESC']], transaction: options.transaction });
  }
  if (!agreement) return null;
  const rates = await P.WtProviderAgreementRate.findAll({
    where: { branch_id: provider.branch_id, provider_id: provider.id, agreement_id: agreement.id, rate_status: 'Approved' },
    transaction: options.transaction, raw: true,
  });
  return { agreement, rates };
}

async function calculateWorkOrderFees(provider, workOrder, options = {}) {
  const active = await getActiveAgreement(provider, options.atDate, options);
  if (!active) {
    const error = new Error('No active completed provider agreement covers the assignment date.');
    error.code = 'NO_ACTIVE_AGREEMENT';
    throw error;
  }
  const lines = asArray(workOrder.lines);
  if (!lines.length) {
    const error = new Error('The work order has no coded service lines to price from the provider agreement.');
    error.code = 'NO_CODED_LINES';
    throw error;
  }
  const rates = new Map(active.rates.map((rate) => [String(rate.service_code).toUpperCase(), rate]));
  const matched = [];
  const unmatched = [];
  for (const line of lines) {
    const code = String(line.code || line.service_code || '').trim().toUpperCase();
    const rate = rates.get(code);
    if (!code || !rate) {
      unmatched.push({ code: code || null, name: line.name || line.description || 'Custom line' });
      continue;
    }
    const quantity = num(line.qty ?? line.quantity) || 1;
    const agreedRate = num(rate.agreed_rate);
    matched.push({
      code, name: rate.service_name, unit: rate.unit, quantity,
      standard_rate: num(rate.standard_rate), agreed_rate: agreedRate,
      amount: roundMoney(agreedRate * quantity), rate_id: rate.id,
    });
  }
  if (unmatched.length) {
    const error = new Error(`The active provider agreement does not price ${unmatched.length} work-order line(s).`);
    error.code = 'UNMATCHED_RATES';
    error.unmatched = unmatched;
    throw error;
  }
  const gross = roundMoney(matched.reduce((sum, line) => sum + line.amount, 0));
  const commissionPct = num(active.agreement.commission_pct);
  const commission = roundMoney(gross * commissionPct / 100);
  const net = roundMoney(Math.max(0, gross - commission));
  return {
    agreement: active.agreement,
    snapshot: matched,
    gross_provider_charge: gross,
    commission_pct: commissionPct,
    commission_amount: commission,
    net_provider_payable: net,
  };
}

module.exports = { getActiveAgreement, calculateWorkOrderFees, asArray, roundMoney };
