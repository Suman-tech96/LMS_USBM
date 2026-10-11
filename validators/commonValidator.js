import { param, query } from 'express-validator';
import mongoose from 'mongoose';

export const mongoIdParamValidator = (paramName = 'id') => [
  param(paramName)
    .notEmpty()
    .withMessage(`${paramName} parameter is required`)
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage(`Invalid ${paramName} format. Must be a valid MongoDB ObjectId`)
];

export const paginationQueryValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be an integer between 1 and 100'),
  query('sort')
    .optional()
    .isString()
    .trim(),
  query('search')
    .optional()
    .isString()
    .trim()
];
