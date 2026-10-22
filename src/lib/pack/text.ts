/**
 * The embedded font (Noto Sans, trimmed by scripts/subset-fonts.sh) covers Latin including Vietnamese, Greek and
 * Cyrillic. Anything else (for example Chinese, Arabic, Hindi, Thai or emoji) prints as "?". This check lets us warn
 * before building. Keep the ranges in sync with the script.
 */
const PRINTABLE =
  /^[\u0020-\u007e\u00a0-\u024f\u0300-\u036f\u0370-\u03ff\u0400-\u052f\u1e00-\u1eff\u2000-\u206f\u20a0-\u20cf\u2100-\u22ff\s]*$/u;

export function hasUnprintableText(text: string): boolean {
  return !PRINTABLE.test(text);
}
