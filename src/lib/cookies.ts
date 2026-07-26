/** Optionen für das Gäste-Cookie (Upload-Limit und Doppel-Like-Schutz). */
export function guestCookieOptions() {
  const secure = (process.env.BASE_URL ?? "").startsWith("https://");
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  };
}
