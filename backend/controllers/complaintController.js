const Complaint = require('../models/Complaint');
const { predictDepartment } = require('../utils/mlClassifier');
const { sendEmail } = require('../utils/emailSender');
const { sendWhatsApp } = require('../utils/whatsAppSender');
const { Op } = require('sequelize');

// Helper to generate ticket ID
async function generateTicketId() {
    const count = await Complaint.count();
    return `CS${Date.now().toString().slice(-6)}${count + 1}`;
}

// Create a new complaint
exports.createComplaint = async (req, res) => {
    console.log('Received complaint submission:', req.body);
    try {
        const { userId, issueType, description, latitude, longitude, address } = req.body;
        const imageFilename = req.file ? req.file.filename : null;
        const department = await predictDepartment(imageFilename, issueType, { latitude, longitude });
        const ticketId = await generateTicketId();
        const complaint = await Complaint.create({
            userId,
            issueType,
            description,
            latitude,
            longitude,
            address,
            images: [],
            department,
            ticketId
        });
        
        // Send notifications (handle failures gracefully)
        try {
            await sendEmail(complaint);
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
        }
        
        try {
            await sendWhatsApp(complaint);
        } catch (whatsappError) {
            console.error('WhatsApp sending failed:', whatsappError);
        }

        res.status(201).json({
            success: true,
            data: complaint
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get all complaints
exports.getComplaints = async (req, res) => {
    console.log('getComplaints: Received request');
    try {
        console.log('getComplaints: About to query database');
        const whereClause = {};
        if (req.query.userId) {
            whereClause.userId = req.query.userId;
        }
        const complaints = await Complaint.findAll({ where: whereClause, order: [['createdAt', 'DESC']] });
        console.log('getComplaints: Database query successful, complaints count:', complaints.length);
        res.status(200).json({
            success: true,
            count: complaints.length,
            data: complaints
        });
    } catch (error) {
        console.error('getComplaints: Error occurred:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get single complaint
exports.getComplaint = async (req, res) => {
    try {
        const complaint = await Complaint.findByPk(req.params.id);
        if (!complaint) {
            return res.status(404).json({
                success: false,
                error: 'Complaint not found'
            });
        }
        res.status(200).json({
            success: true,
            data: complaint
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Update complaint status
exports.updateComplaintStatus = async (req, res) => {
    try {
        const { status, resolutionNotes, expectedResolutionDate } = req.body;
        const [updated] = await Complaint.update(
            {
                status,
                resolutionNotes,
                expectedResolutionDate
            },
            { where: { id: req.params.id } }
        );
        if (!updated) {
            return res.status(404).json({
                success: false,
                error: 'Complaint not found'
            });
        }
        const complaint = await Complaint.findByPk(req.params.id);
        res.status(200).json({
            success: true,
            data: complaint
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Upvote a complaint
exports.upvoteComplaint = async (req, res) => {
    try {
        const complaint = await Complaint.findByPk(req.params.id);
        if (!complaint) {
            return res.status(404).json({
                success: false,
                error: 'Complaint not found'
            });
        }
        complaint.upvotes += 1;
        await complaint.save();
        res.status(200).json({
            success: true,
            data: complaint
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get nearby complaints
exports.getNearbyComplaints = async (req, res) => {
    try {
        const { longitude, latitude, maxDistance = 0.05 } = req.query; // ~5km
        const complaints = await Complaint.findAll({
            where: {
                latitude: { [Op.between]: [parseFloat(latitude) - maxDistance, parseFloat(latitude) + maxDistance] },
                longitude: { [Op.between]: [parseFloat(longitude) - maxDistance, parseFloat(longitude) + maxDistance] }
            }
        });
        res.status(200).json({
            success: true,
            count: complaints.length,
            data: complaints
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}; 