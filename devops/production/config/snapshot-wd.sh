#!/bin/bash
# Download the current world state from the running state-server and
# save it as worldData.bin. Run before stopping the game cluster.

set -e

cd /home/metacube/world-data

rm -f init
wget -q https://play.metacube.games/game/init
tail -c +18 init > worldData.bin
rm -f init

echo "World data snapshot saved to /home/metacube/world-data/worldData.bin"
