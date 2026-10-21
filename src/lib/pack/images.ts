import { canvasToJpeg } from "./pdfjs";
import { extensionOf } from "./naming";

export interface EncodedImage {
  jpeg: Uint8Array;
  width: number;
  height: number;
}

/** Re-encoding steps, from best quality down. Each step is tried only if a file is still too big. */
export const IMAGE_QUALITY_LADDER = [
  { maxDimension: 2000, quality: 0.82 },
  { maxDimension: 1600, quality: 0.72 },
  { maxDimension: 1200, quality: 0.62 },
  { maxDimension: 900, quality: 0.5 },
] as const;

export function isHeic(fileName: string, mimeType: string): boolean {
  const ext = extensionOf(fileName);
  return ext === "heic" || ext === "heif" || /image\/hei[cf]/i.test(mimeType);
}

/**
 * Decodes any browser-supported image. HEIC/HEIF (iPhone photos) decode
 * natively in Safari; elsewhere we lazy-load an open-source decoder.
 * EXIF rotation is applied so photos come out the right way up.
 */
export async function decodeImage(blob: Blob, fileName: string): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch (nativeError) {
    if (!isHeic(fileName, blob.type)) throw nativeError;
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({ blob, toType: "image/jpeg", quality: 0.92 });
    const jpeg = Array.isArray(converted) ? converted[0] : converted;
    return await createImageBitmap(jpeg, { imageOrientation: "from-image" });
  }
}

/** Scales an image to fit maxDimension and encodes it as JPEG on a white background. */
export async function encodeJpeg(bitmap: ImageBitmap, maxDimension: number, quality: number): Promise<EncodedImage> {
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.fillStyle = "#ffffff"; // flatten transparent PNG screenshots onto white
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await canvasToJpeg(canvas, quality);
  canvas.width = 0;
  canvas.height = 0;
  return { jpeg: new Uint8Array(await blob.arrayBuffer()), width, height };
}
