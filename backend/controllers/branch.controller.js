const Branch = require('../models/Branch');
const User = require('../models/User');
const Student = require('../models/Student');
const StaffProfile = require('../models/StaffProfile');
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const Contact = require('../models/Contact');
const Lead = require('../models/Lead');
const Asset = require('../models/Asset');
const { ensureAssetSchema } = require('../utils/assetSchema');
const Account = require('../models/Account');
const Expense = require('../models/Expense');
const Invoice = require('../models/Invoice');
const JournalEntry = require('../models/JournalEntry');
const JournalLine = require('../models/JournalLine');
const Transaction = require('../models/Transaction');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/db.config');
const { Op } = require('sequelize');
const { uniqueSlug } = require('../utils/slug');

const branchEditableFields = [
  'name', 'address', 'phone', 'email', 'manager_id',
  'public_title', 'public_description', 'seo_title', 'seo_description',
  'hero_image_url', 'opening_hours', 'map_url', 'coming_soon_message'
];

const applyBranchFields = (branch, body) => {
  branchEditableFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      branch[field] = body[field] === '' ? null : body[field];
    }
  });
};

// ─── GET ALL BRANCHES ──────────────────────────────────────────
exports.getAllBranches = async (req, res) => {
  try {
    const user = req.user;
    let whereClause = {};

    // branch_admin can only see their own branch
    if (user.role === 'branch_admin') {
      whereClause.id = user.branch_id;
    }

    const branches = await Branch.findAll({
      where: whereClause,
      include: [{ model: User, as: 'Manager', attributes: ['id', 'name', 'email'] }],
      order: [['type', 'ASC'], ['name', 'ASC']]
    });

    // Attach quick counts for the overview cards
    const enriched = await Promise.all(branches.map(async (branch) => {
      const b = branch.toJSON();
      const bid = branch.id;
      const [studentCount, staffCount, courseCount, leadCount] = await Promise.all([
        Student.count({ where: { branch_id: bid } }),
        StaffProfile.count({ where: { branch_id: bid } }),
        Course.count({ where: { branch_id: bid } }),
        Lead.count({ where: { branch_id: bid } }),
      ]);
      return { ...b, studentCount, staffCount, courseCount, leadCount };
    }));

    res.json(enriched);
  } catch (error) {
    console.error('getAllBranches error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ─── CREATE BRANCH + ADMIN USER ────────────────────────────────
exports.createBranch = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name, code, address, phone, email, admin_name, admin_email, admin_password } = req.body;
    const slug = await uniqueSlug(Branch, req.body.slug || name, { fallback: 'branch' });

    const branch = await Branch.create({
      name, code, slug, type: 'branch', address, phone, email, is_active: true,
      public_title: req.body.public_title || null,
      public_description: req.body.public_description || null,
      seo_title: req.body.seo_title || null,
      seo_description: req.body.seo_description || null,
      hero_image_url: req.body.hero_image_url || null,
      opening_hours: req.body.opening_hours || null,
      map_url: req.body.map_url || null,
      coming_soon_message: req.body.coming_soon_message || null,
    }, { transaction: t });

    const hashedPassword = await bcrypt.hash(admin_password, 10);
    const adminUser = await User.create({
      name: admin_name || `${name} Admin`,
      email: admin_email || email,
      password: hashedPassword,
      role: 'branch_admin',
      branch_id: branch.id,
      status: 'active'
    }, { transaction: t });

    branch.manager_id = adminUser.id;
    await branch.save({ transaction: t });

    await t.commit();
    res.status(201).json({ branch, user: { id: adminUser.id, name: adminUser.name, email: adminUser.email } });
  } catch (error) {
    await t.rollback();
    console.error('createBranch error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ─── UPDATE BRANCH ─────────────────────────────────────────────
exports.updateBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findByPk(id);
    if (!branch) return res.status(404).json({ error: 'Branch not found' });

    // branch_admin can only update their own branch
    if (req.user.role === 'branch_admin' && req.user.branch_id !== branch.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    applyBranchFields(branch, req.body);
    if (Object.prototype.hasOwnProperty.call(req.body, 'slug')) {
      branch.slug = await uniqueSlug(Branch, req.body.slug || branch.name, { fallback: 'branch', excludeId: branch.id });
    } else if (!branch.slug) {
      branch.slug = await uniqueSlug(Branch, branch.name, { fallback: 'branch', excludeId: branch.id });
    }

    await branch.save();
    res.json(branch);
  } catch (error) {
    console.error('updateBranch error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.uploadBranchImage = async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findByPk(id);
    if (!branch) return res.status(404).json({ error: 'Branch not found' });

    if (req.user.role === 'branch_admin' && req.user.branch_id !== branch.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!req.file) return res.status(400).json({ error: 'No image file provided' });

    const url = `/uploads/branches/${req.file.filename}`;
    branch.hero_image_url = url;
    await branch.save();

    res.json({ url, branch });
  } catch (error) {
    console.error('uploadBranchImage error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ─── SOFT-DELETE (DEACTIVATE) BRANCH ───────────────────────────
// Student data is preserved. Only the branch entity is deactivated.
exports.deactivateBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findByPk(id);
    if (!branch) return res.status(404).json({ error: 'Branch not found' });
    if (branch.type === 'head') return res.status(400).json({ error: 'Cannot deactivate the head branch' });

    branch.is_active = false;
    await branch.save();

    // Deactivate branch users (not students — their data is preserved)
    await User.update(
      { status: 'inactive' },
      { where: { branch_id: id, role: { [Op.notIn]: ['student'] } } }
    );

    res.json({ message: 'Branch deactivated. Student data preserved.', branch });
  } catch (error) {
    console.error('deactivateBranch error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ─── TOGGLE BRANCH STATUS ──────────────────────────────────────
exports.toggleBranchStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findByPk(id);
    if (!branch) return res.status(404).json({ error: 'Branch not found' });

    branch.is_active = !branch.is_active;
    await branch.save();
    res.json(branch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── BRANCH SUMMARY (AGGREGATE STATS) ────────────────────────
exports.getBranchSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findByPk(id, {
      include: [{ model: User, as: 'Manager', attributes: ['id', 'name', 'email'] }]
    });
    if (!branch) return res.status(404).json({ error: 'Branch not found' });

    const bid = parseInt(id);
    const w = { branch_id: bid };

    const [
      studentCount, activeStudents, staffCount, courseCount, batchCount,
      leadCount, contactCount, assetCount
    ] = await Promise.all([
      Student.count({ where: w }),
      Student.count({ where: { ...w, status: 'active' } }),
      StaffProfile.count({ where: w }),
      Course.count({ where: w }),
      Batch.count({ where: w }),
      Lead.count({ where: w }),
      Contact.count({ where: w }),
      Asset.count({ where: w }),
    ]);

    // Financial aggregates
    let revenue = 0, expenses = 0, bankBalance = 0, cashBalance = 0;
    try {
      revenue = await JournalLine.sum('credit', {
        include: [{ model: Account, where: { ...w, type: 'revenue' }, attributes: [] }]
      }) || 0;
      expenses = await JournalLine.sum('debit', {
        include: [{ model: Account, where: { ...w, type: 'expense' }, attributes: [] }]
      }) || 0;

      const liquidAccounts = await Account.findAll({
        where: { ...w, type: 'asset', sub_type: { [Op.in]: ['bank', 'cash'] } },
        attributes: ['sub_type', [sequelize.fn('SUM', sequelize.col('balance')), 'total']],
        group: ['sub_type'],
        raw: true
      });
      liquidAccounts.forEach(a => {
        if (a.sub_type === 'bank') bankBalance = parseFloat(a.total) || 0;
        if (a.sub_type === 'cash') cashBalance = parseFloat(a.total) || 0;
      });
    } catch (e) { /* accounting tables may not have data yet */ }

    res.json({
      branch,
      stats: {
        studentCount, activeStudents, staffCount, courseCount, batchCount,
        leadCount, contactCount, assetCount,
        revenue, expenses, netProfit: revenue - expenses,
        bankBalance, cashBalance
      }
    });
  } catch (error) {
    console.error('getBranchSummary error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ─── BRANCH STUDENTS ──────────────────────────────────────────
exports.getBranchStudents = async (req, res) => {
  try {
    const students = await Student.findAll({
      where: { branch_id: req.params.id },
      include: [
        { model: User, attributes: ['id', 'name', 'email', 'status'] },
        { model: Batch, attributes: ['id', 'name', 'start_date'] }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json(students);
  } catch (error) {
    console.error('getBranchStudents error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ─── BRANCH STAFF ──────────────────────────────────────────────
exports.getBranchStaff = async (req, res) => {
  try {
    const staff = await StaffProfile.findAll({
      where: { branch_id: req.params.id },
      include: [{ model: User, attributes: ['id', 'name', 'email', 'role', 'status'] }],
      order: [['created_at', 'DESC']]
    });
    res.json(staff);
  } catch (error) {
    console.error('getBranchStaff error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ─── BRANCH COURSES + BATCHES ──────────────────────────────────
exports.getBranchCourses = async (req, res) => {
  try {
    const courses = await Course.findAll({
      where: { branch_id: req.params.id },
      include: [{ model: Batch, attributes: ['id', 'name', 'start_date', 'status'] }],
      order: [['created_at', 'DESC']]
    });
    res.json(courses);
  } catch (error) {
    console.error('getBranchCourses error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ─── BRANCH CONTACTS / LEADS ──────────────────────────────────
exports.getBranchContacts = async (req, res) => {
  try {
    const [contacts, leads] = await Promise.all([
      Contact.findAll({
        where: { branch_id: req.params.id },
        order: [['created_at', 'DESC']],
        limit: 200
      }),
      Lead.findAll({
        where: { branch_id: req.params.id },
        order: [['created_at', 'DESC']],
        limit: 200
      })
    ]);
    res.json({ contacts, leads });
  } catch (error) {
    console.error('getBranchContacts error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ─── BRANCH ASSETS ─────────────────────────────────────────────
exports.getBranchAssets = async (req, res) => {
  try {
    await ensureAssetSchema();
    const assets = await Asset.findAll({
      where: { branch_id: req.params.id },
      order: [['created_at', 'DESC']]
    });
    res.json(assets);
  } catch (error) {
    console.error('getBranchAssets error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ─── BRANCH ACCOUNTING ────────────────────────────────────────
exports.getBranchAccounting = async (req, res) => {
  try {
    const bid = parseInt(req.params.id);
    const w = { branch_id: bid };

    const [accounts, expenses, invoices, journals] = await Promise.all([
      Account.findAll({ where: w, order: [['type', 'ASC'], ['name', 'ASC']] }),
      Expense.findAll({ where: w, order: [['created_at', 'DESC']], limit: 100 }),
      Invoice.findAll({ where: w, order: [['created_at', 'DESC']], limit: 100 }),
      JournalEntry.findAll({
        where: w,
        include: [{ model: JournalLine, include: [{ model: Account, attributes: ['name', 'type'] }] }],
        order: [['created_at', 'DESC']],
        limit: 100
      })
    ]);

    // Compute actual balance from journal ledger for each account
    const computeBalance = async (accountId) => {
      const debit = await JournalLine.sum('debit', { where: { account_id: accountId } }) || 0;
      const credit = await JournalLine.sum('credit', { where: { account_id: accountId } }) || 0;
      return debit - credit;
    };

    // Bank & Cash accounts with computed balance
    const bankCashRaw = accounts.filter(a => a.type === 'asset' && ['bank', 'cash'].includes(a.sub_type));
    const bankCash = await Promise.all(bankCashRaw.map(async (a) => {
      const balance = await computeBalance(a.id);
      return { ...a.toJSON(), balance };
    }));

    // Income accounts with computed balance
    const incomeRaw = accounts.filter(a => a.type === 'revenue');
    const incomeAccounts = await Promise.all(incomeRaw.map(async (a) => {
      const credit = await JournalLine.sum('credit', { where: { account_id: a.id } }) || 0;
      return { ...a.toJSON(), balance: credit };
    }));

    // Expense accounts with computed balance
    const expenseRaw = accounts.filter(a => a.type === 'expense');
    const expenseAccounts = await Promise.all(expenseRaw.map(async (a) => {
      const debit = await JournalLine.sum('debit', { where: { account_id: a.id } }) || 0;
      return { ...a.toJSON(), balance: debit };
    }));

    res.json({
      bankCash,
      incomeAccounts,
      expenseAccounts,
      expenses,
      invoices,
      journals,
      allAccounts: accounts
    });
  } catch (error) {
    console.error('getBranchAccounting error:', error);
    res.status(500).json({ error: error.message });
  }
};
