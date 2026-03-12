import type { BracketSlot, ProjectedOpponent } from "@/types/player";

const TOTAL_PLAYERS = 956;
// In the SVG, two players in the same match have y values ~50px apart (y=38 and y=88 in a 110px match).
// The gap between consecutive matches is ~60px (110px match height minus 50px internal gap).
// We use 70px as the threshold: closer than this = same match, further = different match (bye).
const SAME_MATCH_Y_THRESHOLD = 70;

interface SlotWithMatch extends BracketSlot {
  derivedMatchIndex: number;
}

/**
 * Re-derives match pairings for round-1 slots using y-coordinates.
 * Because bye matches have only 1 player text node (no opponent text exists in the SVG),
 * the sequential slotNum counter in enhance-svg.ts drifts — so we ignore matchIndex
 * from bracket-slots.json and rederive it here by pairing players sorted by y.
 */
function buildLookups(slots: BracketSlot[]): {
  slotBySeed: Map<number, SlotWithMatch>;
  seedsByMatch: Map<number, number[]>;
} {
  const r1Slots = slots.filter((s) => s.round === 1).sort((a, b) => a.y - b.y);

  const slotBySeed = new Map<number, SlotWithMatch>();
  const seedsByMatch = new Map<number, number[]>();

  let matchIdx = 0;
  let i = 0;

  while (i < r1Slots.length) {
    matchIdx++;
    const top = r1Slots[i];
    const bot = r1Slots[i + 1];

    const sameMatch =
      bot !== undefined && Math.abs(bot.y - top.y) < SAME_MATCH_Y_THRESHOLD;

    if (sameMatch) {
      slotBySeed.set(top.seed, { ...top, derivedMatchIndex: matchIdx });
      slotBySeed.set(bot.seed, { ...bot, derivedMatchIndex: matchIdx });
      seedsByMatch.set(matchIdx, [top.seed, bot.seed]);
      i += 2;
    } else {
      // Only one player in this match — the opponent slot is a bye
      slotBySeed.set(top.seed, { ...top, derivedMatchIndex: matchIdx });
      seedsByMatch.set(matchIdx, [top.seed]);
      i += 1;
    }
  }

  return { slotBySeed, seedsByMatch };
}

function isBye(seed: number): boolean {
  return seed > TOTAL_PLAYERS;
}

/**
 * Returns the projected R1/R2/R3 opponents for a given seed,
 * derived from actual bracket layout (y-coordinate pairing) in bracket-slots.json.
 */
export function getProjectedOpponents(
  seed: number,
  slots: BracketSlot[]
): ProjectedOpponent[] {
  const { slotBySeed, seedsByMatch } = buildLookups(slots);

  const mySlot = slotBySeed.get(seed);
  if (!mySlot) return [];

  const myMatchIdx = mySlot.derivedMatchIndex;

  // --- Round 1: other player in the same match ---
  const r1Seeds = seedsByMatch.get(myMatchIdx) ?? [];
  const r1OppSeed = r1Seeds.find((s) => s !== seed) ?? -1;
  const r1IsBye = r1OppSeed === -1 || isBye(r1OppSeed);

  // --- Round 2: top seed from the adjacent R1 match ---
  const adjR1MatchIdx = myMatchIdx % 2 === 1 ? myMatchIdx + 1 : myMatchIdx - 1;
  const adjR1Seeds = seedsByMatch.get(adjR1MatchIdx) ?? [];
  const r2OppSeed = adjR1Seeds.length > 0 ? Math.min(...adjR1Seeds) : -1;
  const r2IsBye = r2OppSeed === -1 || isBye(r2OppSeed);

  // --- Round 3: top seed from the two R1 matches feeding the adjacent R2 bracket ---
  const myR2MatchIdx = Math.ceil(myMatchIdx / 2);
  const adjR2MatchIdx = myR2MatchIdx % 2 === 1 ? myR2MatchIdx + 1 : myR2MatchIdx - 1;
  const r3MatchA = seedsByMatch.get(adjR2MatchIdx * 2 - 1) ?? [];
  const r3MatchB = seedsByMatch.get(adjR2MatchIdx * 2) ?? [];
  const r3AllSeeds = [...r3MatchA, ...r3MatchB];
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
