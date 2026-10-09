import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

const USER = process.env.EMAIL_USER;
// Google displays app passwords in groups of four ("abcd efgh ijkl mnop").
// The spaces are cosmetic, so strip them before authenticating.
const APP_PASSWORD = process.env.EMAIL_APP_PASSWORD?.replace(/\s+/g, "");
const FROM_NAME = process.env.EMAIL_FROM_NAME ?? "PrivacyOps";

export function emailConfigured(): boolean {
  return Boolean(USER && APP_PASSWORD);
}

export function emailConfigHint(): string {
  if (!USER) return "EMAIL_USER is not set.";
  if (!APP_PASSWORD) return "EMAIL_APP_PASSWORD is not set.";
  return "";
}

type SendResult = { ok: true } | { ok: false; reason: string };

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: USER as string, pass: APP_PASSWORD as string },
    });
  }
  return transporter;
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendResult> {
  if (!emailConfigured()) {
    return { ok: false, reason: emailConfigHint() };
  }

  try {
    await getTransporter().sendMail({
      // Gmail only allows sending as the authenticated account (or a
      // verified alias), so the From address is always EMAIL_USER.
      from: { name: FROM_NAME, address: USER as string },
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "Send failed" };
  }
}
