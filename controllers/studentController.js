import { Student } from '../models/Student.js';
import { Course } from '../models/Course.js';
import { ExamParticipation } from '../models/ExamParticipation.js';
import { Result } from '../models/Result.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { emailService } from '../services/emailService.js';

/**
 * @desc Create a new student
 * @route POST /api/v1/students
 * @access Private (Admin)
 */
export const createStudent = asyncHandler(async (req, res) => {
  const { name, email, studentId, password, phone, course, batch, status } = req.body;

  // Check unique email and studentId
  const existingEmail = await Student.findOne({ email: email.toLowerCase() });
  if (existingEmail) {
    throw ApiError.conflict(`Student with email '${email}' already exists`);
  }

  const existingStudentId = await Student.findOne({ studentId: studentId.toUpperCase() });
  if (existingStudentId) {
    throw ApiError.conflict(`Student with ID '${studentId}' already exists`);
  }

  // Validate course existence
  const courseDoc = await Course.findOne({ _id: course, isDeleted: { $ne: true } });
  if (!courseDoc) {
    throw ApiError.notFound(`Assigned course with ID '${course}' does not exist`);
  }

  const student = await Student.create({
    name,
    email,
    studentId,
    password,
    phone,
    course,
    batch,
    status: status || 'active'
  });

  const createdStudent = await Student.findById(student._id).populate('course', 'name code');

  // Dispatch Welcome Email containing Student Registration ID asynchronously
  emailService.sendStudentRegistrationEmail({
    toEmail: createdStudent.email,
    studentName: createdStudent.name,
    studentId: createdStudent.studentId,
    courseName: createdStudent.course?.name || courseDoc.name,
    batch: createdStudent.batch
  }).catch((err) => {
    console.error('[Student Creation Email Delivery Error]:', err.message);
  });

  return ApiResponse.created(res, createdStudent, 'Student created successfully');
});

/**
 * @desc Get all students with search, filter, pagination, and sorting
 * @route GET /api/v1/students
 * @access Private (Admin)
 */
export const getAllStudents = asyncHandler(async (req, res) => {
  const { search, status, course, batch, page = 1, limit = 10, sort = '-createdAt' } = req.query;

  const query = { isDeleted: { $ne: true } };

  if (status) {
    query.status = status;
  }

  if (course) {
    query.course = course;
  }

  if (batch) {
    query.batch = new RegExp(batch, 'i');
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { studentId: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }

  // Allowed sort fields
  const allowedSortFields = ['createdAt', '-createdAt', 'name', '-name', 'studentId', '-studentId', 'status', '-status'];
  const sortOption = allowedSortFields.includes(sort) ? sort : '-createdAt';

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const [students, total] = await Promise.all([
    Student.find(query)
      .populate('course', 'name code')
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum),
    Student.countDocuments(query)
  ]);

  const pagination = {
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum) || 1
  };

  return ApiResponse.success(res, students, 'Students retrieved successfully', 200, pagination);
});

/**
 * @desc Get single student by ID
 * @route GET /api/v1/students/:id
 * @access Private (Admin)
 */
export const getStudentById = asyncHandler(async (req, res) => {
  const student = await Student.findOne({
    _id: req.params.id,
    isDeleted: { $ne: true }
  }).populate('course', 'name code category');

  if (!student) {
    throw ApiError.notFound('Student not found');
  }

  return ApiResponse.success(res, student, 'Student details retrieved successfully');
});

/**
 * @desc Update student details (allowlisted fields only)
 * @route PATCH /api/v1/students/:id
 * @access Private (Admin)
 */
export const updateStudent = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

  if (!student) {
    throw ApiError.notFound('Student not found');
  }

  const { name, email, phone, status, course, batch } = req.body;

  if (email && email.toLowerCase() !== student.email) {
    const existing = await Student.findOne({
      email: email.toLowerCase(),
      _id: { $ne: student._id }
    });
    if (existing) {
      throw ApiError.conflict('Email is already registered with another student');
    }
    student.email = email;
  }

  if (course && course.toString() !== (student.course ? student.course.toString() : '')) {
    const courseDoc = await Course.findOne({ _id: course, isDeleted: { $ne: true } });
    if (!courseDoc) {
      throw ApiError.notFound('Assigned course does not exist');
    }
    student.course = course;
  }

  if (name !== undefined) student.name = name;
  if (phone !== undefined) student.phone = phone;
  if (status !== undefined) student.status = status;
  if (batch !== undefined) student.batch = batch;

  await student.save();

  const updatedStudent = await Student.findById(student._id).populate('course', 'name code');
  return ApiResponse.success(res, updatedStudent, 'Student updated successfully');
});

/**
 * @desc Update student account status
 * @route PATCH /api/v1/students/:id/status
 * @access Private (Admin)
 */
export const updateStudentStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const student = await Student.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

  if (!student) {
    throw ApiError.notFound('Student not found');
  }

  student.status = status;
  await student.save();

  return ApiResponse.success(res, student, `Student status updated to ${status}`);
});

/**
 * @desc Update student course and batch assignment
 * @route PATCH /api/v1/students/:id/course-batch
 * @access Private (Admin)
 */
export const updateStudentCourseBatch = asyncHandler(async (req, res) => {
  const { courseId, batch } = req.body;

  const course = await Course.findOne({ _id: courseId, isDeleted: { $ne: true } });
  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  const student = await Student.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
  if (!student) {
    throw ApiError.notFound('Student not found');
  }

  student.course = courseId;
  student.batch = batch;
  await student.save();

  const updatedStudent = await Student.findById(student._id).populate('course', 'name code');
  return ApiResponse.success(res, updatedStudent, 'Student course and batch updated successfully');
});

/**
 * @desc Get student's examination history
 * @route GET /api/v1/students/:id/examinations
 * @access Private (Admin)
 */
export const getStudentExaminations = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
  if (!student) {
    throw ApiError.notFound('Student not found');
  }

  const participations = await ExamParticipation.find({ student: student._id })
    .populate('examination', 'title totalMarks passingMarks durationMinutes startDate endDate')
    .sort('-createdAt');

  return ApiResponse.success(res, participations, 'Student examination history retrieved');
});

/**
 * @desc Get student's results
 * @route GET /api/v1/students/:id/results
 * @access Private (Admin)
 */
export const getStudentResults = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
  if (!student) {
    throw ApiError.notFound('Student not found');
  }

  const results = await Result.find({ student: student._id, isDeleted: { $ne: true } })
    .populate('examination', 'title totalMarks passingMarks')
    .populate('course', 'name code')
    .sort('-createdAt');

  return ApiResponse.success(res, results, 'Student results retrieved');
});

/**
 * @desc Soft delete student
 * @route DELETE /api/v1/students/:id
 * @access Private (Admin)
 */
export const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

  if (!student) {
    throw ApiError.notFound('Student not found');
  }

  student.isDeleted = true;
  student.status = 'inactive';
  await student.save();

  return ApiResponse.success(res, null, 'Student removed successfully');
});
