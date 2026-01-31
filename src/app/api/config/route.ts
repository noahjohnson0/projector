import { NextResponse } from "next/server";
import path from "path";
import { getConfig, saveConfig } from "@/lib/config";

export async function GET() {
  const config = getConfig();
  const suggestedPath = path.dirname(process.cwd());
  return NextResponse.json({
    projectsPath: config?.projectsPath ?? "",
    suggestedPath,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { projectsPath } = body;
  if (typeof projectsPath !== "string" || !projectsPath.trim()) {
    return NextResponse.json({ error: "projectsPath is required" }, { status: 400 });
  }
  saveConfig({ projectsPath: projectsPath.trim() });
  return NextResponse.json({ success: true });
}
