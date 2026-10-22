import mongoose from 'mongoose';

const studyMaterialSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Material title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required']
    },
    category: {
      type: String,
      trim: true
    },
    files: [
      {
        fileUrl: {
          type: String,
          required: true,
          trim: true
        },
        fileName: {
          type: String,
          required: true,
          trim: true
        },
        fileType: {
          type: String,
          enum: ['pdf', 'image', 'video', 'document', 'other'],
          default: 'pdf'
        },
        mimeType: {
          type: String,
          trim: true
        },
        fileSize: {
          type: Number,
          default: 0
        },
        cloudinaryPublicId: {
          type: String,
          trim: true
        },
        storageType: {
          type: String,
          enum: ['cloudinary', 'local', 'external'],
          default: 'local'
        }
      }
    ],
    fileUrl: {
      type: String,
      trim: true
    },
    youtubeLinks: [
      {
        type: String,
        trim: true
      }
    ],
    youtubeLink: {
      type: String,
      trim: true,
      default: null
    },
    fileName: {
      type: String,
      trim: true
    },
    fileType: {
      type: String,
      enum: ['pdf', 'image', 'video', 'document', 'other'],
      default: 'pdf'
    },
    mimeType: {
      type: String,
      trim: true
    },
    fileSize: {
      type: Number, // in bytes
      default: 0
    },
    cloudinaryPublicId: {
      type: String,
      trim: true
    },
    storageType: {
      type: String,
      enum: ['cloudinary', 'local', 'external'],
      default: 'local'
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  },
  {
    timestamps: true
  }
);

studyMaterialSchema.index({ course: 1, status: 1, isDeleted: 1 });
studyMaterialSchema.index({ fileType: 1 });
studyMaterialSchema.index({ title: 'text', description: 'text' });

export const StudyMaterial = mongoose.model('StudyMaterial', studyMaterialSchema);
