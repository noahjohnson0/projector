import { readFileSync, existsSync, readdirSync } from "fs";
import path from "path";

export type ProjectType =
  | "nextjs"
  | "react"
  | "vite"
  | "vue"
  | "node"
  | "chrome-extension"
  | "python"
  | "rust"
  | "go"
  | "xcode"
  | "unknown";

export interface ProjectInfo {
  name: string;
  path: string;
  type: ProjectType;
  packageName?: string;
  port?: number;
  devCommand?: string;
  hasThumbnail: boolean;
  /** Xcode: project bundle path (.xcodeproj or .xcworkspace) if different from path. */
  xcodeProjectPath?: string;
  /** Xcode: build target names from the project. */
  xcodeTargets?: string[];
  /** Total size of project directory in bytes (optional, set by API). */
  size?: number;
}

const THUMBNAIL_FILES = ["thumbnail.png", "screenshot.png", "preview.png"];

function readJsonSafe<T>(filePath: string): T | null {
  try {
    const content = readFileSync(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

function hasFile(dir: string, files: string[]): boolean {
  return files.some((f) => existsSync(path.join(dir, f)));
}

function getDevPort(pkg: { scripts?: Record<string, string> }): number | undefined {
  const devScript = pkg.scripts?.dev || pkg.scripts?.start;
  if (!devScript) return undefined;
  const portMatch = devScript.match(/(?:--port|-p)\s+(\d+)/);
  if (portMatch) return parseInt(portMatch[1], 10);
  // Next.js default
  if (devScript.includes("next")) return 3000;
  // Vite default
  if (devScript.includes("vite")) return 5173;
  return undefined;
}

/** Parse project.pbxproj for PBXNativeTarget name values. */
function getXcodeTargetsFromPbxproj(pbxprojPath: string): string[] {
  try {
    const content = readFileSync(pbxprojPath, "utf-8");
    const targets: string[] = [];
    // Match blocks that are PBXNativeTarget and capture their name = "…"; or name = …;
    const nativeTargetRegex = /isa\s*=\s*PBXNativeTarget;[\s\S]*?name\s*=\s*([^;]+);/g;
    let m: RegExpExecArray | null;
    while ((m = nativeTargetRegex.exec(content)) !== null) {
      const name = m[1].trim().replace(/^["']|["']$/g, "");
      if (name && !targets.includes(name)) targets.push(name);
    }
    return targets;
  } catch {
    return [];
  }
}

/** Resolve .xcodeproj or .xcworkspace from a directory (or path that is already a bundle). */
function findXcodeBundle(projectPath: string): { bundlePath: string; pbxprojPath: string | null } | null {
  const baseName = path.basename(projectPath);
  if (baseName.endsWith(".xcodeproj")) {
    const pbxprojPath = path.join(projectPath, "project.pbxproj");
    return { bundlePath: projectPath, pbxprojPath: existsSync(pbxprojPath) ? pbxprojPath : null };
  }
  if (baseName.endsWith(".xcworkspace")) {
    const contentsPath = path.join(projectPath, "contents.xcworkspacedata");
    if (existsSync(contentsPath)) {
      try {
        const content = readFileSync(contentsPath, "utf-8");
        const refMatch = content.match(/location\s*=\s*["']?(?:group:)?([^"'>\s]+\.xcodeproj)/);
        if (refMatch) {
          const xcodeprojName = refMatch[1].replace(/^group:/, "").trim();
          const parentDir = path.dirname(projectPath);
          const pbxprojPath = path.join(parentDir, xcodeprojName, "project.pbxproj");
          if (existsSync(pbxprojPath)) return { bundlePath: projectPath, pbxprojPath };
        }
      } catch {
        // ignore
      }
    }
    return { bundlePath: projectPath, pbxprojPath: null };
  }
  try {
    const entries = readdirSync(projectPath, { withFileTypes: true });
    const xcodeproj = entries.find((e) => e.isDirectory() && e.name.endsWith(".xcodeproj"));
    if (xcodeproj) {
      const bundlePath = path.join(projectPath, xcodeproj.name);
      const pbxprojPath = path.join(bundlePath, "project.pbxproj");
      return { bundlePath, pbxprojPath: existsSync(pbxprojPath) ? pbxprojPath : null };
    }
    const xcworkspace = entries.find((e) => e.isDirectory() && e.name.endsWith(".xcworkspace"));
    if (xcworkspace) {
      const bundlePath = path.join(projectPath, xcworkspace.name);
      return { bundlePath, pbxprojPath: null };
    }
  } catch {
    // ignore
  }
  return null;
}

function detectXcodeProject(projectPath: string, name: string, hasThumbnail: boolean): ProjectInfo | null {
  const found = findXcodeBundle(projectPath);
  if (!found) return null;
  const { bundlePath, pbxprojPath } = found;
  const xcodeTargets = pbxprojPath ? getXcodeTargetsFromPbxproj(pbxprojPath) : [];
  const displayName = path.basename(bundlePath, path.extname(bundlePath));
  return {
    name,
    path: projectPath,
    type: "xcode",
    hasThumbnail: hasThumbnail,
    xcodeProjectPath: bundlePath !== projectPath ? bundlePath : undefined,
    xcodeTargets: xcodeTargets.length > 0 ? xcodeTargets : undefined,
  };
}

export function detectProjectType(projectPath: string): ProjectInfo {
  const name = path.basename(projectPath);
  const pkgPath = path.join(projectPath, "package.json");
  const pkg = readJsonSafe<{ name?: string; dependencies?: Record<string, string>; devDependencies?: Record<string, string>; scripts?: Record<string, string> }>(pkgPath);

  const hasThumbnail = hasFile(projectPath, THUMBNAIL_FILES);
  const thumbnailFile = THUMBNAIL_FILES.find((f) => existsSync(path.join(projectPath, f)));

  const manifestPath = path.join(projectPath, "manifest.json");
  const manifest = readJsonSafe<{ manifest_version?: number }>(manifestPath);
  if (manifest && (manifest.manifest_version === 2 || manifest.manifest_version === 3)) {
    return {
      name,
      path: projectPath,
      type: "chrome-extension",
      packageName: pkg?.name,
      devCommand: pkg?.scripts?.dev || pkg?.scripts?.build ? "npm run dev" : undefined,
      hasThumbnail: !!thumbnailFile,
    };
  }

  if (pkg) {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const port = getDevPort(pkg);
    const devScript = pkg.scripts?.dev || pkg.scripts?.start;

    if (deps.next || existsSync(path.join(projectPath, "next.config.js")) || existsSync(path.join(projectPath, "next.config.ts")) || existsSync(path.join(projectPath, "next.config.mjs"))) {
      return {
        name,
        path: projectPath,
        type: "nextjs",
        packageName: pkg.name,
        port: port ?? 3000,
        devCommand: devScript || "npm run dev",
        hasThumbnail: !!thumbnailFile,
      };
    }
    if (deps["react-scripts"]) {
      return { name, path: projectPath, type: "react", packageName: pkg.name, port: port ?? 3000, devCommand: devScript || "npm start", hasThumbnail: !!thumbnailFile };
    }
    if (deps.vite || deps["@vitejs/plugin-react"]) {
      return { name, path: projectPath, type: "vite", packageName: pkg.name, port: port ?? 5173, devCommand: devScript || "npm run dev", hasThumbnail: !!thumbnailFile };
    }
    if (deps.vue || deps["@vitejs/plugin-vue"]) {
      return { name, path: projectPath, type: "vue", packageName: pkg.name, port: port ?? 5173, devCommand: devScript || "npm run dev", hasThumbnail: !!thumbnailFile };
    }
    return { name, path: projectPath, type: "node", packageName: pkg.name, port, devCommand: devScript, hasThumbnail: !!thumbnailFile };
  }

  const xcodeInfo = detectXcodeProject(projectPath, name, !!thumbnailFile);
  if (xcodeInfo) return xcodeInfo;

  if (existsSync(path.join(projectPath, "requirements.txt")) || existsSync(path.join(projectPath, "pyproject.toml"))) {
    return { name, path: projectPath, type: "python", hasThumbnail: !!thumbnailFile };
  }
  if (existsSync(path.join(projectPath, "Cargo.toml"))) {
    return { name, path: projectPath, type: "rust", hasThumbnail: !!thumbnailFile };
  }
  if (existsSync(path.join(projectPath, "go.mod"))) {
    return { name, path: projectPath, type: "go", hasThumbnail: !!thumbnailFile };
  }

  return { name, path: projectPath, type: "unknown", hasThumbnail: !!thumbnailFile };
}

export function getThumbnailPath(projectPath: string): string | null {
  for (const f of THUMBNAIL_FILES) {
    const fullPath = path.join(projectPath, f);
    if (existsSync(fullPath)) return fullPath;
  }
  return null;
}
