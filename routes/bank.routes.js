const express = require('express');
const router = express.Router();
const {
  Banks_List,
  verifyAccount,
  disburseToUser,
  disburseToSavedUser,
  userBank,
  postUserBank,
  PayStack,
  checkBalance,
  initializeDeposit
} = require('../controllers/bank.controller');
const { protect } = require('../guard/protect.guard');

// Protect all routes
router.use(protect);

// Bank listing and verification
router.get('/', Banks_List);
router.post('/verify', verifyAccount);

// Transfer routes
router.post('/transfer', disburseToUser);
router.post('/withdraw', disburseToSavedUser);

// Bank account management
router.get('/save', userBank);
router.post('/save', postUserBank);

// Webhook
router.post('/webhook/paystack', PayStack);

// Balance
router.get('/balance', checkBalance);

// Deposit
router.post('/deposit/initialize', initializeDeposit);
module.exports = router;
