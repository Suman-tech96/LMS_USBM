import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import { env } from '../config/env.js';

class CloudinaryService {
  constructor() {
    this.configured = false;
    this.init();
  }

  init() {
    if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
      cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
        secure: true
      });
      this.configured = true;
    }
  }

  /**
   * Check if Cloudinary credentials are fully configured
   */
  isConfigured() {
    return (
      Boolean(env.CLOUDINARY_CLOUD_NAME) &&
      Boolean(env.CLOUDINARY_API_KEY) &&
      Boolean(env.CLOUDINARY_API_SECRET)
    );
  }

  /**
   * Upload a file (PDF, Image, etc.) to Cloudinary
   * @param {Object} file - Multer file object or file info with path, mimetype, originalname
   * @param {Object} options - Custom upload options (folder, tags, etc.)
   */
  async uploadFile(file, options = {}) {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const isImage = file.mimetype?.startsWith('image/');
      const isPdf = file.mimetype === 'application/pdf' || file.originalname?.toLowerCase().endsWith('.pdf');
      
      let resourceType = options.resourceType;
      if (!resourceType) {
        if (isImage || isPdf) {
          resourceType = 'auto';
        } else {
          resourceType = 'raw';
        }
      }

      const uploadOptions = {
        folder: options.folder || env.CLOUDINARY_FOLDER || 'lms_study_materials',
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
        ...options
      };

      const result = await cloudinary.uploader.upload(file.path, uploadOptions);

      // Clean up local temp file after successful upload to Cloudinary
      if (file.path && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch (cleanupErr) {
          console.warn('[CloudinaryService] Failed to clean up local temp file:', cleanupErr.message);
        }
      }

      return {
        secureUrl: result.secure_url,
        publicId: result.public_id,
        format: result.format || (isPdf ? 'pdf' : undefined),
        bytes: result.bytes,
        resourceType: result.resource_type
      };
    } catch (error) {
      console.error('[CloudinaryService Error] Failed to upload to Cloudinary:', error.message);
      throw error;
    }
  }

  /**
   * Delete a file from Cloudinary by public ID
   */
  async deleteFile(publicId, resourceType = 'raw') {
    if (!this.isConfigured() || !publicId) {
      return null;
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      return result;
    } catch (error) {
      console.error('[CloudinaryService Error] Failed to delete file from Cloudinary:', error.message);
      return null;
    }
  }
}

export const cloudinaryService = new CloudinaryService();
