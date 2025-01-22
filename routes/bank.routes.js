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
  initializeDeposit,
  transferToUser,
  paystackWebhook,
  simulateDeposit,
  savingsLock,
  getSavings,
  breakSavings
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
router.post('/transfer-internal', transferToUser);

// Deposit
router.post('/deposit/initialize', initializeDeposit);
router.post('/webhook/paystack', paystackWebhook);

router.post('/simulate-deposit', simulateDeposit);
router.post('/savings-lock', savingsLock);
router.post('/break-savings', breakSavings);
router.get('/savings', getSavings);

module.exports = router;
