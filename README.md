# 📸 Selfiewall

Live-Fotowand für Veranstaltungen: Gäste laden per Smartphone Fotos hoch, die auf
einem Beamer/TV als rotierende Polaroids vor einem Grid aller Bilder angezeigt
werden. Multimandantenfähig – mehrere Veranstalter, mehrere Events, jedes mit
eigener nicht ratbarer URL, eigenem Theming und QR-Code.

## Features

- **Gäste-Upload** (mobil): Kamera oder Galerie, optional Name + Grußtext,
  Einverständnis-Checkbox, clientseitige Bildkompression
- **Moderation** pro Event umschaltbar: Pre-Moderation (erst freigeben) oder
  Post-Moderation (sofort sichtbar); mobiltaugliche Moderationsansicht
- **Wall**: Vollbild, Hintergrund-Grid + Polaroid-Vordergrund, Live-Updates per
  SSE (neue Bilder werden bevorzugt gezeigt), einstellbare Anzeigedauer,
  QR-Code-Einblendung
- **Spam-Schutz**: max. 10 Uploads pro 30 Minuten pro Gerät/IP
- **Datenschutz**: EXIF-Daten werden serverseitig entfernt, Consent beim Upload,
  Impressum/Datenschutz-Seiten (Platzhalter → vor Produktivbetrieb ausfüllen!)
- **Event-Abschluss**: Upload sperren, alle freigegebenen Bilder als ZIP laden
- **Öffentliche Galerie**: eigener Link zum Ansehen und Herunterladen aller
  freigegebenen Fotos (ohne Login); Gäste können beim Hochladen freiwillig eine
  E-Mail-Adresse hinterlassen und bekommen den Link beim Beenden des Events
  automatisch zugeschickt

## Deployment (Docker)

```bash
# Image bauen
docker compose build

# Secret erzeugen und starten
BETTER_AUTH_SECRET=$(openssl rand -base64 32) \
BASE_URL=https://selfiewall.example.de \
docker compose up -d
```

Beim ersten Aufruf der Seite wird der erste Admin-Account angelegt (Setup-Seite).
Danach ist die Registrierung gesperrt, solange `ALLOW_REGISTRATION` nicht auf
`true` steht.

### Umgebungsvariablen

| Variable | Pflicht | Beschreibung |
|---|---|---|
| `BETTER_AUTH_SECRET` | ja | Langer zufälliger String (Session-Signierung) |
| `BASE_URL` | ja | Öffentliche URL, z. B. `https://selfiewall.example.de` – wird für QR-Codes und Auth verwendet |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | nein | Für den automatischen Versand des Galerie-Links nach dem Event. Ohne diese Werte bleibt der Mailversand einfach aus, alles andere funktioniert normal. |

### Daten & Backup

Alles Persistente liegt im Volume `/data` (`./data` auf dem Host):
`db.sqlite` (Datenbank) und `uploads/<eventId>/…` (Bilder).
**Backup = dieses eine Verzeichnis sichern.** Migrationen laufen automatisch beim
Containerstart.

### Reverse Proxy

Der Container spricht HTTP auf Port 3000. HTTPS macht der vorhandene Reverse
Proxy (nginx/Caddy/Traefik). Wichtig: `X-Forwarded-For` durchreichen, damit das
Upload-Rate-Limit echte Client-IPs sieht.

## Entwicklung

```bash
npm install
npx prisma migrate dev   # legt data/db.sqlite an
npm run dev
```

`.env` enthält Dev-Defaults. Testuploads: `node scripts/dev-upload-test.mjs <event-token>`.

## Vor dem ersten echten Einsatz

- [ ] `src/app/impressum/page.tsx` und `src/app/datenschutz/page.tsx` mit echten
      Betreiberdaten füllen (aktuell Platzhalter)
- [ ] `BASE_URL` korrekt setzen, sonst zeigen QR-Codes auf localhost
