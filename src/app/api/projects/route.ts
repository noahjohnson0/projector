import { NextResponse } from "next/server";
import { readdirSync, statSync } from "fs";
import path from "path";
import { getConfig } from "@/lib/config";
import { detectProjectType } from "@/lib/project-detector";
import { getDirectorySize } from "@/lib/dir-size";

const PROJECT_HUB_NAME = "project-hub";

export async function GET() {
  const config = getConfig();
  if (!config?.projectsPath) {
    return NextResponse.json({ projects: [], error: "No projects path configured" });
  }

  const projectsPath = path.resolve(config.projectsPath);
  let entries: string[] = [];
  try {
    entries = readdirSync(projectsPath, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => e.name);
  } catch (err) {
    return NextResponse.json({ projects: [], error: "Could not read projects folder" }, { status: 400 });
  }

  const projects = entries
    .filter((name) => name !== PROJECT_HUB_NAME)
    .map((name) => {
      const projectPath = path.join(projectsPath, name);
      try {
        if (!statSync(projectPath).isDirectory()) return null;
        const info = detectProjectType(projectPath);
        info.size = getDirectorySize(projectPath);
        return info;
      } catch {
        return null;
      }
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  return NextResponse.json({ projects });
}
