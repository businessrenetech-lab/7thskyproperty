/**
 * Debug script to trace reconciliation double-counting for branch-level users.
 * 
 * Hypothesis: When a branch admin logs in, the "expected closing balance" shows
 * double the actual income because transactions are being counted twice — once
 * by the raw Transaction query in buildLiquidityRows, and once via a
 * LiquidityMovement that was auto-created by the same flow.
 */
const path = require('path');
const backendDir = path.join(__dirname, '..', 'backend');
require('dotenv').config({ path: path.join(backendDir, '.env') });
// Resolve sequelize from backend's own node_modules
const sequelize = require(path.join(backendDir, 'config', 'db.config'));
const Transaction = require(path.join(backendDir, 'models', 'Transaction'));
const Expense = require(path.join(backendDir, 'models', 'Expense'));
const Account = require(path.join(backendDir, 'models', 'Account'));
const LiquidityMovement = require(path.join(backendDir, 'models', 'LiquidityMovement'));
const { Op } = require(path.join(backendDir, 'node_modules', 'sequelize'));

// === CONFIG: Set your Mirpur branch ID here ===
const MIRPUR_BRANCH_ID = process.argv[2] ? parseInt(process.argv[2]) : null;
const TARGET_DATE = process.argv[3] || new Date().toISOString().split('T')[0]; // today

async function run() {
  await sequelize.authenticate();

  // If no branch ID given, find branches
  if (!MIRPUR_BRANCH_ID) {
    const Branch = require(path.join(backendDir, 'models', 'Branch'));
    const branches = await Branch.findAll({ attributes: ['id', 'name', 'type'], raw: true });
    console.log('\n=== ALL BRANCHES ===');
    console.table(branches);
    console.log('\nUsage: node debug-recon.js <branch_id> [date]');
    console.log('Example: node debug-recon.js 2 2026-05-09');
    process.exit(0);
  }

  console.log(`\n🔍 DEBUG Reconciliation for Branch ID: ${MIRPUR_BRANCH_ID}, Date: ${TARGET_DATE}\n`);

  // Step 1: Get liquid accounts for this branch
  const liquidAccounts = await Account.findAll({
    where: {
      branch_id: MIRPUR_BRANCH_ID,
      type: 'asset',
      is_active: true,
      [Op.or]: [
        { code: { [Op.like]: '10%' } },
        { sub_type: { [Op.in]: ['cash', 'bank', 'mfs'] } }
      ]
    },
    order: [['code', 'ASC']],
    raw: true
  });
  console.log('=== LIQUID ACCOUNTS (branch filtered) ===');
  console.table(liquidAccounts.map(a => ({ id: a.id, code: a.code, name: a.name, sub_type: a.sub_type })));

  const accountIds = liquidAccounts.map(a => a.id);

  // Step 2: Get transactions for the date
  const transactions = await Transaction.findAll({
    where: {
      branch_id: MIRPUR_BRANCH_ID,
      status: 'success',
      account_id: { [Op.in]: accountIds },
      paid_at: { [Op.lte]: `${TARGET_DATE} 23:59:59` }
    },
    attributes: ['id', 'amount', 'method', 'account_id', 'receipt_no', 'paid_at', 'source'],
    order: [['paid_at', 'ASC']],
    raw: true
  });
  console.log(`\n=== TRANSACTIONS (${transactions.length} found, up to ${TARGET_DATE}) ===`);
  
  // Filter for just the target date
  const todayTx = transactions.filter(tx => {
    const txDate = new Date(tx.paid_at).toISOString().split('T')[0];
    return txDate === TARGET_DATE;
  });
  console.log(`Today (${TARGET_DATE}) transactions: ${todayTx.length}`);
  if (todayTx.length > 0) {
    console.table(todayTx.map(tx => ({
      id: tx.id,
      amount: Number(tx.amount),
      method: tx.method,
      account_id: tx.account_id,
      receipt: tx.receipt_no,
      source: tx.source
    })));
  }
  const todayTxTotal = todayTx.reduce((s, tx) => s + Number(tx.amount), 0);
  console.log(`Today transaction total: ${todayTxTotal}`);

  // Step 3: Get expenses for the date
  const expenses = await Expense.findAll({
    where: {
      branch_id: MIRPUR_BRANCH_ID,
      account_id: { [Op.in]: accountIds },
      status: 'approved',
      date: { [Op.lte]: TARGET_DATE }
    },
    attributes: ['id', 'amount', 'account_id', 'category', 'date', 'payment_method'],
    order: [['date', 'ASC']],
    raw: true
  });
  const todayExp = expenses.filter(e => e.date === TARGET_DATE);
  console.log(`\n=== EXPENSES Today (${todayExp.length} found) ===`);
  if (todayExp.length > 0) {
    console.table(todayExp.map(e => ({
      id: e.id,
      amount: Number(e.amount),
      account_id: e.account_id,
      category: e.category
    })));
  }

  // Step 4: Get LiquidityMovements for the date
  const movements = await LiquidityMovement.findAll({
    where: {
      branch_id: MIRPUR_BRANCH_ID,
      account_id: { [Op.in]: accountIds },
      movement_date: { [Op.lte]: TARGET_DATE }
    },
    attributes: ['id', 'account_id', 'movement_date', 'transaction_type', 'direction', 'amount', 'actual_balance', 'variance_amount', 'previous_balance', 'new_balance', 'source_model', 'source_id', 'reference'],
    order: [['movement_date', 'ASC'], ['id', 'ASC']],
    raw: true
  });
  const todayMov = movements.filter(m => m.movement_date === TARGET_DATE);
  console.log(`\n=== LIQUIDITY MOVEMENTS Today (${todayMov.length} found) ===`);
  if (todayMov.length > 0) {
    console.table(todayMov.map(m => ({
      id: m.id,
      account_id: m.account_id,
      type: m.transaction_type,
      direction: m.direction,
      amount: Number(m.amount),
      actual_balance: Number(m.actual_balance || 0),
      variance: Number(m.variance_amount || 0),
      prev_bal: Number(m.previous_balance || 0),
      new_bal: Number(m.new_balance || 0),
      source: m.source_model,
      source_id: m.source_id,
      ref: m.reference
    })));
  }

  // Step 5: ALL historical movements for context
  console.log(`\n=== ALL HISTORICAL MOVEMENTS (${movements.length} total) ===`);
  if (movements.length > 0 && movements.length <= 30) {
    console.table(movements.map(m => ({
      id: m.id,
      date: m.movement_date,
      account_id: m.account_id,
      type: m.transaction_type,
      direction: m.direction,
      amount: Number(m.amount),
      actual_balance: Number(m.actual_balance || 0),
      prev_bal: Number(m.previous_balance || 0),
      new_bal: Number(m.new_balance || 0),
      ref: m.reference
    })));
  } else if (movements.length > 30) {
    console.log(`(Too many to show, showing last 20)`);
    console.table(movements.slice(-20).map(m => ({
      id: m.id,
      date: m.movement_date,
      account_id: m.account_id,
      type: m.transaction_type,
      direction: m.direction,
      amount: Number(m.amount),
      actual_balance: Number(m.actual_balance || 0),
      prev_bal: Number(m.previous_balance || 0),
      new_bal: Number(m.new_balance || 0),
      ref: m.reference
    })));
  }

  // Step 6: CRITICAL CHECK — simulate buildLiquidityRows running balance
  console.log('\n=== SIMULATING buildLiquidityRows RUNNING BALANCE ===');
  const allRows = [];

  // Add tx rows
  transactions.forEach(tx => {
    const bdTime = new Date(new Date(tx.paid_at).getTime() + 6 * 60 * 60 * 1000);
    const dateStr = bdTime.getUTCFullYear() + '-' + String(bdTime.getUTCMonth() + 1).padStart(2, '0') + '-' + String(bdTime.getUTCDate()).padStart(2, '0');
    allRows.push({
      unique_key: `tx-${tx.id}`,
      account_id: tx.account_id,
      movement_date: dateStr,
      event_time: new Date(tx.paid_at).getTime(),
      direction: 'inflow',
      amount: Number(tx.amount),
      transaction_type: 'collection',
      actual_balance: 0,
      source: 'Transaction'
    });
  });

  // Add expense rows
  expenses.forEach(exp => {
    allRows.push({
      unique_key: `expense-${exp.id}`,
      account_id: exp.account_id,
      movement_date: exp.date,
      event_time: new Date(exp.date).getTime(),
      direction: 'outflow',
      amount: Number(exp.amount),
      transaction_type: 'expense',
      actual_balance: 0,
      source: 'Expense'
    });
  });

  // Add movement rows
  movements.forEach(m => {
    allRows.push({
      unique_key: `manual-${m.id}`,
      account_id: m.account_id,
      movement_date: m.movement_date,
      event_time: new Date(m.created_at || m.movement_date).getTime(),
      direction: m.direction,
      amount: Number(m.amount),
      transaction_type: m.transaction_type,
      actual_balance: Number(m.actual_balance || 0),
      source: 'LiquidityMovement'
    });
  });

  allRows.sort((a, b) => {
    if (a.movement_date !== b.movement_date) return a.movement_date.localeCompare(b.movement_date);
    if (a.event_time !== b.event_time) return a.event_time - b.event_time;
    return a.unique_key.localeCompare(b.unique_key);
  });

  // Run the balance simulation per-account
  for (const acc of liquidAccounts) {
    const accRows = allRows.filter(r => r.account_id === acc.id);
    if (accRows.length === 0) continue;

    console.log(`\n--- Account: ${acc.name} (ID=${acc.id}, code=${acc.code}) ---`);
    let balance = 0;
    const trace = [];

    accRows.forEach(row => {
      const prevBalance = balance;
      const signed = row.direction === 'inflow' ? row.amount : row.direction === 'outflow' ? -row.amount : 0;
      if (row.transaction_type === 'closing_submission') {
        balance = row.actual_balance;
      } else {
        balance = prevBalance + signed;
      }
      trace.push({
        key: row.unique_key.substring(0, 25),
        date: row.movement_date,
        type: row.transaction_type,
        dir: row.direction,
        amount: row.amount,
        prev: prevBalance,
        new_bal: balance,
        source: row.source
      });
    });

    // Show trace (last 30 rows if too many)
    const showTrace = trace.length > 30 ? trace.slice(-30) : trace;
    if (trace.length > 30) console.log(`  (showing last 30 of ${trace.length})`);
    console.table(showTrace);
    console.log(`  Final balance: ${balance}`);

    // CHECK FOR DOUBLE COUNTING: Look for Transaction rows that overlap with LiquidityMovement
    const txIds = new Set(accRows.filter(r => r.source === 'Transaction').map(r => r.unique_key.replace('tx-', '')));
    const movSourceIds = accRows
      .filter(r => r.source === 'LiquidityMovement' && r.transaction_type !== 'closing_submission' && r.transaction_type !== 'opening_balance' && r.transaction_type !== 'opening_adjustment')
      .map(r => r.unique_key);

    // Check if any LiquidityMovement has source_id matching a transaction ID
    const overlappingMovements = movements.filter(m =>
      m.account_id === acc.id &&
      m.source_model === 'Transaction' &&
      txIds.has(String(m.source_id))
    );

    if (overlappingMovements.length > 0) {
      console.log(`  ⚠️ DOUBLE COUNTING DETECTED! ${overlappingMovements.length} LiquidityMovements reference same Transaction IDs`);
      console.table(overlappingMovements.map(m => ({ id: m.id, source_id: m.source_id, amount: Number(m.amount), type: m.transaction_type })));
    }
  }

  // Step 7: Check if yesterday had a closing
  const yesterday = new Date(new Date(TARGET_DATE).getTime() - 86400000).toISOString().split('T')[0];
  const yesterdayClosings = await LiquidityMovement.findAll({
    where: {
      branch_id: MIRPUR_BRANCH_ID,
      transaction_type: 'closing_submission',
      movement_date: yesterday,
      account_id: { [Op.in]: accountIds }
    },
    attributes: ['id', 'account_id', 'actual_balance', 'previous_balance', 'new_balance', 'variance_amount'],
    raw: true
  });
  console.log(`\n=== YESTERDAY (${yesterday}) CLOSING SUBMISSIONS ===`);
  if (yesterdayClosings.length > 0) {
    console.table(yesterdayClosings.map(c => ({
      id: c.id,
      account_id: c.account_id,
      actual_balance: Number(c.actual_balance),
      prev_bal: Number(c.previous_balance),
      new_bal: Number(c.new_balance),
      variance: Number(c.variance_amount)
    })));
  } else {
    console.log('  No closing submissions found for yesterday.');
  }

  await sequelize.close();
}

run().catch(err => {
  console.error('DEBUG SCRIPT ERROR:', err);
  process.exit(1);
});
