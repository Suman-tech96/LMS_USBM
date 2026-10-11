import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { dashboardService } from '../services/dashboardService.js';

/**
 * @desc Get Main Dashboard Overview
 * @route GET /api/v1/dashboard/overview
 * @access Private (Admin)
 */
export const getOverview = asyncHandler(async (req, res) => {
  const overview = await dashboardService.getOverview();
  return ApiResponse.success(res, overview, 'Dashboard overview retrieved successfully');
});

/**
 * @desc Get Study Materials Dashboard Statistics
 * @route GET /api/v1/dashboard/study-materials
 * @access Private (Admin)
 */
export const getStudyMaterials = asyncHandler(async (req, res) => {
  const stats = await dashboardService.getStudyMaterialsStats();
  return ApiResponse.success(res, stats, 'Study materials statistics retrieved successfully');
});

/**
 * @desc Get Courses Dashboard Statistics
 * @route GET /api/v1/dashboard/courses
 * @access Private (Admin)
 */
export const getCourses = asyncHandler(async (req, res) => {
  const stats = await dashboardService.getCoursesStats();
  return ApiResponse.success(res, stats, 'Courses statistics retrieved successfully');
});

/**
 * @desc Get Examinations List / Overview
 * @route GET /api/v1/dashboard/examinations
 * @access Private (Admin)
 */
export const getExaminations = asyncHandler(async (req, res) => {
  const stats = await dashboardService.getExaminationsStatus();
  return ApiResponse.success(res, stats, 'Examinations summary retrieved successfully');
});

/**
 * @desc Get Examination Status Breakdown
 * @route GET /api/v1/dashboard/examinations/status
 * @access Private (Admin)
 */
export const getExaminationsStatus = asyncHandler(async (req, res) => {
  const statusBreakdown = await dashboardService.getExaminationsStatus();
  return ApiResponse.success(res, statusBreakdown, 'Examinations status breakdown retrieved');
});

/**
 * @desc Get Examination Participation & Pass Statistics
 * @route GET /api/v1/dashboard/examination-statistics
 * @access Private (Admin)
 */
export const getExaminationStatistics = asyncHandler(async (req, res) => {
  const examStats = await dashboardService.getExaminationStatistics();
  return ApiResponse.success(res, examStats, 'Examination detailed statistics retrieved');
});

/**
 * @desc Get Results Publication Status Breakdown
 * @route GET /api/v1/dashboard/results/status
 * @access Private (Admin)
 */
export const getResultsStatus = asyncHandler(async (req, res) => {
  const resultStats = await dashboardService.getResultsStatus();
  return ApiResponse.success(res, resultStats, 'Results status breakdown retrieved');
});
