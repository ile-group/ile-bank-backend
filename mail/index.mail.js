const nodemailer = require('nodemailer');
const {
  VERIFICATION_EMAIL_TEMPLATE
} = require('./template/verifyToken.template');
const {
  PASSWORD_RESET_REQUEST_TEMPLATE
} = require('./template/passwordreset.template');
const { WELCOME_TEMPLATE } = require('./template/welcome.template');
const { TRANSFER_EMAIL_TEMPLATE } = require('./template/transfer.template');
const { DEPOSIT_EMAIL_TEMPLATE } = require('./template/deposit.template');
const { WITHDRAWAL_EMAIL_TEMPLATE } = require('./template/withdraw.template');
const { BANK_SAVED_EMAIL_TEMPLATE } = require('./template/savings.template');
const { NEW_ACCOUNT_EMAIL_TEMPLATE } = require('./template/account.template');
const {
  TICKET_CREATED_EMAIL_TEMPLATE
} = require('./template/ticketCreated.template');
const {
  TICKET_UPDATED_EMAIL_TEMPLATE
} = require('./template/ticketUpdated.template');

const {
  SAVINGS_BREAK_EMAIL_TEMPLATE
} = require('./template/savingsBreak.template');

const sendEmail = async (option) => {
  console.log('Attempting to send email...');

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    },
    logger: true,
    debug: true
  });

  // Get the correct template
  let htmlContent;
  switch (option.type) {
    case 'verification':
      htmlContent = VERIFICATION_EMAIL_TEMPLATE(
        option.message.otp,
        option.message.name
      );
      break;
    case 'passwordReset':
      htmlContent = PASSWORD_RESET_REQUEST_TEMPLATE(
        option.message.otp,
        option.message.name
      );
      break;
    case 'welcome':
      htmlContent = WELCOME_TEMPLATE(
        option.message.name,
        option.message.username, // Add username parameter
        option.message.accountNumber
      );
      break;
    case 'transfer':
      htmlContent = TRANSFER_EMAIL_TEMPLATE(
        option.message.name,
        option.message.amount,
        option.message.accountNumber,
        option.message.bankName,
        option.message.reference,
        option.message.date,
        option.message.senderName
      );
      break;
    case 'deposit':
      htmlContent = DEPOSIT_EMAIL_TEMPLATE(
        option.message.name,
        option.message.amount,
        option.message.reference,
        option.message.date
      );
      break;
    case 'withdrawal':
      htmlContent = WITHDRAWAL_EMAIL_TEMPLATE(
        option.message.name,
        option.message.amount,
        option.message.accountNumber,
        option.message.bankName,
        option.message.reference,
        option.message.date,
        option.message.recipientName
      );
      break;
    case 'ticketCreated':
      htmlContent = TICKET_CREATED_EMAIL_TEMPLATE(
        option.message.name,
        option.message.ticketId,
        option.message.subject,
        option.message.message
      );
      break;

    case 'ticketUpdated':
      htmlContent = TICKET_UPDATED_EMAIL_TEMPLATE(
        option.message.name,
        option.message.ticketId,
        option.message.status,
        option.message.response
      );
      break;
    case 'bankSaved':
      htmlContent = BANK_SAVED_EMAIL_TEMPLATE(
        option.message.name,
        option.message.amount,
        option.message.duration
      );
      break;
    case 'savingsBreak':
      htmlContent = SAVINGS_BREAK_EMAIL_TEMPLATE(
        option.message.name,
        option.message.amount,
        option.message.penaltyAmount,
        option.message.finalAmount
      );
      break;
    case 'newAccount':
      htmlContent = NEW_ACCOUNT_EMAIL_TEMPLATE(
        option.message.name,
        option.message.accountNumber,
        option.message.username
      );
      break;
    default:
      // For verification emails without type specified (backward compatibility)
      htmlContent = VERIFICATION_EMAIL_TEMPLATE(
        option.message.otp,
        option.message.name
      );
  }

  try {
    const info = await transporter.sendMail({
      from: `"${process.env.MAIL_NAME}" <${process.env.MAIL_USER}>`,
      to: option.to,
      subject: option.subject,
      html: option.html || htmlContent
    });
    console.log('Email sent:', info.response);
  } catch (error) {
    console.error('Email error:', error);
    throw error;
  }
};

module.exports = sendEmail;
