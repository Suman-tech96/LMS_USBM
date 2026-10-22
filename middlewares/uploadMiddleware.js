import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

// Ensure upload directory exists
const uploadDir = path.resolve(env.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedOriginalName}`);
  }
});

// Allowed mime types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed'
];

// File filter function
const fileFilter = (req, file, cb) => {
  if (
    ALLOWED_MIME_TYPES.includes(file.mimetype) ||
    file.mimetype.startsWith('image/') ||
    file.originalname.match(/\.(pdf|doc|docx|ppt|pptx|txt|png|jpg|jpeg|webp|zip)$/i)
  ) {
    cb(null, true);
  } else {
    cb(
      ApiError.badRequest(
        'Invalid file type. Allowed formats: PDF, Images (JPG, PNG, WEBP), Word Documents (DOC, DOCX), Presentations (PPT, PPTX), Text (TXT), and ZIP files.'
      ),
      false
    );
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024 // e.g. 15MB
  }
});
