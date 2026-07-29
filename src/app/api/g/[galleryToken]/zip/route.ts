import { NextRequest } from "next/server";
import { PassThrough, Readable } from "node:stream";
import fs from "node:fs";
import { ZipArchive } from "archiver";
import { prisma } from "@/lib/prisma";
import { photoPath } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Öffentlicher ZIP-Download über den Galerie-Link (ohne Login). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ galleryToken: string }> }
) {
  const { galleryToken } = await params;
  const event = await prisma.event.findUnique({ where: { galleryToken } });
  if (!event || !event.galleryEnabled) {
    return new Response("Not found", { status: 404 });
  }

  const photos = await prisma.photo.findMany({
    where: { eventId: event.id, status: "approved", type: "photo" },
    orderBy: { createdAt: "asc" },
  });

  const archive = new ZipArchive({ zlib: { level: 0 } });
  const out = new PassThrough();
  archive.pipe(out);

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const file = photoPath(event.id, photo.id, "full");
    if (!fs.existsSync(file)) continue;
    const num = String(i + 1).padStart(3, "0");
    const namePart = photo.name
      ? "_" + photo.name.replace(/[^\p{L}\p{N}_-]+/gu, "-").slice(0, 30)
      : "";
    archive.file(file, { name: `${num}${namePart}.jpg` });
  }
  void archive.finalize();

  const safeTitle = event.title.replace(/[^\p{L}\p{N}_-]+/gu, "-").slice(0, 50) || "event";
  return new Response(Readable.toWeb(out) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="selfiewall-${safeTitle}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
