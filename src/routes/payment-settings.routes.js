// src/routes/payment-settings.routes.js
const express = require('express');
const router = express.Router();
const paymentSettingsController = require('../controllers/payment-settings.controller');
const { authenticateAdmin, requireMasterAdmin } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticateAdmin);

// Routes for master admin only
router.get('/', requireMasterAdmin, paymentSettingsController.getAllPaymentMethodSettings);
router.put('/:id', requireMasterAdmin, paymentSettingsController.updatePaymentMethodSetting);

module.exports = router;