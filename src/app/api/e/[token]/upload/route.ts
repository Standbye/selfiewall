import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { ensureEventDir, photoPath } from "@/lib/storage";
import { emitPhotoApproved } from "@/lib/bus";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const RATE_LIMIT_COUNT = 10;
const RATE_LIMIT_WINDOW_MS = 30 * 60 * 1000;
const UPLOADER_COOKIE = "sw_uploader";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const event = await prisma.event.findUnique({ where: { token } });
  if (!event) {
    return NextResponse.json({ error: "Event nicht gefunden." }, { status: 404 });
  }
  if (event.status !== "active") {
    return NextResponse.json(
      { error: "Dieses Event ist beendet – es können keine Bilder mehr hochgeladen werden." },
      { status: 410 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const name = (formData.get("name") as string | null)?.trim().slice(0, 50) || null;
  const message = (formData.get("message") as string | null)?.trim().slice(0, 200) || null;
  const consent = formData.get("consent");

  if (consent !== "true") {
    return NextResponse.json({ error: "Bitte bestätige die Einverständniserklärung." }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Kein Bild übermittelt." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Das Bild ist zu groß (max. 15 MB)." }, { status: 413 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;
  let uploaderKey = req.cookies.get(UPLOADER_COOKIE)?.value;
  const isNewUploader = !uploaderKey;
  if (!uploaderKey) uploaderKey = crypto.randomUUID();

  // Rate-Limit: max. 10 Bilder pro 30 Minuten pro Gerät bzw. IP
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const recent = await prisma.photo.count({
    where: {
      eventId: event.id,
      createdAt: { gte: since },
      OR: [{ uploaderKey }, ...(ip ? [{ ip }] : [])],
    },
  });
  if (recent >= RATE_LIMIT_COUNT) {
    return NextResponse.json(
      { error: "Du hast gerade viele Bilder hochgeladen – warte bitte ein paar Minuten." },
      { status: 429 }
    );
  }

  // Serverseitig immer neu kodieren: normalisiert Orientierung, entfernt
  // EXIF-Daten und stellt sicher, dass nur echte Bilder gespeichert werden.
  let fullBuffer: Buffer;
  let thumbBuffer: Buffer;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const base = sharp(input, { failOn: "error" }).rotate();
    fullBuffer = await base
      .clone()
      .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    thumbBuffer = await base
      .clone()
      .resize(400, 400, { fit: "cover" })
      .jpeg({ quality: 75 })
      .toBuffer();
  } catch {
    return NextResponse.json(
      { error: "Das Bild konnte nicht verarbeitet werden – bitte versuche ein anderes." },
      { status: 422 }
    );
  }

  const status = event.moderationMode === "post" ? "approved" : "pending";
  const photo = await prisma.photo.create({
    data: {
      eventId: event.id,
      name,
      message,
      status,
      uploaderKey,
      ip,
      approvedAt: status === "approved" ? new Date() : null,
    },
  });

  ensureEventDir(event.id);
  await fs.writeFile(photoPath(event.id, photo.id, "full"), fullBuffer);
  await fs.writeFile(photoPath(event.id, photo.id, "thumb"), thumbBuffer);

  if (status === "approved") {
    emitPhotoApproved(event.id, {
      id: photo.id,
      name: photo.name,
      message: photo.message,
      createdAt: photo.createdAt.toISOString(),
    });
  }

  const res = NextResponse.json({ id: photo.id, status });
  if (isNewUploader) {
    res.cookies.set(UPLOADER_COOKIE, uploaderKey, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
  }
  return res;
}
