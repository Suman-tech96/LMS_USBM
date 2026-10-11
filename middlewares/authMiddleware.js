import { verifyToken } from '../utils/generateToken.js';
import { ApiError } from '../utils/ApiError.js';
import { Admin } from '../models/Admin.js';
import { Student } from '../models/Student.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Middleware to protect routes for Admin only
 */
export const protectAdmin = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw ApiError.unauthorized('Authentication token is required');
  }

  try {
    const decoded = verifyToken(token);

    if (decoded.role !== 'admin') {
      throw ApiError.forbidden('Access denied. Administrator privileges required.');
    }

    const admin = await Admin.findOne({ _id: decoded.id, isDeleted: { $ne: true } });

    if (!admin) {
      throw ApiError.unauthorized('Administrator account not found or has been removed');
    }

    if (admin.status !== 'active') {
      throw ApiError.forbidden('Administrator account is inactive. Please contact system support.');
    }

    req.admin = admin;
    req.user = {
      id: admin._id,
      email: admin.email,
      name: admin.name,
      role: admin.role
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw ApiError.unauthorized('Invalid authentication token');
    }
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Authentication token has expired. Please log in again.');
    }
    throw error;
  }
});

/**
 * Middleware to protect routes for Students only
 */
export const protectStudent = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw ApiError.unauthorized('Authentication token is required');
  }

  try {
    const decoded = verifyToken(token);

    if (decoded.role !== 'student') {
      throw ApiError.forbidden('Access denied. Student account required.');
    }

    const student = await Student.findOne({ _id: decoded.id, isDeleted: { $ne: true } });

    if (!student) {
      throw ApiError.unauthorized('Student account not found or has been removed');
    }

    if (student.status !== 'active') {
      throw ApiError.forbidden('Student account is inactive. Please contact administration.');
    }

    req.student = student;
    req.user = {
      id: student._id,
      email: student.email,
      studentId: student.studentId,
      name: student.name,
      course: student.course,
      batch: student.batch,
      role: 'student'
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw ApiError.unauthorized('Invalid authentication token');
    }
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Authentication token has expired. Please log in again.');
    }
    throw error;
  }
});

/**
 * Middleware to authenticate any valid user (Admin or Student)
 */
export const protectAny = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw ApiError.unauthorized('Authentication token is required');
  }

  try {
    const decoded = verifyToken(token);

    if (decoded.role === 'admin') {
      const admin = await Admin.findOne({ _id: decoded.id, isDeleted: { $ne: true } });
      if (!admin || admin.status !== 'active') {
        throw ApiError.unauthorized('Account is not accessible');
      }
      req.admin = admin;
      req.user = {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      };
    } else if (decoded.role === 'student') {
      const student = await Student.findOne({ _id: decoded.id, isDeleted: { $ne: true } });
      if (!student || student.status !== 'active') {
        throw ApiError.unauthorized('Student account is not accessible');
      }
      req.student = student;
      req.user = {
        id: student._id,
        email: student.email,
        studentId: student.studentId,
        name: student.name,
        course: student.course,
        batch: student.batch,
        role: 'student'
      };
    } else {
      throw ApiError.unauthorized('Invalid user token role');
    }

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw ApiError.unauthorized('Invalid authentication token');
    }
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Authentication token has expired');
    }
    throw error;
  }
});

/**
 * Role authorization middleware
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw ApiError.forbidden(`Role '${req.user?.role}' is not authorized to access this resource`);
    }
    next();
  };
};
