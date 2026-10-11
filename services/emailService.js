import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    if (env.SMTP_HOST && env.SMTP_USER) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS
        },
        connectionTimeout: 5000
      });
    }
  }

  /**
   * Send student registration welcome email containing their unique Student Registration ID
   */
  async sendStudentRegistrationEmail({ toEmail, studentName, studentId, courseName, batch }) {
    try {
      if (process.env.NODE_ENV === 'test' || !this.transporter) {
        if (env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
          console.log(`[Email Service Notice] Student Registration Email to ${toEmail} | Student ID: ${studentId} | Course: ${courseName}`);
        }
        return { delivered: true, mock: true };
      }

      const mailOptions = {
        from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`,
        to: toEmail,
        subject: `Welcome to LMS! Your Student Registration ID: ${studentId}`,
        text: `Hello ${studentName},\n\nWelcome to LMS! Your student registration has been completed successfully.\n\nHere are your registration details:\n- Student Registration ID: ${studentId}\n- Enrolled Course: ${courseName || 'General'}\n- Batch: ${batch}\n\nYou can log in using your registered Email OR your Student ID (${studentId}) along with your password.\n\nBest regards,\nLMS Academic Team\n`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
            <div style="text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 16px; margin-bottom: 20px;">
              <h1 style="color: #1e3a8a; margin: 0; font-size: 24px;">Welcome to the LMS Portal!</h1>
              <p style="color: #64748b; margin-top: 6px;">Your Student Account is Activated</p>
            </div>

            <p style="font-size: 16px; color: #334155;">Hello <strong>${studentName}</strong>,</p>
            <p style="font-size: 15px; color: #475569; line-height: 1.5;">
              Congratulations! You have successfully registered for your online learning account.
            </p>

            <div style="background-color: #f1f5f9; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 6px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #1e293b; font-size: 16px;">🎓 Your Registration Credentials:</h3>
              <table style="width: 100%; font-size: 14px; color: #334155;">
                <tr>
                  <td style="padding: 4px 0; font-weight: bold; width: 180px;">Student Registration ID:</td>
                  <td style="padding: 4px 0; font-family: monospace; font-size: 16px; font-weight: bold; color: #2563eb;">${studentId}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: bold;">Registered Email:</td>
                  <td style="padding: 4px 0;">${toEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: bold;">Enrolled Course:</td>
                  <td style="padding: 4px 0;">${courseName || 'General Course'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: bold;">Assigned Batch:</td>
                  <td style="padding: 4px 0;">${batch}</td>
                </tr>
              </table>
            </div>

            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              💡 <strong>Login Instructions:</strong> You can log into your student dashboard using either your <strong>Registered Email</strong> or your <strong>Student Registration ID (${studentId})</strong> along with the password you set during registration.
            </p>

            <div style="text-align: center; margin: 28px 0;">
              <a href="${env.CLIENT_URL}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 15px;">Go to Student Portal</a>
            </div>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
              If you have any questions or did not register for this account, please contact the administration immediately.
            </p>
          </div>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      if (env.NODE_ENV !== 'production') {
        console.log(`[Email Service] Registration welcome email successfully sent to ${toEmail} (MessageId: ${info.messageId})`);
      }
      return { delivered: true, messageId: info.messageId };
    } catch (error) {
      console.error(`[Email Service Error] Failed to send registration email to ${toEmail}:`, error.message);
      return { delivered: false, error: error.message };
    }
  }

  /**
   * Send 6-digit verification code OTP for password reset
   */
  async sendPasswordResetOtpEmail({ toEmail, recipientName = 'User', otpCode, expiryMinutes = 15 }) {
    try {
      if (process.env.NODE_ENV === 'test' || !this.transporter) {
        if (env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
          console.log(`[Email Service Notice] 6-digit Password Reset OTP for ${toEmail}: ${otpCode}`);
        }
        return { delivered: true, mock: true };
      }

      const mailOptions = {
        from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`,
        to: toEmail,
        subject: `LMS Password Reset Code: ${otpCode}`,
        text: `Hello ${recipientName},\n\nYou have requested to reset your LMS password.\n\nYour 6-Digit Password Reset Verification Code is: ${otpCode}\n\nThis code will expire in ${expiryMinutes} minutes.\nIf you did not make this request, please ignore this email.\n\nBest regards,\nLMS Security Team\n`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
            <div style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 20px;">
              <h2 style="color: #1e3a8a; margin: 0; font-size: 22px;">Password Reset Verification</h2>
              <p style="color: #64748b; margin-top: 4px; font-size: 14px;">Learning Management System</p>
            </div>

            <p style="font-size: 15px; color: #334155;">Hello <strong>${recipientName}</strong>,</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.5;">
              We received a request to reset your password. Use the 6-digit verification code below to complete your password reset:
            </p>

            <div style="text-align: center; margin: 28px 0;">
              <div style="display: inline-block; background-color: #eff6ff; border: 2px dashed #2563eb; border-radius: 8px; padding: 16px 36px;">
                <span style="font-family: 'Courier New', monospace, Courier; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1d4ed8;">
                  ${otpCode}
                </span>
              </div>
              <p style="color: #64748b; font-size: 13px; margin-top: 8px;">
                ⏱️ This code is valid for <strong>${expiryMinutes} minutes</strong>.
              </p>
            </div>

            <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
              If you did not request a password reset, please ignore this email or contact support if you suspect unauthorized access.
            </p>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
              LMS Academic & Examination Portal
            </p>
          </div>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      return { delivered: true, messageId: info.messageId };
    } catch (error) {
      console.error(`[Email Service Error] Failed to send OTP email to ${toEmail}:`, error.message);
      return { delivered: false, error: 'Email delivery failed' };
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(toEmail, resetUrl, recipientName = 'User') {
    try {
      if (process.env.NODE_ENV === 'test' || !this.transporter) {
        if (env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
          console.log(`[Email Service Notice] Reset link for ${toEmail}: ${resetUrl}`);
        }
        return { delivered: true, mock: true };
      }

      const mailOptions = {
        from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`,
        to: toEmail,
        subject: 'LMS Password Reset Request',
        text: `Hello ${recipientName},\n\nYou requested a password reset for your LMS account.\nPlease click the link below or copy and paste it into your browser to reset your password:\n\n${resetUrl}\n\nThis link will expire in ${env.PASSWORD_RESET_TOKEN_EXPIRES_MINUTES} minutes.\nIf you did not request this, please ignore this email.\n`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #1e293b;">Password Reset Request</h2>
            <p>Hello <strong>${recipientName}</strong>,</p>
            <p>You requested a password reset for your LMS account. Click the button below to set a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #64748b; font-size: 14px;">This link will expire in ${env.PASSWORD_RESET_TOKEN_EXPIRES_MINUTES} minutes.</p>
            <p style="color: #64748b; font-size: 14px;">If you did not make this request, you can safely ignore this email.</p>
          </div>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      return { delivered: true, messageId: info.messageId };
    } catch (error) {
      console.error(`[Email Service Error] Failed to send email to ${toEmail}:`, error.message);
      return { delivered: false, error: 'Email delivery failed' };
    }
  }
}

export const emailService = new EmailService();
