import express from 'express';
import authRoutes from './authRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import studentRoutes from './studentRoutes.js';
import courseRoutes from './courseRoutes.js';
import studyMaterialRoutes from './studyMaterialRoutes.js';
import examinationRoutes, { studentExamRouter } from './examinationRoutes.js';
import resultRoutes, { studentResultRouter } from './resultRoutes.js';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'LMS API Gateway is healthy',
    timestamp: new Date().toISOString()
  });
});

// Mount modules
router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/students', studentRoutes);
router.use('/courses', courseRoutes);
router.use('/study-materials', studyMaterialRoutes);
router.use('/examinations', examinationRoutes);
router.use('/student/examinations', studentExamRouter);
router.use('/results', resultRoutes);
router.use('/student/results', studentResultRouter);

export default router;
