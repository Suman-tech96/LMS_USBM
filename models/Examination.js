import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true
  },
  options: {
    type: [String],
    required: [true, 'Options are required'],
    validate: {
      validator: function (v) {
        return Array.isArray(v) && v.length >= 2;
      },
      message: 'A question must have at least 2 options'
    }
  },
  correctOptionIndex: {
    type: Number,
    required: [true, 'Correct option index is required'],
    min: 0
  },
  marks: {
    type: Number,
    required: [true, 'Question marks is required'],
    default: 1,
    min: 0.1
  },
  negativeMarks: {
    type: Number,
    default: 0,
    min: 0
  },
  subject: {
    type: String,
    trim: true
  },
  topic: {
    type: String,
    trim: true
  },
  questionType: {
    type: String,
    enum: ['mcq_single'],
    default: 'mcq_single'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  explanation: {
    type: String,
    trim: true
  }
});

const examinationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Examination title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true
    },
    instructions: {
      type: String,
      trim: true
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required']
    },
    targetBatches: [
      {
        type: String,
        trim: true
      }
    ],
    startDate: {
      type: Date,
      required: [true, 'Scheduled start date & time is required']
    },
    endDate: {
      type: Date,
      required: [true, 'Scheduled end date & time is required']
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Duration in minutes is required'],
      min: [1, 'Duration must be at least 1 minute']
    },
    totalMarks: {
      type: Number,
      required: [true, 'Total marks is required'],
      min: 1
    },
    passingMarks: {
      type: Number,
      required: [true, 'Passing marks is required'],
      min: 0
    },
    negativeMarks: {
      type: Number,
      default: 0,
      min: 0
    },
    maxAttempts: {
      type: Number,
      default: 1,
      min: 1
    },
    totalQuestions: {
      type: Number,
      default: 0
    },
    questions: [questionSchema],
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'live', 'ongoing', 'completed', 'published', 'cancelled'],
      default: 'draft'
    },
    isPublished: {
      type: Boolean,
      default: false
    },
    isResultPublished: {
      type: Boolean,
      default: false
    },
    resultPublicationDate: {
      type: Date
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

examinationSchema.index({ course: 1, status: 1, isDeleted: 1 });
examinationSchema.index({ startDate: 1, endDate: 1 });
examinationSchema.index({ status: 1 });

// Automatically compute total questions before save
examinationSchema.pre('save', function () {
  if (this.questions && Array.isArray(this.questions)) {
    this.totalQuestions = this.questions.length;
  }
});

export const Examination = mongoose.model('Examination', examinationSchema);
