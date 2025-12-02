const jwt = require('jsonwebtoken');
const { models } = require('@waterbills/db');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await models.User.findById(decoded.userId).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(500).json({ error: 'Authentication error' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

const requireBuildingAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admin can access all buildings
    if (req.user.role === 'admin') {
      return next();
    }

    // Manager and tenant need building access
    const buildingId = req.params.buildingId || req.body.buildingId || req.query.buildingId;
    
    if (!buildingId) {
      return res.status(400).json({ error: 'Building ID required' });
    }

    if (req.user.buildingId && req.user.buildingId.toString() !== buildingId) {
      return res.status(403).json({ error: 'Access denied to this building' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Authorization error' });
  }
};

const requirePremiseAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admin and manager can access all premises
    if (['admin', 'manager'].includes(req.user.role)) {
      return next();
    }

    // Tenant can only access their own premise
    const premiseId = req.params.premiseId || req.body.premiseId || req.query.premiseId;
    
    if (!premiseId) {
      return res.status(400).json({ error: 'Premise ID required' });
    }

    if (req.user.premiseId && req.user.premiseId.toString() !== premiseId) {
      return res.status(403).json({ error: 'Access denied to this premise' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Authorization error' });
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireBuildingAccess,
  requirePremiseAccess
};
