const Joi = require('joi');
const { StatusCodes } = require('http-status-codes');
const ErrorResponse = require('./errorResponse');

// Common validation patterns
const patterns = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  mobile: /^[0-9]{10}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  pincode: /^[1-9][0-9]{5}$/,
  url: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/,
  objectId: /^[0-9a-fA-F]{24}$/
};

// Custom validation messages
const messages = {
  'string.empty': '{#label} is required',
  'any.required': '{#label} is required',
  'string.email': 'Please provide a valid email address',
  'string.pattern.base': 'Please provide a valid {#label}',
  'string.min': '{#label} must be at least {#limit} characters',
  'string.max': '{#label} must be at most {#limit} characters',
  'number.min': '{#label} must be at least {#limit}',
  'number.max': '{#label} must be at most {#limit}',
  'array.min': 'At least one {#label} is required',
  'any.only': 'Passwords do not match'
};

// Common validation schemas
const schemas = {
  // Authentication
  register: Joi.object({
    firstName: Joi.string().required().label('First Name'),
    lastName: Joi.string().required().label('Last Name'),
    email: Joi.string()
      .email()
      .required()
      .pattern(patterns.email)
      .label('Email Address'),
    password: Joi.string()
      .min(8)
      .required()
      .pattern(patterns.password)
      .label('Password')
      .messages({
        'string.pattern.base':
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      }),
    confirmPassword: Joi.string()
      .valid(Joi.ref('password'))
      .required()
      .label('Confirm Password'),
    role: Joi.string().valid('user', 'municipal', 'admin').default('user'),
    mobile: Joi.string()
      .pattern(patterns.mobile)
      .required()
      .label('Mobile Number'),
  }).options({ abortEarly: false }),

  login: Joi.object({
    email: Joi.string().email().required().label('Email'),
    password: Joi.string().required().label('Password'),
  }),

  // User
  updateProfile: Joi.object({
    firstName: Joi.string().label('First Name'),
    lastName: Joi.string().label('Last Name'),
    email: Joi.string().email().label('Email'),
    mobile: Joi.string().pattern(patterns.mobile).label('Mobile Number'),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required().label('Current Password'),
    newPassword: Joi.string()
      .min(8)
      .required()
      .pattern(patterns.password)
      .label('New Password'),
    confirmPassword: Joi.string()
      .valid(Joi.ref('newPassword'))
      .required()
      .label('Confirm New Password'),
  }).with('newPassword', 'confirmPassword'),

  // Complaint
  createComplaint: Joi.object({
    title: Joi.string().required().min(10).max(100).label('Title'),
    description: Joi.string().required().min(20).label('Description'),
    issueType: Joi.string()
      .required()
      .valid(
        'pothole',
        'garbage',
        'street_light',
        'water_leak',
        'road_repair',
        'drainage',
        'other'
      )
      .label('Issue Type'),
    address: Joi.string().required().label('Address'),
    location: Joi.object({
      type: Joi.string().valid('Point').default('Point'),
      coordinates: Joi.array()
        .items(Joi.number())
        .length(2)
        .required()
        .label('Coordinates'),
    })
      .required()
      .label('Location'),
    images: Joi.array().items(Joi.string()).label('Images'),
    department: Joi.string().required().label('Department'),
  }),

  updateComplaint: Joi.object({
    status: Joi.string()
      .valid('pending', 'in_progress', 'resolved', 'rejected')
      .label('Status'),
    statusUpdateNotes: Joi.string().when('status', {
      is: Joi.exist(),
      then: Joi.string().required().label('Status Update Notes'),
      otherwise: Joi.string(),
    }),
    assignedTo: Joi.string().pattern(patterns.objectId).label('Assigned To'),
    priority: Joi.string().valid('low', 'medium', 'high').label('Priority'),
  }),

  // Comment
  addComment: Joi.object({
    text: Joi.string().required().min(1).max(500).label('Comment'),
    isPrivate: Joi.boolean().default(false).label('Is Private'),
  }),

  // Query params
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1).label('Page'),
    limit: Joi.number().integer().min(1).max(100).default(10).label('Limit'),
    sort: Joi.string().label('Sort'),
    fields: Joi.string().label('Fields'),
  }),
};

/**
 * Validate request data against a Joi schema
 * @param {Object} data - The data to validate
 * @param {Joi.Schema} schema - The Joi schema to validate against
 * @param {Object} options - Additional options for validation
 * @returns {Object} - The validated data
 * @throws {ErrorResponse} - If validation fails
 */
const validate = (data, schema, options = {}) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true,
    messages,
    ...options,
  });

  if (error) {
    const errors = error.details.reduce((acc, curr) => {
      const key = curr.path.join('.');
      acc[key] = curr.message.replace(/['"]/g, '');
      return acc;
    }, {});

    throw new ErrorResponse('Validation Error', StatusCodes.BAD_REQUEST, errors);
  }

  return value;
};

/**
 * Middleware to validate request data against a schema
 * @param {string} schemaName - The name of the schema to use
 * @param {string} source - The request property to validate (body, params, query)
 * @returns {Function} - Express middleware function
 */
const validateRequest = (schemaName, source = 'body') => {
  return (req, res, next) => {
    try {
      const schema = schemas[schemaName];
      if (!schema) {
        throw new Error(`Schema '${schemaName}' not found`);
      }

      const data = req[source];
      const validatedData = validate(data, schema);
      
      // Replace the request data with the validated data
      req[source] = validatedData;
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  patterns,
  schemas,
  validate,
  validateRequest,
};
