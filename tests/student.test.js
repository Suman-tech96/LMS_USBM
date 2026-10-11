import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { Admin } from '../models/Admin.js';
import { Course } from '../models/Course.js';
import { Student } from '../models/Student.js';
import { generateToken } from '../utils/generateToken.js';
import { connectTestDB, clearTestDB, closeTestDB } from './setup.js';

describe('Student Management Module Tests', () => {
  let adminToken;
  let testCourse;

  beforeAll(async () => {
    await connectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    const admin = await Admin.create({
      name: 'Admin Test',
      email: 'admin@lms.com',
      password: 'Password123!',
      role: 'admin',
      status: 'active'
    });

    adminToken = generateToken({
      id: admin._id,
      email: admin.email,
      name: admin.name,
      role: admin.role
    });

    testCourse = await Course.create({
      name: 'Computer Science 101',
      code: 'CS101',
      category: 'Engineering',
      batches: ['Batch-A', 'Batch-B']
    });
  });

  afterAll(async () => {
    await closeTestDB();
  });

  it('should create a new student successfully', async () => {
    const res = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'John Doe',
        email: 'john@student.com',
        studentId: 'STU1001',
        password: 'Password123!',
        phone: '+1234567890',
        course: testCourse._id.toString(),
        batch: 'Batch-A'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('John Doe');
    expect(res.body.data.studentId).toBe('STU1001');
    expect(res.body.data.course._id).toBe(testCourse._id.toString());
  });

  it('should reject duplicate email or studentId', async () => {
    await Student.create({
      name: 'Existing Student',
      email: 'existing@student.com',
      studentId: 'STU9999',
      password: 'Password123!',
      course: testCourse._id,
      batch: 'Batch-A'
    });

    const res = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'New Student',
        email: 'existing@student.com',
        studentId: 'STU8888',
        password: 'Password123!',
        course: testCourse._id.toString(),
        batch: 'Batch-A'
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should retrieve list of students with pagination and search', async () => {
    await Student.create([
      {
        name: 'Alice Wonder',
        email: 'alice@student.com',
        studentId: 'STU2001',
        password: 'Password123!',
        course: testCourse._id,
        batch: 'Batch-A'
      },
      {
        name: 'Bob Builder',
        email: 'bob@student.com',
        studentId: 'STU2002',
        password: 'Password123!',
        course: testCourse._id,
        batch: 'Batch-B'
      }
    ]);

    const res = await request(app)
      .get('/api/v1/students?search=Alice')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe('Alice Wonder');
    expect(res.body.pagination.total).toBe(1);
  });

  it('should update student status', async () => {
    const student = await Student.create({
      name: 'Status Student',
      email: 'status@student.com',
      studentId: 'STU3001',
      password: 'Password123!',
      course: testCourse._id,
      batch: 'Batch-A',
      status: 'active'
    });

    const res = await request(app)
      .patch(`/api/v1/students/${student._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'inactive' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('inactive');
  });

  it('should update student course and batch assignment', async () => {
    const newCourse = await Course.create({
      name: 'Data Science 101',
      code: 'DS101',
      category: 'Analytics'
    });

    const student = await Student.create({
      name: 'Transfer Student',
      email: 'transfer@student.com',
      studentId: 'STU4001',
      password: 'Password123!',
      course: testCourse._id,
      batch: 'Batch-A'
    });

    const res = await request(app)
      .patch(`/api/v1/students/${student._id}/course-batch`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        courseId: newCourse._id.toString(),
        batch: 'Batch-DS-2026'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.batch).toBe('Batch-DS-2026');
    expect(res.body.data.course._id).toBe(newCourse._id.toString());
  });
});
