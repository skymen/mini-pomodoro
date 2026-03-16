#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <major|minor|patch|X.Y.Z>"
  echo ""
  echo "Examples:"
  echo "  $0 patch        # 1.0.0 -> 1.0.1"
  echo "  $0 minor        # 1.0.0 -> 1.1.0"
  echo "  $0 major        # 1.0.0 -> 2.0.0"
  echo "  $0 2.3.1        # set exact version"
  exit 1
}

[[ $# -eq 1 ]] || usage

INPUT="$1"
CURRENT=$(node -p "require('./package.json').version")

# Determine new version
if [[ "$INPUT" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  NEW="$INPUT"
elif [[ "$INPUT" =~ ^(major|minor|patch)$ ]]; then
  IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
  case "$INPUT" in
    major) NEW="$((MAJOR + 1)).0.0" ;;
    minor) NEW="$MAJOR.$((MINOR + 1)).0" ;;
    patch) NEW="$MAJOR.$MINOR.$((PATCH + 1))" ;;
  esac
else
  usage
fi

if [[ "$NEW" == "$CURRENT" ]]; then
  echo "Version is already $CURRENT, nothing to do."
  exit 1
fi

echo "Bumping version: $CURRENT -> $NEW"

# Update package.json version
npm version "$NEW" --no-git-tag-version --allow-same-version

# Update README download links with new version
if [[ -f README.md ]]; then
  sed -i.bak "s/$CURRENT/$NEW/g" README.md
  rm -f README.md.bak
  echo "Updated README.md download links"
fi

# Commit, tag, and push
git add package.json package-lock.json README.md
git commit -m "release v$NEW"
git tag "v$NEW"
git push && git push --tags

echo ""
echo "Released v$NEW"
echo "GitHub Actions will now build and create the release."
