"use client";

import { useRef, useState } from "react";
import { DrawCanvas } from "./DrawCanvas";
import { compressImage } from "@/lib/image-client";

type Mode = "idle" | "photo" | "draw" | "text";

const OPTIONS: { mode: Exclude<Mode, "idle" | "photo"> | "camera" | "gallery"; icon: string; title: string; hint: string }[] = [
  { mode: "camera", icon: "🤳", title: "Selfie machen", hint: "Kamera öffnet sich direkt" },
  { mode: "gallery", icon: "🖼️", title: "Foto aus der Galerie", hint: "Vorhandenes Bild auswählen" },
  { mode: "draw", icon: "🎨", title: "Bild malen", hint: "Mit dem Finger zeichnen" },
  { mode: "text", icon: "💬", title: "Nachricht schreiben", hint: "Gruß als Textkarte an die Wall" },
];

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
    setIsDrawing(!!picked && alreadyCompressed);
  }

  function reset() {
    pickFile(null);
    setMessage("");
    setConsent(false);
    setDone(null);
    setMode("idle");
  }

  function choose(option: (typeof OPTIONS)[number]["mode"]) {
    if (option === "camera") cameraInput.current?.click();
    else if (option === "gallery") galleryInput.current?.click();
    else setMode(option);
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
      <div className="ev-card rounded-2xl p-8 text-center">
        <p className="text-5xl">🎉</p>
        <p className="ev-text mt-4 text-lg font-semibold">
          {done === "text" ? "Danke für deine Nachricht!" : "Danke für dein Bild!"}
        </p>
        <p className="ev-text-soft mt-1 text-sm">
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
            className="ev-card-btn ev-text w-full rounded-xl py-3 font-semibold transition"
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
        <div className="ev-card rounded-2xl p-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={300}
            rows={5}
            autoFocus
            placeholder="Deine Nachricht an die Wall …"
            className="ev-input w-full resize-none rounded-xl border-0 bg-transparent text-lg focus:outline-none"
          />
          <div className="ev-text-faint flex items-center justify-between text-xs">
            <button type="button" onClick={() => setMode("idle")} className="underline">
              Abbrechen
            </button>
            <span>{message.length}/300</span>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {OPTIONS.map((option, index) => (
            <button
              key={option.mode}
              type="button"
              onClick={() => choose(option.mode)}
              className="flex w-full items-center gap-4 rounded-2xl px-4 py-3.5 text-left transition active:scale-[0.99]"
              style={
                index === 0
                  ? { backgroundColor: primaryColor }
                  : {
                      backgroundColor: `${primaryColor}2b`,
                      border: `1px solid ${primaryColor}77`,
                    }
              }
            >
              <span className="text-3xl">{option.icon}</span>
              <span>
                <span
                  className={`block font-semibold ${index === 0 ? "text-white" : "ev-text"}`}
                >
                  {option.title}
                </span>
                <span
                  className={`block text-xs ${index === 0 ? "text-white/75" : "ev-text-soft"}`}
                >
                  {option.hint}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={50}
        placeholder="Dein Name (optional)"
        className="ev-input w-full rounded-xl border-0 px-4 py-3 focus:outline-none"
      />
      {mode !== "text" && (
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={300}
          placeholder="Kurzer Gruß (optional)"
          className="ev-input w-full rounded-xl border-0 px-4 py-3 focus:outline-none"
        />
      )}

      <label className="ev-text-soft flex items-start gap-3 text-sm">
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
        <p
          className="ev-text rounded-xl px-4 py-3 text-sm"
          style={{ backgroundColor: "rgba(239, 68, 68, 0.3)" }}
        >
          {error}
        </p>
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
