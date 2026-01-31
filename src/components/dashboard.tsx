"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Square, RotateCw, ExternalLink, RefreshCw, Activity, ScrollText } from "lucide-react";
import { ServerLogsDialog } from "./server-logs-dialog";

export type RunningServerInfo = {
  projectPath: string;
  projectName: string;
  pid: number;
  port: number;
  startTime: number;
};

function formatUptime(startTime: number): string {
  const sec = Math.floor((Date.now() - startTime) / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  if (min < 60) return s ? `${min}m ${s}s` : `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function Dashboard() {
  const [servers, setServers] = useState<RunningServerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [logsDialogServer, setLogsDialogServer] = useState<{ projectPath: string; projectName: string } | null>(null);

  const fetchServers = useCallback(async () => {
    const res = await fetch("/api/servers");
    const data = await res.json();
    setServers(data.servers ?? []);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchServers().finally(() => setLoading(false));
  }, [fetchServers]);

  const handleStop = async (projectPath: string) => {
    setActioning(projectPath);
    try {
      await fetch("/api/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop", projectPath }),
      });
      await fetchServers();
    } finally {
      setActioning(null);
    }
  };

  const handleRestart = async (projectPath: string) => {
    setActioning(projectPath);
    try {
      await fetch("/api/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restart", projectPath }),
      });
      await fetchServers();
    } finally {
      setActioning(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (servers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-[40vh] text-center px-4">
        <Activity className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-medium">No running projects</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Start a project from the Projects tab to see it here. You can then view its port, process info, and restart or stop it from this dashboard.
        </p>
        <Button variant="outline" size="sm" onClick={() => fetchServers()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-medium">Running projects</h2>
        <Button variant="outline" size="sm" onClick={() => fetchServers()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {servers.map((server) => {
          const isActioning = actioning === server.projectPath;
          const url = `http://localhost:${server.port}`;
          return (
            <Card key={server.projectPath} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="font-semibold truncate">{server.projectName}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Port</dt>
                  <dd className="font-mono">{server.port}</dd>
                  <dt className="text-muted-foreground">PID</dt>
                  <dd className="font-mono">{server.pid}</dd>
                  <dt className="text-muted-foreground">Uptime</dt>
                  <dd>
                    <Uptime startTime={server.startTime} />
                  </dd>
                  <dt className="text-muted-foreground">Path</dt>
                  <dd className="font-mono text-xs truncate" title={server.projectPath}>
                    {server.projectPath}
                  </dd>
                </dl>
                <div className="flex flex-wrap gap-2 pt-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                        >
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Open localhost:{server.port}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLogsDialogServer({ projectPath: server.projectPath, projectName: server.projectName })}
                        >
                          <ScrollText className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>View server logs</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestart(server.projectPath)}
                          disabled={isActioning}
                        >
                          <RotateCw className={`h-4 w-4 ${isActioning ? "animate-spin" : ""}`} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Restart server</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleStop(server.projectPath)}
                          disabled={isActioning}
                        >
                          <Square className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Stop server</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <ServerLogsDialog
        projectPath={logsDialogServer?.projectPath ?? ""}
        projectName={logsDialogServer?.projectName ?? ""}
        open={logsDialogServer != null}
        onOpenChange={(open) => !open && setLogsDialogServer(null)}
      />
    </div>
  );
}

function Uptime({ startTime }: { startTime: number }) {
  const [uptime, setUptime] = useState(() => formatUptime(startTime));
  useEffect(() => {
    const t = setInterval(() => setUptime(formatUptime(startTime)), 1000);
    return () => clearInterval(t);
  }, [startTime]);
  return <span>{uptime}</span>;
}
