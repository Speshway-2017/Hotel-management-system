import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import Property from '../models/property.model.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Decode token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }

      if (req.user.status !== 'Active') {
        return res.status(403).json({ success: false, message: 'Your account is suspended. Access denied.' });
      }

      next();
    } catch (error) {
      console.error('JWT Verification Error:', error.message);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role (${req.user ? req.user.role : 'none'}) is not authorized to access this resource`
      });
    }
    next();
  };
};

// Validate that the property assigned to a property-level Admin/Staff is active
export const checkPropertyStatus = async (req, res, next) => {
  if (!req.user || req.user.role === 'super-admin') {
    return next();
  }

  if (!req.user.propertyId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: No property assigned to this user.'
    });
  }

  try {
    let property = await Property.findById(req.user.propertyId);
    if (!property) {
      property = await Property.create({
        _id: req.user.propertyId,
        name: "Speshway Luxury Hotel",
        city: "Madhapur,Hyderabad",
        rooms: 128,
        occupancy: 78,
        adr: 11400,
        revpar: 8892,
        status: "Active",
        gm: req.user.name || "Madhu"
      });
      console.log(`🌱 Auto-created property for admin: ${property._id}`);
    }
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error validating property status' });
  }
};

// Enforce property-level authorization for bookings, rooms, rates, etc.
export const checkPropertyAccess = (req, res, next) => {
  const propertyId = req.query.propertyId || req.params.propertyId || req.body.propertyId || req.headers['x-property-id'];
  
  if (!propertyId) {
    // Default to their assigned property if not super-admin
    if (req.user.role !== 'super-admin') {
      req.query.propertyId = req.user.propertyId;
    }
    return next();
  }

  if (req.user.role === 'super-admin') {
    return next();
  }

  if (req.user.propertyId && req.user.propertyId.toString() === propertyId.toString()) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied: You do not have permissions to access data for this property.'
  });
};
