/**
 * Middleware to enforce branch-scoping on requests.
 * Head branch admins can see everything or filter by a specific branch.
 * Branch-level users are locked to their own branch.
 */
const branchMiddleware = (req, res, next) => {
  const { user } = req;

  // If super_admin from head branch, they can optionally specify a branchId in query or header
  const branchId = req.headers['x-branch-id'] || req.query.branchId;
  const branchType = user.Branch?.type;

  if (user.role === 'super_admin' && branchType === 'head') {
    if (branchId && branchId !== 'all') {
      req.scopedBranchId = parseInt(branchId);
    } else if (branchId === 'all') {
      req.scopedBranchId = null; // Globally scoped
    } else {
      req.scopedBranchId = user.branch_id; // Default to own branch if not specified
    }
  } else {
    // Other users are strictly scoped to their own branch
    req.scopedBranchId = user.branch_id;
  }

  next();
};

/**
 * Helper to inject the branch filter into Sequelize query options
 */
const injectBranchFilter = (req, queryOptions = {}) => {
  if (req.scopedBranchId) {
    queryOptions.where = {
      ...queryOptions.where,
      branch_id: req.scopedBranchId
    };
  }
  return queryOptions;
};

// Aliases for better readability in routes
const branchScope = branchMiddleware;

module.exports = { branchMiddleware, injectBranchFilter, branchScope };
