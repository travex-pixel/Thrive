import type { CategoryId, ItemKind } from "./types";

/**
 * Conservative, keyword-based group suggestions from file names. This is a
 * filing convenience only: suggestions are always shown to the user as
 * "Suggested" so they can check them. Ordered by specificity: the first rule
 * that matches wins.
 */
const RULES: { category: Exclude<CategoryId, "unsorted">; pattern: RegExp }[] = [
  // Forms & signed statements first ("form 888" must not be read as a photo number).
  { category: "forms", pattern: /\b(form[\s_-]?(888|40sp|47sp|80|1221|956|1022)|stat(utory)?[\s_-]?dec(laration)?|relationship[\s_-]?statement|personal[\s_-]?statement|cover[\s_-]?letter)\b/i },
  { category: "identity", pattern: /\b(passport|birth[\s_-]?cert(ificate)?|driver'?s?[\s_-]?licen[cs]e|licen[cs]e|national[\s_-]?id|id[\s_-]?card|medicare|citizenship|marriage[\s_-]?cert(ificate)?|divorce|name[\s_-]?change|police[\s_-]?(check|clearance|certificate))\b/i },
  { category: "financial", pattern: /\b(bank|statement|stmt|transactions?|cba|commbank|nab|anz|westpac|ing|macquarie|bendigo|boq|suncorp|ubank|st[\s_-]?george|bankwest|loan|mortgage|home[\s_-]?loan|credit[\s_-]?card|super(annuation)?|insurance|policy|payslip|pay[\s_-]?slip|tax[\s_-]?return|noa|notice[\s_-]?of[\s_-]?assessment|joint[\s_-]?account|savings|transfer|centrelink)\b/i },
  { category: "household", pattern: /\b(lease|tenancy|rental|rent|bond|electricity|power|energy|gas|water|internet|nbn|phone[\s_-]?bill|utility|utilities|bills?|rates|council|strata|agl|origin|energyaustralia|telstra|optus|vodafone|mail|letter|envelope|addressed|house|household|chores|groceries)\b/i },
  { category: "commitment", pattern: /\b(whats[\s_-]?app[\s_-]?chat|chat|messages?|texts?|sms|call[\s_-]?log|calls|messenger|wechat|line|viber|telegram|email[s]?|flights?|itinerary|boarding[\s_-]?pass|booking|e-?ticket|travel|trip[\s_-]?plan|will|beneficiary|engagement|wedding[\s_-]?plan|future[\s_-]?plans?)\b/i },
  { category: "social", pattern: /\b(photos?|pics?|pictures?|wedding|party|birthday|christmas|holiday|vacation|invitation|invite|card|facebook|instagram|social[\s_-]?media|friends|family|event|gathering|celebration)\b/i },
  // Camera file names are nearly always photos of the couple.
  { category: "social", pattern: /^(img|pxl|dsc|dscn|dcim|photo|mvimg|whatsapp[\s_-]?image|signal-|snapchat-)[\s_-]?\d/i },
];

export function suggestCategory(fileName: string, kind: ItemKind): Exclude<CategoryId, "unsorted"> | null {
  if (kind === "unsupported") return null;
  const name = fileName.replace(/\.[a-z0-9]{1,5}$/i, "").replace(/[_]+/g, " ");
  for (const rule of RULES) {
    if (rule.pattern.test(name) || rule.pattern.test(fileName)) {
      // Images whose names look like documents ("lease.jpg") still follow the document rule.
      return rule.category;
    }
  }
  return null;
}
