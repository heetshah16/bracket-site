export interface Tier {
  name: string;
  label: string;
  minElo: number;
  color: string;
  cssClass: string;
}

// MCSR Ranked tier system — Netherite (highest) to Coal (lowest).
// ELO thresholds are approximate; verify exact cutoffs at mcsrranked.com.
export const TIER_DEFINITIONS: Tier[] = [
  { name: "netherite", label: "Netherite", minElo: 1600, color: "#9333EA", cssClass: "tier-netherite" },
  { name: "diamond",   label: "Diamond",   minElo: 1300, color: "#60A5FA", cssClass: "tier-diamond" },
  { name: "emerald",   label: "Emerald",   minElo: 1000, color: "#34D399", cssClass: "tier-emerald" },
  { name: "gold",      label: "Gold",      minElo:  700, color: "#FBBF24", cssClass: "tier-gold" },
  { name: "iron",      label: "Iron",      minElo:  400, color: "#E5E7EB", cssClass: "tier-iron" },
  { name: "coal",      label: "Coal",      minElo:    0, color: "#9CA3AF", cssClass: "tier-coal" },
];

export const UNRANKED_TIER: Tier = {
  name: "unranked",
  label: "Unranked",
  minElo: -1,
  color: "#555555",
  cssClass: "tier-unranked",
};

export function getTierFromElo(elo: number | null): Tier {
  if (elo === null || elo === undefined) return UNRANKED_TIER;
  for (const tier of TIER_DEFINITIONS) {
    if (elo >= tier.minElo) return tier;
  }
  return UNRANKED_TIER;
}

/** CSS block to inject into the enhanced SVG */
export function buildSvgStyleBlock(): string {
  const rules = [...TIER_DEFINITIONS, UNRANKED_TIER]
    .map((t) => `.${t.cssClass} { fill: ${t.color}; }`)
    .join("\n  ");
  return `\n  ${rules}\n`;
}
