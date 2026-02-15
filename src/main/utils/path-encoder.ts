/**
 * Path Encoder Utility
 *
 * Claude Code stores projects in ~/.claude/projects/ with directory names
 * that are the project path with slashes replaced by dashes.
 *
 * Example:
 *   /Volumes/McFiver/u/GIT/MyProject
 *   → -Volumes-McFiver-u-GIT-MyProject
 */

/**
 * Encode a file system path to Claude's directory naming format
 */
export function encodePath(path: string): string {
  // Remove leading slash and replace all slashes with dashes
  return path.replace(/\//g, '-')
}

/**
 * Decode a Claude directory name back to a file system path
 */
export function decodePath(encoded: string): string {
  // Replace dashes with slashes
  // Handle the leading dash which represents root /
  if (encoded.startsWith('-')) {
    return '/' + encoded.substring(1).replace(/-/g, '/')
  }
  return encoded.replace(/-/g, '/')
}

/**
 * Extract project name from path (last component)
 */
export function getProjectName(path: string): string {
  const parts = path.split('/').filter(Boolean)
  return parts[parts.length - 1] || 'Unknown'
}
