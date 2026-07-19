import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { Wall } from "@/components/Wall";

export const dynamic = "force-dynamic";

export default async function WallPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const event = await prisma.event.findUnique({ where: { token } });
  if (!event) notFound();

  const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
  const uploadUrl = `${baseUrl}/e/${event.token}`;
  const qrDataUrl = await QRCode.toDataURL(uploadUrl, { width: 300, margin: 1 });

  return (
    <Wall
      token={event.token}
      title={event.title}
      motto={event.motto}
      primaryColor={event.primaryColor}
      bgColor={event.bgColor}
      displaySeconds={event.displaySeconds}
      qrDataUrl={qrDataUrl}
      active={event.status === "active"}
    />
  );
}
