import { body, param } from 'express-validator';
import mongoose from 'mongoose';

export const createStudyMaterialValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Material title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('course')
    .notEmpty()
    .withMessage('Course ID is required')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Course must be a valid MongoDB ObjectId'),
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
  body('fileType')
    .optional()
    .isIn(['pdf', 'image', 'video', 'document', 'other'])
    .withMessage('File type must be pdf, image, video, document, or other'),
  body('fileUrl')
    .optional()
    .trim(),
  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be active or inactive')
];

export const updateStudyMaterialValidator = [
  param('id')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Invalid study material ID format'),
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 200 }),
  body('course')
    .optional()
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Course must be a valid MongoDB ObjectId'),
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
  body('fileType')
    .optional()
    .isIn(['pdf', 'image', 'video', 'document', 'other'])
    .withMessage('File type must be pdf, image, video, document, or other'),
  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be active or inactive')
];

export const updateStudyMaterialStatusValidator = [
  param('id')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Invalid study material ID format'),
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['active', 'inactive'])
    .withMessage('Status must be active or inactive')
];
