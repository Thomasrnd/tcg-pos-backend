const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { authenticateAdmin } = require('../middleware/auth.middleware');
const { handlePaymentProofUpload } = require('../middleware/upload.middleware');

// Public routes - accessible by customers
router.post('/', orderController.createOrder);
router.post('/:id/payment-proof', handlePaymentProofUpload, orderController.uploadPaymentProof);
router.get('/:id', orderController.getOrderById);

// Protected routes - only accessible by admin
router.get('/', authenticateAdmin, orderController.getAllOrders);
router.post('/:id/verify', authenticateAdmin, orderController.verifyPayment);
router.post('/:id/complete', authenticateAdmin, orderController.completeOrder);
router.post('/:id/cancel', authenticateAdmin, orderController.cancelOrder);
router.get('/notifications/pending-count', authenticateAdmin, orderController.getPendingOrdersCount);
router.get('/analytics/sales-summary', authenticateAdmin, orderController.getSalesSummary);
router.get('/analytics/daily-sales', authenticateAdmin, orderController.getDailySalesReport);

module.exports = router;