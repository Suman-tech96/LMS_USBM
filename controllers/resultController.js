import { Result } from '../models/Result.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { resultService } from '../services/resultService.js';

/**
 * ==========================================
 * ADMIN RESULT MANAGEMENT ENDPOINTS
 * ==========================================
 */

/**
 * @desc Get all results (Admin)
 * @route GET /api/v1/results
 * @access Private (Admin)
 */
export const getAllResults = asyncHandler(async (req, res) => {
  const { examination, student, course, status, page = 1, limit = 10, sort = '-createdAt' } = req.query;

  const query = { isDeleted: { $ne: true } };

  if (examination) query.examination = examination;
  if (student) query.student = student;
  if (course) query.course = course;
  if (status) query.status = status;

  const allowedSortFields = ['createdAt', '-createdAt', 'obtainedMarks', '-obtainedMarks', 'percentage', '-percentage'];
  const sortOption = allowedSortFields.includes(sort) ? sort : '-createdAt';

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const [results, total] = await Promise.all([
    Result.find(query)
      .populate('student', 'name email studentId')
      .populate('examination', 'title totalMarks passingMarks durationMinutes')
      .populate('course', 'name code')
      .populate('participation', 'startTime submitTime durationUsedMinutes')
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum),
    Result.countDocuments(query)
  ]);

  const pagination = {
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum) || 1
  };

  return ApiResponse.success(res, results, 'Results retrieved successfully', 200, pagination);
});

/**
 * @desc Get single result details (Admin)
 * @route GET /api/v1/results/:id
 * @access Private (Admin)
 */
export const getResultById = asyncHandler(async (req, res) => {
  const result = await Result.findOne({
    _id: req.params.id,
    isDeleted: { $ne: true }
  })
    .populate('student', 'name email studentId phone batch')
    .populate('examination', 'title description instructions totalMarks passingMarks questions')
    .populate('course', 'name code')
    .populate('participation');

  if (!result) {
    throw ApiError.notFound('Result not found');
  }

  return ApiResponse.success(res, result, 'Result details retrieved successfully');
});

/**
 * @desc Publish a result
 * @route POST /api/v1/results/:id/publish
 * @access Private (Admin)
 */
export const publishResult = asyncHandler(async (req, res) => {
  const result = await resultService.publish(req.params.id, req.admin._id);
  return ApiResponse.success(res, result, 'Result published successfully');
});

/**
 * @desc Unpublish a result
 * @route POST /api/v1/results/:id/unpublish
 * @access Private (Admin)
 */
export const unpublishResult = asyncHandler(async (req, res) => {
  const result = await resultService.unpublish(req.params.id);
  return ApiResponse.success(res, result, 'Result unpublished successfully');
});

/**
 * ==========================================
 * STUDENT RESULT ENDPOINTS (Published Only)
 * ==========================================
 */

/**
 * @desc Get student's own published results
 * @route GET /api/v1/student/results
 * @access Private (Student)
 */
export const getStudentResults = asyncHandler(async (req, res) => {
  const student = req.student;

  const results = await Result.find({
    student: student._id,
    status: 'published',
    isDeleted: { $ne: true }
  })
    .populate('examination', 'title totalMarks passingMarks durationMinutes startDate endDate')
    .populate('course', 'name code')
    .sort('-publishedAt');

  return ApiResponse.success(res, results, 'Student published results retrieved');
});

/**
 * @desc Get single published result for student
 * @route GET /api/v1/student/results/:id
 * @access Private (Student)
 */
export const getStudentResultById = asyncHandler(async (req, res) => {
  const student = req.student;

  const result = await Result.findOne({
    _id: req.params.id,
    student: student._id,
    status: 'published',
    isDeleted: { $ne: true }
  })
    .populate('examination', 'title totalMarks passingMarks durationMinutes')
    .populate('course', 'name code')
    .populate('participation', 'startTime submitTime durationUsedMinutes');

  if (!result) {
    throw ApiError.notFound('Published result not found or has not been released yet');
  }

  return ApiResponse.success(res, result, 'Result retrieved successfully');
});
