const fs = require('fs').promises;
const path = require('path');
const History = require('../schema/history.schema');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const axios = require('axios');
const CustomerCare = require('../schema/customercare.schema');
const Notification = require('../schema/notification.schema');

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

// Function to send transaction logs
async function sendTransactionLog(data) {
  try {
    console.log(
      'Attempting to send log to:',
      `http://192.168.43.224:5000/getTransactionLog`
    );
    const response = await axios.post(
      `http://192.168.43.224:5000/getTransactionLog`,
      {
        query: data
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Log response:', response.data); // Debug log
    return response.data;
  } catch (error) {
    console.error('Error sending transaction log:', error.message);
    throw error;
  }
}

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
exports.chatWithAI = asyncHandler(async (req, res, next) => {
  try {
    const { query } = req.body;

    if (!query) {
      return next(new ErrorResponse('Please provide a query', 400));
    }

    // Send to model directly
    const modelResponse = await sendToModel(query, 'chat');

    res.status(200).json({
      success: true,
      data: modelResponse
    });
  } catch (error) {
    next(error);
  }
});

async function chat(req, res) {
  try {
    const { message } = req.body;
    const response = await sendToModel(message);

    return res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({
      success: false,
      status: 'error',
      error: error.message
    });
  }
}

// Add new function to get analysis from model
async function getAnalysisFromModel() {
  try {
    console.log('Fetching analysis from model');
    const response = await axios.post(
      `http://192.168.43.224:5000/sendAnalysis`,
      {}, // empty body since we're just requesting analysis
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Analysis response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting analysis:', error.message);
    throw error;
  }
}

// New route handler to get analysis
exports.getAnalysis = asyncHandler(async (req, res, next) => {
  try {
    const analysis = await getAnalysisFromModel();

    res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Error:', error);
    next(error);
  }
});
