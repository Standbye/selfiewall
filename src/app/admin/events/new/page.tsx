import { createEvent } from "@/app/admin/actions";
import { EventForm } from "@/components/EventForm";

export const dynamic = "force-dynamic";

export default function NewEventPage() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">Neues Event</h1>
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <EventForm action={createEvent} submitLabel="Event anlegen" />
      </div>
    </div>
  );
}
