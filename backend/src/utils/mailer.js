const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  console.log('📧 Creating email transporter...');
  console.log('   Host:', process.env.EMAIL_HOST);
  console.log('   Port:', process.env.EMAIL_PORT);
  console.log('   User:', process.env.EMAIL_USER);
  
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 20000
  });
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
const sendOTPEmail = async (email, otp, name = 'User') => {
  console.log(`📧 Attempting to send OTP email to: ${email}`);
  console.log(`   OTP: ${otp}`);
  console.log(`   Name: ${name}`);
  
  try {
    const transporter = createTransporter();
    
    console.log('   Creating mail options...');
    const mailOptions = {
      from: process.env.EMAIL_FROM,
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
    
    console.log('   Sending email...');
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent successfully to ${email}`);
    console.log(`   Message ID: ${info.messageId}`);
    return { success: true };
    
  } catch (error) {
    console.error(`❌ Error sending OTP email to ${email}:`, error.message);
    console.error('   Full error:', error);
    return { success: false, error: error.message };
  }
};

// Send OTP for login
const sendLoginOTPEmail = async (email, otp, name = 'User') => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
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
    
    await transporter.sendMail(mailOptions);
    console.log(`Login OTP email sent to ${email}`);
    return { success: true };
    
  } catch (error) {
    console.error('Error sending login OTP email:', error);
    return { success: false, error: error.message };
  }
};

// Send welcome email after successful verification
const sendWelcomeEmail = async (email, name, role) => {
  try {
    const transporter = createTransporter();
    
    const roleMessages = {
      customer: 'You can now start ordering fresh drinking water from nearby providers.',
      provider: 'Your provider account is under review. You will be notified once approved.',
      delivery: 'You can now start accepting delivery assignments.'
    };
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
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
    
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${email}`);
    return { success: true };
    
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
};

// Send password reset OTP email
const sendPasswordResetOTPEmail = async (email, otp, name = 'User') => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
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
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset OTP email sent successfully to ${email}`);
    console.log(`   Message ID: ${info.messageId}`);
    return { success: true };
    
  } catch (error) {
    console.error(`❌ Error sending password reset OTP email to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};

// Send delivery boy credentials email
const sendDeliveryBoyCredentialsEmail = async (email, name, password, providerName) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
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
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Delivery boy credentials email sent successfully to ${email}`);
    console.log(`   Message ID: ${info.messageId}`);
    return { success: true };
    
  } catch (error) {
    console.error(`❌ Error sending delivery boy credentials email to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  generateOTP,
  sendOTPEmail,
  sendLoginOTPEmail,
  sendWelcomeEmail,
  sendPasswordResetOTPEmail,
  sendDeliveryBoyCredentialsEmail
};
