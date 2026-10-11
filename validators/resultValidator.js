import { param, query } from 'express-validator';
import mongoose from 'mongoose';

export const resultIdValidator = [
  param('id')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Invalid result ID format')
];

export const resultQueryValidator = [
  query('examination')
    .optional()
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Invalid examination ID in query'),
  query('student')
    .optional()
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Invalid student ID in query'),
  query('status')
    .optional()
    .isIn(['published', 'unpublished'])
    .withMessage('Status must be published or unpublished'),
  query('page')
    .optional()
    .isInt({ min: 1 }),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
];
