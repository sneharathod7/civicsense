const Report = require('../models/Report');

exports.getDashboardStats = async (req, res) => {
  const deptName = req.department;
  try {
    const deptCategories = require('../utils/departmentCategories')[deptName] || [];
    const orFilter = [ { department: deptName } ];
    if (deptCategories.length) {
      orFilter.push({ category: { $in: deptCategories.map(c => new RegExp(`^${c}$`, 'i')) } });
    }
    if (req.query.category) {
      orFilter.push({ category: new RegExp(`^${req.query.category}$`, 'i') });
    }
    const total = await Report.countDocuments({ $or: orFilter });
    const pending = await Report.countDocuments({ $and: [ { $or: orFilter }, { status: /pending/i } ] });
    const active = await Report.countDocuments({ $and: [ { $or: orFilter }, { status: /in\s*progress/i } ] });
    const resolved = await Report.countDocuments({ $and: [ { $or: orFilter }, { status: /resolved/i } ] });
    res.json({ total, pending, active, resolved, department: deptName });
  } catch {
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
};