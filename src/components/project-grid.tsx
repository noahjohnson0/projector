"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ProjectCard } from "./project-card";
import { SettingsDialog } from "./settings-dialog";
import { FileBrowserDialog } from "./file-browser-dialog";
import { ServerLogsDialog } from "./server-logs-dialog";
import { ProjectDetailPanel } from "./project-detail-panel";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw } from "lucide-react";
import type { ProjectInfo } from "@/lib/project-detector";
import type { GitHubRepoInfo } from "@/lib/github";

export type { GitHubRepoInfo };

type LoadProgress = {
  currentProject: string;
  index: number;
  total: number;
};

export type SortOption =
  | "name-asc"
  | "name-desc"
  | "size-desc"
  | "size-asc"
  | "type-asc"
  | "type-desc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
  { value: "size-desc", label: "Size (largest first)" },
  { value: "size-asc", label: "Size (smallest first)" },
  { value: "type-asc", label: "Type A–Z" },
  { value: "type-desc", label: "Type Z–A" },
];

function sortProjects(projects: ProjectInfo[], sortBy: SortOption): ProjectInfo[] {
  const list = [...projects];
  switch (sortBy) {
    case "name-asc":
      return list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    case "name-desc":
      return list.sort((a, b) => b.name.localeCompare(a.name, undefined, { sensitivity: "base" }));
    case "size-desc":
      return list.sort((a, b) => (b.size ?? 0) - (a.size ?? 0));
    case "size-asc":
      return list.sort((a, b) => (a.size ?? 0) - (b.size ?? 0));
    case "type-asc":
      return list.sort((a, b) =>
        a.type.localeCompare(b.type, undefined, { sensitivity: "base" }) ||
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      );
    case "type-desc":
      return list.sort((a, b) =>
        b.type.localeCompare(a.type, undefined, { sensitivity: "base" }) ||
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      );
    default:
      return list;
  }
}

export function ProjectGrid() {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [runningServers, setRunningServers] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState<LoadProgress | null>(null);
  const [configured, setConfigured] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [fileBrowserProject, setFileBrowserProject] = useState<ProjectInfo | null>(null);
  const [detailProject, setDetailProject] = useState<ProjectInfo | null>(null);
  const [logsDialogProject, setLogsDialogProject] = useState<{ path: string; name: string } | null>(null);
  const [repoMetadata, setRepoMetadata] = useState<Record<string, GitHubRepoInfo>>({});
  const sortedProjects = useMemo(() => sortProjects(projects, sortBy), [projects, sortBy]);

  const githubReposKey = useMemo(
    () =>
      projects
        .filter((p) => p.github)
        .map((p) => `${p.github!.owner}/${p.github!.repo}`)
        .sort()
        .join(","),
    [projects]
  );

  useEffect(() => {
    if (loading || !githubReposKey) return;
    const repos = githubReposKey
      .split(",")
      .filter(Boolean)
      .map((s) => {
        const [owner, repo] = s.split("/");
        return { owner: owner!, repo: repo! };
      });
    if (repos.length === 0) return;
    fetch("/api/github/repos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repos }),
    })
      .then((r) => r.json())
      .then((data) => setRepoMetadata(data.repos ?? {}))
      .catch(() => {});
  }, [loading, githubReposKey]);

  const fetchProjects = useCallback(async (refresh = false) => {
    setLoadProgress(null);
    setProjects([]);
    setRepoMetadata({});
    const res = await fetch(`/api/projects/stream${refresh ? "?refresh=true" : ""}`);
    if (!res.ok || !res.body) {
      setProjects([]);
      setConfigured(false);
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let currentEvent: string | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("event:")) {
          currentEvent = line.slice(6).trim();
        } else if (line.startsWith("data:") && currentEvent) {
          try {
            const data = JSON.parse(line.slice(5).trim());
            if (currentEvent === "project") {
              setProjects((prev) => [...prev, data]);
              setConfigured(true);
            } else if (currentEvent === "progress") {
              setLoadProgress({
                currentProject: data.currentProject ?? "…",
                index: data.index ?? 0,
                total: data.total ?? 0,
              });
            } else if (currentEvent === "scan_complete") {
              setLoading(false);
              setLoadProgress(
                (data.total ?? 0) > 0
                  ? { currentProject: "Calculating sizes…", index: 0, total: data.total ?? 0 }
                  : null
              );
            } else if (currentEvent === "size" && data.path != null) {
              setProjects((prev) =>
                prev.map((p) => (p.path === data.path ? { ...p, size: data.size } : p))
              );
              setLoadProgress((prev) =>
                prev && prev.total > 0
                  ? { ...prev, index: prev.index + 1 }
                  : null
              );
            } else if (currentEvent === "done") {
              setConfigured(true);
              setLoadProgress(null);
            }
          } catch {
            // ignore parse errors
          }
          currentEvent = null;
        }
      }
    }
    setLoadProgress(null);
  }, []);

  const fetchServers = useCallback(async () => {
    const res = await fetch("/api/servers");
    const data = await res.json();
    const map = new Map<string, number>();
    for (const s of data.servers ?? []) {
      if (s.projectPath && s.port) map.set(s.projectPath, s.port);
    }
    setRunningServers(map);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    fetchServers().catch(() => {}); // Run in background, don't block
    await fetchProjects(true); // Force rescan on explicit refresh
    setLoading(false);
  }, [fetchProjects, fetchServers]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      fetchServers().catch(() => {}); // Run in background, don't block
      await fetchProjects(); // Stream drives loading state via scan_complete
      setLoading(false);
    };
    load();
  }, [fetchProjects, fetchServers]);

  const handleStart = async (project: ProjectInfo) => {
    await fetch("/api/servers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", projectPath: project.path }),
    });
    await fetchServers();
  };

  const handleStop = async (project: ProjectInfo) => {
    await fetch("/api/servers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stop", projectPath: project.path }),
    });
    await fetchServers();
  };

  // Full-page loading only when we have no tiles yet
  if (loading && projects.length === 0) {
    const progressPercent = loadProgress && loadProgress.total > 0
      ? Math.round((loadProgress.index / loadProgress.total) * 100)
      : 0;
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 px-4">
        <div className="w-full max-w-md space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {loadProgress
              ? `${loading ? "Scanning" : "Calculating size"}: ${loadProgress.currentProject} (${loadProgress.index}/${loadProgress.total})`
              : "Scanning projects…"}
          </p>
          <Progress value={progressPercent} className="h-2" />
        </div>
        {!loadProgress && (
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        )}
      </div>
    );
  }

  if (!configured || projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 min-h-[50vh] text-center px-4">
        <h2 className="text-2xl font-semibold">
          {configured ? "No projects found" : "Configure your projects folder"}
        </h2>
        <p className="text-muted-foreground max-w-md">
          {configured
            ? "Add project folders to your configured directory, or check that the path is correct."
            : "Click the settings icon to set the folder where your projects live. projector will scan for Next.js, React, Vite, Vue, Node, Python, Rust, and Go projects."}
        </p>
        <div className="flex gap-2">
          <SettingsDialog onSave={refresh} />
          <Button onClick={refresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {loadProgress && loadProgress.total > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
          <span>
            {loading ? "Scanning" : "Calculating sizes"}: {loadProgress.currentProject} ({loadProgress.index}/{loadProgress.total})
          </span>
          <Progress
            value={loadProgress.total ? Math.round((loadProgress.index / loadProgress.total) * 100) : 0}
            className="h-1.5 w-24"
          />
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-medium">Your Projects</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[180px]" size="sm">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SettingsDialog onSave={refresh} />
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sortedProjects.map((project) => (
          <ProjectCard
            key={project.path}
            project={project}
            repoMetadata={
              project.github
                ? repoMetadata[`${project.github.owner}/${project.github.repo}`]
                : undefined
            }
            isRunning={runningServers.has(project.path)}
            runningPort={runningServers.get(project.path)}
            onStart={() => handleStart(project)}
            onStop={() => handleStop(project)}
            onRefresh={fetchServers}
            onOpenFiles={setDetailProject}
            onOpenLogs={(p) => setLogsDialogProject({ path: p.path, name: p.name })}
          />
        ))}
      </div>
      <ProjectDetailPanel
        project={detailProject}
        repoMetadata={
          detailProject?.github
            ? repoMetadata[`${detailProject.github.owner}/${detailProject.github.repo}`]
            : undefined
        }
        open={detailProject != null}
        onOpenChange={(open) => !open && setDetailProject(null)}
      />
      <FileBrowserDialog
        project={fileBrowserProject}
        open={fileBrowserProject != null}
        onOpenChange={(open) => !open && setFileBrowserProject(null)}
      />
      <ServerLogsDialog
        projectPath={logsDialogProject?.path ?? ""}
        projectName={logsDialogProject?.name ?? ""}
        open={logsDialogProject != null}
        onOpenChange={(open) => !open && setLogsDialogProject(null)}
      />
    </div>
  );
}
