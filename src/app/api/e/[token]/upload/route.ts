import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { ensureEventDir, photoPath } from "@/lib/storage";
import { emitPhotoApproved } from "@/lib/bus";
import { clientIp } from "@/lib/rate-limit";
import { guestCookieOptions } from "@/lib/cookies";
import { MAX_INPUT_PIXELS } from "@/lib/images";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const RATE_LIMIT_WINDOW_MS = 30 * 60 * 1000;
/** Pro Gerät: der eigentliche Spam-Schutz. */
const DEVICE_LIMIT = 10;
/**
 * Pro IP nur als Flut-Bremse — bewusst hoch: Auf einer Feier hängen alle
 * Gäste am selben WLAN bzw. Mobilfunk-NAT und teilen sich eine IP.
 */
const IP_LIMIT = 300;
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
      { error: "Dieses Event ist beendet – es können keine Beiträge mehr eingereicht werden." },
      { status: 410 }
    );
  }

  const formData = await req.formData();
  const type = formData.get("type") === "text" ? "text" : "photo";
  const file = formData.get("file");
  const name = (formData.get("name") as string | null)?.trim().slice(0, 50) || null;
  const message = (formData.get("message") as string | null)?.trim().slice(0, 300) || null;
  const consent = formData.get("consent");

  if (consent !== "true") {
    return NextResponse.json({ error: "Bitte bestätige die Einverständniserklärung." }, { status: 400 });
  }
  if (type === "text") {
    if (!message) {
      return NextResponse.json({ error: "Bitte schreibe eine Nachricht." }, { status: 400 });
    }
  } else {
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Kein Bild übermittelt." }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Das Bild ist zu groß (max. 15 MB)." }, { status: 413 });
    }
  }

  const ip = clientIp(req);
  let uploaderKey = req.cookies.get(UPLOADER_COOKIE)?.value;
  const isNewUploader = !uploaderKey;
  if (!uploaderKey) uploaderKey = crypto.randomUUID();

  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const deviceCount = await prisma.photo.count({
    where: { eventId: event.id, createdAt: { gte: since }, uploaderKey },
  });
  if (deviceCount >= DEVICE_LIMIT) {
    return NextResponse.json(
      { error: "Du hast gerade viele Beiträge geschickt – warte bitte ein paar Minuten." },
      { status: 429 }
    );
  }
  if (ip) {
    const ipCount = await prisma.photo.count({
      where: { eventId: event.id, createdAt: { gte: since }, ip },
    });
    if (ipCount >= IP_LIMIT) {
      return NextResponse.json(
        { error: "Gerade kommen sehr viele Beiträge herein – bitte kurz warten." },
        { status: 429 }
      );
    }
  }

  // Bei Bildern: serverseitig immer neu kodieren (Orientierung, EXIF-Entfernung,
  // Absicherung gegen Nicht-Bilder)
  let fullBuffer: Buffer | null = null;
  let thumbBuffer: Buffer | null = null;
  if (type === "photo") {
    try {
      const input = Buffer.from(await (file as File).arrayBuffer());
      const base = sharp(input, {
        failOn: "error",
        limitInputPixels: MAX_INPUT_PIXELS,
      }).rotate();
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
  }

  const status = event.moderationMode === "post" ? "approved" : "pending";
  const photo = await prisma.photo.create({
    data: {
      eventId: event.id,
      type,
      name,
      message,
      status,
      uploaderKey,
      ip,
      approvedAt: status === "approved" ? new Date() : null,
    },
  });

  if (type === "photo" && fullBuffer && thumbBuffer) {
    ensureEventDir(event.id);
    await fs.writeFile(photoPath(event.id, photo.id, "full"), fullBuffer);
    await fs.writeFile(photoPath(event.id, photo.id, "thumb"), thumbBuffer);
  }

  if (status === "approved") {
    emitPhotoApproved(event.id, {
      id: photo.id,
      type: photo.type,
      name: photo.name,
      message: photo.message,
      likeCount: 0,
      createdAt: photo.createdAt.toISOString(),
    });
  }

  const res = NextResponse.json({ id: photo.id, status });
  if (isNewUploader) {
    res.cookies.set(UPLOADER_COOKIE, uploaderKey, guestCookieOptions());
  }
  return res;
}
