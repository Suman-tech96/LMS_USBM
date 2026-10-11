import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config();

const requiredEnvVars = [
  'JWT_SECRET',
];

// Check critical variables
const missingVars = requiredEnvVars.filter((key) => !process.env[key]);
if (missingVars.length > 0 && process.env.NODE_ENV !== 'test') {
  console.warn(`[WARNING] Missing recommended environment variables: ${missingVars.join(', ')}`);
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5000',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lms_db',
  MONGO_TEST_URI: process.env.MONGO_TEST_URI || 'mongodb://127.0.0.1:27017/lms_test_db',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_development_secret_key_change_in_production_123',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  PASSWORD_RESET_TOKEN_EXPIRES_MINUTES: parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRES_MINUTES, 10) || 30,
  SEED_ADMIN_NAME: process.env.SEED_ADMIN_NAME || 'Super Admin',
  SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL || 'admin@lms.com',
  SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD || 'Admin@123456',
  ADMIN_RECOVERY_KEY: process.env.ADMIN_RECOVERY_KEY || 'secure_admin_recovery_key_change_in_production',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  SMTP_PORT: parseInt(process.env.SMTP_PORT, 10) || 2525,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || 'LMS Portal',
  SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || 'no-reply@lms.com',
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 15,
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  CLOUDINARY_FOLDER: process.env.CLOUDINARY_FOLDER || 'lms_study_materials'
};
