import crypto from 'crypto';
import { Admin } from '../models/Admin.js';
import { Student } from '../models/Student.js';
import { Course } from '../models/Course.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { generateToken } from '../utils/generateToken.js';
import { emailService } from '../services/emailService.js';
import { env } from '../config/env.js';

/**
 * Generate a unique student registration ID
 */
const generateUniqueStudentId = async () => {
  const currentYear = new Date().getFullYear();
  let uniqueId = '';
  let exists = true;

  while (exists) {
    const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4-digit number
    uniqueId = `STU${currentYear}${randomDigits}`;
    const found = await Student.findOne({ studentId: uniqueId });
    if (!found) {
      exists = false;
    }
  }

  return uniqueId;
};

/**
 * @desc Admin Login
 * @route POST /api/v1/auth/login
 * @access Public
 */
export const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const admin = await Admin.findOne({ email, isDeleted: { $ne: true } }).select('+password');

  if (!admin) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (admin.status !== 'active') {
    throw ApiError.forbidden('Your account is deactivated. Please contact support.');
  }

  const isMatch = await admin.comparePassword(password);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  admin.lastLogin = new Date();
  await admin.save({ validateBeforeSave: false });

  const token = generateToken({
    id: admin._id,
    email: admin.email,
    name: admin.name,
    role: admin.role
  });

  return ApiResponse.success(res, {
    token,
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      lastLogin: admin.lastLogin
    }
  }, 'Admin logged in successfully');
});

/**
 * @desc Student Self-Registration (Generates & Returns Student Registration ID)
 * @route POST /api/v1/auth/student/register
 * @access Public
 */
export const studentRegister = asyncHandler(async (req, res) => {
  const { name, email, password, phone, course, batch, studentId: customStudentId } = req.body;

  // Check email uniqueness
  const normalizedEmail = email.toLowerCase().trim();
  const existingStudent = await Student.findOne({ email: normalizedEmail });
  if (existingStudent) {
    throw ApiError.conflict(`A student with email '${email}' is already registered`);
  }

  // Validate course exists
  const courseDoc = await Course.findOne({ _id: course, isDeleted: { $ne: true } });
  if (!courseDoc) {
    throw ApiError.notFound('Assigned course not found or is invalid');
  }

  // Assign or generate unique Student Registration ID
  let assignedStudentId;
  if (customStudentId && customStudentId.trim()) {
    const existingId = await Student.findOne({ studentId: customStudentId.trim().toUpperCase() });
    if (existingId) {
      throw ApiError.conflict(`Student ID '${customStudentId}' is already taken. Please choose another or leave blank to auto-generate.`);
    }
    assignedStudentId = customStudentId.trim().toUpperCase();
  } else {
    assignedStudentId = await generateUniqueStudentId();
  }

  // Create new student
  const student = await Student.create({
    name: name.trim(),
    email: normalizedEmail,
    studentId: assignedStudentId,
    password,
    phone: phone ? phone.trim() : undefined,
    course: courseDoc._id,
    batch: batch.trim(),
    status: 'active'
  });

  const token = generateToken({
    id: student._id,
    email: student.email,
    studentId: student.studentId,
    name: student.name,
    course: student.course,
    batch: student.batch,
    role: 'student'
  });

  // Dispatch Welcome Email containing Student Registration ID asynchronously
  emailService.sendStudentRegistrationEmail({
    toEmail: student.email,
    studentName: student.name,
    studentId: student.studentId,
    courseName: courseDoc.name,
    batch: student.batch
  }).catch((err) => {
    console.error('[Registration Welcome Email Delivery Error]:', err.message);
  });

  return ApiResponse.created(res, {
    studentId: student.studentId,
    token,
    student: {
      id: student._id,
      studentId: student.studentId,
      name: student.name,
      email: student.email,
      phone: student.phone,
      course: {
        id: courseDoc._id,
        name: courseDoc.name,
        code: courseDoc.code
      },
      batch: student.batch,
      role: 'student',
      status: student.status
    }
  }, `Student registered successfully! Your Student Registration ID is: ${student.studentId}`);
});

/**
 * @desc Student Login (using Email OR Student/Registration ID + Password)
 * @route POST /api/v1/auth/student/login
 * @access Public
 */
export const studentLogin = asyncHandler(async (req, res) => {
  const { email, studentId, registrationId, identifier, password } = req.body;

  const loginId = identifier || studentId || registrationId;
  const query = { isDeleted: { $ne: true } };

  if (email && email.trim()) {
    query.email = email.toLowerCase().trim();
  } else if (loginId && loginId.trim()) {
    const trimmedId = loginId.trim();
    // Support if user passed email in identifier/studentId field
    if (trimmedId.includes('@')) {
      query.email = trimmedId.toLowerCase();
    } else {
      query.studentId = trimmedId.toUpperCase();
    }
  } else {
    throw ApiError.badRequest('Please provide either email or student registration ID to log in');
  }

  const student = await Student.findOne(query).select('+password').populate('course', 'name code');

  if (!student) {
    throw ApiError.unauthorized('Invalid email / student ID or password');
  }

  if (student.status !== 'active') {
    throw ApiError.forbidden('Your student account is not active. Please contact administration.');
  }

  const isMatch = await student.comparePassword(password);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email / student ID or password');
  }

  student.lastLogin = new Date();
  await student.save({ validateBeforeSave: false });

  const token = generateToken({
    id: student._id,
    email: student.email,
    studentId: student.studentId,
    name: student.name,
    course: student.course,
    batch: student.batch,
    role: 'student'
  });

  return ApiResponse.success(res, {
    token,
    student: {
      id: student._id,
      name: student.name,
      email: student.email,
      studentId: student.studentId,
      course: student.course,
      batch: student.batch,
      status: student.status,
      lastLogin: student.lastLogin
    }
  }, 'Student logged in successfully');
});

/**
 * @desc Forgot Password (Admin & Student) - Generates & emails 6-digit verification code
 * @route POST /api/v1/auth/forgot-password
 * @access Public
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check if email exists in Database (check Admin first, then Student)
  let user = await Admin.findOne({ email: normalizedEmail, isDeleted: { $ne: true } });

  if (!user) {
    user = await Student.findOne({ email: normalizedEmail, isDeleted: { $ne: true } });
  }

  // If email is not present in database, return explicit error
  if (!user) {
    throw ApiError.notFound('No account found with this email address. Please check and try again.');
  }

  // If account is present but not active
  if (user.status !== 'active') {
    throw ApiError.forbidden('Your account is currently inactive. Please contact administration.');
  }

  // 2. Generate 6-digit OTP code and save SHA-256 hashed code
  const expiryMinutes = Number(env.PASSWORD_RESET_TOKEN_EXPIRES_MINUTES) || 15;
  const otpCode = user.getResetPasswordOtp(expiryMinutes);
  await user.save({ validateBeforeSave: false });

  // 3. Dispatch email with the 6-digit verification code
  await emailService.sendPasswordResetOtpEmail({
    toEmail: user.email,
    recipientName: user.name,
    otpCode,
    expiryMinutes
  });

  return ApiResponse.success(
    res,
    { email: user.email, expiryMinutes },
    'A 6-digit password reset verification code has been sent to your email.'
  );
});

/**
 * @desc Reset Password using 6-Digit Code / Token
 * @route POST /api/v1/auth/reset-password OR POST /api/v1/auth/reset-password/:token
 * @access Public
 */
  export const resetPassword = asyncHandler(async (req, res) => {
    const code = req.body.otp || req.body.code || req.body.token || req.params.token;
    const { email, password } = req.body;

    if (!code) {
      throw ApiError.badRequest('6-digit verification code is required');
    }

    const rawCode = String(code).trim();
    const hashedToken = crypto.createHash('sha256').update(rawCode).digest('hex');

    const query = {
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
      isDeleted: { $ne: true }
    };

    if (email && email.trim()) {
      query.email = email.toLowerCase().trim();
    }

    // Search Admin first
    let user = await Admin.findOne(query);

    // Search Student
    if (!user) {
      user = await Student.findOne(query);
    }

    if (!user) {
      throw ApiError.badRequest('Invalid or expired 6-digit verification code. Please request a new one.');
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    return ApiResponse.success(res, null, 'Password has been reset successfully. You can now log in.');
  });

/**
 * @desc Get Authenticated User Profile
 * @route GET /api/v1/auth/me
 * @access Private (Admin or Student)
 */
export const getMe = asyncHandler(async (req, res) => {
  if (req.user.role === 'admin') {
    const admin = await Admin.findById(req.user.id).select('-resetPasswordToken -resetPasswordExpire');
    return ApiResponse.success(res, { admin }, 'Admin profile retrieved');
  } else {
    const student = await Student.findById(req.user.id)
      .populate('course', 'name code category')
      .select('-resetPasswordToken -resetPasswordExpire');
    return ApiResponse.success(res, { student }, 'Student profile retrieved');
  }
});
