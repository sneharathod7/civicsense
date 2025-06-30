const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

class ImageProcessor {
  constructor() {
    this.supportedFormats = [
      'jpeg', 'jpg', 'png', 'webp', 'gif', 'tiff', 'avif'
    ];
    
    this.defaultOptions = {
      quality: 80,
      width: 1200,
      height: 1200,
      fit: 'inside',
      withoutEnlargement: true
    };
  }

  /**
   * Process and save an image
   * @param {Object} file - The file object from multer or similar
   * @param {Object} options - Processing options
   * @param {string} uploadPath - Path to save the image (relative to public/uploads)
   * @returns {Promise<Object>} Processed image information
   */
  async processImage(file, options = {}, uploadPath = 'images') {
    try {
      // Validate input
      if (!file || !file.buffer) {
        throw new Error('No file or file buffer provided');
      }

      // Merge default options with provided options
      const processingOptions = { ...this.defaultOptions, ...options };
      
      // Generate unique filename
      const fileExt = path.extname(file.originalname).toLowerCase().substring(1);
      if (!this.supportedFormats.includes(fileExt)) {
        throw new Error(`Unsupported image format: ${fileExt}`);
      }
      
      const filename = `${uuidv4()}.${fileExt}`;
      const fullUploadPath = path.join(process.cwd(), 'public', 'uploads', uploadPath);
      const filePath = path.join(fullUploadPath, filename);
      const relativePath = `/uploads/${uploadPath}/${filename}`;
      
      // Create directory if it doesn't exist
      try {
        await fs.access(fullUploadPath);
      } catch (error) {
        await fs.mkdir(fullUploadPath, { recursive: true });
      }

      // Process image with sharp
      const image = sharp(file.buffer);
      const metadata = await image.metadata();
      
      // Resize and optimize image
      await image
        .resize({
          width: processingOptions.width,
          height: processingOptions.height,
          fit: processingOptions.fit,
          withoutEnlargement: processingOptions.withoutEnlargement
        })
        .toFormat(fileExt, {
          quality: processingOptions.quality,
          progressive: true,
          optimizeScans: true
        })
        .toFile(filePath);
      
      // Get file stats
      const stats = await fs.stat(filePath);
      
      return {
        filename,
        path: relativePath,
        fullPath: filePath,
        mimeType: `image/${fileExt}`,
        size: stats.size,
        width: metadata.width,
        height: metadata.height,
        format: fileExt,
        originalName: file.originalname
      };
    } catch (error) {
      logger.error('Image processing error', { 
        error: error.message, 
        stack: error.stack,
        file: file ? file.originalname : 'No file',
        options
      });
      throw error;
    }
  }

  /**
   * Create multiple sizes of an image (e.g., thumbnail, medium, large)
   * @param {Object} file - The file object
   * @param {Object} sizes - Object with size names and dimensions
   * @param {string} uploadPath - Base upload path
   * @returns {Promise<Object>} Object with processed images
   */
  async createImageSizes(file, sizes = {}, uploadPath = 'images') {
    try {
      const results = {};
      
      for (const [size, dimensions] of Object.entries(sizes)) {
        const result = await this.processImage(file, {
          width: dimensions.width,
          height: dimensions.height,
          fit: dimensions.fit || 'inside',
          quality: dimensions.quality || 80
        }, path.join(uploadPath, size));
        
        results[size] = result;
      }
      
      return results;
    } catch (error) {
      logger.error('Error creating image sizes', { 
        error: error.message, 
        stack: error.stack 
      });
      throw error;
    }
  }

  /**
   * Generate a thumbnail from an image
   * @param {Object} file - The file object
   * @param {number} width - Thumbnail width
   * @param {number} height - Thumbnail height
   * @param {string} uploadPath - Upload path
   * @returns {Promise<Object>} Thumbnail information
   */
  async createThumbnail(file, width = 200, height = 200, uploadPath = 'thumbnails') {
    return this.processImage(file, {
      width,
      height,
      fit: 'cover',
      quality: 70
    }, uploadPath);
  }

  /**
   * Convert an image to a different format
   * @param {string} inputPath - Path to the input image
   * @param {string} outputFormat - Output format (jpeg, png, webp, etc.)
   * @param {Object} options - Conversion options
   * @returns {Promise<Buffer>} Processed image buffer
   */
  async convertImage(inputPath, outputFormat = 'webp', options = {}) {
    try {
      if (!this.supportedFormats.includes(outputFormat.toLowerCase())) {
        throw new Error(`Unsupported output format: ${outputFormat}`);
      }
      
      return await sharp(inputPath)
        .toFormat(outputFormat, {
          quality: options.quality || 80,
          progressive: options.progressive !== false,
          ...options
        })
        .toBuffer();
    } catch (error) {
      logger.error('Image conversion error', { 
        inputPath, 
        outputFormat, 
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Delete an image file
   * @param {string} filePath - Path to the image file (relative to public)
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async deleteImage(filePath) {
    try {
      const fullPath = path.join(process.cwd(), 'public', filePath);
      await fs.unlink(fullPath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.warn('Image not found for deletion', { filePath });
        return false; // File doesn't exist
      }
      
      logger.error('Error deleting image', { 
        filePath, 
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Extract dominant colors from an image
   * @param {Buffer|string} input - Image buffer or path
   * @param {number} count - Number of colors to extract (max 16)
   * @returns {Promise<Array>} Array of dominant colors in hex format
   */
  async getDominantColors(input, count = 5) {
    try {
      const { dominant } = await sharp(input)
        .resize(100, 100) // Resize for faster processing
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      // Use k-means clustering to find dominant colors
      // This is a simplified implementation
      const colors = [];
      const colorMap = new Map();
      
      for (let i = 0; i < dominant.length; i += 3) {
        const r = dominant[i];
        const g = dominant[i + 1];
        const b = dominant[i + 2];
        
        // Skip transparent/alpha pixels
        if (dominant.length > i + 3 && dominant[i + 3] === 0) continue;
        
        // Convert to hex
        const hex = `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
        
        // Count color occurrences
        colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
      }
      
      // Sort by frequency and take top N colors
      return Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, count)
        .map(([color]) => color);
    } catch (error) {
      logger.error('Error extracting dominant colors', { 
        error: error.message,
        stack: error.stack
      });
      return [];
    }
  }

  /**
   * Add a watermark to an image
   * @param {string|Buffer} input - Input image path or buffer
   * @param {string|Buffer} watermark - Watermark image path or buffer
   * @param {Object} options - Watermark options
   * @returns {Promise<Buffer>} Watermarked image buffer
   */
  async addWatermark(input, watermark, options = {}) {
    try {
      const { width, height } = await sharp(input).metadata();
      
      // Default watermark options
      const watermarkOptions = {
        gravity: options.gravity || 'southeast',
        opacity: options.opacity || 0.5,
        size: options.size || 0.2, // 20% of the image width
        padding: options.padding || 10,
        ...options
      };
      
      // Calculate watermark size
      const watermarkSize = Math.floor(width * watermarkOptions.size);
      
      // Process watermark
      const watermarkBuffer = await sharp(watermark)
        .resize(watermarkSize)
        .toBuffer();
      
      // Composite the watermark onto the image
      return await sharp(input)
        .composite([
          {
            input: watermarkBuffer,
            gravity: watermarkOptions.gravity,
            blend: 'over',
            tile: false,
            top: watermarkOptions.padding,
            left: watermarkOptions.padding
          }
        ])
        .toBuffer();
    } catch (error) {
      logger.error('Error adding watermark', { 
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}

// Create and export a singleton instance
const imageProcessor = new ImageProcessor();

module.exports = imageProcessor;
