import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Generate signed JWT token for authentication
 * @param {Object} payload - Data to encode (e.g. { id, role, email })
 * @param {string} expiresIn - Expiry duration (default from config)
 * @returns {string} - JWT string
 */
export const generateToken = (payload, expiresIn = env.JWT_EXPIRES_IN) => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn
  });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token string
 * @returns {Object} - Decoded payload
 */
export const verifyToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};
