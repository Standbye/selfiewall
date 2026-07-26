"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import fs from "node:fs/promises";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { requireUser, requireOwnedEvent } from "@/lib/session";
import { generateEventToken } from "@/lib/token";
import { ensureEventDir, logoPath, bgImagePath, deleteEventDir } from "@/lib/storage";
import { applyModeration, type ModerationAction } from "@/lib/moderation";
import { FONT_OPTIONS } from "@/lib/fonts";
import { MAX_INPUT_PIXELS } from "@/lib/images";

const FONT_KEYS = FONT_OPTIONS.map((f) => f.key as string);
const WALL_STYLES = ["grid-live", "calm", "blur", "mosaic", "filmstrip"];

function isColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function eventFields(formData: FormData) {
  const title = (formData.get("title") as string | null)?.trim();
  const motto = (formData.get("motto") as string | null)?.trim() || null;
  const primaryColor = (formData.get("primaryColor") as string | null) ?? "#e11d48";
  const bgColor = (formData.get("bgColor") as string | null) ?? "#18181b";
  const polaroidColor = (formData.get("polaroidColor") as string | null) ?? "#ffffff";
  const moderationMode = formData.get("moderationMode") === "post" ? "post" : "pre";
  const fontRaw = (formData.get("fontFamily") as string | null) ?? "geist";
  const fontFamily = FONT_KEYS.includes(fontRaw) ? fontRaw : "geist";
  const wallRaw = (formData.get("wallStyle") as string | null) ?? "grid-live";
  const wallStyle = WALL_STYLES.includes(wallRaw) ? wallRaw : "grid-live";
  const textRaw = (formData.get("textColor") as string | null) ?? "auto";
  const textColor = ["auto", "light", "dark"].includes(textRaw) ? textRaw : "auto";
  const titleBackdrop = formData.get("titleBackdrop") === "on";
  const displaySeconds = Math.min(
    60,
    Math.max(3, parseInt((formData.get("displaySeconds") as string | null) ?? "8", 10) || 8)
  );
  const polaroidRadius = Math.min(
    24,
    Math.max(0, parseInt((formData.get("polaroidRadius") as string | null) ?? "4", 10) || 0)
  );
  const bgDim = Math.min(
    80,
    Math.max(0, parseInt((formData.get("bgDim") as string | null) ?? "40", 10) || 0)
  );
  const css = (name: string) =>
    (formData.get(name) as string | null)?.trim().slice(0, 10_000) || null;

  if (!title) throw new Error("Titel fehlt");
  if (!isColor(primaryColor) || !isColor(bgColor) || !isColor(polaroidColor)) {
    throw new Error("Ungültige Farbe");
  }
  return {
    title,
    motto,
    primaryColor,
    bgColor,
    polaroidColor,
    polaroidRadius,
    moderationMode,
    displaySeconds,
    fontFamily,
    wallStyle,
    textColor,
    titleBackdrop,
    bgDim,
    customCssUpload: css("customCssUpload"),
    customCssWall: css("customCssWall"),
    customCssStream: css("customCssStream"),
  };
}

async function saveLogo(eventId: string, formData: FormData): Promise<boolean> {
  const logo = formData.get("logo");
  if (!(logo instanceof File) || logo.size === 0) return false;
  if (logo.size > 5 * 1024 * 1024) throw new Error("Logo zu groß (max. 5 MB)");
  const buf = await sharp(Buffer.from(await logo.arrayBuffer()), {
    limitInputPixels: MAX_INPUT_PIXELS,
  })
    .resize(512, 512, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  ensureEventDir(eventId);
  await fs.writeFile(logoPath(eventId), buf);
  return true;
}

async function saveBgImage(eventId: string, formData: FormData): Promise<boolean> {
  const bg = formData.get("bgImage");
  if (!(bg instanceof File) || bg.size === 0) return false;
  if (bg.size > 10 * 1024 * 1024) throw new Error("Hintergrundbild zu groß (max. 10 MB)");
  const buf = await sharp(Buffer.from(await bg.arrayBuffer()), {
    limitInputPixels: MAX_INPUT_PIXELS,
  })
    .rotate()
    .resize(2560, 2560, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  ensureEventDir(eventId);
  await fs.writeFile(bgImagePath(eventId), buf);
  return true;
}

export async function createEvent(formData: FormData) {
  const user = await requireUser();
  const fields = eventFields(formData);
  const event = await prisma.event.create({
    data: { ...fields, token: generateEventToken(), ownerId: user.id },
  });
  const logoSaved = await saveLogo(event.id, formData);
  const bgSaved = await saveBgImage(event.id, formData);
  if (logoSaved || bgSaved) {
    await prisma.event.update({
      where: { id: event.id },
      data: {
        ...(logoSaved ? { logoPath: "logo.png" } : {}),
        ...(bgSaved ? { bgImagePath: "background.jpg" } : {}),
      },
    });
  }
  redirect(`/admin/events/${event.id}`);
}

export async function updateEvent(eventId: string, formData: FormData) {
  const { event } = await requireOwnedEvent(eventId);
  const fields = eventFields(formData);
  const logoSaved = await saveLogo(event.id, formData);
  const bgSaved = await saveBgImage(event.id, formData);
  const removeBg = formData.get("removeBgImage") === "on";
  if (removeBg && !bgSaved) {
    await fs.rm(bgImagePath(event.id), { force: true });
  }
  await prisma.event.update({
    where: { id: event.id },
    data: {
      ...fields,
      ...(logoSaved ? { logoPath: "logo.png" } : {}),
      ...(bgSaved ? { bgImagePath: "background.jpg" } : removeBg ? { bgImagePath: null } : {}),
    },
  });
  revalidatePath(`/admin/events/${event.id}`);
}

export async function setEventStatus(eventId: string, status: "active" | "closed") {
  const { event } = await requireOwnedEvent(eventId);
  await prisma.event.update({
    where: { id: event.id },
    data: { status, closedAt: status === "closed" ? new Date() : null },
  });
  revalidatePath(`/admin/events/${event.id}`);
}

/** Moderations-Link erzeugen bzw. neu generieren (alter Link verfällt). */
export async function regenerateModerationLink(eventId: string) {
  const { event } = await requireOwnedEvent(eventId);
  await prisma.event.update({
    where: { id: event.id },
    data: { moderationToken: generateEventToken() + generateEventToken() },
  });
  revalidatePath(`/admin/events/${event.id}`);
}

export async function revokeModerationLink(eventId: string) {
  const { event } = await requireOwnedEvent(eventId);
  await prisma.event.update({
    where: { id: event.id },
    data: { moderationToken: null },
  });
  revalidatePath(`/admin/events/${event.id}`);
}

export async function deleteEvent(eventId: string) {
  const { event } = await requireOwnedEvent(eventId);
  await prisma.event.delete({ where: { id: event.id } });
  deleteEventDir(event.id);
  redirect("/admin");
}

export async function moderatePhoto(photoId: string, action: ModerationAction) {
  const user = await requireUser();
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    include: { event: true },
  });
  if (!photo || photo.event.ownerId !== user.id) throw new Error("Nicht erlaubt");
  await applyModeration(photo, action);
}
