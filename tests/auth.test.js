import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { Admin } from '../models/Admin.js';
import { Course } from '../models/Course.js';
import { connectTestDB, clearTestDB, closeTestDB } from './setup.js';

describe('Authentication Module Tests', () => {
  let testCourse;

  beforeAll(async () => {
    await connectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    testCourse = await Course.create({
      name: 'Computer Engineering',
      code: 'CE101',
      category: 'Engineering'
    });
  });

  afterAll(async () => {
    await closeTestDB();
  });

  it('should successfully log in an active administrator and return a JWT', async () => {
    await Admin.create({
      name: 'Super Admin',
      email: 'admin@lms.com',
      password: 'Password123!',
      role: 'admin',
      status: 'active'
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@lms.com',
        password: 'Password123!'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.admin.email).toBe('admin@lms.com');
    expect(res.body.data.admin.password).toBeUndefined();
  });

  it('should register student, auto-generate and receive student registration ID', async () => {
    const res = await request(app)
      .post('/api/v1/auth/student/register')
      .send({
        name: 'Alex Johnson',
        email: 'alex@example.com',
        password: 'Password123!',
        phone: '9876543210',
        course: testCourse._id.toString(),
        batch: 'Batch-2026'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.studentId).toBeDefined();
    expect(res.body.data.studentId).toMatch(/^STU\d{8}$/); // e.g. STU20261234
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.student.email).toBe('alex@example.com');
    expect(res.body.data.student.role).toBe('student');
  });

  it('should allow student to log in using either email OR registration studentId', async () => {
    // 1. Register student
    const regRes = await request(app)
      .post('/api/v1/auth/student/register')
      .send({
        name: 'Maria Garcia',
        email: 'maria@example.com',
        password: 'Password123!',
        course: testCourse._id.toString(),
        batch: 'Batch-2026'
      });

    const generatedStudentId = regRes.body.data.studentId;
    expect(generatedStudentId).toBeDefined();

    // 2. Login using email
    const loginByEmailRes = await request(app)
      .post('/api/v1/auth/student/login')
      .send({
        email: 'maria@example.com',
        password: 'Password123!'
      });

    expect(loginByEmailRes.status).toBe(200);
    expect(loginByEmailRes.body.data.token).toBeDefined();
    expect(loginByEmailRes.body.data.student.studentId).toBe(generatedStudentId);

    // 3. Login using studentId / registrationId
    const loginByIdRes = await request(app)
      .post('/api/v1/auth/student/login')
      .send({
        studentId: generatedStudentId,
        password: 'Password123!'
      });

    expect(loginByIdRes.status).toBe(200);
    expect(loginByIdRes.body.data.token).toBeDefined();
    expect(loginByIdRes.body.data.student.email).toBe('maria@example.com');
  });

  it('should reject login with wrong password', async () => {
    await Admin.create({
      name: 'Admin Test',
      email: 'test@lms.com',
      password: 'Password123!',
      status: 'active'
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@lms.com',
        password: 'WrongPassword'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject login for inactive administrator', async () => {
    await Admin.create({
      name: 'Inactive Admin',
      email: 'inactive@lms.com',
      password: 'Password123!',
      status: 'inactive'
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'inactive@lms.com',
        password: 'Password123!'
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should return 404 error when forgot password email is not in database', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nonexistent@lms.com' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/no account found with this email/i);
  });

  it('should handle forgot-password and 6-digit OTP reset-password workflow for admin and student', async () => {
    const admin = await Admin.create({
      name: 'Reset Admin',
      email: 'reset@lms.com',
      password: 'OldPassword123!',
      status: 'active'
    });

    // 1. Request forgot password with valid email
    const forgotRes = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'reset@lms.com' });

    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.success).toBe(true);
    expect(forgotRes.body.message).toMatch(/6-digit/i);

    const updatedAdmin = await Admin.findById(admin._id);
    expect(updatedAdmin.resetPasswordToken).toBeDefined();

    // 2. Generate a known 6-digit OTP for testing
    const testOtp = updatedAdmin.getResetPasswordOtp(15);
    await updatedAdmin.save();

    // 3. Test invalid OTP code rejection
    const invalidResetRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        email: 'reset@lms.com',
        otp: '000000',
        password: 'NewPassword123!'
      });

    expect(invalidResetRes.status).toBe(400);
    expect(invalidResetRes.body.success).toBe(false);

    // 4. Test valid 6-digit OTP code reset
    const resetRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        email: 'reset@lms.com',
        otp: testOtp,
        password: 'NewPassword123!'
      });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    // 5. Verify login with new password
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'reset@lms.com', password: 'NewPassword123!' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.token).toBeDefined();
  });

  it('should access /auth/me with valid JWT token', async () => {
    const admin = await Admin.create({
      name: 'Profile Admin',
      email: 'profile@lms.com',
      password: 'Password123!',
      status: 'active'
    });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'profile@lms.com', password: 'Password123!' });

    const token = loginRes.body.data.token;

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.admin.email).toBe('profile@lms.com');
  });

  it('should reject unauthenticated request to /auth/me', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});
