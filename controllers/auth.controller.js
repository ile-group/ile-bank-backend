const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const bcrypt = require('bcryptjs');
const _ = require('lodash');
const sendEmail = require('../mail/index.mail');
// const { generateOTP } = require('../utils/otpGen');
const jwt = require('jsonwebtoken');
const User = require('../schema/user.schema');
const Wallet = require('../schema/wallet.schema');
const {
  VERIFICATION_EMAIL_TEMPLATE
} = require('../mail/template/verifyToken.template');
const {
  PASSWORD_RESET_REQUEST_TEMPLATE
} = require('../mail/template/passwordreset.template');
const {
  PASSWORD_RESET_SUCCESS_TEMPLATE
} = require('../mail/template/successfulreset.template');

/**
 * @author Cyril ogoh <cyrilogoh@gmail.com>
 * @description Registeration using Form Input For `All Account Type`
 * @route `/auth/register`
 * @access Publication
 * @type POST
 */
exports.register = asyncHandler(async (req, res, next) => {
  try {
    if (!req.body.email || !req.body.password) {
      return next(new ErrorResponse('Email and password are required', 403));
    }
    if (!req.body.password) {
      return next(new ErrorResponse('Password Is Required', 403));
    }

    const email = req.body.email.toLowerCase();
    const username = req.body.username.toLowerCase();

    // Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(
        new ErrorResponse(
          'Email already exists. Please use a different email address',
          400
        )
      );
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('Generated OTP:', otp);
    // Check for spaces in username
    if (!username || username.includes(' ')) {
      return next(new ErrorResponse('Username cannot contain spaces', 400));
    }

    // Check if email exists and is verified
    const checkAccount = await User.findOne({
      email: email,
      _verify: true // Only block if account exists AND is verified
    });

    if (checkAccount) {
      return next(
        new ErrorResponse(
          'Email Address already exist And Verified, \n Please Login or Reset password if Forgotten',
          400
        )
      );
    }

    // Check if username exists
    const checkUser = await User.findOne({
      username: username
    });

    if (checkUser) {
      return next(
        new ErrorResponse(
          'Username already exist And Verified, \n Please Register or login',
          400
        )
      );
    }

    // Create new user (password will be hashed by schema middleware)
    const authProfile = await User.create({
      email,
      password: req.body.password, // Schema middleware will hash this
      name: req.body.name,
      username,
      device: req.body.device || null,
      Token: otp,
      TokenExpire: Date.now() + 10 * 60 * 1000
    });

    console.log('User created:', {
      email: authProfile.email,
      hashedPassword: authProfile.password
    });
    // Create an Wallet For Profile
    const wallet = await Wallet.create({
      _user: authProfile._id
    });

    authProfile._wallet = wallet._id;
    await authProfile.save();

    // Send OTP email
    await sendEmail({
      to: email,
      subject: 'One More Step, Verify Your Email',
      type: 'verification',
      message: {
        otp,
        name: req.body.name
      }
    });

    res.status(201).json({
      success: true,
      message: 'OTP Sent Successfully'
    });
  } catch (error) {
    console.error('Registration error:', error);
    next(error);
  }
});

/**
 * @author Cyril ogoh <cyrilogoh@gmail.com>
 * @description Resend verifcation OTP
 * @route `/auth/resend/signup/otp`
 * @access Public
 * @type POST
 */
exports.resendSignUp = asyncHandler(async (req, res, next) => {
  try {
    if (!req.body.email) {
      return next(new ErrorResponse('Email Address Is Required', 403));
    }
    const email = req.body.email.toLowerCase()
      ? req.body.email.toLowerCase()
      : '';

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // const otp = generateOTP(6);
    const checkAccount = await User.findOne({
      email: email
    });

    if (!checkAccount) {
      return next(
        new ErrorResponse('No Account Exist with Email, Signup Please', 404)
      );
    }

    if (checkAccount._verify) {
      return next(new ErrorResponse('Account is verified', 404));
    }
    // Create an Authication Profile
    await User.updateOne(
      {
        email: email
      },
      {
        Token: otp,
        TokenExpire: Date.now() + 10 * 60 * 1000
      }
    );
    // Send OTP
    sendEmail({
      to: email,
      subject: 'One More Step, Verify Your Email',
      type: 'verification',
      message: {
        otp: otp,
        name: req.body.name
      }
    });

    res.status(201).json({
      success: true,
      message: 'OTP Sent Successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @author Cyril ogoh <cyrilogoh@gmail.com>
 * @description Verify OTP
 * @route `/auth/login`
 * @access Public
 * @type POST
 */
exports.verifyOTP = asyncHandler(async (req, res, next) => {
  const { email, otp, username } = req.body;

  // Validate email & otp
  if (!email || !otp || !username) {
    return next(new ErrorResponse('Please provide an email and otp', 400));
  }

  // Check for user - find by both email and username
  const auth = await User.findOne({
    email: email.toLowerCase(),
    username: username.toLowerCase()
  }).select('+Token');

  if (!auth) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Add some debug logs
  console.log('Stored Token:', auth.Token);
  console.log('Received OTP:', otp);
  console.log('Token Expiry:', auth.TokenExpire);
  console.log('Current Time:', Date.now());

  // Generate unique account number
  let accountNumber;
  let isUnique = false;

  while (!isUnique) {
    const prefix = '25';
    const random = Math.floor(Math.random() * 100000000)
      .toString()
      .padStart(8, '0');
    accountNumber = prefix + random;

    // Check if account number already exists
    const existingUser = await User.findOne({ accountNumber });
    if (!existingUser) {
      isUnique = true;
    }
  }

  // Check if already verified
  if (auth._verify) {
    return next(new ErrorResponse('Account is already verified', 409));
  }

  // Check if otp matches
  if (auth.Token !== otp) {
    return next(new ErrorResponse('Invalid OTP', 400));
  }

  // Check if token has expired
  if (auth.TokenExpire < Date.now()) {
    return next(
      new ErrorResponse('OTP has expired, please request a new one', 400)
    );
  }

  // Update user verification status and add account number
  await User.updateOne(
    { email: email.toLowerCase() },
    {
      _verify: true,
      Token: null,
      TokenExpire: null,
      accountNumber: accountNumber,
      pinCreated: false // Add this flag to track PIN creation status
    }
  );

  // Send welcome email
  try {
    await Promise.all([
      sendEmail({
        to: email,
        subject: 'Welcome to Our Bank!',
        type: 'welcome',
        message: {
          name: auth.name,
          username: auth.username,
          accountNumber: accountNumber
        }
      })
    ]);
  } catch (error) {
    console.error('Email sending error:', error);
    // Continue even if welcome email fails
  }

  sendTokenResponse(auth, 200, res);
});

/**
 * @author Cyril ogoh <cyrilogoh@gmail.com>
 * @description Login using Form Input
 * @route `/auth/login`
 * @access Public
 * @type POST
 */
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password, device } = req.body;

  // Validate email & password
  if (!email || !password) {
    return next(new ErrorResponse('Please provide email and password', 400));
  }

  // Find user
  const auth = await User.findOne({ email: email.toLowerCase() })
    .select('+password')
    .populate('_wallet');

  if (!auth) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Compare password using schema method
  const isMatch = await auth.comparePassword(password);
  console.log('Password verification:', {
    email: auth.email,
    isMatch: isMatch
  });

  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Check verification
  if (!auth._verify) {
    return res.status(401).json({
      status: 'error',
      success: false,
      message: 'Email not verified',
      username: auth.username,
      email: auth.email
    });
  }

  if (device) {
    auth.device = device;
    await auth.save();
  }

  sendTokenResponse(auth, 200, res);
});

/**
 * @author Cyril ogoh <cyrilogoh@gmail.com>
 * @description Logout
 * @route `/auth/logout`
 * @access Public
 * @type GET
 */
exports.logout = asyncHandler(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// Get token from model, create cookie and send response
const sendTokenResponse = async (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res.status(statusCode).cookie('token', token, options).json({
    success: true,
    token,
    user: user
  });
};

/**
 * @author Cyril ogoh <cyrilogoh@gmail.com>
 * @description Check If Username is Avaliable
 * @route `/auth/username`
 * @access Public
 * @type POST
 */
exports.checkUsername = asyncHandler(async (req, res, next) => {
  const { username } = req.body;

  if (!username) {
    return next(new ErrorResponse('Please provide a valild Username', 400));
  }
  // Check for user
  const auth = await User.findOne({ username });

  if (auth) {
    return next(new ErrorResponse('A User With That Username Exist', 401));
  }

  res.status(200).json({
    status: 'success',
    success: true,
    message: 'All Good'
  });
});

/**
 * @author Cyril ogoh <cyrilogoh@gmail.com>
 * @description Forgot Password
 * @route `/auth/forgot-password`
 * @access Public
 * @type POST
 */
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  if (!req.body.email) {
    return next(new ErrorResponse('Email is Require, To Process', 400));
  }
  const auth = await User.findOne({ email: req.body.email.toLowerCase() });

  if (!auth) {
    return next(new ErrorResponse('There is no user with that email', 404));
  }

  // Get reset token
  const resetToken = '1234';
  auth.resetPasswordToken = resetToken;
  auth.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  try {
    await auth.save({ validateBeforeSave: false });
    sendEmail({
      to: req.body.email,
      subject: 'Reset Your Password',
      message: `${resetToken} this is your otp`
    });
    res.status(200).json({ success: true, data: 'Email sent successfully' });
  } catch (err) {
    console.log(err);
    auth.resetPasswordToken = undefined;
    auth.resetPasswordExpire = undefined;
    await auth.save({ validateBeforeSave: false });
    return next(new ErrorResponse('Something Went Wrong', 500));
  }
});

/**
 * @author Cyril ogoh <cyrilogoh@gmail.com>
 * @description Verify OTP For Password
 * @route `/auth/verify/password`
 * @access Public
 * @type POST
 */
exports.verifyPassReset = asyncHandler(async (req, res, next) => {
  const { email, otp } = req.body;

  // Validate email & password
  if (!email || !otp) {
    return next(new ErrorResponse('Please provide an email and otp', 400));
  }

  // Check for user
  const auth = await User.findOne({ email }).select('+resetPasswordToken');

  if (!auth) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }
  // Check if otp matches
  if (auth.resetPasswordToken !== otp) {
    return next(new ErrorResponse('OTP Is Wrong', 400));
  }
  if (auth.resetPasswordExpire < Date.now()) {
    return next(
      new ErrorResponse('Token Has Expired, Resend a New Token', 400)
    );
  } else {
    await User.updateOne(
      {
        email: email
      },
      {
        resetPasswordToken: null,
        resetPasswordExpire: null
      }
    );
    sendTokenResponse(auth, 200, res);
  }
});

/**
 * @author Cyril ogoh <cyrilogoh@gmail.com>
 * @description Reset Password
 * @route `/auth/reset-password`
 * @access Public
 * @type POST
 */
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const { password } = req.body;
  if (!req.user) {
    return next(new ErrorResponse(`Authoriztion token Is Required`, 401));
  }
  const user = await User.findOne({
    _id: req.user._id
  });

  if (!user) {
    return next(new ErrorResponse(`User does not exist`, 400));
  }

  if (password == '' || !password) {
    return next(new ErrorResponse(`Password Is Not Valid`, 400));
  }
  // Set new password
  user.password = password;
  await user.save({ validateBeforeSave: true });
  res.status(200).json({
    success: true,
    message: 'password Updated'
  });
});

/**
 * @description Create Transaction PIN
 * @route `/auth/create-pin`
 * @access Private (requires authentication)
 * @type POST
 */
exports.createPin = asyncHandler(async (req, res, next) => {
  const { pin, confirmPin } = req.body;

  // Validate PIN
  if (!pin || !confirmPin) {
    return next(new ErrorResponse('Please provide PIN and confirmation', 400));
  }

  if (pin !== confirmPin) {
    return next(new ErrorResponse('PINs do not match', 400));
  }

  if (pin.length !== 4 || !/^\d+$/.test(pin)) {
    return next(new ErrorResponse('Please provide a valid 4-digit PIN', 400));
  }

  // Get user
  const user = await User.findById(req.user._id);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  if (user.pinCreated) {
    return next(new ErrorResponse('PIN already created', 400));
  }

  // Update user with PIN
  user.pin = pin;
  user.pinCreated = true;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'PIN created successfully'
  });
});
