import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { eventStyle, sanitizeCustomCss, titleBackdropStyle } from "@/lib/theme";

export const dynamic = "force-dynamic";

/** Öffentliche Galerie: alle freigegebenen Bilder ansehen und herunterladen. */
export default async function GalleryPage({
  params,
}: {
  params: Promise<{ galleryToken: string }>;
}) {
  const { galleryToken } = await params;
  const event = await prisma.event.findUnique({ where: { galleryToken } });
  if (!event || !event.galleryEnabled) notFound();

  const photos = await prisma.photo.findMany({
    where: { eventId: event.id, status: "approved", type: "photo" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, message: true },
  });
  const customCss = sanitizeCustomCss(event.customCssStream);

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-8" style={eventStyle(event)}>
      {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}
      <div className="w-full max-w-5xl">
        <header className="mb-6 flex flex-col items-center text-center">
          {event.logoPath && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/img/logo-${event.id}`} alt="" className="mb-3 max-h-20" />
          )}
          <div
            className={event.titleBackdrop ? "rounded-2xl px-6 py-2.5" : undefined}
            style={titleBackdropStyle(event)}
          >
            <h1 className="ev-text text-3xl font-bold">{event.title}</h1>
            <p className="ev-text-soft mt-1">
              {photos.length === 1 ? "1 Foto" : `${photos.length} Fotos`} zum Ansehen und Herunterladen
            </p>
          </div>
        </header>

        {photos.length > 0 && (
          <div className="mb-8 text-center">
            <a
              href={`/api/g/${galleryToken}/zip`}
              className="inline-block rounded-xl px-6 py-3.5 text-lg font-bold text-white transition"
              style={{ backgroundColor: event.primaryColor }}
            >
              ⬇ Alle Fotos herunterladen
            </a>
          </div>
        )}

        {photos.length === 0 ? (
          <p className="ev-card ev-text-soft rounded-2xl py-12 text-center">
            Für dieses Event gibt es noch keine freigegebenen Fotos.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((photo, index) => (
              <a
                key={photo.id}
                href={`/api/img/${photo.id}`}
                download={`${String(index + 1).padStart(3, "0")}.jpg`}
                className="group relative overflow-hidden rounded-xl bg-black/20"
                title={photo.name ?? undefined}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/img/${photo.id}?v=thumb`}
                  alt={photo.name ?? "Foto"}
                  className="aspect-square w-full object-cover transition group-hover:scale-105"
                  loading="lazy"
                />
                {(photo.name || photo.message) && (
                  <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-2 py-1 text-xs text-white">
                    {photo.name}
                    {photo.name && photo.message && " · "}
                    {photo.message}
                  </span>
                )}
              </a>
            ))}
          </div>
        )}

        <footer className="ev-text-faint mt-10 text-center text-xs">
          <Link href="/impressum" className="underline">Impressum</Link>
          {" · "}
          <Link href="/datenschutz" className="underline">Datenschutz</Link>
        </footer>
      </div>
    </main>
  );
}
