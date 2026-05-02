const sequelize = require('./config/db.config.js');
const Invoice = require('./models/Invoice');
const Transaction = require('./models/Transaction');
const Expense = require('./models/Expense');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Sample Invoice:', await Invoice.findAll({attributes: ['id', 'branch_id', 'status', 'amount', 'paid'], limit: 5, raw: true}));
    console.log('Sample Transaction:', await Transaction.findAll({attributes: ['id', 'branch_id', 'status', 'amount'], limit: 5, raw: true}));
    console.log('Sample Expense:', await Expense.findAll({attributes: ['id', 'branch_id', 'amount'], limit: 5, raw: true}));
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
run();
