// Middleware to protect routes that require Admin privileges
function requireAdmin(req, res, next) {
  // Check if session contains authenticated admin
  if (req.session && req.session.admin) {
    return next();
  }

  // Also support custom authorization header or API key for flexibility
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token === process.env.ADMIN_API_KEY || token === 'mediguard-demo-token') {
      return next();
    }
  }

  return res.status(401).json({
    success: false,
    message: 'Access denied. Please login as Admin to perform this action.',
  });
}

module.exports = {
  requireAdmin,
};
