import { CATEGORIES, effectiveCategory, getCategory } from "./categories";
import { dateSortKey } from "./dates";
import { TARGET_BYTES } from "./limits";
import { INDEX_FILE_NAME, extensionOf, mergedDocFileName, separateDocFileName } from "./naming";
import type { CategoryId, EvidenceItem, PackPlan, PackSettings, PlannedDoc, PlannedDocKind } from "./types";

/** Bytes reserved per merged PDF for cover pages and the embedded font subset. */
export const COVER_OVERHEAD_BYTES = 80_000;
/** Usable bytes for content inside one output file. */
export const CONTENT_BUDGET_BYTES = TARGET_BYTES - COVER_OVERHEAD_BYTES;

/**
 * Rough size of an item once it is in a PDF. Images are re-encoded (usually
 * much smaller); copyable PDFs keep roughly their size; locked PDFs are
 * re-rendered page by page. The builder measures real sizes and adapts, so
 * this only needs to be good enough for a preview.
 */
export function estimateItemBytes(item: Pick<EvidenceItem, "kind" | "size" | "pageCount" | "encrypted" | "mimeType" | "fileName">): number {
  switch (item.kind) {
    case "image": {
      const ext = extensionOf(item.fileName);
      const ratio = ext === "png" || ext === "bmp" ? 0.25 : 0.4;
      return Math.round(Math.min(Math.max(item.size * ratio, 120_000), 900_000));
    }
    case "pdf": {
      if (item.encrypted) return (item.pageCount ?? 1) * 260_000;
      return Math.max(item.size, 20_000);
    }
    case "passthrough":
      return item.size;
    default:
      return 0;
  }
}

/** Date order (oldest first); undated items keep the order they were added in, at the end. */
export function sortItems<T extends Pick<EvidenceItem, "date" | "addedAt">>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const byDate = dateSortKey(a.date).localeCompare(dateSortKey(b.date));
    return byDate !== 0 ? byDate : a.addedAt - b.addedAt;
  });
}

export function isUsable(item: EvidenceItem): boolean {
  return !item.error && item.kind !== "unsupported";
}

interface Partition {
  items: EvidenceItem[];
  bytes: number;
  /** >1 when a single item is too big for one file and must be split by pages. */
  parts: number;
}

/** Greedy, order-preserving packing of items into files under the content budget. */
export function partitionItems(items: EvidenceItem[], budget = CONTENT_BUDGET_BYTES): Partition[] {
  const partitions: Partition[] = [];
  let current: EvidenceItem[] = [];
  let currentBytes = 0;

  const flush = () => {
    if (current.length === 0) return;
    const parts = current.length === 1 && currentBytes > budget ? Math.ceil(currentBytes / budget) : 1;
    partitions.push({ items: current, bytes: currentBytes, parts });
    current = [];
    currentBytes = 0;
  };

  for (const item of items) {
    const bytes = estimateItemBytes(item);
    if (current.length > 0 && currentBytes + bytes > budget) flush();
    current.push(item);
    currentBytes += bytes;
    if (currentBytes > budget) flush(); // an oversized single item stands alone
  }
  flush();
  return partitions;
}

export interface DocGroup {
  kind: PlannedDocKind;
  category: Exclude<CategoryId, "unsorted">;
  items: EvidenceItem[];
  part: number;
  parts: number;
  estimatedBytes: number;
}

/** Splits usable items into output groups, in upload order. */
export function groupItems(items: EvidenceItem[]): DocGroup[] {
  const usable = items.filter(isUsable);
  const groups: DocGroup[] = [];

  for (const category of [...CATEGORIES].sort((a, b) => a.order - b.order)) {
    const catItems = sortItems(usable.filter((i) => effectiveCategory(i.category) === category.id));
    if (catItems.length === 0) continue;

    const convertible = catItems.filter((i) => i.kind !== "passthrough");
    const passthrough = catItems.filter((i) => i.kind === "passthrough");

    if (category.mode === "merge") {
      const partitions = partitionItems(convertible);
      const totalParts = partitions.reduce((sum, p) => sum + p.parts, 0);
      let partNo = 0;
      for (const partition of partitions) {
        for (let k = 0; k < partition.parts; k++) {
          partNo++;
          groups.push({
            kind: "merged",
            category: category.id as DocGroup["category"],
            items: partition.items,
            part: partNo,
            parts: totalParts,
            estimatedBytes: Math.round(partition.bytes / partition.parts) + COVER_OVERHEAD_BYTES,
          });
        }
      }
    } else {
      for (const item of convertible) {
        const bytes = estimateItemBytes(item);
        const parts = item.kind === "pdf" && bytes > CONTENT_BUDGET_BYTES ? Math.ceil(bytes / CONTENT_BUDGET_BYTES) : 1;
        for (let part = 1; part <= parts; part++) {
          groups.push({
            kind: "separate",
            category: category.id as DocGroup["category"],
            items: [item],
            part,
            parts,
            estimatedBytes: Math.round(bytes / parts),
          });
        }
      }
    }

    for (const item of passthrough) {
      groups.push({
        kind: "passthrough",
        category: category.id as DocGroup["category"],
        items: [item],
        part: 1,
        parts: 1,
        estimatedBytes: item.size,
      });
    }
  }
  return groups;
}

/** Assigns numbered, upload-ordered file names. Index (if any) is always 00. */
export function nameGroups(groups: DocGroup[], includeIndex: boolean): PlannedDoc[] {
  const docs: PlannedDoc[] = [];
  if (includeIndex) {
    docs.push({
      key: "index",
      kind: "index",
      category: "other",
      fileName: INDEX_FILE_NAME,
      itemIds: groups.flatMap((g) => g.items.map((i) => i.id)),
      estimatedBytes: 40_000 + groups.reduce((n, g) => n + g.items.length, 0) * 600,
      part: 1,
      parts: 1,
    });
  }

  let number = 0;
  groups.forEach((group, i) => {
    number++;
    const label = getCategory(group.category).label;
    const item = group.items[0];
    let fileName: string;
    if (group.kind === "merged") {
      fileName = mergedDocFileName(number, label, group.part, group.parts);
    } else if (group.kind === "passthrough") {
      fileName = separateDocFileName(number, label, item.title, extensionOf(item.fileName) || "bin");
    } else {
      fileName = separateDocFileName(number, label, item.title, "pdf", group.part, group.parts);
    }
    docs.push({
      key: `${group.kind}:${group.category}:${item?.id ?? i}:${group.part}`,
      kind: group.kind,
      category: group.category,
      fileName,
      itemIds: group.items.map((it) => it.id),
      estimatedBytes: group.estimatedBytes,
      part: group.part,
      parts: group.parts,
    });
  });
  return docs;
}

export function planPack(items: EvidenceItem[], settings: PackSettings): PackPlan {
  const usable = items.filter(isUsable);
  const unusable = items.length - usable.length;
  const unsortedCount = usable.filter((i) => i.category === "unsorted").length;
  const groups = groupItems(items);
  const docs = usable.length > 0 ? nameGroups(groups, settings.includeIndex) : [];
  const attachmentCount = docs.length;
  const overLimit = attachmentCount > settings.attachmentLimit;

  const warnings: string[] = [];
  if (unsortedCount > 0) {
    warnings.push(`${unsortedCount} unsorted ${unsortedCount === 1 ? "file goes" : "files go"} into “Other”.`);
  }
  if (unusable > 0) {
    warnings.push(`${unusable} ${unusable === 1 ? "file can’t" : "files can’t"} be used and will be left out.`);
  }
  if (overLimit) {
    warnings.push(
      `This pack needs ${attachmentCount} attachments but your limit is ${settings.attachmentLimit}. ` +
        "Move some separate files into a merged group, or check the limit shown in your ImmiAccount.",
    );
  }

  return {
    docs,
    attachmentCount,
    attachmentLimit: settings.attachmentLimit,
    overLimit,
    usableItemCount: usable.length,
    unsortedCount,
    warnings,
  };
}
