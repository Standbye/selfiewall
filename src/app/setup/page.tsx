import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const userCount = await prisma.user.count();
  if (userCount > 0) redirect("/login");

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-100 p-4">
      <AuthForm mode="setup" firstUser />
    </main>
  );
}
