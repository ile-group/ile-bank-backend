const DEPOSIT_EMAIL_TEMPLATE = (name, amount, reference) => `
<!DOCTYPE html>
<html lang="en">
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #4CAF50, #45a049); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Deposit Successful</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px;">
    <p>Hello ${name},</p>
    <p>Your wallet has been credited with ₦${amount.toLocaleString()}</p>
    <p>Reference: ${reference}</p>
    <p>Best regards,<br>Your App Team</p>
  </div>
</body>
</html>
`;


module.exports = DEPOSIT_EMAIL_TEMPLATE;