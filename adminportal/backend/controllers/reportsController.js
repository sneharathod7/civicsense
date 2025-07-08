const Report = require('../models/Report');
const Employee = require('../models/Employee');

/**
 * GET /api/reports
 * Get reports with optional filtering
 */
exports.getReports = async (req, res) => {
  try {
    const { assignedTo, status, department, limit = 10, page = 1 } = req.query;
    const query = {};
    
    // Add department filter
    if (department) {
      query.department = department;
    }
    
    // Add assignedTo filter
    if (assignedTo) {
      console.log('Looking for employee with employeeId:', assignedTo);
      // Find the employee to get their ID
      const employee = await Employee.findOne({ employeeId: assignedTo });
      console.log('Found employee:', employee);
      
      if (employee) {
        // Use the employee's _id to find reports assigned to them
        query.assignedTo = employee._id;
        console.log('Querying reports with assignedTo:', employee._id, 'and status:', status);
      } else {
        console.log('Employee not found with employeeId:', assignedTo);
        // If employee not found, return empty result
        return res.json({
          success: true,
          data: [],
          pagination: {
            total: 0,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: 0
          }
        });
      }
    }
    
    // Add status filter
    if (status) {
      query.status = status;
    }
    
    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    console.log('Final query:', JSON.stringify(query, null, 2));
    
    const reports = await Report.find(query)
      .populate({
        path: 'assignedTo',
        model: 'Employee',
        select: 'name employeeId department'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    console.log('Found reports:', JSON.stringify(reports, null, 2));
    
    // Get total count for pagination
    const total = await Report.countDocuments(query);
    console.log('Total reports found:', total);
    
    res.json({
      success: true,
      data: reports,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ 
      error: 'Failed to fetch reports',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * GET /api/reports/assigned/:employeeId
 * Get reports assigned to a specific employee
 */
exports.getAssignedReports = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { status, limit = 5 } = req.query;
    
    // Find the employee
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    // Build query
    const query = { 'assignedTo.employeeId': employee.employeeId };
    
    // Add status filter if provided
    if (status) {
      query.status = status;
    }
    
    // Get reports
    const reports = await Report.find(query)
      .sort({ assignedAt: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .lean();
    
    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('Error fetching assigned reports:', error);
    res.status(500).json({ 
      error: 'Failed to fetch assigned reports',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * GET /api/reports/performance/:employeeId
 * Get performance metrics for an employee
 */
exports.getEmployeePerformance = async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    // Find the employee
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    // Get total reports assigned to this employee
    const totalReports = await Report.countDocuments({ 
      'assignedTo.employeeId': employee.employeeId 
    });

    // Get completed reports
    const completedReports = await Report.countDocuments({ 
      'assignedTo.employeeId': employee.employeeId,
      status: 'resolved'
    });

    // Get in-progress reports
    const inProgressReports = await Report.countDocuments({
      'assignedTo.employeeId': employee.employeeId,
      status: 'in-progress'
    });

    // Calculate average rating from completed reports with ratings
    const ratedReports = await Report.aggregate([
      { 
        $match: { 
          'assignedTo.employeeId': employee.employeeId,
          rating: { $exists: true, $gt: 0 }
        } 
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          count: { $sum: 1 }
        }
      }
    ]);

    const averageRating = ratedReports[0]?.averageRating || 0;
    const ratingCount = ratedReports[0]?.count || 0;

    res.json({
      success: true,
      data: {
        totalReports,
        completedReports,
        inProgressReports,
        averageRating: parseFloat(averageRating.toFixed(1)),
        ratingCount
      }
    });
  } catch (error) {
    console.error('Error fetching employee performance:', error);
    res.status(500).json({ 
      error: 'Failed to fetch employee performance',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
