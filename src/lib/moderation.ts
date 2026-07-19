import { prisma } from "./prisma";
import { deletePhotoFiles } from "./storage";
import { emitPhotoApproved, emitPhotoRemoved } from "./bus";
import type { Photo } from "@/generated/prisma/client";

export type ModerationAction = "approve" | "reject" | "delete";

/**
 * Gemeinsame Moderationslogik für eingeloggte Veranstalter und
 * Moderations-Link-Nutzer: Statuswechsel, Dateien, SSE-Events.
 */
export async function applyModeration(photo: Photo, action: ModerationAction) {
  if (action === "delete") {
    await prisma.photo.delete({ where: { id: photo.id } });
    if (photo.type === "photo") deletePhotoFiles(photo.eventId, photo.id);
    emitPhotoRemoved(photo.eventId, photo.id);
    return;
  }

  const status = action === "approve" ? "approved" : "rejected";
  const updated = await prisma.photo.update({
    where: { id: photo.id },
    data: { status, approvedAt: status === "approved" ? new Date() : photo.approvedAt },
    include: { _count: { select: { likes: true } } },
  });
  if (status === "approved" && photo.status !== "approved") {
    emitPhotoApproved(photo.eventId, {
      id: updated.id,
      type: updated.type,
      name: updated.name,
      message: updated.message,
      likeCount: updated._count.likes,
      createdAt: updated.createdAt.toISOString(),
    });
  }
  if (status === "rejected" && photo.status === "approved") {
    emitPhotoRemoved(photo.eventId, photo.id);
  }
}
