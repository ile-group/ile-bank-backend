exports.WELCOME_TEMPLATE = (name, username, accountNumber) => `
<!DOCTYPE html>
<html>
<head>
    <title>Welcome to Our Bank</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333;">
    <div style="background-color: #4CAF50; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Welcome to Our Bank!</h1>
    </div>
    
    <div style="padding: 20px;">
        <p>Dear ${name},</p>
        
        <p>Your account has been created successfully. Here are your account details:</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Account Number:</strong> ${accountNumber}</p>
            <p><strong>Bank Name:</strong> ILE BANK</p>
            <p><strong>Username:</strong> ${username}</p>
        </div>
        
        <p>Thank you for choosing our bank!</p>
        
        <p>Best regards,<br>ILE Bank Team</p>
    </div>
</body>
</html>
`;
