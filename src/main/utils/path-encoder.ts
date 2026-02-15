/**
 * Encode a filesystem path to Claude's dash-encoded format
 * Example: /Volumes/McFiver/u/GIT/MyProject -> -Volumes-McFiver-u-GIT-MyProject
 *
 * Note: This encoding is lossy - dashes in directory names become indistinguishable
 * from path separators. Claude's own implementation has this same limitation.
 */
export function encodePath(path: string): string {
  // Replace all slashes with dashes (including leading slash)
  return path.replace(/\//g, '-')
}

/**
 * Decode Claude's dash-encoded format back to a filesystem path
 * Example: -Volumes-McFiver-u-GIT-MyProject -> /Volumes/McFiver/u/GIT/MyProject
 *
 * Note: This is lossy - original dashes in directory names will become slashes.
 * For example, "my-project" encoded as "-my-project" decodes to "/my/project".
 * This matches Claude's own behavior.
 */
export function decodePath(encoded: string): string {
  // Replace all dashes with slashes
  return encoded.replace(/-/g, '/')
}
