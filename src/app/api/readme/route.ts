import { readFileSync } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";

const README_NAMES = ["README.md", "readme.md", "Readme.md", "README.MD", "README"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectName = searchParams.get("project");

  if (!projectName || projectName.includes("..") || projectName.includes("/") || projectName.includes("\\")) {
    return NextResponse.json({ error: "Invalid project" }, { status: 400 });
  }

  const config = getConfig();
  if (!config?.projectsPath) {
    return NextResponse.json({ error: "Not configured" }, { status: 400 });
  }

  const projectsPath = path.resolve(config.projectsPath);
  const projectDir = path.join(projectsPath, projectName);
  const resolved = path.resolve(projectDir);
  if (!resolved.startsWith(projectsPath)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  for (const name of README_NAMES) {
    try {
      const content = readFileSync(path.join(projectDir, name), "utf-8");
      return NextResponse.json({ content, filename: name });
    } catch {
      // try next
    }
  }

  return NextResponse.json({ content: null, filename: null });
}
