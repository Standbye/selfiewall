import Link from "next/link";
import { requireUser } from "@/lib/session";
import { LogoutButton } from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-zinc-100">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="text-lg font-bold text-zinc-900">
            📸 Selfiewall
          </Link>
          <div className="flex items-center gap-3 text-sm text-zinc-600">
            {user.role === "admin" && (
              <Link
                href="/admin/users"
                className="rounded-lg px-2 py-1.5 font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                Benutzer
              </Link>
            )}
            <span className="hidden sm:inline">{user.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
