const express = require('express');
const router = express.Router();
const { protect } = require('../guard/protect.guard');

const {
  getNotifications,
  getAnalytics,
  aiChat,
  getAnalysis,
  getChatHistory,
} = require('../controllers/ai.controller');

// Define routes
router.get('/notifications', protect, getNotifications);
router.get('/analytics', protect, getAnalytics);
router.post('/chat', protect, aiChat);
router.get('/analysis', protect, getAnalysis);
router.get('/chat-history', protect, getChatHistory);


module.exports = router;
