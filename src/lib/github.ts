import { readFileSync, existsSync } from "fs";
import path from "path";
import { Octokit } from "octokit";

export interface GitHubRemote {
  owner: string;
  repo: string;
  /** e.g. https://github.com/owner/repo */
  url: string;
  /** Full git URL (ssh or https) */
  gitUrl: string;
}

export interface GitHubRepoInfo {
  owner: string;
  repo: string;
  url: string;
  description: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  defaultBranch: string;
  lastPushed: string | null;
  language: string | null;
  isPrivate: boolean;
  homepage: string | null;
}

/** Parse .git/config to extract GitHub origin remote. */
export function getGitHubRemote(projectPath: string): GitHubRemote | null {
  const gitConfigPath = path.join(projectPath, ".git", "config");
  if (!existsSync(gitConfigPath)) return null;

  try {
    const content = readFileSync(gitConfigPath, "utf-8");
    const url = extractOriginUrl(content);
    if (!url) return null;

    const parsed = parseGitHubUrl(url);
    if (!parsed) return null;

    return {
      owner: parsed.owner,
      repo: parsed.repo,
      url: `https://github.com/${parsed.owner}/${parsed.repo}`,
      gitUrl: url,
    };
  } catch {
    return null;
  }
}

function extractOriginUrl(configContent: string): string | null {
  let inOrigin = false;
  for (const line of configContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("[remote ")) {
      const match = trimmed.match(/\[remote\s+"([^"]+)"\]/);
      inOrigin = match?.[1] === "origin";
    } else if (inOrigin && trimmed.startsWith("url =")) {
      return trimmed.slice(5).trim();
    }
  }
  return null;
}

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  // git@github.com:owner/repo.git or git@github.com:owner/repo
  const sshMatch = url.match(/git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }
  // https://github.com/owner/repo or https://github.com/owner/repo.git
  const httpsMatch = url.match(/https?:\/\/github\.com\/([^/]+)\/([^/?#]+?)(?:\.git)?\/?(?:\?|#|$)/);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }
  return null;
}

let octokit: Octokit | null = null;

function getOctokit(): Octokit | null {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;
  if (!octokit) {
    octokit = new Octokit({ auth: token });
  }
  return octokit;
}

/** Fetch repo metadata from GitHub API. Returns null if no token or API error. */
export async function getRepoInfo(owner: string, repo: string): Promise<GitHubRepoInfo | null> {
  const ok = getOctokit();
  if (!ok) return null;

  try {
    const { data } = await ok.rest.repos.get({ owner, repo });
    return {
      owner: data.owner.login,
      repo: data.name,
      url: data.html_url ?? `https://github.com/${owner}/${repo}`,
      description: data.description ?? null,
      stars: data.stargazers_count ?? 0,
      forks: data.forks_count ?? 0,
      openIssues: data.open_issues_count ?? 0,
      defaultBranch: data.default_branch ?? "main",
      lastPushed: data.pushed_at ?? null,
      language: data.language ?? null,
      isPrivate: data.private ?? false,
      homepage: data.homepage ?? null,
    };
  } catch {
    return null;
  }
}

/** Batch fetch multiple repos. Returns a map of "owner/repo" -> GitHubRepoInfo. */
export async function getReposBatch(
  repos: { owner: string; repo: string }[]
): Promise<Record<string, GitHubRepoInfo>> {
  const ok = getOctokit();
  if (!ok || repos.length === 0) return {};

  const key = (o: string, r: string) => `${o}/${r}`;
  const results: Record<string, GitHubRepoInfo> = {};

  await Promise.all(
    repos.map(async ({ owner, repo }) => {
      const info = await getRepoInfo(owner, repo);
      if (info) {
        results[key(owner, repo)] = info;
      }
    })
  );

  return results;
}

/** Build a GitHub blob URL for a file at a given path in a repo. */
export function getFileBlobUrl(
  remote: GitHubRemote,
  filePath: string,
  branch: string = "main"
): string {
  return `https://github.com/${remote.owner}/${remote.repo}/blob/${branch}/${filePath}`;
}
