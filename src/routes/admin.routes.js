const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticateAdmin } = require('../middleware/auth.middleware');

// Public routes
router.post('/register', adminController.registerAdmin);
router.post('/login', adminController.loginAdmin);

// Protected routes
router.get('/profile', authenticateAdmin, adminController.getAdminProfile);
router.put('/profile', authenticateAdmin, adminController.updateAdminProfile);

module.exports = router;