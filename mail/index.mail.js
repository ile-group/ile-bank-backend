const nodemailer = require('nodemailer');
const { VERIFICATION_EMAIL_TEMPLATE } = require('./template/verifyToken');
const { PASSWORD_RESET_REQUEST_TEMPLATE } = require('./template/passwordReset');
const { WELCOME_TEMPLATE } = require('./template/welcome.template');

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
      htmlContent = WELCOME_TEMPLATE(option.message.name);
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
      html: htmlContent // Make sure we're sending the HTML content
    });
    console.log('Email sent:', info.response);
  } catch (error) {
    console.error('Email error:', error);
    throw error;
  }
};

module.exports = sendEmail;
