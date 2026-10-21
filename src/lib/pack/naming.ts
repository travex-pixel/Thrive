/** File-name helpers. Output names are ASCII-safe so they upload cleanly anywhere. */

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

/** Strips characters that are unsafe or awkward in uploaded file names. */
export function safeFileNamePart(input: string, maxLength = 60): string {
  const ascii = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // drop combining accents
    .replace(/[^A-Za-z0-9 .,&()'-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const clipped = ascii.length > maxLength ? ascii.slice(0, maxLength).trim() : ascii;
  return clipped.replace(/[ .]+$/, "") || "File";
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function mergedDocFileName(index: number, label: string, part: number, parts: number): string {
  const suffix = parts > 1 ? ` (part ${part} of ${parts})` : "";
  return `${pad2(index)} ${safeFileNamePart(label)} evidence${suffix}.pdf`;
}

export function separateDocFileName(
  index: number,
  label: string,
  title: string,
  extension = "pdf",
  part = 1,
  parts = 1,
): string {
  const suffix = parts > 1 ? ` (part ${part} of ${parts})` : "";
  return `${pad2(index)} ${safeFileNamePart(label, 24)} - ${safeFileNamePart(title, 50)}${suffix}.${extension}`;
}

export const INDEX_FILE_NAME = "00 Evidence index.pdf";
