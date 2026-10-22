#!/usr/bin/env sh
# Rebuilds public/fonts from the full Noto Sans files (SIL Open Font License 1.1).
#
# Why: pdf-lib's own font subsetting draws most glyphs blank with the full, hinted Noto Sans files (checked with
# poppler and pdf.js). Removing hinting and keeping only the scripts we print (Latin incl. Vietnamese, Greek,
# Cyrillic, punctuation, currency, arrows and maths) fixes it; pdf-lib then subsets further per PDF.
# Keep the ranges in sync with src/lib/pack/text.ts.
#
# Usage: pip install fonttools && sh scripts/subset-fonts.sh <dir with NotoSans-Regular.ttf and NotoSans-SemiBold.ttf>
set -eu
SRC="${1:?folder containing the full Noto Sans .ttf files}"
RANGES="U+0020-007E,U+00A0-024F,U+0300-036F,U+0370-03FF,U+0400-052F,U+1E00-1EFF,U+2000-206F,U+20A0-20CF,U+2100-218F,U+2190-21FF,U+2200-22FF"
for weight in Regular SemiBold; do
  pyftsubset "$SRC/NotoSans-$weight.ttf" --unicodes="$RANGES" --no-hinting --layout-features='kern,liga' \
    --output-file="public/fonts/NotoSans-$weight.ttf"
done
