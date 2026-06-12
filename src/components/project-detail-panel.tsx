"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HardDrive,
  Star,
  GitFork,
  ExternalLink,
  FolderOpen,
  Copy,
  FileText,
  Terminal,
} from "lucide-react";
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
  "chrome-extension": "Chrome Ext",
  python: "Python",
  rust: "Rust",
  go: "Go",
  xcode: "Xcode",
  unknown: "Unknown",
};

export function ProjectDetailPanel({
  project,
  repoMetadata,
  open,
  onOpenChange,
}: {
  project: ProjectInfo | null;
  repoMetadata?: GitHubRepoInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [readme, setReadme] = useState<string | null>(null);
  const [loadingReadme, setLoadingReadme] = useState(false);

  useEffect(() => {
    if (!project || !open) {
      setReadme(null);
      return;
    }
    setLoadingReadme(true);
    fetch(`/api/readme?project=${encodeURIComponent(project.name)}`)
      .then((r) => r.json())
      .then((data) => setReadme(data.content ?? null))
      .catch(() => setReadme(null))
      .finally(() => setLoadingReadme(false));
  }, [project, open]);

  if (!project) return null;

  const typeColor = TYPE_COLORS[project.type] ?? TYPE_COLORS.unknown;
  const typeLabel = TYPE_LABELS[project.type] ?? project.type;
  const githubUrl = repoMetadata?.url ?? project.github?.url;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-4 px-6 pt-8 pb-4 border-b">
          <div className="flex items-center gap-3">
            <SheetTitle className="text-xl">{project.name}</SheetTitle>
            <Badge className={`shrink-0 text-xs ${typeColor}`}>{typeLabel}</Badge>
          </div>

          {repoMetadata?.description && (
            <p className="text-sm text-muted-foreground">{repoMetadata.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {project.size != null && (
              <span className="inline-flex items-center gap-1">
                <HardDrive className="h-3.5 w-3.5" />
                {formatSize(project.size)}
              </span>
            )}
            {repoMetadata && repoMetadata.stars > 0 && (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-current" />
                {repoMetadata.stars}
              </span>
            )}
            {repoMetadata && repoMetadata.forks > 0 && (
              <span className="inline-flex items-center gap-1">
                <GitFork className="h-3.5 w-3.5" />
                {repoMetadata.forks}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {githubUrl && (
              <Button size="sm" variant="outline" asChild>
                <a href={githubUrl} target="_blank" rel="noopener noreferrer">
                  <svg className="h-4 w-4 mr-1.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  GitHub
                </a>
              </Button>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    fetch("/api/projects/open-in-finder", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ path: project.path }),
                    });
                  }}
                >
                  <FolderOpen className="h-4 w-4 mr-1.5" />
                  Finder
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open in Finder</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(project.path)}
                >
                  <Copy className="h-4 w-4 mr-1.5" />
                  Path
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy path to clipboard</TooltipContent>
            </Tooltip>
          </div>
        </SheetHeader>

        <div className="px-6 pt-6 pb-8">
          {loadingReadme ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4 animate-pulse" />
              Loading README…
            </div>
          ) : readme ? (
            <article className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{readme}</ReactMarkdown>
            </article>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
              <Terminal className="h-8 w-8" />
              <p className="text-sm">No README found</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
