import { readdirSync, statSync } from "fs";
import path from "path";
import { getConfig } from "@/lib/config";
import { detectProjectType } from "@/lib/project-detector";
import { getDirectorySize } from "@/lib/dir-size";
import { getGitHubRemote } from "@/lib/github";
import { readCache, writeCache } from "@/lib/project-cache";

const PROJECT_HUB_NAME = "project-hub";
const PROJECTOR_NAME = "projector";

function sendSSE(controller: ReadableStreamDefaultController<Uint8Array>, event: string, data: unknown) {
  controller.enqueue(new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get("refresh") === "true";

  const config = getConfig();
  if (!config?.projectsPath) {
    return new Response(JSON.stringify({ projects: [], error: "No projects path configured" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Serve from cache on normal page loads (no refresh param)
  if (!forceRefresh) {
    const cached = readCache();
    if (cached && cached.length > 0) {
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          for (const project of cached) {
            sendSSE(controller, "project", project);
          }
          sendSSE(controller, "scan_complete", { total: cached.length });
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
  }

  // Full scan: either first run or explicit refresh
  const projectsPath = path.resolve(config.projectsPath);
  let entries: string[] = [];
  try {
    entries = readdirSync(projectsPath, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => e.name)
      .filter((name) => name !== PROJECT_HUB_NAME && name !== PROJECTOR_NAME);
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
      const total = entries.length;
      for (let i = 0; i < total; i++) {
        const name = entries[i];
        const projectPath = path.join(projectsPath, name);
        try {
          if (!statSync(projectPath).isDirectory()) continue;
          sendSSE(controller, "progress", { currentProject: name, index: i, total });
          const info = detectProjectType(projectPath);
          const remote = getGitHubRemote(projectPath);
          if (remote) {
            info.github = { owner: remote.owner, repo: remote.repo, url: remote.url, gitUrl: remote.gitUrl };
          }
          projects.push(info);
          sendSSE(controller, "project", info);
        } catch {
          // skip failed entries
        }
        // Yield so SSE events flush to the client incrementally
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      // Phase 2: populate sizes in parallel — emit each as soon as it's ready
      sendSSE(controller, "scan_complete", { total: projects.length });
      await Promise.all(
        projects.map(async (project) => {
          const size = getDirectorySize(project.path);
          project.size = size;
          sendSSE(controller, "size", { path: project.path, size });
        })
      );

      // Cache results for next page load
      writeCache(projects);

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
