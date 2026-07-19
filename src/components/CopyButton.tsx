"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="shrink-0 rounded-lg border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 transition hover:bg-zinc-50"
    >
      {copied ? "✓ Kopiert" : "Kopieren"}
    </button>
  );
}
