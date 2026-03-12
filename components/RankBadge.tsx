import { TIER_DEFINITIONS, UNRANKED_TIER } from "@/lib/rank-tiers";

interface RankBadgeProps {
  tier: string;
  elo: number | null;
  size?: "sm" | "md";
}

export default function RankBadge({ tier, elo, size = "md" }: RankBadgeProps) {
  const tierDef =
    TIER_DEFINITIONS.find((t) => t.name === tier) ?? UNRANKED_TIER;

  const padding = size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-semibold ${padding}`}
      style={{
        backgroundColor: `${tierDef.color}22`,
        border: `1px solid ${tierDef.color}88`,
        color: tierDef.color,
      }}
    >
      <span
        className="inline-block rounded-full"
        style={{
          width: size === "sm" ? 6 : 8,
          height: size === "sm" ? 6 : 8,
          backgroundColor: tierDef.color,
          flexShrink: 0,
        }}
      />
      {tierDef.label}
      {elo !== null && (
        <span className="opacity-70 font-normal">({elo})</span>
      )}
    </span>
  );
}
