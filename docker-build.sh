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
    echo '🔨 Building app...'
    pnpm run build
    echo ''
    echo '📦 Packaging for all platforms...'
    pnpm run dist:docker
    echo ''
    echo '🧹 Cleaning intermediate files...'
    pnpm run clean:extra
    echo ''
    echo '📤 Copying artifacts...'
    cp -v release/* /output/ 2>/dev/null || true
  "

echo ""
echo "Artifacts:"
ls -lh "$RELEASE_DIR/" | grep -E '\.(dmg|zip|AppImage|deb|exe)$'
