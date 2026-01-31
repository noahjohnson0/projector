import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { getThumbnailPath } from "@/lib/project-detector";
import path from "path";
import { readFileSync, existsSync } from "fs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectName = searchParams.get("project");
  if (!projectName || projectName.includes("..") || projectName.includes("/")) {
    return new NextResponse("Invalid project", { status: 400 });
  }

  const config = getConfig();
  if (!config?.projectsPath) {
    return new NextResponse("Not configured", { status: 400 });
  }

  const projectPath = path.join(path.resolve(config.projectsPath), projectName);
  if (!existsSync(projectPath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const thumbnailPath = getThumbnailPath(projectPath);
  if (!thumbnailPath) {
    return new NextResponse("No thumbnail", { status: 404 });
  }

  try {
    const buffer = readFileSync(thumbnailPath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Error reading thumbnail", { status: 500 });
  }
}
