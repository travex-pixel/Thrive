import { dateFromJsDate, parseDateFromFileName } from "./dates";
import { IMAGE_EXTENSIONS, IMMI_MAX_BYTES, PASSTHROUGH_EXTENSIONS } from "./limits";
import { extensionOf, titleFromFileName } from "./naming";
import { closePdf, openWithPdfjs, PdfPasswordError } from "./pdfjs";
import { suggestCategory } from "./suggest";
import type { EvidenceItem, ItemKind } from "./types";

export function kindFromFile(fileName: string, mimeType: string): ItemKind {
  const ext = extensionOf(fileName);
  if (ext === "pdf" || mimeType === "application/pdf") return "pdf";
  if ((IMAGE_EXTENSIONS as readonly string[]).includes(ext)) return "image";
  if (!ext && mimeType.startsWith("image/")) return "image";
  if ((PASSTHROUGH_EXTENSIONS as readonly string[]).includes(ext)) return "passthrough";
  return "unsupported";
}

export function newItemId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** Instant, synchronous first pass so files appear in the list immediately. */
export function createItem(file: File, addedAt: number): EvidenceItem {
  const kind = kindFromFile(file.name, file.type);
  const date = parseDateFromFileName(file.name);
  const suggestion = suggestCategory(file.name, kind);
  const item: EvidenceItem = {
    id: newItemId(),
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    kind,
    category: suggestion ?? "unsorted",
    suggested: Boolean(suggestion),
    title: titleFromFileName(file.name),
    date,
    dateSource: date ? "filename" : null,
    addedAt,
  };
  if (file.size === 0) {
    item.kind = "unsupported";
    item.error = "This file is empty.";
  } else if (kind === "unsupported") {
    item.error = "ImmiAccount doesn’t accept this file type. Save it as a PDF or JPG and add it again.";
  } else if (kind === "passthrough" && file.size > IMMI_MAX_BYTES) {
    item.error = "Over 5 MB. Save it as a PDF and add the PDF instead.";
  }
  return item;
}

/** Slower second pass: PDF page count/locks, and photo dates from EXIF. */
export async function inspectItem(item: EvidenceItem, file: Blob): Promise<Partial<EvidenceItem>> {
  if (item.error) return {};
  if (item.kind === "pdf") return inspectPdf(file);
  if (item.kind === "image" && !item.date) {
    try {
      const { default: exifr } = await import("exifr");
      const tags = (await exifr.parse(file, ["DateTimeOriginal", "CreateDate"])) as
        | { DateTimeOriginal?: Date; CreateDate?: Date }
        | undefined;
      const date = dateFromJsDate(tags?.DateTimeOriginal ?? tags?.CreateDate ?? null);
      if (date) return { date, dateSource: "exif" };
    } catch {
      // No EXIF (screenshots, edited images): fine, the user can add a date.
    }
  }
  return {};
}

async function inspectPdf(file: Blob): Promise<Partial<EvidenceItem>> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { PDFDocument } = await import("pdf-lib");
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const pageCount = doc.getPageCount();
    if (!doc.isEncrypted) return { pageCount, encrypted: false };
    // Locked PDF: make sure it opens without a password (most "secured" bank statements do).
    const pdf = await openWithPdfjs(bytes);
    const result = { pageCount: pdf.numPages || pageCount, encrypted: true };
    await closePdf(pdf);
    return result;
  } catch (error) {
    if (error instanceof PdfPasswordError) {
      return { error: "This PDF needs a password to open. Remove the password (for example, print it to a new PDF) and add it again." };
    }
    // pdf-lib couldn't parse it; pdf.js is more forgiving, so try re-rendering it instead.
    try {
      const pdf = await openWithPdfjs(bytes);
      const result = { pageCount: pdf.numPages, encrypted: true };
      await closePdf(pdf);
      return result;
    } catch (fallbackError) {
      if (fallbackError instanceof PdfPasswordError) {
        return { error: "This PDF needs a password to open. Remove the password and add it again." };
      }
      return { error: "This PDF looks damaged and can’t be read. Try downloading or saving it again." };
    }
  }
}
