"use client";

import { useEffect, useState } from "react";
import type { PlayerData, ProjectedOpponent, H2HResult } from "@/types/player";
import PlayerCard from "./PlayerCard";
import { roundLabel } from "@/lib/bracket-logic";

interface MatchPreviewProps {
  player: PlayerData;
  opponent: PlayerData | null;
  projection: ProjectedOpponent;
}

function fmtTime(ms: number | null): string {
  if (ms === null) return "—";
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function H2HStats({ p1McUser, p2McUser, p1Name, p2Name }: {
  p1McUser: string;
  p2McUser: string;
  p1Name: string;
  p2Name: string;
}) {
  const [data, setData] = useState<H2HResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!p1McUser || !p2McUser) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/h2h?p1=${encodeURIComponent(p1McUser)}&p2=${encodeURIComponent(p2McUser)}`)
      .then((r) => r.json())
      .then((d: H2HResult) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [p1McUser, p2McUser]);

  if (loading) {
    return (
      <div className="text-xs mt-2 animate-pulse" style={{ color: "#6B7280" }}>
        Loading head-to-head…
      </div>
    );
  }

  const statsUrl = data?.statsUrl ??
    `https://mcsrranked.com/stats/${encodeURIComponent(p1McUser)}/vs/${encodeURIComponent(p2McUser)}`;

  if (!data || data.noData) {
    return (
      <div className="mt-2">
        <a href={statsUrl} target="_blank" rel="noopener noreferrer"
          className="text-xs underline" style={{ color: "#5865F2" }}>
          View stats on mcsrranked.com →
        </a>
      </div>
    );
  }

  const { p1Wins, p2Wins, totalMatches, p1AvgTime, p2AvgTime, ffCount } = data;
  const ffRate = totalMatches > 0 ? Math.round((ffCount / totalMatches) * 100) : 0;
  const total = p1Wins + p2Wins || 1;

  return (
    <div className="mt-3 rounded-md p-2.5" style={{ backgroundColor: "#0B0D13", border: "1px solid #22293B" }}>
      <p className="text-xs font-semibold mb-2 uppercase tracking-wider text-center" style={{ color: "#6B7280" }}>
        Head-to-Head · {totalMatches} games
      </p>

      {/* Win bar */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold w-16 text-right truncate" style={{ color: "#34D399" }}>
          {p1Wins}W
        </span>
        <div className="flex-1 flex rounded overflow-hidden" style={{ height: 6 }}>
          <div style={{ width: `${(p1Wins / total) * 100}%`, backgroundColor: "#34D399" }} />
          <div style={{ width: `${(p2Wins / total) * 100}%`, backgroundColor: "#E74C3C" }} />
        </div>
        <span className="text-xs font-bold w-16 truncate" style={{ color: "#E74C3C" }}>
          {p2Wins}W
        </span>
      </div>

      {/* Stat row: You | FF Rate | Opponent */}
      <div className="grid grid-cols-3 gap-1 text-center">
        {/* p1 stats */}
        <div className="flex flex-col gap-1">
          <span className="text-xs truncate font-medium" style={{ color: "#34D399" }}>{p1Name}</span>
          <span className="text-xs font-mono" style={{ color: "#BEC0C6" }}>{fmtTime(p1AvgTime)}</span>
          <span className="text-xs" style={{ color: "#6B7280" }}>avg time</span>
        </div>
        {/* middle: FF rate */}
        <div className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: "#6B7280" }}>FF rate</span>
          <span className="text-xs font-semibold" style={{ color: ffRate > 30 ? "#FBBF24" : "#9CA3AF" }}>
            {ffRate}%
          </span>
          <span className="text-xs" style={{ color: "#6B7280" }}>({ffCount} FF)</span>
        </div>
        {/* p2 stats */}
        <div className="flex flex-col gap-1">
          <span className="text-xs truncate font-medium" style={{ color: "#E74C3C" }}>{p2Name}</span>
          <span className="text-xs font-mono" style={{ color: "#BEC0C6" }}>{fmtTime(p2AvgTime)}</span>
          <span className="text-xs" style={{ color: "#6B7280" }}>avg time</span>
        </div>
      </div>

      <div className="mt-2 text-center">
        <a href={statsUrl} target="_blank" rel="noopener noreferrer"
          className="text-xs underline" style={{ color: "#5865F2" }}>
          Full stats on mcsrranked.com →
        </a>
      </div>
    </div>
  );
}

export default function MatchPreview({ player, opponent, projection }: MatchPreviewProps) {
  return (
    <div
      className="rounded-lg p-3"
      style={{ backgroundColor: "#0F1219", border: "1px solid #22293B" }}
    >
      <div className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "#6B7280" }}>
        {roundLabel(projection.round)}
      </div>

      {projection.isBye ? (
        <div className="text-sm px-2 py-1 rounded" style={{ backgroundColor: "#22293B", color: "#6B7280" }}>
          BYE — auto-advance
        </div>
      ) : opponent ? (
        <>
          <PlayerCard player={opponent} />
          {player.mcUsername && opponent.mcUsername && (
            <H2HStats
              p1McUser={player.mcUsername}
              p2McUser={opponent.mcUsername}
              p1Name={player.displayName}
              p2Name={opponent.displayName}
            />
          )}
        </>
      ) : (
        <div className="text-sm" style={{ color: "#6B7280" }}>
          Opponent seed #{projection.opponentSeed} (no data)
        </div>
      )}
    </div>
  );
}
