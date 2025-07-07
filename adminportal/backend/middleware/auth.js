const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Make sure we have the email in the expected format
    req.user = {
      email: decoded.email || decoded.sub,
      ...decoded
    };
    console.log('[AUTH] Authenticated user:', req.user);
    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    res.status(401).json({ error: 'Invalid token', details: err.message });
  }
};