export const metadata = { title: "Impressum – Selfiewall" };

// Dynamisch, damit der CSP-Nonce pro Anfrage passt (siehe src/proxy.ts)
export const dynamic = "force-dynamic";

export default function ImpressumPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Impressum</h1>
      <div className="space-y-4 text-sm leading-relaxed">
        <p>Angaben gemäß § 5 DDG:</p>
        <p>
          {/* TODO: Vor dem produktiven Einsatz mit echten Betreiberdaten füllen */}
          [Name des Betreibers]
          <br />
          [Straße und Hausnummer]
          <br />
          [PLZ und Ort]
        </p>
        <p>
          Kontakt: [E-Mail-Adresse]
        </p>
      </div>
    </main>
  );
}
