import { canvasToJpeg } from "./pdfjs";
import { extensionOf } from "./naming";

export interface EncodedImage {
  jpeg: Uint8Array;
  width: number;
  height: number;
}

/**
 * Re-encoding steps, from best quality down. Each step is tried only if a file is still too big. 1600 px on the long
 * side is sharp on screen and on an A4 page while keeping a typical phone photo around 300–450 KB.
 */
export const IMAGE_QUALITY_LADDER = [
  { maxDimension: 1600, quality: 0.75 },
  { maxDimension: 1400, quality: 0.68 },
  { maxDimension: 1200, quality: 0.6 },
  { maxDimension: 900, quality: 0.5 },
] as const;

/** "Smaller photos" starts here, so more photos fit in each file. */
export const COMPACT_IMAGE_LEVEL = 2;

/**
 * Images taller than this (height ÷ width) are scrolling screenshots, such as a long chat. An ordinary phone
 * screenshot (about 2.2:1) still fits one page and reads fine; anything taller is cut into phone-screen-shaped pieces
 * instead of being shrunk until the text is unreadable.
 */
const TALL_RATIO = 2.6;
/** Height ÷ width of each piece: about one phone screen, which fits an A4 page at a readable size. */
export const PAGE_SLICE_RATIO = 2;
const MAX_SLICES = 40;

/** Fails fast after a stuck conversion instead of hanging the whole build. */
const HEIC_TIMEOUT_MS = 45_000;
let heicStuck = false;

export class ImageDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageDecodeError";
  }
}

export function isHeic(fileName: string, mimeType: string): boolean {
  const ext = extensionOf(fileName);
  return ext === "heic" || ext === "heif" || /image\/hei[cf]/i.test(mimeType);
}

function abortable<T>(promise: Promise<T>, ms: number, signal?: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      heicStuck = true;
      reject(new ImageDecodeError("this iPhone photo took too long to convert. Try saving it as a JPG."));
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Build cancelled", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

/**
 * Decodes any browser-supported image. HEIC/HEIF (iPhone photos) decode
 * natively in Safari; elsewhere we lazy-load an open-source decoder.
 * EXIF rotation is applied so photos come out the right way up.
 */
export async function decodeImage(blob: Blob, fileName: string, signal?: AbortSignal): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch (nativeError) {
    if (!isHeic(fileName, blob.type)) throw nativeError;
    if (heicStuck) throw new ImageDecodeError("iPhone photos can’t be converted in this browser right now. Reload the page, or save them as JPG.");
    const { default: heic2any } = await import("heic2any");
    const converted = await abortable(heic2any({ blob, toType: "image/jpeg", quality: 0.92 }), HEIC_TIMEOUT_MS, signal);
    const jpeg = Array.isArray(converted) ? converted[0] : converted;
    return await createImageBitmap(jpeg, { imageOrientation: "from-image" });
  }
}

async function encodeRegion(
  bitmap: ImageBitmap,
  sy: number,
  sh: number,
  width: number,
  height: number,
  quality: number,
): Promise<EncodedImage> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.fillStyle = "#ffffff"; // flatten transparent PNG screenshots onto white
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, sy, bitmap.width, sh, 0, 0, width, height);
  const blob = await canvasToJpeg(canvas, quality);
  canvas.width = 0;
  canvas.height = 0;
  return { jpeg: new Uint8Array(await blob.arrayBuffer()), width, height };
}

/** Scales an image to fit maxDimension and encodes it as JPEG on a white background. */
export async function encodeJpeg(bitmap: ImageBitmap, maxDimension: number, quality: number): Promise<EncodedImage> {
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  return encodeRegion(bitmap, 0, bitmap.height, width, height, quality);
}

export function isTallImage(width: number, height: number): boolean {
  return height > width * TALL_RATIO;
}

/**
 * Encodes an image as one or more page-sized JPEGs. Ordinary photos give one picture; long screenshots are cut into
 * pieces at their full width (up to maxDimension) so the text stays readable. Pieces are measured in source pixels, so
 * every quality level gives the same number of pages.
 */
export async function encodePages(bitmap: ImageBitmap, maxDimension: number, quality: number): Promise<EncodedImage[]> {
  if (!isTallImage(bitmap.width, bitmap.height)) return [await encodeJpeg(bitmap, maxDimension, quality)];
  const sliceHeight = Math.max(Math.ceil(bitmap.width * PAGE_SLICE_RATIO), Math.ceil(bitmap.height / MAX_SLICES));
  // One scale for every piece, so they line up as a single image; the long side of a piece respects maxDimension.
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, sliceHeight));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const pages: EncodedImage[] = [];
  for (let sy = 0; sy < bitmap.height; ) {
    let sh = Math.min(sliceHeight, bitmap.height - sy);
    // Don't leave a thin sliver for the last page; fold it into this one.
    if (bitmap.height - (sy + sh) < sliceHeight * 0.2) sh = bitmap.height - sy;
    pages.push(await encodeRegion(bitmap, sy, sh, width, Math.max(1, Math.round(sh * scale)), quality));
    sy += sh;
  }
  return pages;
}
