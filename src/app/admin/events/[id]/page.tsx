import Link from "next/link";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { requireOwnedEvent } from "@/lib/session";
import {
  updateEvent,
  setEventStatus,
  deleteEvent,
  regenerateModerationLink,
  revokeModerationLink,
} from "@/app/admin/actions";
import { EventForm } from "@/components/EventForm";
import { CopyButton } from "@/components/CopyButton";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { BatchUpload } from "@/components/BatchUpload";

export const dynamic = "force-dynamic";

function UrlRow({ label, url }: { label: string; url: string }) {
  return (
    <div>
      <div className="text-sm font-medium text-zinc-700">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <a href={url} target="_blank" className="truncate rounded-lg bg-zinc-100 px-3 py-1.5 text-sm text-zinc-700">
          {url}
        </a>
        <CopyButton text={url} />
      </div>
    </div>
  );
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { event } = await requireOwnedEvent(id);

  const [total, pending, approved] = await Promise.all([
    prisma.photo.count({ where: { eventId: event.id } }),
    prisma.photo.count({ where: { eventId: event.id, status: "pending" } }),
    prisma.photo.count({ where: { eventId: event.id, status: "approved" } }),
  ]);

  const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
  const uploadUrl = `${baseUrl}/e/${event.token}`;
  const wallUrl = `${baseUrl}/e/${event.token}/wall`;
  const streamUrl = `${baseUrl}/e/${event.token}/stream`;
  const modUrl = event.moderationToken ? `${baseUrl}/m/${event.moderationToken}` : null;
  const uploadQr = await QRCode.toDataURL(uploadUrl, { width: 400, margin: 2 });

  const closed = event.status === "closed";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin" className="text-sm text-zinc-500 hover:text-zinc-700">
            ← Alle Events
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900">
            {event.title}
            {closed && (
              <span className="ml-2 align-middle rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-normal text-zinc-600">
                beendet
              </span>
            )}
          </h1>
        </div>
        <Link
          href={`/admin/events/${event.id}/moderation`}
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
        >
          Moderation
          {pending > 0 && (
            <span className="ml-2 rounded-full bg-white/25 px-2 py-0.5 text-xs">{pending}</span>
          )}
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Beiträge gesamt", value: total },
          { label: "Freigegeben", value: approved },
          { label: "Wartend", value: pending },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="text-2xl font-bold text-zinc-900">{stat.value}</div>
            <div className="text-sm text-zinc-500">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Links & QR-Code</h2>
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="shrink-0 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={uploadQr} alt="QR-Code zur Upload-Seite" className="mx-auto w-40 rounded-lg border border-zinc-200" />
            <a
              href={uploadQr}
              download={`selfiewall-qr-${event.title}.png`}
              className="mt-2 inline-block text-sm text-rose-600 hover:underline"
            >
              QR-Code herunterladen
            </a>
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <UrlRow label="Upload-Seite (für Gäste)" url={uploadUrl} />
            <UrlRow label="Wall (für Beamer/TV)" url={wallUrl} />
            <UrlRow label="Fotostream (Feed für Gäste)" url={streamUrl} />
            <a
              href={`/api/admin/events/${event.id}/zip`}
              className="inline-block rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              ⬇ Alle freigegebenen Bilder als ZIP
            </a>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-zinc-900">Moderations-Link</h2>
        <p className="mb-4 text-sm text-zinc-500">
          Wer diesen Link hat, kann Beiträge freigeben, ablehnen und löschen –
          ohne Account. Ideal für Party-Helfer. Beim Neu-Generieren verfällt der
          alte Link sofort.
        </p>
        {modUrl ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="truncate rounded-lg bg-zinc-100 px-3 py-1.5 text-sm text-zinc-700">{modUrl}</span>
              <CopyButton text={modUrl} />
            </div>
            <div className="flex gap-3">
              <form action={regenerateModerationLink.bind(null, event.id)}>
                <ConfirmSubmit
                  message="Link neu generieren? Der bisherige Link funktioniert dann nicht mehr."
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                >
                  Neu generieren
                </ConfirmSubmit>
              </form>
              <form action={revokeModerationLink.bind(null, event.id)}>
                <ConfirmSubmit
                  message="Moderations-Link deaktivieren? Helfer können dann nicht mehr moderieren."
                  className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
                >
                  Deaktivieren
                </ConfirmSubmit>
              </form>
            </div>
          </div>
        ) : (
          <form action={regenerateModerationLink.bind(null, event.id)}>
            <button
              type="submit"
              className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
            >
              Moderations-Link erstellen
            </button>
          </form>
        )}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-zinc-900">Batch-Upload</h2>
        <p className="mb-4 text-sm text-zinc-500">
          Eigene Bilder vorab oder nachträglich einspielen – z. B. damit die Wall
          zum Partystart nicht leer ist.
        </p>
        <BatchUpload eventId={event.id} />
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Einstellungen</h2>
        <EventForm
          key={event.updatedAt.getTime()}
          action={updateEvent.bind(null, event.id)}
          values={{
            title: event.title,
            motto: event.motto,
            primaryColor: event.primaryColor,
            bgColor: event.bgColor,
            polaroidColor: event.polaroidColor,
            polaroidRadius: event.polaroidRadius,
            moderationMode: event.moderationMode,
            displaySeconds: event.displaySeconds,
            fontFamily: event.fontFamily,
            wallStyle: event.wallStyle,
            textColor: event.textColor,
            titleBackdrop: event.titleBackdrop,
            bgDim: event.bgDim,
            customCssUpload: event.customCssUpload,
            customCssWall: event.customCssWall,
            customCssStream: event.customCssStream,
            hasLogo: !!event.logoPath,
            logoUrl: event.logoPath ? `/api/img/logo-${event.id}` : null,
            hasBgImage: !!event.bgImagePath,
            bgImageUrl: event.bgImagePath ? `/api/img/bg-${event.id}` : null,
          }}
          submitLabel="Speichern"
        />
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Event verwalten</h2>
        <div className="flex flex-wrap gap-3">
          <form action={setEventStatus.bind(null, event.id, closed ? "active" : "closed")}>
            <ConfirmSubmit
              message={
                closed
                  ? "Event wieder öffnen? Gäste können dann erneut Beiträge schicken."
                  : "Event beenden? Gäste können dann keine Beiträge mehr schicken. Wall und Stream bleiben verfügbar."
              }
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              {closed ? "Event wieder öffnen" : "Event beenden"}
            </ConfirmSubmit>
          </form>
          <form action={deleteEvent.bind(null, event.id)}>
            <ConfirmSubmit
              message="Event und ALLE Beiträge unwiderruflich löschen?"
              className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
            >
              Event löschen
            </ConfirmSubmit>
          </form>
        </div>
      </div>
    </div>
  );
}
