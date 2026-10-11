import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Admin name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/, 'Please provide a valid email']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false
    },
    role: {
      type: String,
      enum: ['admin', 'student'],
      default: 'admin'
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
    
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    lastLogin: Date
  },
  {
    timestamps: true
  }
);

// Hash password before saving if modified (async hook for Mongoose 8/9)
adminSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
adminSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash 6-digit password reset OTP code
adminSchema.methods.getResetPasswordOtp = function (expiryMinutes = 15) {
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(otpCode)
    .digest('hex');
  this.resetPasswordExpire = new Date(Date.now() + expiryMinutes * 60 * 1000);
  return otpCode;
};

// Generate and hash password reset token (legacy helper)
adminSchema.methods.getResetPasswordToken = function (expiryMinutes = 15) {
  return this.getResetPasswordOtp(expiryMinutes);
};

export const Admin = mongoose.model('Admin', adminSchema);
