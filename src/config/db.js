const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client with logging in development
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
});

// Handle Prisma connection
const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('Connected to database');
    return prisma;
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Handle Prisma disconnection
const disconnectDB = async () => {
  try {
    await prisma.$disconnect();
    console.log('Disconnected from database');
  } catch (error) {
    console.error('Database disconnection error:', error);
    process.exit(1);
  }
};

module.exports = {
  prisma,
  connectDB,
  disconnectDB
};