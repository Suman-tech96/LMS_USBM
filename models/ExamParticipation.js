import mongoose from 'mongoose';

const answerSubmissionSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  selectedOptionIndex: {
    type: Number,
    required: false
  },
  isAttempted: {
    type: Boolean,
    default: true
  },
  isMarkedForReview: {
    type: Boolean,
    default: false
  },
  isCorrect: {
    type: Boolean,
    default: false
  },
  marksAwarded: {
    type: Number,
    default: 0
  },
  negativeMarksDeducted: {
    type: Number,
    default: 0
  }
});

const examParticipationSchema = new mongoose.Schema(
  {
    examination: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Examination',
      required: [true, 'Examination reference is required']
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required']
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    batch: {
      type: String,
      trim: true
    },
    attemptNumber: {
      type: Number,
      default: 1,
      min: 1
    },
    startTime: {
      type: Date,
      default: Date.now
    },
    submitTime: {
      type: Date
    },
    durationUsedMinutes: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['in-progress', 'submitted', 'abandoned', 'timed-out'],
      default: 'in-progress'
    },
    isAutoSubmitted: {
      type: Boolean,
      default: false
    },
    answers: [answerSubmissionSchema],
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
    positiveMarks: {
      type: Number,
      default: 0
    },
    negativeMarksDeducted: {
      type: Number,
      default: 0
    },
    totalScore: {
      type: Number,
      default: 0
    },
    isEvaluated: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

examParticipationSchema.index({ examination: 1, student: 1, attemptNumber: 1 });
examParticipationSchema.index({ student: 1, status: 1 });
examParticipationSchema.index({ examination: 1, status: 1 });

export const ExamParticipation = mongoose.model('ExamParticipation', examParticipationSchema);
