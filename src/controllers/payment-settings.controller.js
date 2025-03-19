// src/controllers/payment-settings.controller.js
const paymentSettingsService = require('../services/payment-settings.service');

/**
 * Controller to get all payment method settings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllPaymentMethodSettings = async (req, res) => {
  try {
    const settings = await paymentSettingsService.getAllPaymentMethodSettings();
    
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error getting payment method settings:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to get payment method settings',
      error: error.message
    });
  }
};

/**
 * Controller to update a payment method setting
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updatePaymentMethodSetting = async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;
    
    const updatedSetting = await paymentSettingsService.updatePaymentMethodSetting(id, data);
    
    res.status(200).json({
      success: true,
      message: 'Payment method setting updated successfully',
      data: updatedSetting
    });
  } catch (error) {
    console.error('Error updating payment method setting:', error);
    
    if (error.message === 'Payment method setting not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update payment method setting',
      error: error.message
    });
  }
};

module.exports = {
  getAllPaymentMethodSettings,
  updatePaymentMethodSetting
};