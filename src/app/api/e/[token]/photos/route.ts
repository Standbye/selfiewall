import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const event = await prisma.event.findUnique({ where: { token } });
  if (!event) {
    return NextResponse.json({ error: "Event nicht gefunden." }, { status: 404 });
  }
  const photos = await prisma.photo.findMany({
    where: { eventId: event.id, status: "approved" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, message: true, createdAt: true },
  });
  return NextResponse.json({ photos });
}
