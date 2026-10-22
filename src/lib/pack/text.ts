/**
 * The embedded font (Noto Sans) covers Latin, Greek, Cyrillic and Vietnamese. Anything else (for example Chinese,
 * Arabic, Hindi, Thai or emoji) prints as "?". This check lets us warn before building.
 */
const PRINTABLE =
  /^[ -~ -ͯͰ-ϿЀ-ԯḀ-῿ -⁯₠-⃏℀-⋿Ⱡ-Ɀ꜠-ꟿ\s]*$/u;

export function hasUnprintableText(text: string): boolean {
  return !PRINTABLE.test(text);
}
