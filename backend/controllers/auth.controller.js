const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Branch = require('../models/Branch');
const { getTableColumns, hasColumn } = require('../utils/schemaSafe');

const ASSIGNABLE_ROLES = ['super_admin', 'branch_admin', 'counselor', 'trainer', 'accounts', 'hr', 'staff', 'unassigned'];
const BRANCH_ADMIN_ROLES = ['counselor', 'trainer', 'accounts', 'hr', 'staff', 'unassigned'];
const AUTH_COOKIE_NAME = 'la_admin_token';
const AUTH_TOKEN_TTL = '7d';
const AUTH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const getAuthCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: AUTH_COOKIE_MAX_AGE,
});

const clearAuthCookie = (res) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
};

// H4 Fix: Password strength validation
const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  return null; // valid
};

// M5 Fix: Safe user attributes that never include password hash
const BASE_SAFE_USER_ATTRIBUTES = ['id', 'name', 'email', 'role', 'branch_id'];

const getSafeUserAttributes = async (includePassword = false) => {
  const columns = await getTableColumns('users');
  const attributes = [...BASE_SAFE_USER_ATTRIBUTES];
  if (hasColumn(columns, 'status')) attributes.push('status');
  if (includePassword) attributes.push('password');
  return attributes;
};

const canAssignRole = (actor, role) => {
  if (!ASSIGNABLE_ROLES.includes(role)) return false;
  if (actor.role === 'super_admin') return true;
  return BRANCH_ADMIN_ROLES.includes(role);
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, branch_id, role } = req.body;

    // H2 Fix: Input validation
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }
    if (name.length > 100 || email.length > 255) {
      return res.status(400).json({ error: 'Name or email exceeds maximum length.' });
    }

    const requestedRole = role || 'unassigned';

    if (!canAssignRole(req.user, requestedRole)) {
      return res.status(403).json({ error: 'You cannot assign that role.' });
    }

    const targetBranchId = req.user.role === 'super_admin' ? branch_id : req.user.branch_id;
    if (!targetBranchId) {
      return res.status(400).json({ error: 'branch_id is required.' });
    }

    // Check for duplicate email
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const rawPassword = password || require('crypto').randomBytes(16).toString('hex');

    // H4 Fix: Validate password strength (only if user-provided)
    if (password) {
      const pwError = validatePassword(password);
      if (pwError) {
        return res.status(400).json({ error: pwError });
      }
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 12); // Increased from 10 to 12 rounds
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      branch_id: targetBranchId,
      role: requestedRole
    });

    // M5 Fix: Never return password hash
    res.status(201).json({ message: 'User registered successfully', user: { id: user.id, name, email, role: user.role } });
  } catch (error) {
    console.error('[Register Error]:', error.message);
    // H1 Fix: Generic error message in production
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // H2 Fix: Input validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ where: { email }, attributes: await getSafeUserAttributes(true) });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is active
    if (Object.prototype.hasOwnProperty.call(user.toJSON(), 'status') && user.status && user.status !== 'active') {
      return res.status(403).json({ error: 'Account is suspended. Contact your administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: AUTH_TOKEN_TTL });

    // M5 Fix: Fetch user WITHOUT password hash
    const fullUser = await User.findOne({
      where: { id: user.id },
      attributes: await getSafeUserAttributes(false),
    });

    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
    res.json({ token, user: fullUser });
  } catch (error) {
    console.error('[Login Error]:', error.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
};

exports.logout = async (req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'Logged out successfully' });
};

exports.getMe = async (req, res) => {
  // M5 Fix: Exclude password from response
  const safeUser = { ...req.user.toJSON() };
  delete safeUser.password;
  res.json({ user: safeUser });
};

exports.getStaff = async (req, res) => {
  try {
    const staff = await User.findAll({
      where: {
        role: {
          [require('sequelize').Op.notIn]: ['student', 'guardian']
        },
        branch_id: req.branchId
      },
      attributes: ['id', 'name', 'email', 'role', 'status'] // Never include password
    });
    res.json(staff);
  } catch (error) {
    console.error('[GetStaff Error]:', error.message);
    res.status(500).json({ error: 'Failed to fetch staff list.' });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const { userId, role } = req.body;

    // H2 Fix: Input validation
    if (!userId || !role) {
      return res.status(400).json({ error: 'userId and role are required.' });
    }

    if (!canAssignRole(req.user, role)) {
      return res.status(403).json({ error: 'You cannot assign that role.' });
    }

    const user = await User.findOne({ where: { id: userId, branch_id: req.branchId } });
    if (!user) return res.status(404).json({ error: 'User not found or you do not have permission.' });

    user.role = role;
    await user.save();

    res.json({ message: 'User role updated successfully.', user: { id: user.id, name: user.name, role: user.role } });
  } catch (error) {
    console.error('[UpdateRole Error]:', error.message);
    res.status(500).json({ error: 'Failed to update role.' });
  }
};

exports.setStaffPassword = async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    // H4 Fix: Enforce strong password policy
    const pwError = validatePassword(newPassword);
    if (pwError) {
      return res.status(400).json({ error: pwError });
    }

    const user = await User.findOne({ where: { id: userId, branch_id: req.branchId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.password = await bcrypt.hash(newPassword, 12); // Increased from 10 to 12 rounds
    await user.save();
    
    res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('[SetPassword Error]:', error.message);
    res.status(500).json({ error: 'Failed to update password.' });
  }
};
