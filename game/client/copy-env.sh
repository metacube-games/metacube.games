#!/bin/bash

# Paths
ENV_DIR="/env/"
DEST_DIR="./src/envData"

# Create destination directory if it does not exist
mkdir -p "$DEST_DIR"

# Copy achievements.json
cp -f "$ENV_DIR/achievements.json" "$DEST_DIR/"

# Copy upgrades.json
cp -f "$ENV_DIR/upgrades.json" "$DEST_DIR/"

# Copy voxelData.json
cp -f "$ENV_DIR/voxelData.json" "$DEST_DIR/"

# Copy env
cp -f "$ENV_DIR/.env" .

echo "Files copied successfully!"