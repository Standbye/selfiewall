import fs from "node:fs";
import path from "node:path";

export const DATA_DIR = path.resolve(process.env.DATA_DIR ?? "./data");

export function eventDir(eventId: string) {
  return path.join(DATA_DIR, "uploads", eventId);
}

export function photoPath(eventId: string, photoId: string, variant: "full" | "thumb") {
  return path.join(eventDir(eventId), variant === "full" ? `${photoId}.jpg` : `${photoId}_thumb.jpg`);
}

export function logoPath(eventId: string) {
  return path.join(eventDir(eventId), "logo.png");
}

export function ensureEventDir(eventId: string) {
  fs.mkdirSync(eventDir(eventId), { recursive: true });
}

export function deletePhotoFiles(eventId: string, photoId: string) {
  for (const variant of ["full", "thumb"] as const) {
    fs.rmSync(photoPath(eventId, photoId, variant), { force: true });
  }
}

export function deleteEventDir(eventId: string) {
  fs.rmSync(eventDir(eventId), { recursive: true, force: true });
}
