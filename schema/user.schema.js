const crypto = require('crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    _wallet: {
      type: mongoose.SchemaTypes.ObjectId,
      required: [false, 'Server Error Wallet Is Not Creating or Merging'],
      ref: 'wallet'
    },

    _bvn: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'bvn',
      default: null,
      select: false
    },

    email: {
      type: String,
      required: [true, 'Please enter your Email address'],
      trim: true,
      unique: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid Email address'
      ]
    },

    password: {
      type: String,
      required: [true, 'Please A Valid Password is Required'],
      select: false
    },

    _verify: {
      type: Boolean,
      required: true,
      default: false
    },

    _completed: {
      type: Boolean,
      required: true,
      default: false
    },

    _type: {
      type: String,
      required: false,
      enum: ['private', 'bussiness', 'admin'],
      default: 'private'
    },

    name: {
      type: String,
      required: [true, 'Please enter your FUll Name'],
      trim: true
    },

    username: {
      type: String,
      required: [true, 'Please a Username is Required'],
      trim: true
    },

    phone: {
      type: String,
      required: [false, 'Please enter your Phone Number'],
      trim: false
    },

    pin: {
      type: String,
      required: [true, 'Please add a PIN'],
      minlength: 4,
      maxlength: 60,
      select: false
    },

    country_code: {
      type: String,
      required: [false, 'Please enter your Phone Country Code'],
      trim: false
    },

    image: {
      type: String,
      required: false,
      default: null
    },

    thumbnail: {
      type: String,
      required: false,
      default: null
    },

    device: {
      type: String,
      required: false,
      default: null
    },

    bankname: String,
    bankcode: String,
    accountname: String,
    accountnumber: String,

    Token: { type: String, select: false },
    TokenExpire: Number,
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpire: Number,

    accountNumber: {
      type: String,
      unique: true,
      sparse: true // Allows null values while maintaining uniqueness
    },

    chatHistory: [
      {
        role: {
          type: String,
          enum: ['user', 'assistant'],
          required: true
        },
        content: {
          type: String,
          required: true
        },
        timestamp: {
          type: Date,
          default: Date.now
        }
      }
    ],

    lastAnalysis: {
      type: mongoose.Schema.Types.Mixed, // This allows for flexible data structure
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Add username lowercase middleware here
userSchema.pre('save', function (next) {
  if (this.isModified('username')) {
    this.username = this.username.toLowerCase();
  }
  next();
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Match user entered password to hashed password in database
userSchema.methods.matchTransactionPin = function (enteredPin) {
  return bcrypt.compare(enteredPin, this.pin);
};

// Generate and hash password token
userSchema.methods.getResetPasswordToken = function () {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// Sign JWT
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign(
    {
      user_id: this._id
    },
    process.env.JWT_SECRET
  );
};

// Add PIN hashing middleware
userSchema.pre('save', async function (next) {
  if (!this.isModified('pin')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.pin = await bcrypt.hash(this.pin, salt);
});

// Add PIN comparison method
userSchema.methods.matchTransactionPin = async function (enteredPin) {
  return await bcrypt.compare(enteredPin, this.pin);
};

module.exports = mongoose.model('user', userSchema);
