import nodemailer, { Transporter } from 'nodemailer'
import { logger } from '../utils/logger'

export interface EmailOptions {
  to: string
  subject: string
  text?: string
  html?: string
}

export class EmailService {
  private transporter: Transporter | null = null
  private readonly fromEmail: string
  private enabled: boolean = false

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'HRMS System <noreply@hrms.com>'
    this.initializeTransporter()
  }

  /**
   * Initialize email transporter
   */
  private initializeTransporter(): void {
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = parseInt(process.env.SMTP_PORT || '587')
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS

    // Only enable email if SMTP is configured
    if (!smtpHost || !smtpUser || !smtpPass || smtpPass === 'your-app-password') {
      logger.warn('Email service not configured. Emails will be logged instead of sent.')
      this.enabled = false
      return
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      })

      this.enabled = true
      logger.info('Email service initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize email service:', error)
      this.enabled = false
    }
  }

  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.enabled || !this.transporter) {
      logger.info(`[EMAIL NOT SENT - Service Disabled] To: ${options.to}, Subject: ${options.subject}`)
      if (options.text) {
        logger.info(`Content: ${options.text}`)
      }
      return
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.fromEmail,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      })

      logger.info(`Email sent to ${options.to}: ${info.messageId}`)
    } catch (error) {
      logger.error(`Failed to send email to ${options.to}:`, error)
      throw error
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.CORS_ORIGIN}/reset-password?token=${resetToken}`
    
    const subject = 'Password Reset Request - HRMS System'
    const text = `
Hello,

You have requested to reset your password for your HRMS account.

Please click the link below to reset your password (valid for 1 hour):
${resetUrl}

If you did not request this reset, please ignore this email and your password will remain unchanged.

Best regards,
HRMS System Team
    `.trim()

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #1976d2; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .button { 
      display: inline-block; 
      padding: 12px 24px; 
      background-color: #1976d2; 
      color: white; 
      text-decoration: none; 
      border-radius: 4px;
      margin: 20px 0;
    }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset Request</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>You have requested to reset your password for your HRMS account.</p>
      <p>Please click the button below to reset your password (valid for 1 hour):</p>
      <p style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #1976d2;">${resetUrl}</p>
      <p><strong>If you did not request this reset, please ignore this email</strong> and your password will remain unchanged.</p>
    </div>
    <div class="footer">
      <p>This is an automated message from HRMS System. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `.trim()

    await this.sendEmail({ to: email, subject, text, html })
  }

  /**
   * Send welcome email to new employee
   */
  async sendWelcomeEmail(email: string, employeeName: string, employeeNumber: string): Promise<void> {
    const subject = 'Welcome to HRMS - Your Account Details'
    const text = `
Hello ${employeeName},

Welcome to the HRMS System!

Your employee account has been created with the following details:
Employee Number: ${employeeNumber}
Email: ${email}

Please contact your HR manager to set up your password and complete your profile.

Best regards,
HRMS System Team
    `.trim()

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4caf50; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .info-box { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #4caf50; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to HRMS!</h1>
    </div>
    <div class="content">
      <p>Hello ${employeeName},</p>
      <p>Welcome to the HRMS System! Your employee account has been successfully created.</p>
      <div class="info-box">
        <p><strong>Your Account Details:</strong></p>
        <p>Employee Number: <strong>${employeeNumber}</strong></p>
        <p>Email: <strong>${email}</strong></p>
      </div>
      <p>Please contact your HR manager to set up your password and complete your profile.</p>
      <p>We look forward to working with you!</p>
    </div>
    <div class="footer">
      <p>This is an automated message from HRMS System. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `.trim()

    await this.sendEmail({ to: email, subject, text, html })
  }

  /**
   * Send leave request notification
   */
  async sendLeaveRequestNotification(
    managerEmail: string,
    employeeName: string,
    leaveType: string,
    startDate: Date,
    endDate: Date
  ): Promise<void> {
    const subject = `Leave Request Pending Approval - ${employeeName}`
    const text = `
Hello,

${employeeName} has submitted a leave request that requires your approval:

Leave Type: ${leaveType}
Start Date: ${startDate.toLocaleDateString()}
End Date: ${endDate.toLocaleDateString()}

Please log in to the HRMS system to review and approve/reject this request.

Best regards,
HRMS System Team
    `.trim()

    await this.sendEmail({ to: managerEmail, subject, text })
  }
}

// Export singleton instance
export const emailService = new EmailService()
