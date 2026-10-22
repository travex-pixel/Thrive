/**
 * File-name helpers. Output names use only letters, numbers and underscores (no spaces, brackets or "&"), the most
 * conservative set an upload form can ask for: "01_Financial_evidence_part1of2.pdf".
 */

export function extensionOf(fileName: string): string {
  const match = /\.([a-z0-9]{1,5})$/i.exec(fileName);
  return match ? match[1].toLowerCase() : "";
}

/** "joint_bank-statement_Mar 2024.pdf" -> "joint bank statement Mar 2024" */
export function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[a-z0-9]{1,5}$/i, "");
  const cleaned = base
    .replace(/[_]+/g, " ")
    .replace(/(?<=\S)-(?=\S)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (cleaned || "Untitled").slice(0, 120);
}

/** "Passport - Alex (2024)" -> "Passport_Alex_2024". Returns "" when nothing printable is left. */
export function safeFileNamePart(input: string, maxLength = 60): string {
  const ascii = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // drop combining accents: "José" -> "Jose"
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return ascii.length > maxLength ? ascii.slice(0, maxLength).replace(/_+$/, "") : ascii;
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function partSuffix(part: number, parts: number): string {
  return parts > 1 ? `_part${part}of${parts}` : "";
}

export function mergedDocFileName(index: number, label: string, part: number, parts: number): string {
  return `${pad2(index)}_${safeFileNamePart(label) || "Other"}_evidence${partSuffix(part, parts)}.pdf`;
}

export function separateDocFileName(
  index: number,
  label: string,
  title: string,
  extension = "pdf",
  part = 1,
  parts = 1,
): string {
  const name = safeFileNamePart(title, 50) || "Document";
  return `${pad2(index)}_${safeFileNamePart(label, 24) || "Other"}_${name}${partSuffix(part, parts)}.${extension}`;
}

/** The index takes the first number of the batch: "00" normally, or e.g. "24" when numbering continues a batch. */
export function indexFileName(number = 0): string {
  return `${pad2(number)}_Evidence_index.pdf`;
}

/**
 * Where numbering starts. A fresh pack is "00" (index), then 01, 02… When continuing after files already uploaded
 * (startNumber > 1), the index takes startNumber and the files follow it.
 */
export function numbering(startNumber: number, includeIndex: boolean): { indexNumber: number; firstFile: number } {
  const start = Number.isFinite(startNumber) && startNumber > 1 ? Math.floor(startNumber) : 1;
  if (!includeIndex) return { indexNumber: -1, firstFile: start };
  return start === 1 ? { indexNumber: 0, firstFile: 1 } : { indexNumber: start, firstFile: start + 1 };
}

/** Names for the free fixer: "Bank_statement_under5MB.pdf", "Bank_statement_part1of2.pdf". */
export function fixedFileName(title: string, extension: string, part = 1, parts = 1): string {
  const base = safeFileNamePart(title, 60) || "Document";
  return parts > 1 ? `${base}${partSuffix(part, parts)}.${extension}` : `${base}_under5MB.${extension}`;
}
