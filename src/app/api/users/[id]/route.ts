import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import {
  ValidationError,
  VALID_ROLES,
  str,
  oneOf,
  email as parseEmail,
} from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

const publicFields = {
  id: true,
  name: true,
  email: true,
  role: true,
  department: true,
  avatarColor: true,
  active: true,
} as const;

export async function PUT(request: Request, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const isAdmin = session.user.role === "admin";
  const isSelf = session.user.id === id;

  if (!isAdmin && !isSelf) {
    return NextResponse.json(
      { error: "Only admins can edit other users" },
      { status: 403 }
    );
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};

  try {
    const body = await request.json();

    if (body.name !== undefined) {
      data.name = str(body.name, "Name", { required: true, max: 120 });
    }

    if (body.department !== undefined) {
      data.department = str(body.department, "Department", { fallback: "Unassigned" });
    }

    if (body.email !== undefined) {
      // Changing your own email is treated as an identity change and is
      // admin-only so it cannot be used to take over an account silently.
      if (!isAdmin) {
        return NextResponse.json(
          { error: "Only admins can change email addresses" },
          { status: 403 }
        );
      }
      data.email = parseEmail(body.email);
    }

    const touchesPrivileges =
      body.role !== undefined || body.active !== undefined;

    if (touchesPrivileges) {
      if (!isAdmin) {
        return NextResponse.json(
          { error: "Only admins can change roles or activate/deactivate accounts" },
          { status: 403 }
        );
      }

      if (isSelf && body.active === false) {
        return NextResponse.json(
          { error: "You cannot deactivate your own account" },
          { status: 400 }
        );
      }

      if (isSelf && body.role !== undefined && body.role !== "admin") {
        return NextResponse.json(
          { error: "You cannot remove your own admin role" },
          { status: 400 }
        );
      }

      if (body.role !== undefined) {
        const nextRole = oneOf(body.role, "Role", VALID_ROLES);

        if (target.role === "admin" && nextRole !== "admin") {
          const admins = await prisma.user.count({
            where: { role: "admin", active: true, id: { not: id } },
          });
          if (admins === 0) {
            return NextResponse.json(
              { error: "At least one active admin must remain" },
              { status: 400 }
            );
          }
        }

        data.role = nextRole;
      }

      if (body.active !== undefined) {
        if (typeof body.active !== "boolean") {
          throw new ValidationError("Active must be true or false");
        }
        if (target.role === "admin" && body.active === false) {
          const admins = await prisma.user.count({
            where: { role: "admin", active: true, id: { not: id } },
          });
          if (admins === 0) {
            return NextResponse.json(
              { error: "At least one active admin must remain" },
              { status: 400 }
            );
          }
        }
        data.active = body.active;
      }
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(target);
  }

  if (data.email && data.email !== target.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email as string } });
    if (existing && existing.id !== id) {
      return NextResponse.json(
        { error: "Another user already uses that email" },
        { status: 409 }
      );
    }
  }

  const user = await prisma.user.update({ where: { id }, data, select: publicFields });

  await prisma.activityLog.create({
    data: {
      action: "Updated user",
      entity: user.email,
      entityType: "user",
      userId: session.user.id,
      details: Object.keys(data).join(", "),
    },
  });

  return NextResponse.json(user);
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Only admins can delete users" }, { status: 403 });
  }

  const { id } = await params;
  if (id === session.user.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account" },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [assessmentCount, riskCount] = await Promise.all([
    prisma.assessment.count({
      where: { OR: [{ createdBy: id }, { assigneeId: id }] },
    }),
    prisma.risk.count({ where: { ownerId: id } }),
  ]);

  // Deactivate instead of deleting when the user still owns compliance
  // records, so the audit trail is never broken.
  if (assessmentCount > 0 || riskCount > 0) {
    const user = await prisma.user.update({
      where: { id },
      data: { active: false },
      select: publicFields,
    });

    await prisma.activityLog.create({
      data: {
        action: "Deactivated user",
        entity: target.email,
        entityType: "user",
        userId: session.user.id,
        details: `Owns ${assessmentCount} assessment(s) and ${riskCount} risk(s); account deactivated instead of deleted`,
      },
    });

    return NextResponse.json({
      ok: true,
      deactivated: true,
      user,
      message: `This user owns ${assessmentCount} assessment(s) and ${riskCount} risk(s), so the account was deactivated instead of deleted.`,
    });
  }

  await prisma.activityLog.deleteMany({ where: { userId: id } });
  await prisma.user.delete({ where: { id } });

  await prisma.activityLog.create({
    data: {
      action: "Deleted user",
      entity: target.email,
      entityType: "user",
      userId: session.user.id,
      details: "Account removed",
    },
  });

  return NextResponse.json({ ok: true });
}