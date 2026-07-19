"use client";

import { useRef, useState } from "react";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

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
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  function pick(picked: File | null) {
    setError(null);
    setFile(picked);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(picked ? URL.createObjectURL(picked) : null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !consent) return;
    setBusy(true);
    setError(null);
    try {
      let blob: Blob = file;
      try {
        blob = await compressImage(file);
      } catch {
        // Kompression fehlgeschlagen (z. B. exotisches Format) → Original
        // hochladen, der Server verkleinert ohnehin nochmal.
      }
      const formData = new FormData();
      formData.append("file", blob, "photo.jpg");
      formData.append("name", name);
      formData.append("message", message);
      formData.append("consent", "true");
      const res = await fetch(`/api/e/${token}/upload`, { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Upload fehlgeschlagen – bitte versuche es nochmal.");
        return;
      }
      setDone(true);
    } catch {
      setError("Upload fehlgeschlagen – bitte prüfe deine Verbindung.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl bg-white/10 p-8 text-center text-white">
        <p className="text-5xl">🎉</p>
        <p className="mt-4 text-lg font-semibold">Danke für dein Bild!</p>
        <p className="mt-1 text-sm text-white/70">
          {preModeration
            ? "Es wird kurz geprüft und erscheint dann auf der Wall."
            : "Es erscheint gleich auf der Wall – schau hin!"}
        </p>
        <button
          onClick={() => {
            pick(null);
            setMessage("");
            setDone(false);
          }}
          className="mt-6 w-full rounded-xl py-3 font-semibold text-white transition"
          style={{ backgroundColor: primaryColor }}
        >
          Noch ein Foto hochladen
        </button>
      </div>
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
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />
      <input
        ref={galleryInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />

      {previewUrl ? (
        <div className="relative overflow-hidden rounded-2xl bg-black/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Vorschau" className="max-h-96 w-full object-contain" />
          <button
            type="button"
            onClick={() => pick(null)}
            className="absolute right-2 top-2 rounded-full bg-black/60 px-3 py-1 text-sm text-white"
          >
            ✕ Anderes Bild
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => cameraInput.current?.click()}
            className="rounded-2xl bg-white/10 p-6 text-center text-white transition hover:bg-white/15"
          >
            <span className="block text-4xl">🤳</span>
            <span className="mt-2 block font-semibold">Selfie machen</span>
          </button>
          <button
            type="button"
            onClick={() => galleryInput.current?.click()}
            className="rounded-2xl bg-white/10 p-6 text-center text-white transition hover:bg-white/15"
          >
            <span className="block text-4xl">🖼️</span>
            <span className="mt-2 block font-semibold">Aus Galerie</span>
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
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={200}
        placeholder="Kurzer Gruß (optional)"
        className="w-full rounded-xl border-0 bg-white/10 px-4 py-3 text-white placeholder-white/50 focus:bg-white/15 focus:outline-none"
      />

      <label className="flex items-start gap-3 text-sm text-white/80">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-4 w-4 accent-current"
          style={{ color: primaryColor }}
        />
        <span>
          Ich bin einverstanden, dass mein Bild auf dieser Veranstaltung auf der
          Fotowand gezeigt wird und vom Veranstalter gespeichert wird.
        </span>
      </label>

      {error && (
        <p className="rounded-xl bg-red-500/20 px-4 py-3 text-sm text-red-100">{error}</p>
      )}

      <button
        type="submit"
        disabled={!file || !consent || busy}
        className="w-full rounded-xl py-4 text-lg font-bold text-white transition disabled:opacity-40"
        style={{ backgroundColor: primaryColor }}
      >
        {busy ? "Wird hochgeladen…" : "📤 An die Wall schicken!"}
      </button>
    </form>
  );
}
