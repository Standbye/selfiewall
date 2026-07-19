"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** Batch-Upload für Veranstalter: viele Bilder auf einmal, sofort freigegeben. */
export function BatchUpload({ eventId }: { eventId: string }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0 || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const formData = new FormData();
      for (const file of files) formData.append("files", file);
      formData.append("message", message);
      const res = await fetch(`/api/admin/events/${eventId}/batch`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult(`Fehler: ${data.error ?? "Upload fehlgeschlagen"}`);
        return;
      }
      setResult(
        `✓ ${data.uploaded} Bilder hochgeladen${data.failed ? `, ${data.failed} fehlgeschlagen` : ""}`
      );
      setFiles([]);
      setMessage("");
      if (fileInput.current) fileInput.current.value = "";
      router.refresh();
    } catch {
      setResult("Fehler: Upload fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
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
            ? "Lädt hoch…"
            : files.length > 0
              ? `${files.length} ${files.length === 1 ? "Bild" : "Bilder"} hochladen`
              : "Bilder hochladen"}
        </button>
        {result && <span className="text-sm text-zinc-600">{result}</span>}
      </div>
      <p className="text-xs text-zinc-500">
        Bilder erscheinen sofort auf der Wall – ohne Moderation, ohne Rate-Limit.
      </p>
    </form>
  );
}
