"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Play, Square, ExternalLink, Copy, Terminal, HardDrive, ScrollText, Star, FolderOpen } from "lucide-react";
import type { ProjectInfo } from "@/lib/project-detector";
import type { GitHubRepoInfo } from "@/lib/github";
import { formatSize } from "@/lib/utils";

const TYPE_COLORS: Record<string, string> = {
  nextjs: "bg-black text-white dark:bg-white dark:text-black",
  react: "bg-cyan-600 text-white",
  vite: "bg-violet-600 text-white",
  vue: "bg-emerald-600 text-white",
  node: "bg-green-600 text-white",
  "chrome-extension": "bg-amber-500 text-slate-900",
  python: "bg-yellow-500 text-slate-900",
  rust: "bg-orange-600 text-white",
  go: "bg-sky-500 text-white",
  xcode: "bg-blue-600 text-white",
  unknown: "bg-muted text-muted-foreground",
};

const TYPE_LABELS: Record<string, string> = {
  nextjs: "Next.js",
  react: "React",
  vite: "Vite",
  vue: "Vue",
  node: "Node",
  "chrome-extension": "Chrome Extension",
  python: "Python",
  rust: "Rust",
  go: "Go",
  xcode: "Xcode",
  unknown: "Unknown",
};

export function ProjectCard({
  project,
  repoMetadata,
  isRunning,
  runningPort,
  onStart,
  onStop,
  onRefresh,
  onOpenFiles,
  onOpenLogs,
}: {
  project: ProjectInfo;
  repoMetadata?: GitHubRepoInfo | null;
  isRunning: boolean;
  runningPort?: number;
  onStart: () => Promise<void>;
  onStop: () => Promise<void>;
  onRefresh: () => void;
  onOpenFiles?: (project: ProjectInfo) => void;
  onOpenLogs?: (project: ProjectInfo) => void;
}) {
  const [loading, setLoading] = useState(false);
  const typeColor = TYPE_COLORS[project.type] ?? TYPE_COLORS.unknown;
  const typeLabel = TYPE_LABELS[project.type] ?? project.type;
  const thumbnailUrl = project.hasThumbnail
    ? `/api/thumbnail?project=${encodeURIComponent(project.name)}`
    : null;

  const handleToggleServer = async () => {
    setLoading(true);
    try {
      if (isRunning) {
        await onStop();
      } else {
        await onStart();
      }
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const projectUrl = runningPort ? `http://localhost:${runningPort}` : null;
  const githubUrl = repoMetadata?.url ?? project.github?.url;

  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg hover:border-primary/20">
      <button
        type="button"
        className="w-full text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-t-lg"
        onClick={() => onOpenFiles?.(project)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold truncate">{project.name}</span>
            <Badge className={`shrink-0 text-xs ${typeColor}`}>{typeLabel}</Badge>
          </div>
          {project.type === "xcode" && project.xcodeTargets && project.xcodeTargets.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {project.xcodeTargets.slice(0, 3).map((target) => (
                <span
                  key={target}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                >
                  {target}
                </span>
              ))}
              {project.xcodeTargets.length > 3 && (
                <span className="text-[10px] text-muted-foreground">
                  +{project.xcodeTargets.length - 3}
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <HardDrive className="h-3.5 w-3.5 shrink-0" />
            <span>{project.size != null ? formatSize(project.size) : "Calculating…"}</span>
          </div>
          {repoMetadata && (repoMetadata.stars > 0 || repoMetadata.description) && (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground mt-1.5">
              {repoMetadata.stars > 0 && (
                <span className="inline-flex items-center gap-0.5 shrink-0">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {repoMetadata.stars}
                </span>
              )}
              {repoMetadata.description && (
                <span className="line-clamp-2 min-w-0">{repoMetadata.description}</span>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="aspect-video bg-muted relative overflow-hidden">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={project.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${typeColor}`}>
                  <Terminal className="w-8 h-8" />
                </div>
              </div>
            )}
            {isRunning && (
              <div className="absolute top-2 right-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              </div>
            )}
          </div>
        </CardContent>
      </button>
      <CardFooter className="flex gap-2 pt-3">
        {project.devCommand && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={isRunning ? "destructive" : "default"}
                  onClick={handleToggleServer}
                  disabled={loading}
                >
                  {isRunning ? (
                    <Square className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isRunning ? "Stop server" : "Start server"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {projectUrl && isRunning && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" asChild>
                  <a href={projectUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open localhost:{runningPort}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {isRunning && onOpenLogs && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenLogs(project);
                  }}
                >
                  <ScrollText className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View server logs</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {githubUrl && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" asChild>
                  <a
                    href={githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open on GitHub</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  fetch("/api/projects/open-in-finder", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ path: project.path }),
                  });
                }}
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open in Finder</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(project.path);
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy path</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardFooter>
    </Card>
  );
}
