import express from 'express';
import {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  updateCourseStatus,
  mapStudyMaterials,
  mapExaminations,
  deleteCourse
} from '../controllers/courseController.js';
import {
  createCourseValidator,
  updateCourseValidator,
  updateCourseStatusValidator,
  mapStudyMaterialsValidator,
  mapExaminationsValidator
} from '../validators/courseValidator.js';
import { mongoIdParamValidator, paginationQueryValidator } from '../validators/commonValidator.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { protectAdmin, protectAny } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Read courses available to authenticated users (admin or student)
router.get('/', protectAny, paginationQueryValidator, validateRequest, getAllCourses);
router.get('/:id', protectAny, mongoIdParamValidator('id'), validateRequest, getCourseById);

// Admin-only management endpoints
router.post('/', protectAdmin, createCourseValidator, validateRequest, createCourse);
router.patch('/:id', protectAdmin, updateCourseValidator, validateRequest, updateCourse);
router.patch('/:id/status', protectAdmin, updateCourseStatusValidator, validateRequest, updateCourseStatus);
router.put('/:id/study-materials', protectAdmin, mapStudyMaterialsValidator, validateRequest, mapStudyMaterials);
router.put('/:id/examinations', protectAdmin, mapExaminationsValidator, validateRequest, mapExaminations);
router.delete('/:id', protectAdmin, mongoIdParamValidator('id'), validateRequest, deleteCourse);

export default router;
