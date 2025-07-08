const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const department = require('../middleware/department');
const { getUnassigned } = require('../controllers/employeesController');

/**
 * @route   GET /api/employees/unassigned
 * @desc    Get list of unassigned employees for the current department
 * @access  Private (Admin/Department Head)
 */
router.get('/unassigned', auth, department, getUnassigned);

module.exports = router;
