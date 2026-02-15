#!/bin/bash
# Docker-based multi-platform build script for ClaudeOverseer

set -e

echo "🐳 Building ClaudeOverseer using Docker..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Clean previous builds
echo -e "${BLUE}Cleaning previous builds...${NC}"
rm -rf release out

# Create release directory
mkdir -p release

# Run Docker build
echo -e "${BLUE}Starting Docker container...${NC}"
docker run --rm -ti \
  --platform linux/amd64 \
  -v "$(pwd)":/project \
  -v "$(pwd)/release":/project/release \
  -w /project \
  electronuserland/builder:wine \
  /bin/bash -c "
    echo '📦 Installing pnpm...' && \
    npm install -g pnpm@9 && \
    echo '📥 Installing dependencies...' && \
    pnpm install --frozen-lockfile && \
    echo '🔨 Building app...' && \
    pnpm run build && \
    echo '📦 Building packages for all platforms...' && \
    pnpm run dist:docker && \
    echo '🧹 Cleaning up intermediate files...' && \
    pnpm run clean:extra
  "

echo ""
echo -e "${GREEN}✅ Build complete!${NC}"
echo ""
echo "Artifacts in release/:"
ls -lh release/ | grep -E '\.(dmg|zip|AppImage|deb|exe)$' || echo "  No final artifacts found"
echo ""
echo "Total artifacts:"
ls -1 release/*.{dmg,zip,AppImage,deb,exe} 2>/dev/null | wc -l | xargs echo "  "
