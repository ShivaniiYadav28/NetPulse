
const nodemailer = require("nodemailer");

let transporter;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
  } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      "SMTP configuration incomplete. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in Backend/.env.",
    );
  }

  const port = Number(SMTP_PORT || 587);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT must be a valid port number.");
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: String(SMTP_SECURE).toLowerCase() === "true",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });

  return transporter;
}

async function sendEmail({ to, subject, text, html }) {
  if (!to || !subject || (!text && !html)) {
    throw new Error(
      "Recipient, subject, and email content are required.",
    );
  }

  const from = process.env.SMTP_FROM;

  if (!from) {
    throw new Error("SMTP_FROM is not configured in Backend/.env.");
  }

  const mailer = getTransporter();

  return mailer.sendMail({
    from,
    to,
    subject,
    ...(text ? { text } : {}),
    ...(html ? { html } : {}),
  });
}

async function verifyEmailConnection() {
  const mailer = getTransporter();
  return mailer.verify();
}

module.exports = {
  sendEmail,
  verifyEmailConnection,
};
