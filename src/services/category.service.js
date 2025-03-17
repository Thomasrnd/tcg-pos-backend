// src/services/category.service.js
const { prisma } = require('../config/db');

/**
 * Service to get all product categories
 * @returns {Promise<Array>} List of all product categories
 */
const getAllCategories = async () => {
  const categories = await prisma.productCategory.findMany({
    orderBy: {
      name: 'asc'
    }
  });
  
  return categories;
};

/**
 * Service to get a product category by id
 * @param {number} categoryId - Category ID
 * @returns {Promise<Object>} Category data
 */
const getCategoryById = async (categoryId) => {
  const category = await prisma.productCategory.findUnique({
    where: { id: parseInt(categoryId, 10) }
  });
  
  if (!category) {
    throw new Error('Category not found');
  }
  
  return category;
};

/**
 * Service to create a new product category
 * @param {Object} categoryData - Category data including name
 * @returns {Promise<Object>} Newly created category
 */
const createCategory = async (categoryData) => {
  const { name } = categoryData;
  
  // Check if category with this name already exists
  const existingCategory = await prisma.productCategory.findFirst({
    where: {
      name: {
        equals: name,
        mode: 'insensitive' // Case insensitive comparison
      }
    }
  });
  
  if (existingCategory) {
    throw new Error('A category with this name already exists');
  }
  
  // Create new category
  const newCategory = await prisma.productCategory.create({
    data: {
      name
    }
  });
  
  return newCategory;
};

/**
 * Service to update a product category
 * @param {number} categoryId - Category ID
 * @param {Object} categoryData - Updated category data
 * @returns {Promise<Object>} Updated category
 */
const updateCategory = async (categoryId, categoryData) => {
  const { name } = categoryData;
  
  // Check if category exists
  const category = await prisma.productCategory.findUnique({
    where: { id: parseInt(categoryId, 10) }
  });
  
  if (!category) {
    throw new Error('Category not found');
  }
  
  // Check if the new name already exists (but not for the current category)
  if (name) {
    const existingCategory = await prisma.productCategory.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive'
        },
        id: {
          not: parseInt(categoryId, 10)
        }
      }
    });
    
    if (existingCategory) {
      throw new Error('A category with this name already exists');
    }
  }
  
  // Update category
  const updatedCategory = await prisma.productCategory.update({
    where: { id: parseInt(categoryId, 10) },
    data: { name }
  });
  
  return updatedCategory;
};

/**
 * Service to delete a product category
 * @param {number} categoryId - Category ID
 * @returns {Promise<Object>} Deleted category
 */
const deleteCategory = async (categoryId) => {
  // Check if category exists
  const category = await prisma.productCategory.findUnique({
    where: { id: parseInt(categoryId, 10) },
    include: {
      products: {
        select: {
          id: true
        }
      }
    }
  });
  
  if (!category) {
    throw new Error('Category not found');
  }
  
  // Check if any products are using this category
  if (category.products && category.products.length > 0) {
    throw new Error('Cannot delete category with associated products. Please reassign the products first.');
  }
  
  // Delete category
  const deletedCategory = await prisma.productCategory.delete({
    where: { id: parseInt(categoryId, 10) }
  });
  
  return deletedCategory;
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};