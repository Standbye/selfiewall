# 📸 Selfiewall

Live-Fotowand für Veranstaltungen: Gäste schicken per Smartphone Fotos,
Zeichnungen und Grüße, die auf einem Beamer oder TV als rotierende Polaroids vor
einem Grid aller Bilder erscheinen. Multimandantenfähig – mehrere Veranstalter,
mehrere Events, jedes mit eigener nicht ratbarer URL, eigenem Theming und
QR-Code.

## Schnellstart

Es genügt Docker und die `docker-compose.yml` – der Quellcode wird nicht
gebraucht, das Image kommt fertig aus der GitHub Container Registry:

```bash
mkdir selfiewall && cd selfiewall
curl -O https://raw.githubusercontent.com/Standbye/selfiewall/main/docker-compose.yml

BETTER_AUTH_SECRET=$(openssl rand -base64 32) \
BASE_URL=http://localhost:3000 \
docker compose up -d
```

Dann http://localhost:3000 öffnen und den ersten Admin-Account anlegen – danach
ist die Registrierung automatisch gesperrt. Für den echten Betrieb gehört ein
Reverse Proxy mit HTTPS davor und `BASE_URL` auf die öffentliche Adresse
(sonst zeigen die QR-Codes auf localhost). Alle Daten liegen im Verzeichnis
`./data`.

### So läuft ein Event ab

1. Als Veranstalter ein Event anlegen – Titel, Farben, Logo, Moderationsmodus.
2. Den QR-Code ausdrucken oder auf die Wall einblenden; Gäste landen darüber auf
   der Upload-Seite.
3. Die Wall (`/e/<token>/wall`) im Vollbild auf Beamer oder TV öffnen.
4. Während der Feier moderieren – am eigenen Handy oder per Moderations-Link,
   den Helfer ohne Account nutzen können.
5. Nach dem Fest das Event beenden: Uploads sind zu, die Bilder gibt es als ZIP
   oder über einen öffentlichen Galerie-Link, der auf Wunsch automatisch per
   E-Mail an die Gäste geht.

## Features

- **Gäste-Upload** (mobil): Kamera oder Galerie, optional Name + Grußtext,
  Einverständnis-Checkbox, clientseitige Bildkompression
- **Moderation** pro Event umschaltbar: Pre-Moderation (erst freigeben) oder
  Post-Moderation (sofort sichtbar); mobiltaugliche Moderationsansicht
- **Wall**: Vollbild, Hintergrund-Grid + Polaroid-Vordergrund, Live-Updates per
  SSE (neue Bilder werden bevorzugt gezeigt), einstellbare Anzeigedauer,
  QR-Code-Einblendung
- **Beitragsarten**: Foto (Kamera oder Galerie), mit dem Finger gemaltes Bild
  oder reine Textnachricht als Karte auf der Wall
- **Fotostream**: chronologischer Feed aller Beiträge mit ❤️-Likes; der Zähler
  erscheint auch auf dem Polaroid der Wall
- **Rollen**: erster Account ist Superadmin und legt Veranstalter an; pro Event
  ein Moderations-Link für Helfer – ohne Account, jederzeit widerrufbar
- **Spam-Schutz**: 10 Beiträge pro 30 Minuten pro Gerät (IP-Limit bewusst hoch,
  weil auf Feiern alle Gäste hinter derselben Adresse hängen)
- **Gehärtet**: strenge Content-Security-Policy mit Nonce, HSTS,
  Brute-Force-Bremse am Login, Grenzen gegen Dekompressionsbomben
- **Datenschutz**: EXIF-Daten werden serverseitig entfernt, Consent beim Upload,
  Impressum/Datenschutz-Seiten (Platzhalter → vor Produktivbetrieb ausfüllen!)
- **Event-Abschluss**: Upload sperren, alle freigegebenen Bilder als ZIP laden
- **Öffentliche Galerie**: eigener Link zum Ansehen und Herunterladen aller
  freigegebenen Fotos (ohne Login); Gäste können beim Hochladen freiwillig eine
  E-Mail-Adresse hinterlassen und bekommen den Link beim Beenden des Events
  automatisch zugeschickt

## Deployment (Docker)

Bei jedem Push auf `main` baut GitHub Actions das Image und veröffentlicht es
als `ghcr.io/standbye/selfiewall:latest` sowie unter `sha-<commit>`. Auf dem
Zielsystem muss also nichts mehr gebaut werden:

```bash
# Secret erzeugen und starten
BETTER_AUTH_SECRET=$(openssl rand -base64 32) \
BASE_URL=https://selfiewall.example.de \
docker compose up -d
```

Eine bestimmte Version ausrollen (z. B. zum Zurückrollen):

```bash
SELFIEWALL_IMAGE=ghcr.io/standbye/selfiewall:sha-1a2b3c4 docker compose up -d
```

Ohne Registry geht es weiterhin lokal: `docker compose up -d --build`.
Das Image ist für `linux/amd64` gebaut – auf ARM-Systemen (z. B. Raspberry Pi)
selbst bauen.

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
