const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'realitysucksfs007@gmail.com',
        pass: process.env.SMTP_PASS // keep password in env for security
    }
});

// Generate email content
const generateEmailContent = (complaint) => {
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
};

// Send email notification
exports.sendEmail = async (complaint) => {
    try {
        const mailOptions = {
            from: 'realitysucksfs007@gmail.com',
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