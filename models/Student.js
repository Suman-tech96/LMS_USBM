import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Student email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/, 'Please provide a valid email']
    },
    studentId: {
      type: String,
      required: [true, 'Student ID / Roll number is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false
    },
    phone: {
      type: String,
      trim: true
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course assignment is required']
    },
    batch: {
      type: String,
      required: [true, 'Batch assignment is required'],
      trim: true
    },
    role: {
      type: String,
      enum: ['student'],
      default: 'student'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active'
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    enrolledDate: {
      type: Date,
      default: Date.now
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    lastLogin: Date
  },
  {
    timestamps: true
  }
);

// Compound indexes
studentSchema.index({ course: 1, batch: 1 });
studentSchema.index({ status: 1, isDeleted: 1 });

// Hash password before save (async hook for Mongoose 8/9)
studentSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

studentSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash 6-digit password reset OTP code
studentSchema.methods.getResetPasswordOtp = function (expiryMinutes = 15) {
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(otpCode)
    .digest('hex');
  this.resetPasswordExpire = new Date(Date.now() + expiryMinutes * 60 * 1000);
  return otpCode;
};

// Generate and hash password reset token (legacy helper)
studentSchema.methods.getResetPasswordToken = function (expiryMinutes = 15) {
  return this.getResetPasswordOtp(expiryMinutes);
};

export const Student = mongoose.model('Student', studentSchema);
