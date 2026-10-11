import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { Admin } from '../models/Admin.js';
import { Course } from '../models/Course.js';
import { Student } from '../models/Student.js';
import { Examination } from '../models/Examination.js';
import { generateToken } from '../utils/generateToken.js';
import { connectTestDB, clearTestDB, closeTestDB } from './setup.js';

describe('Examination Management & Participation Tests', () => {
  let adminToken;
  let studentToken;
  let testCourse;
  let testStudent;

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
      name: 'Mathematics 101',
      code: 'MATH101',
      category: 'Science',
      batches: ['Batch-2026']
    });

    testStudent = await Student.create({
      name: 'Jane Student',
      email: 'jane@student.com',
      studentId: 'STU7001',
      password: 'Password123!',
      course: testCourse._id,
      batch: 'Batch-2026',
      status: 'active'
    });

    studentToken = generateToken({
      id: testStudent._id,
      email: testStudent.email,
      studentId: testStudent.studentId,
      name: testStudent.name,
      course: testStudent.course,
      batch: testStudent.batch,
      role: 'student'
    });
  });

  afterAll(async () => {
    await closeTestDB();
  });

  it('should allow admin to create an examination with scheduled windows and negative marks', async () => {
    const startDate = new Date(Date.now() - 1000 * 60 * 10); // started 10 mins ago
    const endDate = new Date(Date.now() + 1000 * 60 * 60 * 2); // ends in 2 hours

    const res = await request(app)
      .post('/api/v1/examinations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Midterm Calculus Exam',
        description: 'Covers differential calculus',
        course: testCourse._id.toString(),
        targetBatches: ['Batch-2026'],
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        durationMinutes: 60,
        totalMarks: 20,
        passingMarks: 8,
        negativeMarks: 1,
        status: 'scheduled',
        questions: [
          {
            questionText: 'What is the derivative of x^2?',
            options: ['x', '2x', 'x^2', '2'],
            correctOptionIndex: 1,
            marks: 10,
            negativeMarks: 2
          },
          {
            questionText: 'What is the integral of 1 dx?',
            options: ['x + C', '1 + C', '0', 'x^2 + C'],
            correctOptionIndex: 0,
            marks: 10,
            negativeMarks: 2
          }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Midterm Calculus Exam');
    expect(res.body.data.negativeMarks).toBe(1);
    expect(res.body.data.questions[0].negativeMarks).toBe(2);
  });

  it('should allow eligible student to view exam with marking scheme without exposing answer keys', async () => {
    const exam = await Examination.create({
      title: 'Algebra Quiz',
      course: testCourse._id,
      targetBatches: ['Batch-2026'],
      startDate: new Date(Date.now() - 1000 * 60 * 10),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 2),
      durationMinutes: 30,
      totalMarks: 10,
      passingMarks: 5,
      negativeMarks: 1,
      status: 'scheduled',
      questions: [
        {
          questionText: '2 + 2 = ?',
          options: ['3', '4', '5', '6'],
          correctOptionIndex: 1,
          marks: 10,
          negativeMarks: 2.5,
          explanation: 'Basic arithmetic'
        }
      ]
    });

    const res = await request(app)
      .get(`/api/v1/student/examinations/${exam._id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Algebra Quiz');
    expect(res.body.data.questions[0].marks).toBe(10);
    expect(res.body.data.questions[0].negativeMarks).toBe(2.5);
    expect(res.body.data.questions[0].correctOptionIndex).toBeUndefined();
    expect(res.body.data.questions[0].explanation).toBeUndefined();
  });

  it('should calculate negative marking and return complete question metrics breakdown', async () => {
    const exam = await Examination.create({
      title: 'Physics Mechanics Quiz',
      course: testCourse._id,
      targetBatches: ['Batch-2026'],
      startDate: new Date(Date.now() - 1000 * 60 * 10),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 2),
      durationMinutes: 45,
      totalMarks: 30,
      passingMarks: 12,
      status: 'scheduled',
      questions: [
        {
          questionText: 'Question 1: F = ?',
          options: ['m/a', 'm*a', 'm+a', 'm-a'],
          correctOptionIndex: 1,
          marks: 10,
          negativeMarks: 2 // Wrong deducts 2
        },
        {
          questionText: 'Question 2: Unit of force?',
          options: ['Joule', 'Newton', 'Watt', 'Pascal'],
          correctOptionIndex: 1,
          marks: 10,
          negativeMarks: 3 // Wrong deducts 3
        },
        {
          questionText: 'Question 3: Acceleration due to gravity?',
          options: ['9.8 m/s^2', '12 m/s^2', '5 m/s^2', '1 m/s^2'],
          correctOptionIndex: 0,
          marks: 10,
          negativeMarks: 2
        }
      ]
    });

    // 1. Start Exam
    const startRes = await request(app)
      .post(`/api/v1/student/examinations/${exam._id}/start`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(startRes.status).toBe(201);
    expect(startRes.body.data.durationMinutes).toBe(45);
    expect(startRes.body.data.timeRemainingSeconds).toBeDefined();

    // 2. Submit Answers:
    // Q1: Option 1 (Correct) -> +10
    // Q2: Option 0 (Incorrect) -> -3 negative marks
    // Q3: Unattempted -> 0
    // Total Expected Score = 10 - 3 = 7
    const submitRes = await request(app)
      .post(`/api/v1/student/examinations/${exam._id}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        answers: [
          {
            questionId: exam.questions[0]._id.toString(),
            selectedOptionIndex: 1 // Correct (+10)
          },
          {
            questionId: exam.questions[1]._id.toString(),
            selectedOptionIndex: 0 // Incorrect (-3)
          }
        ]
      });

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.status).toBe('submitted');

    const breakdown = submitRes.body.data.breakdown;
    expect(breakdown.totalQuestions).toBe(3);
    expect(breakdown.totalAttempted).toBe(2);
    expect(breakdown.totalCorrect).toBe(1);
    expect(breakdown.totalWrong).toBe(1);
    expect(breakdown.totalUnattempted).toBe(1);
    expect(breakdown.positiveMarks).toBe(10);
    expect(breakdown.negativeMarksDeducted).toBe(3);
    expect(breakdown.obtainedMarks).toBe(7);
    expect(breakdown.totalMarks).toBe(30);
    expect(breakdown.percentage).toBe(23.33);
    expect(breakdown.isPassed).toBe(false); // passing is 12
  });

  it('should support auto-submission when timer duration completes', async () => {
    const exam = await Examination.create({
      title: 'Timed Chemistry Quiz',
      course: testCourse._id,
      targetBatches: ['Batch-2026'],
      startDate: new Date(Date.now() - 1000 * 60 * 10),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 2),
      durationMinutes: 15,
      totalMarks: 10,
      passingMarks: 5,
      status: 'scheduled',
      questions: [
        {
          questionText: 'Chemical formula of water is?',
          options: ['H2O', 'CO2', 'NaCl', 'O2'],
          correctOptionIndex: 0,
          marks: 10
        }
      ]
    });

    await request(app)
      .post(`/api/v1/student/examinations/${exam._id}/start`)
      .set('Authorization', `Bearer ${studentToken}`);

    // Auto-submit call with isAutoSubmitted: true
    const autoSubmitRes = await request(app)
      .post(`/api/v1/student/examinations/${exam._id}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        isAutoSubmitted: true,
        answers: [
          {
            questionId: exam.questions[0]._id.toString(),
            selectedOptionIndex: 0
          }
        ]
      });

    expect(autoSubmitRes.status).toBe(200);
    expect(autoSubmitRes.body.data.isAutoSubmitted).toBe(true);
    expect(autoSubmitRes.body.data.breakdown.totalAttempted).toBe(1);
    expect(autoSubmitRes.body.data.breakdown.totalCorrect).toBe(1);
    expect(autoSubmitRes.body.data.breakdown.obtainedMarks).toBe(10);
  });

  it('should support question bank CRUD operations for an examination', async () => {
    const exam = await Examination.create({
      title: 'Question Bank Exam',
      course: testCourse._id,
      startDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 48),
      durationMinutes: 30,
      totalMarks: 20,
      passingMarks: 10,
      status: 'draft',
      questions: [
        {
          questionText: 'Initial question',
          options: ['Option A', 'Option B'],
          correctOptionIndex: 0,
          marks: 5
        }
      ]
    });

    // 1. Add question
    const addRes = await request(app)
      .post(`/api/v1/examinations/${exam._id}/questions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        questionText: 'What is 5 + 5?',
        options: ['8', '10', '12', '15'],
        correctOptionIndex: 1,
        marks: 5,
        negativeMarks: 1,
        subject: 'Arithmetic',
        topic: 'Addition'
      });

    expect(addRes.status).toBe(201);
    expect(addRes.body.data.totalQuestions).toBe(2);
    const addedQuestionId = addRes.body.data.question._id;

    // 2. Update question
    const updateRes = await request(app)
      .put(`/api/v1/examinations/${exam._id}/questions/${addedQuestionId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        questionText: 'What is 5 + 5? (Updated)',
        marks: 6
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.questionText).toBe('What is 5 + 5? (Updated)');
    expect(updateRes.body.data.marks).toBe(6);

    // 3. Toggle question status
    const toggleRes = await request(app)
      .patch(`/api/v1/examinations/${exam._id}/questions/${addedQuestionId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });

    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.data.isActive).toBe(false);

    // 4. Delete question
    const deleteRes = await request(app)
      .delete(`/api/v1/examinations/${exam._id}/questions/${addedQuestionId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data.totalQuestions).toBe(1);
  });

  it('should support student exam instructions, question palette, and real-time auto-saving', async () => {
    const exam = await Examination.create({
      title: 'Portal Flow Examination',
      instructions: 'Do not refresh the page. Attempt all questions.',
      course: testCourse._id,
      targetBatches: ['Batch-2026'],
      startDate: new Date(Date.now() - 1000 * 60 * 10),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 2),
      durationMinutes: 45,
      totalMarks: 20,
      passingMarks: 8,
      status: 'scheduled',
      isResultPublished: true,
      questions: [
        {
          questionText: 'Question 1: What is 2 + 2?',
          options: ['3', '4', '5'],
          correctOptionIndex: 1,
          marks: 10
        },
        {
          questionText: 'Question 2: What is 10 / 2?',
          options: ['2', '5', '8'],
          correctOptionIndex: 1,
          marks: 10
        }
      ]
    });

    // 1. Get instructions
    const instructionsRes = await request(app)
      .get(`/api/v1/student/examinations/${exam._id}/instructions`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(instructionsRes.status).toBe(200);
    expect(instructionsRes.body.data.instructions).toContain('Do not refresh');
    expect(instructionsRes.body.data.totalQuestions).toBe(2);

    // 2. Start exam and receive questions palette (WITHOUT correctOptionIndex)
    const startRes = await request(app)
      .post(`/api/v1/student/examinations/${exam._id}/start`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(startRes.status).toBe(201);
    expect(startRes.body.data.questions.length).toBe(2);
    expect(startRes.body.data.questions[0].correctOptionIndex).toBeUndefined(); // Security check!
    expect(startRes.body.data.timeRemainingSeconds).toBeGreaterThan(0);

    const q1Id = exam.questions[0]._id.toString();

    // 3. Auto-save answer and mark for review
    const saveRes = await request(app)
      .post(`/api/v1/student/examinations/${exam._id}/save-answer`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        questionId: q1Id,
        selectedOptionIndex: 1,
        isMarkedForReview: true
      });

    expect(saveRes.status).toBe(200);
    expect(saveRes.body.data.savedQuestionId).toBe(q1Id);
    expect(saveRes.body.data.isMarkedForReview).toBe(true);

    // 4. Submit and verify score calculation with autosaved answer
    const submitRes = await request(app)
      .post(`/api/v1/student/examinations/${exam._id}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({}); // submitting without body should retain autosaved answer!

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.breakdown.totalCorrect).toBe(1);
    expect(submitRes.body.data.breakdown.obtainedMarks).toBe(10);
    expect(submitRes.body.data.breakdown.isPassed).toBe(true);

    // 5. Get student exam result
    const resultRes = await request(app)
      .get(`/api/v1/student/examinations/${exam._id}/result`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(resultRes.status).toBe(200);
    expect(resultRes.body.data.obtainedMarks).toBe(10);
    expect(resultRes.body.data.isPassed).toBe(true);
  });
});
