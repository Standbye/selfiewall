"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { moderatePhoto } from "@/app/admin/actions";

type AdminPhoto = {
  id: string;
  type: string;
  name: string | null;
  message: string | null;
  status: string;
  createdAt: string;
};

type Mode =
  | { kind: "admin"; eventId: string }
  | { kind: "link"; modToken: string };

const TABS = [
  { key: "pending", label: "Wartend" },
  { key: "approved", label: "Freigegeben" },
  { key: "rejected", label: "Abgelehnt" },
] as const;

export function ModerationGrid({
  mode,
  moderationMode,
}: {
  mode: Mode;
  moderationMode: string;
}) {
  const [photos, setPhotos] = useState<AdminPhoto[]>([]);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>(
    moderationMode === "post" ? "approved" : "pending"
  );
  const [loaded, setLoaded] = useState(false);
  const [, startTransition] = useTransition();

  const listUrl =
    mode.kind === "admin"
      ? `/api/admin/events/${mode.eventId}/photos`
      : `/api/mod/${mode.modToken}/photos`;

  const imgSrc = useCallback(
    (id: string) =>
      mode.kind === "admin"
        ? `/api/img/${id}?v=thumb`
        : `/api/img/${id}?v=thumb&mt=${mode.modToken}`,
    [mode]
  );

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(listUrl, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setPhotos(data.photos);
      setLoaded(true);
    } catch {
      // Netzwerkfehler → nächster Poll versucht es erneut
    }
  }, [listUrl]);

  useEffect(() => {
    const initial = setTimeout(refresh, 0);
    const interval = setInterval(refresh, 8000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [refresh]);

  function act(photoId: string, action: "approve" | "reject" | "delete") {
    if (action === "delete" && !confirm("Beitrag endgültig löschen?")) return;
    setPhotos((prev) =>
      action === "delete"
        ? prev.filter((p) => p.id !== photoId)
        : prev.map((p) =>
            p.id === photoId
              ? { ...p, status: action === "approve" ? "approved" : "rejected" }
              : p
          )
    );
    startTransition(async () => {
      try {
        if (mode.kind === "admin") {
          await moderatePhoto(photoId, action);
        } else {
          await fetch(`/api/mod/${mode.modToken}/photos/${photoId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
          });
        }
      } finally {
        refresh();
      }
    });
  }

  const counts = Object.fromEntries(
    TABS.map((t) => [t.key, photos.filter((p) => p.status === t.key).length])
  );
  const visible = photos.filter((p) => p.status === tab);

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              tab === t.key
                ? "bg-rose-600 text-white"
                : "bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {t.label}
            {counts[t.key] > 0 && <span className="ml-1.5 opacity-70">({counts[t.key]})</span>}
          </button>
        ))}
      </div>

      {!loaded ? (
        <p className="py-10 text-center text-zinc-500">Lade Beiträge…</p>
      ) : visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white py-10 text-center text-zinc-500">
          {tab === "pending" ? "Keine wartenden Beiträge – alles erledigt ✅" : "Keine Beiträge in dieser Ansicht."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {visible.map((photo) => (
            <div key={photo.id} className="overflow-hidden rounded-xl bg-white shadow-sm">
              {photo.type === "text" ? (
                <div className="flex aspect-square w-full items-center justify-center bg-rose-50 p-3">
                  <p className="line-clamp-6 text-center text-sm font-medium text-zinc-700">
                    💬 „{photo.message}“
                  </p>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imgSrc(photo.id)}
                  alt={photo.name ?? "Beitrag"}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
              )}
              <div className="p-2">
                {(photo.name || (photo.type !== "text" && photo.message)) && (
                  <p className="mb-2 truncate text-xs text-zinc-600">
                    {photo.name && <span className="font-medium">{photo.name}</span>}
                    {photo.name && photo.type !== "text" && photo.message && " · "}
                    {photo.type !== "text" && photo.message}
                  </p>
                )}
                <div className="flex gap-1">
                  {photo.status !== "approved" && (
                    <button
                      onClick={() => act(photo.id, "approve")}
                      className="flex-1 rounded-lg bg-emerald-600 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                    >
                      ✓ Freigeben
                    </button>
                  )}
                  {photo.status !== "rejected" && (
                    <button
                      onClick={() => act(photo.id, "reject")}
                      className="flex-1 rounded-lg bg-amber-500 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600"
                    >
                      ✕ Ablehnen
                    </button>
                  )}
                  <button
                    onClick={() => act(photo.id, "delete")}
                    className="rounded-lg bg-zinc-200 px-2 py-1.5 text-xs text-zinc-600 transition hover:bg-zinc-300"
                    title="Endgültig löschen"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
