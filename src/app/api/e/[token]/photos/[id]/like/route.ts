import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { emitLike } from "@/lib/bus";

const UPLOADER_COOKIE = "sw_uploader";

/** Like togglen — ohne Account, Doppel-Like-Schutz über das Geräte-Cookie. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; id: string }> }
) {
  const { token, id } = await params;
  const event = await prisma.event.findUnique({ where: { token } });
  if (!event) return NextResponse.json({ error: "Event nicht gefunden." }, { status: 404 });

  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo || photo.eventId !== event.id || photo.status !== "approved") {
    return NextResponse.json({ error: "Beitrag nicht gefunden." }, { status: 404 });
  }

  let deviceKey = req.cookies.get(UPLOADER_COOKIE)?.value;
  const isNewDevice = !deviceKey;
  if (!deviceKey) deviceKey = crypto.randomUUID();

  const existing = await prisma.like.findUnique({
    where: { photoId_deviceKey: { photoId: photo.id, deviceKey } },
  });
  let liked: boolean;
  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    liked = false;
  } else {
    await prisma.like.create({ data: { photoId: photo.id, deviceKey } });
    liked = true;
  }

  const count = await prisma.like.count({ where: { photoId: photo.id } });
  emitLike(event.id, photo.id, count);

  const res = NextResponse.json({ liked, count });
  if (isNewDevice) {
    res.cookies.set(UPLOADER_COOKIE, deviceKey, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
  }
  return res;
}
