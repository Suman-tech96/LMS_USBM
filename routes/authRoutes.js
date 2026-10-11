import express from 'express';
import {
  adminLogin,
  studentRegister,
  studentLogin,
  forgotPassword,
  resetPassword,
  getMe
} from '../controllers/authController.js';
import {
  loginValidator,
  studentRegisterValidator,
  studentLoginValidator,
  forgotPasswordValidator,
  resetPasswordOtpValidator,
  resetPasswordValidator
} from '../validators/authValidator.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { protectAny } from '../middlewares/authMiddleware.js';
import { authLimiter } from '../middlewares/rateLimitMiddleware.js';

const router = express.Router();

// Admin Login
router.post('/login', authLimiter, loginValidator, validateRequest, adminLogin);

// Student Registration (returns generated student registration ID)
router.post('/student/register', authLimiter, studentRegisterValidator, validateRequest, studentRegister);

// Student Login (accepts email or studentId/registrationId + password)
router.post('/student/login', authLimiter, studentLoginValidator, validateRequest, studentLogin);

// Password recovery (6-digit verification code OTP)
router.post('/forgot-password', authLimiter, forgotPasswordValidator, validateRequest, forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordOtpValidator, validateRequest, resetPassword);

// Protected user profile
router.get('/me', protectAny, getMe);

export default router;
