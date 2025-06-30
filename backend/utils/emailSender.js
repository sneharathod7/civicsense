const path = require('path');
const fs = require('fs').promises;
const ejs = require('ejs');
const logger = require('./logger');
const nodemailer = require('nodemailer');

// Create reusable transporter
let transporter;

const initTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      }
    });
    
    // Verify connection configuration
    transporter.verify((error) => {
      if (error) {
        logger.error('SMTP Connection Error', error);
        console.error('SMTP Connection Error:', error);
      } else {
        logger.info('SMTP Server is ready to take our messages');
        console.log('SMTP Server is ready to take our messages');
      }
    });
  }
  return transporter;
};

// Initialize transporter on require
initTransporter();

// Load email template
const loadTemplate = async (templateName, data) => {
  try {
    const templatePath = path.join(
      __dirname,
      `../templates/emails/${templateName}.ejs`
    );
    
    const template = await fs.readFile(templatePath, 'utf-8');
    return ejs.render(template, { 
      ...data,
      year: new Date().getFullYear(),
      appName: process.env.APP_NAME || 'CivicSense',
      appUrl: process.env.CLIENT_URL || 'http://localhost:3000',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@civicsense.com'
    });
  } catch (error) {
    logger.error('Error loading email template', { templateName, error });
    throw new Error(`Failed to load email template: ${templateName}`);
  }
};

// Email templates
const templates = {
  // New complaint notification
  newComplaint: async (complaint) => ({
    subject: `New ${complaint.issueType} Reported - ${complaint.ticketId}`,
    template: 'complaint-new',
    data: { complaint }
  }),
  
  // Status update
  statusUpdate: async (complaint, oldStatus) => ({
    subject: `Status Update: ${complaint.issueType} (${complaint.ticketId})`,
    template: 'status-update',
    data: { complaint, oldStatus }
  }),
  
  // OTP email
  otp: async (email, otp) => ({
    subject: 'Your Verification Code',
    template: 'otp',
    data: { email, otp }
  }),
  
  // Password reset
  passwordReset: async (user, resetUrl) => ({
    subject: 'Password Reset Request',
    template: 'password-reset',
    data: { user, resetUrl }
  }),
  
  // Account verification
  verifyEmail: async (user, verificationUrl) => ({
    subject: 'Verify Your Email Address',
    template: 'verify-email',
    data: { user, verificationUrl }
  }),
  
  // Custom email
  custom: async (templateName, data, subject = '') => ({
    subject,
    template: templateName,
    data
  })
};

// Send email
const sendEmail = async (options) => {
  try {
    if (!transporter) {
      initTransporter();
    }

    const { to, subject, html, text, template, data = {}, attachments } = options;
    
    // If template is provided, render it
    let emailHtml = html;
    if (template) {
      emailHtml = await loadTemplate(template, data);
    }
    
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || 'CivicSense',
        address: process.env.SMTP_FROM || process.env.SMTP_USER
      },
      to: Array.isArray(to) ? to : [to],
      subject: subject || 'Notification from CivicSense',
      html: emailHtml,
      text: text || emailHtml.replace(/<[^>]*>?/gm, ''),
      attachments,
      replyTo: process.env.REPLY_TO_EMAIL || process.env.SMTP_FROM
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    logger.info('Email sent successfully', {
      messageId: info.messageId,
      to: mailOptions.to,
      subject: mailOptions.subject
    });
    
    return info;
  } catch (error) {
    logger.error('Error sending email', { 
      error: error.message,
      stack: error.stack,
      options: {
        to: options.to,
        subject: options.subject,
        template: options.template
      }
    });
    throw error;
  }
};

// Public methods
module.exports = {
  // Send email with template
  sendTemplate: async (templateName, to, data = {}) => {
    const template = templates[templateName];
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }
    
    const { subject, template: templateFile, data: templateData } = await template(to, data);
    return sendEmail({
      to,
      subject,
      template: templateFile,
      data: templateData
    });
  },
  
  // Send OTP email
  sendOtp: async (email, otp) => {
    return sendEmail({
      to: email,
      subject: 'Your Verification Code',
      template: 'otp',
      data: { 
        otp,
        subject: 'Your Verification Code' // Ensure subject is passed for the layout
      }
    });
  },
  
  // Send password reset email
  sendPasswordReset: async (user, resetUrl) => {
    return sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      template: 'password-reset',
      data: { user, resetUrl }
    });
  },
  
  // Send verification email
  sendVerificationEmail: async (user, verificationUrl) => {
    return sendEmail({
      to: user.email,
      subject: 'Verify Your Email Address',
      template: 'verify-email',
      data: { user, verificationUrl }
    });
  },
  
  // Send new complaint notification
  sendNewComplaintNotification: async (complaint, adminEmails = []) => {
    if (!adminEmails || adminEmails.length === 0) {
      adminEmails = [process.env.ADMIN_EMAIL || 'admin@civicsense.com'];
    }
    
    return sendEmail({
      to: adminEmails,
      subject: `New ${complaint.issueType} Reported - ${complaint.ticketId}`,
      template: 'complaint-new',
      data: { complaint }
    });
  },
  
  // Send complaint status update
  sendStatusUpdate: async (complaint, oldStatus, userEmail) => {
    return sendEmail({
      to: userEmail,
      subject: `Status Update: ${complaint.issueType} (${complaint.ticketId})`,
      template: 'status-update',
      data: { complaint, oldStatus }
    });
  },
  
  // Custom email with template
  sendCustomEmail: async (templateName, to, data = {}, subject = '') => {
    return sendEmail({
      to,
      subject,
      template: templateName,
      data
    });
  },
  
  // Raw email sending
  sendEmail
};