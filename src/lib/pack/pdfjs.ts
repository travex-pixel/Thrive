/**
 * Lazy pdf.js access. All assets are served from our own origin
 * (copied by scripts/copy-vendor-assets.mjs), so nothing is fetched from a CDN.
 */
type PdfjsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

let pdfjsPromise: Promise<PdfjsModule> | null = null;

const ASSET_BASE = "/vendor/pdfjs/";

export function loadPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist/legacy/build/pdf.mjs").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = `${ASSET_BASE}pdf.worker.min.mjs`;
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

export class PdfPasswordError extends Error {
  constructor() {
    super("This PDF is password-protected.");
    this.name = "PdfPasswordError";
  }
}

/** Opens a PDF with pdf.js. Owner-password ("permissions") locks open fine; user passwords throw. */
export async function openWithPdfjs(bytes: Uint8Array) {
  const pdfjs = await loadPdfjs();
  const task = pdfjs.getDocument({
    // pdf.js may transfer the buffer to its worker, so give it a copy.
    data: bytes.slice(),
    cMapUrl: `${ASSET_BASE}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${ASSET_BASE}standard_fonts/`,
    wasmUrl: `${ASSET_BASE}wasm/`,
    iccUrl: `${ASSET_BASE}iccs/`,
    // We never display interactive content; keep the attack surface small.
    enableXfa: false,
    stopAtErrors: false,
  });
  try {
    return await task.promise;
  } catch (error) {
    if (error instanceof Error && error.name === "PasswordException") throw new PdfPasswordError();
    throw error;
  }
}

/** Frees the worker-side document (pdf.js v6 moved destroy() to the loading task). */
export async function closePdf(doc: Awaited<ReturnType<typeof openWithPdfjs>>): Promise<void> {
  try {
    await doc.loadingTask.destroy();
  } catch {
    // already closed
  }
}

export interface RasterPage {
  jpeg: Uint8Array;
  /** Original page size in PDF points, so the copy keeps its proportions. */
  widthPt: number;
  heightPt: number;
}

/** Hard cap on canvas pixels (iOS Safari limits canvases to ~16.7M px). */
const MAX_CANVAS_PIXELS = 12_000_000;

export async function rasterisePage(
  doc: Awaited<ReturnType<typeof openWithPdfjs>>,
  pageNumber: number,
  dpi: number,
  quality: number,
): Promise<RasterPage> {
  const page = await doc.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  let scale = dpi / 72;
  const pixels = base.width * scale * base.height * scale;
  if (pixels > MAX_CANVAS_PIXELS) scale *= Math.sqrt(MAX_CANVAS_PIXELS / pixels);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvas, canvasContext: ctx, viewport, background: "#ffffff" }).promise;
  const blob = await canvasToJpeg(canvas, quality);
  page.cleanup();
  canvas.width = 0;
  canvas.height = 0;
  return { jpeg: new Uint8Array(await blob.arrayBuffer()), widthPt: base.width, heightPt: base.height };
}

export function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not encode image."))), "image/jpeg", quality);
  });
}
