import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import sharp from "sharp";
import fs from "node:fs/promises";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureEventDir, photoPath } from "@/lib/storage";
import { emitPhotoApproved } from "@/lib/bus";

const MAX_FILES = 50;
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/**
 * Batch-Upload für den Event-Besitzer: mehrere Bilder auf einmal, ohne
 * Rate-Limit, direkt freigegeben (der Hochladende ist der Moderator).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event || event.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const message = (formData.get("message") as string | null)?.trim().slice(0, 300) || null;

  if (files.length === 0) {
    return NextResponse.json({ error: "Keine Bilder ausgewählt." }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Maximal ${MAX_FILES} Bilder pro Batch.` }, { status: 400 });
  }

  let uploaded = 0;
  let failed = 0;
  ensureEventDir(event.id);

  for (const file of files) {
    if (file.size > MAX_UPLOAD_BYTES) {
      failed++;
      continue;
    }
    try {
      const input = Buffer.from(await file.arrayBuffer());
      const base = sharp(input, { failOn: "error" }).rotate();
      const fullBuffer = await base
        .clone()
        .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      const thumbBuffer = await base
        .clone()
        .resize(400, 400, { fit: "cover" })
        .jpeg({ quality: 75 })
        .toBuffer();

      const photo = await prisma.photo.create({
        data: {
          eventId: event.id,
          type: "photo",
          message,
          status: "approved",
          uploaderKey: `batch:${session.user.id}`,
          approvedAt: new Date(),
        },
      });
      await fs.writeFile(photoPath(event.id, photo.id, "full"), fullBuffer);
      await fs.writeFile(photoPath(event.id, photo.id, "thumb"), thumbBuffer);
      emitPhotoApproved(event.id, {
        id: photo.id,
        type: photo.type,
        name: photo.name,
        message: photo.message,
        likeCount: 0,
        createdAt: photo.createdAt.toISOString(),
      });
      uploaded++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ uploaded, failed });
}
