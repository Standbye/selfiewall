"use client";

import { useRef, useState } from "react";
import { DrawCanvas } from "./DrawCanvas";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

type Mode = "idle" | "photo" | "draw" | "text";

/** Verkleinert das Bild clientseitig – spart Zeit im Party-WLAN. */
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      JPEG_QUALITY
    )
  );
}

export function UploadForm({
  token,
  primaryColor,
  preModeration,
}: {
  token: string;
  primaryColor: string;
  preModeration: boolean;
}) {
  const [mode, setMode] = useState<Mode>("idle");
  const [file, setFile] = useState<File | Blob | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"photo" | "text" | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  function pickFile(picked: File | Blob | null, alreadyCompressed = false) {
    setError(null);
    setFile(picked);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(picked ? URL.createObjectURL(picked) : null);
    setMode(picked ? "photo" : "idle");
    if (picked && alreadyCompressed) setIsDrawing(true);
    else setIsDrawing(false);
  }

  function reset() {
    pickFile(null);
    setMessage("");
    setConsent(false);
    setDone(null);
    setMode("idle");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent || busy) return;
    if (mode === "text" && !message.trim()) return;
    if (mode !== "text" && !file) return;
    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      if (mode === "text") {
        formData.append("type", "text");
      } else {
        let blob: Blob = file!;
        if (!isDrawing && file instanceof File) {
          try {
            blob = await compressImage(file);
          } catch {
            // Kompression fehlgeschlagen → Original hochladen, der Server
            // verkleinert ohnehin nochmal.
          }
        }
        formData.append("file", blob, "photo.jpg");
      }
      formData.append("name", name);
      formData.append("message", message);
      formData.append("consent", "true");
      const res = await fetch(`/api/e/${token}/upload`, { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Senden fehlgeschlagen – bitte versuche es nochmal.");
        return;
      }
      setDone(mode === "text" ? "text" : "photo");
    } catch {
      setError("Senden fehlgeschlagen – bitte prüfe deine Verbindung.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl bg-white/10 p-8 text-center text-white">
        <p className="text-5xl">🎉</p>
        <p className="mt-4 text-lg font-semibold">
          {done === "text" ? "Danke für deine Nachricht!" : "Danke für dein Bild!"}
        </p>
        <p className="mt-1 text-sm text-white/70">
          {preModeration
            ? "Dein Beitrag wird kurz geprüft und erscheint dann auf der Wall."
            : "Dein Beitrag erscheint gleich auf der Wall – schau hin!"}
        </p>
        <div className="mt-6 space-y-2">
          <a
            href={`/e/${token}/wall`}
            className="block w-full rounded-xl py-3 font-semibold text-white transition"
            style={{ backgroundColor: primaryColor }}
          >
            📺 Wall ansehen
          </a>
          <button
            onClick={reset}
            className="w-full rounded-xl bg-white/10 py-3 font-semibold text-white transition hover:bg-white/15"
          >
            Noch einen Beitrag schicken
          </button>
        </div>
      </div>
    );
  }

  if (mode === "draw") {
    return (
      <DrawCanvas
        primaryColor={primaryColor}
        onCancel={() => setMode("idle")}
        onDone={(blob) => pickFile(blob, true)}
      />
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
      />
      <input
        ref={galleryInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
      />

      {mode === "photo" && previewUrl ? (
        <div className="relative overflow-hidden rounded-2xl bg-black/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Vorschau" className="max-h-96 w-full object-contain" />
          <button
            type="button"
            onClick={() => pickFile(null)}
            className="absolute right-2 top-2 rounded-full bg-black/60 px-3 py-1 text-sm text-white"
          >
            ✕ Verwerfen
          </button>
        </div>
      ) : mode === "text" ? (
        <div className="rounded-2xl bg-white/10 p-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={300}
            rows={5}
            autoFocus
            placeholder="Deine Nachricht an die Wall …"
            className="w-full resize-none rounded-xl border-0 bg-transparent text-lg text-white placeholder-white/50 focus:outline-none"
          />
          <div className="flex items-center justify-between text-xs text-white/50">
            <button type="button" onClick={() => setMode("idle")} className="underline">
              Abbrechen
            </button>
            <span>{message.length}/300</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => cameraInput.current?.click()}
            className="rounded-2xl bg-white/10 p-5 text-center text-white transition hover:bg-white/15"
          >
            <span className="block text-4xl">🤳</span>
            <span className="mt-2 block font-semibold">Selfie machen</span>
          </button>
          <button
            type="button"
            onClick={() => galleryInput.current?.click()}
            className="rounded-2xl bg-white/10 p-5 text-center text-white transition hover:bg-white/15"
          >
            <span className="block text-4xl">🖼️</span>
            <span className="mt-2 block font-semibold">Aus Galerie</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("draw")}
            className="rounded-2xl bg-white/10 p-5 text-center text-white transition hover:bg-white/15"
          >
            <span className="block text-4xl">🎨</span>
            <span className="mt-2 block font-semibold">Bild malen</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("text")}
            className="rounded-2xl bg-white/10 p-5 text-center text-white transition hover:bg-white/15"
          >
            <span className="block text-4xl">💬</span>
            <span className="mt-2 block font-semibold">Nachricht schreiben</span>
          </button>
        </div>
      )}

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={50}
        placeholder="Dein Name (optional)"
        className="w-full rounded-xl border-0 bg-white/10 px-4 py-3 text-white placeholder-white/50 focus:bg-white/15 focus:outline-none"
      />
      {mode !== "text" && (
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={300}
          placeholder="Kurzer Gruß (optional)"
          className="w-full rounded-xl border-0 bg-white/10 px-4 py-3 text-white placeholder-white/50 focus:bg-white/15 focus:outline-none"
        />
      )}

      <label className="flex items-start gap-3 text-sm text-white/80">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-4 w-4"
        />
        <span>
          Ich bin einverstanden, dass mein Beitrag auf dieser Veranstaltung auf
          der Fotowand gezeigt wird und vom Veranstalter gespeichert wird.
        </span>
      </label>

      {error && (
        <p className="rounded-xl bg-red-500/20 px-4 py-3 text-sm text-red-100">{error}</p>
      )}

      <button
        type="submit"
        disabled={busy || !consent || (mode === "text" ? !message.trim() : !file)}
        className="w-full rounded-xl py-4 text-lg font-bold text-white transition disabled:opacity-40"
        style={{ backgroundColor: primaryColor }}
      >
        {busy ? "Wird gesendet…" : "📤 An die Wall schicken!"}
      </button>
    </form>
  );
}
