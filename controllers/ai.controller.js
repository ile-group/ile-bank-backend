const fs = require('fs').promises;
const path = require('path');
const History = require('../schema/history.schema');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const axios = require('axios');
const CustomerCare = require('../schema/customercare.schema');
const Notification = require('../schema/notification.schema');
const User = require('../schema/user.schema');
const schedule = require('node-schedule');
const { internalTransfer } = require('./bank.controller'); // Import the existing transfer function
const Wallet = require('../schema/wallet.schema');
const bcryptjs = require('bcryptjs');

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Helper function to delay execution
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Function to send data to model
async function sendToModel(data, endpoint = 'predict') {
  try {
    const response = await axios.post(
      `http://192.168.43.224:5000/query`,
      {
        query: data
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error sending to model:', error);
    throw error;
  }
}

// Function to send transaction log with retry
async function sendTransactionLog(data, retries = MAX_RETRIES) {
  try {
    console.log('Attempting to send log to model server...');
    const response = await axios.post(
      `http://192.168.43.224:5000/getTransactionLog`,
      {
        query: data
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000 // 5 second timeout
      }
    );
    console.log('Log sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error(
      `Error sending transaction log (attempt ${MAX_RETRIES - retries + 1}):`,
      error.message
    );

    if (retries > 1) {
      console.log(`Retrying in ${RETRY_DELAY / 1000} seconds...`);
      await delay(RETRY_DELAY);
      return sendTransactionLog(data, retries - 1);
    }
    throw new Error(
      `Failed to send transaction log after ${MAX_RETRIES} attempts`
    );
  }
}

// Function to get analysis from model
async function getAnalysisFromModel() {
  try {
    console.log('\n=== GETTING ANALYSIS ===');
    console.log('Time:', new Date().toISOString());

    const response = await axios.post(
      `http://192.168.43.224:5000/sendAnalysis`,
      {}, // empty body since the endpoint reads from file
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('Raw response:', response.data);

    if (response.data && response.data.success && response.data.analysis) {
      console.log('Analysis received successfully');
      return response.data.analysis;
    } else {
      console.error('Invalid response format:', response.data);
      throw new Error('Invalid analysis response format');
    }
  } catch (error) {
    console.error('\n=== ANALYSIS ERROR ===');
    console.error('Error message:', error.message);
    console.error('Response status:', error.response?.status);
    console.error('Response data:', error.response?.data);
    throw error;
  }
}

// Function to fetch and send notifications (runs every 3 minutes)
async function fetchAndSendNotifications() {
  try {
    console.log('\n=== STARTING AUTOMATED CHECK ===');
    console.log('Time:', new Date().toISOString());

    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users to process`);

    for (const user of users) {
      try {
        // Get user's notifications
        const notifications = await Notification.find({ _user: user._id })
          .sort('-createdAt')
          .limit(20);

        console.log(
          `User ${user._id}: Found ${notifications.length} notifications`
        );

        if (notifications.length) {
          // Format notifications for AI
          const formattedData = `
=== USER NOTIFICATIONS LOG ===
User ID: ${user._id}
Date: ${new Date().toISOString()}

NOTIFICATIONS:
${notifications
  .map(
    (n) => `
Title: ${n.title}
Message: ${n.message}
Action: ${n.action}
Date: ${n.createdAt}
`
  )
  .join('\n')}
=== END NOTIFICATIONS LOG ===
`;

          // First POST the transaction log
          await sendTransactionLog(formattedData);
          console.log(`Successfully sent notifications for user: ${user._id}`);

          // Wait for 1 minute
          console.log('Waiting 1 minute before getting analysis...');
          await delay(60000); // 60000 ms = 1 minute

          // Then GET the analysis with better error handling
          try {
            const analysis = await getAnalysisFromModel();
            console.log('Analysis content:', analysis); // Log the actual analysis

            // Save analysis to user
            user.lastAnalysis = analysis;
            await user.save();
            console.log(`Saved analysis for user: ${user._id}`);
          } catch (analysisError) {
            console.error('Analysis failed:', {
              userId: user._id,
              error: analysisError.message,
              time: new Date().toISOString()
            });
          }
        }
      } catch (userError) {
        console.error(`Error processing user ${user._id}:`, userError.message);
        continue;
      }
    }
    console.log('\n=== COMPLETED AUTOMATED CHECK ===\n');
  } catch (error) {
    console.error('Error in automated process:', error);
  }
}

// Schedule to run every 5 minutes
schedule.scheduleJob('*/5 * * * *', fetchAndSendNotifications);

// Changed from getSavingsAdvice to getNotifications
exports.getNotifications = asyncHandler(async (req, res, next) => {
  try {
    // Get user's notifications
    const notifications = await Notification.find({ _user: req.user._id })
      .sort('-createdAt')
      .limit(20);

    if (!notifications.length) {
      return next(new ErrorResponse('No notifications found', 404));
    }

    console.log('Found notifications:', notifications.length);

    // Format notifications for AI
    const formattedData = `
=== USER NOTIFICATIONS LOG ===
User ID: ${req.user._id}
Date: ${new Date().toISOString()}

NOTIFICATIONS:
${notifications
  .map(
    (n) => `
Title: ${n.title}
Message: ${n.message}
Action: ${n.action}
Date: ${n.createdAt}
`
  )
  .join('\n')}
=== END NOTIFICATIONS LOG ===
`;

    console.log('Sending notifications to model:', formattedData);

    // Send to transaction log endpoint
    const logResponse = await sendTransactionLog(formattedData);
    console.log('Log response:', logResponse);

    // Continue with normal query if needed
    const modelResponse = await sendToModel(formattedData);

    res.status(200).json({
      success: true,
      data: modelResponse
    });
  } catch (error) {
    console.error('Error:', error);
    next(error);
  }
});

// 2. Analytics
exports.getAnalytics = asyncHandler(async (req, res, next) => {
  try {
    const transactions = await History.find({ _user: req.user._id })
      .sort('-createdAt')
      .limit(100);

    if (!transactions.length) {
      return next(new ErrorResponse('No transaction history found', 404));
    }

    // Format for analytics
    const formattedData = {
      transactions: transactions.map((t) => ({
        date: t.date,
        type: t.type,
        amount: t.amount,
        category: t.detail
      }))
    };

    // Save to file
    const logsDir = path.join(__dirname, '../logs');
    await fs.mkdir(logsDir, { recursive: true });
    const filepath = path.join(
      logsDir,
      `analytics_${req.user._id}_${Date.now()}.txt`
    );
    await fs.writeFile(filepath, JSON.stringify(formattedData, null, 2));

    // Send to model
    const fileContent = await fs.readFile(filepath, 'utf8');
    const modelResponse = await sendToModel(fileContent, 'analytics');

    res.status(200).json({
      success: true,
      data: modelResponse
    });
  } catch (error) {
    next(error);
  }
});

// 3. Chat AI
exports.aiChat = asyncHandler(async (req, res, next) => {
  const { message, pin } = req.body;

  if (!message && !pin) {
    return next(new ErrorResponse('Please provide a message or PIN', 400));
  }

  try {
    console.log('Finding user with ID:', req.user._id);
    const user = await User.findById(req.user._id);
    if (!user) {
      console.log('User not found:', req.user._id);
      return next(new ErrorResponse('User not found', 404));
    }
    console.log('User found:', user._id);

    // Initialize chatHistory if it doesn't exist
    if (!user.chatHistory) {
      console.log('Initializing chat history array');
      user.chatHistory = [];
    }

    // If PIN is provided, handle transfer completion
    if (pin) {
      const pendingTransfer = pendingTransfers.get(req.user._id.toString());
      if (!pendingTransfer) {
        return res.status(400).json({
          success: false,
          message: 'No pending transfer found. Please initiate a new transfer.'
        });
      }

      const result = await completeTransfer(pin, req, res, next);
      if (!result.handled) {
        res.status(result.success ? 200 : 400).json(result);
      }
      return;
    }

    // Handle message (transfer or chat)
    const transferRegex =
      /(?:hi\s+)?(?:send|transfer)\s+(?:₦|N)?(\d+(?:,\d+)?)\s+to\s+(\w+)/i;
    const match = message.match(transferRegex);

    if (match) {
      // Handle as transfer
      const result = await handleInitialTransfer(message, req);

      // Save transfer request to chat history
      user.chatHistory.push({
        role: 'user',
        content: message,
        timestamp: new Date()
      });

      user.chatHistory.push({
        role: 'assistant',
        content: result.message,
        timestamp: new Date()
      });

      await user.save();

      return res.status(result.success ? 200 : 400).json({
        success: result.success,
        message: result.message,
        requirePin: result.requirePin,
        isTransfer: true
      });
    } else {
      // Handle regular chat with your existing model
      const aiResponse = await sendToModel(message);

      // Ensure aiResponse is a string
      const responseText =
        typeof aiResponse === 'object'
          ? aiResponse.response || JSON.stringify(aiResponse)
          : aiResponse.toString();

      // Save chat to history
      user.chatHistory.push({
        role: 'user',
        content: message,
        timestamp: new Date()
      });

      user.chatHistory.push({
        role: 'assistant',
        content: responseText,
        timestamp: new Date()
      });

      await user.save();

      return res.status(200).json({
        success: true,
        message: responseText,
        isTransfer: false
      });
    }
  } catch (error) {
    console.error('Chat Error:', error);
    next(error);
  }
});

// Get chat history - show all messages
exports.getChatHistory = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  // Get all chat history in reverse order (newest first)
  const chatHistory = user.chatHistory.slice().reverse();

  res.status(200).json({
    success: true,
    data: {
      chatHistory,
      totalMessages: chatHistory.length
    }
  });
});

// Simple route handler for testing
exports.getAnalysis = asyncHandler(async (req, res, next) => {
  try {
    const analysis = await getAnalysisFromModel();

    res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Store pending transfers
const pendingTransfers = new Map();

// Function to handle initial transfer command
async function handleInitialTransfer(message, req) {
  try {
    const transferRegex =
      /(?:hi\s+)?(?:send|transfer)\s+(?:₦|N)?(\d+(?:,\d+)?)\s+to\s+(\w+)/i;
    const match = message.match(transferRegex);

    if (!match) {
      return {
        success: false,
        message:
          "Invalid transfer format. Please use format: 'send 2,000 to username'"
      };
    }

    // Extract amount and recipient name
    let [, amount, recipient] = match;
    amount = parseFloat(amount.replace(/,/g, '')); // Remove commas from amount
    recipient = recipient.toLowerCase();

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      return {
        success: false,
        message: 'Please specify a valid amount'
      };
    }

    // Check if recipient exists
    const recipientUser = await User.findOne({ username: recipient });
    if (!recipientUser) {
      return {
        success: false,
        message: `User '${recipient}' not found. Please check the username and try again.`
      };
    }

    // Get sender's full user object
    const senderUser = await User.findById(req.user._id);
    if (!senderUser) {
      return {
        success: false,
        message: 'Sender account not found'
      };
    }

    // Prevent self-transfer
    if (senderUser._id.toString() === recipientUser._id.toString()) {
      return {
        success: false,
        message: 'You cannot transfer money to yourself'
      };
    }

    // Check sender's balance
    const senderWallet = await Wallet.findOne({ _id: senderUser._wallet });
    if (!senderWallet || senderWallet.amount < amount) {
      return {
        success: false,
        message: `Insufficient balance. Your current balance is ₦${
          senderWallet ? senderWallet.amount : 0
        }`
      };
    }

    // Store the pending transfer
    pendingTransfers.set(senderUser._id.toString(), {
      amount,
      recipient,
      recipientId: recipientUser._id,
      timestamp: Date.now()
    });

    return {
      success: true,
      message: `Transfer ₦${amount.toLocaleString()} to ${recipient}. Please enter your transaction PIN to complete the transfer.`,
      requirePin: true
    };
  } catch (error) {
    console.error('Initial Transfer Error:', error);
    return {
      success: false,
      message:
        error.message ||
        'An error occurred while processing the transfer request'
    };
  }
}

// Function to complete transfer with PIN
async function completeTransfer(pin, req, res, next) {
  try {
    const pendingTransfer = pendingTransfers.get(req.user._id.toString());

    if (!pendingTransfer) {
      return {
        success: false,
        message: 'No pending transfer found. Please initiate a new transfer.'
      };
    }

    // Check if the pending transfer is expired (5 minutes)
    if (Date.now() - pendingTransfer.timestamp > 5 * 60 * 1000) {
      pendingTransfers.delete(req.user._id.toString());
      return {
        success: false,
        message: 'Transfer request expired. Please initiate a new transfer.'
      };
    }

    // Verify PIN
    const user = await User.findById(req.user._id).select('+pin');
    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Check if PIN is set
    if (!user.pin) {
      return {
        success: false,
        message:
          'Transaction PIN not set. Please set your transaction PIN in your profile settings before making transfers.'
      };
    }

    // Find recipient user
    const recipientUser = await User.findOne({
      username: pendingTransfer.recipient
    });
    if (!recipientUser) {
      return {
        success: false,
        message: 'Recipient not found'
      };
    }

    // Set up transfer request
    req.body = {
      amount: pendingTransfer.amount,
      recipient: pendingTransfer.recipient,
      type: 'username'
    };

    // Clean up pending transfer
    pendingTransfers.delete(req.user._id.toString());

    // Create reference
    const reference = `TRF-${Date.now()}`;

    // Create notifications
    await Notification.create([
      {
        _user: req.user._id,
        title: 'Transfer Sent',
        message: `You sent ₦${pendingTransfer.amount.toLocaleString()} to ${
          recipientUser.name
        }`,
        action: 'transfer',
        target: reference,
        view: false
      },
      {
        _user: recipientUser._id,
        title: 'Transfer Received',
        message: `You received ₦${pendingTransfer.amount.toLocaleString()} from ${
          req.user.name
        }`,
        action: 'transfer',
        target: reference,
        view: false
      }
    ]);

    // Execute transfer using existing function
    const bankController = require('./bank.controller');
    return await bankController.transferToUser(req, res, next);
  } catch (error) {
    console.error('Complete Transfer Error:', error);
    return {
      success: false,
      message:
        error.message || 'An error occurred while completing the transfer'
    };
  }
}

// Function to create notification
exports.createNotification = asyncHandler(async (req, res, next) => {
  try {
    const notification = await Notification.create({
      _user: req.user._id,
      title: req.body.title || 'Transfer Notification',
      message: req.body.message,
      action: req.body.action || 'transfer',
      target: req.body.target || `TRF-${Date.now()}`,
      view: false
    });

    res.status(201).json({
      success: true,
      data: notification
    });
  } catch (error) {
    next(error);
  }
});
