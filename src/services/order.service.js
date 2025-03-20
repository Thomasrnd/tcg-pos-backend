// src/services/order.service.js

const { prisma } = require('../config/db');
const fs = require('fs');
const path = require('path');
const config = require('../config/app');

/**
 * Service to create a new order
 * @param {Object} orderData - Order data
 * @returns {Object} Newly created order
 */
const createOrder = async (orderData) => {
  const { customerName, items, paymentMethod = 'BANK_TRANSFER' } = orderData;
  
  if (!items || items.length === 0) {
    throw new Error('Order must contain at least one item');
  }
  
  // Validate that payment method is enabled
  const paymentMethodSetting = await prisma.paymentMethodSetting.findFirst({
    where: {
      method: paymentMethod,
      isEnabled: true
    }
  });
  
  if (!paymentMethodSetting) {
    throw new Error(`Payment method ${paymentMethod} is not available`);
  }
  
  // Calculate total amount and validate items
  let totalAmount = 0;
  const orderItems = [];
  
  // Validate each product and calculate totals
  for (const item of items) {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(item.productId, 10) }
    });
    
    if (!product) {
      throw new Error(`Product with ID ${item.productId} not found`);
    }
    
    if (product.stock < item.quantity) {
      throw new Error(`Insufficient stock for product: ${product.name}`);
    }
    
    const subtotal = product.price * item.quantity;
    totalAmount += subtotal;
    
    orderItems.push({
      productId: product.id,
      quantity: item.quantity,
      subtotal
    });
  }
  
  // Determine initial status based on payment method
  // Cash payments can skip directly to PAYMENT_VERIFIED status
  const initialStatus = paymentMethod === 'CASH' ? 'PAYMENT_VERIFIED' : 'PENDING';
  
  // Create order with transaction to ensure data consistency
  const newOrder = await prisma.$transaction(async (prisma) => {
    // Create the order
    const order = await prisma.order.create({
      data: {
        customerName,
        totalAmount,
        status: initialStatus,
        paymentMethod,
        orderItems: {
          create: orderItems
        }
      },
      include: {
        orderItems: {
          include: {
            product: true
          }
        }
      }
    });
    
    return order;
  });
  
  return newOrder;
};

/**
 * Service to upload payment proof for an order
 * @param {number} orderId - Order ID
 * @param {Object} fileInfo - Payment proof file info
 * @returns {Object} Updated order
 */
const uploadPaymentProof = async (orderId, fileInfo) => {
  // Find the order
  const order = await prisma.order.findUnique({
    where: { id: parseInt(orderId, 10) },
    include: {
      paymentProof: true
    }
  });
  
  if (!order) {
    throw new Error('Order not found');
  }
  
  if (order.status !== 'PENDING') {
    throw new Error('Payment proof can only be uploaded for pending orders');
  }
  
  // Check if payment method requires proof
  const paymentMethodSetting = await prisma.paymentMethodSetting.findFirst({
    where: { method: order.paymentMethod }
  });
  
  if (!paymentMethodSetting || !paymentMethodSetting.requiresProof) {
    throw new Error(`Payment proof upload is not required for ${order.paymentMethod} payment method`);
  }
  
  // Create relative path for the payment proof
  const relativePath = `/${config.uploads.dir}${config.uploads.paymentProofs}/${fileInfo.filename}`;
  
  // Update or create payment proof
  let updatedOrder;
  
  if (order.paymentProof) {
    // Delete old payment proof if exists
    const oldProofPath = path.join(__dirname, '../../', order.paymentProof.fileUrl);
    if (fs.existsSync(oldProofPath)) {
      fs.unlinkSync(oldProofPath);
    }
    
    // Update payment proof
    updatedOrder = await prisma.order.update({
      where: { id: parseInt(orderId, 10) },
      data: {
        status: 'PAYMENT_UPLOADED',
        paymentProof: {
          update: {
            fileUrl: relativePath
          }
        }
      },
      include: {
        paymentProof: true,
        orderItems: {
          include: {
            product: true
          }
        }
      }
    });
  } else {
    // Create new payment proof
    updatedOrder = await prisma.order.update({
      where: { id: parseInt(orderId, 10) },
      data: {
        status: 'PAYMENT_UPLOADED',
        paymentProof: {
          create: {
            fileUrl: relativePath
          }
        }
      },
      include: {
        paymentProof: true,
        orderItems: {
          include: {
            product: true
          }
        }
      }
    });
  }
  
  return updatedOrder;
};

/**
 * Service to verify payment for an order
 * @param {number} orderId - Order ID
 * @returns {Object} Updated order
 */
const verifyPayment = async (orderId) => {
  // Find the order
  const order = await prisma.order.findUnique({
    where: { id: parseInt(orderId, 10) },
    include: {
      orderItems: true,
      paymentProof: true
    }
  });
  
  if (!order) {
    throw new Error('Order not found');
  }
  
  // Get payment method settings
  const paymentMethodSetting = await prisma.paymentMethodSetting.findFirst({
    where: { method: order.paymentMethod }
  });
  
  if (!paymentMethodSetting) {
    throw new Error(`Payment method ${order.paymentMethod} configuration not found`);
  }
  
  // Handle different payment methods based on their settings
  if (paymentMethodSetting.requiresProof) {
    // For methods that require proof (like bank transfer or QRIS)
    if (order.status !== 'PAYMENT_UPLOADED') {
      throw new Error('Only orders with uploaded payment can be verified');
    }
    
    if (!order.paymentProof) {
      throw new Error(`No payment proof found for this ${order.paymentMethod} order`);
    }
  } else {
    // For methods that don't require proof (like cash)
    if (order.status !== 'PENDING' && order.status !== 'PAYMENT_VERIFIED') {
      throw new Error('Only pending or already verified orders can be processed');
    }
  }
  
  // Update order status to payment verified
  const updatedOrder = await prisma.order.update({
    where: { id: parseInt(orderId, 10) },
    data: {
      status: 'PAYMENT_VERIFIED'
    },
    include: {
      orderItems: {
        include: {
          product: true
        }
      },
      paymentProof: true
    }
  });
  
  return updatedOrder;
};

/**
 * Service to complete an order
 * @param {number} orderId - Order ID
 * @returns {Object} Updated order
 */
const completeOrder = async (orderId) => {
  // Find the order
  const order = await prisma.order.findUnique({
    where: { id: parseInt(orderId, 10) },
    include: {
      orderItems: true
    }
  });
  
  if (!order) {
    throw new Error('Order not found');
  }
  
  if (order.status !== 'PAYMENT_VERIFIED') {
    throw new Error('Only verified orders can be completed');
  }
  
  // Update product stock and complete order in a transaction
  const completedOrder = await prisma.$transaction(async (prisma) => {
    // Update product stock for each order item
    for (const item of order.orderItems) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity
          }
        }
      });
    }
    
    // Update order status to completed
    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(orderId, 10) },
      data: {
        status: 'COMPLETED'
      },
      include: {
        orderItems: {
          include: {
            product: true
          }
        },
        paymentProof: true
      }
    });
    
    return updatedOrder;
  });
  
  return completedOrder;
};

/**
 * Service to cancel an order
 * @param {number} orderId - Order ID
 * @returns {Object} Updated order
 */
const cancelOrder = async (orderId) => {
  // Find the order
  const order = await prisma.order.findUnique({
    where: { id: parseInt(orderId, 10) }
  });
  
  if (!order) {
    throw new Error('Order not found');
  }
  
  // Only pending or payment uploaded orders can be cancelled
  if (!['PENDING', 'PAYMENT_UPLOADED', 'PAYMENT_VERIFIED'].includes(order.status)) {
    throw new Error('Only pending, payment uploaded, or payment verified orders can be cancelled');
  }
  
  // Update order status to cancelled
  const cancelledOrder = await prisma.order.update({
    where: { id: parseInt(orderId, 10) },
    data: {
      status: 'CANCELLED'
    },
    include: {
      orderItems: {
        include: {
          product: true
        }
      },
      paymentProof: true
    }
  });
  
  return cancelledOrder;
};

/**
 * Service to get all orders
 * @param {Object} queryParams - Query parameters for filtering and pagination
 * @returns {Array} List of orders
 */
const getAllOrders = async (queryParams = {}) => {
  const { 
    status, 
    customerName,
    paymentMethod,
    startDate,
    endDate,
    page = 1, 
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = queryParams;
  
  const skip = (page - 1) * parseInt(limit, 10);
  const take = parseInt(limit, 10);
  
  // Build filter conditions
  const where = {};
  
  if (status) {
    where.status = status;
  }
  
  if (paymentMethod) {
    where.paymentMethod = paymentMethod;
  }
  
  if (customerName) {
    where.customerName = {
      contains: customerName,
      mode: 'insensitive'
    };
  }
  
  if (startDate || endDate) {
    where.createdAt = {};
    
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    
    if (endDate) {
      // Add one day to include the end date fully
      const endDateTime = new Date(endDate);
      endDateTime.setDate(endDateTime.getDate() + 1);
      where.createdAt.lt = endDateTime;
    }
  }
  
  // Get orders with pagination and sorting
  const orders = await prisma.order.findMany({
    where,
    skip,
    take,
    orderBy: {
      [sortBy]: sortOrder
    },
    include: {
      orderItems: {
        include: {
          product: true
        }
      },
      paymentProof: true
    }
  });
  
  // Get total count for pagination
  const totalOrders = await prisma.order.count({ where });
  
  return {
    orders,
    pagination: {
      total: totalOrders,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(totalOrders / parseInt(limit, 10))
    }
  };
};

/**
 * Service to get an order by ID
 * @param {number} orderId - Order ID
 * @returns {Object} Order data
 */
const getOrderById = async (orderId) => {
  const order = await prisma.order.findUnique({
    where: { id: parseInt(orderId, 10) },
    include: {
      orderItems: {
        include: {
          product: true
        }
      },
      paymentProof: true
    }
  });
  
  if (!order) {
    throw new Error('Order not found');
  }
  
  return order;
};

/**
 * Service to get pending orders count for notifications
 * @returns {Object} Count data with different statuses
 */
const getPendingOrdersCount = async () => {
  // Get payment methods that require verification
  const requiresVerificationMethods = await prisma.paymentMethodSetting.findMany({
    where: {
      requiresProof: true,
      isEnabled: true
    },
    select: {
      method: true
    }
  });
  
  const methodsRequiringVerification = requiresVerificationMethods.map(m => m.method);
  
  // Bank transfer orders with uploaded payment proofs
  const paymentUploadedCount = await prisma.order.count({
    where: {
      status: 'PAYMENT_UPLOADED',
      paymentMethod: {
        in: methodsRequiringVerification
      }
    }
  });
  
  // Cash orders waiting to be completed
  const cashVerifiedCount = await prisma.order.count({
    where: {
      status: 'PAYMENT_VERIFIED',
      paymentMethod: 'CASH'
    }
  });
  
  // Regular pending orders
  const pendingCount = await prisma.order.count({
    where: {
      status: 'PENDING'
    }
  });
  
  return { 
    total: paymentUploadedCount + cashVerifiedCount + pendingCount,
    paymentUploadedCount,
    cashVerifiedCount,
    pendingCount
  };
};

/**
 * Service to get sales summary with reset periods
 * @param {Object} queryParams - Query parameters for date range
 * @returns {Object} Sales summary data
 */
const getSalesSummary = async (queryParams = {}) => {
  // Get today's date at midnight
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get tomorrow's date at midnight
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Get the first day of current month
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  // Get the first day of next month
  const firstDayOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  
  // Daily totals - reset every day
  const dailyWhere = {
    status: 'COMPLETED',
    createdAt: {
      gte: today,
      lt: tomorrow
    }
  };
  
  // Get today's total sales amount
  const dailyTotalSales = await prisma.order.aggregate({
    where: dailyWhere,
    _sum: {
      totalAmount: true
    },
    _count: true
  });
  
  // Get sales by payment method for today
  const dailyPaymentMethods = await prisma.order.groupBy({
    by: ['paymentMethod'],
    where: dailyWhere,
    _sum: {
      totalAmount: true
    },
    _count: true
  });
  
  // Monthly product sales - reset every month
  const monthlyWhere = {
    order: {
      status: 'COMPLETED',
      createdAt: {
        gte: firstDayOfMonth,
        lt: firstDayOfNextMonth
      }
    }
  };
  
  // Get sales by product for the month
  const monthlyOrderItems = await prisma.orderItem.findMany({
    where: monthlyWhere,
    include: {
      product: true
    }
  });
  
  // Group by product and sum quantities
  const salesByProduct = {};
  monthlyOrderItems.forEach((item) => {
    if (!salesByProduct[item.productId]) {
      salesByProduct[item.productId] = {
        productId: item.productId,
        name: item.product.name,
        quantity: 0,
        totalAmount: 0
      };
    }
    salesByProduct[item.productId].quantity += item.quantity;
    salesByProduct[item.productId].totalAmount += item.subtotal;
  });
  
  // Get top 5 selling products for the month
  const topSellingProducts = Object.values(salesByProduct)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);
  
  // Get recent orders (regardless of day/month)
  const recentOrders = await prisma.order.findMany({
    where: {
      status: 'COMPLETED'
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 5,
    include: {
      orderItems: {
        include: {
          product: true
        }
      }
    }
  });
  
  // Format payment methods data
  const paymentMethodsData = dailyPaymentMethods.map(method => ({
    method: method.paymentMethod,
    count: method._count,
    total: method._sum.totalAmount || 0
  }));
  
  return {
    dailyTotalSales: dailyTotalSales._sum.totalAmount || 0,
    dailyTotalOrders: dailyTotalSales._count || 0,
    paymentMethods: paymentMethodsData,
    topSellingProducts,
    recentOrders,
    timeInfo: {
      day: today.toISOString().split('T')[0],
      month: firstDayOfMonth.toISOString().split('T')[0].substring(0, 7)
    }
  };
};

/**
 * Service to get available payment methods
 * @returns {Array} List of payment methods
 */
const getPaymentMethods = async () => {
  const settings = await prisma.paymentMethodSetting.findMany({
    where: {
      isEnabled: true
    },
    orderBy: {
      sortOrder: 'asc'
    }
  });
  
  return {
    methods: settings.map(setting => ({
      id: setting.method,
      name: setting.name,
      description: setting.description,
      requiresProof: setting.requiresProof
    }))
  };
};

/**
 * Service to get daily sales report
 * @param {String} date - Date to generate report for
 * @returns {Object} Daily sales report data
 */
const getDailySalesReport = async (date) => {
  if (!date) {
    throw new Error('Date parameter is required');
  }

  // Parse the date and set start/end of the day
  const reportDate = new Date(date);
  reportDate.setHours(0, 0, 0, 0);
  
  const nextDay = new Date(reportDate);
  nextDay.setDate(nextDay.getDate() + 1);
  
  // Find all completed orders for the selected date
  const completedOrders = await prisma.order.findMany({
    where: {
      status: 'COMPLETED',
      createdAt: {
        gte: reportDate,
        lt: nextDay
      }
    },
    include: {
      orderItems: {
        include: {
          product: {
            include: {
              category: true
            }
          }
        }
      }
    }
  });
  
  // Calculate totals
  const totalSales = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const totalOrders = completedOrders.length;
  
  // Calculate product sales
  const productSalesMap = {};
  
  completedOrders.forEach(order => {
    order.orderItems.forEach(item => {
      const { product, quantity, subtotal } = item;
      
      if (!productSalesMap[product.id]) {
        productSalesMap[product.id] = {
          productId: product.id,
          name: product.name,
          category: product.category?.name || 'Unknown',
          price: product.price,
          imageUrl: product.imageUrl,
          quantitySold: 0,
          revenue: 0
        };
      }
      
      productSalesMap[product.id].quantitySold += quantity;
      productSalesMap[product.id].revenue += subtotal;
    });
  });
  
  const productSales = Object.values(productSalesMap).sort((a, b) => b.revenue - a.revenue);
  const totalItems = productSales.reduce((sum, product) => sum + product.quantitySold, 0);
  
  // Calculate sales by payment method
  const paymentMethodData = await prisma.order.groupBy({
    by: ['paymentMethod'],
    where: {
      status: 'COMPLETED',
      createdAt: {
        gte: reportDate,
        lt: nextDay
      }
    },
    _sum: {
      totalAmount: true
    },
    _count: true
  });
  
  // Get payment method settings for names
  const paymentMethodSettings = await prisma.paymentMethodSetting.findMany();
  const methodSettingsMap = paymentMethodSettings.reduce((map, setting) => {
    map[setting.method] = setting;
    return map;
  }, {});
  
  // Format payment methods data
  const paymentMethods = paymentMethodData.map(method => {
    const setting = methodSettingsMap[method.paymentMethod];
    return {
      method: method.paymentMethod,
      name: setting ? setting.name : method.paymentMethod,
      count: method._count,
      amount: method._sum.totalAmount || 0
    };
  });
  
  // Calculate sales by category
  const categoryMap = {};
  completedOrders.forEach(order => {
    order.orderItems.forEach(item => {
      const categoryName = item.product.category?.name || 'Unknown';
      
      if (!categoryMap[categoryName]) {
        categoryMap[categoryName] = {
          name: categoryName,
          itemsSold: 0,
          revenue: 0
        };
      }
      
      categoryMap[categoryName].itemsSold += item.quantity;
      categoryMap[categoryName].revenue += item.subtotal;
    });
  });
  
  const categorySales = Object.values(categoryMap).sort((a, b) => b.revenue - a.revenue);
  
  return {
    date: reportDate,
    totalSales,
    totalOrders,
    totalItems,
    paymentMethods,
    productSales,
    categorySales,
    orders: completedOrders.map(order => ({
      id: order.id,
      customerName: order.customerName,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt
    }))
  };
};

/**
 * Service to get sales summary for a date range
 * @param {Object} params - Query parameters including start and end dates
 * @returns {Object} Sales summary data
 */
const getDateRangeSalesReport = async (params = {}) => {
  const { startDate, endDate } = params;
  
  if (!startDate || !endDate) {
    throw new Error('Start date and end date are required');
  }
  
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  // Find all completed orders for the date range
  const completedOrders = await prisma.order.findMany({
    where: {
      status: 'COMPLETED',
      createdAt: {
        gte: start,
        lte: end
      }
    },
    include: {
      orderItems: {
        include: {
          product: {
            include: {
              category: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  });
  
  // Calculate daily totals
  const dailyTotals = {};
  completedOrders.forEach(order => {
    const dateStr = order.createdAt.toISOString().split('T')[0];
    if (!dailyTotals[dateStr]) {
      dailyTotals[dateStr] = {
        date: dateStr,
        sales: 0,
        orders: 0
      };
    }
    dailyTotals[dateStr].sales += order.totalAmount;
    dailyTotals[dateStr].orders += 1;
  });
  
  const dailySales = Object.values(dailyTotals);
  
  // Calculate totals
  const totalSales = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const totalOrderCount = completedOrders.length;
  
  // Calculate payment method breakdown
  const paymentMethodMap = {};
  completedOrders.forEach(order => {
    if (!paymentMethodMap[order.paymentMethod]) {
      paymentMethodMap[order.paymentMethod] = {
        method: order.paymentMethod,
        count: 0,
        amount: 0
      };
    }
    paymentMethodMap[order.paymentMethod].count += 1;
    paymentMethodMap[order.paymentMethod].amount += order.totalAmount;
  });
  
  const paymentMethods = Object.values(paymentMethodMap);
  
  // Calculate category breakdown
  const categoryMap = {};
  completedOrders.forEach(order => {
    order.orderItems.forEach(item => {
      const categoryName = item.product.category?.name || 'Unknown';
      
      if (!categoryMap[categoryName]) {
        categoryMap[categoryName] = {
          name: categoryName,
          itemsSold: 0,
          revenue: 0
        };
      }
      
      categoryMap[categoryName].itemsSold += item.quantity;
      categoryMap[categoryName].revenue += item.subtotal;
    });
  });
  
  const categorySales = Object.values(categoryMap);
  
  return {
    startDate,
    endDate,
    totalSales,
    totalOrderCount,
    dailySales,
    paymentMethods,
    categorySales
  };
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
  getPaymentMethods,
  getDailySalesReport,
  getDateRangeSalesReport
};