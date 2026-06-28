#!/bin/bash

cd "$(dirname "$0")"

# Check if docker is installed
if ! command -v docker &> /dev/null; then
  echo "Error: docker is not installed"
  exit 1
fi

# Check that certificates exist
certificates_dir="certificates"
if [ ! -f "$certificates_dir/localhost.pem" ] || [ ! -f "$certificates_dir/localhost-key.pem" ]; then
  echo "Error: Both localhost.pem and localhost-key.pem are expected under $certificates_dir/"
  echo "Generate them with mkcert: mkcert -key-file certificates/localhost-key.pem -cert-file certificates/localhost.pem localhost"
  exit 1
fi

# Build the shared server-view-state base image used by game-server, view-server, state-server
echo "Building server-view-state base image..."
docker build -t server-view-state ../../game/server-view-state/
if [ $? -ne 0 ]; then
  echo "Error: Failed to build server-view-state image"
  exit 1
fi

# Build all other service images
echo "Building service images..."
docker compose build
if [ $? -ne 0 ]; then
  echo "Error: Failed to build service images"
  exit 1
fi

echo ""
echo "Setup complete. Start the local environment with:"
echo "  docker compose up -d"
echo ""
echo "Stop it with:"
echo "  docker compose down"
