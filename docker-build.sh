#!/bin/bash
set -e

RELEASE_DIR="$(pwd)/release"
mkdir -p "$RELEASE_DIR"

docker build -t claudeoverseer-builder:latest .

docker run --rm \
  --platform linux/amd64 \
  -v "$RELEASE_DIR":/output \
  -e CI=true \
  claudeoverseer-builder:latest \
  /bin/bash -c "
    set -e
    cd /project
    pnpm run build
    pnpm run dist:docker
    pnpm run clean:extra
    cp release/* /output/ 2>/dev/null || true
  "

echo ""
ls -lh "$RELEASE_DIR/" | grep -E '\.(dmg|zip|AppImage|deb|exe)$'
