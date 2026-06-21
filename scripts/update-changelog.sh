#!/bin/bash
# Auto-update CHANGELOG.md from conventional commits
# Run after each feature/fix commit to keep changelog in sync

set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
CHANGELOG="$REPO_ROOT/CHANGELOG.md"

# Get the latest version tag or default to 0.1.0
LATEST_TAG=$(git tag --sort=-v:refname | head -1)
VERSION=${LATEST_TAG:-"0.1.0"}

echo "Updating CHANGELOG.md from commits since: ${LATEST_TAG:-beginning}"

# Extract new features and fixes since last tag
FEATURES=$(git log ${LATEST_TAG:+$LATEST_TAG..HEAD} --pretty=format:"- %s" --grep="^feat:" 2>/dev/null | sort -u)
FIXES=$(git log ${LATEST_TAG:+$LATEST_TAG..HEAD} --pretty=format:"- %s" --grep="^fix:" 2>/dev/null | sort -u)
OTHER=$(git log ${LATEST_TAG:+$LATEST_TAG..HEAD} --pretty=format:"- %s" --grep="^\(chore\|docs\|refactor\|style\|test\):" 2>/dev/null | sort -u)

# Build new entries
NEW_ENTRIES=""
if [ -n "$FEATURES" ]; then
  NEW_ENTRIES+="### Added\n$FEATURES\n\n"
fi
if [ -n "$FIXES" ]; then
  NEW_ENTRIES+="### Fixed\n$FIXES\n\n"
fi
if [ -n "$OTHER" ]; then
  NEW_ENTRIES+="### Changed\n$OTHER\n\n"
fi

if [ -z "$NEW_ENTRIES" ]; then
  echo "No conventional commits found. Skipping update."
  exit 0
fi

# Check if today's section already exists
TODAY=$(date +%Y-%m-%d)
if grep -q "## \[.*\] — $TODAY" "$CHANGELOG"; then
  echo "Today's section already exists. Manual merge may be needed."
  exit 0
fi

echo ""
echo "--- New entries to add ---"
echo -e "$NEW_ENTRIES"
echo "--------------------------"
echo ""
echo "Run this script with --write to apply changes to CHANGELOG.md"
echo "Or manually copy the entries above into the CHANGELOG."

if [ "${1:-}" = "--write" ]; then
  # Insert new entries after the first version header
  TEMP_FILE=$(mktemp)
  awk -v entries="$NEW_ENTRIES" '
    /^## \[/ && !done {
      print "## [Unreleased] — '"$TODAY"'" ORS ""
      print entries
      done=1
    }
    { print }
  ' "$CHANGELOG" > "$TEMP_FILE"
  mv "$TEMP_FILE" "$CHANGELOG"
  echo "CHANGELOG.md updated."
fi
