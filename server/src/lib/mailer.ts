import nodemailer from "nodemailer";

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;

const transport = SMTP_HOST
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT ?? 587),
      secure: Number(SMTP_PORT) === 465,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    })
  : null;

if (transport) {
  console.log(`📧 Login codes will be emailed via ${SMTP_HOST} as ${MAIL_FROM ?? SMTP_USER}`);
} else {
  console.warn("⚠️  SMTP_HOST not set: login codes will be printed to this console instead of emailed.");
}

export async function sendLoginCode(to: string, code: string) {
  if (!transport) {
    console.log(`🔑 Login code for ${to}: ${code}`);
    return;
  }
  await transport.sendMail({
    from: MAIL_FROM ?? SMTP_USER,
    to,
    subject: `${code} is your Expense Tracker code`,
    text: `Your Expense Tracker login code is ${code}.\n\nIt expires in 10 minutes. If you didn't request it, you can ignore this email.`,
  });
}
