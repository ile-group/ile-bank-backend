const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  resendSignUp,
  verifyOTP,
  verifyPassReset,
  checkUsername,
  createPin
} = require('../controllers/auth.controller');
const { protect } = require('../guard/protect.guard');
router.post('/register', register);
router.get('/logout', logout);
router.post('/verify/email/send', resendSignUp);
router.post('/verify/otp', verifyOTP);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password', protect, resetPassword);
router.post('/verify/password', verifyPassReset);
router.post('/login', login);
router.post('/username', checkUsername);
router.post('/resend/signup/otp', resendSignUp);
router.post('/create-pin', protect, createPin);
module.exports = router;
