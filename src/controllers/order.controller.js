// src/controllers/order.controller.js
const { prisma } = require('../config/db');
const orderService = require('../services/order.service');

/**
 * Controller to create a new order
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createOrder = async (req, res) => {
  try {
    const orderData = req.body;
    
    // Validate required fields
    if (!orderData.customerName || !orderData.items || orderData.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Customer name and items are required'
      });
    }
    
    // Call service to create order
    const newOrder = await orderService.createOrder(orderData);
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: newOrder
    });
  } catch (error) {
    console.error('Error creating order:', error);
    
    // Handle specific errors
    if (error.message.includes('not found') || error.message.includes('Insufficient stock')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
};

/**
 * Controller to upload payment proof
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const uploadPaymentProof = async (req, res) => {
  try {
    const orderId = req.params.id;
    const fileInfo = req.file;
    
    // Validate file upload
    if (!fileInfo) {
      return res.status(400).json({
        success: false,
        message: 'Payment proof file is required'
      });
    }
    
    // Call service to upload payment proof
    const updatedOrder = await orderService.uploadPaymentProof(orderId, fileInfo);
    
    res.status(200).json({
      success: true,
      message: 'Payment proof uploaded successfully',
      data: updatedOrder
    });
  } catch (error) {
    console.error('Error uploading payment proof:', error);
    
    if (error.message === 'Order not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('can only be uploaded for pending orders') || 
        error.message.includes('not required for')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to upload payment proof',
      error: error.message
    });
  }
};

/**
 * Controller to verify payment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const verifyPayment = async (req, res) => {
  try {
    const orderId = req.params.id;
    
    // Call service to verify payment
    const updatedOrder = await orderService.verifyPayment(orderId);
    
    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: updatedOrder
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    
    if (error.message === 'Order not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('Only orders with uploaded payment') ||
        error.message.includes('No payment proof found') ||
        error.message.includes('Only pending or already verified') ||
        error.message.includes('Cannot verify payment')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: error.message
    });
  }
};

/**
 * Controller to complete an order
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const completeOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    
    // Call service to complete order
    const completedOrder = await orderService.completeOrder(orderId);
    
    res.status(200).json({
      success: true,
      message: 'Order completed successfully',
      data: completedOrder
    });
  } catch (error) {
    console.error('Error completing order:', error);
    
    if (error.message === 'Order not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('Only verified orders')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to complete order',
      error: error.message
    });
  }
};

/**
 * Controller to cancel an order
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    
    // Call service to cancel order
    const cancelledOrder = await orderService.cancelOrder(orderId);
    
    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: cancelledOrder
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    
    if (error.message === 'Order not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('can be cancelled')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      error: error.message
    });
  }
};

/**
 * Controller to get all orders
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllOrders = async (req, res) => {
  try {
    const queryParams = req.query;
    
    // Call service to get all orders
    const result = await orderService.getAllOrders(queryParams);
    
    res.status(200).json({
      success: true,
      data: result.orders,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error getting orders:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to get orders',
      error: error.message
    });
  }
};

/**
 * Controller to get an order by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getOrderById = async (req, res) => {
  try {
    const orderId = req.params.id;
    
    // Call service to get order by ID
    const order = await orderService.getOrderById(orderId);
    
    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error getting order:', error);
    
    if (error.message === 'Order not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to get order',
      error: error.message
    });
  }
};

/**
 * Controller to get pending orders count for notifications
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getPendingOrdersCount = async (req, res) => {
  try {
    // Call service to get pending orders count
    const result = await orderService.getPendingOrdersCount();
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting pending orders count:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to get pending orders count',
      error: error.message
    });
  }
};

/**
 * Controller to get sales summary
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSalesSummary = async (req, res) => {
  try {
    const queryParams = req.query;
    
    // Call service to get sales summary
    const summary = await orderService.getSalesSummary(queryParams);
    
    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error getting sales summary:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to get sales summary',
      error: error.message
    });
  }
};

/**
 * Controller to get daily sales report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDailySalesReport = async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }

    // Call service to get daily sales report
    const reportData = await orderService.getDailySalesReport(date);
    
    res.status(200).json({
      success: true,
      data: reportData
    });
  } catch (error) {
    console.error('Error generating daily sales report:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate sales report',
      error: error.message
    });
  }
};

/**
 * Controller to get available payment methods
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getPaymentMethods = async (req, res) => {
  try {
    const paymentMethods = await orderService.getPaymentMethods();
    
    res.status(200).json({
      success: true,
      data: paymentMethods
    });
  } catch (error) {
    console.error('Error getting payment methods:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to get payment methods',
      error: error.message
    });
  }
};

/**
 * Controller to get date range sales report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDateRangeSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date parameters are required'
      });
    }

    // Call service to get date range sales report
    const reportData = await orderService.getDateRangeSalesReport({ startDate, endDate });
    
    res.status(200).json({
      success: true,
      data: reportData
    });
  } catch (error) {
    console.error('Error generating date range sales report:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate date range sales report',
      error: error.message
    });
  }
};

module.exports = {
  createOrder,
  uploadPaymentProof,
  verifyPayment,
  completeOrder,
  cancelOrder,
  getAllOrders,
  getOrderById,
  getPendingOrdersCount,
  getSalesSummary,
  getDailySalesReport,
  getPaymentMethods,
  getDateRangeSalesReport
};