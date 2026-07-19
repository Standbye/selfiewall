import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StreamFeed } from "@/components/StreamFeed";
import { eventStyle, sanitizeCustomCss } from "@/lib/theme";

export const dynamic = "force-dynamic";

export default async function StreamPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const event = await prisma.event.findUnique({ where: { token } });
  if (!event) notFound();

  const customCss = sanitizeCustomCss(event.customCssStream);

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-6" style={eventStyle(event)}>
      {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}
      <div className="w-full max-w-lg">
        <header className="mb-6 flex items-center justify-center gap-3 text-center">
          {event.logoPath && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/img/logo-${event.id}`} alt="" className="max-h-12" />
          )}
          <div>
            <h1 className="ev-text text-2xl font-bold">{event.title}</h1>
            {event.motto && <p className="ev-text-soft text-sm">{event.motto}</p>}
          </div>
        </header>

        {event.status === "active" && (
          <Link
            href={`/e/${event.token}`}
            className="mb-6 block rounded-xl py-3 text-center font-semibold text-white"
            style={{ backgroundColor: event.primaryColor }}
          >
            📤 Eigenen Beitrag schicken
          </Link>
        )}

        <StreamFeed token={event.token} primaryColor={event.primaryColor} />

        <footer className="ev-text-faint mt-10 text-center text-xs">
          <Link href="/impressum" className="underline">Impressum</Link>
          {" · "}
          <Link href="/datenschutz" className="underline">Datenschutz</Link>
        </footer>
      </div>
    </main>
  );
}
