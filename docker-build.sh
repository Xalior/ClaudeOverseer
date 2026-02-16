#!/bin/bash
set -e

echo "🐳 Building ClaudeOverseer using Docker..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

RELEASE_DIR="$(pwd)/release"
mkdir -p "$RELEASE_DIR"

docker build -t claudeoverseer-builder:latest .

echo ""
docker run --rm \
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
echo -e "${GREEN}✅ Build complete!${NC}"
echo ""
echo "Artifacts in release/:"
ls -lh "$RELEASE_DIR/" | grep -E '\.(dmg|zip|AppImage|deb|exe)$' || echo "  No final artifacts found"
echo ""
echo "Total artifacts:"
find "$RELEASE_DIR" -type f \( -name "*.dmg" -o -name "*.zip" -o -name "*.AppImage" -o -name "*.deb" -o -name "*.exe" \) | wc -l | xargs echo "  "
