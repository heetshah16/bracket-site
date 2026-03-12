export interface Tier {
  name: string;
  label: string;
  minElo: number;
  color: string;
  cssClass: string;
}

// ELO thresholds based on MCSR Ranked tier system.
// Verify exact thresholds at mcsrranked.com before running scripts.
export const TIER_DEFINITIONS: Tier[] = [
  { name: "grandmaster", label: "Grandmaster", minElo: 1850, color: "#FF6B35", cssClass: "tier-grandmaster" },
  { name: "master",      label: "Master",      minElo: 1700, color: "#9B59B6", cssClass: "tier-master" },
  { name: "diamond",     label: "Diamond",     minElo: 1500, color: "#00BFFF", cssClass: "tier-diamond" },
  { name: "emerald",     label: "Emerald",     minElo: 1300, color: "#2ECC71", cssClass: "tier-emerald" },
  { name: "gold",        label: "Gold",        minElo: 1100, color: "#F1C40F", cssClass: "tier-gold" },
  { name: "silver",      label: "Silver",      minElo:  900, color: "#BEC0C6", cssClass: "tier-silver" },
  { name: "bronze",      label: "Bronze",      minElo:  700, color: "#CD7F32", cssClass: "tier-bronze" },
  { name: "iron",        label: "Iron",        minElo:    0, color: "#7F8C8D", cssClass: "tier-iron" },
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

// CSS style block to inject into the enhanced SVG
export function buildSvgStyleBlock(): string {
  const rules = TIER_DEFINITIONS.map(
    (t) => `.${t.cssClass} { fill: ${t.color}; }`
  ).join("\n  ");
  return `<style>\n  ${rules}\n  .${UNRANKED_TIER.cssClass} { fill: ${UNRANKED_TIER.color}; }\n</style>`;
}
