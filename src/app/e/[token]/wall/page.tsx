import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { Wall } from "@/components/Wall";
import { fontCss } from "@/lib/fonts";
import { sanitizeCustomCss } from "@/lib/theme";

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
  const customCss = sanitizeCustomCss(event.customCssWall);

  return (
    <div style={{ fontFamily: fontCss(event.fontFamily) }}>
      {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}
      <Wall
        token={event.token}
        wallStyle={event.wallStyle}
        textColor={event.textColor}
        titleBackdrop={event.titleBackdrop}
        title={event.title}
        motto={event.motto}
        primaryColor={event.primaryColor}
        polaroidColor={event.polaroidColor}
        polaroidRadius={event.polaroidRadius}
        bgColor={event.bgColor}
        bgImageUrl={event.bgImagePath ? `/api/img/bg-${event.id}` : null}
        bgDim={event.bgDim}
        displaySeconds={event.displaySeconds}
        qrDataUrl={qrDataUrl}
        logoUrl={event.logoPath ? `/api/img/logo-${event.id}` : null}
        active={event.status === "active"}
      />
    </div>
  );
}
