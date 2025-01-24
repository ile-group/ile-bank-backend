const express = require('express');
const router = express.Router();
const { protect } = require('../guard/protect.guard');

const {
  getNotifications,
  getAnalytics,
  chatWithAI,
  getAnalysis
} = require('../controllers/ai.controller');

// Define routes
router.get('/notifications', protect, getNotifications);
router.get('/analytics', protect, getAnalytics);
router.post('/chat', protect, chatWithAI);
router.get('/analysis', protect, getAnalysis);

module.exports = router;
