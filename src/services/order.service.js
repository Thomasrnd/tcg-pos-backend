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
  const { customerName, items } = orderData;
  
  if (!items || items.length === 0) {
    throw new Error('Order must contain at least one item');
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
  
  // Create order with transaction to ensure data consistency
  const newOrder = await prisma.$transaction(async (prisma) => {
    // Create the order
    const order = await prisma.order.create({
      data: {
        customerName,
        totalAmount,
        status: 'PENDING',
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
  
  if (order.status !== 'PAYMENT_UPLOADED') {
    throw new Error('Only orders with uploaded payment can be verified');
  }
  
  if (!order.paymentProof) {
    throw new Error('No payment proof found for this order');
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
  if (!['PENDING', 'PAYMENT_UPLOADED'].includes(order.status)) {
    throw new Error('Only pending or payment uploaded orders can be cancelled');
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
 * @returns {number} Count of pending orders with uploaded payments
 */
const getPendingOrdersCount = async () => {
  const count = await prisma.order.count({
    where: {
      status: 'PAYMENT_UPLOADED'
    }
  });
  
  return { count };
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
  
  return {
    dailyTotalSales: dailyTotalSales._sum.totalAmount || 0,
    dailyTotalOrders: dailyTotalSales._count || 0,
    topSellingProducts,
    recentOrders,
    timeInfo: {
      day: today.toISOString().split('T')[0],
      month: firstDayOfMonth.toISOString().split('T')[0].substring(0, 7)
    }
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
  getSalesSummary
};