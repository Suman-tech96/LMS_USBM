import { body, param } from 'express-validator';
import mongoose from 'mongoose';

export const loginValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

export const studentRegisterValidator = [
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
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('course')
    .notEmpty()
    .withMessage('Course ID is required')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Course must be a valid MongoDB ObjectId'),
  body('batch')
    .trim()
    .notEmpty()
    .withMessage('Batch assignment is required'),
  body('phone')
    .optional()
    .trim(),
  body('studentId')
    .optional()
    .trim()
    .toUpperCase()
];

export const studentLoginValidator = [
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body()
    .custom((value, { req }) => {
      if (!req.body.email && !req.body.studentId && !req.body.registrationId && !req.body.identifier) {
        throw new Error('Please provide email, studentId, or registrationId to log in');
      }
      return true;
    })
];

export const forgotPasswordValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
];

export const resetPasswordOtpValidator = [
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body()
    .custom((val, { req }) => {
      const code = req.body.otp || req.body.code || req.body.token || req.params?.token;
      if (!code || String(code).trim().length === 0) {
        throw new Error('6-digit verification code is required');
      }
      return true;
    })
];

export const resetPasswordValidator = [
  param('token')
    .notEmpty()
    .withMessage('Reset token parameter is required'),
  body('password')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

