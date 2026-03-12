import type { BracketSlot, ProjectedOpponent } from "@/types/player";

const TOTAL_PLAYERS = 956;

function isBye(seed: number): boolean {
  return seed > TOTAL_PLAYERS;
}

/**
 * Builds lookup structures from bracket-slots.json (round 1 entries only).
 * - slotBySeed: seed → BracketSlot
 * - seedsByMatch: matchIndex → [seed, seed] (the two players in that R1 match)
 */
function buildLookups(slots: BracketSlot[]): {
  slotBySeed: Map<number, BracketSlot>;
  seedsByMatch: Map<number, number[]>;
} {
  const slotBySeed = new Map<number, BracketSlot>();
  const seedsByMatch = new Map<number, number[]>();

  for (const slot of slots) {
    if (slot.round !== 1) continue;
    slotBySeed.set(slot.seed, slot);
    const existing = seedsByMatch.get(slot.matchIndex) ?? [];
    existing.push(slot.seed);
    seedsByMatch.set(slot.matchIndex, existing);
  }

  return { slotBySeed, seedsByMatch };
}

/**
 * Returns the projected R1/R2/R3 opponents for a given seed,
 * derived entirely from the actual bracket layout in bracket-slots.json.
 *
 * R1: the other player in the same match (exact).
 * R2: the top seed from the adjacent R1 match (who you'd face if both win).
 * R3: the top seed from the two R1 matches that feed the adjacent R2 bracket.
 */
export function getProjectedOpponents(
  seed: number,
  slots: BracketSlot[]
): ProjectedOpponent[] {
  const { slotBySeed, seedsByMatch } = buildLookups(slots);

  const mySlot = slotBySeed.get(seed);
  if (!mySlot) return [];

  const myMatchIdx = mySlot.matchIndex;

  // --- Round 1 ---
  const r1Seeds = seedsByMatch.get(myMatchIdx) ?? [];
  const r1OppSeed = r1Seeds.find((s) => s !== seed) ?? -1;
  const r1IsBye = r1OppSeed === -1 || isBye(r1OppSeed);

  // --- Round 2 ---
  // Adjacent R1 match: if my match is odd → adjacent is matchIdx+1; if even → matchIdx-1
  const adjR1MatchIdx = myMatchIdx % 2 === 1 ? myMatchIdx + 1 : myMatchIdx - 1;
  const adjR1Seeds = seedsByMatch.get(adjR1MatchIdx) ?? [];
  // Best-case R2 opponent = top seed (lowest number) in that adjacent match
  const r2OppSeed = adjR1Seeds.length > 0 ? Math.min(...adjR1Seeds) : -1;
  const r2IsBye = r2OppSeed === -1 || isBye(r2OppSeed);

  // --- Round 3 ---
  // My R2 match index: ceil(myMatchIdx / 2)
  // Adjacent R2 match: if my R2 match is odd → adj is R2+1; if even → R2-1
  const myR2MatchIdx = Math.ceil(myMatchIdx / 2);
  const adjR2MatchIdx = myR2MatchIdx % 2 === 1 ? myR2MatchIdx + 1 : myR2MatchIdx - 1;
  // The two R1 matches that feed the adjacent R2 slot are: adjR2*2-1 and adjR2*2
  const r3R1MatchA = seedsByMatch.get(adjR2MatchIdx * 2 - 1) ?? [];
  const r3R1MatchB = seedsByMatch.get(adjR2MatchIdx * 2) ?? [];
  const r3AllSeeds = [...r3R1MatchA, ...r3R1MatchB];
  const r3OppSeed = r3AllSeeds.length > 0 ? Math.min(...r3AllSeeds) : -1;
  const r3IsBye = r3OppSeed === -1 || isBye(r3OppSeed);

  return [
    { round: 1, opponentSeed: r1OppSeed, isBye: r1IsBye },
    { round: 2, opponentSeed: r2OppSeed, isBye: r2IsBye },
    { round: 3, opponentSeed: r3OppSeed, isBye: r3IsBye },
  ];
}

/** Returns display label for a round number */
export function roundLabel(round: number): string {
  const labels: Record<number, string> = {
    1: "Round 1",
    2: "Round 2",
    3: "Round 3",
    4: "Round of 64",
    5: "Round of 32",
    6: "Round of 16",
    7: "Quarter-Final",
    8: "Semi-Final",
    9: "Final",
  };
  return labels[round] ?? `Round ${round}`;
}
