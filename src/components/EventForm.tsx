import { FONT_OPTIONS } from "@/lib/fonts";

type EventFormValues = {
  title?: string;
  motto?: string | null;
  primaryColor?: string;
  bgColor?: string;
  polaroidColor?: string;
  polaroidRadius?: number;
  moderationMode?: string;
  displaySeconds?: number;
  fontFamily?: string;
  bgDim?: number;
  customCssUpload?: string | null;
  customCssWall?: string | null;
  customCssStream?: string | null;
  hasLogo?: boolean;
  logoUrl?: string | null;
  hasBgImage?: boolean;
  bgImageUrl?: string | null;
};

const input =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-rose-500 focus:outline-none";
const label = "mb-1 block text-sm font-medium text-zinc-700";
const fileInput =
  "block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-200 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-700";

export function EventForm({
  action,
  values = {},
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  values?: EventFormValues;
  submitLabel: string;
}) {
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

      <fieldset className="rounded-xl border border-zinc-200 p-4">
        <legend className="px-1 text-sm font-semibold text-zinc-700">Gestaltung</legend>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={label} htmlFor="primaryColor">Akzentfarbe</label>
              <input id="primaryColor" name="primaryColor" type="color" defaultValue={values.primaryColor ?? "#e11d48"} className="h-10 w-full cursor-pointer rounded-lg border border-zinc-300" />
            </div>
            <div>
              <label className={label} htmlFor="bgColor">Hintergrund</label>
              <input id="bgColor" name="bgColor" type="color" defaultValue={values.bgColor ?? "#18181b"} className="h-10 w-full cursor-pointer rounded-lg border border-zinc-300" />
            </div>
            <div>
              <label className={label} htmlFor="polaroidColor">Polaroid-Rahmen</label>
              <input id="polaroidColor" name="polaroidColor" type="color" defaultValue={values.polaroidColor ?? "#ffffff"} className="h-10 w-full cursor-pointer rounded-lg border border-zinc-300" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label} htmlFor="fontFamily">Schriftart</label>
              <select id="fontFamily" name="fontFamily" defaultValue={values.fontFamily ?? "geist"} className={input}>
                {FONT_OPTIONS.map((f) => (
                  <option key={f.key} value={f.key}>{f.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="polaroidRadius">Polaroid-Eckenradius (px)</label>
              <input id="polaroidRadius" name="polaroidRadius" type="number" min={0} max={24} defaultValue={values.polaroidRadius ?? 4} className={input} />
            </div>
          </div>

          <div>
            <label className={label} htmlFor="bgImage">Hintergrundbild (optional, ersetzt die Hintergrundfarbe)</label>
            {values.hasBgImage && values.bgImageUrl && (
              <div className="mb-2 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={values.bgImageUrl} alt="Aktuelles Hintergrundbild" className="h-16 rounded-lg border border-zinc-200 object-cover" />
                <label className="flex items-center gap-2 text-sm text-zinc-600">
                  <input type="checkbox" name="removeBgImage" className="h-4 w-4" />
                  Hintergrundbild entfernen
                </label>
              </div>
            )}
            <input id="bgImage" name="bgImage" type="file" accept="image/*" className={fileInput} />
          </div>

          <div>
            <label className={label} htmlFor="bgDim">Abdunkelung des Hintergrundbilds ({values.bgDim ?? 40} %)</label>
            <input id="bgDim" name="bgDim" type="range" min={0} max={80} defaultValue={values.bgDim ?? 40} className="w-full" />
          </div>

          <div>
            <label className={label} htmlFor="logo">Logo (optional, PNG/JPG)</label>
            {values.hasLogo && values.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={values.logoUrl} alt="Aktuelles Logo" className="mb-2 h-16 rounded-lg border border-zinc-200 bg-zinc-50 p-1" />
            )}
            <input id="logo" name="logo" type="file" accept="image/*" className={fileInput} />
          </div>
        </div>
      </fieldset>

      <details className="rounded-xl border border-zinc-200 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-zinc-700">
          Erweitert: eigenes CSS je Seite
        </summary>
        <p className="mt-2 text-xs text-zinc-500">
          Wird als zusätzliches Stylesheet auf der jeweiligen Seite eingebunden.
          Fehlerhaftes CSS kann die Optik zerlegen – die Funktion bleibt intakt.
        </p>
        <div className="mt-3 space-y-3">
          {(
            [
              ["customCssUpload", "Upload-Seite", values.customCssUpload],
              ["customCssWall", "Wall", values.customCssWall],
              ["customCssStream", "Fotostream", values.customCssStream],
            ] as const
          ).map(([name, title, value]) => (
            <div key={name}>
              <label className={label} htmlFor={name}>{title}</label>
              <textarea
                id={name}
                name={name}
                defaultValue={value ?? ""}
                rows={4}
                spellCheck={false}
                className={`${input} font-mono text-xs`}
                placeholder={`/* Eigenes CSS für: ${title} */`}
              />
            </div>
          ))}
        </div>
      </details>

      <button
        type="submit"
        className="rounded-lg bg-rose-600 px-5 py-2.5 font-semibold text-white transition hover:bg-rose-700"
      >
        {submitLabel}
      </button>
    </form>
  );
}
