export type CategoryId =
  | "unsorted"
  | "financial"
  | "household"
  | "social"
  | "commitment"
  | "other"
  | "identity"
  | "forms";

export type ItemKind = "pdf" | "image" | "passthrough" | "unsupported";

/** A date with the precision the user actually knows. */
export type EvidenceDate = string | null; // "YYYY", "YYYY-MM" or "YYYY-MM-DD"

export interface EvidenceItem {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  kind: ItemKind;
  category: CategoryId;
  title: string;
  date: EvidenceDate;
  /** True when the group was suggested from the file name and not yet confirmed. */
  suggested?: boolean;
  /** Source of the date, so we can show "from photo" etc. */
  dateSource: "exif" | "filename" | "user" | null;
  addedAt: number;
  pageCount?: number;
  /** Encrypted/permission-locked PDFs are re-rendered into clean copies. */
  encrypted?: boolean;
  /** Human-readable reason this file cannot be used. */
  error?: string;
}

export interface PackSettings {
  attachmentLimit: number;
  includeIndex: boolean;
}

export type PlannedDocKind = "index" | "merged" | "separate" | "passthrough";

export interface PlannedDoc {
  key: string;
  kind: PlannedDocKind;
  category: CategoryId;
  fileName: string;
  itemIds: string[];
  estimatedBytes: number;
  part: number;
  parts: number;
}

export interface PackPlan {
  docs: PlannedDoc[];
  attachmentCount: number;
  attachmentLimit: number;
  overLimit: boolean;
  usableItemCount: number;
  unsortedCount: number;
  warnings: string[];
}
