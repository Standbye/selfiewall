import { Playfair_Display, Caveat, Montserrat, Fredoka } from "next/font/google";

// Kuratierte Event-Schriften. next/font bündelt sie beim Build lokal —
// zur Laufzeit wird kein Google-CDN kontaktiert.
export const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  preload: false,
});

export const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  preload: false,
});

export const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  preload: false,
});

export const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
  preload: false,
});

export const eventFontClasses = [
  playfair.variable,
  caveat.variable,
  montserrat.variable,
  fredoka.variable,
].join(" ");

export const FONT_OPTIONS = [
  { key: "geist", label: "Standard (Geist)", css: "var(--font-geist-sans)" },
  { key: "playfair", label: "Elegant (Playfair Display)", css: "var(--font-playfair)" },
  { key: "caveat", label: "Handschrift (Caveat)", css: "var(--font-caveat)" },
  { key: "montserrat", label: "Modern (Montserrat)", css: "var(--font-montserrat)" },
  { key: "fredoka", label: "Verspielt (Fredoka)", css: "var(--font-fredoka)" },
] as const;

export function fontCss(key: string) {
  return FONT_OPTIONS.find((f) => f.key === key)?.css ?? FONT_OPTIONS[0].css;
}
