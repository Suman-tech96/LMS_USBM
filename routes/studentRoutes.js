import express from 'express';
import {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  updateStudentStatus,
  updateStudentCourseBatch,
  getStudentExaminations,
  getStudentResults,
  deleteStudent
} from '../controllers/studentController.js';
import {
  createStudentValidator,
  updateStudentValidator,
  updateStudentStatusValidator,
  updateStudentCourseBatchValidator
} from '../validators/studentValidator.js';
import { mongoIdParamValidator, paginationQueryValidator } from '../validators/commonValidator.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { protectAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Admin-only student management
router.use(protectAdmin);

router.post('/', createStudentValidator, validateRequest, createStudent);
router.get('/', paginationQueryValidator, validateRequest, getAllStudents);
router.get('/:id', mongoIdParamValidator('id'), validateRequest, getStudentById);
router.patch('/:id', updateStudentValidator, validateRequest, updateStudent);
router.patch('/:id/status', updateStudentStatusValidator, validateRequest, updateStudentStatus);
router.patch('/:id/course-batch', updateStudentCourseBatchValidator, validateRequest, updateStudentCourseBatch);
router.get('/:id/examinations', mongoIdParamValidator('id'), validateRequest, getStudentExaminations);
router.get('/:id/results', mongoIdParamValidator('id'), validateRequest, getStudentResults);
router.delete('/:id', mongoIdParamValidator('id'), validateRequest, deleteStudent);

export default router;
