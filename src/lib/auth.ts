import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { admin } from "better-auth/plugins";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "sqlite" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BASE_URL ?? "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    admin(), // Superadmin-Rolle "admin", Nutzerverwaltung über /admin/users
  ],
  hooks: {
    // Öffentliche Registrierung gibt es nur für den allerersten Account
    // (Erst-Setup). Danach legt der Superadmin Veranstalter an.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email") {
        const userCount = await prisma.user.count();
        if (userCount > 0) {
          throw new APIError("FORBIDDEN", {
            message: "Die Registrierung ist deaktiviert.",
          });
        }
      }
    }),
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Der erste Account der Instanz wird Superadmin
          const count = await prisma.user.count();
          if (count === 1) {
            await prisma.user.update({
              where: { id: user.id },
              data: { role: "admin" },
            });
          }
        },
      },
    },
  },
});

export type AuthUser = typeof auth.$Infer.Session.user;
