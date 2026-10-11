import express from 'express';
import {
  getOverview,
  getStudyMaterials,
  getCourses,
  getExaminations,
  getExaminationsStatus,
  getExaminationStatistics,
  getResultsStatus
} from '../controllers/dashboardController.js';
import { protectAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All dashboard endpoints require Admin authentication
router.use(protectAdmin);

router.get('/overview', getOverview);
router.get('/study-materials', getStudyMaterials);
router.get('/courses', getCourses);
router.get('/examinations', getExaminations);
router.get('/examinations/status', getExaminationsStatus);
router.get('/examination-statistics', getExaminationStatistics);
router.get('/results/status', getResultsStatus);

export default router;
