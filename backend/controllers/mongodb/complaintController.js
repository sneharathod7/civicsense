const Complaint = require('../../models/mongodb/Complaint');
const User = require('../../models/mongodb/User');
const mongoose = require('mongoose');

// Helper to generate ticket ID
async function generateTicketId() {
    const count = await Complaint.countDocuments();
    return `CS${Date.now().toString().slice(-6)}${count + 1}`;
}

// Create a new complaint
exports.createComplaint = async (req, res) => {
    console.log('Received complaint submission (MongoDB):', req.body);
    try {
        const { userId, issueType, description, latitude, longitude, address } = req.body;

        if (!userId || !issueType || !description || !latitude || !longitude || !address) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const ticketId = await generateTicketId();
        const complaint = new Complaint({
            ticketId,
            user: userId,
            issueType,
            description,
            location: {
                type: 'Point',
                coordinates: [parseFloat(longitude), parseFloat(latitude)]
            },
            address,
            status: 'pending',
            upvotes: 0,
            upvotedBy: [],
            images: req.files ? req.files.map(file => file.path) : []
        });

        await complaint.save();
        await complaint.populate('user', 'firstName lastName email');

        res.status(201).json({
            success: true,
            data: complaint
        });
    } catch (error) {
        console.error('Error creating complaint (MongoDB):', error);
        res.status(500).json({
            success: false,
            error: 'Server error while creating complaint',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get all complaints
exports.getComplaints = async (req, res) => {
    try {
        const { status, userId, limit = 10, page = 1 } = req.query;
        const query = {};

        if (status) query.status = status;
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            query.user = userId;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [complaints, total] = await Promise.all([
            Complaint.find(query)
                .populate('user', 'firstName lastName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Complaint.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            count: complaints.length,
            total,
            pages: Math.ceil(total / limit),
            data: complaints
        });
    } catch (error) {
        console.error('Error getting complaints (MongoDB):', error);
        res.status(500).json({
            success: false,
            error: 'Server error while fetching complaints'
        });
    }
};

// Get single complaint
exports.getComplaint = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id)
            .populate('user', 'firstName lastName email')
            .populate('upvotedBy', 'firstName lastName');

        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        res.status(200).json({
            success: true,
            data: complaint
        });
    } catch (error) {
        console.error('Error getting complaint (MongoDB):', error);
        res.status(500).json({
            success: false,
            error: 'Server error while fetching complaint'
        });
    }
};

// Update complaint status (admin/official)
exports.updateComplaintStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const allowedStatuses = ['pending', 'in_progress', 'resolved', 'rejected'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status value' });
        }
        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) {
            return res.status(404).json({ success: false, message: 'Complaint not found' });
        }
        complaint.status = status;
        await complaint.save();
        res.status(200).json({ success: true, data: complaint });
    } catch (error) {
        console.error('Error updating complaint status (MongoDB):', error);
        res.status(500).json({ success: false, error: 'Server error while updating status' });
    }
};

// Upvote a complaint
exports.upvoteComplaint = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required to upvote'
            });
        }

        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        const userIndex = complaint.upvotedBy.indexOf(userId);
        let upvoted = false;

        if (userIndex === -1) {
            complaint.upvotedBy.push(userId);
            complaint.upvotes += 1;
            upvoted = true;
        } else {
            complaint.upvotedBy.splice(userIndex, 1);
            complaint.upvotes = Math.max(0, complaint.upvotes - 1);
        }

        await complaint.save();

        res.status(200).json({
            success: true,
            upvoted,
            upvotes: complaint.upvotes
        });
    } catch (error) {
        console.error('Error upvoting complaint (MongoDB):', error);
        res.status(500).json({
            success: false,
            error: 'Server error while upvoting complaint'
        });
    }
};

// Get nearby complaints
exports.getNearbyComplaints = async (req, res) => {
    try {
        const { longitude, latitude, maxDistance = 5000 } = req.query;

        if (!longitude || !latitude) {
            return res.status(400).json({
                success: false,
                message: 'Longitude and latitude are required'
            });
        }

        const point = {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
        };

        const complaints = await Complaint.find({
            location: {
                $near: {
                    $geometry: point,
                    $maxDistance: parseInt(maxDistance)
                }
            },
            status: { $ne: 'resolved' }
        })
            .populate('user', 'firstName lastName')
            .limit(50);

        res.status(200).json({
            success: true,
            count: complaints.length,
            data: complaints
        });
    } catch (error) {
        console.error('Error getting nearby complaints (MongoDB):', error);
        res.status(500).json({
            success: false,
            error: 'Server error while fetching nearby complaints'
        });
    }
};
