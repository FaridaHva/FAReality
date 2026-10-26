const AZ: Record<string, string> = { ə: "e", ğ: "g", ı: "i", i̇: "i", ö: "o", ş: "s", ü: "u", ç: "c" };

/** URL-safe slug from Azerbaijani (or Latin) text: "Flora divanı" -> "flora-divani". */
export function slugify(text: string): string {
  return (
    text
      .toLocaleLowerCase("az")
      .replace(/[əğıöşüç]|i̇/g, (ch) => AZ[ch] ?? ch)
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "item"
  );
}

/** First of slug, slug-2, slug-3… that isn't taken. */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) if (!used.has(`${base}-${n}`)) return `${base}-${n}`;
}
