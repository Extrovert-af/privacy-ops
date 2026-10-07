import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ValidationError, email as parseEmail } from "@/lib/validation";
import { clientIp, checkLoginAllowed, recordLoginFailure, clearLoginFailures } from "@/lib/rate-limit";
import { emailConfigured, emailConfigHint } from "@/lib/email";
import { issueVerificationCode, sendVerificationEmail } from "@/lib/verification";

export async function POST(req: Request) {
  try {
    if (!emailConfigured()) {
      return NextResponse.json(
        { error: `Email verification is not configured. ${emailConfigHint()}` },
        { status: 503 }
      );
    }

    const body = await req.json();
    const email = parseEmail(body.email);

    const key = `resend:${email}:${clientIp(req)}`;

    if (!(await checkLoginAllowed(key))) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a few minutes before trying again." },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (user && !user.emailVerified) {
      const code = await issueVerificationCode(user.id);
      const sent = await sendVerificationEmail(user.email, user.name, code);

      if (!sent.ok) {
        console.error("Resend verification email failed:", sent.reason);
        return NextResponse.json(
          { error: "We could not send the email. Please try again later." },
          { status: 502 }
        );
      }

      await recordLoginFailure(key);
      await clearLoginFailures(`verify:${email}:${clientIp(req)}`);
    }

    // Same response whether or not the account exists.
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Resend error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
