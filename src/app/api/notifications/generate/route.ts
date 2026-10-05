import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateDeadlineNotifications } from "@/lib/notifications";

/// Entry point for the deadline reminder job. Safe to run repeatedly: the
/// generator skips users who already have an unread alert of the same kind for
/// the same assessment.
export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (role !== "admin" && role !== "privacy_officer" && role !== "reviewer") {
    return NextResponse.json(
      { error: "Only reviewers, privacy officers, or admins can run the deadline reminder job" },
      { status: 403 }
    );
  }

  const result = await generateDeadlineNotifications();

  return NextResponse.json(result);
}
