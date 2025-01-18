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
const { TRANSFER_EMAIL_TEMPLATE } = require('../mail/template/transaction.template');
const { DEPOSIT_EMAIL_TEMPLATE } = require('../mail/template/deposit.template');
const { WITHDRAWAL_EMAIL_TEMPLATE } = require('../mail/template/withdraw.template');
const { BANK_SAVED_EMAIL_TEMPLATE } = require('../mail/template/savings.template');
// uuidv4();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

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
  try {
    const { amount, account_number, bank_code } = req.body;

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
          account_number: account_number,
          bank_code: bank_code,
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

    // Initiate transfer
    const transferResponse = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: 'balance',
        amount: amount * 100, // Paystack expects amount in kobo
        recipient: recipientData.data.recipient_code,
        reason: `Transfer from ${req.user.name}`
      })
    });

    const transferData = await transferResponse.json();

    if (!transferData.status) {
      return next(new ErrorResponse('Could not complete transfer', 500));
    }

    // Update wallet and create transaction history
    try {
      const trans = {
        _user: req.user._id,
        _wallet: req.user._wallet,
        amount: amount,
        status: 'Completed',
        date: Date.now(),
        from: 'Paystack',
        initor: 'Withdrawal',
        reference: transferData.data.reference,
        detail: 'Withdrawal via Paystack',
        bank: {
          name: req.user.name,
          bank: bank_code,
          number: account_number
        }
      };

      await Wallet.findOneAndUpdate(
        { _id: req.user._wallet },
        {
          $inc: { amount: -1 * amount },
          $inc: { outflow: 1 * amount }
        },
        { new: true, runValidators: true }
      );

      await History.create(trans);
    } catch (error) {
      await Wallet.updateOne({ _id: req.user._wallet }, { locked: true });
      return next(
        new ErrorResponse(
          'Critical Error -- Withdrawal successful but failed to update records',
          500
        )
      );
    }

    res.status(200).json({
      success: true,
      status: 'success',
      data: transferData.data
    });
  } catch (error) {
    next(error);
  }

    await sendEmail({
      to: req.user.email,
      subject: 'Transfer Successful',
      type: 'transfer',
      message: {
        name: req.user.name,
        amount: amount,
        accountNumber: account_number,
        bankName: bankname
      }
    });
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

/**
 * @author Cyril ogoh <cyrilogoh@gmail.com>
 * @description Update User Bank Detail
 * @route `/bank/save`
 * @access Public
 * @type POST
 */
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
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return next(new ErrorResponse('Please provide a valid amount', 400));
    }

    // Initialize transaction with Paystack
    const response = await fetch(
      'https://api.paystack.co/transaction/initialize',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: req.user.email,
          amount: amount * 100, // Convert to kobo
          callback_url: `${process.env.FRONTEND_URL}/deposit/callback`,
          metadata: {
            uid: req.user._id
          }
        })
      }
    );

    const data = await response.json();

    if (!data.status) {
      return next(new ErrorResponse('Could not initialize deposit', 400));
    }

    res.status(200).json({
      success: true,
      status: 'success',
      data: {
        authorization_url: data.data.authorization_url,
        reference: data.data.reference
      }
    });
  } catch (error) {
    next(error);
  }

  await sendEmail({
    to: user.email,
    subject: 'Deposit Successful',
    type: 'deposit',
    message: {
      name: user.name,
      amount: amount,
      reference: payload.data.reference
    }
  });
});

