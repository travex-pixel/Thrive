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
 * The four relationship groups mirror the four aspects named in the
 * Migration Regulations (financial, household, social, commitment). The
 * descriptions are deliberately neutral: LodgeReady organises files, it does
 * not tell anyone what evidence to provide.
 */
export const CATEGORIES: readonly CategoryDef[] = [
  { id: "financial", label: "Financial", description: "Shared money, assets and bills", mode: "merge", order: 1 },
  { id: "household", label: "Household", description: "Living together and running a home", mode: "merge", order: 2 },
  { id: "social", label: "Social", description: "How family and friends know you as a couple", mode: "merge", order: 3 },
  { id: "commitment", label: "Commitment", description: "Your commitment to each other over time", mode: "merge", order: 4 },
  { id: "other", label: "Other", description: "Anything else, merged into one file", mode: "merge", order: 5 },
  { id: "identity", label: "Identity", description: "Passports, birth certificates and ID, kept as separate files", mode: "separate", order: 6 },
  { id: "forms", label: "Forms & statements", description: "Signed forms and written statements, kept as separate files", mode: "separate", order: 7 },
] as const;

export const SORTABLE_CATEGORIES = CATEGORIES;

export const UNSORTED: CategoryDef = {
  id: "unsorted",
  label: "Unsorted",
  description: "Not yet sorted. Unsorted files go into Other when you build.",
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
