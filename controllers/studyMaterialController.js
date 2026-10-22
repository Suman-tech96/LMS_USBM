import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { StudyMaterial } from '../models/StudyMaterial.js';
import { Course } from '../models/Course.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { cloudinaryService } from '../services/cloudinaryService.js';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Helper to process an array of uploaded Multer files (Cloudinary or local storage)
 */
const processUploadedFiles = async (filesList) => {
  const processedFiles = [];
  if (!filesList || filesList.length === 0) return processedFiles;

  for (const file of filesList) {
    let fileUrl = '';
    let cloudinaryPublicId = undefined;
    let storageType = 'local';
    const originalName = file.originalname || 'document';
    const mimeType = file.mimetype || 'application/octet-stream';
    const fileSize = file.size || 0;

    // Detect high-level file format
    let fileType = 'other';
    if (mimeType === 'application/pdf' || originalName.toLowerCase().endsWith('.pdf')) {
      fileType = 'pdf';
    } else if (mimeType.startsWith('image/')) {
      fileType = 'image';
    } else if (mimeType.startsWith('video/')) {
      fileType = 'video';
    } else if (
      originalName.match(/\.(doc|docx|ppt|pptx|txt|xls|xlsx)$/i) ||
      mimeType.includes('word') ||
      mimeType.includes('presentation')
    ) {
      fileType = 'document';
    }

    if (cloudinaryService.isConfigured()) {
      try {
        const uploadResult = await cloudinaryService.uploadFile(file);
        if (uploadResult && uploadResult.secureUrl) {
          fileUrl = uploadResult.secureUrl;
          cloudinaryPublicId = uploadResult.publicId;
          storageType = 'cloudinary';
        } else {
          throw new Error('Cloudinary did not return a valid secure URL');
        }
      } catch (err) {
        console.error(`[Cloudinary Error] Failed to upload ${originalName}:`, err.message);
        throw ApiError.badRequest(`Cloudinary upload failed for "${originalName}": ${err.message}. Please ensure file size is within limits (max 10 MB).`);
      }
    } else {
      fileUrl = `/uploads/${file.filename}`;
      storageType = 'local';
    }

    processedFiles.push({
      fileUrl,
      fileName: originalName,
      fileType,
      mimeType,
      fileSize,
      cloudinaryPublicId,
      storageType
    });
  }

  return processedFiles;
};

/**
 * Helper to extract and sanitize multiple YouTube links from request payload
 */
const parseYoutubeLinks = (body) => {
  let list = [];
  if (body.youtubeLinks !== undefined) {
    if (Array.isArray(body.youtubeLinks)) {
      list = body.youtubeLinks;
    } else if (typeof body.youtubeLinks === 'string') {
      try {
        const parsed = JSON.parse(body.youtubeLinks);
        if (Array.isArray(parsed)) list = parsed;
        else if (body.youtubeLinks.trim()) list = [body.youtubeLinks.trim()];
      } catch {
        if (body.youtubeLinks.trim()) list = [body.youtubeLinks.trim()];
      }
    }
  } else if (body.youtubeLink && typeof body.youtubeLink === 'string' && body.youtubeLink.trim()) {
    list = [body.youtubeLink.trim()];
  }
  return list.filter((l) => typeof l === 'string' && l.trim().length > 0).map((l) => l.trim());
};

/**
 * Helper to ensure a study material document always has a populated files array
 * and youtubeLinks array, even if stored under legacy structure.
 */
const formatMaterialFiles = (material) => {
  const doc = material.toObject ? material.toObject() : { ...material };
  const isYoutube = (url) => typeof url === 'string' && (url.includes('youtube.com') || url.includes('youtu.be'));

  if (Array.isArray(doc.files)) {
    // Filter out dummy youtube pseudo-files from files array
    doc.files = doc.files.filter((f) => f && f.fileUrl && !isYoutube(f.fileUrl) && !(f.fileType === 'video' && (f.fileName || '').toLowerCase().includes('youtube')));
  } else {
    doc.files = [];
  }

  // Only create fallback legacy file if fileUrl is an actual document/image/file, NOT a youtube link
  if (doc.files.length === 0 && doc.fileUrl && !isYoutube(doc.fileUrl) && doc.fileType !== 'video') {
    doc.files = [
      {
        _id: doc._id,
        fileUrl: doc.fileUrl,
        fileName: doc.fileName || doc.title || 'Document',
        fileType: doc.fileType || 'pdf',
        mimeType: doc.mimeType || 'application/pdf',
        fileSize: doc.fileSize || 0,
        storageType: doc.storageType || 'local',
        cloudinaryPublicId: doc.cloudinaryPublicId
      }
    ];
  }

  if ((!doc.youtubeLinks || doc.youtubeLinks.length === 0) && doc.youtubeLink) {
    doc.youtubeLinks = [doc.youtubeLink];
  } else if (!doc.youtubeLinks) {
    doc.youtubeLinks = [];
  }

  return doc;
};

/**
 * @desc Create new Study Material with multiple files and/or YouTube links
 * @route POST /api/v1/study-materials
 * @access Private (Admin)
 */
export const createStudyMaterial = asyncHandler(async (req, res) => {
  const { title, description, course, category, status } = req.body;

  const courseDoc = await Course.findOne({ _id: course, isDeleted: { $ne: true } });
  if (!courseDoc) {
    throw ApiError.notFound('Referenced course does not exist');
  }

  // Collect uploaded files from req.files or req.file (handles both 'file' and 'files' fields)
  let filesToProcess = [];
  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    filesToProcess = req.files;
  } else if (req.file) {
    filesToProcess = [req.file];
  }

  const uploadedFiles = await processUploadedFiles(filesToProcess);

  // If no files were uploaded via multipart, support direct fileUrl in JSON/body (matches testing format)
  if (uploadedFiles.length === 0 && req.body.fileUrl && typeof req.body.fileUrl === 'string' && req.body.fileUrl.trim()) {
    const directUrl = req.body.fileUrl.trim();
    uploadedFiles.push({
      fileUrl: directUrl,
      fileName: req.body.fileName || title || 'Study Material Document',
      fileType: req.body.fileType || (directUrl.toLowerCase().endsWith('.pdf') ? 'pdf' : 'other'),
      mimeType: req.body.mimeType || 'application/pdf',
      fileSize: req.body.fileSize || 0,
      cloudinaryPublicId: req.body.cloudinaryPublicId || undefined,
      storageType: directUrl.includes('cloudinary') ? 'cloudinary' : 'external'
    });
  }

  const youtubeLinks = parseYoutubeLinks(req.body);
  const primaryYoutube = youtubeLinks[0] || null;

  // If no files uploaded, no fileUrl passed, and no youtubeLinks provided, return error
  if (uploadedFiles.length === 0 && youtubeLinks.length === 0) {
    throw ApiError.badRequest('Please upload a file, provide a fileUrl, or provide a YouTube link');
  }

  // Derive primary file attributes for backward compatibility
  const primary = uploadedFiles[0] || null;
  const fileUrl = primary ? primary.fileUrl : '';
  const fileName = primary ? primary.fileName : '';
  const fileType = primary ? primary.fileType : 'pdf';
  const mimeType = primary ? primary.mimeType : 'application/pdf';
  const fileSize = primary ? primary.fileSize : 0;
  const storageType = primary ? primary.storageType : 'local';
  const cloudinaryPublicId = primary ? primary.cloudinaryPublicId : undefined;

  const studyMaterial = await StudyMaterial.create({
    title,
    description,
    course,
    category: category || courseDoc.category || 'General',
    files: uploadedFiles,
    fileUrl,
    fileName,
    fileType,
    mimeType,
    fileSize,
    cloudinaryPublicId,
    storageType,
    youtubeLinks,
    youtubeLink: primaryYoutube,
    status: status || 'active',
    createdBy: req.admin?._id
  });

  // Automatically associate with course
  if (!courseDoc.studyMaterials.includes(studyMaterial._id)) {
    courseDoc.studyMaterials.push(studyMaterial._id);
    await courseDoc.save();
  }

  const populated = await StudyMaterial.findById(studyMaterial._id).populate('course', 'name code category');
  return ApiResponse.created(res, formatMaterialFiles(populated), 'Study material created successfully');
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
      .populate('course', 'name code category')
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum),
    StudyMaterial.countDocuments(query)
  ]);

  const formattedMaterials = materials.map((m) => formatMaterialFiles(m));

  const pagination = {
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum) || 1
  };

  return ApiResponse.success(res, formattedMaterials, 'Study materials retrieved successfully', 200, pagination);
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

  return ApiResponse.success(res, formatMaterialFiles(material), 'Study material retrieved successfully');
});

/**
 * @desc Update study material details, attached files, and/or YouTube links
 * @route PATCH /api/v1/study-materials/:id
 * @access Private (Admin)
 */
export const updateStudyMaterial = asyncHandler(async (req, res) => {
  const material = await StudyMaterial.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

  if (!material) {
    throw ApiError.notFound('Study material not found');
  }

  const { title, description, course, category, fileType, status } = req.body;

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
  if (status !== undefined) material.status = status;

  // Handle multiple YouTube links
  if (req.body.youtubeLinks !== undefined || req.body.youtubeLink !== undefined) {
    const parsedYoutube = parseYoutubeLinks(req.body);
    material.youtubeLinks = parsedYoutube;
    material.youtubeLink = parsedYoutube[0] || null;
  }

  // Check if existing files array is initialized
  if ((!material.files || material.files.length === 0) && material.fileUrl) {
    material.files.push({
      fileUrl: material.fileUrl,
      fileName: material.fileName || material.title || 'Document',
      fileType: material.fileType || 'pdf',
      mimeType: material.mimeType || 'application/pdf',
      fileSize: material.fileSize || 0,
      storageType: material.storageType || 'local',
      cloudinaryPublicId: material.cloudinaryPublicId
    });
  }

  // Process newly uploaded files if any
  let filesToProcess = [];
  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    filesToProcess = req.files;
  } else if (req.file) {
    filesToProcess = [req.file];
  }

  if (filesToProcess.length > 0) {
    const newFiles = await processUploadedFiles(filesToProcess);
    material.files.push(...newFiles);
  }

  // Synchronize primary file fields with first file in array
  if (material.files && material.files.length > 0) {
    const primary = material.files[0];
    material.fileUrl = primary.fileUrl;
    material.fileName = primary.fileName;
    material.fileType = primary.fileType;
    material.mimeType = primary.mimeType;
    material.fileSize = primary.fileSize;
    material.storageType = primary.storageType;
    material.cloudinaryPublicId = primary.cloudinaryPublicId;
  } else {
    material.fileUrl = '';
    material.fileName = '';
    material.fileType = 'pdf';
    material.fileSize = 0;
  }

  await material.save();

  const updated = await StudyMaterial.findById(material._id).populate('course', 'name code category');
  return ApiResponse.success(res, formatMaterialFiles(updated), 'Study material updated successfully');
});

/**
 * @desc Delete a specific file from a study material
 * @route DELETE /api/v1/study-materials/:id/files/:fileId
 * @access Private (Admin)
 */
export const deleteStudyMaterialFile = asyncHandler(async (req, res) => {
  const { id, fileId } = req.params;

  const material = await StudyMaterial.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!material) {
    throw ApiError.notFound('Study material not found');
  }

  // Ensure files array is initialized
  if ((!material.files || material.files.length === 0) && material.fileUrl) {
    material.files.push({
      fileUrl: material.fileUrl,
      fileName: material.fileName || material.title || 'Document',
      fileType: material.fileType || 'pdf',
      mimeType: material.mimeType || 'application/pdf',
      fileSize: material.fileSize || 0,
      storageType: material.storageType || 'local',
      cloudinaryPublicId: material.cloudinaryPublicId
    });
  }

  const fileIndex = material.files.findIndex((f) => f._id.toString() === fileId);
  if (fileIndex === -1) {
    throw ApiError.notFound('Specified file does not exist in this study material');
  }

  const [removedFile] = material.files.splice(fileIndex, 1);

  // Clean up remote Cloudinary or local physical file
  if (removedFile) {
    if (removedFile.cloudinaryPublicId) {
      const resType = removedFile.fileType === 'image' ? 'image' : 'raw';
      await cloudinaryService.deleteFile(removedFile.cloudinaryPublicId, resType);
    } else if (removedFile.fileUrl && removedFile.fileUrl.startsWith('/uploads/')) {
      const filename = path.basename(removedFile.fileUrl);
      const localFilePath = path.join(__dirname, '..', env.UPLOAD_DIR || 'uploads', filename);
      if (fs.existsSync(localFilePath)) {
        try {
          fs.unlinkSync(localFilePath);
        } catch (e) {
          console.warn('Could not delete local file on disk:', e.message);
        }
      }
    }
  }

  // Update primary file fields
  if (material.files.length > 0) {
    const primary = material.files[0];
    material.fileUrl = primary.fileUrl;
    material.fileName = primary.fileName;
    material.fileType = primary.fileType;
    material.mimeType = primary.mimeType;
    material.fileSize = primary.fileSize;
    material.storageType = primary.storageType;
    material.cloudinaryPublicId = primary.cloudinaryPublicId;
  } else {
    // If no files remain and no youtube link, keep basic info
    material.fileUrl = material.youtubeLink || '';
    material.fileName = material.youtubeLink ? 'YouTube Video Lecture' : '';
    material.fileType = material.youtubeLink ? 'video' : 'pdf';
    material.fileSize = 0;
    material.cloudinaryPublicId = undefined;
    material.storageType = material.youtubeLink ? 'external' : 'local';
  }

  await material.save();

  const updated = await StudyMaterial.findById(material._id).populate('course', 'name code category');
  return ApiResponse.success(res, formatMaterialFiles(updated), 'File removed successfully from study material');
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

  return ApiResponse.success(res, formatMaterialFiles(material), `Study material status updated to ${status}`);
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

  return ApiResponse.success(res, null, 'Study material deleted successfully');
});
