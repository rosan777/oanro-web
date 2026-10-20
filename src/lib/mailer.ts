import "server-only";
import nodemailer from "nodemailer";
// Shared outgoing email (the same SMTP account used for sign-up verification).
// Notifications must never break an order: failures are logged without addresses or content and swallowed.
let transport: ReturnType<typeof nodemailer.createTransport> | undefined;
export const mailConfigured = () => Boolean(process.env.SMTP_URL && process.env.AUTH_EMAIL_FROM);
export async function sendMail(to: string | string[], subject: string, text: string, html?: string) {
  const list = [...new Set((Array.isArray(to) ? to : [to]).map(a => a.trim().toLowerCase()).filter(Boolean))];
  if (!mailConfigured() || !list.length) return false;
  try {
    transport ??= nodemailer.createTransport(process.env.SMTP_URL!);
    // Bcc keeps staff addresses private from each other.
    await transport.sendMail({ from: process.env.AUTH_EMAIL_FROM, ...(list.length === 1 ? { to: list[0] } : { to: process.env.AUTH_EMAIL_FROM, bcc: list }), subject, text, ...(html ? { html } : {}) });
    return true;
  } catch (error) {
    console.error(`Email "${subject.slice(0, 40)}" not sent: ${error instanceof Error ? error.message.slice(0, 120) : "unknown error"}`);
    return false;
  }
}
