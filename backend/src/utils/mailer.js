const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.example.com',
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || ''
  }
});

async function sendMail({ to, subject, text, html, cc }) {
  try {
    const from = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'no-reply@example.com';
    const info = await transporter.sendMail({ from, to, cc, subject, text, html });
    console.log('Mailer: sent', subject, 'to', to, 'cc', cc || 'none', 'msgId', info && info.messageId);
    return info;
  } catch (err) {
    console.error('Mailer error:', err && err.message);
    // Do not throw to avoid breaking main flow; caller can decide
    return null;
  }
}

module.exports = { sendMail, transporter };
