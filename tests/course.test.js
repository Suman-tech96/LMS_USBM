import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { Admin } from '../models/Admin.js';
import { Course } from '../models/Course.js';
import { StudyMaterial } from '../models/StudyMaterial.js';
import { generateToken } from '../utils/generateToken.js';
import { connectTestDB, clearTestDB, closeTestDB } from './setup.js';

describe('Course Management Module Tests', () => {
  let adminToken;

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
  });

  afterAll(async () => {
    await closeTestDB();
  });

  it('should create a new course', async () => {
    const res = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Web Development Bootcamp',
        code: 'WEB101',
        category: 'Software Engineering',
        description: 'Full stack development',
        batches: ['Batch-1', 'Batch-2']
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe('WEB101');
    expect(res.body.data.batches).toContain('Batch-1');
  });

  it('should reject creating duplicate course code', async () => {
    await Course.create({
      name: 'Existing Course',
      code: 'DUP101',
      category: 'General'
    });

    const res = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Another Name',
        code: 'DUP101',
        category: 'General'
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should map study materials to course', async () => {
    const course = await Course.create({
      name: 'Physics I',
      code: 'PHY101',
      category: 'Science'
    });

    const material = await StudyMaterial.create({
      title: 'Mechanics Notes',
      course: course._id,
      fileUrl: '/uploads/mechanics.pdf',
      fileType: 'pdf'
    });

    const res = await request(app)
      .put(`/api/v1/courses/${course._id}/study-materials`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studyMaterialIds: [material._id.toString()]
      });

    expect(res.status).toBe(200);
    expect(res.body.data.studyMaterials.length).toBe(1);
  });

  it('should support creating and updating a course with optional youtubeLink', async () => {
    const res = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Advanced React Course',
        code: 'REACT201',
        category: 'Frontend',
        youtubeLink: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.youtubeLink).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

    const updateRes = await request(app)
      .patch(`/api/v1/courses/${res.body.data._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        youtubeLink: 'https://www.youtube.com/watch?v=newVideo123'
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.youtubeLink).toBe('https://www.youtube.com/watch?v=newVideo123');
  });
});
