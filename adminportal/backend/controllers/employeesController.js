const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const Report = require('../models/Report');
const ActivityLog = require('../models/ActivityLog');

/**
 * GET /api/employees/unassigned
 * Return unassigned employees for the requesting admin's department
 */
const getUnassigned = async (req, res) => {
  try {
    const deptName = req.department;
    console.log(`[DEBUG] Fetching unassigned employees for department: ${deptName}`);
    
    // Get the database instance
    const db = mongoose.connection.db;
    
    // Check if the collection exists
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log('[DEBUG] Available collections:', collectionNames);
    
    if (!collectionNames.includes('employees')) {
      console.log('[ERROR] Employees collection does not exist');
      return res.status(200).json({ data: [] });
    }
    
    // Get the employees collection
    const employeesCollection = db.collection('employees');
    
    // First, find all distinct departments to see what we're working with
    const allDepartments = await employeesCollection.distinct('department');
    console.log('[DEBUG] All departments in employees collection:', allDepartments);
    
    // Find any employee with matching department (case insensitive)
    const matchingEmployee = await employeesCollection.findOne({
      department: { $regex: new RegExp(deptName, 'i') }
    });
    
    const exactDeptName = matchingEmployee ? matchingEmployee.department : deptName;
    console.log(`[DEBUG] Using department name: ${exactDeptName}`);
    
    // Build the query
    const query = {
      department: exactDeptName,
      $or: [
        { status: { $regex: /^not assigned$/i } },
        { status: { $exists: false } }
      ]
    };
    
    console.log('[DEBUG] Final query:', JSON.stringify(query, null, 2));
    
    // Execute the query
    const employees = await employeesCollection.find(query).toArray();
    console.log(`[DEBUG] Found ${employees.length} unassigned employees`);
    
    if (employees.length > 0) {
      console.log('[DEBUG] Sample employee:', {
        name: employees[0].name,
        employeeId: employees[0].employeeId,
        department: employees[0].department,
        status: employees[0].status
      });
    }
    
    res.status(200).json({ data: employees });
  } catch (error) {
    console.error('Error fetching unassigned employees:', error);
    res.status(500).json({ 
      error: 'Failed to fetch unassigned employees',
      details: error.message 
    });
  }
};

/**
 * POST /api/complaints/:id/assign
 * Body: { employeeId }
 * Assign an employee (by employeeId) to the report
 */
const assignEmployee = async (req, res) => {
  const deptName = req.department;
  const { id: reportId } = req.params;
  const { employeeId } = req.body;

  console.log(`[ASSIGN] Starting assignment: reportId=${reportId}, employeeId=${employeeId}`);

  if (!employeeId) {
    console.error('[ASSIGN] Error: employeeId is required');
    return res.status(400).json({ error: 'employeeId is required' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log('[ASSIGN] Fetching report and employee...');
    
    // Fetch report with session
    const report = await Report.findById(reportId).session(session);
    if (!report) {
      console.error(`[ASSIGN] Report not found: ${reportId}`);
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Report not found' });
    }

    // Check department authorization
    if (report.department !== deptName) {
      console.error(`[ASSIGN] Unauthorized department: ${deptName} != ${report.department}`);
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ error: 'Not authorized for this department' });
    }

    // Check report status
    const allowedStatuses = ['reported', 'pending', 'verified'];
    if (!allowedStatuses.includes(String(report.status).toLowerCase())) {
      console.error(`[ASSIGN] Invalid report status: ${report.status}`);
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        error: 'Report already assigned or in progress',
        currentStatus: report.status
      });
    }

    // Find employee with session
    const employee = await Employee.findOne({ employeeId, department: deptName }).session(session);
    if (!employee) {
      console.error(`[ASSIGN] Employee not found or wrong department: ${employeeId}`);
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ 
        error: 'Employee not found or not in your department',
        employeeId,
        department: deptName
      });
    }

    // Check if employee is already assigned
    if (employee.status === 'assigned' && employee.reportId) {
      console.error(`[ASSIGN] Employee already assigned to report: ${employee.reportId}`);
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        error: 'Employee is already assigned to another report',
        currentReport: employee.reportId
      });
    }

    console.log('[ASSIGN] Updating employee and report...');
    
    // Update employee status and assign to report
    employee.status = 'assigned';
    employee.reportId = report._id; // Store reference to the report
    employee.assignedAt = new Date();
    
    // Ensure gender is in the correct format (lowercase)
    if (employee.gender) {
      employee.gender = employee.gender.toLowerCase();
    }
    
    console.log('[ASSIGN] Employee data before save:', {
      _id: employee._id,
      employeeId: employee.employeeId,
      name: employee.name,
      gender: employee.gender,
      status: employee.status,
      reportId: employee.reportId,
      department: employee.department
    });
    
    // Save employee (Mongoose will validate modified fields only)
    await employee.save({ session });

    // Update report status and assign employee
    report.status = 'in-progress';
    report.assignedTo = employee._id; // Store reference to the employee
    report.inProgressAt = new Date();
    
    // Add a comment about the assignment
    report.comments = report.comments || [];
    report.comments.push({
      text: `Assigned to ${employee.name} (${employee.employeeId})`,
      postedBy: 'System',
      status: 'assigned',
      timestamp: new Date()
    });
    
    // Update report using updateOne to avoid full document validation (handles missing required fields in legacy data)
    await Report.updateOne(
      { _id: report._id },
      {
        $set: {
          status: 'in-progress',
          assignedTo: employee._id,
          inProgressAt: new Date()
        },
        $push: {
          comments: {
            text: `Assigned to ${employee.name} (${employee.employeeId})`,
            postedBy: 'System',
            status: 'assigned',
            timestamp: new Date()
          }
        }
      },
      { session }
    );

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    console.log('[ASSIGN] Assignment successful');
    
    // Refresh report for response & populate assigned employee
    const updatedReport = await Report.findById(report._id)
      .populate('assignedTo', 'name employeeId')
      .lean();

    res.status(200).json({ 
      success: true,
      message: 'Employee assigned successfully',
      data: {
        report: {
          id: updatedReport._id,
          status: updatedReport.status,
          assignedTo: updatedReport.assignedTo,
          inProgressAt: updatedReport.inProgressAt,
          comments: updatedReport.comments?.slice(-1)[0] // Return only the latest comment
        },
        employee: {
          id: employee._id,
          employeeId: employee.employeeId,
          name: employee.name,
          status: employee.status,
          reportId: employee.reportId
        }
      }
    });

  } catch (error) {
    // Abort transaction on error
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    if (session) {
      session.endSession();
    }
    
    console.error('[ASSIGN] Error during assignment:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue,
      errors: error.errors ? Object.keys(error.errors) : undefined
    });
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: errors
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Duplicate key error',
        keyPattern: error.keyPattern,
        keyValue: error.keyValue
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to assign employee',
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : 'Internal server error'
    });
  }
};

// ------------------------------------------------------------------
//  NEW CONTROLLER FUNCTIONS FOR EMPLOYEE MANAGEMENT
// ------------------------------------------------------------------

/**
 * GET /api/employees
 * List employees for the admin's department with optional search & pagination
 */
const getEmployees = async (req, res) => {
  try {
    const deptName = req.department;
    const { search = '', page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    // Build query with exact department match (case insensitive)
    const query = { 
      $expr: { 
        $eq: [
          { $trim: { input: { $toLower: "$department" } } }, 
          { $trim: { input: deptName.toLowerCase() } } 
        ] 
      } 
    };
    
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { name: regex },
        { employeeId: regex },
        { email: regex },
        { phone: regex }
      ];
    }

    const total = await Employee.countDocuments(query);
    const employees = await Employee.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    res.json({ data: employees, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees', details: error.message });
  }
};

/**
 * POST /api/employees
 * Add a new employee to the department
 */
const createEmployee = async (req, res) => {
  try {
    const deptName = req.department;
    const { employeeId, name, gender = 'other', phone = '', email } = req.body;

    if (!employeeId || !name || !email) {
      return res.status(400).json({ error: 'employeeId, name and email are required' });
    }

    // Check duplicates
    const existing = await Employee.findOne({ employeeId });
    if (existing) {
      return res.status(400).json({ error: 'Employee ID already exists' });
    }

    // Ensure department name matches exactly what's in adminMapping
    const adminMapping = require('../utils/adminMapping');
    const normalizedDeptName = Object.values(adminMapping).find(
      dept => dept.toLowerCase().trim() === deptName.toLowerCase().trim()
    ) || deptName; // Fallback to original if not found

    const employee = new Employee({
      employeeId,
      name,
      gender: gender.toLowerCase(),
      phone,
      email,
      department: normalizedDeptName, // Use the normalized department name
      status: 'not assigned'
    });

    await employee.save();

    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Failed to create employee', details: error.message });
  }
};

/**
 * DELETE /api/employees/:id
 * Remove an employee document (department restricted)
 */
const getEmployeeDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const deptName = req.department;
    
    const employee = await Employee.findById(id).lean();
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    // Verify department access
    if (employee.department.toLowerCase().trim() !== deptName.toLowerCase().trim()) {
      return res.status(403).json({ 
        error: 'Not authorized to view this employee',
        details: 'Department mismatch'
      });
    }
    
    res.json(employee);
    
  } catch (error) {
    console.error('Error fetching employee details:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

const getEmployeeStats = async (req, res) => {
  try {
    const { id } = req.params;
    const deptName = req.department;
    
    // First verify employee exists and belongs to department
    const employee = await Employee.findOne({
      _id: id,
      $expr: {
        $eq: [
          { $trim: { input: { $toLower: "$department" } } },
          { $trim: { input: deptName.toLowerCase() } }
        ]
      }
    }).lean();
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found or unauthorized' });
    }
    
    // Get report statistics
    const stats = await Report.aggregate([
      {
        $match: {
          assignedTo: employee._id,
          status: { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [{ $eq: ["$status", "resolved"] }, 1, 0]
            }
          },
          inProgress: {
            $sum: {
              $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0]
            }
          },
          avgResolutionTime: { $avg: "$resolutionTime" } // in days
        }
      }
    ]);
    
    // Format the response
    const result = stats[0] || {
      total: 0,
      completed: 0,
      inProgress: 0,
      avgResolutionTime: null
    };
    
    res.json({
      totalReports: result.total,
      completedReports: result.completed,
      inProgress: result.inProgress,
      avgResolutionTime: result.avgResolutionTime ? Math.round(result.avgResolutionTime * 10) / 10 : null
    });
    
  } catch (error) {
    console.error('Error fetching employee stats:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

const getEmployeeActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 10 } = req.query;
    const deptName = req.department;
    
    // Verify employee exists and belongs to department
    const employee = await Employee.findOne({
      _id: id,
      $expr: {
        $eq: [
          { $trim: { input: { $toLower: "$department" } } },
          { $trim: { input: deptName.toLowerCase() } }
        ]
      }
    }).lean();
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found or unauthorized' });
    }
    
    // Get recent activity
    const activity = await ActivityLog.find({
      'user.id': id,
      'user.type': 'employee'
    })
    .sort({ timestamp: -1 })
    .limit(parseInt(limit))
    .lean();
    
    res.json(activity);
    
  } catch (error) {
    console.error('Error fetching employee activity:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

const getEmployeeReports = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 5 } = req.query;
    const deptName = req.department;
    
    // Verify employee exists and belongs to department
    const employee = await Employee.findOne({
      _id: id,
      $expr: {
        $eq: [
          { $trim: { input: { $toLower: "$department" } } },
          { $trim: { input: deptName.toLowerCase() } }
        ]
      }
    }).lean();
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found or unauthorized' });
    }
    
    // Get assigned reports
    const reports = await Report.find({
      assignedTo: id,
      department: { $regex: new RegExp(`^${deptName}$`, 'i') }
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .select('_id title category status createdAt updatedAt')
    .lean();
    
    res.json(reports);
    
  } catch (error) {
    console.error('Error fetching employee reports:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const deptName = req.department;
    
    // First find the employee to verify department access
    const employee = await Employee.findById(id).lean();
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check department match case-insensitively
    if (employee.department.toLowerCase().trim() !== deptName.toLowerCase().trim()) {
      console.log(`[DELETE] Department mismatch: ${employee.department} vs ${deptName}`);
      return res.status(403).json({ 
        error: 'Not authorized to delete this employee',
        details: 'Department mismatch',
        employeeDepartment: employee.department,
        userDepartment: deptName
      });
    }

    // Check if employee is assigned to any reports
    const assignedReports = await Report.countDocuments({
      assignedTo: id,
      status: { $nin: ['resolved', 'closed'] }
    });
    
    if (assignedReports > 0) {
      return res.status(400).json({
        error: 'Cannot delete employee',
        details: 'Employee is currently assigned to active reports',
        assignedReports
      });
    }
    
    // Proceed with deletion
    await Employee.findByIdAndDelete(id);
    
    // Log the deletion
    await new ActivityLog({
      action: 'Employee Deleted',
      details: `Employee ${employee.name} (${employee.employeeId}) was deleted`,
      user: {
        id: req.user.id,
        type: 'admin',
        name: req.user.name
      },
      target: {
        id: employee._id,
        type: 'employee',
        name: employee.name
      }
    }).save();
    
    res.json({ message: 'Employee deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// Export the controller functions
module.exports = {
  getUnassigned,
  getEmployees,
  createEmployee,
  getEmployeeDetails,
  getEmployeeStats,
  getEmployeeActivity,
  getEmployeeReports,
  deleteEmployee,
  assignEmployee
};
