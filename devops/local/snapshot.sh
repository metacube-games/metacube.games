#!/bin/sh
# Save world state from the running state-server into world-data/worldData.bin.
# Run this before "docker compose down" to persist world changes.
# Usage: ./snapshot.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$SCRIPT_DIR/state/world-data"
curl -sf http://localhost/game/init -o "$SCRIPT_DIR/state/world-data/init.tmp"
tail -c +18 "$SCRIPT_DIR/state/world-data/init.tmp" > "$SCRIPT_DIR/state/world-data/worldData.bin"
rm "$SCRIPT_DIR/state/world-data/init.tmp"

echo "World state saved to state/world-data/worldData.bin"
