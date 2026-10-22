import type { CategoryId } from "./types";

export interface CategoryDef {
  id: CategoryId;
  /** Short label used in UI chips and file names. */
  label: string;
  /** Neutral description of what the group is for (not advice). */
  description: string;
  /** "merge" groups become one date-ordered PDF; "separate" files stay individual uploads. */
  mode: "merge" | "separate";
  /** Output order. */
  order: number;
}

/**
 * Group names follow the common way applicants file relationship evidence. The descriptions are deliberately
 * mechanical: they say how a group is FILED, never what belongs in it. LodgeReady organises files; it does not tell
 * anyone what evidence to provide or where it belongs. The applicant decides.
 */
const MERGED = "Merged into one date-ordered PDF";
const SEPARATE = "Kept as separate files, one per document";

export const CATEGORIES: readonly CategoryDef[] = [
  { id: "financial", label: "Financial", description: MERGED, mode: "merge", order: 1 },
  { id: "household", label: "Household", description: MERGED, mode: "merge", order: 2 },
  { id: "social", label: "Social", description: MERGED, mode: "merge", order: 3 },
  { id: "commitment", label: "Commitment", description: MERGED, mode: "merge", order: 4 },
  { id: "other", label: "Other", description: MERGED, mode: "merge", order: 5 },
  { id: "identity", label: "Identity", description: SEPARATE, mode: "separate", order: 6 },
  { id: "forms", label: "Forms and statements", description: SEPARATE, mode: "separate", order: 7 },
] as const;

export const SORTABLE_CATEGORIES = CATEGORIES;

export const UNSORTED: CategoryDef = {
  id: "unsorted",
  label: "Unsorted",
  description: "Not in a group yet. These go into Other when you build.",
  mode: "merge",
  order: 99,
};

export function getCategory(id: CategoryId): CategoryDef {
  if (id === "unsorted") return UNSORTED;
  const found = CATEGORIES.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown category: ${id}`);
  return found;
}

/** Unsorted files are built into "Other" rather than blocking the user. */
export function effectiveCategory(id: CategoryId): Exclude<CategoryId, "unsorted"> {
  return id === "unsorted" ? "other" : id;
}

export function isCategoryId(value: unknown): value is CategoryId {
  return value === "unsorted" || CATEGORIES.some((c) => c.id === value);
}
