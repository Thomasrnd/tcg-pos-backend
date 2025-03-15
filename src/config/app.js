require('dotenv').config();

// Application configuration
const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  // Upload directories
  uploads: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    paymentProofs: '/payment-proofs',
    products: '/products',
    maxSize: {
      paymentProof: 5 * 1024 * 1024, // 5MB
      productImage: 2 * 1024 * 1024, // 2MB
    },
  },

  // Cors options
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },

  // Validation
  validation: {
    password: {
      minLength: 6,
    },
  },
};

module.exports = config;