/** Relative Luminanz einer #rrggbb-Farbe (0 = schwarz, 1 = weiß). */
export function luminance(hex: string): number {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export function isLightColor(hex: string): boolean {
  return luminance(hex) > 0.6;
}
