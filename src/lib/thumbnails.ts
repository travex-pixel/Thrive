"use client";

import { isHeic } from "./pack/images";

const SIZE = 112; // 2x the 56px thumbnail for retina screens

/**
 * Makes a small JPEG thumbnail without keeping the full-size decode in memory.
 * HEIC photos are skipped outside Safari (decoding them needs the heavy
 * converter); they show a placeholder icon instead.
 */
export async function makeThumbnail(blob: Blob, fileName: string): Promise<string | null> {
  try {
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(blob, { resizeWidth: SIZE, resizeQuality: "medium", imageOrientation: "from-image" });
    } catch {
      if (isHeic(fileName, blob.type)) return null;
      bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
    }
    const scale = Math.min(1, SIZE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const small = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.7));
    canvas.width = 0;
    canvas.height = 0;
    return small ? URL.createObjectURL(small) : null;
  } catch {
    return null;
  }
}
