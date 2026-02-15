#!/bin/bash
# Docker-based multi-platform build script for ClaudeOverseer
# Idempotent - no side effects outside of release/ directory

set -e

echo "🐳 Building ClaudeOverseer using Docker..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create temporary release directory
RELEASE_DIR="$(pwd)/release"
mkdir -p "$RELEASE_DIR"

echo -e "${BLUE}Building Docker image...${NC}"
# Build the Docker image (idempotent - uses cache)
docker build -t claudeoverseer-builder:latest . 2>&1 | grep -v "^#" || true

echo ""
echo -e "${BLUE}Running build in isolated container...${NC}"
echo -e "${YELLOW}Note: All build happens inside container - no local files modified${NC}"
echo ""

# Run build in container - ONLY mount release/ for output
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
    echo '📦 Packaging for all platforms...'
    pnpm run dist:docker
    echo '🧹 Cleaning intermediate files...'
    pnpm run clean:extra
    echo '📤 Copying artifacts to output...'
    cp -v release/* /output/ 2>/dev/null || echo 'No artifacts to copy'
  "

echo ""
echo -e "${GREEN}✅ Build complete!${NC}"
echo ""
echo "Artifacts in release/:"
ls -lh "$RELEASE_DIR/" 2>/dev/null | grep -E '\.(dmg|zip|AppImage|deb|exe)$' || echo "  No final artifacts found"
echo ""
echo "Total artifacts:"
find "$RELEASE_DIR" -type f \( -name "*.dmg" -o -name "*.zip" -o -name "*.AppImage" -o -name "*.deb" -o -name "*.exe" \) | wc -l | xargs echo "  "
