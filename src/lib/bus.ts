import { EventEmitter } from "node:events";

// Prozessweiter Event-Bus für SSE (eine Node-Instanz pro Container).
// Über globalThis abgelegt, damit Dev-HMR keine Listener verliert.
const globalForBus = globalThis as unknown as { photoBus?: EventEmitter };

export const photoBus =
  globalForBus.photoBus ??
  (() => {
    const bus = new EventEmitter();
    bus.setMaxListeners(0);
    return bus;
  })();

globalForBus.photoBus = photoBus;

export type WallPhoto = {
  id: string;
  type: string;
  name: string | null;
  message: string | null;
  likeCount: number;
  createdAt: string;
};

export function emitPhotoApproved(eventId: string, photo: WallPhoto) {
  photoBus.emit(`photo:${eventId}`, photo);
}

export function emitPhotoRemoved(eventId: string, photoId: string) {
  photoBus.emit(`photo-removed:${eventId}`, photoId);
}

export function emitLike(eventId: string, photoId: string, count: number) {
  photoBus.emit(`like:${eventId}`, { id: photoId, count });
}
