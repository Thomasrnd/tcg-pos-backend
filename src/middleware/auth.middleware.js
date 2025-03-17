// src/middleware/auth.middleware.js
const { verifyToken } = require('../utils/auth');
const { prisma } = require('../config/db');

/**
 * Middleware to authenticate admin access
 */
const authenticateAdmin = async (req, res, next) => {
  try {
    // Get token from authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    
    // Check if admin exists
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id }
    });
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    // Attach admin to request object
    req.admin = {
      id: admin.id,
      username: admin.username,
      role: admin.role
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Middleware to check if user is a master admin
 */
const requireMasterAdmin = (req, res, next) => {
  if (req.admin && req.admin.role === 'MASTER_ADMIN') {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'Access denied. Only master admin can perform this action.'
  });
};

module.exports = {
  authenticateAdmin,
  requireMasterAdmin
};