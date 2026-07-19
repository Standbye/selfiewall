import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findEventByModerationToken } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Bilderliste für Moderations-Link-Nutzer (ohne Login). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ modToken: string }> }
) {
  const { modToken } = await params;
  const event = await findEventByModerationToken(modToken);
  if (!event) return NextResponse.json({ error: "Ungültiger Link." }, { status: 404 });

  const photos = await prisma.photo.findMany({
    where: { eventId: event.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, type: true, name: true, message: true, status: true, createdAt: true },
  });
  return NextResponse.json({ photos });
}
