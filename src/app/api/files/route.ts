import { readdirSync, statSync } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";

export interface FileEntry {
  name: string;
  type: "file" | "directory";
  size?: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectName = searchParams.get("project");
  const subpath = searchParams.get("subpath") ?? "";

  if (!projectName || projectName.includes("..") || projectName.includes("/") || projectName.includes("\\")) {
    return NextResponse.json({ error: "Invalid project" }, { status: 400 });
  }
  if (subpath.includes("..")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const config = getConfig();
  if (!config?.projectsPath) {
    return NextResponse.json({ error: "Not configured" }, { status: 400 });
  }

  const projectsPath = path.resolve(config.projectsPath);
  const requestedPath = subpath
    ? path.join(projectsPath, projectName, subpath)
    : path.join(projectsPath, projectName);

  const resolvedPath = path.resolve(requestedPath);
  if (!resolvedPath.startsWith(projectsPath)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const stat = statSync(resolvedPath);
    if (!stat.isDirectory()) {
      return NextResponse.json({ error: "Not a directory" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let entries: FileEntry[] = [];
  try {
    const names = readdirSync(resolvedPath, { withFileTypes: true });
    entries = names
      .filter((e) => !e.name.startsWith("."))
      .map((e) => {
        const entry: FileEntry = { name: e.name, type: e.isDirectory() ? "directory" : "file" };
        if (e.isFile()) {
          try {
            const fullPath = path.join(resolvedPath, e.name);
            entry.size = statSync(fullPath).size;
          } catch {
            // skip size on error
          }
        }
        return entry;
      })
      .sort((a, b) => {
        // directories first, then by name
        if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      });
  } catch {
    return NextResponse.json({ error: "Could not read directory" }, { status: 500 });
  }

  return NextResponse.json({ entries, path: subpath || projectName });
}
