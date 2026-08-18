const nodemailer = require('nodemailer');

let cachedTransporter = null;

const getTransporter = async () => {
  if (cachedTransporter) return cachedTransporter;

  // 1. Production / Custom SMTP configured via environment
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    return cachedTransporter;
  }

  // 2. Gmail / standard service shortcut
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    cachedTransporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    return cachedTransporter;
  }

  // 3. Fallback: Ethereal test account or logging transporter
  try {
    const testAccount = await nodemailer.createTestAccount();
    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    return cachedTransporter;
  } catch (_e) {
    // If ethereal test account creation fails, use json transport for logging
    cachedTransporter = nodemailer.createTransport({
      jsonTransport: true
    });
    return cachedTransporter;
  }
};

/**
 * Send an email invitation to a group member
 */
const sendGroupInviteEmail = async ({ toEmail, inviterName, inviterEmail, groupName, groupDescription, groupId }) => {
  try {
    const transporter = await getTransporter();
    const appUrl = process.env.CLIENT_URL || process.env.APP_URL || 'http://localhost:5001';
    const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || '"SplitSmart Expense Manager" <noreply@splitsmart.app>';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f8fafc; margin: 0; padding: 24px; }
    .container { max-width: 560px; margin: 0 auto; background: #121827; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 32px 28px; box-shadow: 0 12px 36px rgba(0,0,0,0.5); }
    .header { text-align: center; margin-bottom: 24px; }
    .logo { display: inline-flex; width: 48px; height: 48px; background: linear-gradient(135deg, #6366f1, #06b6d4); border-radius: 12px; align-items: center; justify-content: center; font-size: 24px; color: #fff; line-height: 48px; margin-bottom: 12px; text-align: center; }
    .brand { font-size: 20px; font-weight: 700; color: #ffffff; margin: 0; }
    .card { background: rgba(22, 30, 49, 0.85); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; }
    .group-title { font-size: 22px; font-weight: 700; color: #818cf8; margin: 0 0 6px 0; }
    .group-desc { font-size: 14px; color: #94a3b8; margin: 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #6366f1, #4f46e5); color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 28px; border-radius: 8px; margin: 20px 0 10px 0; box-shadow: 0 4px 16px rgba(99,102,241,0.4); }
    .footer { font-size: 12px; color: #64748b; text-align: center; margin-top: 24px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">⚡</div>
      <h1 class="brand">SplitSmart</h1>
    </div>

    <h2 style="font-size: 18px; color: #f1f5f9; text-align: center; margin-bottom: 8px;">
      You've been invited to join a group!
    </h2>
    <p style="font-size: 14px; color: #cbd5e1; text-align: center; line-height: 1.6; margin: 0 0 16px 0;">
      <strong>${inviterName || 'A friend'}</strong> (${inviterEmail || 'group admin'}) added you to collaborate and split expenses together.
    </p>

    <div class="card">
      <h3 class="group-title">📁 ${groupName}</h3>
      ${groupDescription ? `<p class="group-desc">${groupDescription}</p>` : ''}
      <a href="${appUrl}" class="btn">🚀 Join & View Expenses</a>
    </div>

    <p style="font-size: 13px; color: #94a3b8; text-align: center; margin: 16px 0 0 0;">
      Simply sign in or register with <strong>${toEmail}</strong> to view the shared balances, track payments, and settle up easily.
    </p>

    <div class="footer">
      SplitSmart · Smart Expense Management & Debt Optimization<br/>
      Sent automatically when you are invited to a group.
    </div>
  </div>
</body>
</html>
`;

    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: `⚡ You've been invited to "${groupName}" on SplitSmart`,
      html: htmlContent
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[Email Invite] Sent invite email to: ${toEmail} for group: "${groupName}"`);
    if (previewUrl) {
      console.log(`[Email Invite Preview URL]: ${previewUrl}`);
    }

    return { success: true, messageId: info.messageId, previewUrl };
  } catch (err) {
    console.warn(`[Email Invite Warning] Could not dispatch email to ${toEmail}:`, err.message);
    return { success: false, error: err.message };
  }
};

module.exports = { getTransporter, sendGroupInviteEmail };
