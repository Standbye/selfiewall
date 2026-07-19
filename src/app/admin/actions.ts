"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import fs from "node:fs/promises";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { requireUser, requireOwnedEvent } from "@/lib/session";
import { generateEventToken } from "@/lib/token";
import { ensureEventDir, logoPath, deletePhotoFiles, deleteEventDir } from "@/lib/storage";
import { emitPhotoApproved, emitPhotoRemoved } from "@/lib/bus";

function eventFields(formData: FormData) {
  const title = (formData.get("title") as string | null)?.trim();
  const motto = (formData.get("motto") as string | null)?.trim() || null;
  const primaryColor = (formData.get("primaryColor") as string | null) ?? "#e11d48";
  const bgColor = (formData.get("bgColor") as string | null) ?? "#18181b";
  const moderationMode = formData.get("moderationMode") === "post" ? "post" : "pre";
  const displaySeconds = Math.min(
    60,
    Math.max(3, parseInt((formData.get("displaySeconds") as string | null) ?? "8", 10) || 8)
  );
  if (!title) throw new Error("Titel fehlt");
  if (!/^#[0-9a-fA-F]{6}$/.test(primaryColor) || !/^#[0-9a-fA-F]{6}$/.test(bgColor)) {
    throw new Error("Ungültige Farbe");
  }
  return { title, motto, primaryColor, bgColor, moderationMode, displaySeconds };
}

async function saveLogo(eventId: string, formData: FormData): Promise<boolean> {
  const logo = formData.get("logo");
  if (!(logo instanceof File) || logo.size === 0) return false;
  if (logo.size > 5 * 1024 * 1024) throw new Error("Logo zu groß (max. 5 MB)");
  const buf = await sharp(Buffer.from(await logo.arrayBuffer()))
    .resize(512, 512, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  ensureEventDir(eventId);
  await fs.writeFile(logoPath(eventId), buf);
  return true;
}

export async function createEvent(formData: FormData) {
  const user = await requireUser();
  const fields = eventFields(formData);
  const event = await prisma.event.create({
    data: { ...fields, token: generateEventToken(), ownerId: user.id },
  });
  if (await saveLogo(event.id, formData)) {
    await prisma.event.update({ where: { id: event.id }, data: { logoPath: "logo.png" } });
  }
  redirect(`/admin/events/${event.id}`);
}

export async function updateEvent(eventId: string, formData: FormData) {
  const { event } = await requireOwnedEvent(eventId);
  const fields = eventFields(formData);
  const logoSaved = await saveLogo(event.id, formData);
  await prisma.event.update({
    where: { id: event.id },
    data: { ...fields, ...(logoSaved ? { logoPath: "logo.png" } : {}) },
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

export async function deleteEvent(eventId: string) {
  const { event } = await requireOwnedEvent(eventId);
  await prisma.event.delete({ where: { id: event.id } });
  deleteEventDir(event.id);
  redirect("/admin");
}

export async function moderatePhoto(
  photoId: string,
  action: "approve" | "reject" | "delete"
) {
  const user = await requireUser();
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    include: { event: true },
  });
  if (!photo || photo.event.ownerId !== user.id) throw new Error("Nicht erlaubt");

  if (action === "delete") {
    await prisma.photo.delete({ where: { id: photo.id } });
    deletePhotoFiles(photo.eventId, photo.id);
    emitPhotoRemoved(photo.eventId, photo.id);
    return;
  }

  const status = action === "approve" ? "approved" : "rejected";
  const updated = await prisma.photo.update({
    where: { id: photo.id },
    data: { status, approvedAt: status === "approved" ? new Date() : photo.approvedAt },
  });
  if (status === "approved" && photo.status !== "approved") {
    emitPhotoApproved(photo.eventId, {
      id: updated.id,
      name: updated.name,
      message: updated.message,
      createdAt: updated.createdAt.toISOString(),
    });
  }
  if (status === "rejected" && photo.status === "approved") {
    emitPhotoRemoved(photo.eventId, photo.id);
  }
}
