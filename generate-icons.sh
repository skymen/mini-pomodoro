#!/usr/bin/env bash
set -euo pipefail

# Generate all app icon variants from the source PNG.
# Requires: ImageMagick (magick) and optionally iconutil (macOS) for .icns.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$SCRIPT_DIR/build/Mini Pomodoro.png"
BUILD="$SCRIPT_DIR/build"
ICONS="$BUILD/icons"

if [ ! -f "$SRC" ]; then
  echo "Error: source icon not found at $SRC" >&2
  exit 1
fi

if ! command -v magick &>/dev/null; then
  echo "Error: ImageMagick (magick) is required but not found." >&2
  echo "Install it: https://imagemagick.org/script/download.php" >&2
  exit 1
fi

echo "Source: $SRC"

# ── Linux PNGs ────────────────────────────────────────────────
echo "Generating Linux icon PNGs..."
mkdir -p "$ICONS"
for SIZE in 16 32 48 64 128 256 512; do
  magick "$SRC" -resize "${SIZE}x${SIZE}" "$ICONS/${SIZE}x${SIZE}.png"
  echo "  ${SIZE}x${SIZE}.png"
done

# ── Windows .ico ──────────────────────────────────────────────
echo "Generating Windows icon.ico..."
magick "$SRC" \
  \( -clone 0 -resize 16x16 \) \
  \( -clone 0 -resize 24x24 \) \
  \( -clone 0 -resize 32x32 \) \
  \( -clone 0 -resize 48x48 \) \
  \( -clone 0 -resize 64x64 \) \
  \( -clone 0 -resize 128x128 \) \
  \( -clone 0 -resize 256x256 \) \
  -delete 0 \
  "$BUILD/icon.ico"
echo "  icon.ico"

# ── macOS .icns ───────────────────────────────────────────────
if command -v iconutil &>/dev/null; then
  echo "Generating macOS icon.icns..."
  ICONSET=$(mktemp -d)/icon.iconset
  mkdir -p "$ICONSET"

  magick "$SRC" -resize 16x16     "$ICONSET/icon_16x16.png"
  magick "$SRC" -resize 32x32     "$ICONSET/icon_16x16@2x.png"
  magick "$SRC" -resize 32x32     "$ICONSET/icon_32x32.png"
  magick "$SRC" -resize 64x64     "$ICONSET/icon_32x32@2x.png"
  magick "$SRC" -resize 128x128   "$ICONSET/icon_128x128.png"
  magick "$SRC" -resize 256x256   "$ICONSET/icon_128x128@2x.png"
  magick "$SRC" -resize 256x256   "$ICONSET/icon_256x256.png"
  magick "$SRC" -resize 512x512   "$ICONSET/icon_256x256@2x.png"
  magick "$SRC" -resize 512x512   "$ICONSET/icon_512x512.png"
  magick "$SRC" -resize 1024x1024 "$ICONSET/icon_512x512@2x.png"

  iconutil -c icns "$ICONSET" -o "$BUILD/icon.icns"
  rm -rf "$(dirname "$ICONSET")"
  echo "  icon.icns"
else
  echo "Skipping icon.icns (iconutil not available, macOS only)"
fi

echo "Done."
