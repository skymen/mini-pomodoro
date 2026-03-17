#!/usr/bin/env zsh
# trim_transparent.sh — Trim transparent pixels from PNG images using ImageMagick
#
# Usage:
#   ./trim_transparent.sh input.png
#   ./trim_transparent.sh input.png output.png
#   ./trim_transparent.sh input.png --padding 10
#   ./trim_transparent.sh input.png output.png --padding 10

set -e

# ── helpers ──────────────────────────────────────────────────────────────────
usage() {
  echo "Usage: $0 <input.png> [output.png] [--padding <px>]"
  exit 1
}

check_imagemagick() {
  if ! command -v magick &>/dev/null && ! command -v convert &>/dev/null; then
    echo "ImageMagick not found. Install it with:"
    echo "  brew install imagemagick"
    exit 1
  fi
  # Prefer the modern 'magick' binary (v7), fall back to 'convert' (v6)
  if command -v magick &>/dev/null; then
    MAGICK="magick"
  else
    MAGICK="convert"
  fi
}

# ── argument parsing ──────────────────────────────────────────────────────────
[[ $# -lt 1 ]] && usage

INPUT=""
OUTPUT=""
PADDING=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --padding|-p)
      PADDING="$2"
      shift 2
      ;;
    --help|-h)
      usage
      ;;
    *)
      if [[ -z "$INPUT" ]]; then
        INPUT="$1"
      elif [[ -z "$OUTPUT" ]]; then
        OUTPUT="$1"
      else
        echo "Unexpected argument: $1"
        usage
      fi
      shift
      ;;
  esac
done

# ── validation ────────────────────────────────────────────────────────────────
[[ -z "$INPUT" ]] && usage

if [[ ! -f "$INPUT" ]]; then
  echo "Error: file not found — $INPUT"
  exit 1
fi

if [[ -z "$OUTPUT" ]]; then
  base="${INPUT:r}"   # strip extension (zsh)
  OUTPUT="${base}_trimmed.png"
fi

check_imagemagick

# ── trim ──────────────────────────────────────────────────────────────────────
echo "Trimming: $INPUT → $OUTPUT (padding: ${PADDING}px)"

if [[ "$PADDING" -gt 0 ]]; then
  # -trim removes transparent borders; -bordercolor none + -border adds padding
  $MAGICK "$INPUT" \
    -trim \
    -bordercolor none \
    -border "${PADDING}x${PADDING}" \
    +repage \
    "$OUTPUT"
else
  $MAGICK "$INPUT" \
    -trim \
    +repage \
    "$OUTPUT"
fi

# ── report ────────────────────────────────────────────────────────────────────
orig=$($MAGICK identify -format "%wx%h" "$INPUT")
new=$($MAGICK  identify -format "%wx%h" "$OUTPUT")

echo "Done!"
echo "  Original : $orig"
echo "  Trimmed  : $new"
echo "  Saved to : $OUTPUT"