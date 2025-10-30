import nodemailer from "nodemailer";

let transporterPromise;

async function getTransporter() {
  if (transporterPromise) return transporterPromise;

  const {
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE
  } = process.env;

  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT),
        secure: String(SMTP_SECURE || "").toLowerCase() === "true",
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      })
    );
  } else {
    transporterPromise = nodemailer.createTestAccount().then((test) => {
      const t = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: { user: test.user, pass: test.pass },
      });
      console.log(`📫 Ethereal inbox: https://ethereal.email/messages (user: ${test.user})`);
      return t;
    });
  }
  return transporterPromise;
}

export async function sendPasswordResetEmail(toEmail, resetUrl) {
  const transporter = await getTransporter();
  const from = process.env.EMAIL_FROM || '"ATS Support" <no-reply@example.com>';

  const info = await transporter.sendMail({
    from,
    to: toEmail,
    subject: "Reset your password",
    text: `Click the link to reset your password (valid for 1 hour): ${resetUrl}`,
    html: `
      <p>We received a request to reset your password.</p>
      <p>This link is valid for <strong>1 hour</strong>:</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info); // only defined for Ethereal
  if (previewUrl) {
    console.log("🔍 Email preview URL:", previewUrl);
  }
  return { messageId: info.messageId, previewUrl };
}

export async function sendAccountDeletionEmail(toEmail) {
  const transporter = await getTransporter();
  const from = process.env.EMAIL_FROM || '"ATS Support" <no-reply@example.com>';

  const info = await transporter.sendMail({
    from,
    to: toEmail,
    subject: "Your account has been deleted",
    text: `This is a confirmation that your account has been permanently deleted from ATS for Candidates.

If you did not perform this action, please contact support immediately.`,
    html: `
      <p>This is a confirmation that your account has been <strong>permanently deleted</strong> from ATS for Candidates.</p>
      <p>If you did not perform this action, please contact support immediately.</p>
    `,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log("🔍 Deletion email preview URL:", previewUrl);
  }
  return { messageId: info.messageId, previewUrl };
}
