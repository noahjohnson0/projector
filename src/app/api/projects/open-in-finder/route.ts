import { spawn } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";

export async function POST(request: Request) {
  const config = getConfig();
  if (!config?.projectsPath) {
    return NextResponse.json({ error: "Not configured" }, { status: 400 });
  }

  let body: { path?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const requestedPath = body.path;
  if (typeof requestedPath !== "string" || !requestedPath.trim()) {
    return NextResponse.json({ error: "Path required" }, { status: 400 });
  }

  const projectsPath = path.resolve(config.projectsPath);
  const resolvedPath = path.resolve(requestedPath);

  if (!resolvedPath.startsWith(projectsPath)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  if (!existsSync(resolvedPath)) {
    return NextResponse.json({ error: "Path not found" }, { status: 404 });
  }

  const [cmd, args] =
    process.platform === "darwin"
      ? ["open", [resolvedPath]]
      : process.platform === "win32"
        ? ["explorer", [resolvedPath]]
        : ["xdg-open", [resolvedPath]];

  spawn(cmd, args, { detached: true }).unref();

  return NextResponse.json({ ok: true });
}
