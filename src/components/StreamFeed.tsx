"use client";

import { useCallback, useEffect, useState } from "react";

type FeedPhoto = {
  id: string;
  type: string;
  name: string | null;
  message: string | null;
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StreamFeed({
  token,
  primaryColor,
}: {
  token: string;
  primaryColor: string;
}) {
  const [photos, setPhotos] = useState<FeedPhoto[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/e/${token}/photos?order=desc`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setPhotos(data.photos);
      setLoaded(true);
    } catch {
      // nächster Versuch beim Poll
    }
  }, [token]);

  useEffect(() => {
    const initial = setTimeout(load, 0);
    return () => clearTimeout(initial);
  }, [load]);

  // Live: neue Beiträge und Likes per SSE, Polling als Fallback
  useEffect(() => {
    const source = new EventSource(`/api/e/${token}/stream`);
    source.addEventListener("photo", () => load());
    source.addEventListener("removed", (e) => {
      const { id } = JSON.parse((e as MessageEvent).data) as { id: string };
      setPhotos((prev) => prev.filter((p) => p.id !== id));
    });
    source.addEventListener("like", (e) => {
      const { id, count } = JSON.parse((e as MessageEvent).data) as {
        id: string;
        count: number;
      };
      setPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, likeCount: count } : p))
      );
    });
    const interval = setInterval(load, 60_000);
    return () => {
      source.close();
      clearInterval(interval);
    };
  }, [token, load]);

  async function toggleLike(photo: FeedPhoto) {
    // Optimistisch
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === photo.id
          ? {
              ...p,
              likedByMe: !p.likedByMe,
              likeCount: p.likeCount + (p.likedByMe ? -1 : 1),
            }
          : p
      )
    );
    try {
      const res = await fetch(`/api/e/${token}/photos/${photo.id}/like`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === photo.id ? { ...p, likedByMe: data.liked, likeCount: data.count } : p
          )
        );
      }
    } catch {
      // Beim nächsten Load korrigiert sich der Stand
    }
  }

  if (!loaded) {
    return <p className="py-10 text-center text-white/60">Lade Beiträge…</p>;
  }
  if (photos.length === 0) {
    return (
      <p className="rounded-2xl bg-white/10 py-10 text-center text-white/70">
        Noch keine Beiträge – mach den Anfang! 📸
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {photos.map((photo) => (
        <article key={photo.id} className="overflow-hidden rounded-2xl bg-white shadow-lg">
          {photo.type === "text" ? (
            <div
              className="flex min-h-40 items-center justify-center px-6 py-10"
              style={{ backgroundColor: `${primaryColor}14` }}
            >
              <p className="text-center text-xl font-semibold leading-snug text-zinc-800">
                „{photo.message}“
              </p>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/img/${photo.id}`}
              alt={photo.name ?? "Beitrag"}
              className="w-full object-contain"
              loading="lazy"
            />
          )}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="min-w-0 text-sm text-zinc-700">
              <span className="font-semibold">{photo.name ?? "Gast"}</span>
              {photo.type !== "text" && photo.message && (
                <span className="text-zinc-500"> · {photo.message}</span>
              )}
              <span className="ml-2 text-xs text-zinc-400">{formatTime(photo.createdAt)}</span>
            </div>
            <button
              onClick={() => toggleLike(photo)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                photo.likedByMe ? "text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
              style={photo.likedByMe ? { backgroundColor: primaryColor } : undefined}
            >
              {photo.likedByMe ? "❤️" : "🤍"}
              {photo.likeCount > 0 && photo.likeCount}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
