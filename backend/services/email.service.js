import nodemailer from 'nodemailer';

// Helper to create SMTP transporter
const createTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || process.env.FROM_EMAIL;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn('⚠️ [Email Service] SMTP_USER or SMTP_PASS not set in environment variables. Email dispatch may fail.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587 / other ports
    auth: {
      user,
      pass
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

/**
 * Common luxury email layout wrapper
 */
const getHtmlTemplate = ({ title, subtitle, otp, message, footerNote }) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0d1b2a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f6f9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" width="100%" max-width="580" cellspacing="0" cellpadding="0" border="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(13, 27, 42, 0.08); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0d1b2a 0%, #1a2e46 100%); padding: 32px 30px; text-align: center; border-bottom: 3px solid #f5c06a;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: #f5c06a; color: #0d1b2a; font-weight: 900; font-size: 20px; letter-spacing: 2px; padding: 8px 18px; border-radius: 8px; text-transform: uppercase;">
                      HOUR STAY
                    </div>
                    <p style="margin: 8px 0 0 0; color: #fff7e6; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; font-weight: 600;">
                      Hotel Management System
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              <h1 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 800; color: #0d1b2a; text-align: center;">
                ${title}
              </h1>
              ${subtitle ? `<p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b; text-align: center; line-height: 1.5;">${subtitle}</p>` : ''}
              
              ${message ? `
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px; font-size: 14px; line-height: 1.6; color: #334155;">
                ${message}
              </div>
              ` : ''}

              ${otp ? `
              <!-- OTP Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <div style="background: linear-gradient(180deg, #fff7e6 0%, #ffeed1 100%); border: 2px dashed #f5c06a; border-radius: 14px; padding: 20px 30px; display: inline-block; text-align: center;">
                      <span style="font-size: 11px; text-transform: uppercase; font-weight: 800; letter-spacing: 2px; color: #92400e; display: block; margin-bottom: 6px;">
                        Your One-Time Password (OTP)
                      </span>
                      <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #0d1b2a; display: block; margin-left: 8px;">
                        ${otp}
                      </span>
                      <span style="font-size: 11px; font-weight: 600; color: #b45309; display: block; margin-top: 6px;">
                        ⏱️ Valid for 10 minutes only
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Security Advisory -->
              <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 20px; text-align: center;">
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #ef4444; font-weight: 700;">
                  ⚠️ Security Advisory
                </p>
                <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                  Never share this OTP with anyone, including Hour Stay hotel staff. If you did not make this request, please change your password immediately.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0d1b2a; padding: 22px 30px; text-align: center; border-top: 1px solid #1e293b;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #cbd5e1; font-weight: 600;">
                Hour Stay Hospitality Technologies
              </p>
              <p style="margin: 0; font-size: 11px; color: #64748b;">
                ${footerNote || 'Automated security alert · Please do not reply directly to this email.'}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

/**
 * Send Forgot Password OTP Email
 */
export const sendForgotPasswordOtpEmail = async (email, name = 'Valued User', otp) => {
  try {
    const fromAddress = process.env.FROM_EMAIL || process.env.SMTP_USER || 'satyasainakka04@gmail.com';
    const fromName = 'Hour Stay HMS Support';
    const subject = `🔐 Password Reset OTP: ${otp} - Hour Stay HMS`;

    const html = getHtmlTemplate({
      title: 'Password Reset Request',
      subtitle: `Hello ${name || 'User'}, we received a request to reset your password for your Hour Stay HMS account.`,
      otp,
      message: `Please enter the 6-digit verification code below on the password reset screen to set your new password.`,
      footerNote: 'If you did not request a password reset, you can safely ignore this email.'
    });

    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: email,
      subject,
      text: `Hello ${name},\n\nYour OTP for resetting your Hour Stay account password is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nNever share this OTP with anyone.\n\n- Hour Stay HMS Team`,
      html
    });

    console.log(`📧 [Email Service] Forgot Password OTP sent successfully to ${email} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ [Email Service] Failed to send Forgot Password OTP email to ${email}:`, error.message);
    // Fallback: log OTP to console for development
    console.log(`\n========================================`);
    console.log(`🔐 [DEVELOPMENT OTP FALLBACK]`);
    console.log(`Target Email: ${email}`);
    console.log(`OTP Code:     ${otp}`);
    console.log(`Purpose:      Forgot Password Reset`);
    console.log(`========================================\n`);
    return { success: false, error: error.message };
  }
};

/**
 * Send Account Creation / Registration Verification OTP Email
 */
export const sendRegistrationOtpEmail = async (email, name = 'Guest', otp) => {
  try {
    const fromAddress = process.env.FROM_EMAIL || process.env.SMTP_USER || 'satyasainakka04@gmail.com';
    const fromName = 'Hour Stay HMS Welcome';
    const subject = `🎉 Welcome to Hour Stay! Verification OTP: ${otp}`;

    const html = getHtmlTemplate({
      title: 'Welcome to Hour Stay!',
      subtitle: `Hello ${name || 'Guest'}, thank you for registering with Hour Stay Hotel Management System.`,
      otp,
      message: `Your account has been created successfully. Use the 6-digit verification code below to verify your email address and access your guest portal.`,
      footerNote: 'Thank you for choosing Hour Stay Hospitality.'
    });

    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: email,
      subject,
      text: `Hello ${name},\n\nWelcome to Hour Stay HMS!\n\nYour account verification OTP is: ${otp}\n\nThis code is valid for 10 minutes.\n\n- Hour Stay HMS Team`,
      html
    });

    console.log(`📧 [Email Service] Registration OTP email sent successfully to ${email} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ [Email Service] Failed to send Registration OTP email to ${email}:`, error.message);
    console.log(`\n========================================`);
    console.log(`🔐 [DEVELOPMENT OTP FALLBACK]`);
    console.log(`Target Email: ${email}`);
    console.log(`OTP Code:     ${otp}`);
    console.log(`Purpose:      Account Registration`);
    console.log(`========================================\n`);
    return { success: false, error: error.message };
  }
};

/**
 * Send Account Created Credentials Email (for Admin / Staff / Manager creation)
 */
export const sendAccountCreatedEmail = async (email, name, role, temporaryPassword, propertyName = 'Hour Stay Property') => {
  try {
    const fromAddress = process.env.FROM_EMAIL || process.env.SMTP_USER || 'satyasainakka04@gmail.com';
    const fromName = 'Hour Stay HMS Accounts';
    const subject = `🏨 Your Hour Stay HMS Account has been Created (${role.toUpperCase()})`;

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const loginUrl = `${clientUrl}/login`;

    const message = `
      <p style="margin: 0 0 10px 0;">Your administrative/staff account has been successfully set up on the Hour Stay HMS platform.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="6" style="margin-top: 10px; font-size: 13px;">
        <tr>
          <td style="font-weight: bold; width: 120px; color: #64748b;">Assigned Role:</td>
          <td style="font-weight: bold; color: #0d1b2a; text-transform: capitalize;">${role}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; color: #64748b;">Property:</td>
          <td style="font-weight: bold; color: #0d1b2a;">${propertyName}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; color: #64748b;">Login Email:</td>
          <td style="font-weight: bold; color: #2563eb;">${email}</td>
        </tr>
        ${temporaryPassword ? `
        <tr>
          <td style="font-weight: bold; color: #64748b;">Password:</td>
          <td style="font-weight: bold; color: #0d1b2a; font-family: monospace; background-color: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${temporaryPassword}</td>
        </tr>
        ` : ''}
      </table>
      <div style="margin-top: 20px; text-align: center;">
        <a href="${loginUrl}" style="background-color: #0d1b2a; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; font-size: 13px;">
          Log In to Console →
        </a>
      </div>
    `;

    const html = getHtmlTemplate({
      title: 'HMS Account Credentials',
      subtitle: `Welcome aboard, ${name}! Your staff account is ready.`,
      otp: null,
      message,
      footerNote: 'Please change your temporary password upon first login.'
    });

    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: email,
      subject,
      text: `Hello ${name},\n\nYour Hour Stay account (${role}) has been created.\nEmail: ${email}\nPassword: ${temporaryPassword || 'Set by administrator'}\nLogin URL: ${loginUrl}\n\n- Hour Stay HMS Team`,
      html
    });

    console.log(`📧 [Email Service] Account Created email sent successfully to ${email} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ [Email Service] Failed to send Account Created email to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Generic OTP Email Helper
 */
export const sendGenericOtpEmail = async ({ to, name = 'User', otp, title, subtitle, message }) => {
  try {
    const fromAddress = process.env.FROM_EMAIL || process.env.SMTP_USER || 'satyasainakka04@gmail.com';
    const fromName = 'Hour Stay HMS Security';
    const subject = `🔐 Verification Code: ${otp} - Hour Stay HMS`;

    const html = getHtmlTemplate({
      title: title || 'Security Verification',
      subtitle: subtitle || `Hello ${name}, please verify your action with the OTP code below.`,
      otp,
      message: message || 'Enter this code to complete your verification.',
      footerNote: 'If you did not request this OTP, please contact support.'
    });

    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to,
      subject,
      text: `Hello ${name},\n\nYour OTP is: ${otp}\n\nValid for 10 minutes.\n\n- Hour Stay HMS Team`,
      html
    });

    console.log(`📧 [Email Service] OTP email sent successfully to ${to} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ [Email Service] Failed to send OTP email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

export default {
  sendForgotPasswordOtpEmail,
  sendRegistrationOtpEmail,
  sendAccountCreatedEmail,
  sendGenericOtpEmail
};
