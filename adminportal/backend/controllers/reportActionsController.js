const Report = require('../models/Report');
const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * GET /api/complaints/:id
 * Returns a single report with populated user details, ensuring department authorization.
 */
exports.getReport = async (req, res) => {
  const deptName = req.department;
  const { id } = req.params;
  
  try {
    // First, find the report with all necessary fields
    let report = await Report.findOne({ _id: id, department: deptName })
      .select('title description category status priority location images createdAt updatedAt department reportedBy userId user userEmail')
      .lean();
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Get the user ID from either reportedBy or userId (for backward compatibility)
    const userId = report.reportedBy || report.userId || report.user;
    
    if (!userId) {
      // If no user ID is found, return report with default user data
      report.reportedBy = {
        name: 'User',
        email: '',
        phone: '',
        address: 'Not available',
        gender: 'Not specified',
        isActive: false
      };
      return res.json({
        ...report,
        address: report.location?.address || 'Not specified',
        images: report.images || []
      });
    }
    
    try {
      // First try to get user by email if available
      let user = null;
      if (report.userEmail) {
        user = await mongoose.connection.db.collection('users').findOne({ email: report.userEmail });
        console.log('Fetched user by email:', report.userEmail, 'Result:', user ? 'Found' : 'Not found');
      }
      
      // If not found by email, try by ID as fallback
      if (!user && userId) {
        user = await mongoose.connection.db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(userId) });
        console.log('Fetched user by ID:', userId, 'Result:', user ? 'Found' : 'Not found');
      }
      
      // Fetch citizen profile for additional details
      let profile = null;
      try {
        profile = await mongoose.connection.db.collection('citizenprofiles').findOne({ user: new mongoose.Types.ObjectId(userId) });
        console.log('Fetched citizen profile:', profile ? 'Found' : 'Not found');
      } catch (profErr) {
        console.error('Error fetching citizen profile:', profErr);
      }

      // Format the user data for the response
      const userData = (user || profile) ? {
        name: (profile && (profile.firstName || profile.lastName)) ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : (user && user.name) ? user.name : (user && user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Unknown User'),
        email: user.email || report.userEmail || '',
        phone: (profile && (profile.phoneNumber || profile.whatsappNumber)) ? (profile.phoneNumber || profile.whatsappNumber) : (user && (user.phone || user.mobile)) || 'Not provided',
        gender: (profile && profile.gender) ? profile.gender : (user && user.gender) ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : 'Not specified',
        isActive: user.active !== undefined ? user.active : true,
        address: [
          (profile && profile.address) || user?.address,
          (profile && profile.city) || user?.city,
          (profile && profile.state) || user?.state,
          (profile && profile.pinCode) || user?.pinCode
        ].filter(Boolean).join(', ').trim() || 'Not available'
      } : {
        name: 'Unknown User',
        email: '',
        phone: 'Not provided',
        address: 'Not available',
        gender: 'Not specified',
        isActive: false
      };
      
      // Create the response object with all required fields
      const response = {
        ...report,
        reportedBy: userData,
        address: report.location?.address || 'Not specified',
        images: report.images || []
      };
      
      console.log('Sending response:', JSON.stringify(response, null, 2)); // Debug log
      return res.json(response);
      
    } catch (userErr) {
      console.error('Error fetching user data:', userErr);
      // Return report with default user data if there's an error
      const response = {
        ...report,
        reportedBy: {
          name: 'Unknown User',
          email: '',
          phone: 'Not provided',
          address: 'Not available',
          gender: 'Not specified',
          isActive: false
        },
        address: report.location?.address || 'Not specified',
        images: report.images || []
      };
      return res.json(response);
    }
  } catch (err) {
    console.error('Failed to fetch report:', err);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
};

/**
 * PATCH /api/complaints/:id
 * Allows admin to update status, assignTo and add comments for a report within their department.
 */
exports.updateReport = async (req, res) => {
  const deptName = req.department;
  const reportId = req.params.id;
  const { status, priority, assignedTo, comment, dueDate } = req.body;

  try {
    // Ensure report belongs to department
    const report = await Report.findById(reportId);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    if (report.department !== deptName) {
      return res.status(403).json({ error: 'Not authorized to modify this report' });
    }

    if (status) report.status = status;
    if (priority) report.priority = priority;
    if (assignedTo !== undefined) report.assignedTo = assignedTo;
    if (dueDate !== undefined) report.dueDate = dueDate;
    if (comment && comment.text) {
      report.comments.push({ text: comment.text, author: (req.user && req.user.email) || 'Admin' });
    }

    await report.save();
    res.json({ data: report });
  } catch (err) {
    console.error('Failed to update report:', err);
    res.status(500).json({ error: 'Failed to update report' });
  }
};

/**
 * DELETE /api/complaints/:id
 * Allows admin to delete a report within their department.
 */
exports.deleteReport = async (req, res) => {
  const deptName = req.department;
  const { id } = req.params;
  try {
    const result = await Report.deleteOne({ _id: id, department: deptName });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Report not found or access denied' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete report:', err);
    res.status(500).json({ error: 'Failed to delete report' });
  }
};
