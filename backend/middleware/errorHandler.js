/**
 * H1 Fix: Async route handler wrapper that catches errors
 * and passes them to the global error handler instead of leaking error.message.
 * 
 * Usage in controllers:
 *   const { asyncHandler } = require('../middleware/errorHandler');
 *   router.get('/route', asyncHandler(async (req, res) => { ... }));
 * 
 * Or wrap existing controller functions:
 *   router.get('/route', asyncHandler(controller.method));
 */

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Global error handler middleware.
 * Must be registered AFTER all routes in server.js.
 * In production: returns generic message. In development: returns full error.
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  
  // Log the full error for server-side debugging
  console.error(`[ERROR] ${req.method} ${req.path}:`, {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    userId: req.user?.id,
    ip: req.ip,
  });

  // In development, return full error details
  if (process.env.NODE_ENV === 'development') {
    return res.status(statusCode).json({
      error: err.message,
      stack: err.stack,
    });
  }

  // In production, return generic message
  res.status(statusCode).json({
    error: statusCode === 500 
      ? 'Internal server error' 
      : err.message,
  });
};

module.exports = { asyncHandler, errorHandler };
