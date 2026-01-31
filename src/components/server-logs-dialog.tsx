"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const POLL_INTERVAL_MS = 1500;

export function ServerLogsDialog({
  projectPath,
  projectName,
  open,
  onOpenChange,
}: {
  projectPath: string;
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (!open || !projectPath) return;

    const fetchLogs = async () => {
      try {
        const res = await fetch(
          `/api/servers/logs?projectPath=${encodeURIComponent(projectPath)}`
        );
        const data = await res.json();
        setLogs(Array.isArray(data.logs) ? data.logs : []);
      } catch {
        setLogs(["[Failed to load logs]"]);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    fetchLogs();
    const interval = setInterval(fetchLogs, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [open, projectPath]);

  useEffect(() => {
    if (!open || !preRef.current) return;
    preRef.current.scrollTop = preRef.current.scrollHeight;
  }, [open, logs]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Server logs — {projectName}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 rounded-md border bg-muted/30 overflow-hidden">
          {loading && logs.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              Waiting for output…
            </div>
          ) : (
            <pre
              ref={preRef}
              className="p-4 h-full overflow-auto text-xs font-mono whitespace-pre-wrap break-words text-foreground"
            >
              {logs.length === 0
                ? "No output yet."
                : logs.map((line, i) => (
                    <span
                      key={i}
                      className={line.startsWith("[stderr]") ? "text-destructive" : ""}
                    >
                      {line}
                      {"\n"}
                    </span>
                  ))}
            </pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
