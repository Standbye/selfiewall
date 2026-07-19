"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function AuthForm({
  mode,
  firstUser,
}: {
  mode: "login" | "setup";
  firstUser?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result =
      mode === "login"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name });
    setBusy(false);
    if (result.error) {
      setError(result.error.message ?? "Das hat leider nicht geklappt.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg"
    >
      <h1 className="mb-1 text-2xl font-bold text-zinc-900">📸 Selfiewall</h1>
      <p className="mb-6 text-sm text-zinc-500">
        {mode === "login"
          ? "Melde dich an, um deine Events zu verwalten."
          : firstUser
            ? "Willkommen! Lege den ersten Admin-Account an."
            : "Neuen Veranstalter-Account anlegen."}
      </p>

      {mode === "setup" && (
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium text-zinc-700">Name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-rose-500 focus:outline-none"
          />
        </label>
      )}

      <label className="mb-4 block">
        <span className="mb-1 block text-sm font-medium text-zinc-700">E-Mail</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-rose-500 focus:outline-none"
        />
      </label>

      <label className="mb-6 block">
        <span className="mb-1 block text-sm font-medium text-zinc-700">Passwort</span>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-rose-500 focus:outline-none"
        />
      </label>

      {error && (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-rose-600 py-2.5 font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
      >
        {busy ? "Bitte warten…" : mode === "login" ? "Anmelden" : "Account anlegen"}
      </button>
    </form>
  );
}
