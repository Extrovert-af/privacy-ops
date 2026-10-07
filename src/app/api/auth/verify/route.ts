import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ValidationError, email as parseEmail, str } from "@/lib/validation";
import { clientIp, checkLoginAllowed, recordLoginFailure, clearLoginFailures } from "@/lib/rate-limit";
import { verifyCode } from "@/lib/verification";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = parseEmail(body.email);
    const code = str(body.code, "Verification code", { required: true, max: 12 });

    const key = `verify:${email}:${clientIp(req)}`;

    if (!(await checkLoginAllowed(key))) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait before trying again." },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Never reveal whether an address is registered.
    if (!user) {
      await recordLoginFailure(key);
      return NextResponse.json(
        { error: "That code is not valid. Check the code and try again." },
        { status: 400 }
      );
    }

    if (user.emailVerified && !user.verificationCode) {
      return NextResponse.json({ success: true, alreadyVerified: true });
    }

    const outcome = await verifyCode(email, code);

    if (outcome !== "ok") {
      await recordLoginFailure(key);

      const message =
        outcome === "expired"
          ? "That code has expired. Request a new one."
          : "That code is not valid. Check the code and try again.";

      return NextResponse.json({ error: message, expired: outcome === "expired" }, { status: 400 });
    }

    await clearLoginFailures(key);

    await prisma.activityLog
      .create({
        data: {
          action: "Email verified",
          entity: email,
          entityType: "auth",
          userId: user.id,
          details: "Self-service signup completed",
        },
      })
      .catch(() => undefined);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Verify error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
