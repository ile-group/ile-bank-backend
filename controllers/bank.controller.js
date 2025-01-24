const { fetchRequest } = require('../utils/request.utils');
const { v4: uuidv4 } = require('uuid');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const User = require('../schema/user.schema');
const Wallet = require('../schema/wallet.schema');
const History = require('../schema/history.schema');
const { response } = require('express');
const { method } = require('lodash');
const sendEmail = require('../mail/index.mail');
const {
  TRANSFER_EMAIL_TEMPLATE
} = require('../mail/template/transaction.template');
const { DEPOSIT_EMAIL_TEMPLATE } = require('../mail/template/deposit.template');
const {
  WITHDRAWAL_EMAIL_TEMPLATE
} = require('../mail/template/withdraw.template');
const {
  BANK_SAVED_EMAIL_TEMPLATE
} = require('../mail/template/savings.template');
const Notification = require('../schema/notification.schema');
const mongoose = require('mongoose');
const axios = require('axios');
const crypto = require('crypto');
const Savings = require('../schema/savings.schema');
// uuidv4();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// Bank code constants
const BANK_CODES = {
  ILE_BANK: '311', // Custom code for our bank (starting with 31)
  // Add other bank codes as needed
  ACCESS_BANK: '044',
  GTB: '058',
  UBA: '033'
  // ... etc
};

// Function to check if it's an internal transfer
const isInternalTransfer = (accountNumber) => {
  return accountNumber.startsWith('25'); // ILE Bank accounts start with 25
};

exports.Banks_List = asyncHandler(async (req, res, next) => {
  try {
    const headers = {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json'
    };

    const response = await fetch('https://api.paystack.co/bank', {
      method: 'GET',
      headers: headers
    });

    const data = await response.json();

    res.status(200).json({
      success: true,
      status: 'success',
      data: data.data
    });
  } catch (error) {
    next(new ErrorResponse('Could not fetch banks', 500));
  }
});

// Verify bank account
exports.verifyAccount = asyncHandler(async (req, res, next) => {
  try {
    const { account_number, bank_code } = req.body;

    if (!account_number || !bank_code) {
      return next(
        new ErrorResponse('Please provide account number and bank code', 400)
      );
    }

    const headers = {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json'
    };

    const response = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
      {
        method: 'GET',
        headers: headers
      }
    );

    const data = await response.json();

    if (!data.status) {
      return next(new ErrorResponse('Could not verify account', 400));
    }

    res.status(200).json({
      success: true,
      status: 'success',
      data: data.data
    });
  } catch (error) {
    next(new ErrorResponse('Could not verify account', 500));
  }
});

exports.disburseToUser = asyncHandler(async (req, res, next) => {
  const { amount, account_number, bankname } = req.body;

  // Check if this is an internal transfer (ILE Bank account)
  if (isInternalTransfer(account_number)) {
    // Handle internal transfer logic
    // ... your existing internal transfer code ...
  } else {
    // Handle external bank transfer through Paystack
    const transferData = {
      source: 'balance',
      amount: amount * 100, // Convert to kobo
      recipient: account_number,
      bank_code: BANK_CODES[bankname],
      reason: 'Transfer from ILE Bank'
    };
    // ... external transfer logic ...
  }
});

exports.disburseToSavedUser = asyncHandler(async (req, res, next) => {
  try {
    const { amount } = req.body;

    if (isNaN(Number(amount))) {
      return next(new ErrorResponse('Invalid Amount', 400));
    }

    if (amount <= 0) {
      return next(new ErrorResponse('Invalid Amount', 400));
    }

    const wallet = await Wallet.findOne({ _id: req.user._wallet });

    if (!wallet) {
      return next(new ErrorResponse('Wallet Not Found, Contact Support', 404));
    }
    if (wallet.locked) {
      return next(new ErrorResponse('Account Is Locked, Contact Support', 403));
    }
    if (amount > wallet.amount) {
      return next(new ErrorResponse('Insufficient funds', 400));
    }

    if (!req.user.accountnumber || !req.user.bankcode) {
      return next(
        new ErrorResponse('Please add your bank details in Profile', 404)
      );
    }

    // Create transfer recipient
    const recipientResponse = await fetch(
      'https://api.paystack.co/transferrecipient',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'nuban',
          name: req.user.name,
          account_number: req.user.accountnumber,
          bank_code: req.user.bankcode,
          currency: 'NGN'
        })
      }
    );

    const recipientData = await recipientResponse.json();

    if (!recipientData.status) {
      return next(
        new ErrorResponse('Could not create transfer recipient', 400)
      );
    }

    // Rest of the function remains similar to disburseToUser
    // ... (same transfer and wallet update logic)
  } catch (error) {
    next(error);
  }

  await sendEmail({
    to: req.user.email,
    subject: 'Bank Account Added',
    type: 'bankSaved',
    message: {
      name: req.user.name,
      bankName: req.body.bankname,
      accountNumber: req.body.accountnumber
    }
  });
});

/**
 * @author Cyril ogoh <cyrilogoh@gmail.com>
 * @description Update User Bank
 * @route `/bank/save`
 * @access Private
 * @type POST
 */
exports.updateBank = asyncHandler(async (req, res, next) => {
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

/**
 * @author Cyril ogoh <cyrilogoh@gmail.com>
 * @description Get User Bank Detail
 * @route `/bank/save`
 * @access Public
 * @type Get
 */
exports.userBank = asyncHandler(async (req, res, next) => {
  const data = {
    bankname: req.user.bankname,
    bankcode: req.user.bankcode,
    accountname: req.user.accountname,
    accountnumber: req.user.accountnumber
  };
  res.status(200).json({
    success: true,
    status: 'success',
    data
  });
});

exports.postUserBank = asyncHandler(async (req, res, next) => {
  const data = {
    bankname: req.body.bankname,
    bankcode: req.body.bankcode,
    accountname: req.body.accountname,
    accountnumber: req.body.accountnumber
  };

  // Verify account before saving
  const verifyResponse = await fetch(
    `https://api.paystack.co/bank/resolve?account_number=${data.accountnumber}&bank_code=${data.bankcode}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const verifyData = await verifyResponse.json();

  if (!verifyData.status) {
    return next(new ErrorResponse('Could not verify bank account', 400));
  }

  // Update user's bank details
  await User.updateOne({ _id: req.user._id }, data, { runValidators: true });

  res.status(200).json({
    success: true,
    status: 'success',
    data
  });
});

// Add this route to check wallet balance
exports.checkBalance = asyncHandler(async (req, res, next) => {
  const wallet = await Wallet.findOne({ _id: req.user._wallet });

  if (!wallet) {
    return next(new ErrorResponse('Wallet not found', 404));
  }

  res.status(200).json({
    success: true,
    balance: wallet.amount,
    locked: wallet.locked
  });
});

exports.PayStack = asyncHandler(async (req, res, next) => {
  const payload = req.body;

  const user = await User.findOne({ _id: payload.data.metadata.uid });

  if (payload.event == 'charge.success') {
    const trans = {
      _user: user._id,
      _wallet: user._wallet,
      amount: payload.data.amount / 100,
      status: 'Completed',
      date: Date.now(),
      from: 'Paystack',
      initor: 'Deposit',
      reference: payload.data.reference,
      detail: 'Paystack',
      bank: {
        name: 'server'
      }
    };

    let amount = payload.data.amount / 100;

    await Wallet.findOneAndUpdate(
      { _id: user._wallet },
      {
        $inc: { amount: 1 * amount },
        $inc: { inflow: 1 * amount }
      },
      { new: true, runValidators: true }
    );

    await History.create(trans);
  }

  res.status(201).end();
});

// Initialize deposit
exports.initializeDeposit = asyncHandler(async (req, res, next) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return next(new ErrorResponse('Please provide a valid amount', 400));
  }

  try {
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: req.user.email,
        amount: amount * 100, // Convert to kobo
        callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
        metadata: {
          user_id: req.user._id,
          wallet_id: req.user._wallet
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Create pending transaction record
    await History.create({
      _user: req.user._id,
      _wallet: req.user._wallet,
      amount: amount,
      status: 'Pending',
      date: Date.now(),
      from: 'Deposit',
      initor: 'Credit',
      reference: response.data.data.reference,
      detail: 'Wallet Funding',
      bank: {
        name: 'Paystack'
      }
    });

    res.status(200).json({
      success: true,
      data: {
        authorization_url: response.data.data.authorization_url,
        reference: response.data.data.reference
      }
    });
  } catch (error) {
    next(new ErrorResponse('Payment initialization failed', 500));
  }
});

// Webhook to handle successful deposits
exports.paystackWebhook = asyncHandler(async (req, res, next) => {
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(400).json({ status: 'invalid signature' });
  }

  const { event, data } = req.body;

  if (event === 'charge.success') {
    const { metadata, amount, reference } = data;
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        // Update user's wallet
        const updatedWallet = await Wallet.findByIdAndUpdate(
          metadata.wallet_id,
          {
            $inc: {
              amount: amount / 100,
              inflow: amount / 100
            }
          },
          { new: true, session }
        );

        // Update transaction history
        await History.findOneAndUpdate(
          { reference: reference },
          {
            status: 'Completed',
            date: Date.now()
          },
          { session }
        );

        // Send email notification
        const user = await User.findById(metadata.user_id);
        await sendEmail({
          to: user.email,
          subject: 'Deposit Successful',
          type: 'deposit',
          message: {
            name: user.name,
            amount: amount / 100,
            reference: reference,
            date: new Date()
          }
        });

        // Create notification
        await Notification.create(
          [
            {
              _user: metadata.user_id,
              title: 'Deposit Successful',
              message: `Your account has been credited with ₦${(
                amount / 100
              ).toLocaleString()}`,
              action: 'deposit',
              target: reference,
              view: false
            }
          ],
          { session }
        );
      });

      res.status(200).json({ status: 'success' });
    } catch (error) {
      console.error('Deposit processing error:', error);
      res.status(500).json({ status: 'error' });
    } finally {
      session.endSession();
    }
  }
});

// Transfer to another user using username or account number
exports.transferToUser = asyncHandler(async (req, res, next) => {
  const { amount, recipient, type } = req.body;
  console.log('Transfer request:', { amount, recipient, type });

  if (!amount || amount <= 0) {
    return next(new ErrorResponse('Please provide a valid amount', 400));
  }

  if (!recipient) {
    return next(
      new ErrorResponse(
        'Please provide recipient username or account number',
        400
      )
    );
  }

  // Find recipient based on type
  let recipientUser;
  if (type === 'accountNumber') {
    console.log('Searching by account number:', recipient);
    recipientUser = await User.findOne({ accountNumber: recipient });
    console.log('Found recipient:', recipientUser);
  } else if (type === 'username') {
    recipientUser = await User.findOne({ username: recipient.toLowerCase() });
  } else {
    return next(
      new ErrorResponse(
        'Invalid transfer type. Use "accountNumber" or "username"',
        400
      )
    );
  }

  if (!recipientUser) {
    return next(new ErrorResponse('Recipient not found', 404));
  }

  // Can't transfer to self
  if (recipientUser._id.toString() === req.user._id.toString()) {
    return next(new ErrorResponse('Cannot transfer to yourself', 400));
  }

  const senderWallet = await Wallet.findOne({ _id: req.user._wallet });
  if (!senderWallet || senderWallet.amount < amount) {
    return next(new ErrorResponse('Insufficient funds', 400));
  }

  const recipientWallet = await Wallet.findOne({ _id: recipientUser._wallet });
  if (!recipientWallet) {
    return next(new ErrorResponse('Recipient wallet not found', 404));
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // Update sender's wallet
      const updatedSenderWallet = await Wallet.findOneAndUpdate(
        { _id: req.user._wallet },
        { $inc: { amount: -amount } },
        { new: true, session }
      );

      // Update recipient's wallet
      const updatedRecipientWallet = await Wallet.findOneAndUpdate(
        { _id: recipientUser._wallet },
        { $inc: { amount: amount } },
        { new: true, session }
      );

      const transactionDate = new Date();
      const reference = `TRF-${Date.now()}`;

      // Create transaction histories with initor field
      await History.create(
        [
          {
            _user: req.user._id,
            _wallet: req.user._wallet,
            amount,
            type: 'debit',
            status: 'Completed',
            date: transactionDate,
            from: 'Transfer',
            detail: `Transfer to ${
              recipientUser.username || recipientUser.accountnumber
            }`,
            reference,
            bank: { name: 'ILE Bank' },
            initor: req.user._id // Add initor field
          },
          {
            _user: recipientUser._id,
            _wallet: recipientUser._wallet,
            amount,
            type: 'credit',
            status: 'Completed',
            date: transactionDate,
            from: 'Transfer',
            detail: `Transfer from ${
              req.user.username || req.user.accountnumber
            }`,
            reference,
            bank: { name: 'ILE Bank' },
            initor: req.user._id // Add initor field
          }
        ],
        { session }
      );

      // Send notifications
      await Promise.all([
        sendEmail({
          to: req.user.email,
          subject: 'Debit Alert',
          type: 'withdrawal',
          message: {
            name: req.user.name,
            amount: amount,
            accountNumber: recipientUser.accountNumber,
            bankName: 'ILE Bank',
            reference: reference,
            date: transactionDate,
            recipientName:
              recipientUser.username || recipientUser.accountnumber,
            reference,
            date: transactionDate
          }
        }),
        sendEmail({
          to: recipientUser.email,
          subject: 'Credit Alert',
          type: 'transfer',
          message: {
            name: recipientUser.name,
            amount: amount,
            accountNumber: req.user.accountNumber,
            bankName: 'ILE Bank',
            reference: reference,
            date: transactionDate,

            senderName: req.user.username || req.user.accountnumber,
            reference,
            date: transactionDate
          }
        })
      ]);
      // Create in-app notifications
      await Notification.create(
        [
          {
            _user: req.user._id,
            title: 'Transfer Sent',
            message: `You sent ₦${amount.toLocaleString()} to ${
              recipientUser.name
            }`,
            action: 'transfer',
            target: reference,
            view: false
          },
          {
            _user: recipientUser._id,
            title: 'Transfer Received',
            message: `You received ₦${amount.toLocaleString()} from ${
              req.user.name
            }`,
            action: 'transfer',
            target: reference,
            view: false
          }
        ],
        { session }
      );

      res.status(200).json({
        success: true,
        message: 'Transfer successful',
        data: {
          amount,
          recipient: recipientUser.username || recipientUser.accountnumber,
          reference,
          newBalance: updatedSenderWallet.amount
        }
      });
    });
  } catch (error) {
    next(error);
  } finally {
    session.endSession();
  }
});

// Simulate deposit (for testing purposes)
exports.simulateDeposit = asyncHandler(async (req, res, next) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return next(new ErrorResponse('Please provide a valid amount', 400));
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const reference = `DEP-${Date.now()}`;
      const transactionDate = new Date();

      // Update wallet
      const updatedWallet = await Wallet.findOneAndUpdate(
        { _id: req.user._wallet },
        {
          $inc: {
            amount: amount,
            inflow: amount
          }
        },
        { new: true, session }
      );

      // Create transaction history
      await History.create(
        [
          {
            _user: req.user._id,
            _wallet: req.user._wallet,
            amount,
            status: 'Completed',
            date: transactionDate,
            from: 'Deposit',
            initor: 'Credit',
            reference,
            detail: 'Wallet Funding',
            bank: { name: 'Test Bank' }
          }
        ],
        { session }
      );

      // Send email notification
      await sendEmail({
        to: req.user.email,
        subject: 'Deposit Successful',
        type: 'deposit',
        message: {
          name: req.user.name,
          amount: amount,
          reference: reference,
          date: transactionDate
        }
      });

      // Create in-app notification
      await Notification.create(
        [
          {
            _user: req.user._id,
            title: 'Deposit Successful',
            message: `Your account has been credited with ₦${amount.toLocaleString()}`,
            action: 'deposit',
            target: reference,
            view: false
          }
        ],
        { session }
      );

      res.status(200).json({
        success: true,
        message: 'Deposit successful',
        data: {
          reference,
          amount,
          newBalance: updatedWallet.amount
        }
      });
    });
  } catch (error) {
    next(error);
  } finally {
    session.endSession();
  }
});

exports.savingsLock = asyncHandler(async (req, res, next) => {
  const { amount, duration } = req.body;

  if (!amount || amount <= 0) {
    return next(new ErrorResponse('Please provide a valid amount', 400));
  }

  const validDurations = [
    '7days',
    '14days',
    '21days',
    '30days',
    '3months',
    '6months',
    '12months'
  ];
  if (!duration || !validDurations.includes(duration)) {
    return next(new ErrorResponse('Please provide a valid duration', 400));
  }

  const wallet = await Wallet.findOne({ _id: req.user._wallet });
  if (!wallet || wallet.amount < amount) {
    return next(new ErrorResponse('Insufficient funds', 400));
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // Create savings record
      const savings = await Savings.create(
        [
          {
            _user: req.user._id,
            _wallet: req.user._wallet,
            amount: amount,
            duration: duration,
            status: 'active'
          }
        ],
        { session }
      );

      // Update wallet balance
      await Wallet.findOneAndUpdate(
        { _id: req.user._wallet },
        {
          $set: { amount: wallet.amount - amount }
        },
        { session }
      );

      // Create transaction history
      await History.create(
        [
          {
            _user: req.user._id,
            _wallet: req.user._wallet,
            amount: amount,
            date: new Date(),
            status: 'Completed',
            from: 'Savings',
            initor: 'Lock',
            reference: `SAV-${Date.now()}`,
            detail: `${duration} savings lock`,
            bank: { name: 'ILE Bank' }
          }
        ],
        { session }
      );

      // Create notification
      await Notification.create(
        [
          {
            _user: req.user._id,
            title: 'Savings Lock Created',
            message: `You have successfully locked ₦${amount.toLocaleString()} for ${duration}`,
            action: 'savings',
            target: savings[0]._id,
            view: false
          }
        ],
        { session }
      );

      // Send email notification
      await sendEmail({
        to: req.user.email,
        subject: 'Savings Created',
        type: 'bankSaved',
        message: {
          name: req.user.name,
          amount: amount,
          duration: duration
        }
      });

      res.status(200).json({
        success: true,
        message: 'Savings created successfully',
        data: {
          savingsId: savings[0]._id,
          amount,
          duration,
          startDate: savings[0].startDate,
          newBalance: wallet.amount - amount
        }
      });
    });
  } catch (error) {
    next(error);
  } finally {
    session.endSession();
  }
});

exports.breakSavings = asyncHandler(async (req, res, next) => {
  const { savingsId } = req.body;

  if (!savingsId) {
    return next(new ErrorResponse('Please provide savings ID', 400));
  }

  // Find the savings record from History
  const savingsHistory = await History.findOne({
    _id: savingsId,
    _user: req.user._id,
    from: 'Savings',
    initor: 'Lock'
  });

  if (!savingsHistory) {
    return next(new ErrorResponse('Savings record not found', 404));
  }

  const wallet = await Wallet.findOne({ _id: req.user._wallet });

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // Calculate penalty (2% of savings amount)
      const penaltyRate = 0.02;
      const savingsAmount = Number(savingsHistory.amount); // Convert to number
      const penaltyAmount = savingsAmount * penaltyRate;
      const amountAfterPenalty = savingsAmount - penaltyAmount;

      // Update wallet
      const updatedWallet = await Wallet.findOneAndUpdate(
        { _id: req.user._wallet },
        {
          $inc: { amount: amountAfterPenalty }
        },
        { new: true, session }
      );

      // Create break transaction history
      await History.create(
        [
          {
            _user: req.user._id,
            _wallet: req.user._wallet,
            amount: savingsAmount,
            status: 'Completed',
            date: Date.now(),
            from: 'Savings',
            initor: 'Break',
            reference: `BRK-${Date.now()}`,
            detail: `Early savings break with ${penaltyRate * 100}% penalty`,
            bank: { name: 'ILE Bank' }
          }
        ],
        { session }
      );

      // Send email notification
      await sendEmail({
        to: req.user.email,
        subject: 'Savings Broken',
        type: 'savingsBreak',
        message: {
          name: req.user.name,
          amount: savingsAmount,
          penaltyAmount: penaltyAmount,
          finalAmount: amountAfterPenalty
        }
      });

      res.status(200).json({
        success: true,
        message: 'Savings broken successfully',
        data: {
          originalAmount: savingsAmount,
          penaltyAmount,
          amountReceived: amountAfterPenalty,
          newBalance: updatedWallet.amount
        }
      });
    });
  } catch (error) {
    next(error);
  } finally {
    session.endSession();
  }
});

exports.getSavings = asyncHandler(async (req, res, next) => {
  const wallet = await Wallet.findOne({ _id: req.user._wallet });

  // Get savings history
  const savingsHistory = await History.find({
    _user: req.user._id,
    from: 'Savings',
    initor: 'Lock'
  }).sort({ date: -1 }); // Most recent first

  res.status(200).json({
    success: true,
    data: {
      totalSavings: wallet.savings,
      savingsHistory
    }
  });
});
