const API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;
const SENDER_NAME = process.env.BREVO_SENDER_NAME ?? "PrivacyOps";

export function emailConfigured(): boolean {
  return Boolean(API_KEY && SENDER_EMAIL);
}

export function emailConfigHint(): string {
  if (!API_KEY) return "BREVO_API_KEY is not set.";
  if (!SENDER_EMAIL) return "BREVO_SENDER_EMAIL is not set.";
  return "";
}

type SendResult = { ok: true } | { ok: false; reason: string };

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
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        apikey: API_KEY as string,
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email: options.to }],
        subject: options.subject,
        htmlContent: options.html,
        textContent: options.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, reason: `Brevo responded ${res.status}: ${body.slice(0, 300)}` };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "Network error" };
  }
}
