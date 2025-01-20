const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const User = require('../schema/user.schema');
const bcrypt = require('bcryptjs');

/**
 * @author Cyril ogoh <cyrilogoh@gmail.com>
 * @description Get User Profile Complete
 * @route `/profile`
 * @access Private
 * @type GET
 */
exports.profile = asyncHandler(async (req, res, next) => {
  const data = await User.findOne({ _id: req.user._id })
    .select({
      _auth: 0,
      _id: 0
    })
    .populate('_wallet');
  res.status(200).json({
    success: true,
    data: data
  });
});

/**
 * @author Cyril ogoh <cyrilogoh@gmail.com>
 * @description Update The User
 * @route `/profile/update`
 * @access Private
 * @type PUT
 */
exports.updateProfile = asyncHandler(async (req, res, next) => {
  const incoming = req.body;
  delete incoming._wallet;
  delete incoming._id;
  delete incoming._type;
  delete incoming._verify;
  delete incoming._completed;
  delete incoming.createdAt;
  delete incoming.username;
  const data = await User.updateOne({ _id: req.user._id }, incoming, {
    runValidators: true,
    new: false
  }).select({
    _id: 0
  });
  res.status(200).json({
    success: true,
    data: data
  });
});

/**
 * @author Cyril ogoh <cyrilogoh@gmail.com>
 * @description Update User Password
 * @route `/profile/update/password`
 * @access Private
 * @type PUT
 */
exports.updatePassword = asyncHandler(async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(new ErrorResponse('Please provide both passwords', 400));
    }

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    // Verify current password using bcrypt directly
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isPasswordValid) {
      return next(new ErrorResponse('Current password is incorrect', 401));
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await User.findByIdAndUpdate(
      req.user.id,
      { password: hashedPassword },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Password update error:', error);
    next(new ErrorResponse('Error updating password', 500));
  }
});

/**
 * @author Cyril ogoh <cyrilogoh@gmail.com>
 * @description Update User profile Image
 * @route `/profile/update/password`
 * @access Private
 * @type PUT
 */
exports.updateProfileImage = asyncHandler(async (req, res, next) => {
  const { image, thumbnail } = req.body;
  if (!image) {
    return next(new ErrorResponse('Image Url Is Required, Try Again', 400));
  }

  let incoming = {
    image,
    thumbnail
  };

  if (!thumbnail) {
    delete incoming.thumbnail;
  }
  const data = await User.updateOne({ _id: req.user._id }, incoming).select({
    _id: 0
  });

  res.status(201).json({
    success: true,
    data: data
  });
});


exports.updatePhone = asyncHandler(async (req, res, next) => {
  try {
    const { phone, countryCode } = req.body;

    // Validate inputs
    if (!phone || !countryCode) {
      return next(
        new ErrorResponse('Phone and Country Code Is Required, Try Again', 400)
      );
    }

    // Format phone number with country code
    const formattedPhone = `${countryCode}${phone}`;

    // Update user's phone
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { phone: formattedPhone },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Phone number updated successfully',
      data: {
        phone: user.phone
      }
    });
  } catch (error) {
    next(error);
  }
});

exports.upgrade = asyncHandler(async (req, res, next) => {
  res.status(201).json({
    success: true,
    data: 'Coming Soon'
  });
});
