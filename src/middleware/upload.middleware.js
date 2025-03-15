const { 
  uploadPaymentProof, 
  uploadProductImage, 
  compressPaymentProof, 
  compressProductImage 
} = require('../utils/file-upload');

/**
 * Middleware to handle payment proof uploads with compression
 */
const handlePaymentProofUpload = (req, res, next) => {
  const upload = uploadPaymentProof.single('paymentProof');
  
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: 'Error uploading payment proof',
        error: err.message
      });
    }
    
    // Proceed to compression middleware
    compressPaymentProof(req, res, (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error compressing payment proof',
          error: err.message
        });
      }
      next();
    });
  });
};

/**
 * Middleware to handle product image uploads with compression
 */
const handleProductImageUpload = (req, res, next) => {
  const upload = uploadProductImage.single('productImage');
  
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: 'Error uploading product image',
        error: err.message
      });
    }
    
    // Proceed to compression middleware
    compressProductImage(req, res, (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error compressing product image',
          error: err.message
        });
      }
      next();
    });
  });
};

module.exports = {
  handlePaymentProofUpload,
  handleProductImageUpload
};