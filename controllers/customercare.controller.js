const CustomerCare = require('../schema/customercare.schema');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const sendEmail = require('../mail/index.mail');

// Create a new support ticket
exports.createTicket = asyncHandler(async (req, res, next) => {
  const { subject, message } = req.body;

  if (!subject || !message) {
    return next(new ErrorResponse('Please provide subject and message', 400));
  }

  const ticket = await CustomerCare.create({
    _user: req.user._id,
    subject,
    message
  });

  // Send confirmation email
  await sendEmail({
    to: req.user.email,
    subject: 'Support Ticket Created',
    type: 'ticketCreated',
    message: {
      name: req.user.name,
      ticketId: ticket._id,
      subject: subject,
      message: message
    }
  });

  res.status(201).json({
    success: true,
    data: ticket
  });
});

// Get all tickets for a user
exports.getMyTickets = asyncHandler(async (req, res, next) => {
  const tickets = await CustomerCare.find({ _user: req.user._id }).sort(
    '-createdAt'
  );

  res.status(200).json({
    success: true,
    count: tickets.length,
    data: tickets
  });
});

// Get a single ticket
exports.getTicket = asyncHandler(async (req, res, next) => {
  const ticket = await CustomerCare.findOne({
    _id: req.params.id,
    _user: req.user._id
  });

  if (!ticket) {
    return next(new ErrorResponse('Ticket not found', 404));
  }

  res.status(200).json({
    success: true,
    data: ticket
  });
});

// Update ticket (for admin responses)
exports.updateTicket = asyncHandler(async (req, res, next) => {
  const { status, response } = req.body;

  const ticket = await CustomerCare.findByIdAndUpdate(
    req.params.id,
    {
      status,
      response,
      responseDate: Date.now()
    },
    { new: true, runValidators: true }
  );

  if (!ticket) {
    return next(new ErrorResponse('Ticket not found', 404));
  }

  // Send email notification of response
  await sendEmail({
    to: req.user.email,
    subject: 'Support Ticket Updated',
    type: 'ticketUpdated',
    message: {
      name: req.user.name,
      ticketId: ticket._id,
      status: status,
      response: response
    }
  });

  res.status(200).json({
    success: true,
    data: ticket
  });
});
