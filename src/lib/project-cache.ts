import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import type { ProjectInfo } from "./project-detector";

const CACHE_FILE = ".projector-cache.json";

function getCachePath(): string {
  return path.join(process.cwd(), CACHE_FILE);
}

export function readCache(): ProjectInfo[] | null {
  const cachePath = getCachePath();
  if (!existsSync(cachePath)) return null;
  try {
    const content = readFileSync(cachePath, "utf-8");
    const data = JSON.parse(content);
    if (Array.isArray(data.projects)) return data.projects;
    return null;
  } catch {
    return null;
  }
}

export function writeCache(projects: ProjectInfo[]): void {
  const cachePath = getCachePath();
  writeFileSync(cachePath, JSON.stringify({ projects, cachedAt: Date.now() }, null, 2), "utf-8");
}
