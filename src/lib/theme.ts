import type { Event } from "@/generated/prisma/client";
import { fontCss } from "./fonts";
import { isLightColor } from "./color";

/**
 * CSS-Variablen für die öffentlichen Event-Seiten (Upload, Wall, Stream).
 * Die Textfarben passen sich der Helligkeit des Event-Hintergrunds an —
 * weiße Schrift auf weißem Hintergrund war V2s peinlichster Bug.
 */
export function eventStyle(event: Event): React.CSSProperties {
  const light = isLightColor(event.bgColor);
  return {
    backgroundColor: event.bgColor,
    fontFamily: fontCss(event.fontFamily),
    "--ev-primary": event.primaryColor,
    "--ev-bg": event.bgColor,
    "--ev-polaroid": event.polaroidColor,
    "--ev-polaroid-radius": `${event.polaroidRadius}px`,
    "--ev-bg-dim": String(event.bgDim / 100),
    "--ev-text": light ? "#1c1c1a" : "#ffffff",
    "--ev-text-soft": light ? "rgba(20,20,18,0.65)" : "rgba(255,255,255,0.7)",
    "--ev-text-faint": light ? "rgba(20,20,18,0.45)" : "rgba(255,255,255,0.4)",
    "--ev-card": light ? "rgba(20,20,18,0.06)" : "rgba(255,255,255,0.10)",
    "--ev-card-hover": light ? "rgba(20,20,18,0.10)" : "rgba(255,255,255,0.15)",
  } as React.CSSProperties;
}

/**
 * Custom-CSS des Veranstalters als <style>-Inhalt. Nur minimal entschärft:
 * ein schließendes </style> darf den Block nicht sprengen.
 */
export function sanitizeCustomCss(css: string | null): string | null {
  if (!css?.trim()) return null;
  return css.replace(/<\s*\/?\s*style/gi, "");
}
