import { body, param } from 'express-validator';
import mongoose from 'mongoose';

export const createExaminationValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Examination title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('course')
    .notEmpty()
    .withMessage('Course ID is required')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Course must be a valid MongoDB ObjectId'),
  body('targetBatches')
    .optional()
    .isArray()
    .withMessage('targetBatches must be an array of batch strings'),
  body('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  body('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((endDate, { req }) => {
      if (new Date(endDate) <= new Date(req.body.startDate)) {
        throw new Error('End date must be later than start date');
      }
      return true;
    }),
  body('durationMinutes')
    .notEmpty()
    .withMessage('Duration is required')
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer in minutes'),
  body('totalMarks')
    .notEmpty()
    .withMessage('Total marks is required')
    .isFloat({ min: 1 })
    .withMessage('Total marks must be at least 1'),
  body('passingMarks')
    .notEmpty()
    .withMessage('Passing marks is required')
    .isFloat({ min: 0 })
    .withMessage('Passing marks must be at least 0')
    .custom((passingMarks, { req }) => {
      if (Number(passingMarks) > Number(req.body.totalMarks)) {
        throw new Error('Passing marks cannot exceed total marks');
      }
      return true;
    }),
  body('negativeMarks')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Negative marks must be a non-negative number'),
  body('maxAttempts')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max attempts must be at least 1'),
  body('questions')
    .isArray({ min: 1 })
    .withMessage('At least one question is required'),
  body('questions.*.questionText')
    .notEmpty()
    .withMessage('Question text is required'),
  body('questions.*.options')
    .isArray({ min: 2 })
    .withMessage('Each question must have at least 2 options'),
  body('questions.*.correctOptionIndex')
    .isInt({ min: 0 })
    .withMessage('Valid correctOptionIndex (0-based) is required'),
  body('questions.*.marks')
    .optional()
    .isFloat({ min: 0.1 })
    .withMessage('Question marks must be at least 0.1'),
  body('questions.*.negativeMarks')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Question negative marks must be a non-negative number'),
  body('status')
    .optional()
    .isIn(['draft', 'scheduled', 'live', 'ongoing', 'completed', 'published', 'cancelled'])
    .withMessage('Invalid examination status'),
  body('isResultPublished')
    .optional()
    .isBoolean(),
  body('resultPublicationDate')
    .optional()
    .isISO8601()
];

export const updateExaminationValidator = [
  param('id')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Invalid examination ID format'),
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
  body('targetBatches')
    .optional()
    .isArray(),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((endDate, { req }) => {
      if (req.body.startDate && new Date(endDate) <= new Date(req.body.startDate)) {
        throw new Error('End date must be later than start date');
      }
      return true;
    }),
  body('durationMinutes')
    .optional()
    .isInt({ min: 1 }),
  body('totalMarks')
    .optional()
    .isFloat({ min: 1 }),
  body('passingMarks')
    .optional()
    .isFloat({ min: 0 }),
  body('negativeMarks')
    .optional()
    .isFloat({ min: 0 }),
  body('maxAttempts')
    .optional()
    .isInt({ min: 1 }),
  body('questions')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Questions must be a non-empty array'),
  body('questions.*.negativeMarks')
    .optional()
    .isFloat({ min: 0 }),
  body('status')
    .optional()
    .isIn(['draft', 'scheduled', 'live', 'ongoing', 'completed', 'published', 'cancelled']),
  body('isResultPublished')
    .optional()
    .isBoolean(),
  body('resultPublicationDate')
    .optional()
    .isISO8601()
];

export const updateExaminationStatusValidator = [
  param('id')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Invalid examination ID format'),
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['draft', 'scheduled', 'live', 'ongoing', 'completed', 'published', 'cancelled'])
    .withMessage('Invalid examination status')
];

export const createQuestionValidator = [
  param('id')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Invalid examination ID format'),
  body('questionText')
    .trim()
    .notEmpty()
    .withMessage('Question text is required'),
  body('options')
    .isArray({ min: 2 })
    .withMessage('Question must have at least 2 options'),
  body('correctOptionIndex')
    .notEmpty()
    .withMessage('Correct option index is required')
    .isInt({ min: 0 })
    .withMessage('Valid correctOptionIndex (0-based) is required')
    .custom((idx, { req }) => {
      if (req.body.options && idx >= req.body.options.length) {
        throw new Error('correctOptionIndex cannot exceed available options');
      }
      return true;
    }),
  body('marks')
    .optional()
    .isFloat({ min: 0.1 })
    .withMessage('Marks must be at least 0.1'),
  body('negativeMarks')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Negative marks must be non-negative'),
  body('subject')
    .optional()
    .trim(),
  body('topic')
    .optional()
    .trim(),
  body('explanation')
    .optional()
    .trim()
];

export const updateQuestionValidator = [
  param('id')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Invalid examination ID format'),
  param('questionId')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Invalid question ID format'),
  body('questionText')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Question text cannot be empty'),
  body('options')
    .optional()
    .isArray({ min: 2 })
    .withMessage('Options must be an array with at least 2 items'),
  body('correctOptionIndex')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Correct option index must be a non-negative integer'),
  body('marks')
    .optional()
    .isFloat({ min: 0.1 }),
  body('negativeMarks')
    .optional()
    .isFloat({ min: 0 }),
  body('subject')
    .optional()
    .trim(),
  body('topic')
    .optional()
    .trim(),
  body('isActive')
    .optional()
    .isBoolean()
];

export const submitExamValidator = [
  param('id')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Invalid examination ID format'),
  body('answers')
    .optional()
    .isArray()
    .withMessage('Answers must be an array of submissions'),
  body('answers.*.questionId')
    .optional()
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Invalid questionId format'),
  body('answers.*.selectedOptionIndex')
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage('selectedOptionIndex must be a non-negative integer')
];

export const saveStudentAnswerValidator = [
  param('id')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Invalid examination ID format'),
  body('questionId')
    .notEmpty()
    .withMessage('Question ID is required')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Invalid question ID format'),
  body('selectedOptionIndex')
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage('selectedOptionIndex must be a non-negative integer'),
  body('isMarkedForReview')
    .optional()
    .isBoolean()
    .withMessage('isMarkedForReview must be a boolean')
];
