const adminService = require('../services/admin.service');

/**
 * Controller to register a new admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const registerAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }
    
    // Call service to register admin
    const newAdmin = await adminService.registerAdmin({ username, password });
    
    res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      data: newAdmin
    });
  } catch (error) {
    console.error('Error registering admin:', error);
    
    // Handle specific errors
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to register admin',
      error: error.message
    });
  }
};

/**
 * Controller to login admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }
    
    // Call service to login admin
    const loginResult = await adminService.loginAdmin({ username, password });
    
    res.status(200).json({
      success: true,
      message: 'Admin logged in successfully',
      data: loginResult
    });
  } catch (error) {
    console.error('Error logging in admin:', error);
    
    // Handle invalid credentials error
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to login',
      error: error.message
    });
  }
};

/**
 * Controller to get admin profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAdminProfile = async (req, res) => {
  try {
    const adminId = req.admin.id;
    
    // Call service to get admin profile
    const profile = await adminService.getAdminProfile(adminId);
    
    res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error getting admin profile:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to get admin profile',
      error: error.message
    });
  }
};

/**
 * Controller to update admin profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateAdminProfile = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const updateData = req.body;
    
    // Call service to update admin profile
    const updatedProfile = await adminService.updateAdminProfile(adminId, updateData);
    
    res.status(200).json({
      success: true,
      message: 'Admin profile updated successfully',
      data: updatedProfile
    });
  } catch (error) {
    console.error('Error updating admin profile:', error);
    
    // Handle specific errors
    if (error.message === 'Current password is incorrect') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === 'Username is already taken') {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update admin profile',
      error: error.message
    });
  }
};

/**
 * Controller to get sales report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Set to end of day
    
    // Build query for completed orders in date range
    const where = {
      status: 'COMPLETED',
      createdAt: {
        gte: start,
        lte: end
      }
    };
    
    // Get orders
    const orders = await prisma.order.findMany({
      where,
      include: {
        orderItems: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Calculate totals
    const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalOrders = orders.length;
    
    res.status(200).json({
      success: true,
      data: {
        orders,
        totalSales,
        totalOrders,
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('Error getting sales report:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to get sales report',
      error: error.message
    });
  }
};

module.exports = {
  registerAdmin,
  loginAdmin,
  getAdminProfile,
  updateAdminProfile,
  getSalesReport
};