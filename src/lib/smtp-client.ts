/**
 * SMTP Email Client using Nodemailer
 * Works with Gmail, Outlook, SendGrid, or any SMTP provider
 * https://nodemailer.com/
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface SMTPConfig {
  host: string; // SMTP server hostname (e.g., smtp.gmail.com)
  port: string | number; // SMTP port (e.g., 587, 465)
  username: string; // Email address or SMTP username
  password: string; // Password or app password
  fromEmail: string; // From email address
  fromName: string; // From display name
}

export interface SendEmailInput {
  to: string | string[]; // Recipient email(s)
  subject: string;
  text?: string; // Plain text version
  html?: string; // HTML version
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    path?: string; // File path
    content?: Buffer | string; // Buffer or string content
  }>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  response?: string;
  error?: string;
}

/**
 * Create SMTP transporter
 */
export function createSMTPTransporter(config: SMTPConfig): Transporter {
  const port = typeof config.port === 'string' ? parseInt(config.port) : config.port;
  
  return nodemailer.createTransport({
    host: config.host,
    port: port,
    secure: port === 465, // true for port 465, false for other ports (STARTTLS)
    auth: {
      user: config.username,
      pass: config.password
    },
    // Always validate TLS certificates for security
    tls: {
      rejectUnauthorized: true // Always verify certificates to prevent man-in-the-middle attacks
    }
  });
}

/**
 * Verify SMTP connection
 */
export async function verifySMTPConnection(
  config: SMTPConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = createSMTPTransporter(config);
    
    await transporter.verify();
    
    return { success: true };
  } catch (error) {
    console.error('SMTP verification error:', error);
    
    let errorMessage = 'Failed to connect to SMTP server';
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Provide helpful error messages
      if (errorMessage.includes('535') || errorMessage.includes('Authentication failed')) {
        errorMessage = 'Authentication failed. Check your email and password. For Gmail, use an App Password instead of your regular password.';
      } else if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
        errorMessage = 'Connection timeout. Check your SMTP host and port settings.';
      } else if (errorMessage.includes('ENOTFOUND')) {
        errorMessage = 'SMTP server not found. Check your host setting.';
      }
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Send email via SMTP
 */
export async function sendEmailSMTP(
  config: SMTPConfig,
  input: SendEmailInput
): Promise<SendEmailResult> {
  try {
    const transporter = createSMTPTransporter(config);
    
    // Build email options
    const mailOptions = {
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: Array.isArray(input.to) ? input.to.join(', ') : input.to,
      subject: input.subject,
      ...(input.text && { text: input.text }),
      ...(input.html && { html: input.html }),
      ...(input.cc && { cc: Array.isArray(input.cc) ? input.cc.join(', ') : input.cc }),
      ...(input.bcc && { bcc: Array.isArray(input.bcc) ? input.bcc.join(', ') : input.bcc }),
      ...(input.attachments && { attachments: input.attachments })
    };
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      messageId: info.messageId,
      response: info.response
    };
  } catch (error) {
    console.error('SMTP send error:', error);
    
    let errorMessage = 'Failed to send email';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Send bulk emails via SMTP
 */
export async function sendBulkEmailSMTP(
  config: SMTPConfig,
  emails: SendEmailInput[]
): Promise<{
  success: boolean;
  results: Array<{
    to: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
  successCount: number;
  failCount: number;
}> {
  const results = [];
  let successCount = 0;
  let failCount = 0;
  
  for (const email of emails) {
    const result = await sendEmailSMTP(config, email);
    
    const recipient = Array.isArray(email.to) ? email.to[0] : email.to;
    
    if (result.success) {
      successCount++;
      results.push({
        to: recipient,
        success: true,
        messageId: result.messageId
      });
    } else {
      failCount++;
      results.push({
        to: recipient,
        success: false,
        error: result.error
      });
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return {
    success: true,
    results,
    successCount,
    failCount
  };
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
