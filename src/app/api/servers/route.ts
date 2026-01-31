import { NextResponse } from "next/server";
import { startServer, stopServer, getRunningServers } from "@/lib/server-manager";
import { detectProjectType } from "@/lib/project-detector";
import path from "path";

export async function GET() {
  const servers = getRunningServers();
  return NextResponse.json({ servers });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { action, projectPath } = body;

  if (!projectPath || typeof projectPath !== "string") {
    return NextResponse.json({ error: "projectPath is required" }, { status: 400 });
  }

  const resolvedPath = path.resolve(projectPath);

  if (action === "start") {
    const info = detectProjectType(resolvedPath);
    const devCommand = info.devCommand || "npm run dev";
    const result = await startServer(resolvedPath, info.name, devCommand);
    if (result.success) {
      return NextResponse.json({ success: true, port: result.port });
    }
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }

  if (action === "stop") {
    const stopped = stopServer(resolvedPath);
    return NextResponse.json({ success: stopped });
  }

  if (action === "restart") {
    stopServer(resolvedPath);
    const info = detectProjectType(resolvedPath);
    const devCommand = info.devCommand || "npm run dev";
    const result = await startServer(resolvedPath, info.name, devCommand);
    if (result.success) {
      return NextResponse.json({ success: true, port: result.port });
    }
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
