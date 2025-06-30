const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

// Create a transporter object using SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Function to send a new report notification
const sendReportNotification = async (reportData, recipientEmail) => {
  try {
    const { title, description, category, location, images = [] } = reportData;
    
    // Create email content
    const mailOptions = {
      from: `"CivicSense" <${process.env.SMTP_USER}>`,
      to: recipientEmail,
      subject: `New Report: ${title}`,
      html: `
        <h2>New Report Submitted</h2>
        <p><strong>Title:</strong> ${title}</p>
        <p><strong>Description:</strong> ${description}</p>
        <p><strong>Category:</strong> ${category}</p>
        <p><strong>Location:</strong> ${location?.address || 'N/A'}</p>
        <p><strong>Coordinates:</strong> ${location?.coordinates?.join(', ') || 'N/A'}</p>
        ${images.length > 0 ? 
          `<p><strong>Images (${images.length}):</strong></p>
           <div>${images.map(img => `<img src="${img}" style="max-width: 300px; margin: 5px;">`).join('')}</div>` 
          : ''}
        <p>Please review this report in the admin panel.</p>
      `
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = {
  sendReportNotification
};
