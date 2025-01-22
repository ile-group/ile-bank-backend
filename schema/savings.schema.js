const mongoose = require('mongoose');

const savingsSchema = new mongoose.Schema(
  {
    _user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    _wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    duration: {
      type: String,
      required: true,
      enum: [
        '7days',
        '14days',
        '21days',
        '30days',
        '3months',
        '6months',
        '12months'
      ]
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'broken'],
      default: 'active'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Savings', savingsSchema);
