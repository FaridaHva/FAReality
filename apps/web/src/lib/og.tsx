/**
 * Link preview cards (Open Graph). WhatsApp, Instagram and Telegram show these
 * when a product link is shared — in this market that's most of the traffic.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getFile, keyFromUrl } from "./storage";

export const ogSize = { width: 1200, height: 630 };

const FONT_DIR = path.join(process.cwd(), "assets/fonts");

// The OG renderer reads neither woff2 nor variable fonts, and doesn't fall back
// between subsets. So these are static instances of the full Onest font
// (Azerbaijani, Cyrillic and ₼ in one file), cut with fonttools' varLib.instancer.
export async function loadOgFonts() {
  return Promise.all(
    ([400, 600] as const).map(async (weight) => ({
      name: "Onest",
      weight,
      style: "normal" as const,
      data: await readFile(path.join(FONT_DIR, `Onest-${weight}.ttf`)),
    })),
  );
}

/** Posters are WebP; the OG renderer wants PNG. Reads uploads from storage, seed files from /public. */
export async function posterDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  const key = keyFromUrl(url);
  const source = key
    ? await getFile("public", key)
    : url.startsWith("/")
      ? await readFile(path.join(process.cwd(), "public", url))
      : Buffer.from(await (await fetch(url)).arrayBuffer());
  const png = await sharp(source).resize(900, 900, { fit: "inside" }).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

const colors = {
  bg: "#f4f1ec",
  tile: "#e8e3da",
  ink: "#16150f",
  muted: "#6f6a60",
  accent: "#2447e0",
};

/** The card: product on the warm studio tile, details and the AR call to action beside it. */
export function OgCard({
  eyebrow,
  title,
  lines,
  poster,
  cta,
}: {
  eyebrow: string;
  title: string;
  lines: string[];
  poster: string | null;
  cta: string;
}) {
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", background: colors.bg, fontFamily: "Onest", padding: 36 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 560,
          height: "100%",
          borderRadius: 40,
          background: `radial-gradient(circle at 50% 45%, #ffffff 0%, ${colors.tile} 70%)`,
        }}
      >
        {poster && (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
          <img src={poster} width={500} height={500} style={{ objectFit: "contain" }} />
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingLeft: 56, paddingTop: 24, paddingBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 22, color: colors.muted, letterSpacing: 2 }}>
          <div style={{ width: 10, height: 10, borderRadius: 10, background: colors.accent }} />
          {eyebrow.toUpperCase()}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            // Long names (and Russian) get a smaller size so the card never overflows.
            fontSize: title.length > 28 ? 52 : 64,
            fontWeight: 600,
            lineHeight: 1.04,
            letterSpacing: -2,
            color: colors.ink,
          }}
        >
          {title}
        </div>
        {lines.map((line, i) => (
          <div key={i} style={{ display: "flex", marginTop: i === 0 ? 28 : 8, fontSize: i === 0 ? 34 : 26, color: i === 0 ? colors.ink : colors.muted }}>
            {line}
          </div>
        ))}
        <div style={{ display: "flex", marginTop: "auto", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 600, color: colors.ink, letterSpacing: -0.5 }}>FAReality</div>
          <div
            style={{
              display: "flex",
              background: colors.accent,
              color: "white",
              fontSize: 26,
              fontWeight: 600,
              padding: "16px 30px",
              borderRadius: 999,
            }}
          >
            {cta} →
          </div>
        </div>
      </div>
    </div>
  );
}
