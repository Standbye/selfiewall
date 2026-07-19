import Link from "next/link";
import { requireSuperadmin } from "@/lib/session";
import { UserManagement } from "@/components/UserManagement";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const me = await requireSuperadmin();

  return (
    <div>
      <Link href="/admin" className="text-sm text-zinc-500 hover:text-zinc-700">
        ← Events
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-zinc-900">Benutzerverwaltung</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Lege Veranstalter-Accounts an. Jeder Veranstalter sieht nur seine
        eigenen Events und kann dort selbst Moderations-Links erzeugen.
      </p>
      <UserManagement myUserId={me.id} />
    </div>
  );
}
