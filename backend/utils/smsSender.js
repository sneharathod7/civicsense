const axios = require('axios');

const AUTH_KEY = process.env.MSG91_AUTH_KEY || '457058AfFfOU2Ie685684bcP1';
const TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID || '68567c7dd6fc051ef735fed2';
const MSG91_BASE_URL = 'https://control.msg91.com/api/v5'; // Fixed URL

/**
 * Send OTP via MSG91
 * @param {string} mobile - Mobile number with country code (+91xxxxxxxxxx or 91xxxxxxxxxx)
 * @param {string} otp - 6 digit code
 */
exports.sendOtpSms = async (mobile, otp) => {
  if (!mobile) throw new Error('Mobile number missing');
  if (!otp) throw new Error('OTP missing');
  
  try {
    // Ensure mobile number is in correct format (91xxxxxxxxxx)
    let mobileParam = mobile.toString().replace(/^\+/, ''); // remove +
    
    const payload = {
      template_id: TEMPLATE_ID,
      mobile: mobileParam,
      otp: otp.toString(),
      otp_expiry: 5 // minutes
    };
    
    console.log('Sending OTP to:', mobileParam, 'OTP:', otp);
    
    const { data } = await axios.post(`${MSG91_BASE_URL}/otp`, payload, {
      headers: {
        'Content-Type': 'application/json',
        authkey: AUTH_KEY
      },
      timeout: 10000 // increased timeout
    });
    
    console.log('MSG91 SMS API response:', data);
    
    // Check for success response
    if (data.type === 'success') {
      return {
        success: true,
        requestId: data.request_id,
        message: 'OTP sent successfully'
      };
    } else {
      throw new Error(data.message || 'MSG91 OTP send failed');
    }
    
  } catch (err) {
    console.error('Error sending SMS via MSG91:', {
      error: err.response?.data || err.message,
      status: err.response?.status,
      mobile: mobile
    });
    
    // Return more specific error messages
    if (err.response?.status === 401) {
      throw new Error('Invalid AUTH_KEY - check your MSG91 credentials');
    } else if (err.response?.status === 400) {
      throw new Error('Invalid request parameters - check template_id and mobile number');
    } else if (err.code === 'ENOTFOUND') {
      throw new Error('Network error - check internet connection');
    }
    
    throw new Error(err.response?.data?.message || err.message || 'Failed to send OTP');
  }
};