const adminEmailToDepartment = require('../utils/adminMapping');

module.exports = function(req, res, next) {
  try {
    const email = req.user?.email;
    console.log('[DEPARTMENT] User email from request:', email);
    
    if (!email) {
      console.error('[DEPARTMENT] No email found in request user:', req.user);
      return res.status(403).json({ 
        error: 'Unauthorized: No email found in token',
        user: req.user
      });
    }

    const department = adminEmailToDepartment[email];
    console.log('[DEPARTMENT] Mapped department:', department);
    
    if (!department) {
      console.error('[DEPARTMENT] No department found for email:', email);
      console.log('[DEPARTMENT] Available mappings:', Object.entries(adminEmailToDepartment));
      return res.status(403).json({ 
        error: 'Unauthorized: No department assigned to this email',
        email: email,
        availableMappings: Object.keys(adminEmailToDepartment)
      });
    }
    
    req.department = department;
    console.log('[DEPARTMENT] Department set on request:', department);
    next();
  } catch (error) {
    console.error('[DEPARTMENT] Error in department middleware:', error);
    res.status(500).json({ 
      error: 'Internal server error in department middleware',
      details: error.message 
    });
  }
};