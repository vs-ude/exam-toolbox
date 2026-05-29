import nodemailer from "nodemailer";

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

function getSmtpConfig() {
  const host = Deno.env.get("SMTP_HOST") || "mailcrab";
  const port = Number.parseInt(Deno.env.get("SMTP_PORT") || "1025", 10);
  const from = Deno.env.get("SMTP_FROM") || "noreply@examtoolbox.local";

  return { host, port, from };
}

/**
 * Sends an HTML email using SMTP.
 * Defaults are development-friendly (MailCrab) and can be overridden via env vars.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailParams): Promise<void> {
  const { host, port, from } = getSmtpConfig();

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false, // usually true only for port 465
    auth: null, // MailCrab in local/dev does not require auth
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"ExamToolbox" <${from}>`,
      to,
      subject,
      html,
    });

    console.log("Email sent:", info.messageId);
  } catch (error) {
    console.error("SMTP send error:", error);
    throw error;
  }
}
