/**
 * Nodemailer Email Service
 * Usage:
 *   const emailService = require('./nodemailerEmailService.cjs');
 *   await emailService.sendMail({ to, subject, text, html });
 */

const nodemailer = require('nodemailer');

// Use environment variables for credentials
const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_SECURE
} = process.env;

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
  console.warn('Nodemailer: SMTP credentials are not fully set in environment variables.');
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT) || 587,
  secure: SMTP_SECURE === 'true', // true для 465, false для других портов
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false // <--- разрешить самоподписанные сертификаты
  }
});

/**
 * Send an email using Nodemailer.
 * @param {Object} options
 * @param {string|string[]} options.to - Recipient(s)
 * @param {string} options.subject - Email subject
 * @param {string} [options.text] - Plain text body
 * @param {string} [options.html] - HTML body
 * @param {string} [options.from] - Sender address (optional, defaults to process.env.SMTP_USER)
 * @returns {Promise<Object>} - Nodemailer response
 */
async function sendMail({ to, subject, text, html, from }) {
  // Подробный лог параметров письма
  console.log('Nodemailer: Попытка отправки письма с параметрами:', {
    from: from || SMTP_USER,
    to,
    subject,
    text,
    html
  });

  if (!to || !subject || (!text && !html)) {
    console.error('Nodemailer: Не хватает обязательных полей для отправки письма!');
    throw new Error('Missing required email fields: to, subject, and text or html');
  }
  const mailOptions = {
    from: from || SMTP_USER,
    to,
    subject,
    text,
    html
  };
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Nodemailer info:', info);
    return info;
  } catch (err) {
    console.error('Nodemailer error:', err);
    throw err;
  }
}

module.exports = {
  sendMail
};