/**
 * Technical limits and product constants.
 *
 * ImmiAccount's published limit is "5MB" per attachment. We treat that as
 * 5,000,000 bytes (the stricter reading) and plan to a lower target so a
 * built file never lands on the edge.
 */
export const IMMI_MAX_BYTES = 5_000_000;
export const TARGET_BYTES = 4_600_000;

/**
 * Home Affairs' help says there is a limit to the number of files that can be attached for each applicant, and that it
 * depends on the application type. Figures quoted elsewhere differ (30, 60, 100), so we don't assume one: once a pack
 * has more than the lowest figure seen, the user is asked for theirs. "Other" allows any value.
 */
export const ATTACHMENT_LIMIT_PRESETS = [30, 60, 100] as const;
export const LOWEST_KNOWN_LIMIT = 30;
export const ATTACH_HELP_URL = "https://immi.homeaffairs.gov.au/help-text/eplus/Pages/elp-h1075.aspx";
/** Home Affairs' form for documents that don't fit within the attachment limit. */
export const ADDITIONAL_DOCS_URL = "https://immi.homeaffairs.gov.au/help-support/applying-online-or-on-paper/online/attach-additional-documents-form";
export const HOME_AFFAIRS_URL = "https://immi.homeaffairs.gov.au/";
/** Home Affairs' own overview of partner visas, for what to provide. LodgeReady never advises on evidence. */
export const PARTNER_VISA_URL = "https://immi.homeaffairs.gov.au/what-we-do/family-migration-program/visa-options/about-partner-visas";
export const DEFAULT_ATTACHMENT_LIMIT = 60;

/** Packs with up to this many files can be downloaded without unlocking. */
export const FREE_ITEM_LIMIT = 10;

export const PRICE_AUD_CENTS = 2900;
export const PRICE_LABEL = "A$29";
export const PRODUCT_CODE = "lodgeready_unlimited_v1";

/** Extensions we can turn into PDF pages. */
export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "heic", "heif"] as const;
export const PDF_EXTENSIONS = ["pdf"] as const;

/**
 * Formats ImmiAccount accepts that we cannot convert in the browser. They are
 * passed through untouched as their own attachment (if under the size limit).
 */
export const PASSTHROUGH_EXTENSIONS = ["doc", "docx", "dot", "rtf", "txt", "xls", "xlsx", "ppt", "pptx"] as const;

export const ACCEPT_ATTRIBUTE = [
  ".pdf",
  ...IMAGE_EXTENSIONS.map((e) => `.${e}`),
  ...PASSTHROUGH_EXTENSIONS.map((e) => `.${e}`),
  "application/pdf",
  "image/*",
].join(",");
