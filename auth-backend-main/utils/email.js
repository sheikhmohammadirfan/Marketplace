```javascript
const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return transporter;
}

async function sendMail({ to, subject, html, link }) {
  const t = getTransporter();
  const from = process.env.EMAIL_FROM || "no-reply@example.com";

  if (!t) {
    console.log("\n📧 [DEV EMAIL — SMTP not configured]");
    console.log("To:", to);
    console.log("Subject:", subject);

    if (link) {
      console.log("ACTION LINK:", link);
    }

    console.log("----------------------------------------\n");
    return;
  }

  await t.sendMail({ from, to, subject, html });
}

function sendVerificationEmail(to, link) {
  return sendMail({
    to,
    subject: "Verify your email",
    link,
    html: `<p>Welcome! Please verify your email address.</p>
           <p><a href="${link}">Verify my email</a></p>
           <p>This link expires in 24 hours.</p>`,
  });
}

function sendPasswordResetEmail(to, link) {
  return sendMail({
    to,
    subject: "Reset your password",
    link,
    html: `<p>We received a request to reset your password.</p>
           <p><a href="${link}">Reset my password</a></p>
           <p>This link expires in 30 minutes.</p>`,
  });
}

function sendAccountLockedEmail(to) {
  return sendMail({
    to,
    subject: "Security alert: account temporarily locked",
    html: `<p>Your account was temporarily locked after multiple failed login attempts.</p>`,
  });
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendAccountLockedEmail,
};
```