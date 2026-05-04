const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Branch = require('../models/Branch');
const { getTableColumns, hasColumn, pickExisting } = require('../utils/schemaSafe');

const getUserAttributes = async () => {
  const columns = await getTableColumns('users');
  const attributes = ['id', 'name', 'email', 'role', 'branch_id'];
  if (hasColumn(columns, 'status')) attributes.push('status');
  return attributes;
};

const getBranchInclude = async () => {
  const columns = await getTableColumns('branches');
  if (!columns) return [];
  return [{ model: Branch, attributes: pickExisting(columns, ['id', 'name', 'code', 'type']) }];
};

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Initial fetch to get the user and role
    let user = await User.findOne({ 
      where: { id: decoded.id },
      attributes: await getUserAttributes(),
      include: await getBranchInclude()
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // If student, include student profile for premium status
    if (user.role === 'student') {
      const Student = require('../models/Student');
      const studentColumns = await getTableColumns('students');
      user = await User.findOne({
        where: { id: user.id },
        attributes: await getUserAttributes(),
        include: [
          ...(await getBranchInclude()),
          ...(studentColumns ? [{ model: Student, attributes: pickExisting(studentColumns, ['id', 'user_id', 'branch_id', 'plan_type', 'premium_expiry_date', 'status']) }] : [])
        ]
      });
    }

    req.user = user;
    req.branchId = user.branch_id;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid authentication token' });
  }
};

const roleMiddleware = (roles) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};

// Aliases for better readability in routes
const protect = authMiddleware;
const authorize = roleMiddleware;

module.exports = { authMiddleware, roleMiddleware, protect, authorize };
