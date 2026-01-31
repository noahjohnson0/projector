import { spawn, ChildProcess } from "child_process";
import path from "path";

const PORT_RANGE_START = 3000;
const PORT_RANGE_END = 3099;
const RESERVED_PORTS = new Set([4000]); // project-hub

export interface RunningServer {
  projectPath: string;
  projectName: string;
  pid: number;
  port: number;
  startTime: number;
}

const runningServers = new Map<string, RunningServer>();
const serverLogs = new Map<string, string[]>();
const MAX_LOG_LINES = 2000;
const lineBufferByKey = new Map<string, { stdout: string; stderr: string }>();

function appendLog(key: string, stream: "stdout" | "stderr", chunk: Buffer | string): void {
  const text = typeof chunk === "string" ? chunk : chunk.toString("utf-8");
  let logs = serverLogs.get(key);
  if (!logs) {
    logs = [];
    serverLogs.set(key, logs);
  }
  const buf = lineBufferByKey.get(key) ?? { stdout: "", stderr: "" };
  if (!lineBufferByKey.has(key)) lineBufferByKey.set(key, buf);
  const current = stream === "stdout" ? buf.stdout : buf.stderr;
  const combined = current + text;
  const lines = combined.split(/\r?\n/);
  const remainder = lines.pop() ?? "";
  if (stream === "stdout") buf.stdout = remainder;
  else buf.stderr = remainder;
  const prefix = stream === "stderr" ? "[stderr] " : "";
  for (const line of lines) {
    logs.push(prefix + line);
    if (logs.length > MAX_LOG_LINES) logs.shift();
  }
}

function getNextAvailablePort(): number {
  const usedPorts = new Set([
    ...RESERVED_PORTS,
    ...Array.from(runningServers.values()).map((s) => s.port),
  ]);
  for (let p = PORT_RANGE_START; p <= PORT_RANGE_END; p++) {
    if (!usedPorts.has(p)) return p;
  }
  throw new Error("No available ports in range 3000-3099");
}

export function startServer(projectPath: string, projectName: string, devCommand: string = "npm run dev"): Promise<{ success: boolean; port?: number; error?: string }> {
  const key = path.resolve(projectPath);
  if (runningServers.has(key)) {
    return Promise.resolve({ success: false, error: "Server already running" });
  }

  const port = getNextAvailablePort();

  return new Promise((resolve) => {
    const [cmd, ...args] = devCommand.split(/\s+/);
    const proc: ChildProcess = spawn(cmd, args.length ? args : ["run", "dev"], {
      cwd: projectPath,
      stdio: "pipe",
      shell: true,
      detached: true,
      env: {
        ...process.env,
        PORT: String(port),
      },
    });

    proc.stdout?.on("data", (chunk) => appendLog(key, "stdout", chunk));
    proc.stderr?.on("data", (chunk) => appendLog(key, "stderr", chunk));

    proc.on("error", (err) => {
      runningServers.delete(key);
      serverLogs.delete(key);
      lineBufferByKey.delete(key);
      resolve({ success: false, error: err.message });
    });

    proc.on("spawn", () => {
      runningServers.set(key, {
        projectPath: key,
        projectName,
        pid: proc.pid ?? 0,
        port,
        startTime: Date.now(),
      });
      resolve({ success: true, port });
    });

    proc.unref();
  });
}

export function stopServer(projectPath: string): boolean {
  const key = path.resolve(projectPath);
  const server = runningServers.get(key);
  if (!server) return false;

  try {
    process.kill(server.pid, "SIGTERM");
  } catch {
    try {
      process.kill(server.pid, "SIGKILL");
    } catch {
      // Process may already be dead
    }
  }
  runningServers.delete(key);
  serverLogs.delete(key);
  lineBufferByKey.delete(key);
  return true;
}

export function getLogs(projectPath: string): string[] {
  const key = path.resolve(projectPath);
  const logs = serverLogs.get(key);
  return logs ? [...logs] : [];
}

export function getRunningServers(): RunningServer[] {
  return Array.from(runningServers.values());
}

export function isServerRunning(projectPath: string): boolean {
  return runningServers.has(path.resolve(projectPath));
}
