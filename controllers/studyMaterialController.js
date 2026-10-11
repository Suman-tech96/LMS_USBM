import { StudyMaterial } from '../models/StudyMaterial.js';
import { Course } from '../models/Course.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { cloudinaryService } from '../services/cloudinaryService.js';

/**
 * @desc Create new Study Material (Uploads to Cloudinary if configured, or local fallback)
 * @route POST /api/v1/study-materials
 * @access Private (Admin)
 */
export const createStudyMaterial = asyncHandler(async (req, res) => {
  const { title, description, course, category, youtubeLink, status } = req.body;

  const courseDoc = await Course.findOne({ _id: course, isDeleted: { $ne: true } });
  if (!courseDoc) {
    throw ApiError.notFound('Referenced course does not exist');
  }

  let fileUrl = req.body.fileUrl;
  let fileName = req.body.fileName;
  let fileType = req.body.fileType || (youtubeLink && !req.file && !fileUrl ? 'video' : 'pdf');
  let mimeType = req.body.mimeType || (youtubeLink && !req.file && !fileUrl ? 'video/youtube' : 'application/pdf');
  let fileSize = req.body.fileSize || 0;
  let cloudinaryPublicId = undefined;
  let storageType = 'local';

  // Handle uploaded file if present
  if (req.file) {
    fileName = req.file.originalname;
    mimeType = req.file.mimetype;
    fileSize = req.file.size;
    fileType = req.file.mimetype.startsWith('image/') ? 'image' : 'pdf';

    if (cloudinaryService.isConfigured()) {
      const uploadResult = await cloudinaryService.uploadFile(req.file);
      fileUrl = uploadResult.secureUrl;
      cloudinaryPublicId = uploadResult.publicId;
      storageType = 'cloudinary';
    } else {
      fileUrl = `/uploads/${req.file.filename}`;
      storageType = 'local';
    }
  }

  // Support study material with YouTube link if no file is uploaded
  if (!fileUrl && youtubeLink) {
    fileUrl = youtubeLink;
    storageType = 'external';
  }

  if (!fileUrl && !youtubeLink) {
    throw ApiError.badRequest('Please upload a file, provide a fileUrl, or provide a YouTube link');
  }

  const studyMaterial = await StudyMaterial.create({
    title,
    description,
    course,
    category: category || courseDoc.category,
    fileUrl,
    fileName,
    fileType,
    mimeType,
    fileSize,
    cloudinaryPublicId,
    storageType,
    youtubeLink: youtubeLink || null,
    status: status || 'active',
    createdBy: req.admin?._id
  });

  // Automatically associate with course
  if (!courseDoc.studyMaterials.includes(studyMaterial._id)) {
    courseDoc.studyMaterials.push(studyMaterial._id);
    await courseDoc.save();
  }

  const populated = await StudyMaterial.findById(studyMaterial._id).populate('course', 'name code');
  return ApiResponse.created(res, populated, 'Study material created successfully');
});

/**
 * @desc Get all study materials with search and filters
 * @route GET /api/v1/study-materials
 * @access Private (Admin or Student)
 */
export const getAllStudyMaterials = asyncHandler(async (req, res) => {
  const { search, course, category, fileType, status, page = 1, limit = 10, sort = '-createdAt' } = req.query;

  const query = { isDeleted: { $ne: true } };

  if (status) query.status = status;
  if (course) query.course = course;
  if (fileType) query.fileType = fileType;
  if (category) query.category = new RegExp(category, 'i');

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } }
    ];
  }

  const allowedSortFields = ['createdAt', '-createdAt', 'title', '-title', 'fileSize', '-fileSize'];
  const sortOption = allowedSortFields.includes(sort) ? sort : '-createdAt';

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const [materials, total] = await Promise.all([
    StudyMaterial.find(query)
      .populate('course', 'name code')
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum),
    StudyMaterial.countDocuments(query)
  ]);

  const pagination = {
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum) || 1
  };

  return ApiResponse.success(res, materials, 'Study materials retrieved successfully', 200, pagination);
});

/**
 * @desc Get study material by ID
 * @route GET /api/v1/study-materials/:id
 * @access Private (Admin or Student)
 */
export const getStudyMaterialById = asyncHandler(async (req, res) => {
  const material = await StudyMaterial.findOne({
    _id: req.params.id,
    isDeleted: { $ne: true }
  }).populate('course', 'name code category');

  if (!material) {
    throw ApiError.notFound('Study material not found');
  }

  return ApiResponse.success(res, material, 'Study material retrieved successfully');
});

/**
 * @desc Update study material details
 * @route PATCH /api/v1/study-materials/:id
 * @access Private (Admin)
 */
export const updateStudyMaterial = asyncHandler(async (req, res) => {
  const material = await StudyMaterial.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

  if (!material) {
    throw ApiError.notFound('Study material not found');
  }

  const { title, description, course, category, fileType, youtubeLink, status, fileUrl } = req.body;

  if (course && course.toString() !== material.course.toString()) {
    const courseDoc = await Course.findOne({ _id: course, isDeleted: { $ne: true } });
    if (!courseDoc) {
      throw ApiError.notFound('Assigned course does not exist');
    }
    material.course = course;
  }

  if (title !== undefined) material.title = title;
  if (description !== undefined) material.description = description;
  if (category !== undefined) material.category = category;
  if (fileType !== undefined) material.fileType = fileType;
  if (youtubeLink !== undefined) material.youtubeLink = youtubeLink || null;
  if (status !== undefined) material.status = status;
  if (fileUrl !== undefined) material.fileUrl = fileUrl;

  await material.save();

  const updated = await StudyMaterial.findById(material._id).populate('course', 'name code');
  return ApiResponse.success(res, updated, 'Study material updated successfully');
});

/**
 * @desc Update study material status
 * @route PATCH /api/v1/study-materials/:id/status
 * @access Private (Admin)
 */
export const updateStudyMaterialStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const material = await StudyMaterial.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

  if (!material) {
    throw ApiError.notFound('Study material not found');
  }

  material.status = status;
  await material.save();

  return ApiResponse.success(res, material, `Study material status updated to ${status}`);
});

/**
 * @desc Delete study material (soft delete)
 * @route DELETE /api/v1/study-materials/:id
 * @access Private (Admin)
 */
export const deleteStudyMaterial = asyncHandler(async (req, res) => {
  const material = await StudyMaterial.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

  if (!material) {
    throw ApiError.notFound('Study material not found');
  }

  material.isDeleted = true;
  material.status = 'inactive';
  await material.save();

  // Remove from Course mapping
  await Course.updateOne(
    { _id: material.course },
    { $pull: { studyMaterials: material._id } }
  );

  // If stored in Cloudinary, delete remote asset
  if (material.cloudinaryPublicId) {
    const resourceType = material.fileType === 'image' ? 'image' : 'raw';
    await cloudinaryService.deleteFile(material.cloudinaryPublicId, resourceType);
  }

  return ApiResponse.success(res, null, 'Study material deleted successfully');
});
