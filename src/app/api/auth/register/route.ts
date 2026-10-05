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
      },
    });

    await prisma.activityLog.create({
      data: {
        action: "Registered",
        entity: email,
        entityType: "auth",
        userId: user.id,
        details: "Self-service signup (viewer)",
      },
    });

    await recordLoginFailure(ipKey);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Register error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}