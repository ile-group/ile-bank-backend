exports.NEW_ACCOUNT_EMAIL_TEMPLATE = (name, accountNumber, bankName, username) => `
<!DOCTYPE html>
<html lang="en">
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #4CAF50, #45a049); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Welcome to Our Bank!</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px;">
    <p>Dear ${name},</p>
    <p>Your account has been created successfully. Here are your account details:</p>
    <div style="background: #fff; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p><strong>Account Number:</strong> ${accountNumber}</p>
      <p><strong>Bank Name:</strong> ${bankName}</p>
      <p><strong>Username:</strong> ${username}</p>
    </div>
    <p>You can use either your account number or username for transfers.</p>
    <p>Keep your account details safe and never share them with anyone.</p>
    <p>Best regards,<br>Your Bank Team</p>
  </div>
</body>
</html>
`;
