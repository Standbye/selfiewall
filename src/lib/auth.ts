import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "sqlite" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BASE_URL ?? "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
  },
  hooks: {
    // Registrierung ist nur offen, solange noch kein Account existiert
    // (Erst-Setup) oder wenn ALLOW_REGISTRATION=true gesetzt ist.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email") {
        const userCount = await prisma.user.count();
        if (userCount > 0 && process.env.ALLOW_REGISTRATION !== "true") {
          throw new APIError("FORBIDDEN", {
            message: "Die Registrierung ist deaktiviert.",
          });
        }
      }
    }),
  },
});
