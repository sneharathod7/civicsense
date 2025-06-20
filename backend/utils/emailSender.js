const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Generate email content
function generateEmailContent(complaint) {
    return `
        <h2>New Civic Issue Reported</h2>
        <p><strong>Ticket ID:</strong> ${complaint.ticketId}</p>
        <p><strong>Issue Type:</strong> ${complaint.issueType}</p>
        <p><strong>Location:</strong> ${complaint.address}</p>
        <p><strong>Description:</strong> ${complaint.description}</p>
        <p><strong>Department:</strong> ${complaint.department}</p>
        <p><strong>Reported At:</strong> ${new Date(complaint.createdAt).toLocaleString()}</p>
        <p>Please take necessary action to resolve this issue.</p>
    `;
}

// Send email notification
exports.sendEmail = async (complaint) => {
    try {
        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: 'guptadevu321@gmail.com',
            subject: `New Civic Issue Report - ${complaint.ticketId}`,
            html: generateEmailContent(complaint)
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email sent for complaint ${complaint.ticketId}`);
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};
exports.sendOtp = async (to, otp) => {
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: 'CivicSense – Your OTP Code',
      html: `<p>Your six-digit OTP is <strong>${otp}</strong>.</p>`
    };
    await transporter.sendMail(mailOptions);
  };