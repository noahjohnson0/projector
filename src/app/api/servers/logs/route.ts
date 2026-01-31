import { NextResponse } from "next/server";
import { getLogs } from "@/lib/server-manager";
import path from "path";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectPath = searchParams.get("projectPath");

  if (!projectPath || typeof projectPath !== "string") {
    return NextResponse.json({ error: "projectPath is required" }, { status: 400 });
  }

  const resolvedPath = path.resolve(projectPath);
  const logs = getLogs(resolvedPath);
  return NextResponse.json({ logs });
}
