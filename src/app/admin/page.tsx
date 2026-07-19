import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const user = await requireUser();
  const events = await prisma.event.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { photos: true } } },
  });
  const pendingCounts = await prisma.photo.groupBy({
    by: ["eventId"],
    where: { event: { ownerId: user.id }, status: "pending" },
    _count: true,
  });
  const pendingByEvent = new Map(pendingCounts.map((p) => [p.eventId, p._count]));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Deine Events</h1>
        <Link
          href="/admin/events/new"
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
        >
          + Neues Event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center text-zinc-500">
          Noch keine Events. Lege dein erstes Event an! 🎉
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map((event) => {
            const pending = pendingByEvent.get(event.id) ?? 0;
            return (
              <li key={event.id}>
                <Link
                  href={`/admin/events/${event.id}`}
                  className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-900">{event.title}</span>
                      {event.status === "closed" && (
                        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-600">
                          beendet
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-zinc-500">
                      {event._count.photos} Bilder
                      {pending > 0 && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          {pending} warten auf Freigabe
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-zinc-400">→</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
