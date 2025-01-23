exports.TICKET_CREATED_EMAIL_TEMPLATE = (name, ticketId, subject, message) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Support Ticket Created</title>
  <style>
    .ticket-box {
      background-color: #f8f9fa;
      border-radius: 8px;
      padding: 15px;
      margin: 20px 0;
      border-left: 4px solid #17a2b8;
    }
  </style>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #17a2b8, #138496); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0;">Support Ticket Created</h1>
  </div>
  
  <div style="background-color: #ffffff; padding: 20px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <p>Hello ${name},</p>
    
    <p>Your support ticket has been created successfully.</p>
    
    <div class="ticket-box">
      <p><strong>Ticket ID:</strong> ${ticketId}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong> ${message}</p>
    </div>

    <p>We will review your ticket and respond as soon as possible.</p>
    
    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
      <p>Best regards,<br>Support Team</p>
    </div>
  </div>
</body>
</html>
`;
