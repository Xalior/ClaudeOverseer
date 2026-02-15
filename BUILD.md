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

```bash
# Clean previous builds
pnpm run clean

# Build for specific platform (creates both x64 and arm64)
pnpm run dist:mac     # macOS: 4 files
pnpm run dist:linux   # Linux: 4 files
pnpm run dist:win     # Windows: 4 files

# Build for all platforms
pnpm run dist         # All: 12 files
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
