import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findEventByModerationToken } from "@/lib/session";
import { applyModeration, type ModerationAction } from "@/lib/moderation";

/** Moderationsaktion über den geheimen Moderations-Link (ohne Login). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ modToken: string; id: string }> }
) {
  const { modToken, id } = await params;
  const event = await findEventByModerationToken(modToken);
  if (!event) return NextResponse.json({ error: "Ungültiger Link." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const action = body.action as ModerationAction;
  if (!["approve", "reject", "delete"].includes(action)) {
    return NextResponse.json({ error: "Unbekannte Aktion." }, { status: 400 });
  }

  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo || photo.eventId !== event.id) {
    return NextResponse.json({ error: "Beitrag nicht gefunden." }, { status: 404 });
  }

  await applyModeration(photo, action);
  return NextResponse.json({ ok: true });
}
