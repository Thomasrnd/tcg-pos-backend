// src/routes/category.routes.js
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { authenticateAdmin } = require('../middleware/auth.middleware');

// Public routes - both customers and admins can view categories
router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);

// Protected routes - only accessible by admin
router.post('/', authenticateAdmin, categoryController.createCategory);
router.put('/:id', authenticateAdmin, categoryController.updateCategory);
router.delete('/:id', authenticateAdmin, categoryController.deleteCategory);

module.exports = router;