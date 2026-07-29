import nodemailer, { type Transporter } from "nodemailer";

let cached: Transporter | null | undefined;

/**
 * SMTP-Versand ist optional: Ohne konfigurierte Zugangsdaten bleibt die
 * Funktion einfach aus, statt beim Schließen eines Events zu scheitern.
 */
export function mailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM);
}

function transporter(): Transporter | null {
  if (cached !== undefined) return cached;
  if (!mailConfigured()) {
    cached = null;
    return null;
  }
  const port = Number(process.env.SMTP_PORT ?? 587);
  cached = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465 = implizites TLS, sonst STARTTLS
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
    // Ohne Timeouts würde ein hängender Mailserver das Beenden eines Events
    // blockieren — der Versand darf nie wichtiger sein als die Aktion selbst.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return cached;
}

export type MailResult = { sent: number; failed: number; skipped?: string };

/**
 * Verschickt den Galerie-Link an alle Adressen. Empfänger stehen im BCC,
 * damit die Gäste die Adressen der anderen nicht sehen.
 */
export async function sendGalleryMail(opts: {
  recipients: string[];
  eventTitle: string;
  galleryUrl: string;
}): Promise<MailResult> {
  const tx = transporter();
  if (!tx) return { sent: 0, failed: 0, skipped: "SMTP nicht konfiguriert" };
  if (opts.recipients.length === 0) return { sent: 0, failed: 0 };

  const text = [
    `Hallo!`,
    ``,
    `die Fotos von „${opts.eventTitle}“ sind jetzt zum Ansehen und`,
    `Herunterladen bereit:`,
    ``,
    opts.galleryUrl,
    ``,
    `Viel Freude beim Erinnern!`,
  ].join("\n");

  const html = `
    <div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.6;color:#18181b">
      <p>Hallo!</p>
      <p>die Fotos von <strong>${escapeHtml(opts.eventTitle)}</strong> sind jetzt zum
      Ansehen und Herunterladen bereit:</p>
      <p><a href="${opts.galleryUrl}" style="display:inline-block;background:#e11d48;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Fotogalerie öffnen</a></p>
      <p style="color:#71717a;font-size:14px">${opts.galleryUrl}</p>
      <p>Viel Freude beim Erinnern!</p>
    </div>`;

  // In Paketen verschicken, damit kein Server an einer riesigen BCC-Liste
  // erstickt.
  const chunkSize = 50;
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < opts.recipients.length; i += chunkSize) {
    const chunk = opts.recipients.slice(i, i + chunkSize);
    try {
      await tx.sendMail({
        from: process.env.MAIL_FROM,
        to: process.env.MAIL_FROM,
        bcc: chunk,
        subject: `Die Fotos von ${opts.eventTitle} sind da 📸`,
        text,
        html,
      });
      sent += chunk.length;
    } catch (err) {
      console.error("[mail] Versand fehlgeschlagen:", err);
      failed += chunk.length;
    }
  }
  return { sent, failed };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}
