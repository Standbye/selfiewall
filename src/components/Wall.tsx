"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isLightColor } from "@/lib/color";

type WallPhoto = {
  id: string;
  type: string;
  name: string | null;
  message: string | null;
  likeCount: number;
  createdAt: string;
};

export function Wall({
  token,
  title,
  motto,
  primaryColor,
  polaroidColor,
  polaroidRadius,
  bgColor,
  bgImageUrl,
  bgDim,
  displaySeconds,
  qrDataUrl,
  logoUrl,
  active,
}: {
  token: string;
  title: string;
  motto: string | null;
  primaryColor: string;
  polaroidColor: string;
  polaroidRadius: number;
  bgColor: string;
  bgImageUrl: string | null;
  bgDim: number;
  displaySeconds: number;
  qrDataUrl: string;
  logoUrl: string | null;
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
    source.addEventListener("like", (e) => {
      const { id, count } = JSON.parse((e as MessageEvent).data) as {
        id: string;
        count: number;
      };
      setPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, likeCount: count } : p))
      );
      setCurrent((cur) => (cur?.id === id ? { ...cur, likeCount: count } : cur));
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
    const imagePhotos = photos.filter((p) => p.type === "photo");
    if (imagePhotos.length === 0) return [];
    // Deterministisch "mischen" (Hash der Id), damit das Grid stabil bleibt
    const hash = (s: string) => {
      let h = 0;
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
      return h;
    };
    const shuffled = [...imagePhotos].sort((a, b) => hash(a.id) - hash(b.id));
    const tiles: WallPhoto[] = [];
    while (tiles.length < Math.max(140, shuffled.length)) {
      tiles.push(...shuffled);
    }
    return tiles.slice(0, 140);
  }, [photos]);

  const polaroidStyle: React.CSSProperties = {
    backgroundColor: polaroidColor,
    borderRadius: polaroidRadius,
  };

  // Textfarbe passt sich der Hintergrund-Helligkeit an (heller Hintergrund
  // ohne Bild → dunkle Schrift); mit Hintergrundbild dunkelt das Dim-Overlay
  // ab, dann bleibt Weiß richtig.
  const lightBg = !bgImageUrl && isLightColor(bgColor);
  const fg = lightBg ? "#1c1c1a" : "#ffffff";
  const fgSoft = lightBg ? "rgba(20,20,18,0.65)" : "rgba(255,255,255,0.7)";
  const titleShadow = lightBg ? "none" : "0 2px 12px rgba(0,0,0,0.6)";

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ backgroundColor: bgColor }}>
      {/* Optionales Hintergrundbild mit Abdunkelung */}
      {bgImageUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bgImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div
            className="absolute inset-0 bg-black"
            style={{ opacity: bgDim / 100 }}
          />
        </>
      )}

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

      {/* Logo-Overlay oben links */}
      {logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          className="absolute left-5 top-5 z-10 max-h-20 max-w-40 object-contain drop-shadow-lg"
        />
      )}

      {/* Titel */}
      <div className="absolute left-0 right-0 top-6 z-10 text-center">
        <h1
          className="text-3xl font-bold"
          style={{ color: fg, textShadow: titleShadow }}
        >
          {title}
        </h1>
        {motto && <p className="mt-1" style={{ color: fgSoft }}>{motto}</p>}
      </div>

      {/* Vordergrund: Polaroid */}
      <div className="absolute inset-0 flex items-center justify-center p-8 pt-24 pb-16">
        {current ? (
          <figure
            key={current.id + tilt}
            className="polaroid-in max-h-full p-4 pb-5 shadow-2xl"
            style={{ ...polaroidStyle, transform: `rotate(${tilt}deg)` }}
          >
            {current.type === "text" ? (
              <div
                className="flex max-w-[70vw] items-center justify-center px-8 py-16 sm:min-h-[40vh] sm:min-w-[40vw]"
                style={{ backgroundColor: `${primaryColor}18` }}
              >
                <p className="max-w-2xl text-center text-3xl font-semibold leading-snug text-zinc-800">
                  „{current.message}“
                </p>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/img/${current.id}`}
                alt=""
                className="max-h-[62vh] max-w-[70vw] object-contain"
              />
            )}
            <figcaption className="mt-3 flex min-h-6 items-center justify-center gap-3 text-center font-medium text-zinc-800">
              <span>
                {current.name}
                {current.name && current.type !== "text" && current.message && (
                  <span className="text-zinc-400"> · </span>
                )}
                {current.type !== "text" && (
                  <span className="text-zinc-600">{current.message}</span>
                )}
              </span>
              {current.likeCount > 0 && (
                <span
                  className="rounded-full px-2 py-0.5 text-sm font-semibold text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  ❤️ {current.likeCount}
                </span>
              )}
            </figcaption>
          </figure>
        ) : (
          <div className="max-w-xl text-center" style={{ color: fg }}>
            <p className="text-6xl">📸</p>
            <p className="mt-6 text-2xl font-semibold">
              {active
                ? "Noch keine Beiträge – mach den Anfang!"
                : "Danke für einen tollen Abend!"}
            </p>
            {active && (
              <>
                <p className="mt-2" style={{ color: fgSoft }}>
                  Scanne den QR-Code und schicke Foto, Zeichnung oder Gruß.
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
