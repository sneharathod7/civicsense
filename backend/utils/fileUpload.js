const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

/**
 * Upload a file to the server
 * @param {Object} file - The file object from multer or similar
 * @param {string} uploadPath - The path to upload the file to (relative to public/uploads)
 * @param {Array} allowedMimeTypes - Array of allowed MIME types
 * @param {number} maxFileSize - Maximum file size in bytes
 * @returns {Promise<Object>} - Returns file info { filename, path, mimetype, size }
 */
const uploadFile = async (file, uploadPath, allowedMimeTypes = [], maxFileSize = 5 * 1024 * 1024) => {
  try {
    // Check if file exists
    if (!file) {
      throw new Error('No file uploaded');
    }

    // Check file type
    if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`);
    }

    // Check file size
    if (file.size > maxFileSize) {
      throw new Error(`File too large. Maximum size is ${maxFileSize / (1024 * 1024)}MB`);
    }

    // Create upload directory if it doesn't exist
    const fullUploadPath = path.join(process.cwd(), 'public', 'uploads', uploadPath);
    
    try {
      await fs.access(fullUploadPath);
    } catch (error) {
      await fs.mkdir(fullUploadPath, { recursive: true });
    }

    // Generate unique filename
    const fileExt = path.extname(file.name).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `${path.basename(file.name, fileExt)}-${uniqueSuffix}${fileExt}`;
    const filePath = path.join(uploadPath, filename);
    const fullFilePath = path.join(fullUploadPath, filename);

    // Move file to upload directory
    await file.mv(fullFilePath);

    // Return file info
    return {
      filename,
      path: `/uploads/${uploadPath}/${filename}`,
      fullPath: fullFilePath,
      mimetype: file.mimetype,
      size: file.size,
      originalname: file.name
    };
  } catch (error) {
    logger.error('File upload error', { error: error.message, stack: error.stack });
    throw error;
  }
};

/**
 * Delete a file from the server
 * @param {string} filePath - The file path to delete (relative to public)
 * @returns {Promise<boolean>} - Returns true if file was deleted, false if it didn't exist
 */
const deleteFile = async (filePath) => {
  try {
    const fullPath = path.join(process.cwd(), 'public', filePath);
    
    try {
      await fs.access(fullPath);
      await fs.unlink(fullPath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false; // File doesn't exist
      }
      throw error;
    }
  } catch (error) {
    logger.error('File deletion error', { filePath, error: error.message, stack: error.stack });
    throw error;
  }
};

/**
 * Process multiple file uploads
 * @param {Array} files - Array of file objects
 * @param {string} uploadPath - The path to upload files to (relative to public/uploads)
 * @param {Array} allowedMimeTypes - Array of allowed MIME types
 * @param {number} maxFileSize - Maximum file size in bytes per file
 * @returns {Promise<Array>} - Returns array of file info objects
 */
const uploadMultipleFiles = async (files, uploadPath, allowedMimeTypes = [], maxFileSize = 5 * 1024 * 1024) => {
  try {
    if (!files || files.length === 0) {
      return [];
    }

    const uploadPromises = files.map(file => 
      uploadFile(file, uploadPath, allowedMimeTypes, maxFileSize)
    );

    return await Promise.all(uploadPromises);
  } catch (error) {
    logger.error('Multiple file upload error', { error: error.message, stack: error.stack });
    throw error;
  }
};

/**
 * Generate a signed URL for a file (for use with cloud storage)
 * @param {string} filePath - The file path to generate URL for
 * @param {number} expiresIn - Expiration time in seconds
 * @returns {Promise<string>} - Returns signed URL
 */
const generateSignedUrl = async (filePath, expiresIn = 3600) => {
  // This is a placeholder for cloud storage integration
  // In a real app, you would integrate with AWS S3, Google Cloud Storage, etc.
  return `${process.env.APP_URL || 'http://localhost:5000'}${filePath}`;
};

module.exports = {
  uploadFile,
  deleteFile,
  uploadMultipleFiles,
  generateSignedUrl
};
