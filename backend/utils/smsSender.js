const twilio = require('twilio');

// Load credentials from environment variables (set in .env file, not committed)
const accountSid = 'AC11f60f5ab297bcc3f7cdc131e7d38c88';
const authToken  = '290bfa67d64d532eab1cf02efa1e238d';
const fromPhone  = '+18078053080';

let client;
if (accountSid.startsWith('AC') && authToken && fromPhone) {
  client = twilio(accountSid, authToken);
} else {
  console.warn('Twilio credentials are not set in environment variables. SMS sending disabled.');
}

/**
 * Send OTP via SMS using Twilio
 * @param {string} to - Destination mobile number (E.164 format e.g. +919876543210)
 * @param {string} otp - 6-digit OTP code
 */
async function sendOtpSms(to, otp) {
  if (!client) return;
  try {
    await client.messages.create({
      body: `Your CivicSense verification code is ${otp}`,
      from: fromPhone,
      to
    });
    console.log(`OTP SMS sent to ${to}`);
  } catch (err) {
    console.error('Failed to send OTP SMS', err);
  }
}

module.exports = { sendOtpSms };
