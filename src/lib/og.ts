import "server-only";
import { join } from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import type { Photo } from "./schema";

/**
 * Open Graph share cards, composed with sharp rather than next/og.
 *
 * next/og (Satori) does not shape complex scripts: Devanagari conjuncts break
 * apart and the ि matra lands after its consonant, so "मंदिर" would read
 * "मंदरि". sharp renders text with Pango and HarfBuzz, which shape Hindi
 * correctly. Cards are generated at build time, so the cost is paid once.
 */

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

const PAD = 64;
const TEXT_WIDTH = ogSize.width - PAD * 2;
const fontDir = join(process.cwd(), "assets", "fonts");
const fonts = {
  regular: { file: join(fontDir, "Poppins-Regular.ttf"), name: "Poppins" },
  semibold: { file: join(fontDir, "Poppins-SemiBold.ttf"), name: "Poppins SemiBold" },
};

const colors = { ink: "#1a1813", paper: "#f6f4ef", soft: "#e9e4d8", accent: "#f0a27f" };

function escapeMarkup(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
}

/** A transparent PNG of wrapped text, and its height. */
async function text(value: string, size: number, weight: keyof typeof fonts, color: string) {
  const font = fonts[weight];
  const { data, info } = await sharp({
    text: {
      text: `<span foreground="${color}">${escapeMarkup(value)}</span>`,
      font: `${font.name} ${size}`,
      fontfile: font.file,
      width: TEXT_WIDTH,
      wrap: "word",
      rgba: true,
      dpi: 72,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { input: data, height: info.height };
}

async function background(photo: Photo | undefined): Promise<Buffer> {
  if (photo) {
    return sharp(join(process.cwd(), "public", photo.src))
      .resize(ogSize.width, ogSize.height, { fit: "cover", position: "attention" })
      .png()
      .toBuffer();
  }
  // No photo: the site's dark hero treatment.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ogSize.width}" height="${ogSize.height}">
    <defs><radialGradient id="g" cx="85%" cy="-10%" r="90%"><stop offset="0" stop-color="#d46035" stop-opacity=".35"/><stop offset="1" stop-color="#d46035" stop-opacity="0"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="${colors.ink}"/><rect width="100%" height="100%" fill="url(#g)"/></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Darkens the lower part of the photo so white text stays readable on any image. */
const scrim = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${ogSize.width}" height="${ogSize.height}">
  <defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${colors.ink}" stop-opacity=".5"/>
    <stop offset=".3" stop-color="${colors.ink}" stop-opacity=".2"/>
    <stop offset=".5" stop-color="${colors.ink}" stop-opacity=".6"/>
    <stop offset="1" stop-color="${colors.ink}" stop-opacity=".94"/>
  </linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#s)"/></svg>`);

export interface CardContent {
  brand: string;
  title: string;
  kicker?: string;
  subtitle?: string;
  photo?: Photo;
}

/** Render a 1200×630 PNG share card: photo, brand at the top, kicker / title / subtitle at the bottom. */
export async function renderCard(content: CardContent): Promise<Response> {
  return new Response(await cardPng(content), { headers: { "Content-Type": ogContentType } });
}

/**
 * Cached so Cache Components can prerender the image routes: sharp reads the
 * photo and fonts from disk, which otherwise counts as uncached I/O.
 */
async function cardPng({ brand, title, kicker, subtitle, photo }: CardContent): Promise<Uint8Array<ArrayBuffer>> {
  "use cache";
  const titleSize = title.length > 48 ? 52 : title.length > 28 ? 62 : 72;
  const [base, brandText, titleText, kickerText, subtitleText] = await Promise.all([
    background(photo),
    text(`●  ${brand}`, 28, "semibold", colors.paper),
    text(title, titleSize, "semibold", colors.paper),
    kicker ? text(kicker, 26, "semibold", colors.accent) : undefined,
    subtitle ? text(subtitle, 28, "regular", colors.soft) : undefined,
  ]);

  // Stack the bottom block upwards from the lower padding.
  const layers: OverlayOptions[] = [{ input: scrim }, { input: brandText.input, left: PAD, top: PAD - 8 }];
  let bottom = ogSize.height - PAD + 8;
  for (const [block, gap] of [
    [subtitleText, 0],
    [titleText, subtitleText ? 14 : 0],
    [kickerText, 12],
  ] as const) {
    if (!block) continue;
    bottom -= gap + block.height;
    layers.push({ input: block.input, left: PAD, top: bottom });
  }

  const png = await sharp(base).composite(layers).png({ compressionLevel: 9 }).toBuffer();
  return new Uint8Array(png);
}
