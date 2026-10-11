import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { Admin } from '../models/Admin.js';
import { Course } from '../models/Course.js';
import { Student } from '../models/Student.js';
import { Examination } from '../models/Examination.js';
import { ExamParticipation } from '../models/ExamParticipation.js';
import { Result } from '../models/Result.js';
import { generateToken } from '../utils/generateToken.js';
import { connectTestDB, clearTestDB, closeTestDB } from './setup.js';

describe('Result Management & Student Visibility Tests', () => {
  let adminToken;
  let student1Token;
  let student2Token;
  let testCourse;
  let student1;
  let student2;
  let exam;
  let result1;

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
      name: 'History 101',
      code: 'HIS101',
      category: 'Arts'
    });

    student1 = await Student.create({
      name: 'Student One',
      email: 'student1@lms.com',
      studentId: 'STU8001',
      password: 'Password123!',
      course: testCourse._id,
      batch: 'Batch-A',
      status: 'active'
    });

    student2 = await Student.create({
      name: 'Student Two',
      email: 'student2@lms.com',
      studentId: 'STU8002',
      password: 'Password123!',
      course: testCourse._id,
      batch: 'Batch-A',
      status: 'active'
    });

    student1Token = generateToken({
      id: student1._id,
      email: student1.email,
      studentId: student1.studentId,
      name: student1.name,
      course: student1.course,
      batch: student1.batch,
      role: 'student'
    });

    student2Token = generateToken({
      id: student2._id,
      email: student2.email,
      studentId: student2.studentId,
      name: student2.name,
      course: student2.course,
      batch: student2.batch,
      role: 'student'
    });

    exam = await Examination.create({
      title: 'World History Exam',
      course: testCourse._id,
      startDate: new Date(Date.now() - 1000 * 60 * 60),
      endDate: new Date(Date.now() + 1000 * 60 * 60),
      durationMinutes: 30,
      totalMarks: 100,
      passingMarks: 40,
      status: 'scheduled'
    });

    const participation = await ExamParticipation.create({
      examination: exam._id,
      student: student1._id,
      course: testCourse._id,
      batch: 'Batch-A',
      status: 'submitted',
      totalScore: 85,
      isEvaluated: true
    });

    result1 = await Result.create({
      examination: exam._id,
      student: student1._id,
      participation: participation._id,
      course: testCourse._id,
      batch: 'Batch-A',
      totalMarks: 100,
      obtainedMarks: 85,
      percentage: 85,
      isPassed: true,
      grade: 'A',
      status: 'unpublished'
    });
  });

  afterAll(async () => {
    await closeTestDB();
  });

  it('should not allow student to view unpublished results', async () => {
    const res = await request(app)
      .get('/api/v1/student/results')
      .set('Authorization', `Bearer ${student1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0); // Unpublished
  });

  it('should allow admin to publish result', async () => {
    const res = await request(app)
      .post(`/api/v1/results/${result1._id}/publish`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('published');
    expect(res.body.data.publishedAt).toBeDefined();
  });

  it('should allow student to view result once published, but not other students results', async () => {
    // Admin publishes
    await request(app)
      .post(`/api/v1/results/${result1._id}/publish`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Student 1 checks
    const s1Res = await request(app)
      .get('/api/v1/student/results')
      .set('Authorization', `Bearer ${student1Token}`);

    expect(s1Res.status).toBe(200);
    expect(s1Res.body.data.length).toBe(1);
    expect(s1Res.body.data[0].obtainedMarks).toBe(85);

    // Student 2 checks (should have 0 results)
    const s2Res = await request(app)
      .get('/api/v1/student/results')
      .set('Authorization', `Bearer ${student2Token}`);

    expect(s2Res.status).toBe(200);
    expect(s2Res.body.data.length).toBe(0);
  });
});
