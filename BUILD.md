# Build Guide

## Directory Structure

After running builds, the directory structure will be:

```
release/
├── mac/                          # Unpacked macOS app (intermediate)
├── mac-arm64/                    # Unpacked macOS ARM64 app (intermediate)
├── linux-unpacked/               # Unpacked Linux app (intermediate)
├── linux-arm64-unpacked/         # Unpacked Linux ARM64 app (intermediate)
├── win-unpacked/                 # Unpacked Windows app (intermediate)
├── win-arm64-unpacked/           # Unpacked Windows ARM64 app (intermediate)
│
├── ClaudeOverseer-0.1.0-mac-x64.dmg          # ✅ Final distributable
├── ClaudeOverseer-0.1.0-mac-x64.zip          # ✅ Final distributable
├── ClaudeOverseer-0.1.0-mac-arm64.dmg        # ✅ Final distributable
├── ClaudeOverseer-0.1.0-mac-arm64.zip        # ✅ Final distributable
├── ClaudeOverseer-0.1.0-linux-x64.AppImage   # ✅ Final distributable
├── claudeoverseer_0.1.0_amd64.deb            # ✅ Final distributable
├── ClaudeOverseer-0.1.0-linux-arm64.AppImage # ✅ Final distributable
├── claudeoverseer_0.1.0_arm64.deb            # ✅ Final distributable
├── ClaudeOverseer-0.1.0-win-x64.exe          # ✅ Final distributable
├── ClaudeOverseer-0.1.0-win-x64.zip          # ✅ Final distributable
├── ClaudeOverseer-0.1.0-win-arm64.exe        # ✅ Final distributable
└── ClaudeOverseer-0.1.0-win-arm64.zip        # ✅ Final distributable
```

## Final Distributable Files

The files you want to distribute are the **final distributable** files listed above:

- **12 files total** (4 per platform)
- Extensions: `.dmg`, `.zip`, `.AppImage`, `.deb`, `.exe`
- Named with pattern: `ClaudeOverseer-{version}-{platform}-{arch}.{ext}`

## Intermediate Files

The `*-unpacked/` directories are intermediate build artifacts:

- Used by electron-builder during the build process
- Contain the full app structure before packaging
- Can be safely deleted after build (they'll be recreated on next build)
- Useful for debugging packaging issues

## Cleaning Up

To clean all build artifacts:

```bash
pnpm run clean
```

This removes both `release/` and `out/` directories.

## Build Commands

### Docker Build (Recommended - All Platforms)

Build for all platforms using Docker (no platform-specific requirements):

```bash
# Build for Linux, Windows, and macOS using Docker
pnpm run docker:build

# Or run the script directly
./docker-build.sh
```

This will create all 12 artifacts (4 per platform) in the `release/` directory.

**Requirements:**
- Docker installed and running
- ~2GB disk space for Docker image
- ~10-15 minutes for first build (caching makes subsequent builds faster)

### Native Platform Builds

Build on your current platform (faster, but platform-specific):

```bash
# Clean previous builds
pnpm run clean

# Build for specific platform (creates both x64 and arm64)
pnpm run dist:mac     # macOS: 4 files (requires macOS)
pnpm run dist:linux   # Linux: 4 files (requires Linux)
pnpm run dist:win     # Windows: 4 files (requires Windows)

# Build for all platforms (only works on current platform)
pnpm run dist:all     # Attempts all platforms (may fail on cross-platform)
```

## Uploading to GitHub Releases

When creating a release, upload only the **final distributable** files (12 files):

```bash
# Example using gh CLI
gh release upload v0.1.0 release/*.dmg
gh release upload v0.1.0 release/*.zip
gh release upload v0.1.0 release/*.AppImage
gh release upload v0.1.0 release/*.deb
gh release upload v0.1.0 release/*.exe
```

Or use a glob pattern to upload all at once (excluding unpacked directories):

```bash
gh release upload v0.1.0 \
  release/*.dmg \
  release/*.zip \
  release/*.AppImage \
  release/*.deb \
  release/*.exe
```
