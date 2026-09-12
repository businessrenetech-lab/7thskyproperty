const { Op } = require('sequelize');
const SalesTask = require('../models/SalesTask');
const Property = require('../models/Property');
const Contact = require('../models/Contact');
const User = require('../models/User');
const SalesEnquiry = require('../models/SalesEnquiry');
const { asyncHandler, branchScope, resolveBranchId, pick } = require('../utils/controllerHelpers');
const { generateCode } = require('../utils/codeGenerator');

const TASK_FIELDS = [
  'title', 'description', 'task_type', 'priority', 'status',
  'due_date', 'due_time', 'property_id', 'deal_id', 'contact_id',
  'enquiry_id', 'assigned_to', 'completion_notes', 'metadata'
];

const pad = (n) => String(n).padStart(2, '0');
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

exports.listTasks = asyncHandler(async (req, res) => {
  const branch_id = resolveBranchId(req);
  const scopeWhere = { branch_id };
  const role = req.user?.role;
  const isManager = ['super_admin', 'branch_admin', 'property_manager'].includes(role);

  // Scope filter: mine vs all
  const scope = req.query.scope || (isManager ? 'all' : 'mine');
  if (scope === 'mine' || !isManager) {
    scopeWhere.assigned_to = req.user.id;
  }

  // Status filter
  const statusParam = req.query.status || 'open';
  if (statusParam === 'open') {
    scopeWhere.status = { [Op.in]: ['pending', 'in_progress'] };
  } else if (statusParam !== 'all' && statusParam) {
    scopeWhere.status = statusParam;
  }

  // Priority filter
  if (req.query.priority && req.query.priority !== 'all') {
    const priorities = req.query.priority.split(',').map((p) => p.trim());
    scopeWhere.priority = { [Op.in]: priorities };
  }

  // Task type filter
  if (req.query.task_type && req.query.task_type !== 'all') {
    scopeWhere.task_type = req.query.task_type;
  }

  // Property filter
  if (req.query.property_id) {
    scopeWhere.property_id = Number(req.query.property_id);
  }

  // Contact filter
  if (req.query.contact_id) {
    scopeWhere.contact_id = Number(req.query.contact_id);
  }

  const today = todayStr();

  // Due window filter
  if (req.query.due_window === 'today') {
    scopeWhere.due_date = today;
  } else if (req.query.due_window === 'overdue') {
    scopeWhere.due_date = { [Op.lt]: today };
    scopeWhere.status = { [Op.in]: ['pending', 'in_progress'] };
  } else if (req.query.due_window === 'upcoming') {
    scopeWhere.due_date = { [Op.gt]: today };
  } else if (req.query.due_window === 'week') {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = `${nextWeek.getFullYear()}-${pad(nextWeek.getMonth() + 1)}-${pad(nextWeek.getDate())}`;
    scopeWhere.due_date = { [Op.between]: [today, nextWeekStr] };
  }

  // Search filter
  if (req.query.search && req.query.search.trim()) {
    const q = `%${req.query.search.trim()}%`;
    scopeWhere[Op.or] = [
      { title: { [Op.like]: q } },
      { description: { [Op.like]: q } },
      { task_code: { [Op.like]: q } },
    ];
  }

  const tasks = await SalesTask.findAll({
    where: scopeWhere,
    include: [
      { model: Property, as: 'property', attributes: ['id', 'property_code', 'title', 'category', 'area', 'city'] },
      { model: Contact, as: 'contact', attributes: ['id', 'full_name', 'primary_phone', 'email'] },
      { model: User, as: 'assignee', attributes: ['id', 'name', 'email', 'role'] },
      { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
    ],
    order: [
      [
        SalesTask.sequelize.literal(`CASE 
          WHEN priority = 'urgent' THEN 1 
          WHEN priority = 'high' THEN 2 
          WHEN priority = 'medium' THEN 3 
          ELSE 4 END`),
        'ASC'
      ],
      ['due_date', 'ASC'],
      ['due_time', 'ASC'],
      ['created_at', 'DESC'],
    ],
  });

  // Calculate high-level counters for CRM dashboard view
  const baseBranchWhere = { branch_id };
  if (scope === 'mine' || !isManager) {
    baseBranchWhere.assigned_to = req.user.id;
  }

  const [totalOpen, dueToday, overdue, highPriority, completed] = await Promise.all([
    SalesTask.count({ where: { ...baseBranchWhere, status: { [Op.in]: ['pending', 'in_progress'] } } }),
    SalesTask.count({ where: { ...baseBranchWhere, status: { [Op.in]: ['pending', 'in_progress'] }, due_date: today } }),
    SalesTask.count({ where: { ...baseBranchWhere, status: { [Op.in]: ['pending', 'in_progress'] }, due_date: { [Op.lt]: today } } }),
    SalesTask.count({ where: { ...baseBranchWhere, status: { [Op.in]: ['pending', 'in_progress'] }, priority: { [Op.in]: ['urgent', 'high'] } } }),
    SalesTask.count({ where: { ...baseBranchWhere, status: 'completed' } }),
  ]);

  res.json({
    data: tasks,
    counters: {
      open: totalOpen,
      due_today: dueToday,
      overdue,
      high_priority: highPriority,
      completed,
    },
  });
});

exports.createTask = asyncHandler(async (req, res) => {
  const branch_id = resolveBranchId(req, req.body.branch_id);
  const data = pick(req.body, TASK_FIELDS);

  if (!data.title || !data.title.trim()) {
    return res.status(400).json({ error: 'Task title is required' });
  }

  const task_code = await generateCode(SalesTask, 'task_code', 'TSK-', 5);
  const task = await SalesTask.create({
    ...data,
    branch_id,
    task_code,
    created_by: req.user.id,
    assigned_to: data.assigned_to || req.user.id,
    status: data.status || 'pending',
    priority: data.priority || 'medium',
    task_type: data.task_type || 'general',
  });

  const created = await SalesTask.findByPk(task.id, {
    include: [
      { model: Property, as: 'property', attributes: ['id', 'property_code', 'title', 'category', 'area', 'city'] },
      { model: Contact, as: 'contact', attributes: ['id', 'full_name', 'primary_phone', 'email'] },
      { model: User, as: 'assignee', attributes: ['id', 'name', 'email', 'role'] },
    ],
  });

  res.status(201).json({ data: created, message: 'Task created successfully' });
});

exports.getTask = asyncHandler(async (req, res) => {
  const task = await SalesTask.findOne({
    where: { id: req.params.id, ...branchScope(req) },
    include: [
      { model: Property, as: 'property', attributes: ['id', 'property_code', 'title', 'category', 'area', 'city'] },
      { model: Contact, as: 'contact', attributes: ['id', 'full_name', 'primary_phone', 'email'] },
      { model: User, as: 'assignee', attributes: ['id', 'name', 'email', 'role'] },
      { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
    ],
  });

  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json({ data: task });
});

exports.updateTask = asyncHandler(async (req, res) => {
  const task = await SalesTask.findOne({
    where: { id: req.params.id, ...branchScope(req) },
  });

  if (!task) return res.status(404).json({ error: 'Task not found' });

  const data = pick(req.body, TASK_FIELDS);

  if (data.status === 'completed' && task.status !== 'completed') {
    data.completed_at = new Date();
    data.completed_by = req.user.id;
  } else if (data.status && data.status !== 'completed' && task.status === 'completed') {
    data.completed_at = null;
    data.completed_by = null;
  }

  await task.update(data);

  const updated = await SalesTask.findByPk(task.id, {
    include: [
      { model: Property, as: 'property', attributes: ['id', 'property_code', 'title', 'category', 'area', 'city'] },
      { model: Contact, as: 'contact', attributes: ['id', 'full_name', 'primary_phone', 'email'] },
      { model: User, as: 'assignee', attributes: ['id', 'name', 'email', 'role'] },
    ],
  });

  res.json({ data: updated, message: 'Task updated successfully' });
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'in_progress', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const task = await SalesTask.findOne({
    where: { id: req.params.id, ...branchScope(req) },
  });

  if (!task) return res.status(404).json({ error: 'Task not found' });

  const updateData = { status };
  if (status === 'completed') {
    updateData.completed_at = new Date();
    updateData.completed_by = req.user.id;
  } else {
    updateData.completed_at = null;
    updateData.completed_by = null;
  }

  await task.update(updateData);
  res.json({ data: task, message: `Task status updated to ${status}` });
});

exports.deleteTask = asyncHandler(async (req, res) => {
  const task = await SalesTask.findOne({
    where: { id: req.params.id, ...branchScope(req) },
  });

  if (!task) return res.status(404).json({ error: 'Task not found' });

  await task.destroy();
  res.json({ message: 'Task deleted successfully' });
});
