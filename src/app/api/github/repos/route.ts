import { NextResponse } from "next/server";
import { getReposBatch } from "@/lib/github";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const repos = body.repos as { owner: string; repo: string }[] | undefined;
    if (!Array.isArray(repos) || repos.length === 0) {
      return NextResponse.json({ repos: {} }, { status: 200 });
    }

    const validRepos = repos.filter(
      (r): r is { owner: string; repo: string } =>
        r && typeof r.owner === "string" && typeof r.repo === "string"
    );

    const results = await getReposBatch(validRepos);
    return NextResponse.json({ repos: results });
  } catch {
    return NextResponse.json({ repos: {} }, { status: 500 });
  }
}
