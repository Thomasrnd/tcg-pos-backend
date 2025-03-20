// src/routes/payment-settings.routes.js
const express = require('express');
const router = express.Router();
const paymentSettingsController = require('../controllers/payment-settings.controller');
const { authenticateAdmin, requireMasterAdmin } = require('../middleware/auth.middleware');
const { handleQrisImageUpload } = require('../middleware/upload.middleware');

router.get('/method/:method', paymentSettingsController.getPaymentMethodDetail);

// All routes require authentication
router.use(authenticateAdmin);

// Routes for master admin only
router.get('/', requireMasterAdmin, paymentSettingsController.getAllPaymentMethodSettings);
router.put('/:id', requireMasterAdmin, paymentSettingsController.updatePaymentMethodSetting);
router.post('/:id/qris-image', requireMasterAdmin, handleQrisImageUpload, paymentSettingsController.uploadQrisImage);

module.exports = router;