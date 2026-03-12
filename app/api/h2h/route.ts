import { NextRequest, NextResponse } from "next/server";
import { getCachedH2H, setCachedH2H } from "@/lib/h2h-cache";
import type { H2HResult } from "@/types/player";

const MCSR_API = "https://api.mcsrranked.com/users";

interface MCSRMatch {
  result?: { uuid: string; time?: number };
  forfeit?: boolean;
  players?: Array<{ uuid: string }>;
}

interface MCSRVersusResponse {
  status?: string;
  data?: {
    // tag[0] = p1 uuid, tag[1] = p2 uuid (in the order requested)
    tag?: string[];
    recentResult?: number[];
    match?: MCSRMatch[];
  };
}

const HEADERS = { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" };

function msToDisplay(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const p1 = searchParams.get("p1")?.trim();
  const p2 = searchParams.get("p2")?.trim();

  if (!p1 || !p2) {
    return NextResponse.json({ error: "p1 and p2 are required" }, { status: 400 });
  }

  const cached = getCachedH2H(p1, p2);
  if (cached) {
    return NextResponse.json({ ...cached, cached: true }, { headers: HEADERS });
  }

  const statsUrl = `https://mcsrranked.com/stats/${encodeURIComponent(p1)}/vs/${encodeURIComponent(p2)}`;
  const noData: H2HResult = {
    p1, p2, p1Wins: 0, p2Wins: 0, totalMatches: 0,
    p1AvgTime: null, p2AvgTime: null, ffCount: 0,
    statsUrl, noData: true,
  };

  try {
    const res = await fetch(
      `${MCSR_API}/${encodeURIComponent(p1)}/versus/${encodeURIComponent(p2)}`,
      { headers: { "User-Agent": "eg-ffa-bracket-site/1.0" }, next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      setCachedH2H(p1, p2, noData);
      return NextResponse.json(noData, { headers: HEADERS });
    }

    const json = (await res.json()) as MCSRVersusResponse;
    const matches = json.data?.match ?? [];
    const recentResult = json.data?.recentResult ?? [];
    const p1Uuid = json.data?.tag?.[0] ?? "";

    if (matches.length === 0 && recentResult.length === 0) {
      setCachedH2H(p1, p2, noData);
      return NextResponse.json(noData, { headers: HEADERS });
    }

    let p1Wins = 0;
    let p2Wins = 0;
    let ffCount = 0;
    const p1Times: number[] = [];
    const p2Times: number[] = [];

    if (matches.length > 0) {
      for (const m of matches) {
        const isForfeit = m.forfeit === true;
        if (isForfeit) ffCount++;

        const winnerUuid = m.result?.uuid;
        const winnerTime = m.result?.time;

        if (!winnerUuid) continue;

        if (winnerUuid === p1Uuid) {
          p1Wins++;
          if (!isForfeit && winnerTime && winnerTime > 0) p1Times.push(winnerTime);
        } else {
          p2Wins++;
          if (!isForfeit && winnerTime && winnerTime > 0) p2Times.push(winnerTime);
        }
      }
    } else {
      // Fallback: use recentResult array (1 = p1 wins, 2 = p2 wins)
      p1Wins = recentResult.filter((r) => r === 1).length;
      p2Wins = recentResult.filter((r) => r === 2).length;
    }

    const total = matches.length || recentResult.length;
    const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

    const result: H2HResult = {
      p1, p2,
      p1Wins, p2Wins,
      totalMatches: total,
      p1AvgTime: avg(p1Times),
      p2AvgTime: avg(p2Times),
      ffCount,
      statsUrl,
    };

    setCachedH2H(p1, p2, result);
    return NextResponse.json(result, { headers: HEADERS });
  } catch {
    return NextResponse.json(noData, { headers: HEADERS });
  }
}

export { msToDisplay };
