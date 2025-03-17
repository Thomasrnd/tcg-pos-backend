// src/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticateAdmin, requireMasterAdmin } = require('../middleware/auth.middleware');

// Public routes
router.post('/register', adminController.registerAdmin); // Keep this for initial setup (first master admin)
router.post('/login', adminController.loginAdmin);

// Protected routes - all admins
router.get('/profile', authenticateAdmin, adminController.getAdminProfile);
router.put('/profile', authenticateAdmin, adminController.updateAdminProfile);

// Master admin only routes
router.get('/all', authenticateAdmin, requireMasterAdmin, adminController.getAllAdmins);
router.post('/create', authenticateAdmin, requireMasterAdmin, adminController.createAdmin);
router.delete('/:id', authenticateAdmin, requireMasterAdmin, adminController.deleteAdmin);

module.exports = router;