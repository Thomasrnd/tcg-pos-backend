// src/services/payment-settings.service.js
const { prisma } = require('../config/db');

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
  
  // Create update data without the name field to ensure it can't be changed
  const updateData = {
    // Don't include name here to prevent updates to it
    description: data.description,
    isEnabled: data.isEnabled !== undefined ? data.isEnabled : setting.isEnabled,
    requiresProof: data.requiresProof !== undefined ? data.requiresProof : setting.requiresProof,
    sortOrder: data.sortOrder !== undefined ? data.sortOrder : setting.sortOrder,
    bankName: data.bankName,
    accountNumber: data.accountNumber,
    accountHolder: data.accountHolder
  };
  
  const updatedSetting = await prisma.paymentMethodSetting.update({
    where: { id: parseInt(id) },
    data: updateData
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

module.exports = {
  getAllPaymentMethodSettings,
  getAvailablePaymentMethods,
  updatePaymentMethodSetting,
  getPaymentMethodDetail
};