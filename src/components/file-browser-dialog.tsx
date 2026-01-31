"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FolderOpen, File, ChevronRight, ArrowUp } from "lucide-react";
import type { ProjectInfo } from "@/lib/project-detector";
import { formatSize } from "@/lib/utils";

interface FileEntry {
  name: string;
  type: "file" | "directory";
  size?: number;
}

export function FileBrowserDialog({
  project,
  open,
  onOpenChange,
}: {
  project: ProjectInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [subpath, setSubpath] = useState("");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ project: project.name });
      if (subpath) params.set("subpath", subpath);
      const res = await fetch(`/api/files?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to load");
        setEntries([]);
        return;
      }
      const data = await res.json();
      setEntries(data.entries ?? []);
    } catch {
      setError("Failed to load");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [project, subpath]);

  useEffect(() => {
    if (open && project) {
      setSubpath("");
    }
  }, [open, project]);

  useEffect(() => {
    if (open && project) {
      fetchEntries();
    }
  }, [open, project, subpath, fetchEntries]);

  const breadcrumbs = subpath ? [project?.name ?? "", ...subpath.split("/").filter(Boolean)] : [project?.name ?? ""];
  const goUp = () => {
    if (!subpath) return;
    const parts = subpath.split("/").filter(Boolean);
    parts.pop();
    setSubpath(parts.join("/"));
  };

  const openFolder = (name: string) => {
    setSubpath(subpath ? `${subpath}/${name}` : name);
  };

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">Files — {project.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2 min-h-0 flex-1">
          {breadcrumbs.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground shrink-0">
              {breadcrumbs.map((segment, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                  <span className="truncate max-w-[120px]" title={segment}>
                    {segment}
                  </span>
                </span>
              ))}
            </div>
          )}
          {subpath ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-fit -ml-2"
              onClick={goUp}
            >
              <ArrowUp className="h-4 w-4 mr-1" />
              Up
            </Button>
          ) : null}
          <div className="border rounded-md overflow-auto min-h-[200px] max-h-[50vh] bg-muted/30">
            {loading ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                Loading…
              </div>
            ) : error ? (
              <div className="p-6 text-center text-destructive text-sm">
                {error}
              </div>
            ) : entries.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                Empty folder
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {entries.map((entry) => (
                  <li key={entry.name}>
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/80 transition-colors"
                      onClick={() => entry.type === "directory" && openFolder(entry.name)}
                      disabled={entry.type === "file"}
                    >
                      {entry.type === "directory" ? (
                        <FolderOpen className="h-5 w-5 shrink-0 text-amber-500" />
                      ) : (
                        <File className="h-5 w-5 shrink-0 text-muted-foreground" />
                      )}
                      <span className="truncate flex-1 font-medium">
                        {entry.name}
                      </span>
                      {entry.type === "file" && entry.size != null && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatSize(entry.size)}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
