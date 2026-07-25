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

type Tile = { id: string; seq: number };

const TILE_COUNT = 140;

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

export function Wall({
  token,
  wallStyle,
  textColor,
  titleBackdrop,
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
  wallStyle: string;
  textColor: string;
  titleBackdrop: boolean;
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
  const [tiles, setTiles] = useState<Tile[]>([]);
  const photosRef = useRef<WallPhoto[]>([]);
  const currentRef = useRef<WallPhoto | null>(null);
  const priorityQueue = useRef<WallPhoto[]>([]);
  const recentIds = useRef<string[]>([]);
  const seqRef = useRef(1);

  const hasGrid = wallStyle === "grid-live" || wallStyle === "mosaic";

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

  /** Neue Bilder sichtbar ins Kachel-Grid einklappen. */
  const plantTiles = useCallback((photoId: string, count: number) => {
    setTiles((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      for (let i = 0; i < count; i++) {
        const slot = Math.floor(Math.random() * next.length);
        next[slot] = { id: photoId, seq: seqRef.current++ };
      }
      return next;
    });
  }, []);

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

  // Grid initial befüllen (deterministisch, damit es nicht flackert)
  useEffect(() => {
    if (!hasGrid) return;
    const imagePhotos = photos.filter((p) => p.type === "photo");
    if (imagePhotos.length === 0) {
      if (tiles.length > 0) setTiles([]);
      return;
    }
    if (tiles.length === 0) {
      const shuffled = [...imagePhotos].sort((a, b) => hashStr(a.id) - hashStr(b.id));
      const filled: Tile[] = [];
      while (filled.length < TILE_COUNT) {
        for (const p of shuffled) {
          filled.push({ id: p.id, seq: 0 });
          if (filled.length >= TILE_COUNT) break;
        }
      }
      setTiles(filled);
    }
    // Entfernte Bilder aus dem Grid ersetzen
    const validIds = new Set(imagePhotos.map((p) => p.id));
    if (tiles.some((t) => !validIds.has(t.id))) {
      setTiles((prev) =>
        prev.map((t) =>
          validIds.has(t.id)
            ? t
            : {
                id: imagePhotos[Math.floor(Math.random() * imagePhotos.length)].id,
                seq: seqRef.current++,
              }
        )
      );
    }
  }, [photos, hasGrid, tiles]);

  // Grid "atmet": alle 20 Sekunden ein paar Kacheln tauschen
  useEffect(() => {
    if (!hasGrid) return;
    const interval = setInterval(() => {
      const imagePhotos = photosRef.current.filter((p) => p.type === "photo");
      if (imagePhotos.length < 2) return;
      const pick = imagePhotos[Math.floor(Math.random() * imagePhotos.length)];
      plantTiles(pick.id, 2);
    }, 20_000);
    return () => clearInterval(interval);
  }, [hasGrid, plantTiles]);

  // Live-Updates per SSE
  useEffect(() => {
    const source = new EventSource(`/api/e/${token}/stream`);
    source.addEventListener("photo", (e) => {
      const photo: WallPhoto = JSON.parse((e as MessageEvent).data);
      setPhotos((prev) =>
        prev.some((p) => p.id === photo.id) ? prev : [...prev, photo]
      );
      priorityQueue.current.push(photo);
      if (photo.type === "photo") plantTiles(photo.id, 3);
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
  }, [token, plantTiles]);

  // Rotation
  useEffect(() => {
    if (!current && photos.length > 0) advance();
    const interval = setInterval(advance, Math.max(3, displaySeconds) * 1000);
    return () => clearInterval(interval);
  }, [advance, displaySeconds, photos.length, current]);

  const stripPhotos = useMemo(
    () =>
      wallStyle === "filmstrip"
        ? photos.filter((p) => p.type === "photo").slice(-12).reverse()
        : [],
    [photos, wallStyle]
  );

  const autoLightBg = !bgImageUrl && wallStyle !== "mosaic" && isLightColor(bgColor);
  const lightBg =
    textColor === "dark" ? true : textColor === "light" ? false : autoLightBg;
  const fg = lightBg ? "#1c1c1a" : "#ffffff";
  const fgSoft = lightBg ? "rgba(20,20,18,0.65)" : "rgba(255,255,255,0.7)";
  const titleShadow = lightBg ? "none" : "0 2px 12px rgba(0,0,0,0.6)";
  // Transparenter Backdrop hinter Titel/Motto (Peters Lesbarkeits-Wunsch)
  const backdropStyle: React.CSSProperties | undefined = titleBackdrop
    ? {
        backgroundColor: lightBg ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.4)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }
    : undefined;

  const polaroidStyle: React.CSSProperties = {
    backgroundColor: polaroidColor,
    borderRadius: polaroidRadius,
  };

  const mosaic = wallStyle === "mosaic";
  const currentImageForBlur =
    wallStyle === "blur" && current?.type === "photo" ? current.id : null;

  const polaroid = current && (
    <figure
      key={current.id + tilt}
      className={`polaroid-in shadow-2xl ${mosaic ? "p-2 pb-3" : "max-h-full p-4 pb-5"}`}
      style={{ ...polaroidStyle, transform: `rotate(${tilt}deg)` }}
    >
      {current.type === "text" ? (
        <div
          className={`flex items-center justify-center ${
            mosaic ? "max-w-[30vw] px-4 py-8" : "max-w-[70vw] px-8 py-16 sm:min-h-[40vh] sm:min-w-[40vw]"
          }`}
          style={{ backgroundColor: `${primaryColor}18` }}
        >
          <p
            className={`max-w-2xl text-center font-semibold leading-snug text-zinc-800 ${
              mosaic ? "text-lg" : "text-3xl"
            }`}
          >
            „{current.message}“
          </p>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/img/${current.id}`}
          alt=""
          className={mosaic ? "max-h-[26vh] max-w-[26vw] object-contain" : "max-h-[62vh] max-w-[70vw] object-contain"}
        />
      )}
      <figcaption
        className={`mt-2 flex min-h-5 items-center justify-center gap-2 text-center font-medium text-zinc-800 ${
          mosaic ? "text-xs" : ""
        }`}
      >
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
  );

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ backgroundColor: bgColor }}>
      {/* Hintergrundbild (nicht bei Blur/Mosaik — die bringen eigene Flächen) */}
      {bgImageUrl && wallStyle !== "blur" && !mosaic && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bgImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black" style={{ opacity: bgDim / 100 }} />
        </>
      )}

      {/* Blur-Bühne: aktuelles Foto großflächig unscharf */}
      {wallStyle === "blur" && currentImageForBlur && (
        <div key={currentImageForBlur} className="blur-stage absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/img/${currentImageForBlur}`}
            alt=""
            className="h-full w-full scale-110 object-cover"
            style={{ filter: "blur(28px) brightness(0.55)" }}
          />
        </div>
      )}

      {/* Kachel-Grid (lebendig gedimmt oder als volles Mosaik) */}
      {hasGrid && tiles.length > 0 && (
        <div
          className={`absolute inset-0 grid ${mosaic ? "gap-0.5" : "gap-1 opacity-30"}`}
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
            gridAutoRows: "110px",
          }}
        >
          {tiles.map((tile, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${i}-${tile.seq}`}
              src={`/api/img/${tile.id}?v=thumb`}
              alt=""
              className={`h-full w-full object-cover ${tile.seq > 0 ? "tile-in" : ""}`}
              loading="lazy"
            />
          ))}
        </div>
      )}
      {wallStyle === "grid-live" && tiles.length > 0 && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at center, transparent 20%, ${bgColor}cc 100%)`,
          }}
        />
      )}
      {mosaic && (
        <div
          className="absolute inset-x-0 top-0 h-28"
          style={{ background: "linear-gradient(rgba(0,0,0,0.55), transparent)" }}
        />
      )}

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
      <div className="absolute left-0 right-0 top-6 z-10 flex justify-center">
        <div
          className={titleBackdrop ? "rounded-2xl px-6 py-2.5 text-center" : "text-center"}
          style={backdropStyle}
        >
          <h1
            className="text-3xl font-bold"
            style={{
              color: mosaic && !titleBackdrop ? "#fff" : fg,
              textShadow: titleBackdrop ? "none" : mosaic ? "0 2px 12px rgba(0,0,0,0.7)" : titleShadow,
            }}
          >
            {title}
          </h1>
          {motto && (
            <p
              className="mt-1"
              style={{ color: mosaic && !titleBackdrop ? "rgba(255,255,255,0.75)" : fgSoft }}
            >
              {motto}
            </p>
          )}
        </div>
      </div>

      {/* Vordergrund: Polaroid (zentriert; beim Mosaik klein in der Ecke) */}
      {mosaic ? (
        <div className="absolute bottom-5 left-5 z-10">{polaroid}</div>
      ) : (
        <div
          className={`absolute inset-0 flex items-center justify-center p-8 pt-24 ${
            wallStyle === "filmstrip" ? "pb-40" : "pb-16"
          }`}
        >
          {polaroid ?? (
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
      )}
      {mosaic && !polaroid && photos.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="max-w-xl text-center text-white">
            <p className="text-6xl">📸</p>
            <p className="mt-6 text-2xl font-semibold">
              {active ? "Noch keine Beiträge – mach den Anfang!" : "Danke für einen tollen Abend!"}
            </p>
          </div>
        </div>
      )}

      {/* Filmstreifen: neueste Beiträge unten */}
      {wallStyle === "filmstrip" && stripPhotos.length > 0 && (
        <div className="absolute bottom-5 left-5 right-44 z-10 flex gap-2 overflow-hidden">
          {stripPhotos.map((photo) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={photo.id}
              src={`/api/img/${photo.id}?v=thumb`}
              alt=""
              className="strip-in h-24 w-24 shrink-0 rounded-lg object-cover shadow-lg"
              style={{ border: `2px solid ${polaroidColor}` }}
            />
          ))}
        </div>
      )}

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
