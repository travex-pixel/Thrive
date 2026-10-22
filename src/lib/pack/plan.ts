import { CATEGORIES, effectiveCategory, getCategory } from "./categories";
import { dateSortKey, isUncheckedDate } from "./dates";
import { LOWEST_KNOWN_LIMIT, TARGET_BYTES } from "./limits";
import { extensionOf, indexFileName, mergedDocFileName, numbering, separateDocFileName } from "./naming";
import { hasUnprintableText } from "./text";
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
 *
 * Photos: a typical 3 MB phone photo re-encoded at 1600 px is roughly 300–450 KB, about half that with smaller photos.
 */
export function estimateItemBytes(
  item: Pick<EvidenceItem, "kind" | "size" | "pageCount" | "encrypted" | "mimeType" | "fileName">,
  compactPhotos = false,
): number {
  switch (item.kind) {
    case "image": {
      const ext = extensionOf(item.fileName);
      const ratio = ext === "png" || ext === "bmp" || ext === "gif" ? 0.12 : 0.15;
      const estimate = Math.min(Math.max(item.size * ratio, 120_000), 600_000);
      return Math.round(compactPhotos ? estimate * 0.5 : estimate);
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
export function partitionItems(items: EvidenceItem[], budget = CONTENT_BUDGET_BYTES, compactPhotos = false): Partition[] {
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
    const bytes = estimateItemBytes(item, compactPhotos);
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
export function groupItems(items: EvidenceItem[], compactPhotos = false): DocGroup[] {
  const usable = items.filter(isUsable);
  const groups: DocGroup[] = [];

  for (const category of [...CATEGORIES].sort((a, b) => a.order - b.order)) {
    const catItems = sortItems(usable.filter((i) => effectiveCategory(i.category) === category.id));
    if (catItems.length === 0) continue;

    const convertible = catItems.filter((i) => i.kind !== "passthrough");
    const passthrough = catItems.filter((i) => i.kind === "passthrough");

    if (category.mode === "merge") {
      const partitions = partitionItems(convertible, CONTENT_BUDGET_BYTES, compactPhotos);
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
        const bytes = estimateItemBytes(item, compactPhotos);
        const parts = bytes > CONTENT_BUDGET_BYTES ? Math.ceil(bytes / CONTENT_BUDGET_BYTES) : 1;
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

/** Assigns numbered, upload-ordered file names. The index (if any) comes first. */
export function nameGroups(groups: DocGroup[], includeIndex: boolean, startNumber = 1): PlannedDoc[] {
  const docs: PlannedDoc[] = [];
  const { indexNumber, firstFile } = numbering(startNumber, includeIndex);
  if (includeIndex) {
    docs.push({
      key: "index",
      kind: "index",
      category: "other",
      fileName: indexFileName(indexNumber),
      itemIds: groups.flatMap((g) => g.items.map((i) => i.id)),
      estimatedBytes: 40_000 + groups.reduce((n, g) => n + g.items.length, 0) * 600,
      part: 1,
      parts: 1,
    });
  }

  let number = firstFile - 1;
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

/**
 * Attachments already uploaded when numbering continues from `startNumber` (files 00 to startNumber − 1). Counted
 * from 00, which slightly overcounts if the earlier batch had no index: the safe direction for a limit.
 */
export function alreadyUploadedCount(startNumber: number): number {
  return Number.isFinite(startNumber) && startNumber > 1 ? Math.floor(startNumber) : 0;
}

export function planPack(items: EvidenceItem[], settings: PackSettings & { names?: string; limitConfirmed?: boolean }): PackPlan {
  const usable = items.filter(isUsable);
  const unusable = items.length - usable.length;
  const unsortedCount = usable.filter((i) => i.category === "unsorted").length;
  const uncheckedDateCount = usable.filter(isUncheckedDate).length;
  const unprintable = usable.filter((i) => hasUnprintableText(i.title)).length + (settings.names && hasUnprintableText(settings.names) ? 1 : 0);
  const groups = groupItems(items, settings.compactPhotos);
  const docs = usable.length > 0 ? nameGroups(groups, settings.includeIndex, settings.startNumber) : [];
  const attachmentCount = docs.length;
  // Continuing after earlier uploads (say 00 to 23): those attachments count towards the same limit.
  const alreadyUploaded = alreadyUploadedCount(settings.startNumber);
  const limitKnown = settings.limitConfirmed !== false;
  const needsLimitCheck = !limitKnown && attachmentCount + alreadyUploaded > LOWEST_KNOWN_LIMIT;
  const overLimit = limitKnown && attachmentCount + alreadyUploaded > settings.attachmentLimit;

  const warnings: string[] = [];
  if (unsortedCount > 0) {
    warnings.push(`${unsortedCount} ${unsortedCount === 1 ? "file isn’t" : "files aren’t"} in a group yet, so ${unsortedCount === 1 ? "it goes" : "they go"} into “Other”.`);
  }
  if (unusable > 0) {
    warnings.push(`${unusable} ${unusable === 1 ? "file can’t" : "files can’t"} be used and will be left out.`);
  }
  if (unprintable > 0) {
    warnings.push(
      `${unprintable} ${unprintable === 1 ? "title or name uses" : "titles or names use"} characters LodgeReady can’t print (for example Chinese, Arabic or Hindi script). They’ll show as “?”. Use English letters if you can.`,
    );
  }
  if (overLimit) {
    const total = alreadyUploaded > 0 ? `, plus the ${alreadyUploaded} you’ve already uploaded,` : "";
    warnings.push(
      `This pack has ${attachmentCount} files${total} and your limit is set to ${settings.attachmentLimit}. ` +
        `Change what’s in the pack${settings.compactPhotos ? "" : ", turn on smaller photos"}${settings.includeIndex ? ", or turn off the index" : ""}.`,
    );
  }

  return {
    docs,
    attachmentCount,
    attachmentLimit: settings.attachmentLimit,
    overLimit,
    usableItemCount: usable.length,
    unsortedCount,
    uncheckedDateCount,
    needsLimitCheck,
    warnings,
  };
}
