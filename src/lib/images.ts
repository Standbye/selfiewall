/**
 * Obergrenze für die Bildfläche, die sharp dekodieren darf (~50 Megapixel).
 * Schützt vor Dekompressionsbomben: eine kleine Datei kann sonst beim
 * Entpacken hunderte Megapixel und damit Gigabyte an RAM beanspruchen.
 */
export const MAX_INPUT_PIXELS = 50_000_000;
