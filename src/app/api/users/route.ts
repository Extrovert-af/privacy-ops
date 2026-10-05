import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import {
  ValidationError,
  VALID_ROLES,
  str,
  oneOf,
  email as parseEmail,
  password as parsePassword,
} from "@/lib/validation";

export const publicFields = {
  id: true,
  name: true,
  email: true,
  role: true,
  department: true,
  avatarColor: true,
  active: true,
} as const;

/// Admins who skip the password field get a strong random one that is
/// returned once so it can be shared out of band.
function generatePassword(): string {
  return randomBytes(12).toString("base64url");
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { ...publicFields, createdAt: true },
  });

  return NextResponse.json(
    users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))
  );
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Only admins can create users" }, { status: 403 });
  }

  let user;
  let temporaryPassword: string | undefined;

  try {
    const body = await request.json();

    const name = str(body.name, "Name", { required: true, max: 120 });
    const email = parseEmail(body.email);
    const role = oneOf(body.role, "Role", VALID_ROLES, "viewer");
    const department = str(body.department, "Department", { fallback: "Unassigned" });

    if (body.password) {
      temporaryPassword = undefined;
    } else {
      temporaryPassword = generatePassword();
    }

    const password = body.password ? parsePassword(body.password) : temporaryPassword!;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 12);

    user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role,
        department,
        avatarColor: str(body.avatarColor, "Avatar colour", {
          fallback: "#6366f1",
          max: 7,
        }),
      },
      select: publicFields,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  await prisma.activityLog.create({
    data: {
      action: "User added",
      entity: user.name,
      entityType: "user",
      userId: session.user.id,
      details: `Role: ${user.role}`,
    },
  });

  return NextResponse.json(
    temporaryPassword ? { ...user, temporaryPassword } : user,
    { status: 201 }
  );
}