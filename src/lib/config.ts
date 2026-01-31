import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";

const CONFIG_FILE = ".project-hub-config.json";

export interface Config {
  projectsPath: string;
}

function getConfigPath(): string {
  return path.join(process.cwd(), CONFIG_FILE);
}

export function getConfig(): Config | null {
  const configPath = getConfigPath();
  if (!existsSync(configPath)) return null;
  try {
    const content = readFileSync(configPath, "utf-8");
    return JSON.parse(content) as Config;
  } catch {
    return null;
  }
}

export function saveConfig(config: Config): void {
  const configPath = getConfigPath();
  writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
}
