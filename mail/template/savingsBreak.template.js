exports.SAVINGS_BREAK_EMAIL_TEMPLATE = (
  name,
  amount,
  penaltyAmount,
  finalAmount
) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Savings Break</title>
  <style>
    .transaction-box {
      background-color: #f8f9fa;
      border-radius: 8px;
      padding: 15px;
      margin: 20px 0;
      border-left: 4px solid #dc3545;
    }
    .amount {
      font-size: 24px;
      color: #dc3545;
      font-weight: bold;
      margin: 10px 0;
    }
    .detail-item {
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .detail-item:last-child {
      border-bottom: none;
    }
  </style>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #dc3545, #c82333); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">
      Savings Break Completed
    </h1>
  </div>
  
  <div style="background-color: #ffffff; padding: 20px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <p style="font-size: 16px;">Hello ${name},</p>
    
    <div class="transaction-box">
      <div class="amount">
        ₦${(finalAmount || 0).toLocaleString()}
      </div>
      <p style="margin: 5px 0; color: #666;">
        Amount received after penalty
      </p>
    </div>

    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px;">
      <h3 style="margin: 0 0 15px 0; color: #2c3e50;">Break Details</h3>
      
      <div class="detail-item">
        <strong>Original Amount:</strong> 
        <span style="float: right;">₦${(amount || 0).toLocaleString()}</span>
      </div>
      
      <div class="detail-item">
        <strong>Penalty Amount:</strong>
        <span style="float: right;">₦${(
          penaltyAmount || 0
        ).toLocaleString()}</span>
      </div>
      
      <div class="detail-item">
        <strong>Final Amount:</strong>
        <span style="float: right;">₦${(
          finalAmount || 0
        ).toLocaleString()}</span>
      </div>
      
      <div class="detail-item">
        <strong>Date:</strong>
        <span style="float: right;">${new Date().toLocaleString()}</span>
      </div>
    </div>

    <div style="background-color: #fff3cd; color: #856404; padding: 10px; border-radius: 4px; margin-top: 20px; font-size: 14px;">
      Your savings has been broken early and a penalty fee was applied.
    </div>

    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
      <p>Thank you for using our service!</p>
      <p style="margin: 0;">Best regards,<br>Your App Team</p>
    </div>
  </div>
</body>
</html>
`;
