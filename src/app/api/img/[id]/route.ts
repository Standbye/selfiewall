import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";
import { photoPath, logoPath } from "@/lib/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const variant = req.nextUrl.searchParams.get("v") === "thumb" ? "thumb" : "full";

  // Sonderfall Event-Logo: /api/img/logo-<eventId>
  if (id.startsWith("logo-")) {
    const event = await prisma.event.findUnique({ where: { id: id.slice(5) } });
    if (!event?.logoPath) return new NextResponse("Not found", { status: 404 });
    try {
      const buf = await fs.readFile(logoPath(event.id));
      return new NextResponse(new Uint8Array(buf), {
        headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=300" },
      });
    } catch {
      return new NextResponse("Not found", { status: 404 });
    }
  }

  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo) return new NextResponse("Not found", { status: 404 });

  // Nicht freigegebene Bilder sieht nur der Event-Besitzer (Moderation)
  if (photo.status !== "approved") {
    const user = await getUser();
    if (!user) return new NextResponse("Forbidden", { status: 403 });
    const event = await prisma.event.findUnique({ where: { id: photo.eventId } });
    if (!event || event.ownerId !== user.id) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  try {
    const buf = await fs.readFile(photoPath(photo.eventId, photo.id, variant));
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control":
          photo.status === "approved"
            ? "public, max-age=31536000, immutable"
            : "private, no-cache",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
