import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";
import { photoPath, logoPath, bgImagePath } from "@/lib/storage";

export const dynamic = "force-dynamic";

async function serveStatic(file: string, contentType: string) {
  try {
    const buf = await fs.readFile(file);
    return new NextResponse(new Uint8Array(buf), {
      headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=300" },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const variant = req.nextUrl.searchParams.get("v") === "thumb" ? "thumb" : "full";

  // Sonderfälle: Event-Logo (/api/img/logo-<eventId>) und
  // Hintergrundbild (/api/img/bg-<eventId>)
  if (id.startsWith("logo-")) {
    const event = await prisma.event.findUnique({ where: { id: id.slice(5) } });
    if (!event?.logoPath) return new NextResponse("Not found", { status: 404 });
    return serveStatic(logoPath(event.id), "image/png");
  }
  if (id.startsWith("bg-")) {
    const event = await prisma.event.findUnique({ where: { id: id.slice(3) } });
    if (!event?.bgImagePath) return new NextResponse("Not found", { status: 404 });
    return serveStatic(bgImagePath(event.id), "image/jpeg");
  }

  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo || photo.type !== "photo") return new NextResponse("Not found", { status: 404 });

  // Nicht freigegebene Bilder sehen nur der Event-Besitzer oder Inhaber
  // des Moderations-Links (?mt=<token>)
  if (photo.status !== "approved") {
    const modToken = req.nextUrl.searchParams.get("mt");
    const event = await prisma.event.findUnique({ where: { id: photo.eventId } });
    if (!event) return new NextResponse("Not found", { status: 404 });
    const viaModLink = !!modToken && !!event.moderationToken && modToken === event.moderationToken;
    if (!viaModLink) {
      const user = await getUser();
      if (!user || event.ownerId !== user.id) {
        return new NextResponse("Forbidden", { status: 403 });
      }
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
