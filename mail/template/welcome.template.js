const WELCOME_TEMPLATE = (name) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Our Platform</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #4CAF50, #45a049); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Welcome!</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Hello ${name},</p>
    <p>Welcome to our platform! Your account has been successfully verified.</p>
    <p>You can now:</p>
    <ul>
      <li>Send and receive money</li>
      <li>Manage your wallet</li>
      <li>Track your transactions</li>
    </ul>
    <p>Best regards,<br>Your App Team</p>
  </div>
</body>
</html>
`;

module.exports = { WELCOME_TEMPLATE };
