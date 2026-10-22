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
  /** What the file looks like ("bank statement", "photo"), from its name. A label only: the user picks the group. */
  docType?: import("./suggest").DocType | null;
  /**
   * Where the date came from. "exif" and "filename" are automatic and UNCONFIRMED: they are used for ordering but
   * never printed on the PDFs until the user confirms them ("user").
   */
  dateSource: "exif" | "filename" | "user" | null;
  addedAt: number;
  /**
   * True once the background check (page count, locks, photo date) has finished. The builder never relies on it:
   * it reads page counts and locks from the file itself when it builds.
   */
  inspected?: boolean;
  pageCount?: number;
  /** Encrypted/permission-locked PDFs are re-rendered into clean copies. */
  encrypted?: boolean;
  /** Human-readable reason this file cannot be used. */
  error?: string;
}

export interface PackSettings {
  attachmentLimit: number;
  includeIndex: boolean;
  /** Start photos one step down the quality ladder so more fit in each file. */
  compactPhotos: boolean;
  /** Number of the first file in this batch; above 1 when continuing after files already uploaded. */
  startNumber: number;
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
  /** Automatic dates the user hasn't checked; they order files but aren't printed. */
  uncheckedDateCount: number;
  /** The pack is bigger than the lowest known limit and the user hasn't told us theirs yet. */
  needsLimitCheck: boolean;
  warnings: string[];
}
