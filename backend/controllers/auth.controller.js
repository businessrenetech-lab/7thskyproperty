const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Branch = require('../models/Branch');
const RbacConfig = require('../models/RbacConfig');
const { getTableColumns, hasColumn } = require('../utils/schemaSafe');

const ASSIGNABLE_ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive', 'accounts', 'owner', 'tenant', 'buyer', 'supplier', 'staff', 'unassigned'];
const BRANCH_ADMIN_ROLES = ['property_manager', 'sales_executive', 'accounts', 'staff', 'unassigned'];
const LEGACY_ROLE_ALIASES = {
  accounting: 'accounts',
  counselor: 'sales_executive',
  crm: 'sales_executive',
  trainer: 'property_manager',
  teacher: 'property_manager',
  hr: 'accounts',
  hrm: 'accounts',
};
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

const isHeadSuperAdmin = (user) => user?.role === 'super_admin' && user?.Branch?.type === 'head';

const getManageableUserWhere = (actor, userId = null) => {
  const where = {};
  if (userId) where.id = userId;
  if (!isHeadSuperAdmin(actor)) where.branch_id = actor.branch_id;
  return where;
};

const normalizeRole = (role) => LEGACY_ROLE_ALIASES[role] || role;

const getCustomRoleKeys = async () => {
  const config = await RbacConfig.findOne({ order: [['id', 'DESC']] });
  if (!Array.isArray(config?.custom_roles_json)) return [];
  return config.custom_roles_json.map((role) => role?.key).filter(Boolean);
};

const canAssignRole = async (actor, role) => {
  const customRoleKeys = await getCustomRoleKeys();
  if (![...ASSIGNABLE_ROLES, ...customRoleKeys].includes(role)) return false;
  if (actor.role === 'super_admin') return true;
  return BRANCH_ADMIN_ROLES.includes(role) || customRoleKeys.includes(role);
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

    const requestedRole = normalizeRole(role || 'unassigned');

    if (!(await canAssignRole(req.user, requestedRole))) {
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

// Google Sign-In (Google Identity Services). The client ID is public and safe
// to embed; override via env if you rotate it.
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
  || '82959977221-3k1ag8ofcgrp9kuvtbj9ld4dvhhmpobm.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// POST /api/auth/google  { credential }  — verify a Google ID token, then log
// in the EXISTING user with that email. Unknown Google accounts are rejected
// (no self-signup on a role-based staff system).
exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Google credential is required.' });

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ error: 'Invalid Google sign-in. Please try again.' });
    }
    if (!payload?.email || payload.email_verified !== true) {
      return res.status(401).json({ error: 'This Google account has no verified email.' });
    }

    const email = String(payload.email).trim();
    // Match the existing account (case-insensitive), like the password login.
    let user = await User.findOne({ where: { email }, attributes: await getSafeUserAttributes(false) });
    if (!user && email !== email.toLowerCase()) {
      user = await User.findOne({ where: { email: email.toLowerCase() }, attributes: await getSafeUserAttributes(false) });
    }
    if (!user) {
      return res.status(403).json({ error: `No account exists for ${email}. Ask an administrator to add you first.` });
    }
    if (Object.prototype.hasOwnProperty.call(user.toJSON(), 'status') && user.status && user.status !== 'active') {
      return res.status(403).json({ error: 'Account is suspended. Contact your administrator.' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: AUTH_TOKEN_TTL });
    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
    res.json({ token, user });
  } catch (error) {
    console.error('[Google Login Error]:', error.message);
    res.status(500).json({ error: 'Google sign-in failed. Please try again.' });
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
    const where = {
      ...getManageableUserWhere(req.user),
      role: {
        [require('sequelize').Op.notIn]: ['student', 'guardian']
      },
    };

    const staff = await User.findAll({
      where,
      attributes: ['id', 'name', 'email', 'role', 'status', 'branch_id'], // Never include password
      include: [{ model: Branch, attributes: ['id', 'name', 'code', 'type'] }],
      order: [['branch_id', 'ASC'], ['name', 'ASC']],
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
    const requestedRole = normalizeRole(role);

    // H2 Fix: Input validation
    if (!userId || !role) {
      return res.status(400).json({ error: 'userId and role are required.' });
    }

    if (!(await canAssignRole(req.user, requestedRole))) {
      return res.status(403).json({ error: 'You cannot assign that role.' });
    }

    const user = await User.findOne({ where: getManageableUserWhere(req.user, userId) });
    if (!user) return res.status(404).json({ error: 'User not found or you do not have permission.' });

    user.role = requestedRole;
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

    const user = await User.findOne({ where: getManageableUserWhere(req.user, userId) });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.password = await bcrypt.hash(newPassword, 12); // Increased from 10 to 12 rounds
    await user.save();
    
    res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('[SetPassword Error]:', error.message);
    res.status(500).json({ error: 'Failed to update password.' });
  }
};
