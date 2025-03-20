// src/services/payment-settings.service.js
const { prisma } = require('../config/db');
const config = require('../config/app');
const fs = require('fs');
const path = require('path');

/**
 * Service to get all payment method settings
 * @returns {Promise<Array>} List of payment method settings
 */
const getAllPaymentMethodSettings = async () => {
  const settings = await prisma.paymentMethodSetting.findMany({
    orderBy: {
      sortOrder: 'asc'
    }
  });
  
  return settings;
};

/**
 * Service to get available payment methods for customer checkout
 * @returns {Promise<Array>} List of enabled payment methods
 */
const getAvailablePaymentMethods = async () => {
  const methods = await prisma.paymentMethodSetting.findMany({
    where: {
      isEnabled: true
    },
    orderBy: {
      sortOrder: 'asc'
    }
  });
  
  return {
    methods: methods.map(method => ({
      id: method.method,
      name: method.name,
      description: method.description,
      requiresProof: method.requiresProof
    }))
  };
};

/**
 * Service to update a payment method setting
 * @param {number} id - Payment method setting ID
 * @param {Object} data - Updated setting data
 * @returns {Promise<Object>} Updated payment method setting
 */
const updatePaymentMethodSetting = async (id, data) => {
  const setting = await prisma.paymentMethodSetting.findUnique({
    where: { id: parseInt(id) }
  });
  
  if (!setting) {
    throw new Error('Payment method setting not found');
  }
  
  const updatedSetting = await prisma.paymentMethodSetting.update({
    where: { id: parseInt(id) },
    data: {
      // Exclude name to prevent it from being updated
      description: data.description,
      isEnabled: data.isEnabled !== undefined ? data.isEnabled : setting.isEnabled,
      requiresProof: data.requiresProof !== undefined ? data.requiresProof : setting.requiresProof,
      sortOrder: data.sortOrder !== undefined ? data.sortOrder : setting.sortOrder,
      bankName: data.bankName,
      accountNumber: data.accountNumber,
      accountHolder: data.accountHolder
    }
  });
  
  return updatedSetting;
};

/**
 * Service to get details for a specific payment method
 * @param {string} method - Payment method identifier
 * @returns {Promise<Object>} Payment method details
 */
const getPaymentMethodDetail = async (method) => {
  const setting = await prisma.paymentMethodSetting.findFirst({
    where: { 
      method,
      isEnabled: true
    }
  });
  
  if (!setting) {
    throw new Error('Payment method not found or not enabled');
  }
  
  return setting;
};

/**
 * Service to upload QRIS image for a payment method
 * @param {number} id - Payment method setting ID
 * @param {Object} fileInfo - QRIS image file info
 * @returns {Promise<Object>} Updated payment method setting
 */
const uploadQrisImage = async (id, fileInfo) => {
  const setting = await prisma.paymentMethodSetting.findUnique({
    where: { id: parseInt(id) }
  });
  
  if (!setting) {
    throw new Error('Payment method setting not found');
  }
  
  if (setting.method !== 'QRIS') {
    throw new Error('QRIS image can only be uploaded for QRIS payment method');
  }
  
  // Create relative path for the QRIS image
  const relativePath = `/${config.uploads.dir}/qris/${fileInfo.filename}`;
  
  // Delete old QRIS image if exists
  if (setting.qrisImageUrl) {
    const oldImagePath = path.join(__dirname, '../../', setting.qrisImageUrl);
    if (fs.existsSync(oldImagePath)) {
      fs.unlinkSync(oldImagePath);
    }
  }
  
  // Update QRIS image URL
  const updatedSetting = await prisma.paymentMethodSetting.update({
    where: { id: parseInt(id) },
    data: {
      qrisImageUrl: relativePath
    }
  });
  
  return updatedSetting;
};

module.exports = {
  getAllPaymentMethodSettings,
  getAvailablePaymentMethods,
  updatePaymentMethodSetting,
  getPaymentMethodDetail,
  uploadQrisImage
};