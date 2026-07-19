type EventFormValues = {
  title?: string;
  motto?: string | null;
  primaryColor?: string;
  bgColor?: string;
  moderationMode?: string;
  displaySeconds?: number;
  hasLogo?: boolean;
  logoUrl?: string | null;
};

export function EventForm({
  action,
  values = {},
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  values?: EventFormValues;
  submitLabel: string;
}) {
  const input =
    "w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-rose-500 focus:outline-none";
  const label = "mb-1 block text-sm font-medium text-zinc-700";

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className={label} htmlFor="title">Titel *</label>
        <input id="title" name="title" required defaultValue={values.title ?? ""} className={input} placeholder="z. B. Hochzeit Anna & Tom" />
      </div>
      <div>
        <label className={label} htmlFor="motto">Motto / Untertitel</label>
        <input id="motto" name="motto" defaultValue={values.motto ?? ""} className={input} placeholder="z. B. 12. September 2026" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label} htmlFor="primaryColor">Akzentfarbe</label>
          <input id="primaryColor" name="primaryColor" type="color" defaultValue={values.primaryColor ?? "#e11d48"} className="h-10 w-full cursor-pointer rounded-lg border border-zinc-300" />
        </div>
        <div>
          <label className={label} htmlFor="bgColor">Hintergrundfarbe (Wall)</label>
          <input id="bgColor" name="bgColor" type="color" defaultValue={values.bgColor ?? "#18181b"} className="h-10 w-full cursor-pointer rounded-lg border border-zinc-300" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label} htmlFor="moderationMode">Moderation</label>
          <select id="moderationMode" name="moderationMode" defaultValue={values.moderationMode ?? "pre"} className={input}>
            <option value="pre">Erst freigeben, dann anzeigen</option>
            <option value="post">Sofort anzeigen</option>
          </select>
        </div>
        <div>
          <label className={label} htmlFor="displaySeconds">Anzeigedauer (Sek.)</label>
          <input id="displaySeconds" name="displaySeconds" type="number" min={3} max={60} defaultValue={values.displaySeconds ?? 8} className={input} />
        </div>
      </div>

      <div>
        <label className={label} htmlFor="logo">Logo (optional, PNG/JPG)</label>
        {values.hasLogo && values.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={values.logoUrl} alt="Aktuelles Logo" className="mb-2 h-16 rounded-lg border border-zinc-200 bg-zinc-50 p-1" />
        )}
        <input id="logo" name="logo" type="file" accept="image/*" className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-200 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-700" />
      </div>

      <button
        type="submit"
        className="rounded-lg bg-rose-600 px-5 py-2.5 font-semibold text-white transition hover:bg-rose-700"
      >
        {submitLabel}
      </button>
    </form>
  );
}
