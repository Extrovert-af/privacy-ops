import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import {
  ValidationError,
  str,
  email as parseEmail,
  password as parsePassword,
} from "@/lib/validation";
import { clientIp, checkLoginAllowed, recordLoginFailure } from "@/lib/rate-limit";
import { emailConfigured } from "@/lib/email";
import { issueVerificationCode, sendVerificationEmail } from "@/lib/verification";

export async function POST(req: Request) {
  const ipKey = `register:${clientIp(req)}`;

  try {
    if (!(await checkLoginAllowed(ipKey))) {
      return NextResponse.json(
        { error: "Too many accounts created. Try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();

    // When email sending isn't configured, accounts are created already
    // verified so sign-ups keep working. Verification switches on as soon
    // as BREVO_API_KEY and BREVO_SENDER_EMAIL are both present.
    const verificationEnabled = emailConfigured();

    const name = str(body.name, "Name", { required: true, max: 120 });
    const email = parseEmail(body.email);
    const password = parsePassword(body.password);
    const department = str(body.department, "Department", { max: 120, fallback: "Unassigned" });

    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      await recordLoginFailure(ipKey);
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "viewer",
        department,
        emailVerified: !verificationEnabled,
      },
    });

    if (verificationEnabled) {
      const code = await issueVerificationCode(user.id);
      const sent = await sendVerificationEmail(email, name, code);

      if (!sent.ok) {
        // Leave nothing behind that cannot be signed in to.
        await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
        console.error("Verification email failed:", sent.reason);
        return NextResponse.json(
          { error: "We could not send the verification email. Please try again later." },
          { status: 502 }
        );
      }
    }

    await prisma.activityLog.create({
      data: {
        action: "Registered",
        entity: email,
        entityType: "auth",
        userId: user.id,
        details: verificationEnabled
          ? "Self-service signup (viewer) — awaiting email verification"
          : "Self-service signup (viewer)",
      },
    });

    await recordLoginFailure(ipKey);

    return NextResponse.json(
      verificationEnabled
        ? { success: true, pendingVerification: email }
        : { success: true },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Register error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
