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

  // Passwords are self-service only. Admin resets are deliberately not
  // allowed here so an admin account cannot silently take over another.
  if (session.user.id !== id) {
    return NextResponse.json(
      { error: "You can only change your own password" },
      { status: 403 }
    );
  }

  const rateKey = `password:${id}`;
  if (!(await checkLoginAllowed(rateKey))) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429 }
    );
  }

  let currentPassword: string;
  let newPassword: string;

  try {
    const body = await request.json();

    if (typeof body.currentPassword !== "string" || !body.currentPassword) {
      throw new ValidationError("Enter your current password");
    }

    currentPassword = body.currentPassword;
    newPassword = parsePassword(body.newPassword);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const matches = await bcrypt.compare(currentPassword, user.password);
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

  await prisma.activityLog.create({
    data: {
      action: "Changed password",
      entity: user.email,
      entityType: "auth",
      userId: session.user.id,
      details: "Self-service password change",
    },
  });

  return NextResponse.json({ success: true });
}
