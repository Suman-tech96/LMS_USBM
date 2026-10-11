import { body, param } from 'express-validator';
import mongoose from 'mongoose';

export const createStudentValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Student name is required')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Student email is required')
    .isEmail()
    .withMessage('Valid email address is required')
    .normalizeEmail(),
  body('studentId')
    .trim()
    .notEmpty()
    .withMessage('Student ID / Roll Number is required')
    .toUpperCase(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('phone')
    .optional()
    .trim(),
  body('course')
    .notEmpty()
    .withMessage('Course ID is required')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Course must be a valid MongoDB ObjectId'),
  body('batch')
    .trim()
    .notEmpty()
    .withMessage('Batch assignment is required'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Status must be active, inactive, or suspended')
];

export const updateStudentValidator = [
  param('id')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Invalid student ID format'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 100 }),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Valid email address is required')
    .normalizeEmail(),
  body('phone')
    .optional()
    .trim(),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Status must be active, inactive, or suspended'),
  body('course')
    .optional()
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Course must be a valid MongoDB ObjectId'),
  body('batch')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Batch cannot be empty')
];

export const updateStudentStatusValidator = [
  param('id')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Invalid student ID format'),
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Status must be active, inactive, or suspended')
];

export const updateStudentCourseBatchValidator = [
  param('id')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Invalid student ID format'),
  body('courseId')
    .notEmpty()
    .withMessage('courseId is required')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('courseId must be a valid MongoDB ObjectId'),
  body('batch')
    .trim()
    .notEmpty()
    .withMessage('batch name is required')
];
