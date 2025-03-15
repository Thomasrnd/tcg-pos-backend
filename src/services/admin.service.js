const { prisma } = require('../config/db');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');

/**
 * Service to handle admin registration
 * @param {Object} adminData - Admin data including username and password
 * @returns {Object} Newly created admin (without password)
 */
const registerAdmin = async (adminData) => {
  const { username, password } = adminData;

  // Check if admin already exists
  const existingAdmin = await prisma.admin.findUnique({
    where: { username }
  });

  if (existingAdmin) {
    throw new Error('Admin with this username already exists');
  }

  // Hash the password
  const hashedPassword = await hashPassword(password);

  // Create admin in the database
  const newAdmin = await prisma.admin.create({
    data: {
      username,
      password: hashedPassword
    }
  });

  // Return admin without password
  const { password: _, ...adminWithoutPassword } = newAdmin;
  return adminWithoutPassword;
};

/**
 * Service to handle admin login
 * @param {Object} loginData - Login credentials including username and password
 * @returns {Object} Admin info and JWT token
 */
const loginAdmin = async (loginData) => {
  const { username, password } = loginData;

  // Find admin by username
  const admin = await prisma.admin.findUnique({
    where: { username }
  });

  if (!admin) {
    throw new Error('Invalid credentials');
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, admin.password);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  // Generate JWT token
  const token = generateToken({ id: admin.id, username: admin.username });

  // Return admin info and token
  const { password: _, ...adminWithoutPassword } = admin;
  return {
    admin: adminWithoutPassword,
    token
  };
};

/**
 * Service to get admin profile by ID
 * @param {number} adminId - Admin ID
 * @returns {Object} Admin profile (without password)
 */
const getAdminProfile = async (adminId) => {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId }
  });

  if (!admin) {
    throw new Error('Admin not found');
  }

  const { password: _, ...adminWithoutPassword } = admin;
  return adminWithoutPassword;
};

/**
 * Service to update admin profile
 * @param {number} adminId - Admin ID
 * @param {Object} updateData - Data to update
 * @returns {Object} Updated admin profile (without password)
 */
const updateAdminProfile = async (adminId, updateData) => {
  const { username, currentPassword, newPassword } = updateData;
  
  // Find the admin
  const admin = await prisma.admin.findUnique({
    where: { id: adminId }
  });
  
  if (!admin) {
    throw new Error('Admin not found');
  }
  
  // Prepare update data
  const updateFields = {};
  
  // Update username if provided
  if (username && username !== admin.username) {
    // Check if username is already taken
    const existingAdmin = await prisma.admin.findUnique({
      where: { username }
    });
    
    if (existingAdmin) {
      throw new Error('Username is already taken');
    }
    
    updateFields.username = username;
  }
  
  // Update password if provided
  if (currentPassword && newPassword) {
    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, admin.password);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }
    
    // Hash new password
    updateFields.password = await hashPassword(newPassword);
  }
  
  // Update admin in database
  if (Object.keys(updateFields).length > 0) {
    const updatedAdmin = await prisma.admin.update({
      where: { id: adminId },
      data: updateFields
    });
    
    const { password: _, ...adminWithoutPassword } = updatedAdmin;
    return adminWithoutPassword;
  }
  
  // If no updates were made, return the current admin
  const { password: _, ...adminWithoutPassword } = admin;
  return adminWithoutPassword;
};

module.exports = {
  registerAdmin,
  loginAdmin,
  getAdminProfile,
  updateAdminProfile
};