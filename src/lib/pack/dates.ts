import type { EvidenceDate } from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const MONTH_PATTERN =
  "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";

function monthFromName(name: string): number {
  const key = name.slice(0, 3).toLowerCase();
  return MONTHS.findIndex((m) => m.toLowerCase() === key) + 1;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isValidDay(year: number, month: number, day: number): boolean {
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

function isPlausibleYear(year: number, now: Date): boolean {
  return year >= 1950 && year <= now.getUTCFullYear() + 1;
}

/**
 * Pulls a date out of a file name such as "IMG_20240315_101500.jpg",
 * "Statement 31-03-2024.pdf", "CBA March 2024.pdf" or "lease 2023-07.pdf".
 * Day-first numeric dates are read the Australian way (DD-MM-YYYY).
 * Returns null when nothing trustworthy is found.
 */
export function parseDateFromFileName(fileName: string, now: Date = new Date()): EvidenceDate {
  const name = fileName.replace(/\.[a-z0-9]{2,5}$/i, "");

  // 1. Year-first full dates, with or without separators: 2024-03-15, 20240315.
  const ymd = /(?<!\d)((?:19|20)\d{2})([-_. ]?)(0[1-9]|1[0-2])\2(0[1-9]|[12]\d|3[01])(?!\d)/.exec(name);
  if (ymd) {
    const [y, m, d] = [Number(ymd[1]), Number(ymd[3]), Number(ymd[4])];
    if (isPlausibleYear(y, now) && isValidDay(y, m, d)) return `${y}-${pad(m)}-${pad(d)}`;
  }

  // 2. Day-first full dates: 15-03-2024, 15.3.2024.
  const dmy = /(?<!\d)(0?[1-9]|[12]\d|3[01])[-_.](0?[1-9]|1[0-2])[-_.]((?:19|20)\d{2})(?!\d)/.exec(name);
  if (dmy) {
    const [d, m, y] = [Number(dmy[1]), Number(dmy[2]), Number(dmy[3])];
    if (isPlausibleYear(y, now) && isValidDay(y, m, d)) return `${y}-${pad(m)}-${pad(d)}`;
  }

  // 3. "15 March 2024", "15th Mar 2024".
  const dMonthY = new RegExp(
    `(?<!\\d)(\\d{1,2})(?:st|nd|rd|th)?[\\s_.-]*${MONTH_PATTERN}[\\s_.,-]*((?:19|20)\\d{2})(?!\\d)`,
    "i",
  ).exec(name);
  if (dMonthY) {
    const [d, m, y] = [Number(dMonthY[1]), monthFromName(dMonthY[2]), Number(dMonthY[3])];
    if (m > 0 && isPlausibleYear(y, now) && isValidDay(y, m, d)) return `${y}-${pad(m)}-${pad(d)}`;
  }

  // 4. "March 2024", "Mar_2024", "March 15 2024".
  const monthY = new RegExp(
    `(?<![a-z])${MONTH_PATTERN}[\\s_.-]*(?:(\\d{1,2})(?:st|nd|rd|th)?[\\s_.,-]+)?((?:19|20)\\d{2})(?!\\d)`,
    "i",
  ).exec(name);
  if (monthY) {
    const m = monthFromName(monthY[1]);
    const y = Number(monthY[3]);
    const d = monthY[2] ? Number(monthY[2]) : null;
    if (m > 0 && isPlausibleYear(y, now)) {
      if (d && isValidDay(y, m, d)) return `${y}-${pad(m)}-${pad(d)}`;
      return `${y}-${pad(m)}`;
    }
  }

  // 5. Year-month: 2024-03.
  const ym = /(?<!\d)((?:19|20)\d{2})[-_.](0[1-9]|1[0-2])(?![-_.]?\d)/.exec(name);
  if (ym) {
    const y = Number(ym[1]);
    if (isPlausibleYear(y, now)) return `${y}-${ym[2]}`;
  }

  // 6. Month-year: 03-2024.
  const my = /(?<!\d)(0[1-9]|1[0-2])[-_.]((?:19|20)\d{2})(?!\d)/.exec(name);
  if (my) {
    const y = Number(my[2]);
    if (isPlausibleYear(y, now)) return `${y}-${my[1]}`;
  }

  // 7. A lone year: "Lease 2023". Not for camera numbers ("IMG_2023.JPG") or broken full dates.
  if (!/^(img|dsc|dscn|pxl|mvimg|photo|scan|doc)[\s_-]?\d/i.test(name)) {
    const year = /(?<!\d[-_.]?)((?:19|20)\d{2})(?![-_.]?\d)/.exec(name);
    if (year && isPlausibleYear(Number(year[1]), now)) return year[1];
  }

  return null;
}

/** Normalises user input like "2024-3", "2024-03-05" or "2024" to a stored value. */
export function normaliseDateInput(value: string): EvidenceDate {
  const v = value.trim();
  if (!v) return null;
  const full = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);
  if (full) {
    const [y, m, d] = [Number(full[1]), Number(full[2]), Number(full[3])];
    return isValidDay(y, m, d) ? `${y}-${pad(m)}-${pad(d)}` : null;
  }
  const month = /^(\d{4})-(\d{1,2})$/.exec(v);
  if (month) {
    const [y, m] = [Number(month[1]), Number(month[2])];
    return m >= 1 && m <= 12 ? `${y}-${pad(m)}` : null;
  }
  if (/^\d{4}$/.test(v)) return v;
  return null;
}

/** Converts an EXIF/JS date to a day-precision value. */
export function dateFromJsDate(date: Date | null | undefined): EvidenceDate {
  if (!date || Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * The date that may be printed on a PDF. Automatic dates (from photo data or a file name) can be wrong, so they only
 * set the order until the applicant confirms them.
 */
export function printableDate(item: { date: EvidenceDate; dateSource: "exif" | "filename" | "user" | null }): EvidenceDate {
  return item.dateSource === "user" ? item.date : null;
}

export function isUncheckedDate(item: { date: EvidenceDate; dateSource: "exif" | "filename" | "user" | null }): boolean {
  return Boolean(item.date) && item.dateSource !== "user";
}

/** "15 Mar 2024", "Mar 2024", "2024" or "No date". */
export function formatDate(date: EvidenceDate): string {
  if (!date) return "No date";
  const [y, m, d] = date.split("-").map(Number);
  if (d) return `${d} ${MONTHS[m - 1]} ${y}`;
  if (m) return `${MONTHS[m - 1]} ${y}`;
  return String(y);
}

/** Sort key where month-only dates sort before days in that month. */
export function dateSortKey(date: EvidenceDate): string {
  if (!date) return "9999-99-99";
  const [y, m, d] = date.split("-");
  return `${y}-${m ?? "00"}-${d ?? "00"}`;
}

/** "Mar 2023 – Sep 2026" for a set of dates; empty string if none are dated. */
export function formatDateRange(dates: EvidenceDate[]): string {
  const known = dates.filter((d): d is string => Boolean(d)).sort((a, b) => dateSortKey(a).localeCompare(dateSortKey(b)));
  if (known.length === 0) return "";
  const monthLabel = (d: string) => {
    const [y, m] = d.split("-").map(Number);
    return m ? `${MONTHS[m - 1]} ${y}` : String(y);
  };
  const first = monthLabel(known[0]);
  const last = monthLabel(known[known.length - 1]);
  return first === last ? first : `${first} – ${last}`;
}
