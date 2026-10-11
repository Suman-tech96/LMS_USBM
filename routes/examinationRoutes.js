import express from 'express';
import {
  createExamination,
  getAllExaminations,
  getExaminationById,
  updateExamination,
  updateExaminationStatus,
  deleteExamination,
  addExamQuestion,
  updateExamQuestion,
  deleteExamQuestion,
  toggleQuestionStatus,
  getStudentAvailableExams,
  getStudentExamInstructions,
  getStudentExamById,
  startExamAttempt,
  saveStudentAnswer,
  submitExamAttempt,
  getStudentCurrentAttempt,
  getStudentExamResult
} from '../controllers/examinationController.js';
import {
  createExaminationValidator,
  updateExaminationValidator,
  updateExaminationStatusValidator,
  createQuestionValidator,
  updateQuestionValidator,
  saveStudentAnswerValidator,
  submitExamValidator
} from '../validators/examinationValidator.js';
import { mongoIdParamValidator, paginationQueryValidator } from '../validators/commonValidator.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { protectAdmin, protectStudent } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Admin Examination Lifecycle Routes
router.post('/', protectAdmin, createExaminationValidator, validateRequest, createExamination);
router.get('/', protectAdmin, paginationQueryValidator, validateRequest, getAllExaminations);
router.get('/:id', protectAdmin, mongoIdParamValidator('id'), validateRequest, getExaminationById);
router.patch('/:id', protectAdmin, updateExaminationValidator, validateRequest, updateExamination);
router.patch('/:id/status', protectAdmin, updateExaminationStatusValidator, validateRequest, updateExaminationStatus);
router.delete('/:id', protectAdmin, mongoIdParamValidator('id'), validateRequest, deleteExamination);

// Question Bank Management Routes (Admin)
router.post('/:id/questions', protectAdmin, createQuestionValidator, validateRequest, addExamQuestion);
router.patch('/:id/questions/:questionId', protectAdmin, updateQuestionValidator, validateRequest, updateExamQuestion);
router.delete('/:id/questions/:questionId', protectAdmin, mongoIdParamValidator('id'), mongoIdParamValidator('questionId'), validateRequest, deleteExamQuestion);
router.patch('/:id/questions/:questionId/status', protectAdmin, mongoIdParamValidator('id'), mongoIdParamValidator('questionId'), validateRequest, toggleQuestionStatus);

export default router;

// Student-specific examination portal router
export const studentExamRouter = express.Router();
studentExamRouter.use(protectStudent);

studentExamRouter.get('/', getStudentAvailableExams);
studentExamRouter.get('/:id/instructions', mongoIdParamValidator('id'), validateRequest, getStudentExamInstructions);
studentExamRouter.get('/:id', mongoIdParamValidator('id'), validateRequest, getStudentExamById);
studentExamRouter.post('/:id/start', mongoIdParamValidator('id'), validateRequest, startExamAttempt);
studentExamRouter.post('/:id/save-answer', saveStudentAnswerValidator, validateRequest, saveStudentAnswer);
studentExamRouter.post('/:id/submit', submitExamValidator, validateRequest, submitExamAttempt);
studentExamRouter.get('/:id/attempt', mongoIdParamValidator('id'), validateRequest, getStudentCurrentAttempt);
studentExamRouter.get('/:id/result', mongoIdParamValidator('id'), validateRequest, getStudentExamResult);
