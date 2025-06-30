const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

/**
 * Generate a random string of specified length
 * @param {number} length - Length of the random string
 * @param {string} type - Type of characters to include (alpha, numeric, alphanumeric, hex)
 * @returns {string} - Random string
 */
const generateRandomString = (length = 10, type = 'alphanumeric') => {
  let chars = '';
  
  switch (type.toLowerCase()) {
    case 'alpha':
      chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
      break;
    case 'numeric':
      chars = '0123456789';
      break;
    case 'hex':
      chars = '0123456789abcdef';
      break;
    case 'alphanumeric':
    default:
      chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      break;
  }
  
  let result = '';
  const charsLength = chars.length;
  
  // Use crypto for better randomness if available
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % charsLength];
  }
  
  return result;
};

/**
 * Generate a random numeric OTP (One Time Password)
 * @param {number} length - Length of the OTP (4-10 digits)
 * @returns {string} - Random numeric OTP
 */
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  
  // Ensure length is between 4 and 10
  const otpLength = Math.max(4, Math.min(10, length));
  
  // Use crypto for better randomness
  const randomValues = new Uint32Array(otpLength);
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < otpLength; i++) {
    otp += digits[randomValues[i] % digits.length];
  }
  
  return otp;
};

/**
 * Generate a UUID v4
 * @returns {string} - UUID v4 string
 */
const generateUUID = () => {
  return uuidv4();
};

/**
 * Generate a random API key
 * @param {number} length - Length of the API key
 * @returns {string} - Random API key
 */
const generateApiKey = (length = 32) => {
  return generateRandomString(length, 'alphanumeric');
};

/**
 * Generate a secure random token
 * @param {number} bytes - Number of bytes
 * @returns {string} - Hex encoded token
 */
const generateToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Generate a unique ticket ID for complaints
 * @param {string} prefix - Optional prefix for the ticket
 * @returns {string} - Unique ticket ID (e.g., "TKT-ABC123-XYZ456")
 */
const generateTicketId = (prefix = 'TKT') => {
  const date = new Date();
  const datePart = date.getFullYear().toString().slice(-2) + 
                  (date.getMonth() + 1).toString().padStart(2, '0') + 
                  date.getDate().toString().padStart(2, '0');
  
  const randomPart1 = generateRandomString(3, 'alpha').toUpperCase();
  const randomPart2 = generateRandomString(3, 'alpha').toUpperCase();
  const randomPart3 = Math.floor(100 + Math.random() * 900); // 100-999
  
  return `${prefix}-${datePart}-${randomPart1}${randomPart2}-${randomPart3}`;
};

/**
 * Generate a secure password reset token
 * @returns {Object} - Object containing token and expiry date
 */
const generatePasswordResetToken = () => {
  // Generate a token
  const resetToken = generateToken(32);
  
  // Hash the token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  // Set expiry to 10 minutes from now
  const resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000);
  
  return { resetToken, resetPasswordToken, resetPasswordExpire };
};

/**
 * Generate a secure email verification token
 * @returns {Object} - Object containing token and expiry date
 */
const generateEmailVerificationToken = () => {
  // Generate a token
  const verificationToken = generateToken(32);
  
  // Hash the token
  const emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  
  // Set expiry to 24 hours from now
  const emailVerificationExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);
  
  return { verificationToken, emailVerificationToken, emailVerificationExpire };
};

/**
 * Generate a short code (for verification codes, etc.)
 * @param {number} length - Length of the code (4-10 characters)
 * @param {string} type - Type of code (alphanumeric, alpha, numeric)
 * @returns {string} - Generated code
 */
const generateShortCode = (length = 6, type = 'alphanumeric') => {
  // Ensure length is between 4 and 10
  const codeLength = Math.max(4, Math.min(10, length));
  
  switch (type.toLowerCase()) {
    case 'alpha':
      return generateRandomString(codeLength, 'alpha').toUpperCase();
    case 'numeric':
      return generateRandomString(codeLength, 'numeric');
    case 'alphanumeric':
    default:
      return generateRandomString(codeLength, 'alphanumeric').toUpperCase();
  }
};

module.exports = {
  generateRandomString,
  generateOTP,
  generateUUID,
  generateApiKey,
  generateToken,
  generateTicketId,
  generatePasswordResetToken,
  generateEmailVerificationToken,
  generateShortCode
};
