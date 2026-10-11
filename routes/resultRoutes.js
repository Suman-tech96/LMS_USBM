import express from 'express';
import {
  getAllResults,
  getResultById,
  publishResult,
  unpublishResult,
  getStudentResults,
  getStudentResultById
} from '../controllers/resultController.js';
import { resultIdValidator, resultQueryValidator } from '../validators/resultValidator.js';
import { mongoIdParamValidator } from '../validators/commonValidator.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { protectAdmin, protectStudent } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Admin Result Routes
router.get('/', protectAdmin, resultQueryValidator, validateRequest, getAllResults);
router.get('/:id', protectAdmin, resultIdValidator, validateRequest, getResultById);
router.post('/:id/publish', protectAdmin, resultIdValidator, validateRequest, publishResult);
router.post('/:id/unpublish', protectAdmin, resultIdValidator, validateRequest, unpublishResult);

export default router;

// Student Result Router
export const studentResultRouter = express.Router();
studentResultRouter.use(protectStudent);

studentResultRouter.get('/', getStudentResults);
studentResultRouter.get('/:id', mongoIdParamValidator('id'), validateRequest, getStudentResultById);
