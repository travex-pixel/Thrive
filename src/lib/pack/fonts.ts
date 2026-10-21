import type { PDFDocument, PDFFont } from "pdf-lib";

/**
 * Noto Sans (SIL Open Font License) is embedded, subset, into generated pages
 * so captions support accented Latin, Greek, Cyrillic and Vietnamese text.
 * Characters the font can't draw (e.g. CJK, emoji) are replaced rather than
 * breaking the build.
 */
interface FontBytes {
  regular: Uint8Array;
  semibold: Uint8Array;
  hasGlyph: (codePoint: number) => boolean;
}

let fontBytesPromise: Promise<FontBytes> | null = null;

async function fetchBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url}`);
  return new Uint8Array(await response.arrayBuffer());
}

export function loadFontBytes(): Promise<FontBytes> {
  if (!fontBytesPromise) {
    fontBytesPromise = (async () => {
      const [regular, semibold, fontkitModule] = await Promise.all([
        fetchBytes("/fonts/NotoSans-Regular.ttf"),
        fetchBytes("/fonts/NotoSans-SemiBold.ttf"),
        import("@pdf-lib/fontkit"),
      ]);
      const fontkit = fontkitModule.default;
      const probe = fontkit.create(regular as unknown as Buffer);
      return { regular, semibold, hasGlyph: (cp: number) => probe.hasGlyphForCodePoint(cp) };
    })().catch((error) => {
      fontBytesPromise = null; // allow a retry on the next build
      throw error;
    });
  }
  return fontBytesPromise;
}

export interface DocFonts {
  regular: PDFFont;
  semibold: PDFFont;
  /** Makes text safe to draw with these fonts. */
  clean: (text: string) => string;
}

export async function embedFonts(doc: PDFDocument): Promise<DocFonts> {
  const [{ regular, semibold, hasGlyph }, fontkitModule] = await Promise.all([
    loadFontBytes(),
    import("@pdf-lib/fontkit"),
  ]);
  doc.registerFontkit(fontkitModule.default);
  const [r, s] = await Promise.all([
    doc.embedFont(regular, { subset: true }),
    doc.embedFont(semibold, { subset: true }),
  ]);
  const clean = (text: string) =>
    Array.from(text.replace(/[\r\n\t]+/g, " "))
      .map((ch) => {
        const cp = ch.codePointAt(0) ?? 63;
        return cp >= 32 && hasGlyph(cp) ? ch : "?";
      })
      .join("");
  return { regular: r, semibold: s, clean };
}

/** Greedy word wrap that also breaks words longer than the line. */
export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  const fits = (s: string) => font.widthOfTextAtSize(s, size) <= maxWidth;

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (fits(candidate)) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    if (fits(word)) {
      line = word;
      continue;
    }
    // Hard-break a very long word.
    let chunk = "";
    for (const ch of Array.from(word)) {
      if (fits(chunk + ch)) chunk += ch;
      else {
        lines.push(chunk);
        chunk = ch;
      }
    }
    line = chunk;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

/** Truncates text with an ellipsis to fit one line. */
export function fitText(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  const chars = Array.from(text);
  while (chars.length > 1 && font.widthOfTextAtSize(`${chars.join("")}…`, size) > maxWidth) chars.pop();
  return `${chars.join("")}…`;
}
