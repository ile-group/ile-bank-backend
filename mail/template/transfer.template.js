
const TRANSFER_EMAIL_TEMPLATE = (name, amount, accountNumber, bankName) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transfer Notification</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #4CAF50, #45a049); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Transfer Successful</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px;">
    <p>Hello ${name},</p>
    <p>Your transfer of ₦${amount.toLocaleString()} has been processed successfully.</p>
    <p>Recipient Details:</p>
    <ul>
      <li>Bank: ${bankName}</li>
      <li>Account Number: ${accountNumber}</li>
    </ul>
    <p>If you didn't authorize this transfer, please contact support immediately.</p>
    <p>Best regards,<br>Your App Team</p>
  </div>
</body>
</html>
`;

module.exports = TRANSFER_EMAIL_TEMPLATE;