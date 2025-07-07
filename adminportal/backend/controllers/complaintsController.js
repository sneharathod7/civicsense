const Report = require('../models/Report');
const User = require('../models/User');

/**
 * GET /api/complaints
 * Returns list of complaints for the logged-in admin's department (max 100, newest first).
 */
exports.getComplaints = async (req, res) => {
  const deptName = req.department;
  const userEmail = req.user?.email;
  
  console.log(`[DEBUG] User email: ${userEmail}`);
  console.log(`[DEBUG] Department from middleware: ${deptName}`);
  // Parse query params with defaults
  const {
    status,
    category,
    startDate,
    endDate,
    deadlineAfter,
    deadlineBefore,
    search,
    page = 1,
    limit = 10,
  } = req.query;

  // Ensure positive integers
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

  try {
    console.log(`Fetching complaints for department: ${deptName}`);
    const deptCategories = require('../utils/departmentCategories')[deptName] || [];
    console.log(`Department categories:`, deptCategories);

    // Build secure query for MongoDB
    const query = { department: deptName };
    console.log('Initial query:', JSON.stringify(query, null, 2));

    // Category filter - map department categories to actual report categories
    if (category) {
      query.category = new RegExp(`^${category}$`, 'i');
    } else if (deptCategories && deptCategories.length > 0) {
      // Map department categories to actual report categories
      const categoryMap = {
        'roads': 'roads',
        'Water': 'water',
        'Electricity': 'electric',
        'Environment': 'environment',
        'Sanitation': 'sanitation',
        'Infrastructure': 'infrastructure'
      };
      
      // Get valid categories that exist in our map
      const validCategories = deptCategories
        .filter(c => c && typeof c === 'string' && categoryMap[c])
        .map(c => categoryMap[c]);
      
      console.log('Mapped categories:', validCategories);
      
      if (validCategories.length > 0) {
        query.category = { $in: validCategories };
      }
    }

    // Status filter – accept both "in progress" and "in-progress" style values
    if (status) {
      query.status = new RegExp(`^${status.replace(/\s+/g, '-')}|${status.replace(/-/g, ' ')}$`, 'i');
    }

    // Date range (createdAt)
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Deadline range (dueDate)
    if (deadlineAfter || deadlineBefore) {
      query.dueDate = {};
      if (deadlineAfter) query.dueDate.$gte = new Date(deadlineAfter);
      if (deadlineBefore) query.dueDate.$lte = new Date(deadlineBefore);
    }

    // Text search (title / description)
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [{ title: regex }, { description: regex }];
    }

    console.log('Final query:', JSON.stringify(query, null, 2));

    // Total count for pagination
    const total = await Report.countDocuments(query);

    // First, get the reports without populating to handle large datasets efficiently
    console.log('Final query before find:', JSON.stringify(query, null, 2));
    
    // Log the count of matching documents
    const totalCount = await Report.countDocuments(query);
    console.log(`Total matching documents: ${totalCount}`);
    
    const reports = await Report.find(query)
      .sort({ createdAt: -1 }) /* keep order */
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate({ path: 'assignedTo', model: 'Employee', select: 'employeeId name email phone department' })
      .lean();
      
    console.log(`Found ${reports.length} reports`);
      
    // Get all user IDs from the reports
    const userIds = [];
    reports.forEach(report => {
      const userId = report.reportedBy || report.userId;
      if (userId && !userIds.includes(userId.toString())) {
        userIds.push(userId.toString());
      }
    });
    
    // Fetch all users in a single query
    const users = await User.find({ _id: { $in: userIds } })
      .select('firstName lastName email phone gender address isActive')
      .lean();
      
    // Create a map of user ID to user data for quick lookup
    const userMap = {};
    users.forEach(user => {
      userMap[user._id.toString()] = user;
    });
    
    // Map over the reports and attach user data
    const complaints = reports.map(report => {
      // Ensure assigned employee object consistency
      if (report.assignedTo && typeof report.assignedTo === 'object' && report.assignedTo._id) {
        // Flatten assigned employee data if needed
        report.assignedTo = {
          _id: report.assignedTo._id,
          employeeId: report.assignedTo.employeeId || '',
          name: report.assignedTo.name || 'Employee',
          email: report.assignedTo.email || '',
          phone: report.assignedTo.phone || '',
          department: report.assignedTo.department || ''
        };
      }

      const userId = (report.reportedBy || report.userId)?.toString();
      const user = userMap[userId];
      
      // Format the user data for the response
      if (user) {
        report.reportedBy = {
          name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Unknown User',
          email: user.email || '',
          phone: user.phone || 'Not provided',
          address: user.address ? 
            `${user.address.street || ''}, ${user.address.city || ''}, ${user.address.state || ''}`.replace(/\s*,\s*$/, '') 
            : 'Not available',
          gender: user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : 'Not specified',
          isActive: user.isActive !== undefined ? user.isActive : true
        };
      } else {
        // If user not found, provide default values
        report.reportedBy = {
          name: 'Unknown User',
          email: '',
          phone: 'Not provided',
          address: 'Not available',
          gender: 'Not specified',
          isActive: false
        };
      }
      
      return report;
    });

    console.log(`Found ${complaints.length} complaints`);

    res.json({
      data: complaints,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Error fetching complaints:', error);
    // Send more detailed error information in development
    const errorResponse = {
      error: 'Failed to fetch complaints',
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
        details: error.toString()
      })
    };
    res.status(500).json(errorResponse);
  }
};
