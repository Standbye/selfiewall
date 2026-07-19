import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";
import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getUser()) redirect("/admin");
  const userCount = await prisma.user.count();
  if (userCount === 0) redirect("/setup");

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-100 p-4">
      <AuthForm mode="login" />
    </main>
  );
}
