const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const User = require('../schema/user.schema');
const bcrypt = require('bcryptjs');

/**
 * @author Cyril ogoh <cyrilogoh@gmail.com>
 * @description Confirm User Pin
 * @route `/pin`
 * @access Private
 * @type POST
 */
exports.confirm = asyncHandler(async (req, res, next) => {
  const { pin } = req.body;
  const data = await User.findOne({ _id: req.user._id });
  const isTrue = await data.matchTransactionPin(pin);
  if (!isTrue) {
    return next(new ErrorResponse('Invalid Pin', 401));
  }
  res.status(200).json({
    success: true,
    data: data
  });
});

/**
 * @author Cyril ogoh <cyrilogoh@gmail.com>
 * @description Create or Update PIN
 * @route `/pin/`
 * @access Private
 * @type PUT
 */
exports.updateNew = asyncHandler(async (req, res, next) => {
  const { currentPin, newPin } = req.body;

  // Validate new PIN
  if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
    return next(new ErrorResponse('PIN must be exactly 4 digits', 400));
  }

  const user = await User.findOne({ _id: req.user._id }).select('+pin');

  if (!user) {
    return next(new ErrorResponse('User Not Found', 404));
  }

  // If user already has a PIN, verify current PIN
  if (user.pin) {
    if (!currentPin) {
      return next(new ErrorResponse('Current PIN is required', 400));
    }

    const isPinValid = await user.matchTransactionPin(currentPin);
    if (!isPinValid) {
      return next(new ErrorResponse('Current PIN is incorrect', 401));
    }
  }

  // Hash and save new PIN
  const salt = await bcrypt.genSalt(10);
  const hashPin = await bcrypt.hash(newPin, salt);

  user.pin = hashPin;
  await user.save({
    validateBeforeSave: true
  });

  res.status(200).json({
    success: true,
    message: user.pin ? 'PIN updated successfully' : 'PIN created successfully'
  });
});
