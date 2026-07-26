export const metadata = { title: "Datenschutz – Selfiewall" };

// Dynamisch, damit der CSP-Nonce pro Anfrage passt (siehe src/proxy.ts)
export const dynamic = "force-dynamic";

export default function DatenschutzPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Datenschutzerklärung</h1>
      <div className="space-y-4 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold">Verantwortlicher</h2>
        <p>
          {/* TODO: Vor dem produktiven Einsatz mit echten Betreiberdaten füllen */}
          [Name und Kontaktdaten des Verantwortlichen]
        </p>

        <h2 className="text-lg font-semibold">Welche Daten werden verarbeitet?</h2>
        <p>
          Beim Hochladen eines Bildes werden das Bild selbst sowie – sofern
          freiwillig angegeben – Name und Grußtext gespeichert. Zusätzlich wird
          zur Missbrauchsvermeidung (Upload-Begrenzung) vorübergehend die
          IP-Adresse sowie eine zufällige Geräte-Kennung (Cookie) gespeichert.
          Metadaten der Bilder (z. B. EXIF-Daten wie Aufnahmeort) werden beim
          Hochladen automatisch entfernt.
        </p>

        <h2 className="text-lg font-semibold">Zweck und Rechtsgrundlage</h2>
        <p>
          Die Bilder werden ausschließlich zur Anzeige auf der Fotowand der
          jeweiligen Veranstaltung verwendet (Einwilligung, Art. 6 Abs. 1 lit. a
          DSGVO). Die Einwilligung wird beim Hochladen aktiv erteilt.
        </p>

        <h2 className="text-lg font-semibold">Speicherdauer und Löschung</h2>
        <p>
          Die Bilder werden nach Ende der Veranstaltung vom Veranstalter
          gelöscht. Du kannst jederzeit die Löschung deines Bildes verlangen –
          wende dich dazu an den Veranstalter (Kontakt siehe Impressum).
        </p>

        <h2 className="text-lg font-semibold">Cookies</h2>
        <p>
          Es wird ausschließlich ein technisch notwendiges Cookie zur
          Upload-Begrenzung und zur Vermeidung doppelter
          „Gefällt-mir“-Markierungen gesetzt. Es findet kein Tracking statt.
        </p>
      </div>
    </main>
  );
}
