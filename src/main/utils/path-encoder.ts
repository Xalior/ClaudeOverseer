import { stat } from 'fs/promises'

/**
 * Encode a filesystem path to Claude's dash-encoded format
 * Example: /Volumes/McFiver/u/GIT/MyProject -> -Volumes-McFiver-u-GIT-MyProject
 *
 * Note: This encoding is lossy - dashes in directory names become indistinguishable
 * from path separators. Claude's own implementation has this same limitation.
 */
export function encodePath(path: string): string {
  return path.replace(/\//g, '-')
}

/**
 * Decode Claude's dash-encoded format back to a filesystem path (naive/lossy).
 * Example: -Volumes-McFiver-u-GIT-MyProject -> /Volumes/McFiver/u/GIT/MyProject
 */
export function decodePath(encoded: string): string {
  return encoded.replace(/-/g, '/')
}

/**
 * Resolve an encoded project directory name back to a real filesystem path
 * by walking the filesystem and testing which dash positions are actual
 * path separators vs literal dashes in directory names.
 *
 * Returns { path, verified } where verified=true means the path was confirmed
 * to exist on disk. If no valid path is found, falls back to naive decode.
 */
export async function resolveEncodedPath(
  encoded: string
): Promise<{ path: string; verified: boolean }> {
  // The encoded string starts with a dash (representing the leading /)
  // Split into segments by dash
  // e.g. "-Volumes-McFiver-u-GIT-my-project" -> ['', 'Volumes', 'McFiver', 'u', 'GIT', 'my', 'project']
  const parts = encoded.split('-')

  // First part is always empty (leading dash = leading /)
  if (parts.length < 2 || parts[0] !== '') {
    return { path: decodePath(encoded), verified: false }
  }

  // We need to reconstruct the path. At each dash position, the dash could be
  // a path separator (/) or a literal dash (-) in a directory/file name.
  // We walk the filesystem to determine which.
  const segments = parts.slice(1) // remove the leading empty string

  const results: string[] = []
  await walkSegments('/', segments, 0, results)

  if (results.length === 1) {
    return { path: results[0], verified: true }
  } else if (results.length > 1) {
    // Multiple valid paths - pick the shortest (fewest segments = most dashes preserved)
    results.sort((a, b) => a.split('/').length - b.split('/').length)
    return { path: results[0], verified: true }
  }

  // No valid path found on disk, fall back to naive decode
  return { path: decodePath(encoded), verified: false }
}

// Characters that Claude encodes as dashes (besides /, which becomes a path separator)
const ALT_JOINERS = ['-', '.', ' ']

/**
 * Recursively try combining remaining segments with various separators,
 * checking the filesystem at each step.
 *
 * Claude encodes /, ., and spaces all as dashes, so when reconstructing
 * we need to try all possibilities.
 */
async function walkSegments(
  currentPath: string,
  segments: string[],
  startIdx: number,
  results: string[]
): Promise<void> {
  if (startIdx >= segments.length) {
    if (await pathExists(currentPath)) {
      results.push(currentPath)
    }
    return
  }

  if (results.length > 0) return

  // Try consuming 1, 2, 3... segments as a single directory/file name
  // joined by various separators (-, ., space)
  const maxGroupSize = Math.min(segments.length - startIdx, 6)

  for (let groupSize = 1; groupSize <= maxGroupSize; groupSize++) {
    // Generate all possible names by combining segments with different joiners
    const nameVariants = groupSize === 1
      ? [segments[startIdx]]
      : generateJoinVariants(segments, startIdx, groupSize)

    const nextIdx = startIdx + groupSize

    for (const dirName of nameVariants) {
      const candidatePath = currentPath === '/' ? `/${dirName}` : `${currentPath}/${dirName}`

      if (nextIdx >= segments.length) {
        if (await pathExists(candidatePath)) {
          results.push(candidatePath)
          return
        }
      } else {
        if (await isDirectory(candidatePath)) {
          await walkSegments(candidatePath, segments, nextIdx, results)
          if (results.length > 0) return
        }
      }
    }
  }
}

/**
 * Generate all possible ways to join a slice of segments using the alt joiners.
 * For 2 segments [a, b] -> ["a-b", "a.b", "a b"]
 * For 3 segments [a, b, c] -> all combinations of joiners between each pair
 */
function generateJoinVariants(
  segments: string[],
  start: number,
  count: number
): string[] {
  if (count === 1) return [segments[start]]

  const results: string[] = []
  const joinerSlots = count - 1

  // Total combinations = ALT_JOINERS.length ^ joinerSlots
  const total = Math.pow(ALT_JOINERS.length, joinerSlots)

  for (let combo = 0; combo < total; combo++) {
    let name = segments[start]
    let c = combo
    for (let slot = 0; slot < joinerSlots; slot++) {
      const joinerIdx = c % ALT_JOINERS.length
      c = Math.floor(c / ALT_JOINERS.length)
      name += ALT_JOINERS[joinerIdx] + segments[start + 1 + slot]
    }
    results.push(name)
  }

  return results
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

async function isDirectory(p: string): Promise<boolean> {
  try {
    const s = await stat(p)
    return s.isDirectory()
  } catch {
    return false
  }
}
