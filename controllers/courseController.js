import { Course } from '../models/Course.js';
import { StudyMaterial } from '../models/StudyMaterial.js';
import { Examination } from '../models/Examination.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

/**
 * @desc Create new Course / Category
 * @route POST /api/v1/courses
 * @access Private (Admin)
 */
export const createCourse = asyncHandler(async (req, res) => {
  const { name, code, category, description, youtubeLink, batches, status } = req.body;

  const existingCode = await Course.findOne({ code: code.toUpperCase() });
  if (existingCode) {
    throw ApiError.conflict(`Course with code '${code}' already exists`);
  }

  const existingName = await Course.findOne({ name: name.trim() });
  if (existingName) {
    throw ApiError.conflict(`Course with name '${name}' already exists`);
  }

  const course = await Course.create({
    name,
    code,
    category: category || 'General',
    description,
    youtubeLink: youtubeLink || null,
    batches: batches || [],
    status: status || 'active'
  });

  return ApiResponse.created(res, course, 'Course created successfully');
});

/**
 * @desc Get all courses with search, filtering, and pagination
 * @route GET /api/v1/courses
 * @access Private (Admin or Student)
 */
export const getAllCourses = asyncHandler(async (req, res) => {
  const { search, category, status, page = 1, limit = 10, sort = '-createdAt' } = req.query;

  const query = { isDeleted: { $ne: true } };

  if (status) {
    query.status = status;
  }

  if (category) {
    query.category = new RegExp(category, 'i');
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } }
    ];
  }

  const allowedSortFields = ['createdAt', '-createdAt', 'name', '-name', 'code', '-code', 'status', '-status'];
  const sortOption = allowedSortFields.includes(sort) ? sort : '-createdAt';

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const [courses, total] = await Promise.all([
    Course.find(query)
      .populate('studyMaterials', 'title fileType fileUrl status')
      .populate('examinations', 'title status startDate endDate durationMinutes totalMarks')
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum),
    Course.countDocuments(query)
  ]);

  const pagination = {
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum) || 1
  };

  return ApiResponse.success(res, courses, 'Courses retrieved successfully', 200, pagination);
});

/**
 * @desc Get course by ID with mapped study materials and examinations
 * @route GET /api/v1/courses/:id
 * @access Private (Admin or Student)
 */
export const getCourseById = asyncHandler(async (req, res) => {
  const course = await Course.findOne({
    _id: req.params.id,
    isDeleted: { $ne: true }
  })
    .populate({
      path: 'studyMaterials',
      match: { isDeleted: { $ne: true } },
      select: 'title description fileType fileUrl fileSize category status'
    })
    .populate({
      path: 'examinations',
      match: { isDeleted: { $ne: true } },
      select: 'title description durationMinutes totalMarks passingMarks startDate endDate status isPublished'
    });

  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  return ApiResponse.success(res, course, 'Course details retrieved successfully');
});

/**
 * @desc Update course details
 * @route PATCH /api/v1/courses/:id
 * @access Private (Admin)
 */
export const updateCourse = asyncHandler(async (req, res) => {
  const course = await Course.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  const { name, code, category, description, youtubeLink, batches, status } = req.body;

  if (code && code.toUpperCase() !== course.code) {
    const existingCode = await Course.findOne({
      code: code.toUpperCase(),
      _id: { $ne: course._id }
    });
    if (existingCode) {
      throw ApiError.conflict('Course code is already taken');
    }
    course.code = code.toUpperCase();
  }

  if (name && name.trim() !== course.name) {
    const existingName = await Course.findOne({
      name: name.trim(),
      _id: { $ne: course._id }
    });
    if (existingName) {
      throw ApiError.conflict('Course name is already taken');
    }
    course.name = name.trim();
  }

  if (category !== undefined) course.category = category;
  if (description !== undefined) course.description = description;
  if (youtubeLink !== undefined) course.youtubeLink = youtubeLink || null;
  if (batches !== undefined) course.batches = batches;
  if (status !== undefined) course.status = status;

  await course.save();

  return ApiResponse.success(res, course, 'Course updated successfully');
});

/**
 * @desc Update course status (active / inactive)
 * @route PATCH /api/v1/courses/:id/status
 * @access Private (Admin)
 */
export const updateCourseStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const course = await Course.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  course.status = status;
  await course.save();

  return ApiResponse.success(res, course, `Course status updated to ${status}`);
});

/**
 * @desc Map / Associate study materials to course
 * @route PUT /api/v1/courses/:id/study-materials
 * @access Private (Admin)
 */
export const mapStudyMaterials = asyncHandler(async (req, res) => {
  const { studyMaterialIds } = req.body;

  const course = await Course.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  // Verify all study material IDs exist
  const existingMaterials = await StudyMaterial.find({
    _id: { $in: studyMaterialIds },
    isDeleted: { $ne: true }
  });

  if (existingMaterials.length !== studyMaterialIds.length) {
    throw ApiError.badRequest('One or more referenced study materials do not exist');
  }

  // Set unique study material references
  course.studyMaterials = Array.from(new Set(studyMaterialIds));
  await course.save();

  const updatedCourse = await Course.findById(course._id).populate('studyMaterials');

  return ApiResponse.success(res, updatedCourse, 'Study materials mapped to course successfully');
});

/**
 * @desc Map / Associate examinations to course
 * @route PUT /api/v1/courses/:id/examinations
 * @access Private (Admin)
 */
export const mapExaminations = asyncHandler(async (req, res) => {
  const { examinationIds } = req.body;

  const course = await Course.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  // Verify all examination IDs exist
  const existingExams = await Examination.find({
    _id: { $in: examinationIds },
    isDeleted: { $ne: true }
  });

  if (existingExams.length !== examinationIds.length) {
    throw ApiError.badRequest('One or more referenced examinations do not exist');
  }

  course.examinations = Array.from(new Set(examinationIds));
  await course.save();

  const updatedCourse = await Course.findById(course._id).populate('examinations');

  return ApiResponse.success(res, updatedCourse, 'Examinations mapped to course successfully');
});

/**
 * @desc Soft delete course
 * @route DELETE /api/v1/courses/:id
 * @access Private (Admin)
 */
export const deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  course.isDeleted = true;
  course.status = 'inactive';
  await course.save();

  return ApiResponse.success(res, null, 'Course deleted successfully');
});
