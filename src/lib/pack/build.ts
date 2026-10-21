import type { PDFDocument as PDFDocumentT, PDFPage } from "pdf-lib";
import { CATEGORIES, effectiveCategory, getCategory } from "./categories";
import { formatDate, formatDateRange } from "./dates";
import { embedFonts, fitText, wrapText, type DocFonts } from "./fonts";
import { decodeImage, encodeJpeg, IMAGE_QUALITY_LADDER, type EncodedImage } from "./images";
import { IMMI_MAX_BYTES } from "./limits";
import { extensionOf, INDEX_FILE_NAME, mergedDocFileName, separateDocFileName } from "./naming";
import { closePdf, openWithPdfjs, rasterisePage, type RasterPage } from "./pdfjs";
import { CONTENT_BUDGET_BYTES, isUsable, sortItems } from "./plan";
import type { CategoryId, EvidenceDate, EvidenceItem, PackSettings, PlannedDocKind } from "./types";

/* ------------------------------------------------------------------ types */

export interface IndexEntry {
  itemId: string;
  title: string;
  date: EvidenceDate;
  originalName: string;
  /** Page range inside the output file (1-based, inclusive). */
  pages: [number, number] | null;
  /** e.g. "pages 1–20 of 45" when an item was split across files. */
  note?: string;
}

export interface BuiltFile {
  key: string;
  fileName: string;
  bytes: Uint8Array;
  kind: PlannedDocKind;
  category: Exclude<CategoryId, "unsorted">;
  entries: IndexEntry[];
  pageCount: number | null;
  /** Some pages were re-rendered as images (their text is no longer selectable). */
  rasterised: boolean;
}

export interface BuildProgress {
  done: number;
  total: number;
  label: string;
}

export interface BuildOptions extends PackSettings {
  /** Optional line shown on cover pages and the index, e.g. "Alex Citizen and Sam Lee". */
  names?: string;
  /** Add a title/date caption above photo pages. */
  captions?: boolean;
}

export interface BuildContext {
  getFile: (itemId: string) => Promise<Blob>;
  onProgress?: (progress: BuildProgress) => void;
  signal?: AbortSignal;
  /** Injected for tests; defaults to today. */
  now?: Date;
}

export interface BuildResult {
  files: BuiltFile[];
  warnings: string[];
  skippedItemIds: string[];
}

export class BuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BuildError";
  }
}

/* -------------------------------------------------------------- constants */

const A4: [number, number] = [595.28, 841.89];
const A4_LANDSCAPE: [number, number] = [841.89, 595.28];
const MARGIN = 40;
const INK = { r: 0.11, g: 0.11, b: 0.12 };
const MUTED = { r: 0.42, g: 0.42, b: 0.45 };
const RULE = { r: 0.85, g: 0.85, b: 0.87 };

/** PDFs heavier than this per page are usually scans; re-rendering shrinks them a lot. */
const HEAVY_PAGE_BYTES = 400_000;

export const PDF_RASTER_LADDER = [
  { dpi: 150, quality: 0.8 },
  { dpi: 120, quality: 0.7 },
  { dpi: 96, quality: 0.6 },
  { dpi: 72, quality: 0.5 },
] as const;

/* ---------------------------------------------------------- prepared items */

type Prepared =
  | { type: "image"; item: EvidenceItem; level: number; image: EncodedImage; source: Blob }
  | { type: "pdf-copy"; item: EvidenceItem; bytes: Uint8Array; pageCount: number }
  | { type: "pdf-raster"; item: EvidenceItem; level: number; source: Uint8Array; pageCount: number; pages: (RasterPage | undefined)[] };

interface Segment {
  prep: Prepared;
  /** Item-level page indices [start, end) for PDFs; null for images. */
  range: [number, number] | null;
}

function segmentPages(seg: Segment): number[] {
  if (!seg.range) return [0];
  const [a, b] = seg.range;
  return Array.from({ length: b - a }, (_, i) => a + i);
}

function estimateSegment(seg: Segment): number {
  const p = seg.prep;
  if (p.type === "image") return p.image.jpeg.length + 3_000;
  const pages = segmentPages(seg);
  if (p.type === "pdf-copy") return Math.round((p.bytes.length * pages.length) / Math.max(1, p.pageCount)) + 2_000;
  return pages.reduce((sum, i) => sum + (p.pages[i]?.jpeg.length ?? 260_000) + 1_500, 0);
}

/* ---------------------------------------------------------------- helpers */

function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Build cancelled", "AbortError");
}

const nextTick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

async function loadPdfLib() {
  return import("pdf-lib");
}

async function newDoc(title: string): Promise<PDFDocumentT> {
  const { PDFDocument } = await loadPdfLib();
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  doc.setProducer("");
  doc.setCreator("");
  return doc;
}

async function encodeAtLevel(source: Blob, fileName: string, level: number): Promise<EncodedImage> {
  const bitmap = await decodeImage(source, fileName);
  try {
    const { maxDimension, quality } = IMAGE_QUALITY_LADDER[level];
    return await encodeJpeg(bitmap, maxDimension, quality);
  } finally {
    bitmap.close();
  }
}

async function ensureRasterPages(prep: Extract<Prepared, { type: "pdf-raster" }>, indices: number[], onPage?: (n: number) => void) {
  const missing = indices.filter((i) => !prep.pages[i]);
  if (missing.length === 0) return;
  const pdf = await openWithPdfjs(prep.source);
  try {
    const { dpi, quality } = PDF_RASTER_LADDER[prep.level];
    for (const i of missing) {
      prep.pages[i] = await rasterisePage(pdf, i + 1, dpi, quality);
      onPage?.(i + 1);
      await nextTick();
    }
  } finally {
    await closePdf(pdf);
  }
}

/* ------------------------------------------------------------- preparation */

async function prepareItem(item: EvidenceItem, ctx: BuildContext, report: (label: string) => void): Promise<Prepared> {
  const blob = await ctx.getFile(item.id);
  if (item.kind === "image") {
    report(`Optimising ${item.title}`);
    const image = await encodeAtLevel(blob, item.fileName, 0);
    return { type: "image", item, level: 0, image, source: blob };
  }
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const pageCount = Math.max(1, item.pageCount ?? 1);
  const heavy = bytes.length / pageCount > HEAVY_PAGE_BYTES;
  if (!item.encrypted && !heavy) return { type: "pdf-copy", item, bytes, pageCount };

  const prep: Extract<Prepared, { type: "pdf-raster" }> = {
    type: "pdf-raster",
    item,
    level: 0,
    source: bytes,
    pageCount,
    pages: new Array(pageCount).fill(undefined),
  };
  await ensureRasterPages(prep, Array.from({ length: pageCount }, (_, i) => i), (n) =>
    report(`Re-rendering ${item.title} (page ${n} of ${pageCount})`),
  );
  return prep;
}

/** Splits one prepared item into page-range segments that each fit the budget. */
function toSegments(prep: Prepared, budget: number): Segment[] {
  if (prep.type === "image") return [{ prep, range: null }];
  const whole: Segment = { prep, range: [0, prep.pageCount] };
  if (estimateSegment(whole) <= budget || prep.pageCount === 1) return [whole];

  const segments: Segment[] = [];
  let start = 0;
  let bytes = 0;
  for (let i = 0; i < prep.pageCount; i++) {
    const pageBytes = estimateSegment({ prep, range: [i, i + 1] });
    if (i > start && bytes + pageBytes > budget) {
      segments.push({ prep, range: [start, i] });
      start = i;
      bytes = 0;
    }
    bytes += pageBytes;
  }
  segments.push({ prep, range: [start, prep.pageCount] });
  return segments;
}

/** Greedy, order-preserving packing of segments into parts. */
function packSegments(segments: Segment[], budget: number): Segment[][] {
  const parts: Segment[][] = [];
  let current: Segment[] = [];
  let bytes = 0;
  for (const seg of segments) {
    const size = estimateSegment(seg);
    if (current.length > 0 && bytes + size > budget) {
      parts.push(current);
      current = [];
      bytes = 0;
    }
    current.push(seg);
    bytes += size;
  }
  if (current.length) parts.push(current);
  return parts;
}

/** Makes a single oversized segment smaller: split pages, re-render, or lower quality. */
async function shrinkSegment(seg: Segment): Promise<Segment[] | null> {
  const p = seg.prep;
  const pages = segmentPages(seg);

  if (p.type === "image") {
    const level = p.level + 1;
    if (level >= IMAGE_QUALITY_LADDER.length) return null;
    const image = await encodeAtLevel(p.source, p.item.fileName, level);
    return [{ prep: { ...p, level, image }, range: null }];
  }

  if (pages.length > 1) {
    const mid = pages[0] + Math.ceil(pages.length / 2);
    return [
      { prep: p, range: [pages[0], mid] },
      { prep: p, range: [mid, pages[pages.length - 1] + 1] },
    ];
  }

  if (p.type === "pdf-copy") {
    // One very heavy page (usually a big scan): re-render just this page.
    const raster: Extract<Prepared, { type: "pdf-raster" }> = {
      type: "pdf-raster",
      item: p.item,
      level: 0,
      source: p.bytes,
      pageCount: p.pageCount,
      pages: new Array(p.pageCount).fill(undefined),
    };
    await ensureRasterPages(raster, pages);
    return [{ prep: raster, range: seg.range }];
  }

  const level = p.level + 1;
  if (level >= PDF_RASTER_LADDER.length) return null;
  const lowered: Extract<Prepared, { type: "pdf-raster" }> = { ...p, level, pages: [...p.pages] };
  for (const i of pages) lowered.pages[i] = undefined;
  await ensureRasterPages(lowered, pages);
  return [{ prep: lowered, range: seg.range }];
}

/* -------------------------------------------------------------- rendering */

function drawCaption(page: PDFPage, fonts: DocFonts, title: string, meta: string, top: number, width: number) {
  page.drawText(fitText(fonts.clean(title), fonts.semibold, 11, width), {
    x: MARGIN,
    y: top - 11,
    size: 11,
    font: fonts.semibold,
    color: rgbOf(INK),
  });
  page.drawText(fitText(fonts.clean(meta), fonts.regular, 9, width), {
    x: MARGIN,
    y: top - 25,
    size: 9,
    font: fonts.regular,
    color: rgbOf(MUTED),
  });
  page.drawLine({
    start: { x: MARGIN, y: top - 33 },
    end: { x: MARGIN + width, y: top - 33 },
    thickness: 0.6,
    color: rgbOf(RULE),
  });
  return top - 45;
}

let rgbFn: ((r: number, g: number, b: number) => ReturnType<typeof import("pdf-lib").rgb>) | null = null;
function rgbOf(c: { r: number; g: number; b: number }) {
  if (!rgbFn) throw new Error("pdf-lib not loaded");
  return rgbFn(c.r, c.g, c.b);
}

async function addImagePage(doc: PDFDocumentT, fonts: DocFonts, image: EncodedImage, caption: { title: string; meta: string } | null) {
  const landscape = image.width > image.height * 1.05;
  const [pw, ph] = landscape ? A4_LANDSCAPE : A4;
  const page = doc.addPage([pw, ph]);
  const contentWidth = pw - MARGIN * 2;
  let top = ph - MARGIN;
  if (caption) top = drawCaption(page, fonts, caption.title, caption.meta, top, contentWidth);
  const boxHeight = top - MARGIN;
  const embedded = await doc.embedJpg(image.jpeg);
  // Never upscale beyond 1pt per pixel; small images stay crisp instead of blurry.
  const scale = Math.min(contentWidth / image.width, boxHeight / image.height, 1);
  const w = image.width * scale;
  const h = image.height * scale;
  page.drawImage(embedded, { x: (pw - w) / 2, y: MARGIN + (boxHeight - h) / 2, width: w, height: h });
}

async function addRasterPage(doc: PDFDocumentT, raster: RasterPage) {
  const page = doc.addPage([raster.widthPt, raster.heightPt]);
  const embedded = await doc.embedJpg(raster.jpeg);
  page.drawImage(embedded, { x: 0, y: 0, width: raster.widthPt, height: raster.heightPt });
}

interface RenderedPart {
  bytes: Uint8Array;
  entries: IndexEntry[];
  pageCount: number;
  rasterised: boolean;
}

interface CoverInfo {
  title: string;
  names?: string;
  partLabel?: string;
}

const COVER_FIRST_ROWS = 24;
const COVER_NEXT_ROWS = 36;

function coverPageCount(rows: number): number {
  return rows <= COVER_FIRST_ROWS ? 1 : 1 + Math.ceil((rows - COVER_FIRST_ROWS) / COVER_NEXT_ROWS);
}

function noteFor(seg: Segment): string | undefined {
  if (!seg.range || seg.prep.type === "image") return undefined;
  const [a, b] = seg.range;
  if (a === 0 && b === seg.prep.pageCount) return undefined;
  return `pages ${a + 1}–${b} of ${seg.prep.pageCount}`;
}

async function renderPart(
  segments: Segment[],
  options: { cover: CoverInfo | null; captions: boolean; categoryLabel: string; docTitle: string },
): Promise<RenderedPart> {
  const pdfLib = await loadPdfLib();
  rgbFn = pdfLib.rgb;
  const doc = await newDoc(options.docTitle);
  const fonts = await embedFonts(doc);
  const coverPages = options.cover ? coverPageCount(segments.length) : 0;
  const entries: IndexEntry[] = [];
  let pageNo = coverPages;
  let rasterised = false;
  const sourceCache = new Map<Uint8Array, PDFDocumentT>();

  for (const [index, seg] of segments.entries()) {
    const start = pageNo + 1;
    const p = seg.prep;
    const pages = segmentPages(seg);
    if (p.type === "image") {
      const meta = [formatDate(p.item.date), options.categoryLabel, `Item ${index + 1} of ${segments.length}`]
        .filter((s) => s !== "No date")
        .join(" · ");
      await addImagePage(doc, fonts, p.image, options.captions ? { title: p.item.title, meta } : null);
      pageNo += 1;
    } else if (p.type === "pdf-copy") {
      let src = sourceCache.get(p.bytes);
      if (!src) {
        src = await pdfLib.PDFDocument.load(p.bytes, { updateMetadata: false });
        sourceCache.set(p.bytes, src);
      }
      const copied = await doc.copyPages(src, pages);
      copied.forEach((page) => doc.addPage(page));
      pageNo += copied.length;
    } else {
      rasterised = true;
      for (const i of pages) {
        const raster = p.pages[i];
        if (!raster) throw new BuildError(`Missing rendered page for ${p.item.title}`);
        await addRasterPage(doc, raster);
        pageNo += 1;
      }
    }
    entries.push({
      itemId: p.item.id,
      title: p.item.title,
      date: p.item.date,
      originalName: p.item.fileName,
      pages: [start, pageNo],
      note: noteFor(seg),
    });
  }

  if (options.cover) drawCover(doc, fonts, options.cover, entries, coverPages);
  const bytes = await doc.save({ useObjectStreams: true });
  return { bytes, entries, pageCount: doc.getPageCount(), rasterised };
}

function drawCover(doc: PDFDocumentT, fonts: DocFonts, cover: CoverInfo, entries: IndexEntry[], coverPages: number) {
  const [pw, ph] = A4;
  const width = pw - MARGIN * 2;
  const range = formatDateRange(entries.map((e) => e.date));
  const subtitle = [cover.partLabel, range, `${entries.length} ${entries.length === 1 ? "document" : "documents"}`]
    .filter(Boolean)
    .join(" · ");

  const cols = { no: MARGIN, doc: MARGIN + 34, date: MARGIN + width - 150, pages: MARGIN + width - 52 };
  let row = 0;
  for (let p = 0; p < coverPages; p++) {
    const page = doc.insertPage(p, [pw, ph]);
    let y = ph - MARGIN - 8;
    if (p === 0) {
      page.drawText(fitText(fonts.clean(cover.title), fonts.semibold, 22, width), {
        x: MARGIN, y: y - 22, size: 22, font: fonts.semibold, color: rgbOf(INK),
      });
      y -= 40;
      if (cover.names) {
        page.drawText(fitText(fonts.clean(cover.names), fonts.regular, 12, width), {
          x: MARGIN, y: y - 12, size: 12, font: fonts.regular, color: rgbOf(INK),
        });
        y -= 20;
      }
      page.drawText(fitText(fonts.clean(subtitle), fonts.regular, 11, width), {
        x: MARGIN, y: y - 11, size: 11, font: fonts.regular, color: rgbOf(MUTED),
      });
      y -= 34;
    } else {
      page.drawText(fitText(fonts.clean(`${cover.title} — contents (continued)`), fonts.semibold, 12, width), {
        x: MARGIN, y: y - 12, size: 12, font: fonts.semibold, color: rgbOf(INK),
      });
      y -= 32;
    }

    const header = (text: string, x: number) =>
      page.drawText(text, { x, y: y - 9, size: 9, font: fonts.semibold, color: rgbOf(MUTED) });
    header("No.", cols.no);
    header("Document", cols.doc);
    header("Date", cols.date);
    header("Pages", cols.pages);
    y -= 14;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + width, y }, thickness: 0.6, color: rgbOf(RULE) });
    y -= 6;

    const rowsHere = p === 0 ? COVER_FIRST_ROWS : COVER_NEXT_ROWS;
    for (let r = 0; r < rowsHere && row < entries.length; r++, row++) {
      const e = entries[row];
      const title = e.note ? `${e.title} (${e.note})` : e.title;
      const pages = e.pages ? (e.pages[0] === e.pages[1] ? `${e.pages[0]}` : `${e.pages[0]}–${e.pages[1]}`) : "";
      const baseline = y - 13;
      page.drawText(String(row + 1), { x: cols.no, y: baseline, size: 10, font: fonts.regular, color: rgbOf(MUTED) });
      page.drawText(fitText(fonts.clean(title), fonts.regular, 10, cols.date - cols.doc - 12), {
        x: cols.doc, y: baseline, size: 10, font: fonts.regular, color: rgbOf(INK),
      });
      page.drawText(e.date ? formatDate(e.date) : "—", { x: cols.date, y: baseline, size: 10, font: fonts.regular, color: rgbOf(INK) });
      page.drawText(pages, { x: cols.pages, y: baseline, size: 10, font: fonts.regular, color: rgbOf(INK) });
      y -= 19;
    }
    if (coverPages > 1) {
      page.drawText(`Contents page ${p + 1} of ${coverPages}`, {
        x: MARGIN, y: MARGIN - 14, size: 8, font: fonts.regular, color: rgbOf(MUTED),
      });
    }
  }
}

/* ------------------------------------------------------- group pipelines */

interface PartResult {
  segments: Segment[];
  rendered: RenderedPart;
}

/**
 * Renders parts, measuring each real file. Anything over the hard limit is
 * split or shrunk and re-rendered until it fits. Order is preserved.
 */
async function renderWithinLimit(
  initial: Segment[][],
  render: (segments: Segment[], partLabel: string | undefined) => Promise<RenderedPart>,
  ctx: BuildContext,
  report: (label: string) => void,
): Promise<PartResult[]> {
  const queue = [...initial];
  const done: PartResult[] = [];
  let guard = 0;
  while (queue.length > 0) {
    checkAbort(ctx.signal);
    if (++guard > 500) throw new BuildError("This pack is unusually complex. Try splitting it into smaller groups.");
    const segments = queue.shift()!;
    // Measure with the longest possible part label so the final render can only be smaller.
    const rendered = await render(segments, "Part 99 of 99");
    if (rendered.bytes.length <= IMMI_MAX_BYTES) {
      done.push({ segments, rendered });
      report("Checking file sizes");
      await nextTick();
      continue;
    }
    if (segments.length > 1) {
      const mid = Math.ceil(segments.length / 2);
      queue.unshift(segments.slice(0, mid), segments.slice(mid));
      continue;
    }
    const smaller = await shrinkSegment(segments[0]);
    if (!smaller) {
      throw new BuildError(`“${segments[0].prep.item.title}” can’t be made smaller than 5 MB. Try splitting it into smaller files.`);
    }
    queue.unshift(...packSegments(smaller, CONTENT_BUDGET_BYTES));
  }
  return done;
}

/* ------------------------------------------------------------------ main */

interface GroupOutput {
  kind: PlannedDocKind;
  category: Exclude<CategoryId, "unsorted">;
  item?: EvidenceItem;
  parts: { bytes: Uint8Array; entries: IndexEntry[]; pageCount: number | null; rasterised: boolean }[];
}

export async function buildPack(items: EvidenceItem[], options: BuildOptions, ctx: BuildContext): Promise<BuildResult> {
  const usable = items.filter(isUsable);
  if (usable.length === 0) throw new BuildError("Add at least one file you can use.");

  const warnings: string[] = [];
  const skippedItemIds: string[] = [];
  const captions = options.captions ?? true;

  // Progress: one step per item, plus a step per output file (estimated).
  let done = 0;
  let total = usable.length + Math.max(1, Math.ceil(usable.length / 8)) + (options.includeIndex ? 1 : 0);
  const report = (label: string) => ctx.onProgress?.({ done: Math.min(done, total), total, label });
  const step = (label: string) => {
    done++;
    if (done > total) total = done + 1;
    report(label);
  };

  const outputs: GroupOutput[] = [];

  for (const category of [...CATEGORIES].sort((a, b) => a.order - b.order)) {
    const catItems = sortItems(usable.filter((i) => effectiveCategory(i.category) === category.id));
    if (catItems.length === 0) continue;

    const convertible = catItems.filter((i) => i.kind !== "passthrough");
    const passthrough = catItems.filter((i) => i.kind === "passthrough");

    if (category.mode === "merge" && convertible.length > 0) {
      const prepared: Prepared[] = [];
      for (const item of convertible) {
        checkAbort(ctx.signal);
        try {
          prepared.push(await prepareItem(item, ctx, report));
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") throw error;
          skippedItemIds.push(item.id);
          warnings.push(`Left out “${item.title}”: ${describeError(error)}`);
        }
        step(`Prepared ${item.title}`);
        await nextTick();
      }
      if (prepared.length > 0) {
        const segments = prepared.flatMap((p) => toSegments(p, CONTENT_BUDGET_BYTES));
        const docTitle = `${category.label} evidence`;
        const render = (segs: Segment[], partLabel: string | undefined) =>
          renderPart(segs, {
            cover: { title: docTitle, names: options.names, partLabel },
            captions,
            categoryLabel: category.label,
            docTitle,
          });
        const parts = await renderWithinLimit(packSegments(segments, CONTENT_BUDGET_BYTES), render, ctx, report);
        // Final render with the real "Part n of N" label (only needed when split).
        const finalParts = [];
        for (const [i, part] of parts.entries()) {
          checkAbort(ctx.signal);
          const rendered = parts.length > 1 ? await render(part.segments, `Part ${i + 1} of ${parts.length}`) : await render(part.segments, undefined);
          if (rendered.bytes.length > IMMI_MAX_BYTES) throw new BuildError(`${docTitle} came out over 5 MB. Please try again.`);
          finalParts.push(rendered);
          step(`Built ${docTitle}${parts.length > 1 ? ` (part ${i + 1})` : ""}`);
        }
        outputs.push({ kind: "merged", category: category.id as GroupOutput["category"], parts: finalParts });
      }
    } else {
      for (const item of convertible) {
        checkAbort(ctx.signal);
        try {
          const parts = await buildSeparate(item, ctx, captions, category.label, report);
          outputs.push({ kind: "separate", category: category.id as GroupOutput["category"], item, parts });
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") throw error;
          skippedItemIds.push(item.id);
          warnings.push(`Left out “${item.title}”: ${describeError(error)}`);
        }
        step(`Prepared ${item.title}`);
        await nextTick();
      }
    }

    for (const item of passthrough) {
      const blob = await ctx.getFile(item.id);
      if (blob.size > IMMI_MAX_BYTES) {
        skippedItemIds.push(item.id);
        warnings.push(`Left out “${item.title}”: it’s over 5 MB. Save it as a PDF and add it again.`);
        continue;
      }
      outputs.push({
        kind: "passthrough",
        category: category.id as GroupOutput["category"],
        item,
        parts: [
          {
            bytes: new Uint8Array(await blob.arrayBuffer()),
            entries: [{ itemId: item.id, title: item.title, date: item.date, originalName: item.fileName, pages: null }],
            pageCount: null,
            rasterised: false,
          },
        ],
      });
      step(`Added ${item.title}`);
    }
  }

  if (outputs.length === 0) throw new BuildError("None of the files could be prepared. Check the messages above and try again.");

  // Name files in upload order, exactly as the plan does.
  const files: BuiltFile[] = [];
  let number = 0;
  for (const out of outputs) {
    const label = getCategory(out.category).label;
    out.parts.forEach((part, i) => {
      number++;
      const parts = out.parts.length;
      let fileName: string;
      if (out.kind === "merged") fileName = mergedDocFileName(number, label, i + 1, parts);
      else if (out.kind === "passthrough") fileName = separateDocFileName(number, label, out.item!.title, extensionOf(out.item!.fileName) || "bin");
      else fileName = separateDocFileName(number, label, out.item!.title, "pdf", i + 1, parts);
      files.push({
        key: `${out.kind}:${out.category}:${out.item?.id ?? "group"}:${i + 1}`,
        fileName,
        bytes: part.bytes,
        kind: out.kind,
        category: out.category,
        entries: part.entries,
        pageCount: part.pageCount,
        rasterised: part.rasterised,
      });
    });
  }

  if (options.includeIndex) {
    report("Writing the evidence index");
    const index = await renderIndex(files, options, ctx.now ?? new Date());
    files.unshift(index);
    step("Wrote the evidence index");
  }

  const rasterisedCount = files.filter((f) => f.rasterised).length;
  if (rasterisedCount > 0) {
    warnings.push(
      `${rasterisedCount} ${rasterisedCount === 1 ? "file includes" : "files include"} pages re-rendered as images (locked or very large PDFs). They look the same but the text can’t be selected.`,
    );
  }
  ctx.onProgress?.({ done: total, total, label: "Done" });
  return { files, warnings, skippedItemIds };
}

async function buildSeparate(
  item: EvidenceItem,
  ctx: BuildContext,
  captions: boolean,
  categoryLabel: string,
  report: (label: string) => void,
): Promise<GroupOutput["parts"]> {
  // Clean PDFs that already fit are passed through untouched (signatures and text preserved).
  if (item.kind === "pdf" && !item.encrypted && item.size <= IMMI_MAX_BYTES) {
    const blob = await ctx.getFile(item.id);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    return [
      {
        bytes,
        entries: [{ itemId: item.id, title: item.title, date: item.date, originalName: item.fileName, pages: item.pageCount ? [1, item.pageCount] : null }],
        pageCount: item.pageCount ?? null,
        rasterised: false,
      },
    ];
  }
  const prep = await prepareItem(item, ctx, report);
  const render = (segs: Segment[]) =>
    renderPart(segs, { cover: null, captions, categoryLabel, docTitle: item.title });
  const parts = await renderWithinLimit(packSegments(toSegments(prep, CONTENT_BUDGET_BYTES), CONTENT_BUDGET_BYTES), render, ctx, report);
  return parts.map((p) => p.rendered);
}

/* ----------------------------------------------------------------- index */

function formatBytes(bytes: number): string {
  if (bytes < 1_000_000) return `${Math.max(1, Math.round(bytes / 1000))} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

async function renderIndex(files: BuiltFile[], options: BuildOptions, now: Date): Promise<BuiltFile> {
  const pdfLib = await loadPdfLib();
  rgbFn = pdfLib.rgb;
  const doc = await newDoc("Evidence index");
  const fonts = await embedFonts(doc);
  const [pw, ph] = A4;
  const width = pw - MARGIN * 2;
  const documentCount = files.reduce((n, f) => n + f.entries.length, 0);

  let page = doc.addPage([pw, ph]);
  let y = ph - MARGIN - 8;
  const ensure = (needed: number) => {
    if (y - needed < MARGIN) {
      page = doc.addPage([pw, ph]);
      y = ph - MARGIN - 8;
    }
  };
  const text = (value: string, x: number, size: number, font: "regular" | "semibold", color = INK, maxWidth = width) => {
    page.drawText(fitText(fonts.clean(value), fonts[font], size, maxWidth), { x, y: y - size, size, font: fonts[font], color: rgbOf(color) });
  };

  text("Evidence index", MARGIN, 22, "semibold");
  y -= 40;
  if (options.names) {
    text(options.names, MARGIN, 12, "regular");
    y -= 20;
  }
  const prepared = `Prepared ${formatDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`)}`;
  text(`${prepared} · ${files.length + 1} files to upload, including this index · ${documentCount} documents`, MARGIN, 10.5, "regular", MUTED);
  y -= 34;

  for (const file of files) {
    ensure(48);
    const meta = [formatBytes(file.bytes.length), file.pageCount ? `${file.pageCount} ${file.pageCount === 1 ? "page" : "pages"}` : null]
      .filter(Boolean)
      .join(" · ");
    text(file.fileName, MARGIN, 11, "semibold", INK, width - 120);
    page.drawText(meta, { x: MARGIN + width - fonts.regular.widthOfTextAtSize(meta, 9.5), y: y - 11, size: 9.5, font: fonts.regular, color: rgbOf(MUTED) });
    y -= 19;
    for (const entry of file.entries) {
      ensure(16);
      const parts = [entry.title];
      if (entry.note) parts.push(`(${entry.note})`);
      const left = parts.join(" ");
      const right = [entry.date ? formatDate(entry.date) : null, entry.pages && file.kind === "merged" ? `p. ${entry.pages[0] === entry.pages[1] ? entry.pages[0] : `${entry.pages[0]}–${entry.pages[1]}`}` : null]
        .filter(Boolean)
        .join("   ");
      const rightWidth = fonts.regular.widthOfTextAtSize(right, 9.5);
      const lines = wrapText(fonts.clean(left), fonts.regular, 9.5, width - 24 - rightWidth - 16).slice(0, 2);
      lines.forEach((line, i) => {
        page.drawText(line, { x: MARGIN + 14, y: y - 9.5 - i * 12, size: 9.5, font: fonts.regular, color: rgbOf(INK) });
      });
      if (right) page.drawText(right, { x: MARGIN + width - rightWidth, y: y - 9.5, size: 9.5, font: fonts.regular, color: rgbOf(MUTED) });
      y -= 12 * lines.length + 3;
    }
    y -= 10;
    page.drawLine({ start: { x: MARGIN, y: y + 4 }, end: { x: MARGIN + width, y: y + 4 }, thickness: 0.5, color: rgbOf(RULE) });
    y -= 6;
  }

  const bytes = await doc.save({ useObjectStreams: true });
  return {
    key: "index",
    fileName: INDEX_FILE_NAME,
    bytes,
    kind: "index",
    category: "other",
    entries: [],
    pageCount: doc.getPageCount(),
    rasterised: false,
  };
}

/* ------------------------------------------------------- single-file fixer */

export interface FixedFile {
  fileName: string;
  bytes: Uint8Array;
  mimeType: string;
}

/** Free tool: makes one file ImmiAccount-ready (images → JPEG, PDFs → PDF parts under 5 MB). */
export async function fixSingleFile(item: EvidenceItem, file: Blob, ctx: Omit<BuildContext, "getFile">): Promise<FixedFile[]> {
  const base = item.title.replace(/[^A-Za-z0-9 .,&()'-]+/g, " ").replace(/\s+/g, " ").trim() || "File";
  if (item.kind === "image") {
    ctx.onProgress?.({ done: 0, total: 1, label: "Optimising image" });
    for (let level = 0; level < IMAGE_QUALITY_LADDER.length; level++) {
      const image = await encodeAtLevel(file, item.fileName, level);
      if (image.jpeg.length <= IMMI_MAX_BYTES) {
        ctx.onProgress?.({ done: 1, total: 1, label: "Done" });
        return [{ fileName: `${base} (ImmiAccount ready).jpg`, bytes: image.jpeg, mimeType: "image/jpeg" }];
      }
    }
    throw new BuildError("This image can’t be made smaller than 5 MB.");
  }
  if (item.kind !== "pdf") throw new BuildError("Only PDFs and images can be fixed here.");
  const parts = await buildSeparate(item, { ...ctx, getFile: async () => file }, false, "", (label) =>
    ctx.onProgress?.({ done: 0, total: 1, label }),
  );
  ctx.onProgress?.({ done: 1, total: 1, label: "Done" });
  return parts.map((p, i) => ({
    fileName: parts.length > 1 ? `${base} (ImmiAccount ready, part ${i + 1} of ${parts.length}).pdf` : `${base} (ImmiAccount ready).pdf`,
    bytes: p.bytes,
    mimeType: "application/pdf",
  }));
}

function describeError(error: unknown): string {
  if (error instanceof BuildError) return error.message;
  if (error instanceof Error && /decode|source image|InvalidStateError|EncodingError/i.test(`${error.name} ${error.message}`)) {
    return "the image couldn’t be read. Try saving it as a JPG.";
  }
  return "it couldn’t be processed. Try saving it again as a PDF or JPG.";
}
