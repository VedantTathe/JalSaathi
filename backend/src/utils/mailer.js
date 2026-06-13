const nodemailer = require('nodemailer');

// Cache transporter for Vercel (avoid recreating on each request)
let cachedTransporter = null;

// Utility: Promise with timeout (reduced for Vercel 10s limit)
const promiseWithTimeout = (promise, timeoutMs = 8000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Email sending timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

// Retry email sending with exponential backoff
const sendEmailWithRetry = async (transporter, mailOptions, maxRetries = 2) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📧 Email attempt ${attempt}/${maxRetries}: ${mailOptions.to}`);
      const result = await promiseWithTimeout(transporter.sendMail(mailOptions), 8000);
      console.log(`✅ Email sent on attempt ${attempt}`);
      return result;
    } catch (error) {
      lastError = error;
      console.error(`❌ Email attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s
        const delayMs = attempt * 1000;
        console.log(`⏳ Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw lastError;
};

// Validate email config on startup
const validateEmailConfig = () => {
  const config = {
    host: process.env.EMAIL_HOST || process.env.SMTP_HOST,
    port: process.env.EMAIL_PORT || process.env.SMTP_PORT || '587',
    user: process.env.EMAIL_USER || process.env.SMTP_USER || process.env.GMAIL_USER,
    pass: process.env.EMAIL_PASS || process.env.SMTP_PASS || process.env.GMAIL_PASS
  };

  if (!config.host || !config.user || !config.pass) {
    console.warn('⚠️  EMAIL SERVICE NOT CONFIGURED');
    console.warn('   Set these environment variables: EMAIL_HOST, EMAIL_USER, EMAIL_PASS');
    console.warn('   Email functionality will be disabled');
    return false;
  }
  console.log('✅ Email service configured');
  return true;
};

const resolveMailConfig = () => {
  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST;
  const portRaw = process.env.EMAIL_PORT || process.env.SMTP_PORT || '587';
  const port = Number(portRaw);
  const user = process.env.EMAIL_USER || process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS || process.env.GMAIL_PASS;
  const from = process.env.EMAIL_FROM || process.env.MAIL_FROM || user;
  const secure = (process.env.EMAIL_SECURE || process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;

  return {
    host,
    port: Number.isNaN(port) ? 587 : port,
    user,
    pass,
    from,
    secure,
    isConfigured: Boolean(host && user && pass)
  };
};

// Create transporter (cached for Vercel)
const createTransporter = () => {
  // Return cached transporter if available
  if (cachedTransporter) {
    console.log('📧 Using cached email transporter');
    return cachedTransporter;
  }

  const config = resolveMailConfig();

  console.log('📧 Creating email transporter...');
  console.log('   Host:', config.host || 'MISSING');
  console.log('   Port:', config.port);
  console.log('   User:', config.user ? 'SET' : 'MISSING');

  if (!config.isConfigured) {
    const error = new Error('Email service is not configured. Set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, and EMAIL_FROM in environment variables.');
    error.isConfigIssue = true;
    throw error;
  }
  
  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    },
    // Vercel-optimized SMTP settings
    connectionTimeout: 5000,    // 5 seconds
    greetingTimeout: 5000,
    socketTimeout: 10000,       // 10 seconds total
    tls: {
      rejectUnauthorized: false // Gmail requires this
    },
    pool: {
      maxConnections: 1,        // Serverless: single connection
      maxMessages: Infinity,    // Send unlimited messages per connection
      rateDelta: 1000,
      rateLimit: 20             // 20 emails per second max
    },
    // Enable connection keepalive
    keepAlive: true,
    requireTLS: true
  });

  return cachedTransporter;
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email (Vercel-optimized: wait for send to complete)
const sendOTPEmail = async (email, otp, name = 'User') => {
  console.log(`📧 Sending OTP email to: ${email}`);
  
  try {
    const transporter = createTransporter();
    const config = resolveMailConfig();
    
    const mailOptions = {
      from: config.from,
      to: email,
      subject: 'JalSaathi - Email Verification OTP',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .header {
              background-color: #2563eb;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: white;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .otp-box {
              background-color: #f0f7ff;
              border: 2px dashed #2563eb;
              padding: 20px;
              text-align: center;
              margin: 20px 0;
              border-radius: 5px;
            }
            .otp-code {
              font-size: 32px;
              font-weight: bold;
              color: #2563eb;
              letter-spacing: 5px;
            }
            .footer {
              margin-top: 20px;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>JalSaathi</h1>
            </div>
            <div class="content">
              <h2>Email Verification</h2>
              <p>Hello ${name},</p>
              <p>Thank you for registering with JalSaathi! To complete your registration, please verify your email address using the OTP below:</p>
              
              <div class="otp-box">
                <div class="otp-code">${otp}</div>
              </div>
              
              <p><strong>This OTP is valid for 10 minutes.</strong></p>
              <p><strong>Note:</strong> Please also check your spam folder for OTPs.</p>
              <p>If you didn't request this verification, please ignore this email.</p>
              
              <p>Best regards,<br>JalSaathi Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
      };
      
      // Send with retry logic
      const info = await sendEmailWithRetry(transporter, mailOptions, 2);
      console.log(`✅ OTP email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to send OTP email to ${email}:`, error.message);
      return { 
        success: false, 
        error: error.message,
        isConfigIssue: error.isConfigIssue 
      };
    }
};

// Send OTP for login (Vercel-optimized: wait for send to complete)
const sendLoginOTPEmail = async (email, otp, name = 'User') => {
  console.log(`📧 Sending login OTP email to: ${email}`);
  
  try {
    const transporter = createTransporter();
    const config = resolveMailConfig();
    
    const mailOptions = {
      from: config.from,
      to: email,
      subject: 'JalSaathi - Login OTP',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .header {
              background-color: #2563eb;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: white;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .otp-box {
              background-color: #f0f7ff;
              border: 2px dashed #2563eb;
              padding: 20px;
              text-align: center;
              margin: 20px 0;
              border-radius: 5px;
            }
            .otp-code {
              font-size: 32px;
              font-weight: bold;
              color: #2563eb;
              letter-spacing: 5px;
            }
            .footer {
              margin-top: 20px;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            .warning {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 10px;
              margin: 15px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>JalSaathi</h1>
            </div>
            <div class="content">
              <h2>Login OTP Request</h2>
              <p>Hello ${name},</p>
              <p>You requested to log in to your JalSaathi account using OTP. Use the code below to complete your login:</p>
              
              <div class="otp-box">
                <div class="otp-code">${otp}</div>
              </div>
              
              <p><strong>This OTP is valid for 10 minutes.</strong></p>
              <p><strong>Note:</strong> Please also check your spam folder for OTPs.</p>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> If you didn't request this login OTP, please ignore this email and ensure your account is secure.
              </div>
              
              <p>Best regards,<br>JalSaathi Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
      };
      
      // Send with retry logic
      const info = await sendEmailWithRetry(transporter, mailOptions, 2);
      console.log(`✅ Login OTP email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to send login OTP email to ${email}:`, error.message);
      return { 
        success: false, 
        error: error.message,
        isConfigIssue: error.isConfigIssue 
      };
    }
};

// Send welcome email after successful verification
const sendWelcomeEmail = async (email, name, role) => {
  console.log(`📧 Sending welcome email to: ${email}`);
  
  try {
    const transporter = createTransporter();
    const config = resolveMailConfig();
    
    const roleMessages = {
      customer: 'You can now start ordering fresh drinking water from nearby providers.',
      provider: 'Your provider account is under review. You will be notified once approved.',
      delivery: 'You can now start accepting delivery assignments.'
    };
    
    const mailOptions = {
      from: config.from,
      to: email,
      subject: 'Welcome to JalSaathi!',
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
          }
          .header {
            background-color: #10b981;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background-color: white;
            padding: 30px;
            border-radius: 0 0 5px 5px;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #2563eb;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 20px;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to JalSaathi!</h1>
          </div>
          <div class="content">
            <h2>Registration Successful!</h2>
            <p>Hello ${name},</p>
            <p>Congratulations! Your email has been verified and your account is now active.</p>
            <p>${roleMessages[role] || 'You can now access all features of your account.'}</p>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/login" class="button">Login to Your Account</a>
            </div>
            
            <p>If you have any questions, feel free to contact our support team.</p>
            
            <p>Best regards,<br>JalSaathi Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `
    };
    
    const info = await sendEmailWithRetry(transporter, mailOptions, 1);
    console.log(`✅ Welcome email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to send welcome email to ${email}:`, error.message);
    // Non-critical, return success anyway (registration is already complete)
    return { success: true };
  }
};

// Send password reset OTP email
const sendPasswordResetOTPEmail = async (email, otp, name = 'User') => {
  console.log(`📧 Sending password reset OTP email to: ${email}`);
  
  try {
    const transporter = createTransporter();
    const config = resolveMailConfig();
    
    const mailOptions = {
      from: config.from,
      to: email,
      subject: 'JalSaathi - Password Reset OTP',
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
          }
          .header {
            background-color: #dc2626;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background-color: white;
            padding: 30px;
            border-radius: 0 0 5px 5px;
          }
          .otp-box {
            background-color: #fef2f2;
            border: 2px dashed #dc2626;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
            border-radius: 5px;
          }
          .otp-code {
            font-size: 32px;
            font-weight: bold;
            color: #dc2626;
            letter-spacing: 5px;
          }
          .footer {
            margin-top: 20px;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 10px;
            margin: 15px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Reset Your Password</h2>
            <p>Hello ${name},</p>
            <p>We received a request to reset your JalSaathi account password. Use the OTP below to proceed:</p>
            
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
            </div>
            
            <p><strong>This OTP is valid for 10 minutes.</strong></p>
            <p><strong>Note:</strong> Please also check your spam folder for OTPs.</p>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong><br>
              If you didn't request a password reset, please ignore this email and ensure your account is secure.
            </div>
            
            <p>Best regards,<br>JalSaathi Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `
    };
    
    const info = await sendEmailWithRetry(transporter, mailOptions, 2);
    console.log(`✅ Password reset OTP email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to send password reset OTP email to ${email}:`, error.message);
    return { 
      success: false, 
      error: error.message,
      isConfigIssue: error.isConfigIssue 
    };
  }
};

// Send delivery boy credentials email
const sendDeliveryBoyCredentialsEmail = async (email, name, password, providerName) => {
  try {
    const transporter = createTransporter();
    const config = resolveMailConfig();
    
    const mailOptions = {
      from: config.from,
      to: email,
      subject: 'JalSaathi - Your Delivery Partner Account Details',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .header {
              background-color: #10b981;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: white;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .credentials-box {
              background-color: #f0fdf4;
              border: 2px solid #10b981;
              padding: 20px;
              margin: 20px 0;
              border-radius: 5px;
            }
            .credential-item {
              margin: 10px 0;
              padding: 10px;
              background-color: white;
              border-radius: 3px;
            }
            .credential-label {
              font-weight: bold;
              color: #059669;
            }
            .credential-value {
              font-size: 16px;
              color: #333;
              font-family: 'Courier New', monospace;
            }
            .footer {
              margin-top: 20px;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            .warning {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 10px;
              margin: 15px 0;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #10b981;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚚 Welcome to JalSaathi!</h1>
            </div>
            <div class="content">
              <h2>Delivery Partner Account Created</h2>
              <p>Hello ${name},</p>
              <p>Your delivery partner account has been created by <strong>${providerName}</strong>. You can now login and start managing deliveries!</p>
              
              <div class="credentials-box">
                <h3 style="margin-top: 0; color: #059669;">Your Login Credentials</h3>
                <div class="credential-item">
                  <span class="credential-label">Email:</span><br>
                  <span class="credential-value">${email}</span>
                </div>
                <div class="credential-item">
                  <span class="credential-label">Password:</span><br>
                  <span class="credential-value">${password}</span>
                </div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong><br>
                Please change your password after your first login for security purposes.
              </div>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/login" class="button">Login Now</a>
              </div>
              
              <h3>Getting Started:</h3>
              <ol>
                <li>Login using the credentials above</li>
                <li>Complete your profile information</li>
                <li>Start accepting delivery assignments</li>
                <li>Track your deliveries and earnings</li>
              </ol>
              
              <p>If you have any questions or need assistance, please contact ${providerName} or our support team.</p>
              
              <p>Best regards,<br>JalSaathi Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    const info = await sendEmailWithRetry(transporter, mailOptions, 2);
    console.log(`✅ Delivery boy credentials email sent successfully to ${email}`);
    console.log(`   Message ID: ${info.messageId}`);
    return { success: true };
    
  } catch (error) {
    console.error(`❌ Error sending delivery boy credentials email to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};

// Send order delivered email
const sendOrderDeliveredEmail = async (email, name, orderNumber, providerName) => {
  console.log(`📧 Sending order delivered email to: ${email}`);
  
  try {
    const transporter = createTransporter();
    const config = resolveMailConfig();
    
    const mailOptions = {
      from: config.from,
      to: email,
      subject: 'JalSaathi - Your Order has been Delivered!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
            .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: white; padding: 30px; border-radius: 0 0 5px 5px; }
            .footer { margin-top: 20px; text-align: center; color: #666; font-size: 12px; }
            .success-box { background-color: #f0fdf4; border: 2px solid #10b981; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💧 Order Delivered!</h1>
            </div>
            <div class="content">
              <h2>Hello ${name},</h2>
              <p>Your JalSaathi water can order <strong>#${orderNumber}</strong> from <strong>${providerName}</strong> has been successfully delivered to your address.</p>
              
              <div class="success-box">
                <h3 style="color: #059669; margin: 0;">Thank you for using JalSaathi!</h3>
              </div>
              
              <p>If you have any feedback or face any issues, please contact our support team or the provider.</p>
              <p>Best regards,<br>JalSaathi Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    const info = await sendEmailWithRetry(transporter, mailOptions, 2);
    console.log(`✅ Order delivered email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to send order delivered email to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};

// Send provider approval email
const sendProviderApprovalEmail = async (email, name) => {
  console.log(`📧 Sending provider approval email to: ${email}`);
  
  try {
    const transporter = createTransporter();
    const config = resolveMailConfig();
    
    const mailOptions = {
      from: config.from,
      to: email,
      subject: 'JalSaathi - Your Provider Account is Approved!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
            .header { background-color: #0284c7; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: white; padding: 30px; border-radius: 0 0 5px 5px; }
            .footer { margin-top: 20px; text-align: center; color: #666; font-size: 12px; }
            .success-box { background-color: #f0f9ff; border: 2px solid #0284c7; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💧 Welcome to JalSaathi!</h1>
            </div>
            <div class="content">
              <h2>Hello ${name},</h2>
              <p>Great news! Your JalSaathi Provider profile has been <strong>approved</strong> by the admin team.</p>
              
              <div class="success-box">
                <h3 style="color: #0369a1; margin: 0;">You are now active on JalSaathi.</h3>
                <p style="margin-top: 10px;">Customers in your area can now see your business and place orders with you!</p>
              </div>
              
              <p>Make sure your inventory is updated and you are ready to accept orders from your dashboard.</p>
              <p>Best regards,<br>JalSaathi Admin Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    const info = await sendEmailWithRetry(transporter, mailOptions, 2);
    console.log(`✅ Provider approval email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to send provider approval email to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};

// Send new provider alert to admin
const sendNewProviderAlertToAdmin = async (providerData, userEmail, userName) => {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return { success: false, error: 'Admin email not configured' };

  console.log(`📧 Sending new provider alert to admin: ${adminEmail}`);
  
  try {
    const transporter = createTransporter();
    const config = resolveMailConfig();
    
    const mailOptions = {
      from: config.from,
      to: adminEmail,
      subject: '⚠️ Action Required: New Provider Registration',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
            .header { background-color: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: white; padding: 30px; border-radius: 0 0 5px 5px; }
            .footer { margin-top: 20px; text-align: center; color: #666; font-size: 12px; }
            .info-box { background-color: #fef2f2; border: 2px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">New Provider Pending Approval</h1>
            </div>
            <div class="content">
              <h2>Admin Action Required</h2>
              <p>A new provider has just registered on JalSaathi and is waiting for your approval to start accepting orders.</p>
              
              <div class="info-box">
                <h3 style="color: #b91c1c; margin: 0 0 10px 0;">Provider Details:</h3>
                <p><strong>Business Name:</strong> ${providerData.businessName}</p>
                <p><strong>Owner Name:</strong> ${userName}</p>
                <p><strong>Email:</strong> ${userEmail}</p>
                <p><strong>Area:</strong> ${providerData.area || 'N/A'}</p>
                <p><strong>Price per Can:</strong> Rs. ${providerData.pricePerCan}</p>
              </div>
              
              <p>Please log in to the JalSaathi Admin Dashboard to review and approve this provider.</p>
            </div>
            <div class="footer">
              <p>This is an automated system alert.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    const info = await sendEmailWithRetry(transporter, mailOptions, 2);
    console.log(`✅ Provider alert email sent to admin`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to send provider alert to admin:`, error.message);
    return { success: false, error: error.message };
  }
};
module.exports = {
  generateOTP,
  sendOTPEmail,
  sendLoginOTPEmail,
  sendWelcomeEmail,
  sendPasswordResetOTPEmail,
  sendDeliveryBoyCredentialsEmail,
  sendOrderDeliveredEmail,
  sendProviderApprovalEmail,
  sendNewProviderAlertToAdmin
};
