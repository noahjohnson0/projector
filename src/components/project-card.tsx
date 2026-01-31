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
import { Play, Square, ExternalLink, Copy, Terminal, HardDrive, ScrollText } from "lucide-react";
import type { ProjectInfo } from "@/lib/project-detector";
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
  isRunning,
  runningPort,
  onStart,
  onStop,
  onRefresh,
  onOpenFiles,
  onOpenLogs,
}: {
  project: ProjectInfo;
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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigator.clipboard.writeText(project.path)}
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
