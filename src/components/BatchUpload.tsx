"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { compressImage } from "@/lib/image-client";

const CHUNK_SIZE = 4;
const MAX_TOTAL = 500;

/**
 * Batch-Upload für Veranstalter: Bilder werden clientseitig komprimiert und
 * in kleinen Häppchen hochgeladen — so bleiben die Requests unter jedem
 * Reverse-Proxy-Limit, auch bei hunderten Bildern.
 */
export function BatchUpload({ eventId }: { eventId: string }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0 || busy) return;
    setBusy(true);
    setResult(null);
    let uploaded = 0;
    let failed = 0;
    try {
      for (let start = 0; start < files.length; start += CHUNK_SIZE) {
        const chunk = files.slice(start, start + CHUNK_SIZE);
        setProgress(`${Math.min(start + chunk.length, files.length)} / ${files.length} …`);

        const formData = new FormData();
        for (const file of chunk) {
          let blob: Blob = file;
          try {
            blob = await compressImage(file);
          } catch {
            // Kompression fehlgeschlagen → Original, der Server verkleinert
          }
          formData.append("files", blob, file.name || "photo.jpg");
        }
        formData.append("message", message);

        try {
          const res = await fetch(`/api/admin/events/${eventId}/batch`, {
            method: "POST",
            body: formData,
          });
          if (res.ok) {
            const data = await res.json().catch(() => ({ uploaded: 0, failed: chunk.length }));
            uploaded += data.uploaded ?? 0;
            failed += data.failed ?? 0;
          } else {
            failed += chunk.length;
          }
        } catch {
          failed += chunk.length;
        }
      }
      setResult(
        `✓ ${uploaded} Bilder hochgeladen${failed ? `, ${failed} fehlgeschlagen` : ""}`
      );
      setFiles([]);
      setMessage("");
      if (fileInput.current) fileInput.current.value = "";
      router.refresh();
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, MAX_TOTAL))}
        className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-200 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-700"
      />
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={300}
        placeholder="Gemeinsame Beschriftung für alle Bilder (optional)"
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-rose-500 focus:outline-none"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={files.length === 0 || busy}
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
        >
          {busy
            ? `Lädt hoch… ${progress ?? ""}`
            : files.length > 0
              ? `${files.length} ${files.length === 1 ? "Bild" : "Bilder"} hochladen`
              : "Bilder hochladen"}
        </button>
        {result && <span className="text-sm text-zinc-600">{result}</span>}
      </div>
      <p className="text-xs text-zinc-500">
        Bilder werden verkleinert und in kleinen Paketen hochgeladen – auch
        hunderte Bilder sind kein Problem. Sie erscheinen sofort auf der Wall.
      </p>
    </form>
  );
}
