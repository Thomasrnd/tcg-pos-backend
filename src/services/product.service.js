const { prisma } = require('../config/db');
const fs = require('fs');
const path = require('path');
const config = require('../config/app');

/**
 * Service to create a new product
 * @param {Object} productData - Product data
 * @param {Object} fileInfo - File info for product image
 * @returns {Object} Newly created product
 */
const createProduct = async (productData, fileInfo = null) => {
  const { name, description, price, stock, category } = productData;
  
  // Prepare product data
  const newProductData = {
    name,
    description,
    price: parseFloat(price),
    stock: parseInt(stock, 10),
    category
  };
  
  // Add image URL if a file was uploaded
  if (fileInfo) {
    const relativePath = `/${config.uploads.dir}${config.uploads.products}/${fileInfo.filename}`;
    newProductData.imageUrl = relativePath;
  }
  
  // Create product in database
  const newProduct = await prisma.product.create({
    data: newProductData
  });
  
  return newProduct;
};

/**
 * Service to get all products
 * @param {Object} queryParams - Query parameters for filtering and pagination
 * @returns {Array} List of products
 */
const getAllProducts = async (queryParams = {}) => {
  const { 
    category, 
    search,
    minPrice,
    maxPrice,
    inStock,
    page = 1, 
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = queryParams;
  
  const skip = (page - 1) * parseInt(limit, 10);
  const take = parseInt(limit, 10);
  
  // Build filter conditions
  const where = {};
  
  if (category) {
    where.category = category;
  }
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }
  
  if (minPrice !== undefined) {
    where.price = {
      ...where.price,
      gte: parseFloat(minPrice)
    };
  }
  
  if (maxPrice !== undefined) {
    where.price = {
      ...where.price,
      lte: parseFloat(maxPrice)
    };
  }
  
  if (inStock === 'true') {
    where.stock = { gt: 0 };
  }
  
  // Get products with pagination and sorting
  const products = await prisma.product.findMany({
    where,
    skip,
    take,
    orderBy: {
      [sortBy]: sortOrder
    }
  });
  
  // Get total count for pagination
  const totalProducts = await prisma.product.count({ where });
  
  return {
    products,
    pagination: {
      total: totalProducts,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(totalProducts / parseInt(limit, 10))
    }
  };
};

/**
 * Service to get a product by ID
 * @param {number} productId - Product ID
 * @returns {Object} Product data
 */
const getProductById = async (productId) => {
  const product = await prisma.product.findUnique({
    where: { id: parseInt(productId, 10) }
  });
  
  if (!product) {
    throw new Error('Product not found');
  }
  
  return product;
};

/**
 * Service to update a product
 * @param {number} productId - Product ID
 * @param {Object} updateData - Data to update
 * @param {Object} fileInfo - File info for product image
 * @returns {Object} Updated product
 */
const updateProduct = async (productId, updateData, fileInfo = null) => {
  const { name, description, price, stock, category } = updateData;
  
  // Find the product
  const product = await prisma.product.findUnique({
    where: { id: parseInt(productId, 10) }
  });
  
  if (!product) {
    throw new Error('Product not found');
  }
  
  // Prepare update data
  const updateFields = {};
  
  if (name !== undefined) updateFields.name = name;
  if (description !== undefined) updateFields.description = description;
  if (price !== undefined) updateFields.price = parseFloat(price);
  if (stock !== undefined) updateFields.stock = parseInt(stock, 10);
  if (category !== undefined) updateFields.category = category;
  
  // Handle image update
  if (fileInfo) {
    // Delete old image if exists
    if (product.imageUrl) {
      const oldImagePath = path.join(__dirname, '../../', product.imageUrl);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
    
    // Set new image URL
    const relativePath = `/${config.uploads.dir}${config.uploads.products}/${fileInfo.filename}`;
    updateFields.imageUrl = relativePath;
  }
  
  // Update product in database
  const updatedProduct = await prisma.product.update({
    where: { id: parseInt(productId, 10) },
    data: updateFields
  });
  
  return updatedProduct;
};

/**
 * Service to delete a product
 * @param {number} productId - Product ID
 * @returns {Object} Deleted product
 */
const deleteProduct = async (productId) => {
  // Find the product
  const product = await prisma.product.findUnique({
    where: { id: parseInt(productId, 10) }
  });
  
  if (!product) {
    throw new Error('Product not found');
  }
  
  // Delete the product image if exists
  if (product.imageUrl) {
    const imagePath = path.join(__dirname, '../../', product.imageUrl);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }
  
  // Delete product from database
  const deletedProduct = await prisma.product.delete({
    where: { id: parseInt(productId, 10) }
  });
  
  return deletedProduct;
};

/**
 * Service to update product stock
 * @param {number} productId - Product ID
 * @param {number} quantity - Quantity to subtract from stock
 * @returns {Object} Updated product
 */
const updateProductStock = async (productId, quantity) => {
  // Find the product
  const product = await prisma.product.findUnique({
    where: { id: parseInt(productId, 10) }
  });
  
  if (!product) {
    throw new Error('Product not found');
  }
  
  if (product.stock < quantity) {
    throw new Error('Insufficient stock');
  }
  
  // Update product stock
  const updatedProduct = await prisma.product.update({
    where: { id: parseInt(productId, 10) },
    data: {
      stock: product.stock - quantity
    }
  });
  
  return updatedProduct;
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  updateProductStock
};