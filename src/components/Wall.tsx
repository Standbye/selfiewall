"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type WallPhoto = {
  id: string;
  name: string | null;
  message: string | null;
  createdAt: string;
};

export function Wall({
  token,
  title,
  motto,
  primaryColor,
  bgColor,
  displaySeconds,
  qrDataUrl,
  active,
}: {
  token: string;
  title: string;
  motto: string | null;
  primaryColor: string;
  bgColor: string;
  displaySeconds: number;
  qrDataUrl: string;
  active: boolean;
}) {
  const [photos, setPhotos] = useState<WallPhoto[]>([]);
  const [current, setCurrent] = useState<WallPhoto | null>(null);
  const [tilt, setTilt] = useState(0);
  const photosRef = useRef<WallPhoto[]>([]);
  const currentRef = useRef<WallPhoto | null>(null);
  const priorityQueue = useRef<WallPhoto[]>([]);
  const recentIds = useRef<string[]>([]);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  const showPhoto = useCallback((photo: WallPhoto | null) => {
    setCurrent(photo);
    setTilt(Math.random() * 6 - 3);
    if (photo) {
      recentIds.current = [photo.id, ...recentIds.current].slice(0, 5);
    }
  }, []);

  const advance = useCallback(() => {
    const next = priorityQueue.current.shift();
    if (next) {
      showPhoto(next);
      return;
    }
    const pool = photosRef.current;
    if (pool.length === 0) {
      showPhoto(null);
      return;
    }
    // Zuletzt gezeigte Bilder vermeiden, solange genug Auswahl da ist
    const candidates = pool.filter(
      (p) => !recentIds.current.includes(p.id) || pool.length <= recentIds.current.length
    );
    const pick = candidates[Math.floor(Math.random() * candidates.length)] ?? pool[0];
    showPhoto(pick);
  }, [showPhoto]);

  // Initiales Laden + regelmäßiger Abgleich als SSE-Fallback
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/e/${token}/photos`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setPhotos(data.photos);
      } catch {
        // nächster Abgleich versucht es erneut
      }
    };
    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token]);

  // Live-Updates per SSE
  useEffect(() => {
    const source = new EventSource(`/api/e/${token}/stream`);
    source.addEventListener("photo", (e) => {
      const photo: WallPhoto = JSON.parse((e as MessageEvent).data);
      setPhotos((prev) =>
        prev.some((p) => p.id === photo.id) ? prev : [...prev, photo]
      );
      priorityQueue.current.push(photo);
    });
    source.addEventListener("removed", (e) => {
      const { id } = JSON.parse((e as MessageEvent).data) as { id: string };
      setPhotos((prev) => prev.filter((p) => p.id !== id));
      priorityQueue.current = priorityQueue.current.filter((p) => p.id !== id);
      if (currentRef.current?.id === id) setCurrent(null);
    });
    return () => source.close();
  }, [token]);

  // Rotation
  useEffect(() => {
    if (!current && photos.length > 0) advance();
    const interval = setInterval(advance, Math.max(3, displaySeconds) * 1000);
    return () => clearInterval(interval);
  }, [advance, displaySeconds, photos.length, current]);

  const gridPhotos = useMemo(() => {
    if (photos.length === 0) return [];
    // Deterministisch "mischen" (Hash der Id), damit das Grid bei jedem
    // Re-Render stabil bleibt und nicht flackert.
    const hash = (s: string) => {
      let h = 0;
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
      return h;
    };
    const shuffled = [...photos].sort((a, b) => hash(a.id) - hash(b.id));
    const tiles: WallPhoto[] = [];
    while (tiles.length < Math.max(140, shuffled.length)) {
      tiles.push(...shuffled);
    }
    return tiles.slice(0, 140);
  }, [photos]);

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ backgroundColor: bgColor }}
    >
      {/* Hintergrund: Grid aller bisherigen Bilder */}
      {gridPhotos.length > 0 && (
        <div
          className="absolute inset-0 grid gap-1 opacity-30"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
            gridAutoRows: "110px",
          }}
        >
          {gridPhotos.map((photo, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${photo.id}-${i}`}
              src={`/api/img/${photo.id}?v=thumb`}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ))}
        </div>
      )}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, transparent 20%, ${bgColor}cc 100%)`,
        }}
      />

      {/* Titel */}
      <div className="absolute left-0 right-0 top-6 z-10 text-center">
        <h1
          className="text-3xl font-bold text-white drop-shadow-lg"
          style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}
        >
          {title}
        </h1>
        {motto && <p className="mt-1 text-white/70">{motto}</p>}
      </div>

      {/* Vordergrund: Polaroid */}
      <div className="absolute inset-0 flex items-center justify-center p-8 pt-24 pb-16">
        {current ? (
          <figure
            key={current.id + tilt}
            className="polaroid-in max-h-full bg-white p-4 pb-5 shadow-2xl"
            style={{ transform: `rotate(${tilt}deg)`, borderRadius: 4 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/img/${current.id}`}
              alt=""
              className="max-h-[62vh] max-w-[70vw] object-contain"
            />
            <figcaption className="mt-3 min-h-6 text-center font-medium text-zinc-800">
              {current.name && <span>{current.name}</span>}
              {current.name && current.message && (
                <span className="text-zinc-400"> · </span>
              )}
              {current.message && (
                <span className="text-zinc-600">{current.message}</span>
              )}
            </figcaption>
          </figure>
        ) : (
          <div className="max-w-xl text-center text-white">
            <p className="text-6xl">📸</p>
            <p className="mt-6 text-2xl font-semibold">
              {active
                ? "Noch keine Bilder – mach den Anfang!"
                : "Danke für einen tollen Abend!"}
            </p>
            {active && (
              <>
                <p className="mt-2 text-white/70">
                  Scanne den QR-Code und lade dein erstes Foto hoch.
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt="QR-Code zum Mitmachen"
                  className="mx-auto mt-8 w-56 rounded-xl"
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* QR-Code-Ecke */}
      {active && current && (
        <div className="absolute bottom-5 right-5 z-10 rounded-xl bg-white p-2 text-center shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="QR-Code zum Mitmachen" className="w-28" />
          <p className="pb-1 pt-0.5 text-xs font-semibold" style={{ color: primaryColor }}>
            Mach mit!
          </p>
        </div>
      )}
    </div>
  );
}
