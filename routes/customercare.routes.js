const express = require('express');
const router = express.Router();
const { protect } = require('../guard/protect.guard');
const {
  createTicket,
  getMyTickets,
  getTicket,
  updateTicket
} = require('../controllers/customercare.controller');

router.post('/create', protect, createTicket);
router.get('/my-tickets', protect, getMyTickets);
router.get('/ticket/:id', protect, getTicket);
router.put('/ticket/:id', protect, updateTicket);

module.exports = router;
