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

function H2HStats({ p1McUser, p2McUser }: { p1McUser: string; p2McUser: string }) {
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
        Loading head-to-head stats…
      </div>
    );
  }

  if (!data || data.noData) {
    const statsUrl = data?.statsUrl ??
      `https://mcsrranked.com/stats/${encodeURIComponent(p1McUser)}/vs/${encodeURIComponent(p2McUser)}`;
    return (
      <div className="mt-2">
        <a
          href={statsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs underline"
          style={{ color: "#5865F2" }}
        >
          View stats on mcsrranked.com →
        </a>
      </div>
    );
  }

  const p1W = data.p1Wins;
  const p2W = data.p2Wins;
  const total = data.totalMatches;

  return (
    <div className="mt-2 flex items-center gap-3 text-xs">
      <span style={{ color: "#2ECC71" }}>{p1W}W</span>
      <span style={{ color: "#6B7280" }}>/</span>
      <span style={{ color: "#E74C3C" }}>{p2W}L</span>
      <span style={{ color: "#6B7280" }}>({total} games)</span>
      <a
        href={data.statsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="underline ml-auto"
        style={{ color: "#5865F2" }}
      >
        Full stats →
      </a>
    </div>
  );
}

export default function MatchPreview({ player, opponent, projection }: MatchPreviewProps) {
  return (
    <div
      className="rounded-lg p-3"
      style={{ backgroundColor: "#0F1219", border: "1px solid #22293B" }}
    >
      {/* Round label */}
      <div
        className="text-xs font-semibold mb-2 uppercase tracking-wider"
        style={{ color: "#6B7280" }}
      >
        {roundLabel(projection.round)}
      </div>

      {projection.isBye ? (
        <div
          className="text-sm px-2 py-1 rounded"
          style={{ backgroundColor: "#22293B", color: "#6B7280" }}
        >
          BYE — auto-advance
        </div>
      ) : opponent ? (
        <>
          <PlayerCard player={opponent} />
          {player.mcUsername && opponent.mcUsername && (
            <H2HStats p1McUser={player.mcUsername} p2McUser={opponent.mcUsername} />
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
