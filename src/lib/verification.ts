import crypto from "node:crypto";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const CODE_TTL_MINUTES = 15;

const TTL_MS = CODE_TTL_MINUTES * 60 * 1000;

function hash(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function hashesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function issueVerificationCode(userId: string): Promise<string> {
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");

  await prisma.user.update({
    where: { id: userId },
    data: {
      verificationCode: hash(code),
      verificationExpires: new Date(Date.now() + TTL_MS),
    },
  });

  return code;
}

export type VerifyOutcome = "ok" | "invalid" | "expired" | "unverified_required";

export async function verifyCode(email: string, code: string): Promise<VerifyOutcome> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.verificationCode || !user.verificationExpires) {
    return "unverified_required";
  }

  if (user.verificationExpires.getTime() < Date.now()) {
    return "expired";
  }

  if (!hashesMatch(user.verificationCode, code.trim())) {
    return "invalid";
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationCode: null,
      verificationExpires: null,
    },
  });

  return "ok";
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  code: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const subject = `${code} is your PrivacyOps verification code`;

  const text = [
    `Hi ${name},`,
    "",
    `Your PrivacyOps verification code is: ${code}`,
    "",
    `It expires in ${CODE_TTL_MINUTES} minutes.`,
    "If you did not create an account, you can ignore this email.",
  ].join("\n");

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <p>Hi ${escapeHtml(name)},</p>
      <p>Enter this code to finish creating your PrivacyOps account:</p>
      <p style="font-size: 34px; font-weight: 700; letter-spacing: 10px; margin: 24px 0;">
        ${code}
      </p>
      <p style="color: #64748b; font-size: 14px;">
        It expires in ${CODE_TTL_MINUTES} minutes.
      </p>
      <p style="color: #64748b; font-size: 14px;">
        If you did not create an account, you can safely ignore this email.
      </p>
    </div>
  `;

  return sendEmail({ to, subject, html, text });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
