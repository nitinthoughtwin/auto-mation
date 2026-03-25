import nodemailer from 'nodemailer';

// Email configuration
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@gpmart.in';

// Create transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: SMTP_USER && SMTP_PASS ? {
    user: SMTP_USER,
    pass: SMTP_PASS,
  } : undefined,
});

// Email templates
interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

function getBaseEmailStyles() {
  return `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
      .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
      .header { background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%); padding: 30px; text-align: center; }
      .header h1 { color: white; margin: 0; font-size: 24px; }
      .content { padding: 30px; }
      .button { display: inline-block; background: #dc2626; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
      .footer { background: #f9f9f9; padding: 20px; text-align: center; color: #666; font-size: 12px; }
      .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
    </style>
  `;
}

export async function sendPasswordResetEmail(email: string, token: string, name?: string): Promise<boolean> {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  const template: EmailTemplate = {
    subject: 'Reset Your Password - GPMart Studio',
    html: `
      <!DOCTYPE html>
      <html>
      <head>${getBaseEmailStyles()}</head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎬 GPMart Studio</h1>
          </div>
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>Hi there,</p>
            <p>We received a request to reset your password for your GPMart Studio account. Click the button below to create a new password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour. If you didn't request this password reset, you can safely ignore this email.
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="background: #f5f5f5; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 14px;">${resetUrl}</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} GPMart Studio. All rights reserved.</p>
            <p>This email was sent to ${email}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Reset Your Password - GPMart Studio

We received a request to reset your password for your GPMart Studio account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour. If you didn't request this password reset, you can safely ignore this email.

© ${new Date().getFullYear()} GPMart Studio
    `,
  };

  return sendEmail(email, template);
}

export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  const loginUrl = `${process.env.NEXTAUTH_URL}/login`;
  
  const template: EmailTemplate = {
    subject: 'Welcome to GPMart Studio! 🎉',
    html: `
      <!DOCTYPE html>
      <html>
      <head>${getBaseEmailStyles()}</head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎬 GPMart Studio</h1>
          </div>
          <div class="content">
            <h2>Welcome${name ? `, ${name}` : ''}! 🎉</h2>
            <p>Thank you for joining GPMart Studio! You're now ready to automate your YouTube workflow.</p>
            <h3>Getting Started:</h3>
            <ul>
              <li>Connect your YouTube channel</li>
              <li>Link your Google Drive</li>
              <li>Start scheduling uploads</li>
            </ul>
            <div style="text-align: center;">
              <a href="${loginUrl}" class="button">Go to Dashboard</a>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} GPMart Studio. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Welcome to GPMart Studio!

Thank you for joining! You're now ready to automate your YouTube workflow.

Getting Started:
1. Connect your YouTube channel
2. Link your Google Drive
3. Start scheduling uploads

Go to Dashboard: ${loginUrl}

© ${new Date().getFullYear()} GPMart Studio
    `,
  };

  return sendEmail(email, template);
}

export async function sendSubscriptionEmail(
  email: string,
  name: string,
  planName: string,
  type: 'started' | 'renewed' | 'expired'
): Promise<boolean> {
  const dashboardUrl = `${process.env.NEXTAUTH_URL}/billing`;
  
  const typeMessages = {
    started: {
      title: 'Subscription Started! ✨',
      message: `Your <strong>${planName}</strong> plan is now active. Welcome aboard!`,
    },
    renewed: {
      title: 'Subscription Renewed! 🔄',
      message: `Your <strong>${planName}</strong> plan has been renewed successfully.`,
    },
    expired: {
      title: 'Subscription Expired ⚠️',
      message: `Your <strong>${planName}</strong> plan has expired. Renew now to continue enjoying premium features.`,
    },
  };

  const { title, message } = typeMessages[type];
  
  const template: EmailTemplate = {
    subject: type === 'expired' 
      ? `Subscription Expired - ${planName} Plan` 
      : `Subscription ${type === 'started' ? 'Started' : 'Renewed'} - ${planName} Plan`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>${getBaseEmailStyles()}</head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎬 GPMart Studio</h1>
          </div>
          <div class="content">
            <h2>${title}</h2>
            <p>Hi ${name},</p>
            <p>${message}</p>
            <div style="text-align: center;">
              <a href="${dashboardUrl}" class="button">${type === 'expired' ? 'Renew Now' : 'View Subscription'}</a>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} GPMart Studio. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
${title}

Hi ${name},
${message}

${type === 'expired' ? 'Renew Now' : 'View Subscription'}: ${dashboardUrl}

© ${new Date().getFullYear()} GPMart Studio
    `,
  };

  return sendEmail(email, template);
}

export async function sendPaymentReminderEmail(
  email: string,
  planName: string,
  amount: number,
  dueDate: Date
): Promise<boolean> {
  const billingUrl = `${process.env.NEXTAUTH_URL}/billing`;
  
  const template: EmailTemplate = {
    subject: `Payment Reminder - ${planName} Plan`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>${getBaseEmailStyles()}</head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎬 GPMart Studio</h1>
          </div>
          <div class="content">
            <h2>Payment Reminder 💳</h2>
            <p>Your <strong>${planName}</strong> plan subscription is due for renewal.</p>
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Amount:</strong> ₹${(amount / 100).toLocaleString()}</p>
              <p style="margin: 10px 0 0 0;"><strong>Due Date:</strong> ${dueDate.toLocaleDateString()}</p>
            </div>
            <div style="text-align: center;">
              <a href="${billingUrl}" class="button">Manage Billing</a>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} GPMart Studio. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Payment Reminder - ${planName} Plan

Your subscription is due for renewal.

Amount: ₹${(amount / 100).toLocaleString()}
Due Date: ${dueDate.toLocaleDateString()}

Manage Billing: ${billingUrl}

© ${new Date().getFullYear()} GPMart Studio
    `,
  };

  return sendEmail(email, template);
}

export async function sendVerificationEmail(email: string, token: string, name?: string): Promise<boolean> {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;
  
  const template: EmailTemplate = {
    subject: 'Verify Your Email - GPMart Studio',
    html: `
      <!DOCTYPE html>
      <html>
      <head>${getBaseEmailStyles()}</head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎬 GPMart Studio</h1>
          </div>
          <div class="content">
            <h2>Verify Your Email Address</h2>
            <p>Hi${name ? `, ${name}` : ''},</p>
            <p>Thank you for creating an account! Please verify your email address to get started with GPMart Studio.</p>
            <div style="text-align: center;">
              <a href="${verifyUrl}" class="button">Verify Email</a>
            </div>
            <div class="warning">
              <strong>⏰ Time Sensitive:</strong> This link will expire in 24 hours. If you didn't create this account, you can safely ignore this email.
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="background: #f5f5f5; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 14px;">${verifyUrl}</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} GPMart Studio. All rights reserved.</p>
            <p>This email was sent to ${email}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Verify Your Email - GPMart Studio

Hi${name ? `, ${name}` : ''},

Thank you for creating an account! Please verify your email address to get started.

Click the link below to verify:
${verifyUrl}

This link will expire in 24 hours. If you didn't create this account, you can safely ignore this email.

© ${new Date().getFullYear()} GPMart Studio
    `,
  };

  return sendEmail(email, template);
}

export async function sendPasswordChangedEmail(email: string): Promise<boolean> {
  const template: EmailTemplate = {
    subject: 'Password Changed - GPMart Studio',
    html: `
      <!DOCTYPE html>
      <html>
      <head>${getBaseEmailStyles()}</head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎬 GPMart Studio</h1>
          </div>
          <div class="content">
            <h2>Password Changed ✅</h2>
            <p>Your password has been successfully changed.</p>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong> If you didn't make this change, please contact support immediately.
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} GPMart Studio. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Password Changed - GPMart Studio

Your password has been successfully changed.

If you didn't make this change, please contact support immediately.

© ${new Date().getFullYear()} GPMart Studio
    `,
  };

  return sendEmail(email, template);
}

export async function sendPaymentReceiptEmail(
  email: string,
  name: string,
  amount: number,
  planName: string,
  paymentId: string,
  date: string
): Promise<boolean> {
  const dashboardUrl = `${process.env.NEXTAUTH_URL}/billing`;
  
  const template: EmailTemplate = {
    subject: `Payment Receipt - ${planName} Plan`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>${getBaseEmailStyles()}</head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎬 GPMart Studio</h1>
          </div>
          <div class="content">
            <h2>Payment Receipt 🧾</h2>
            <p>Hi ${name},</p>
            <p>Thank you for your payment! Here are your receipt details:</p>
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Plan:</strong> ${planName}</p>
              <p style="margin: 10px 0 0 0;"><strong>Amount:</strong> ₹${(amount / 100).toLocaleString()}</p>
              <p style="margin: 10px 0 0 0;"><strong>Payment ID:</strong> ${paymentId}</p>
              <p style="margin: 10px 0 0 0;"><strong>Date:</strong> ${date}</p>
            </div>
            <div style="text-align: center;">
              <a href="${dashboardUrl}" class="button">View Billing</a>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} GPMart Studio. All rights reserved.</p>
            <p>This email was sent to ${email}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Payment Receipt - ${planName} Plan

Hi ${name},

Thank you for your payment!

Plan: ${planName}
Amount: ₹${(amount / 100).toLocaleString()}
Payment ID: ${paymentId}
Date: ${date}

View Billing: ${dashboardUrl}

© ${new Date().getFullYear()} GPMart Studio
    `,
  };

  return sendEmail(email, template);
}

// Base email sending function
async function sendEmail(to: string, template: EmailTemplate): Promise<boolean> {
  try {
    if (!SMTP_USER || !SMTP_PASS) {
      console.log('[Email] SMTP not configured, skipping email to:', to);
      return false;
    }

    await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    console.log('[Email] Sent successfully to:', to);
    return true;
  } catch (error) {
    console.error('[Email] Error sending email:', error);
    return false;
  }
}