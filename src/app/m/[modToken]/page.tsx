import { notFound } from "next/navigation";
import { findEventByModerationToken } from "@/lib/session";
import { ModerationGrid } from "@/components/ModerationGrid";

export const dynamic = "force-dynamic";

/** Moderationsseite über den geheimen Link — kein Login nötig. */
export default async function ModerationLinkPage({
  params,
}: {
  params: Promise<{ modToken: string }>;
}) {
  const { modToken } = await params;
  const event = await findEventByModerationToken(modToken);
  if (!event) notFound();

  return (
    <main className="min-h-screen flex-1 bg-zinc-100">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-3">
          <span className="text-lg font-bold text-zinc-900">📸 {event.title}</span>
          <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
            Moderation
          </span>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-6">
        <p className="mb-4 text-sm text-zinc-500">
          Du moderierst dieses Event über einen geteilten Link. Du kannst
          Beiträge freigeben, ablehnen und löschen.
        </p>
        <ModerationGrid
          mode={{ kind: "link", modToken }}
          moderationMode={event.moderationMode}
        />
      </div>
    </main>
  );
}
