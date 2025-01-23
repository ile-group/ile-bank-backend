const mongoose = require('mongoose');

const customerCareSchema = new mongoose.Schema(
  {
    _user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    subject: {
      type: String,
      required: true,
      enum: [
        'Account Issue',
        'Transaction Issue',
        'Savings Issue',
        'Technical Support',
        'Other'
      ]
    },
    message: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'resolved'],
      default: 'pending'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    response: {
      type: String,
      default: ''
    },
    responseDate: {
      type: Date
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('CustomerCare', customerCareSchema);
