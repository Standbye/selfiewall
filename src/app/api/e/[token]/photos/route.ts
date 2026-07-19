import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const event = await prisma.event.findUnique({ where: { token } });
  if (!event) {
    return NextResponse.json({ error: "Event nicht gefunden." }, { status: 404 });
  }

  const order = req.nextUrl.searchParams.get("order") === "desc" ? "desc" : "asc";
  const deviceKey = req.cookies.get("sw_uploader")?.value;

  const photos = await prisma.photo.findMany({
    where: { eventId: event.id, status: "approved" },
    orderBy: { createdAt: order },
    select: {
      id: true,
      type: true,
      name: true,
      message: true,
      createdAt: true,
      _count: { select: { likes: true } },
      ...(deviceKey
        ? { likes: { where: { deviceKey }, select: { id: true } } }
        : {}),
    },
  });

  return NextResponse.json({
    photos: photos.map((p) => ({
      id: p.id,
      type: p.type,
      name: p.name,
      message: p.message,
      createdAt: p.createdAt,
      likeCount: p._count.likes,
      likedByMe: deviceKey ? (p as { likes?: { id: string }[] }).likes!.length > 0 : false,
    })),
  });
}
