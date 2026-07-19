import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { UploadForm } from "@/components/UploadForm";
import { eventStyle, sanitizeCustomCss } from "@/lib/theme";

export const dynamic = "force-dynamic";

export default async function GuestUploadPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const event = await prisma.event.findUnique({ where: { token } });
  if (!event) notFound();

  const customCss = sanitizeCustomCss(event.customCssUpload);

  return (
    <main
      className="relative flex flex-1 flex-col items-center px-4 py-8"
      style={eventStyle(event)}
    >
      {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}
      {event.bgImagePath && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/img/bg-${event.id}`}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            className="absolute inset-0 bg-black"
            style={{ opacity: event.bgDim / 100 }}
          />
        </>
      )}
      <div className="relative z-10 w-full max-w-md">
        <header className="mb-6 text-center">
          {event.logoPath && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/img/logo-${event.id}`}
              alt=""
              className="mx-auto mb-3 max-h-20"
            />
          )}
          <h1 className="text-3xl font-bold text-white">{event.title}</h1>
          {event.motto && <p className="mt-1 text-white/70">{event.motto}</p>}
        </header>

        {event.status === "active" ? (
          <UploadForm
            token={event.token}
            primaryColor={event.primaryColor}
            preModeration={event.moderationMode === "pre"}
          />
        ) : (
          <div className="rounded-2xl bg-white/10 p-8 text-center text-white">
            <p className="text-4xl">🎉</p>
            <p className="mt-3 font-semibold">Dieses Event ist beendet.</p>
            <p className="mt-1 text-sm text-white/70">
              Es können keine Beiträge mehr eingereicht werden – danke fürs Mitmachen!
            </p>
          </div>
        )}

        <div className="mt-4 text-center">
          <Link
            href={`/e/${event.token}/stream`}
            className="text-sm text-white/60 underline hover:text-white"
          >
            Alle Beiträge ansehen →
          </Link>
        </div>

        <footer className="mt-8 text-center text-xs text-white/40">
          <Link href="/impressum" className="hover:text-white/70">Impressum</Link>
          {" · "}
          <Link href="/datenschutz" className="hover:text-white/70">Datenschutz</Link>
        </footer>
      </div>
    </main>
  );
}
