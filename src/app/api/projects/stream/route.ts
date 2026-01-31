import { readdirSync, statSync } from "fs";
import path from "path";
import { getConfig } from "@/lib/config";
import { detectProjectType } from "@/lib/project-detector";
import { getDirectorySize } from "@/lib/dir-size";

const PROJECT_HUB_NAME = "project-hub";

function sendSSE(controller: ReadableStreamDefaultController<Uint8Array>, event: string, data: unknown) {
  controller.enqueue(new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
}

export async function GET() {
  const config = getConfig();
  if (!config?.projectsPath) {
    return new Response(JSON.stringify({ projects: [], error: "No projects path configured" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const projectsPath = path.resolve(config.projectsPath);
  let entries: string[] = [];
  try {
    entries = readdirSync(projectsPath, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => e.name)
      .filter((name) => name !== PROJECT_HUB_NAME);
  } catch {
    return new Response(
      JSON.stringify({ projects: [], error: "Could not read projects folder" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const projects: Awaited<ReturnType<typeof detectProjectType>>[] = [];

      // Phase 1: quick scan — detect type only, emit each project so tiles show immediately
      for (const name of entries) {
        const projectPath = path.join(projectsPath, name);
        try {
          if (!statSync(projectPath).isDirectory()) continue;
          const info = detectProjectType(projectPath);
          projects.push(info);
          sendSSE(controller, "project", info);
        } catch {
          // skip failed entries
        }
      }

      // Phase 2: populate sizes in parallel — emit each as soon as it's ready
      sendSSE(controller, "scan_complete", { total: projects.length });
      await Promise.all(
        projects.map(async (project) => {
          const size = getDirectorySize(project.path);
          sendSSE(controller, "size", { path: project.path, size });
        })
      );

      sendSSE(controller, "done", {});
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
