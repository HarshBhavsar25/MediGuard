const mongoose = require('mongoose');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
    },
    role: {
      type: String,
      default: 'admin',
      enum: ['admin', 'staff'],
    },
    name: {
      type: String,
      default: 'MediGuard Administrator',
    },
  },
  {
    timestamps: true,
  }
);

// Method to verify password (supports simple SHA-256 hashing or plain text fallback for beginner setup)
userSchema.methods.verifyPassword = function (candidatePassword) {
  const hash = crypto.createHash('sha256').update(candidatePassword).digest('hex');
  return this.password === hash || this.password === candidatePassword;
};

// Static helper to hash passwords
userSchema.statics.hashPassword = function (plainPassword) {
  return crypto.createHash('sha256').update(plainPassword).digest('hex');
};

module.exports = mongoose.model('User', userSchema);
