const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const department = require('../middleware/department');
const { 
  getUnassigned, 
  getEmployees, 
  createEmployee, 
  getEmployeeDetails,
  getEmployeeStats,
  getEmployeeActivity,
  getEmployeeReports,
  deleteEmployee 
} = require('../controllers/employeesController');

/**
 * @route   GET /api/employees/unassigned
 * @desc    Get list of unassigned employees for the current department
 * @access  Private (Admin/Department Head)
 */
// List employees
router.get('/', auth, department, getEmployees);

// Add new employee
router.post('/', auth, department, createEmployee);

// Employee details routes
router.get('/:id', auth, department, getEmployeeDetails);
router.get('/:id/stats', auth, department, getEmployeeStats);
router.get('/:id/activity', auth, department, getEmployeeActivity);
router.get('/:id/reports', auth, department, getEmployeeReports);

// Delete employee by id
router.delete('/:id', auth, department, deleteEmployee);

// Unassigned employees (legacy)
router.get('/unassigned', auth, department, getUnassigned);

module.exports = router;
