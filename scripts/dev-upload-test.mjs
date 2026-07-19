// Simuliert Gäste-Uploads gegen die lokale Selfiewall
import sharp from "sharp";

const TOKEN = process.argv[2];
const BASE = process.env.BASE ?? "http://localhost:3000";

const guests = [
  { name: "Lisa", message: "Beste Party ever! 🎉", color: { r: 220, g: 60, b: 90 } },
  { name: "Tom", message: null, color: { r: 40, g: 120, b: 200 } },
  { name: null, message: "Prost!", color: { r: 60, g: 180, b: 100 } },
];

for (const [i, guest] of guests.entries()) {
  const img = await sharp({
    create: { width: 1200, height: 1600, channels: 3, background: guest.color },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="1200" height="1600"><text x="600" y="800" font-size="120" fill="white" text-anchor="middle" font-family="sans-serif">Testbild ${i + 1}</text></svg>`
        ),
      },
    ])
    .jpeg()
    .toBuffer();

  const form = new FormData();
  form.append("file", new Blob([img], { type: "image/jpeg" }), "photo.jpg");
  if (guest.name) form.append("name", guest.name);
  if (guest.message) form.append("message", guest.message);
  form.append("consent", "true");

  const res = await fetch(`${BASE}/api/e/${TOKEN}/upload`, { method: "POST", body: form });
  console.log(`Upload ${i + 1}:`, res.status, await res.text());
}
