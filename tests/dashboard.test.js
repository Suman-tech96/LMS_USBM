import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { Admin } from '../models/Admin.js';
import { Course } from '../models/Course.js';
import { Student } from '../models/Student.js';
import { Examination } from '../models/Examination.js';
import { StudyMaterial } from '../models/StudyMaterial.js';
import { generateToken } from '../utils/generateToken.js';
import { connectTestDB, clearTestDB, closeTestDB } from './setup.js';

describe('Admin Dashboard Module Tests', () => {
  let adminToken;

  beforeAll(async () => {
    await connectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    const admin = await Admin.create({
      name: 'Super Admin',
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

    const course = await Course.create({
      name: 'Biology 101',
      code: 'BIO101',
      category: 'Science'
    });

    await Student.create([
      {
        name: 'Student One',
        email: 's1@student.com',
        studentId: 'STU001',
        password: 'Password123!',
        course: course._id,
        batch: 'Batch-1',
        status: 'active'
      },
      {
        name: 'Student Two',
        email: 's2@student.com',
        studentId: 'STU002',
        password: 'Password123!',
        course: course._id,
        batch: 'Batch-1',
        status: 'inactive'
      }
    ]);

    await StudyMaterial.create({
      title: 'Biology Handout',
      course: course._id,
      fileUrl: '/uploads/bio.pdf',
      fileType: 'pdf'
    });

    await Examination.create({
      title: 'Cell Structure Quiz',
      course: course._id,
      startDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 26),
      durationMinutes: 30,
      totalMarks: 50,
      passingMarks: 20,
      status: 'scheduled'
    });
  });

  afterAll(async () => {
    await closeTestDB();
  });

  it('should return accurate aggregated overview metrics', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/overview')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.students.total).toBe(2);
    expect(res.body.data.students.active).toBe(1);
    expect(res.body.data.students.inactive).toBe(1);
    expect(res.body.data.courses.total).toBe(1);
    expect(res.body.data.studyMaterials.total).toBe(1);
    expect(res.body.data.examinations.total).toBe(1);
  });

  it('should return study materials dashboard stats', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/study-materials')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
  });

  it('should return courses dashboard stats', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/courses')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.studentsPerCourse.length).toBe(1);
    expect(res.body.data.studentsPerCourse[0].studentCount).toBe(2);
  });
});
