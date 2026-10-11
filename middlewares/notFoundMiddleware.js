import { ApiError } from '../utils/ApiError.js';

export const notFound = (req, res, next) => {
  const error = ApiError.notFound(`Route not found - ${req.originalUrl}`);
  next(error);
};
