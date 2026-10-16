const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
    },
    batchNumber: {
      type: String,
      required: [true, 'Batch number is required'],
      trim: true,
      uppercase: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },
    manufacturingDate: {
      type: Date,
      required: [true, 'Manufacturing date is required'],
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required'],
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    storageLocation: {
      type: String,
      trim: true,
      default: 'General Shelf',
    },
    supplier: {
      type: String,
      trim: true,
      default: 'Authorized Pharmacy Supplier',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual helper to compute expiry status dynamically
medicineSchema.virtual('status').get(function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expDate = new Date(this.expiryDate);
  expDate.setHours(0, 0, 0, 0);

  const diffTime = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'EXPIRED';
  } else if (diffDays <= 30) {
    return 'EXPIRING_SOON';
  } else {
    return 'SAFE';
  }
});

// Virtual helper for days remaining / days expired
medicineSchema.virtual('daysRemaining').get(function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expDate = new Date(this.expiryDate);
  expDate.setHours(0, 0, 0, 0);

  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model('Medicine', medicineSchema);
