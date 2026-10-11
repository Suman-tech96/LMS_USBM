import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true,
      unique: true,
      maxlength: [150, 'Course name cannot exceed 150 characters']
    },
    code: {
      type: String,
      required: [true, 'Course code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [30, 'Course code cannot exceed 30 characters']
    },
    category: {
      type: String,
      trim: true,
      default: 'General'
    },
    description: {
      type: String,
      trim: true
    },
    youtubeLink: {
      type: String,
      trim: true,
      default: null
    },
    batches: [
      {
        type: String,
        trim: true
      }
    ],
    studyMaterials: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StudyMaterial'
      }
    ],
    examinations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Examination'
      }
    ],
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

courseSchema.index({ category: 1 });
courseSchema.index({ status: 1, isDeleted: 1 });

export const Course = mongoose.model('Course', courseSchema);
