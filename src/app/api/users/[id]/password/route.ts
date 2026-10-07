import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { ValidationError, password as parsePassword } from "@/lib/validation";
import {
  checkLoginAllowed,
  recordLoginFailure,
  clearLoginFailures,
} from "@/lib/rate-limit";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const isSelf = session.user.id === id;
  const isAdmin = session.user.role === "admin";

  // Self-service for your own password; admins may reset anyone else's,
  // which is the only recovery path when an account is locked out.
  if (!isSelf && !isAdmin) {
    return NextResponse.json(
      { error: "You can only change your own password" },
      { status: 403 }
    );
  }

  let currentPassword: string | undefined;
  let newPassword: string;

  try {
    const body = await request.json();

    if (typeof body.currentPassword === "string" && body.currentPassword) {
      currentPassword = body.currentPassword;
    }

    if (isSelf && !currentPassword) {
      throw new ValidationError("Enter your current password");
    }

    newPassword = parsePassword(body.newPassword);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Rate limit only the guessable path — an admin reset has no secret to
  // brute-force, and keying it on the target would lock that user out of
  // changing their own password.
  if (isSelf) {
    const rateKey = `password:${id}`;
    if (!(await checkLoginAllowed(rateKey))) {
      return NextResponse.json(
        { error: "Too many attempts. Try again in a few minutes." },
        { status: 429 }
      );
    }

    const matches = await bcrypt.compare(currentPassword!, user.password);
    if (!matches) {
      await recordLoginFailure(rateKey);
      return NextResponse.json(
        { error: "Your current password is incorrect" },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "Choose a password different from your current one" },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id },
      data: { password: await bcrypt.hash(newPassword, 12) },
    });

    await clearLoginFailures(rateKey);
  } else {
    await prisma.user.update({
      where: { id },
      data: { password: await bcrypt.hash(newPassword, 12) },
    });
  }

  await prisma.activityLog.create({
    data: {
      action: "Changed password",
      entity: user.email,
      entityType: "auth",
      userId: session.user.id,
      details: isSelf ? "Self-service password change" : "Reset by admin",
    },
  });

  return NextResponse.json({ success: true });
}
