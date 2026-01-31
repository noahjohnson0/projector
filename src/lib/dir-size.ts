import { readdirSync, statSync } from "fs";
import path from "path";

/**
 * Returns total size in bytes of a directory (recursive). Follows symlinks for files
 * but does not recurse into symlinked directories to avoid cycles.
 */
export function getDirectorySize(dirPath: string): number {
  let total = 0;
  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      try {
        const stat = statSync(fullPath, { throwIfNoEntry: false });
        if (!stat) continue;
        if (stat.isFile()) {
          total += stat.size;
        } else if (stat.isDirectory() && !entry.isSymbolicLink()) {
          total += getDirectorySize(fullPath);
        } else if (stat.isSymbolicLink()) {
          const linkStat = statSync(fullPath, { throwIfNoEntry: false });
          if (linkStat?.isFile()) total += linkStat.size;
        }
      } catch {
        // skip inaccessible entries
      }
    }
  } catch {
    return 0;
  }
  return total;
}
