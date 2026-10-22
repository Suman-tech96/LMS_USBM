import express from 'express';
import {
  createStudyMaterial,
  getAllStudyMaterials,
  getStudyMaterialById,
  updateStudyMaterial,
  deleteStudyMaterialFile,
  updateStudyMaterialStatus,
  deleteStudyMaterial
} from '../controllers/studyMaterialController.js';
import {
  createStudyMaterialValidator,
  updateStudyMaterialValidator,
  updateStudyMaterialStatusValidator
} from '../validators/studyMaterialValidator.js';
import { mongoIdParamValidator, paginationQueryValidator } from '../validators/commonValidator.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { protectAdmin, protectAny } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

// Read study materials available to authenticated users
router.get('/', protectAny, paginationQueryValidator, validateRequest, getAllStudyMaterials);
router.get('/:id', protectAny, mongoIdParamValidator('id'), validateRequest, getStudyMaterialById);

// Admin-only upload & management (supports multiple files)
router.post(
  '/',
  protectAdmin,
  upload.any(),
  createStudyMaterialValidator,
  validateRequest,
  createStudyMaterial
);

router.patch(
  '/:id',
  protectAdmin,
  upload.any(),
  updateStudyMaterialValidator,
  validateRequest,
  updateStudyMaterial
);

// Delete specific file from a study material
router.delete(
  '/:id/files/:fileId',
  protectAdmin,
  mongoIdParamValidator('id'),
  mongoIdParamValidator('fileId'),
  validateRequest,
  deleteStudyMaterialFile
);

router.patch(
  '/:id/status',
  protectAdmin,
  updateStudyMaterialStatusValidator,
  validateRequest,
  updateStudyMaterialStatus
);

router.delete('/:id', protectAdmin, mongoIdParamValidator('id'), validateRequest, deleteStudyMaterial);

export default router;
