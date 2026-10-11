import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema(
  {
    examination: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Examination',
      required: [true, 'Examination is required']
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student is required']
    },
    participation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamParticipation',
      required: [true, 'Participation reference is required'],
      unique: true
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    batch: {
      type: String,
      trim: true
    },
    totalQuestions: {
      type: Number,
      default: 0
    },
    totalAttempted: {
      type: Number,
      default: 0
    },
    totalCorrect: {
      type: Number,
      default: 0
    },
    totalWrong: {
      type: Number,
      default: 0
    },
    totalUnattempted: {
      type: Number,
      default: 0
    },
    totalMarks: {
      type: Number,
      required: true,
      min: 0
    },
    positiveMarks: {
      type: Number,
      default: 0
    },
    negativeMarksDeducted: {
      type: Number,
      default: 0
    },
    obtainedMarks: {
      type: Number,
      required: true,
      min: 0
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    isPassed: {
      type: Boolean,
      required: true
    },
    grade: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['published', 'unpublished'],
      default: 'unpublished'
    },
    publishedAt: {
      type: Date
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
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

resultSchema.index({ examination: 1, student: 1, status: 1 });
resultSchema.index({ student: 1, status: 1, isDeleted: 1 });
resultSchema.index({ course: 1, status: 1 });
resultSchema.index({ status: 1 });

export const Result = mongoose.model('Result', resultSchema);
