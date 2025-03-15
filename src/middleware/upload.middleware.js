const { uploadPaymentProof, uploadProductImage } = require('../utils/file-upload');

/**
 * Middleware to handle payment proof uploads
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
    next();
  });
};

/**
 * Middleware to handle product image uploads
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
    next();
  });
};

module.exports = {
  handlePaymentProofUpload,
  handleProductImageUpload
};