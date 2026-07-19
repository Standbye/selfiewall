import Link from "next/link";
import { requireOwnedEvent } from "@/lib/session";
import { ModerationGrid } from "@/components/ModerationGrid";

export const dynamic = "force-dynamic";

export default async function ModerationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { event } = await requireOwnedEvent(id);

  return (
    <div>
      <Link href={`/admin/events/${event.id}`} className="text-sm text-zinc-500 hover:text-zinc-700">
        ← {event.title}
      </Link>
      <h1 className="mb-4 text-2xl font-bold text-zinc-900">Moderation</h1>
      <ModerationGrid
        mode={{ kind: "admin", eventId: event.id }}
        moderationMode={event.moderationMode}
      />
    </div>
  );
}
