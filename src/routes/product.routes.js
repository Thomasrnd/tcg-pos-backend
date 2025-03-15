const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { authenticateAdmin } = require('../middleware/auth.middleware');
const { handleProductImageUpload } = require('../middleware/upload.middleware');

// Public routes - accessible by customers and admin
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

// Protected routes - only accessible by admin
router.post('/', authenticateAdmin, handleProductImageUpload, productController.createProduct);
router.put('/:id', authenticateAdmin, handleProductImageUpload, productController.updateProduct);
router.delete('/:id', authenticateAdmin, productController.deleteProduct);

module.exports = router;