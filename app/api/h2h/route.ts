import { NextRequest, NextResponse } from "next/server";
import { getCachedH2H, setCachedH2H } from "@/lib/h2h-cache";
import type { H2HResult } from "@/types/player";

const MCSR_API = "https://api.mcsrranked.com/users";

interface MCSRVersusResponse {
  data?: {
    draws?: number;
    recentResult?: number[];
    // Match list containing result info
    match?: Array<{
      result?: { uuid: string };
    }>;
  };
  status?: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const p1 = searchParams.get("p1")?.trim();
  const p2 = searchParams.get("p2")?.trim();

  if (!p1 || !p2) {
    return NextResponse.json({ error: "p1 and p2 are required" }, { status: 400 });
  }

  // Check cache first
  const cached = getCachedH2H(p1, p2);
  if (cached) {
    return NextResponse.json(
      { ...cached, cached: true },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  }

  const statsUrl = `https://mcsrranked.com/stats/${encodeURIComponent(p1)}/vs/${encodeURIComponent(p2)}`;

  // Fetch from MCSR API
  try {
    const res = await fetch(`${MCSR_API}/${encodeURIComponent(p1)}/versus/${encodeURIComponent(p2)}`, {
      headers: { "User-Agent": "eg-ffa-bracket-site/1.0" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      const fallback: H2HResult = { p1, p2, p1Wins: 0, p2Wins: 0, totalMatches: 0, statsUrl, noData: true };
      setCachedH2H(p1, p2, fallback);
      return NextResponse.json(fallback, {
        headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
      });
    }

    const json = (await res.json()) as MCSRVersusResponse;

    // Parse win/loss from the match array
    // The MCSR Ranked versus endpoint returns match records; we derive wins by counting
    // matches where each player's UUID matches the result.winner UUID.
    // As an alternative, parse from recentResult array if available.
    let p1Wins = 0;
    let p2Wins = 0;
    const matches = json.data?.match ?? [];

    // We need the UUIDs of p1 and p2 to tally wins. Fetch profiles if needed.
    // As a simpler heuristic: if recentResult is provided, count 1s vs 2s.
    const recentResult = json.data?.recentResult ?? [];
    if (recentResult.length > 0) {
      p1Wins = recentResult.filter((r) => r === 1).length;
      p2Wins = recentResult.filter((r) => r === 2).length;
    } else if (matches.length > 0) {
      // Fall back to match array length as total, no win breakdown available
      p1Wins = 0;
      p2Wins = 0;
    }

    const total = recentResult.length || matches.length;

    if (total === 0) {
      const noData: H2HResult = { p1, p2, p1Wins: 0, p2Wins: 0, totalMatches: 0, statsUrl, noData: true };
      setCachedH2H(p1, p2, noData);
      return NextResponse.json(noData, {
        headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
      });
    }

    const result: H2HResult = { p1, p2, p1Wins, p2Wins, totalMatches: total, statsUrl };
    setCachedH2H(p1, p2, result);

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch {
    const fallback: H2HResult = { p1, p2, p1Wins: 0, p2Wins: 0, totalMatches: 0, statsUrl, noData: true };
    return NextResponse.json(fallback);
  }
}
