import type { Event } from "@/generated/prisma/client";
import { fontCss } from "./fonts";

/** CSS-Variablen für die öffentlichen Event-Seiten (Upload, Wall, Stream). */
export function eventStyle(event: Event): React.CSSProperties {
  return {
    backgroundColor: event.bgColor,
    fontFamily: fontCss(event.fontFamily),
    "--ev-primary": event.primaryColor,
    "--ev-bg": event.bgColor,
    "--ev-polaroid": event.polaroidColor,
    "--ev-polaroid-radius": `${event.polaroidRadius}px`,
    "--ev-bg-dim": String(event.bgDim / 100),
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
