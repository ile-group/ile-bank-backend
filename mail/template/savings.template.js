const BANK_SAVED_EMAIL_TEMPLATE = (name, bankName, accountNumber) => `
<!DOCTYPE html>
<html lang="en">
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #4CAF50, #45a049); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Bank Account Added</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px;">
    <p>Hello ${name},</p>
    <p>A new bank account has been added to your profile:</p>
    <ul>
      <li>Bank: ${bankName}</li>
      <li>Account Number: ${accountNumber}</li>
    </ul>
    <p>If you didn't add this account, please contact support immediately.</p>
    <p>Best regards,<br>Your App Team</p>
  </div>
</body>
</html>
`;

module.exports = BANK_SAVED_EMAIL_TEMPLATE;
