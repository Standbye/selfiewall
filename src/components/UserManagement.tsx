"use client";

import { useCallback, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  banned?: boolean | null;
  createdAt: string | Date;
};

const input =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-rose-500 focus:outline-none";

export function UserManagement({ myUserId }: { myUserId: string }) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const res = await authClient.admin.listUsers({
      query: { limit: 100, sortBy: "createdAt" },
    });
    if (res.data) {
      setUsers(res.data.users as ManagedUser[]);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(refresh, 0);
    return () => clearTimeout(t);
  }, [refresh]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await authClient.admin.createUser({
      name,
      email,
      password,
      role: "user",
    });
    setBusy(false);
    if (res.error) {
      setError(res.error.message ?? "Anlegen fehlgeschlagen.");
      return;
    }
    setName("");
    setEmail("");
    setPassword("");
    refresh();
  }

  async function toggleBan(user: ManagedUser) {
    if (user.banned) {
      await authClient.admin.unbanUser({ userId: user.id });
    } else {
      if (!confirm(`${user.email} sperren? Der Account kann sich dann nicht mehr anmelden.`)) return;
      await authClient.admin.banUser({ userId: user.id });
    }
    refresh();
  }

  async function removeUser(user: ManagedUser) {
    if (
      !confirm(
        `${user.email} endgültig löschen? Alle Events und Bilder dieses Accounts werden mitgelöscht!`
      )
    )
      return;
    const res = await authClient.admin.removeUser({ userId: user.id });
    if (res.error) setError(res.error.message ?? "Löschen fehlgeschlagen.");
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Neuer Veranstalter</h2>
        <form onSubmit={createUser} className="grid gap-3 sm:grid-cols-3">
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className={input} />
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-Mail" className={input} />
          <input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Passwort (min. 8 Zeichen)" className={input} />
          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
            >
              {busy ? "Legt an…" : "Veranstalter anlegen"}
            </button>
          </div>
        </form>
        {error && (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}
      </div>

      <div className="rounded-2xl bg-white shadow-sm">
        {!loaded ? (
          <p className="p-6 text-center text-zinc-500">Lade Benutzer…</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {users.map((user) => (
              <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900">{user.name}</span>
                    {user.role === "admin" && (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                        Superadmin
                      </span>
                    )}
                    {user.banned && (
                      <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-600">
                        gesperrt
                      </span>
                    )}
                    {user.id === myUserId && (
                      <span className="text-xs text-zinc-400">(du)</span>
                    )}
                  </div>
                  <div className="text-sm text-zinc-500">{user.email}</div>
                </div>
                {user.id !== myUserId && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleBan(user)}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                    >
                      {user.banned ? "Entsperren" : "Sperren"}
                    </button>
                    <button
                      onClick={() => removeUser(user)}
                      className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-50"
                    >
                      Löschen
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
