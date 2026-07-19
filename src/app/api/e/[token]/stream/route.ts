import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { photoBus, type WallPhoto } from "@/lib/bus";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const event = await prisma.event.findUnique({ where: { token } });
  if (!event) return new Response("Not found", { status: 404 });

  const encoder = new TextEncoder();
  const addedEvent = `photo:${event.id}`;
  const removedEvent = `photo-removed:${event.id}`;

  const stream = new ReadableStream({
    start(controller) {
      const send = (type: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          cleanup();
        }
      };
      const onPhoto = (photo: WallPhoto) => send("photo", photo);
      const onRemoved = (photoId: string) => send("removed", { id: photoId });
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          cleanup();
        }
      }, 25_000);

      const cleanup = () => {
        clearInterval(heartbeat);
        photoBus.off(addedEvent, onPhoto);
        photoBus.off(removedEvent, onRemoved);
        try {
          controller.close();
        } catch {
          // bereits geschlossen
        }
      };

      photoBus.on(addedEvent, onPhoto);
      photoBus.on(removedEvent, onRemoved);
      req.signal.addEventListener("abort", cleanup);
      send("hello", { ok: true });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
