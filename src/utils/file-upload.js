// src/utils/file-upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const config = require('../config/app');

// Ensure the upload directory exists
const createUploadDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Configure storage for payment proofs
const paymentProofStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/payment-proofs');
    createUploadDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `payment-proof-${uniqueSuffix}.jpg`); // We'll convert all images to JPG
  }
});

// Configure storage for product images
const productImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/products');
    createUploadDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `product-${uniqueSuffix}.jpg`); // We'll convert all images to JPG
  }
});

// Configure storage for QRIS images
const qrisImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/qris');
    createUploadDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `qris-${uniqueSuffix}.jpg`); // We'll convert all images to JPG
  }
});

// File filter to accept only images
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (ext && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Create multer upload instances
const uploadPaymentProof = multer({
  storage: paymentProofStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: imageFilter
});

const uploadProductImage = multer({
  storage: productImageStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: imageFilter
});

const uploadQrisImage = multer({
  storage: qrisImageStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: imageFilter
});

// Compress payment proof image
const compressPaymentProof = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    const imagePath = req.file.path;
    
    // Compress and resize the image
    await sharp(imagePath)
      .resize(800) // Resize to max width of 800px (maintains aspect ratio)
      .jpeg({ quality: 70 }) // Convert to JPEG with 70% quality
      .toBuffer()
      .then(buffer => {
        fs.writeFileSync(imagePath, buffer); // Overwrite the original file
      });
    
    next();
  } catch (error) {
    console.error('Error compressing payment proof:', error);
    next(error);
  }
};

// Compress product image
const compressProductImage = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    const imagePath = req.file.path;
    
    // Compress and resize the image
    await sharp(imagePath)
      .resize(1200) // Resize to max width of 1200px (maintains aspect ratio)
      .jpeg({ quality: 80 }) // Convert to JPEG with 80% quality
      .toBuffer()
      .then(buffer => {
        fs.writeFileSync(imagePath, buffer); // Overwrite the original file
      });
    
    next();
  } catch (error) {
    console.error('Error compressing product image:', error);
    next(error);
  }
};

// Compress QRIS image
const compressQrisImage = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    const imagePath = req.file.path;
    
    // Compress and resize the image
    await sharp(imagePath)
      .resize(1000) // Resize to max width of 1000px (maintains aspect ratio)
      .jpeg({ quality: 80 }) // Convert to JPEG with 80% quality
      .toBuffer()
      .then(buffer => {
        fs.writeFileSync(imagePath, buffer); // Overwrite the original file
      });
    
    next();
  } catch (error) {
    console.error('Error compressing QRIS image:', error);
    next(error);
  }
};

module.exports = {
  uploadPaymentProof,
  uploadProductImage,
  uploadQrisImage,
  compressPaymentProof,
  compressProductImage,
  compressQrisImage
};