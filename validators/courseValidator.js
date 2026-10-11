import { body, param } from 'express-validator';
import mongoose from 'mongoose';

export const createCourseValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Course name is required')
    .isLength({ max: 150 })
    .withMessage('Course name cannot exceed 150 characters'),
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Course code is required')
    .toUpperCase()
    .isLength({ max: 30 })
    .withMessage('Course code cannot exceed 30 characters'),
  body('category')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Category cannot be empty'),
  body('description')
    .optional()
    .trim(),
  body('youtubeLink')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isURL()
    .withMessage('YouTube link must be a valid URL'),
  body('batches')
    .optional()
    .isArray()
    .withMessage('Batches must be an array of batch names'),
  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be active or inactive')
];

export const updateCourseValidator = [
  param('id')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Invalid course ID format'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Course name cannot be empty')
    .isLength({ max: 150 }),
  body('code')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Course code cannot be empty')
    .toUpperCase()
    .isLength({ max: 30 }),
  body('category')
    .optional()
    .trim(),
  body('description')
    .optional()
    .trim(),
  body('youtubeLink')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isURL()
    .withMessage('YouTube link must be a valid URL'),
  body('batches')
    .optional()
    .isArray()
    .withMessage('Batches must be an array of strings'),
  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be active or inactive')
];

export const updateCourseStatusValidator = [
  param('id')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Invalid course ID format'),
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['active', 'inactive'])
    .withMessage('Status must be active or inactive')
];

export const mapStudyMaterialsValidator = [
  param('id')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Invalid course ID format'),
  body('studyMaterialIds')
    .isArray()
    .withMessage('studyMaterialIds must be an array of study material IDs')
    .custom((arr) => arr.every((id) => mongoose.Types.ObjectId.isValid(id)))
    .withMessage('All studyMaterialIds must be valid MongoDB ObjectIds')
];

export const mapExaminationsValidator = [
  param('id')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Invalid course ID format'),
  body('examinationIds')
    .isArray()
    .withMessage('examinationIds must be an array of examination IDs')
    .custom((arr) => arr.every((id) => mongoose.Types.ObjectId.isValid(id)))
    .withMessage('All examinationIds must be valid MongoDB ObjectIds')
];
