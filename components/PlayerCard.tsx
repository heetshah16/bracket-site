import type { PlayerData } from "@/types/player";
import RankBadge from "./RankBadge";
import { TIER_DEFINITIONS, UNRANKED_TIER } from "@/lib/rank-tiers";

interface PlayerCardProps {
  player: PlayerData;
  isSearchResult?: boolean;
}

export default function PlayerCard({ player, isSearchResult = false }: PlayerCardProps) {
  const tierDef =
    TIER_DEFINITIONS.find((t) => t.name === player.tier) ?? UNRANKED_TIER;

  return (
    <div
      className="rounded-lg p-3 flex items-center gap-3"
      style={{
        backgroundColor: "#141822",
        border: `1px solid ${isSearchResult ? tierDef.color + "66" : "#22293B"}`,
      }}
    >
      {/* Seed */}
      <div
        className="text-xs font-mono rounded px-1.5 py-0.5 shrink-0"
        style={{ backgroundColor: "#22293B", color: "#BEC0C6" }}
      >
        #{player.seed}
      </div>

      {/* Names */}
      <div className="flex-1 min-w-0">
        <div
          className="font-semibold truncate"
          style={{ color: player.found ? tierDef.color : "#BEC0C6" }}
        >
          {player.displayName}
        </div>
        {player.mcUsername && (
          <div className="text-xs truncate" style={{ color: "#6B7280" }}>
            {player.mcUsername}
          </div>
        )}
      </div>

      {/* Rank badge */}
      <RankBadge tier={player.tier} elo={player.elo} size="sm" />
    </div>
  );
}
