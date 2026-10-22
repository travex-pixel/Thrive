import type { ItemKind } from "./types";

/**
 * What a file looks like, judged only from its name ("bank statement", "photo", "chat"). This is a label that helps
 * the applicant sort many files quickly. It never decides a group: the applicant chooses where each type goes, so
 * LodgeReady stays a filing tool and never decides which part of an application a document supports.
 */
export type DocType = "money" | "bill" | "home" | "photo" | "chat" | "travel" | "id" | "form" | "letter" | "legal";

export const DOC_TYPES: Record<DocType, { label: string; plural: string }> = {
  money: { label: "Bank, loan or pay document", plural: "Bank, loan and pay documents" },
  bill: { label: "Bill, insurance or account", plural: "Bills, insurance and accounts" },
  home: { label: "Lease, property or mail", plural: "Leases, property documents and mail" },
  photo: { label: "Photo", plural: "Photos" },
  chat: { label: "Messages or calls", plural: "Messages and call logs" },
  travel: { label: "Travel booking", plural: "Travel bookings" },
  id: { label: "ID or certificate", plural: "ID documents and certificates" },
  form: { label: "Form or declaration", plural: "Forms and declarations" },
  letter: { label: "Statement or letter", plural: "Statements and letters" },
  legal: { label: "Will or legal document", plural: "Wills and legal documents" },
};

/** Display order for the quick-sort list. */
export const DOC_TYPE_ORDER: DocType[] = ["money", "bill", "home", "photo", "chat", "travel", "letter", "form", "id", "legal"];

const SEP = "[\\s_-]?";
const any = (...parts: string[]) => new RegExp(`\\b(${parts.join("|")})\\b`, "i");

const BANKS = [
  "bank",
  "banking",
  "cba",
  "commbank",
  `commonwealth${SEP}bank`,
  "nab",
  "anz",
  "westpac",
  "ing",
  "macquarie",
  "bendigo",
  "boq",
  "suncorp",
  "ubank",
  `st${SEP}george`,
  "bankwest",
  "hsbc",
  "citibank",
  "revolut",
  `up${SEP}bank`,
];

/**
 * Ordered by specificity: the first match wins. "Statement" on its own is ambiguous, so it only counts as a bank
 * document next to a bank or account word, and as a written statement next to "from", "by", "witness" and so on.
 * Rules marked `documentsOnly` describe what a photo shows ("Trip to Bali.jpg") as often as a document, so they
 * are skipped for images.
 */
const RULES: { type: DocType; pattern: RegExp; documentsOnly?: boolean }[] = [
  {
    type: "form",
    pattern: any(`form${SEP}(888|40sp|47sp|80|1221|956a?|1022|1229|47|40)`, `stat(utory)?${SEP}dec(laration)?s?`, "declaration"),
  },
  {
    type: "id",
    pattern: any(
      "passports?",
      `birth${SEP}cert(ificate)?s?`,
      `drivers?'?${SEP}licen[cs]es?`,
      `licen[cs]e${SEP}(card|front|back)`,
      `national${SEP}id`,
      `id${SEP}card`,
      `identity${SEP}(card|document)`,
      "medicare",
      "citizenship",
      `marriage${SEP}cert(ificate)?`,
      `divorce${SEP}(cert(ificate)?|order)`,
      `name${SEP}change`,
      `police${SEP}(check|clearance|certificate)`,
    ),
  },
  {
    type: "legal",
    pattern: any(
      `last${SEP}will`,
      `will${SEP}(and|&)${SEP}testament`,
      `(my|our|joint|mutual|signed|new|updated)${SEP}wills?`,
      "testament",
      `power${SEP}of${SEP}attorney`,
      `enduring${SEP}power`,
      "beneficiar(y|ies)",
      `binding${SEP}(death${SEP}benefit${SEP})?nomination`,
      `estate${SEP}plan(ning)?`,
    ),
  },
  {
    type: "money",
    pattern: any(
      ...BANKS,
      "e-?statements?",
      "stmt",
      "transactions?",
      `account${SEP}(statement|summary|history)`,
      `statement${SEP}of${SEP}account`,
      `(credit|debit)${SEP}card`,
      `card${SEP}statement`,
      `joint${SEP}account`,
      "savings",
      "loan",
      "mortgage",
      `pay${SEP}slips?`,
      "payslips?",
      "superannuation",
      `super${SEP}(statement|fund|account)`,
      `tax${SEP}return`,
      `notice${SEP}of${SEP}assessment`,
      "centrelink",
      "remittance",
    ),
  },
  {
    type: "letter",
    pattern: any(
      `witness${SEP}statement`,
      `support(ing)?${SEP}(statement|letter)`,
      `statements?${SEP}(from|by)`,
      `letters?${SEP}(from|of|by)`,
      `reference${SEP}letter`,
      `relationship${SEP}statement`,
      `personal${SEP}statement`,
      `cover${SEP}letter`,
      "letter",
    ),
  },
  {
    type: "bill",
    pattern: any(
      "bills?",
      "invoice",
      "electricity",
      "nbn",
      "broadband",
      "utility",
      "utilities",
      "rates",
      "insurance",
      "policy",
      `(power|energy|gas|water|internet|phone|mobile)${SEP}(bill|plan|account|statement|invoice|notice|usage)`,
      "agl",
      "origin",
      "energyaustralia",
      `energy${SEP}australia`,
      "alinta",
      "telstra",
      "optus",
      "vodafone",
      "tpg",
      "iinet",
      `aussie${SEP}broadband`,
      "medibank",
      "bupa",
      "nrma",
      "racv",
      "aami",
    ),
  },
  {
    type: "chat",
    pattern: any(
      "chats?",
      "messages?",
      "texts?",
      "sms",
      "imessages?",
      `call${SEP}(log|logs|history)`,
      "calls",
      "messenger",
      "wechat",
      "viber",
      "telegram",
      "kakaotalk",
      "e-?mails?",
      "facetime",
      "skype",
    ),
  },
  {
    type: "home",
    pattern: any(
      "leases?",
      "tenancy",
      "rental",
      "rent",
      "bond",
      "property",
      `title${SEP}deed`,
      `land${SEP}title`,
      "strata",
      "mail",
      "envelopes?",
      "addressed",
      `change${SEP}of${SEP}address`,
    ),
  },
  { type: "photo", pattern: any("photos?", "pics?", "pictures?", "selfies?", "album") },
  {
    type: "travel",
    pattern: any(
      "flights?",
      "itinerar(y|ies)",
      `boarding${SEP}pass(es)?`,
      "bookings?",
      "e-?tickets?",
      "qantas",
      "jetstar",
      "emirates",
      "airasia",
      "expedia",
    ),
  },
  { type: "travel", pattern: any("travel", "trip", "hotel", "airbnb", "accommodation"), documentsOnly: true },
];

/** Images that are probably not photos: they could show anything, so we don't guess. */
const NOT_A_PHOTO = /screen[\s_-]?shot|screen[\s_-]?recording|^scr_\d|\bscan(ned)?\b|^scan[\s_-]?\d|^doc(ument)?[\s_-]?\d/i;

/** Returns what a file looks like from its name, or null when it can't tell. */
export function detectDocType(fileName: string, kind: ItemKind): DocType | null {
  if (kind === "unsupported") return null;
  const stem = fileName.replace(/\.[a-z0-9]{1,5}$/i, "");
  const name = stem.replace(/[_]+/g, " ");
  for (const rule of RULES) {
    if (rule.documentsOnly && kind === "image") continue;
    if (rule.pattern.test(name)) return rule.type;
  }
  if (/^(the[\s_-]?)?wills?$/i.test(name.trim())) return "legal";
  // Camera and phone pictures ("IMG_4821.HEIC", "Bali 2023.jpg") are almost always photos. PNGs are usually
  // screenshots (an iPhone saves them as "IMG_1234.PNG"), which could show anything.
  if (kind === "image" && !NOT_A_PHOTO.test(stem) && !/\.png$/i.test(fileName)) return "photo";
  return null;
}
