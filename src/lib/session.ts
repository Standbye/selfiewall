import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { prisma } from "./prisma";

export async function getUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/** Lädt ein Event und stellt sicher, dass es dem eingeloggten Nutzer gehört. */
export async function requireOwnedEvent(eventId: string) {
  const user = await requireUser();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.ownerId !== user.id) redirect("/admin");
  return { user, event };
}

/** Nur für den Superadmin (erster Account, Rolle "admin"). */
export async function requireSuperadmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/admin");
  return user;
}

/** Lädt ein Event über den geheimen Moderations-Token (ohne Login). */
export async function findEventByModerationToken(modToken: string) {
  if (!modToken) return null;
  return prisma.event.findUnique({ where: { moderationToken: modToken } });
}
